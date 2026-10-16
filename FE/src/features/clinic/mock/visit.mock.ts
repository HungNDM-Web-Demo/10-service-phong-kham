import { permissions } from '@/config/permissions'
import { mockDelay } from '@/lib/data-source'
import { normalizeVi } from '@/lib/normalize'
import { requirePermission } from '@/mock/mock-auth'
import { newId, paginate, sortItems } from '@/mock/mock-helpers'
import type { PaginatedResult } from '@/types/api'
import type {
  PlanItemOption,
  PrescriptionPrintDto,
  SaveOrderLine,
  SavePrescriptionLine,
  SaveVisitInput,
  UsagePhraseDto,
  VisitDetailDto,
  VisitMedicalDto,
  VisitQuery,
  VisitSummaryDto,
} from '@/types/clinic'
import { ageOn, allergyMatches, clinicRules, doctorShort, formatTeeth, ticketOf } from '../lib/rules'
import { hasErrors, validateVisit } from '../lib/validation'
import { conflictError, domainError, errorCodes, fieldError, fieldErrors, forbiddenError, invalidState, notFoundError } from './errors'
import { buildLines, totals, statusFor } from './invoice-builder'
import { imageList, invoiceBrief, isOpenVisit, isValidReceipt, patientDto, teethList } from './mappers'
import { trimOrNull } from './patient-support'
import type { InvoiceRecord, PrescriptionRecord, VisitOrderRecord, VisitRecord } from './records'
import {
  actor,
  addDaysKey,
  appointmentsDb,
  can,
  doctorsDb,
  ensureFresh,
  followUpsDb,
  invoicesDb,
  logMedicalView,
  medicinesDb,
  nextDocCode,
  nowIso,
  patientsDb,
  phrasesDb,
  plansDb,
  profile,
  receiptsDb,
  servicesDb,
  specialtiesDb,
  today,
  vnDateKey,
  visitsDb,
} from './store'

/** Handler mock phiếu khám (07 §3.6–§3.8, §4.6), giống BE `VisitService`. */

const liveInvoice = (visitId: string): InvoiceRecord | undefined =>
  invoicesDb
    .filter((i) => i.visitId === visitId && i.status !== 'DaHuy')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]

/** 07 §3.8: lý do không mở lại được, null khi được. */
function reopenBlockedReason(v: VisitRecord): string | null {
  if (v.status !== 'ChoThanhToan') return v.status === 'HoanTat' ? 'Phiếu thanh toán đã có phiếu thu' : 'Chỉ mở lại phiếu đang chờ thanh toán'
  if (!v.finishedAt || vnDateKey(v.finishedAt) !== today()) return 'Chỉ mở lại trong ngày khám'
  const invoiceIds = new Set(invoicesDb.filter((i) => i.visitId === v.id && i.status !== 'DaHuy').map((i) => i.id))
  if (receiptsDb.some((r) => invoiceIds.has(r.invoiceId) && isValidReceipt(r))) return 'Phiếu thanh toán đã có phiếu thu'
  if (visitsDb.some((x) => x.doctorId === v.doctorId && x.date === v.date && x.status === 'DangKham' && x.id !== v.id))
    return 'Bác sĩ đang khám lượt khác, kết thúc hoặc chuyển Chờ kết quả trước'
  return null
}

function ensureCanEdit(v: VisitRecord) {
  const me = actor()
  if (v.status !== 'DangKham' && v.status !== 'ChoKetQua') throw invalidState('Phiếu khám đã khóa hoặc chưa được gọi vào khám.')
  if (!me.isSuperAdmin && me.doctorId !== v.doctorId) throw invalidState('Chỉ bác sĩ khám sửa được phiếu khám này (BR-32).')
}

/** Hạng mục chưa làm của kế hoạch đang điều trị (BR-23), đánh dấu hạng mục đã nằm ở lượt khác còn mở. */
function planOptions(v: VisitRecord): PlanItemOption[] {
  const active = plansDb.filter((p) => p.patientId === v.patientId && p.status === 'DangDieuTri').sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
  const elsewhere = new Set<string>()
  for (const other of visitsDb.filter((x) => x.id !== v.id && isOpenVisit(x.status)))
    for (const o of other.orders) if (o.treatmentPlanItemId) elsewhere.add(o.treatmentPlanItemId)
  return active.flatMap((p) =>
    p.items
      .filter((i) => i.status === 'ChuaLam')
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => ({
        id: i.id,
        planId: p.id,
        planCode: p.code,
        serviceId: i.serviceId,
        serviceCode: i.serviceCode,
        serviceName: i.serviceName,
        unit: i.unit,
        teeth: teethList(i.teeth),
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountAmount: i.discountAmount,
        amount: i.amount,
        inOtherVisit: elsewhere.has(i.id),
      }))
  )
}

function medicalOf(v: VisitRecord, allergies: string | null): VisitMedicalDto {
  const planCodes = new Map<string, string>()
  for (const p of plansDb.all()) for (const i of p.items) planCodes.set(i.id, p.code)
  return {
    temperature: v.temperature,
    pulse: v.pulse,
    bpSystolic: v.bpSystolic,
    bpDiastolic: v.bpDiastolic,
    weight: v.weight,
    height: v.height,
    symptoms: v.symptoms,
    examination: v.examination,
    diagnoses: [...v.diagnoses]
      .sort((a, b) => (a.kind === b.kind ? a.sortOrder - b.sortOrder : a.kind === 'Chinh' ? -1 : 1))
      .map((d) => ({ kind: d.kind, icdCode: d.icdCode, name: d.name })),
    orders: [...v.orders]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((o) => ({
        id: o.id,
        serviceId: o.serviceId,
        serviceCode: o.serviceCode,
        serviceName: o.serviceName,
        group: o.group,
        unit: o.unit,
        teeth: teethList(o.teeth),
        quantity: o.quantity,
        unitPrice: o.unitPrice,
        discount: o.discount,
        amount: o.unitPrice * o.quantity - o.discount,
        result: o.result,
        imageUrls: imageList(o.imageUrls),
        status: o.status,
        treatmentPlanItemId: o.treatmentPlanItemId,
        planCode: o.treatmentPlanItemId ? (planCodes.get(o.treatmentPlanItemId) ?? null) : null,
      })),
    prescription: [...v.prescription]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => ({
        id: p.id,
        medicineId: p.medicineId,
        medicineCode: p.medicineCode,
        name: p.name,
        strength: p.strength,
        unit: p.unit,
        activeIngredient: p.activeIngredient,
        quantity: p.quantity,
        days: p.days,
        usage: p.usage,
        unitPrice: p.unitPrice,
        amount: p.unitPrice * p.quantity,
        allergyConfirmed: p.allergyConfirmedAt !== null,
        allergyConfirmedByName: p.allergyConfirmedByName,
        allergyConfirmedAt: p.allergyConfirmedAt,
        allergyMatches: allergyMatches(allergies, p.activeIngredient),
      })),
    advice: v.advice,
    followUpDate: v.followUpDate,
    followUpNote: v.followUpNote,
  }
}

export function visitDetail(id: string, logView: boolean): VisitDetailDto {
  const v = visitsDb.get(id)
  if (!v) throw notFoundError('Không tìm thấy lượt khám.')
  const me = actor()
  if (!can(me, permissions.queueTickets.view) && !can(me, permissions.patients.view)) throw forbiddenError('Bạn không có quyền xem phiếu khám.')
  const patient = patientsDb.get(v.patientId)!
  const doctor = doctorsDb.get(v.doctorId)!
  const canMedical = can(me, permissions.medicalRecords.view)
  const own = me.isSuperAdmin || me.doctorId === v.doctorId
  const canEdit = (v.status === 'DangKham' || v.status === 'ChoKetQua') && own && can(me, permissions.visits.examine)
  let reopenBlocked: string | null = null
  let canReopen = false
  if (v.status === 'ChoThanhToan' || v.status === 'HoanTat') {
    reopenBlocked = reopenBlockedReason(v)
    canReopen = reopenBlocked === null && own && can(me, permissions.visits.reopen)
  }
  if (canMedical && logView) logMedicalView(patient, `Phiếu khám ${v.code}`)
  const invoice = liveInvoice(v.id)
  return {
    id: v.id,
    code: v.code,
    date: v.date,
    status: v.status,
    queueNumber: v.queueNumber,
    ticket: ticketOf(doctor.room, v.queueNumber),
    doctorId: v.doctorId,
    doctorName: doctorShort(doctor.fullName),
    room: doctor.room,
    specialtyId: doctor.specialtyId,
    specialtyName: specialtiesDb.get(doctor.specialtyId)?.name ?? '',
    patient: patientDto(patient, today()),
    appointmentId: v.appointmentId,
    appointmentCode: v.appointmentId ? (appointmentsDb.get(v.appointmentId)?.code ?? null) : null,
    isPriority: v.isPriority,
    priorityReason: v.priorityReason,
    isFollowUp: v.isFollowUp,
    isReturned: v.isReturned,
    reason: v.reason,
    checkedInAt: v.checkedInAt,
    checkedInByName: v.checkedInByName,
    startedAt: v.startedAt,
    finishedAt: v.finishedAt,
    skipCount: v.skipCount,
    cancelReason: v.cancelReason,
    canEdit,
    canFinish: canEdit,
    canReopen,
    reopenBlockedReason: reopenBlocked,
    canMedical,
    medical: canMedical ? medicalOf(v, patient.allergies) : null,
    activePlanItems: canMedical ? planOptions(v) : [],
    invoice: invoice ? invoiceBrief(invoice) : null,
  }
}

/** 07 §3.6: chỉ định giữ giá chụp của dòng cũ, dòng mới lấy giá dịch vụ hoặc giá hạng mục kế hoạch. */
function saveOrders(v: VisitRecord, inputs: SaveOrderLine[]): VisitOrderRecord[] {
  const plans = plansDb.all()
  const result: VisitOrderRecord[] = []
  inputs.forEach((input, n) => {
    const prefix = `orders[${n}].`
    let order =
      input.id
        ? v.orders.find((o) => o.id === input.id && (o.serviceId === input.serviceId || (input.treatmentPlanItemId && o.treatmentPlanItemId === input.treatmentPlanItemId)))
        : undefined
    if (!order) {
      if (input.treatmentPlanItemId) {
        const plan = plans.find((p) => p.items.some((i) => i.id === input.treatmentPlanItemId))
        const item = plan?.items.find((i) => i.id === input.treatmentPlanItemId)
        if (!plan || !item || plan.patientId !== v.patientId || plan.status !== 'DangDieuTri' || item.status !== 'ChuaLam')
          throw fieldError(prefix + 'treatmentPlanItemId', 'Hạng mục không thuộc kế hoạch đang điều trị của bệnh nhân hoặc đã làm')
        if (visitsDb.some((x) => x.id !== v.id && x.orders.some((o) => o.treatmentPlanItemId === item.id)))
          throw fieldError(prefix + 'treatmentPlanItemId', 'Hạng mục đã đưa vào lượt khám khác')
        const svc = servicesDb.get(item.serviceId)!
        order = {
          id: newId(),
          serviceId: svc.id,
          serviceCode: item.serviceCode,
          serviceName: item.serviceName,
          group: svc.group,
          unit: item.unit,
          teeth: item.teeth,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discountAmount,
          result: null,
          imageUrls: null,
          status: 'ChoThucHien',
          treatmentPlanItemId: item.id,
          sortOrder: n,
        }
      } else {
        const svc = servicesDb.get(input.serviceId)
        if (!svc || !svc.isActive) throw fieldError(prefix + 'serviceId', 'Dịch vụ không còn dùng')
        order = {
          id: newId(),
          serviceId: svc.id,
          serviceCode: svc.code,
          serviceName: svc.name,
          group: svc.group,
          unit: svc.unit,
          teeth: null,
          quantity: 1,
          unitPrice: svc.price,
          discount: 0,
          result: null,
          imageUrls: null,
          status: 'ChoThucHien',
          treatmentPlanItemId: null,
          sortOrder: n,
        }
      }
    } else order = { ...order }
    order.sortOrder = n
    if (!order.treatmentPlanItemId) {
      const svc = servicesDb.get(order.serviceId)
      const requiresTooth = svc ? svc.requiresTooth : order.unit === 'Rang'
      if (requiresTooth) {
        if (!input.teeth?.length) throw fieldError(prefix + 'teeth', 'Chọn vị trí răng')
        order.teeth = formatTeeth(input.teeth)
        order.quantity = input.teeth.length
      } else {
        order.teeth = null
        order.quantity = input.quantity
      }
    }
    if (order.group === 'CanLamSang') {
      let status = input.status ?? 'ChoThucHien'
      if (status !== 'ChoThucHien' && status !== 'CoKetQua' && status !== 'KhongThucHien') status = 'ChoThucHien'
      const res = trimOrNull(input.result)
      if (status === 'CoKetQua' && !res) throw fieldError(prefix + 'result', 'Nhập kết quả')
      order.status = status
      order.result = status === 'KhongThucHien' ? null : res
      order.imageUrls = input.imageUrls?.length ? input.imageUrls.slice(0, clinicRules.maxImages).join('\n') : null
    } else {
      order.status = 'ChoThucHien'
      order.result = null
      order.imageUrls = null
    }
    result.push(order)
  })
  return result
}

/** BR-18, BR-19: mỗi thuốc một dòng, giá chụp lúc kê, cảnh báo dị ứng phải xác nhận. */
function savePrescription(v: VisitRecord, allergies: string | null, inputs: SavePrescriptionLine[], actorName: string): PrescriptionRecord[] {
  const now = nowIso()
  return inputs.map((input, n) => {
    const prefix = `prescription[${n}].`
    let line = v.prescription.find((p) => p.medicineId === input.medicineId)
    if (!line) {
      const med = medicinesDb.get(input.medicineId)
      if (!med || !med.isActive) throw fieldError(prefix + 'medicineId', 'Thuốc đã ngừng, không kê được')
      line = {
        id: newId(),
        medicineId: med.id,
        medicineCode: med.code,
        name: med.name,
        strength: med.strength,
        unit: med.unit,
        activeIngredient: med.activeIngredient,
        quantity: input.quantity,
        days: input.days,
        usage: input.usage,
        unitPrice: med.price,
        allergyConfirmedByName: null,
        allergyConfirmedAt: null,
        sortOrder: n,
      }
    } else line = { ...line }
    const matches = allergyMatches(allergies, line.activeIngredient)
    if (matches.length > 0) {
      if (!input.allergyConfirmed && !line.allergyConfirmedAt)
        throw conflictError(errorCodes.trungDiUng, `Bệnh nhân có ghi nhận dị ứng: ${matches.join(', ')}`, undefined, { medicineId: line.medicineId, keywords: matches })
      if (!line.allergyConfirmedAt) {
        line.allergyConfirmedAt = now
        line.allergyConfirmedByName = actorName
      }
    }
    line.quantity = input.quantity
    line.days = input.days
    line.usage = input.usage.trim()
    line.sortOrder = n
    return line
  })
}

export const visitMock = {
  async get(id: string): Promise<VisitDetailDto> {
    await mockDelay()
    requirePermission(permissions.queueTickets.view, permissions.patients.view)
    ensureFresh()
    return visitDetail(id, true)
  },

  async getList(query: VisitQuery): Promise<PaginatedResult<VisitSummaryDto>> {
    await mockDelay()
    requirePermission(permissions.patients.view)
    ensureFresh()
    const me = actor()
    const medical = !!query.withMedical && can(me, permissions.medicalRecords.view)
    const patients = new Map(patientsDb.all().map((p) => [p.id, p]))
    const doctors = new Map(doctorsDb.all().map((d) => [d.id, d]))
    const specs = new Map(specialtiesDb.all().map((s) => [s.id, s.name]))
    const term = normalizeVi(query.search)
    const list = visitsDb.filter((v) => {
      if (query.patientId && v.patientId !== query.patientId) return false
      if (query.doctorId && v.doctorId !== query.doctorId) return false
      if (query.from && v.date < query.from) return false
      if (query.to && v.date > query.to) return false
      if (query.status && v.status !== query.status) return false
      if (term) {
        const p = patients.get(v.patientId)
        if (!normalizeVi(`${v.code} ${p?.fullName ?? ''} ${p?.code ?? ''}`).includes(term)) return false
      }
      return true
    })
    const page = paginate(sortItems(list, query.sortBy || 'checkedInAt', query.sortDir || 'desc'), query)
    if (medical && query.patientId && page.items.length > 0) {
      const p = patients.get(query.patientId)
      if (p) logMedicalView(p, 'Lịch sử khám')
    }
    return {
      ...page,
      items: page.items.map((v) => {
        const p = patients.get(v.patientId)!
        const d = doctors.get(v.doctorId)!
        const invoice = liveInvoice(v.id)
        const orders = [...v.orders].sort((a, b) => a.sortOrder - b.sortOrder)
        return {
          id: v.id,
          code: v.code,
          date: v.date,
          checkedInAt: v.checkedInAt,
          finishedAt: v.finishedAt,
          patientId: v.patientId,
          patientCode: p.code,
          patientName: p.fullName,
          doctorId: v.doctorId,
          doctorName: doctorShort(d.fullName),
          specialtyName: specs.get(d.specialtyId) ?? '',
          status: v.status,
          services: orders.filter((o) => o.status !== 'KhongThucHien').map((o) => o.serviceName).join(', '),
          total: invoice?.total ?? null,
          invoiceStatus: invoice?.status ?? null,
          diagnoses: medical
            ? [...v.diagnoses]
                .sort((a, b) => (a.kind === b.kind ? a.sortOrder - b.sortOrder : a.kind === 'Chinh' ? -1 : 1))
                .map((x) => (x.icdCode ? `${x.icdCode} ${x.name}` : x.name))
                .join('; ')
            : null,
          prescription: medical
            ? [...v.prescription].sort((a, b) => a.sortOrder - b.sortOrder).map((r) => `${r.name} x ${r.quantity} ${r.unit}`).join('; ')
            : null,
          results: medical ? orders.filter((o) => o.result).map((o) => `${o.serviceName}: ${o.result}`).join('; ') : null,
          advice: medical ? v.advice : null,
        }
      }),
    }
  },

  async save(id: string, input: SaveVisitInput): Promise<VisitDetailDto> {
    await mockDelay()
    requirePermission(permissions.visits.examine)
    ensureFresh()
    const e = validateVisit(input)
    if (hasErrors(e)) throw fieldErrors(e)
    const v = visitsDb.get(id)
    if (!v) throw notFoundError('Không tìm thấy lượt khám.')
    ensureCanEdit(v)
    const me = actor()
    const patient = patientsDb.get(v.patientId)!
    const day = today()
    const orders = saveOrders(v, input.orders)
    const prescription = savePrescription(v, patient.allergies, input.prescription, me.fullName)
    let followUpDate: string | null = null
    let followUpNote: string | null = null
    if (input.followUpDate) {
      if (input.followUpDate <= day || input.followUpDate > addDaysKey(day, clinicRules.maxFollowUpDays))
        throw fieldError('followUpDate', `Ngày hẹn tái khám từ ngày mai tới ${clinicRules.maxFollowUpDays} ngày sau`)
      followUpDate = input.followUpDate
      followUpNote = trimOrNull(input.followUpNote)
    }
    visitsDb.update(id, {
      temperature: input.temperature,
      pulse: input.pulse,
      bpSystolic: input.bpSystolic,
      bpDiastolic: input.bpDiastolic,
      weight: input.weight,
      height: input.height,
      symptoms: trimOrNull(input.symptoms),
      examination: trimOrNull(input.examination),
      advice: trimOrNull(input.advice),
      diagnoses: [...input.diagnoses]
        .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'Chinh' ? -1 : 1))
        .map((d, n) => ({ id: newId(), kind: d.kind, icdCode: d.icdCode?.trim() ? d.icdCode.trim().toUpperCase() : null, name: d.name.trim(), sortOrder: n })),
      orders,
      prescription,
      followUpDate,
      followUpNote,
    })
    return visitDetail(id, false)
  },

  async finish(id: string): Promise<VisitDetailDto> {
    await mockDelay()
    requirePermission(permissions.visits.examine)
    ensureFresh()
    const v = visitsDb.get(id)
    if (!v) throw notFoundError('Không tìm thấy lượt khám.')
    ensureCanEdit(v)
    // BR-17: chẩn đoán chính, kết quả cận lâm sàng
    const missing: string[] = []
    if (!v.diagnoses.some((d) => d.kind === 'Chinh')) missing.push('Thiếu chẩn đoán chính')
    for (const o of [...v.orders].sort((a, b) => a.sortOrder - b.sortOrder))
      if (o.group === 'CanLamSang' && o.status === 'ChoThucHien') missing.push(`${o.serviceName} chưa có kết quả`)
    if (missing.length > 0) throw domainError(errorCodes.thieuThongTinKham, missing[0], { missing })

    const now = nowIso()
    const orders = v.orders.map((o) => (o.group !== 'CanLamSang' ? { ...o, status: 'DaLam' as const } : o))
    // BR-23: hạng mục kế hoạch làm ở lượt này
    const itemIds = new Set(orders.filter((o) => o.treatmentPlanItemId).map((o) => o.treatmentPlanItemId!))
    if (itemIds.size > 0) {
      for (const plan of plansDb.filter((p) => p.items.some((i) => itemIds.has(i.id)))) {
        const items = plan.items.map((i) => (itemIds.has(i.id) ? { ...i, status: 'DaLam' as const, doneAt: now } : i))
        const done = plan.status === 'DangDieuTri' && items.filter((i) => i.status !== 'DaHuy').every((i) => i.status === 'DaLam')
        plansDb.update(plan.id, { items, ...(done ? { status: 'HoanThanh' as const, completedAt: now } : {}) })
      }
    }
    // Phiếu thanh toán (07 §3.7 bước 3, 4)
    const doctor = doctorsDb.get(v.doctorId)!
    const examId = specialtiesDb.get(doctor.specialtyId)?.examServiceId
    const exam = examId ? servicesDb.get(examId) : undefined
    const lines = buildLines(v.isFollowUp, exam, orders, v.prescription, newId)
    const { total, medicineTotal } = totals(lines)
    const invoice: InvoiceRecord = {
      id: newId(),
      code: nextDocCode(clinicRules.invoicePrefix, today()),
      visitId: v.id,
      patientId: v.patientId,
      doctorId: v.doctorId,
      total,
      medicineTotal,
      paid: 0,
      status: statusFor(total, 0),
      cancelledAt: null,
      createdAt: now,
      lines,
    }
    invoicesDb.insert(invoice)
    visitsDb.update(id, { orders, status: total === 0 ? 'HoanTat' : 'ChoThanhToan', finishedAt: now })
    // BR-29: dòng nhắc tái khám
    if (v.followUpDate)
      followUpsDb.insert({
        id: newId(),
        patientId: v.patientId,
        doctorId: v.doctorId,
        visitId: v.id,
        dueDate: v.followUpDate,
        note: v.followUpNote,
        sendCount: 0,
        lastSentAt: null,
        callResult: null,
        callNote: null,
        calledAt: null,
        appointmentId: null,
        returnedVisitId: null,
        status: 'ChoNhac',
        createdAt: now,
      })
    return visitDetail(id, false)
  },

  async reopen(id: string): Promise<VisitDetailDto> {
    await mockDelay()
    requirePermission(permissions.visits.reopen)
    ensureFresh()
    const v = visitsDb.get(id)
    if (!v) throw notFoundError('Không tìm thấy lượt khám.')
    const me = actor()
    if (!me.isSuperAdmin && me.doctorId !== v.doctorId) throw conflictError(errorCodes.khongMoLaiDuoc, 'Chỉ bác sĩ khám mở lại được phiếu')
    const blocked = reopenBlockedReason(v)
    if (blocked) throw conflictError(errorCodes.khongMoLaiDuoc, blocked)
    const now = nowIso()
    for (const i of invoicesDb.filter((x) => x.visitId === id && x.status !== 'DaHuy')) invoicesDb.update(i.id, { status: 'DaHuy', cancelledAt: now })
    const orders = v.orders.map((o) => (o.status === 'DaLam' ? { ...o, status: 'ChoThucHien' as const } : o))
    const itemIds = new Set(orders.filter((o) => o.treatmentPlanItemId).map((o) => o.treatmentPlanItemId!))
    if (itemIds.size > 0) {
      for (const plan of plansDb.filter((p) => p.items.some((i) => itemIds.has(i.id)))) {
        const items = plan.items.map((i) => (itemIds.has(i.id) && i.status === 'DaLam' ? { ...i, status: 'ChuaLam' as const, doneAt: null } : i))
        plansDb.update(plan.id, { items, ...(plan.status === 'HoanThanh' ? { status: 'DangDieuTri' as const, completedAt: null } : {}) })
      }
    }
    followUpsDb.removeWhere((f) => f.visitId === id && f.sendCount === 0 && f.callResult === null && f.status === 'ChoNhac')
    visitsDb.update(id, { orders, status: 'DangKham', finishedAt: null })
    return visitDetail(id, false)
  },

  async getPrescription(id: string): Promise<PrescriptionPrintDto> {
    await mockDelay(60, 120)
    requirePermission(permissions.medicalRecords.view)
    ensureFresh()
    const v = visitsDb.get(id)
    if (!v) throw notFoundError('Không tìm thấy lượt khám.')
    const patient = patientsDb.get(v.patientId)!
    const doctor = doctorsDb.get(v.doctorId)!
    logMedicalView(patient, `In đơn thuốc ${v.code}`)
    return {
      clinic: profile(),
      visitCode: v.code,
      date: v.date,
      patientCode: patient.code,
      patientName: patient.fullName,
      birthDate: patient.birthDate,
      age: ageOn(patient.birthDate, v.date),
      gender: patient.gender,
      phone: patient.phone,
      address: patient.address,
      allergies: patient.allergies,
      doctorName: doctorShort(doctor.fullName),
      diagnoses: [...v.diagnoses]
        .sort((a, b) => (a.kind === b.kind ? a.sortOrder - b.sortOrder : a.kind === 'Chinh' ? -1 : 1))
        .map((d) => (d.icdCode ? `${d.name} (${d.icdCode})` : d.name))
        .join('; '),
      lines: [...v.prescription]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((p) => ({ name: p.name, strength: p.strength, activeIngredient: p.activeIngredient, unit: p.unit, quantity: p.quantity, days: p.days, usage: p.usage })),
      advice: v.advice,
      followUpDate: v.followUpDate,
      followUpNote: v.followUpNote,
    }
  },

  async getPhrases(): Promise<UsagePhraseDto[]> {
    await mockDelay(40, 80)
    requirePermission(permissions.visits.examine)
    const me = actor()
    return phrasesDb
      .filter((p) => p.userId === me.userId)
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
      .map((p) => ({ id: p.id, text: p.text }))
  },

  async addPhrase(text: string): Promise<UsagePhraseDto> {
    await mockDelay(40, 80)
    requirePermission(permissions.visits.examine)
    const me = actor()
    if (!me.userId) throw forbiddenError('Cần đăng nhập.')
    const value = (text ?? '').trim()
    if (!value) throw fieldError('text', 'Nhập câu mẫu')
    if (value.length > 200) throw fieldError('text', 'Câu mẫu tối đa 200 ký tự')
    const existing = phrasesDb.find((p) => p.userId === me.userId && p.text === value)
    if (existing) return { id: existing.id, text: existing.text }
    const record = { id: newId(), userId: me.userId, text: value, createdAt: nowIso() }
    phrasesDb.insert(record)
    return { id: record.id, text: record.text }
  },

  async deletePhrase(id: string): Promise<void> {
    await mockDelay(40, 80)
    requirePermission(permissions.visits.examine)
    const me = actor()
    const phrase = phrasesDb.get(id)
    if (!phrase || phrase.userId !== me.userId) throw notFoundError('Không tìm thấy câu mẫu.')
    phrasesDb.remove(id)
  },
}
