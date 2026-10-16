import { permissions } from '@/config/permissions'
import { mockDelay } from '@/lib/data-source'
import { normalizeVi } from '@/lib/normalize'
import { requirePermission } from '@/mock/mock-auth'
import { newId, paginate, sortItems } from '@/mock/mock-helpers'
import type { PaginatedResult } from '@/types/api'
import type { CollectInput, InvoiceDto, InvoiceListItem, InvoiceQuery, ReasonInput, ReceiptDto, ReceiptListItem, ReceiptQuery } from '@/types/clinic'
import { clinicRules, doctorShort, ticketOf } from '../lib/rules'
import { inVnRange } from '../lib/vn-time'
import { conflictError, domainError, errorCodes, fieldError, fieldErrors, invalidState, notFoundError } from './errors'
import { statusFor, totals } from './invoice-builder'
import { invoiceDebt, isValidReceipt, lineDto, money, patientBrief } from './mappers'
import { trimOrNull } from './patient-support'
import type { ReceiptRecord } from './records'
import { actor, can, doctorsDb, ensureFresh, invoicesDb, nextDocCode, nowIso, patientsDb, receiptsDb, today, vnDateKey, visitsDb } from './store'

/** Handler mock thu phí, phiếu thu (07 §3.9, §3.10, §4.9), giống BE `InvoiceService`. */

const visitCode = (visitId: string) => visitsDb.get(visitId)?.code ?? ''

export function invoiceDto(id: string): InvoiceDto {
  const i = invoicesDb.get(id)
  if (!i) throw notFoundError('Không tìm thấy phiếu thanh toán.')
  const patient = patientsDb.get(i.patientId)!
  const receipts = receiptsDb.filter((r) => r.invoiceId === i.id).sort((a, b) => (a.collectedAt < b.collectedAt ? -1 : 1))
  const open = i.status === 'ChoThu' || i.status === 'ThuMotPhan'
  return {
    id: i.id,
    code: i.code,
    visitId: i.visitId,
    visitCode: visitCode(i.visitId),
    patient: patientBrief(patient, today()),
    doctorId: i.doctorId,
    doctorName: doctorShort(doctorsDb.get(i.doctorId)?.fullName ?? ''),
    total: i.total,
    medicineTotal: i.medicineTotal,
    paid: i.paid,
    debt: invoiceDebt(i),
    status: i.status,
    createdAt: i.createdAt,
    cancelledAt: i.cancelledAt,
    lines: [...i.lines].sort((a, b) => a.sortOrder - b.sortOrder).map(lineDto),
    receipts: receipts.map((r) => ({
      id: r.id,
      code: r.code,
      amount: r.amount,
      method: r.method,
      collectedAt: r.collectedAt,
      collectedByName: r.collectedByName,
      status: r.status,
      cancelReason: r.cancelReason,
    })),
    canCollect: open,
    canEditOutside: open && !receipts.some(isValidReceipt),
    patientOtherDebt: invoicesDb
      .filter((x) => x.patientId === i.patientId && x.id !== i.id && (x.status === 'ChoThu' || x.status === 'ThuMotPhan'))
      .reduce((s, x) => s + x.total - x.paid, 0),
  }
}

export function receiptDto(id: string): ReceiptDto {
  const r = receiptsDb.get(id)
  if (!r) throw notFoundError('Không tìm thấy phiếu thu.')
  const i = invoicesDb.get(r.invoiceId)!
  const patient = patientsDb.get(i.patientId)!
  const all = receiptsDb.filter((x) => x.invoiceId === i.id)
  const paidToDate = all.filter((x) => isValidReceipt(x) && (x.collectedAt < r.collectedAt || x.id === r.id)).reduce((s, x) => s + x.amount, 0)
  return {
    id: r.id,
    code: r.code,
    invoiceId: i.id,
    invoiceCode: i.code,
    visitCode: visitCode(i.visitId),
    patient: patientBrief(patient, today()),
    doctorName: doctorShort(doctorsDb.get(i.doctorId)?.fullName ?? ''),
    amount: r.amount,
    method: r.method,
    cashReceived: r.cashReceived,
    changeAmount: r.changeAmount,
    partialReason: r.partialReason,
    collectedAt: r.collectedAt,
    collectedByName: r.collectedByName,
    status: r.status,
    cancelReason: r.cancelReason,
    cancelledAt: r.cancelledAt,
    cancelledByName: r.cancelledByName,
    canCancel: isValidReceipt(r) && vnDateKey(r.collectedAt) === today() && can(actor(), permissions.invoices.cancel),
    lines: [...i.lines].sort((a, b) => a.sortOrder - b.sortOrder).map(lineDto),
    invoiceTotal: i.total,
    paidToDate,
    debtAfter: Math.max(0, i.total - paidToDate),
  }
}

export type CollectResult = { value: ReceiptDto; created: boolean }

export const invoiceMock = {
  async getList(query: InvoiceQuery): Promise<PaginatedResult<InvoiceListItem>> {
    await mockDelay()
    requirePermission(permissions.invoices.view)
    ensureFresh()
    const patients = new Map(patientsDb.all().map((p) => [p.id, p]))
    const term = normalizeVi(query.search)
    const list = invoicesDb.filter((i) => {
      if (query.status && i.status !== query.status) return false
      if (query.hasDebt && i.status !== 'ChoThu' && i.status !== 'ThuMotPhan') return false
      if (query.patientId && i.patientId !== query.patientId) return false
      if (!inVnRange(i.createdAt, query.from, query.to)) return false
      if (term) {
        const p = patients.get(i.patientId)
        if (!normalizeVi(`${i.code} ${p?.fullName ?? ''} ${p?.phone ?? ''} ${p?.code ?? ''}`).includes(term)) return false
      }
      return true
    })
    const sortDir = query.sortDir || (query.sortBy ? 'desc' : query.status === 'ChoThu' ? 'asc' : 'desc')
    const page = paginate(sortItems(list, query.sortBy || 'createdAt', sortDir), query)
    return {
      ...page,
      items: page.items.map((i) => {
        const p = patients.get(i.patientId)!
        const doctor = doctorsDb.get(i.doctorId)
        const visit = visitsDb.get(i.visitId)
        return {
          id: i.id,
          code: i.code,
          visitId: i.visitId,
          visitCode: visitCode(i.visitId),
          ticket: doctor && visit ? ticketOf(doctor.room, visit.queueNumber) : null,
          patientId: i.patientId,
          patientCode: p.code,
          patientName: p.fullName,
          patientPhone: p.phone,
          doctorName: doctorShort(doctor?.fullName ?? ''),
          total: i.total,
          paid: i.paid,
          debt: invoiceDebt(i),
          status: i.status,
          createdAt: i.createdAt,
        }
      }),
    }
  },

  async get(id: string): Promise<InvoiceDto> {
    await mockDelay()
    requirePermission(permissions.invoices.view)
    ensureFresh()
    return invoiceDto(id)
  },

  async collect(invoiceId: string, input: CollectInput): Promise<CollectResult> {
    await mockDelay()
    requirePermission(permissions.invoices.collect)
    ensureFresh()
    const errors: Record<string, string> = {}
    if (!(input.amount > 0)) errors.amount = 'Nhập số tiền thu'
    if (!input.method) errors.method = 'Chọn phương thức'
    if ((input.partialReason ?? '').length > 200) errors.partialReason = 'Lý do tối đa 200 ký tự'
    if (Object.keys(errors).length) throw fieldErrors(errors)
    const requestId = trimOrNull(input.clientRequestId)
    if (requestId) {
      const done = receiptsDb.find((r) => r.clientRequestId === requestId)
      if (done) return { value: receiptDto(done.id), created: false }
    }
    let invoice = invoicesDb.get(invoiceId)
    if (!invoice) throw notFoundError('Không tìm thấy phiếu thanh toán.')
    if (invoice.status !== 'ChoThu' && invoice.status !== 'ThuMotPhan') throw invalidState('Phiếu thanh toán đã thu đủ hoặc đã hủy.')
    const receipts = receiptsDb.filter((r) => r.invoiceId === invoice!.id)

    // BR-26: thuốc mua ngoài chỉ đổi khi chưa có phiếu thu
    const wanted = new Set(input.outsideLineIds)
    const current = new Set(invoice.lines.filter((l) => l.isOutside).map((l) => l.id))
    const changed = wanted.size !== current.size || [...wanted].some((x) => !current.has(x))
    if (changed) {
      if (receipts.some(isValidReceipt)) throw invalidState('Đã có phiếu thu, không đổi thuốc mua ngoài được (BR-26).')
      const lines = invoice.lines.map((l) => ({ ...l, isOutside: l.kind === 'Thuoc' && wanted.has(l.id) }))
      invoice = invoicesDb.update(invoice.id, { lines, ...totals(lines) })!
    }
    if (input.expectedTotal !== invoice.total)
      throw conflictError(errorCodes.tongTienDaDoi, `Tổng phải thu đã đổi thành ${money(invoice.total)}, kiểm tra lại`, undefined, { serverTotal: invoice.total })
    const remaining = invoice.total - invoice.paid
    if (remaining <= 0) {
      invoicesDb.update(invoice.id, { status: 'DaThuDu' })
      throw invalidState('Phiếu thanh toán không còn số phải thu.')
    }
    if (input.amount < 1 || input.amount > remaining) throw fieldError('amount', `Số tiền thu từ 1 ₫ đến ${money(remaining)}`)
    const partialReason = trimOrNull(input.partialReason)
    if (input.amount < remaining && !partialReason) throw fieldError('partialReason', 'Nhập lý do thu một phần')
    if (invoice.paid + input.amount < invoice.medicineTotal) {
      const min = invoice.medicineTotal - invoice.paid
      throw domainError(errorCodes.thuThieuTienThuoc, `Số tiền thu tối thiểu ${money(min)} (tiền thuốc)`, { minAmount: min })
    }
    let cash: number | null = null
    let change: number | null = null
    if (input.method === 'TienMat') {
      cash = input.cashReceived ?? input.amount
      if (cash < input.amount) throw fieldError('cashReceived', `Tiền khách đưa phải từ ${money(input.amount)}`)
      change = cash - input.amount
    }
    const me = actor()
    const receipt: ReceiptRecord = {
      id: newId(),
      code: nextDocCode(clinicRules.receiptPrefix, today()),
      invoiceId: invoice.id,
      patientId: invoice.patientId,
      amount: input.amount,
      method: input.method,
      cashReceived: cash,
      changeAmount: change,
      partialReason: input.amount < remaining ? partialReason : null,
      collectedAt: nowIso(),
      collectedByName: me.fullName,
      status: 'HopLe',
      cancelReason: null,
      cancelledAt: null,
      cancelledByName: null,
      clientRequestId: requestId,
    }
    receiptsDb.insert(receipt)
    const paid = invoice.paid + input.amount
    invoicesDb.update(invoice.id, { paid, status: statusFor(invoice.total, paid) })
    const visit = visitsDb.get(invoice.visitId)
    if (visit?.status === 'ChoThanhToan') visitsDb.update(visit.id, { status: 'HoanTat' })
    return { value: receiptDto(receipt.id), created: true }
  },

  async getReceipts(query: ReceiptQuery): Promise<PaginatedResult<ReceiptListItem>> {
    await mockDelay()
    requirePermission(permissions.invoices.view)
    ensureFresh()
    const patients = new Map(patientsDb.all().map((p) => [p.id, p]))
    const invoices = new Map(invoicesDb.all().map((i) => [i.id, i]))
    const term = normalizeVi(query.search)
    const list = receiptsDb.filter((r) => {
      if (!inVnRange(r.collectedAt, query.from, query.to)) return false
      if (query.method && r.method !== query.method) return false
      if (query.status && r.status !== query.status) return false
      if (query.patientId && r.patientId !== query.patientId) return false
      if (term) {
        const p = patients.get(r.patientId)
        if (!normalizeVi(`${r.code} ${invoices.get(r.invoiceId)?.code ?? ''} ${p?.fullName ?? ''} ${p?.code ?? ''} ${p?.phone ?? ''}`).includes(term)) return false
      }
      return true
    })
    const page = paginate(sortItems(list, query.sortBy || 'collectedAt', query.sortDir || 'desc'), query)
    return {
      ...page,
      items: page.items.map((r) => {
        const p = patients.get(r.patientId)
        return {
          id: r.id,
          code: r.code,
          invoiceId: r.invoiceId,
          invoiceCode: invoices.get(r.invoiceId)?.code ?? '',
          patientId: r.patientId,
          patientCode: p?.code ?? '',
          patientName: p?.fullName ?? '',
          amount: r.amount,
          method: r.method,
          collectedAt: r.collectedAt,
          collectedByName: r.collectedByName,
          status: r.status,
          cancelReason: r.cancelReason,
          cancelledAt: r.cancelledAt,
        }
      }),
    }
  },

  async getReceipt(id: string): Promise<ReceiptDto> {
    await mockDelay()
    requirePermission(permissions.invoices.view)
    ensureFresh()
    return receiptDto(id)
  },

  async cancelReceipt(id: string, input: ReasonInput): Promise<ReceiptDto> {
    await mockDelay()
    requirePermission(permissions.invoices.cancel)
    ensureFresh()
    if (!input.reason?.trim()) throw fieldError('reason', 'Nhập lý do')
    const r = receiptsDb.get(id)
    if (!r) throw notFoundError('Không tìm thấy phiếu thu.')
    if (!isValidReceipt(r)) throw invalidState('Phiếu thu đã hủy.')
    if (vnDateKey(r.collectedAt) !== today()) throw invalidState('Chỉ hủy phiếu thu lập trong hôm nay (BR-27).')
    receiptsDb.update(id, { status: 'DaHuy', cancelReason: input.reason.trim(), cancelledAt: nowIso(), cancelledByName: actor().fullName })
    const invoice = invoicesDb.get(r.invoiceId)!
    const paid = receiptsDb.filter((x) => x.invoiceId === invoice.id && isValidReceipt(x)).reduce((s, x) => s + x.amount, 0)
    invoicesDb.update(invoice.id, { paid, status: statusFor(invoice.total, paid) })
    const visit = visitsDb.get(invoice.visitId)
    if (paid <= 0 && invoice.total > 0 && visit?.status === 'HoanTat') visitsDb.update(visit.id, { status: 'ChoThanhToan' })
    return receiptDto(id)
  },
}
