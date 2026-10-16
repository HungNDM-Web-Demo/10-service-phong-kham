import { formatVnd } from '@/lib/format'
import type { InvoiceLineDto, PaymentMethod } from '@/types/clinic'

/**
 * Phép tính phía giao diện của màn hình thu tiền (07 §3.9; BR-21, BR-24, BR-25, BR-26). Máy chủ luôn kiểm lại; FE tính
 * trước để lễ tân thấy ngay tổng sau khi tick "Mua ngoài", tiền thối, số tối thiểu (tiền thuốc).
 */

/** Dòng thuốc đang đánh dấu mua ngoài theo dữ liệu máy chủ */
export const outsideIdsOf = (lines: InvoiceLineDto[]): Set<string> =>
  new Set(lines.filter((l) => l.kind === 'Thuoc' && l.isOutside).map((l) => l.id))

export type InvoiceTotals = {
  /** Tổng phải thu, không gồm dòng thuốc mua ngoài (BR-21) */
  total: number
  /** Tiền thuốc lấy tại quầy (BR-25: tổng đã thu không nhỏ hơn số này) */
  medicineTotal: number
  /** Tiền các dòng thuốc mua ngoài (không tính) */
  outsideTotal: number
}

export function computeTotals(lines: InvoiceLineDto[], outside: ReadonlySet<string>): InvoiceTotals {
  let total = 0
  let medicineTotal = 0
  let outsideTotal = 0
  for (const l of lines) {
    if (l.kind === 'Thuoc' && outside.has(l.id)) {
      outsideTotal += l.amount
      continue
    }
    total += l.amount
    if (l.kind === 'Thuoc') medicineTotal += l.amount
  }
  return { total, medicineTotal, outsideTotal }
}

/** Nút mệnh giá nhanh: đúng số tiền rồi làm tròn lên các mốc 10.000 / 50.000 / 100.000 / 500.000 / 1.000.000 */
export function quickCashAmounts(amount: number): number[] {
  if (amount <= 0) return []
  const steps = [10_000, 50_000, 100_000, 500_000, 1_000_000]
  const list = [amount, ...steps.map((s) => Math.ceil(amount / s) * s)]
  return [...new Set(list)].filter((v) => v >= amount).slice(0, 5)
}

export type CollectDraft = {
  amount: number | null
  method: PaymentMethod
  cashReceived: number | null
  partialReason: string
}

export type CollectIssues = Partial<Record<'amount' | 'cashReceived' | 'partialReason', string>>

/**
 * Lỗi của bản nháp thu tiền. `blocking` khóa nút Hoàn tất ngay (UC-11 E1, E2); lý do thu một phần chỉ báo khi bấm
 * Hoàn tất mà còn trống.
 */
export function collectIssues(
  draft: CollectDraft,
  remaining: number,
  medicineMin: number
): { issues: CollectIssues; blocking: boolean } {
  const issues: CollectIssues = {}
  const amount = draft.amount ?? 0
  if (!draft.amount || amount < 1) issues.amount = 'Nhập số tiền thu'
  else if (amount > remaining) issues.amount = `Số tiền thu tối đa ${formatVnd(remaining)} (còn phải thu)`
  else if (amount < medicineMin) issues.amount = `Số tiền thu tối thiểu ${formatVnd(medicineMin)} (tiền thuốc)`
  if (draft.method === 'TienMat' && amount > 0) {
    const cash = draft.cashReceived ?? 0
    if (cash < amount) issues.cashReceived = `Còn thiếu ${formatVnd(amount - cash)}`
  }
  const blocking = !!issues.amount || !!issues.cashReceived
  if (amount > 0 && amount < remaining && !draft.partialReason.trim()) issues.partialReason = 'Nhập lý do thu một phần'
  return { issues, blocking }
}

/** Mã chống gửi trùng (UC-11 E4): một mã cho mỗi lần mở hộp thu tiền */
export function newRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}
