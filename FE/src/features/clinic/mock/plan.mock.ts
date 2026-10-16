import { permissions } from '@/config/permissions'
import { mockDelay } from '@/lib/data-source'
import { normalizeVi } from '@/lib/normalize'
import { auditCreate, auditUpdate } from '@/mock/mock-audit'
import { requirePermission } from '@/mock/mock-auth'
import { newId, paginate, sortItems } from '@/mock/mock-helpers'
import type { PaginatedResult } from '@/types/api'
import type {
  PlanNoteInput,
  PlanStatus,
  SavePlanItemLine,
  SaveTreatmentPlanInput,
  TreatmentPlanDto,
  TreatmentPlanListItem,
  TreatmentPlanQuery,
} from '@/types/clinic'
import { clinicRules, discountRate, doctorShort, floor1000, formatTeeth, itemDiscount, needsApproval } from '../lib/rules'
import { hasErrors, validatePlan } from '../lib/validation'
import { fieldError, fieldErrors, invalidState, notFoundError } from './errors'
import { money, patientBrief, teethList } from './mappers'
import { trimOrNull } from './patient-support'
import type { PlanItemRecord, PlanRecord } from './records'
import {
  actor,
  can,
  doctorsDb,
  ensureFresh,
  invoicesDb,
  nextDocCode,
  nowIso,
  patientsDb,
  plansDb,
  servicesDb,
  today,
  visitsDb,
} from './store'

/** Handler mock kế hoạch điều trị (07 §3.11, §4.8), giống BE `TreatmentPlanService`. */

/** Đã thu theo kế hoạch: mỗi phiếu thanh toán (không hủy) chứa hạng mục góp floor1000(Paid × tiền hạng mục / Total). */
function paidByPlan(planIds: Set<string>): Map<string, number> {
  const itemPlan = new Map<string, string>()
  for (const p of plansDb.filter((x) => planIds.has(x.id))) for (const i of p.items) itemPlan.set(i.id, p.id)
  const orderPlan = new Map<string, string>()
  for (const v of visitsDb.all()) for (const o of v.orders) if (o.treatmentPlanItemId && itemPlan.has(o.treatmentPlanItemId)) orderPlan.set(o.id, itemPlan.get(o.treatmentPlanItemId)!)
  const result = new Map<string, number>()
  if (orderPlan.size === 0) return result
  for (const inv of invoicesDb.filter((i) => i.status !== 'DaHuy' && i.total > 0 && i.lines.some((l) => l.refId && orderPlan.has(l.refId)))) {
    const byPlan = new Map<string, number>()
    for (const l of inv.lines) if (l.refId && !l.isOutside && orderPlan.has(l.refId)) byPlan.set(orderPlan.get(l.refId)!, (byPlan.get(orderPlan.get(l.refId)!) ?? 0) + l.amount)
    for (const [planId, amount] of byPlan) result.set(planId, (result.get(planId) ?? 0) + floor1000((inv.paid * amount) / inv.total))
  }
  return result
}

function recalc(plan: Pick<PlanRecord, 'items'>): { subTotal: number; discountTotal: number; total: number } {
  const live = plan.items.filter((i) => i.status !== 'DaHuy')
  const subTotal = live.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const discountTotal = live.reduce((s, i) => s + i.discountAmount, 0)
  return { subTotal, discountTotal, total: subTotal - discountTotal }
}

function toDto(plan: PlanRecord): TreatmentPlanDto {
  const me = actor()
  const patient = patientsDb.get(plan.patientId)!
  const doctor = doctorsDb.get(plan.doctorId)!
  const paid = paidByPlan(new Set([plan.id])).get(plan.id) ?? 0
  const visitOf = new Map<string, { id: string; code: string; status: string }>()
  for (const v of visitsDb.all())
    for (const o of v.orders)
      if (o.treatmentPlanItemId && plan.items.some((i) => i.id === o.treatmentPlanItemId) && v.status !== 'BoVe') {
        const prev = visitOf.get(o.treatmentPlanItemId)
        if (!prev || v.status === 'HoanTat' || v.status === 'ChoThanhToan') visitOf.set(o.treatmentPlanItemId, { id: v.id, code: v.code, status: v.status })
      }
  const live = plan.items.filter((i) => i.status !== 'DaHuy')
  const canUpdate = can(me, permissions.treatmentPlans.update)
  return {
    id: plan.id,
    code: plan.code,
    patient: patientBrief(patient, today()),
    doctorId: plan.doctorId,
    doctorName: doctorShort(doctor.fullName),
    plannedSessions: plan.plannedSessions,
    note: plan.note,
    subTotal: plan.subTotal,
    discountTotal: plan.discountTotal,
    total: plan.total,
    discountRate: discountRate(plan.subTotal, plan.discountTotal),
    status: plan.status,
    items: [...plan.items]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => ({
        id: i.id,
        serviceId: i.serviceId,
        serviceCode: i.serviceCode,
        serviceName: i.serviceName,
        unit: i.unit,
        teeth: teethList(i.teeth),
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountType: i.discountType,
        discountValue: i.discountValue,
        discountAmount: i.discountAmount,
        amount: i.amount,
        status: i.status,
        doneAt: i.doneAt,
        visitId: visitOf.get(i.id)?.id ?? null,
        visitCode: visitOf.get(i.id)?.code ?? null,
      })),
    doneCount: live.filter((i) => i.status === 'DaLam').length,
    itemCount: live.length,
    doneAmount: live.filter((i) => i.status === 'DaLam').reduce((s, i) => s + i.amount, 0),
    paidAmount: paid,
    remaining: Math.max(0, plan.total - paid),
    createdAt: plan.createdAt,
    createdByName: plan.createdByName,
    quotedAt: plan.quotedAt,
    acceptedAt: plan.acceptedAt,
    completedAt: plan.completedAt,
    cancelledAt: plan.cancelledAt,
    cancelReason: plan.cancelReason,
    reviewedByName: plan.reviewedByName,
    reviewedAt: plan.reviewedAt,
    reviewNote: plan.reviewNote,
    actions: {
      canEdit: plan.status === 'Nhap' && canUpdate,
      canQuote: plan.status === 'Nhap' && canUpdate && live.length > 0,
      canApprove: plan.status === 'ChoDuyet' && can(me, permissions.treatmentPlans.approve),
      canAccept: plan.status === 'DaBaoGia' && canUpdate,
      canStop: plan.status === 'DangDieuTri' && canUpdate,
    },
  }
}

/** 07 §3.11: dịch vụ thủ thuật hoặc cận lâm sàng đang dùng, răng như chỉ định, giảm giá theo hạng mục. */
function buildItems(inputs: SavePlanItemLine[]): PlanItemRecord[] {
  return inputs.map((input, n) => {
    const prefix = `items[${n}].`
    const svc = servicesDb.get(input.serviceId)
    if (!svc || !svc.isActive || svc.group === 'Kham') throw fieldError(prefix + 'serviceId', 'Chọn dịch vụ thủ thuật hoặc cận lâm sàng đang dùng')
    let teeth: string | null = null
    let quantity = input.quantity
    if (svc.requiresTooth) {
      if (!input.teeth?.length) throw fieldError(prefix + 'teeth', 'Chọn vị trí răng')
      teeth = formatTeeth(input.teeth)
      quantity = input.teeth.length
    }
    const gross = svc.price * quantity
    const type = input.discountType ?? null
    const value = type ? input.discountValue : 0
    if (type === 'SoTien' && value * 100 > gross * clinicRules.maxItemDiscountPercent)
      throw fieldError(prefix + 'discountValue', `Giảm tối đa ${clinicRules.maxItemDiscountPercent}% thành tiền (${money(gross / 2)})`)
    const discount = itemDiscount(svc.price, quantity, type, value)
    return {
      id: newId(),
      serviceId: svc.id,
      serviceCode: svc.code,
      serviceName: svc.name,
      unit: svc.unit,
      teeth,
      quantity,
      unitPrice: svc.price,
      discountType: value > 0 ? type : null,
      discountValue: value,
      discountAmount: discount,
      amount: gross - discount,
      status: 'ChuaLam',
      doneAt: null,
      sortOrder: n,
    }
  })
}

function load(id: string, expected: PlanStatus, message: string): PlanRecord {
  const plan = plansDb.get(id)
  if (!plan) throw notFoundError('Không tìm thấy kế hoạch điều trị.')
  if (plan.status !== expected) throw invalidState(message)
  return plan
}

function patch(id: string, before: PlanRecord, changes: Partial<PlanRecord>): TreatmentPlanDto {
  const after = plansDb.update(id, changes)!
  auditUpdate('TreatmentPlan', before, after)
  return toDto(after)
}

export const planMock = {
  async getList(query: TreatmentPlanQuery): Promise<PaginatedResult<TreatmentPlanListItem>> {
    await mockDelay()
    requirePermission(permissions.treatmentPlans.view)
    ensureFresh()
    const patients = new Map(patientsDb.all().map((p) => [p.id, p]))
    const term = normalizeVi(query.search)
    const list = plansDb.filter((p) => {
      if (query.status && p.status !== query.status) return false
      if (query.patientId && p.patientId !== query.patientId) return false
      if (query.doctorId && p.doctorId !== query.doctorId) return false
      if (term) {
        const pt = patients.get(p.patientId)
        if (!normalizeVi(`${p.code} ${pt?.fullName ?? ''} ${pt?.phone ?? ''} ${pt?.code ?? ''}`).includes(term)) return false
      }
      return true
    })
    const page = paginate(sortItems(list, query.sortBy || 'createdAt', query.sortDir || 'desc'), query)
    const paid = paidByPlan(new Set(page.items.map((p) => p.id)))
    return {
      ...page,
      items: page.items.map((p) => {
        const pt = patients.get(p.patientId)!
        const live = p.items.filter((i) => i.status !== 'DaHuy')
        const paidAmount = paid.get(p.id) ?? 0
        return {
          id: p.id,
          code: p.code,
          patientId: p.patientId,
          patientCode: pt.code,
          patientName: pt.fullName,
          patientPhone: pt.phone,
          doctorId: p.doctorId,
          doctorName: doctorShort(doctorsDb.get(p.doctorId)?.fullName ?? ''),
          total: p.total,
          discountRate: discountRate(p.subTotal, p.discountTotal),
          status: p.status,
          doneCount: live.filter((i) => i.status === 'DaLam').length,
          itemCount: live.length,
          paidAmount,
          remaining: Math.max(0, p.total - paidAmount),
          createdAt: p.createdAt,
        }
      }),
    }
  },

  async get(id: string): Promise<TreatmentPlanDto> {
    await mockDelay()
    requirePermission(permissions.treatmentPlans.view)
    ensureFresh()
    const plan = plansDb.get(id)
    if (!plan) throw notFoundError('Không tìm thấy kế hoạch điều trị.')
    return toDto(plan)
  },

  async create(input: SaveTreatmentPlanInput): Promise<TreatmentPlanDto> {
    await mockDelay()
    requirePermission(permissions.treatmentPlans.create)
    ensureFresh()
    const e = validatePlan(input)
    if (hasErrors(e)) throw fieldErrors(e)
    const me = actor()
    if (!me.doctorId) throw invalidState('Tài khoản chưa gắn với bác sĩ nên không lập được kế hoạch.')
    if (!patientsDb.get(input.patientId)) throw fieldError('patientId', 'Bệnh nhân không tồn tại')
    const items = buildItems(input.items)
    const record: PlanRecord = {
      id: newId(),
      code: nextDocCode(clinicRules.planPrefix, today()),
      patientId: input.patientId,
      doctorId: me.doctorId,
      plannedSessions: input.plannedSessions,
      note: trimOrNull(input.note),
      ...recalc({ items }),
      status: 'Nhap',
      quotedAt: null,
      acceptedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancelReason: null,
      reviewedByName: null,
      reviewedAt: null,
      reviewNote: null,
      createdByName: me.fullName,
      createdAt: nowIso(),
      items,
    }
    plansDb.insert(record)
    auditCreate('TreatmentPlan', record)
    return toDto(record)
  },

  async update(id: string, input: SaveTreatmentPlanInput): Promise<TreatmentPlanDto> {
    await mockDelay()
    requirePermission(permissions.treatmentPlans.update)
    ensureFresh()
    const e = validatePlan(input)
    if (hasErrors(e)) throw fieldErrors(e)
    const before = load(id, 'Nhap', 'Chỉ sửa kế hoạch ở trạng thái nháp.')
    if (before.patientId !== input.patientId) throw fieldError('patientId', 'Không đổi bệnh nhân của kế hoạch')
    const items = buildItems(input.items)
    return patch(id, before, { plannedSessions: input.plannedSessions, note: trimOrNull(input.note), items, ...recalc({ items }) })
  },

  /** Chốt báo giá: tỉ lệ giảm ≤ 10% thì đã báo giá, vượt thì chờ quản lý duyệt (BR-22). */
  async quote(id: string): Promise<TreatmentPlanDto> {
    await mockDelay()
    requirePermission(permissions.treatmentPlans.update)
    const before = load(id, 'Nhap', 'Chỉ chốt báo giá kế hoạch nháp.')
    if (!before.items.some((i) => i.status !== 'DaHuy')) throw invalidState('Kế hoạch chưa có hạng mục.')
    return patch(id, before, { status: needsApproval(before.subTotal, before.discountTotal) ? 'ChoDuyet' : 'DaBaoGia', quotedAt: nowIso() })
  },

  async approve(id: string, input: PlanNoteInput): Promise<TreatmentPlanDto> {
    await mockDelay()
    requirePermission(permissions.treatmentPlans.approve)
    const before = load(id, 'ChoDuyet', 'Kế hoạch không chờ duyệt.')
    return patch(id, before, { status: 'DaBaoGia', reviewedByName: actor().fullName, reviewedAt: nowIso(), reviewNote: trimOrNull(input.note) })
  },

  async reject(id: string, input: PlanNoteInput): Promise<TreatmentPlanDto> {
    await mockDelay()
    requirePermission(permissions.treatmentPlans.approve)
    const note = trimOrNull(input.note)
    if (!note) throw fieldError('note', 'Nhập lý do từ chối')
    const before = load(id, 'ChoDuyet', 'Kế hoạch không chờ duyệt.')
    return patch(id, before, { status: 'Nhap', reviewedByName: actor().fullName, reviewedAt: nowIso(), reviewNote: note })
  },

  async accept(id: string): Promise<TreatmentPlanDto> {
    await mockDelay()
    requirePermission(permissions.treatmentPlans.update)
    const before = load(id, 'DaBaoGia', 'Chỉ ghi nhận đồng ý với kế hoạch đã báo giá.')
    return patch(id, before, { status: 'DangDieuTri', acceptedAt: nowIso() })
  },

  async decline(id: string, input: PlanNoteInput): Promise<TreatmentPlanDto> {
    await mockDelay()
    requirePermission(permissions.treatmentPlans.update)
    const before = load(id, 'DaBaoGia', 'Chỉ ghi nhận từ chối với kế hoạch đã báo giá.')
    return patch(id, before, { status: 'DaHuy', cancelledAt: nowIso(), cancelReason: trimOrNull(input.note) ?? 'Bệnh nhân từ chối kế hoạch' })
  },

  async stop(id: string, input: PlanNoteInput): Promise<TreatmentPlanDto> {
    await mockDelay()
    requirePermission(permissions.treatmentPlans.update)
    const note = trimOrNull(input.note)
    if (!note) throw fieldError('note', 'Nhập lý do dừng điều trị')
    const before = load(id, 'DangDieuTri', 'Chỉ dừng kế hoạch đang điều trị.')
    const items = before.items.map((i) => (i.status === 'ChuaLam' ? { ...i, status: 'DaHuy' as const } : i))
    return patch(id, before, { status: 'DaHuy', cancelledAt: nowIso(), cancelReason: note, items, ...recalc({ items }) })
  },
}
