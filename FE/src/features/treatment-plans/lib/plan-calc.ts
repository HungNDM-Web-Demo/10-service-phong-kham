import { formatVnd } from '@/lib/format'
import { normalizeFieldKey } from '@/lib/api-error'
import type {
  DiscountType,
  SavePlanItemLine,
  SaveTreatmentPlanInput,
  ServiceDto,
  TreatmentPlanItemDto,
} from '@/types/clinic'
import { clinicRules, discountRate, itemDiscount, needsApproval } from '@/features/clinic/lib/rules'
import { validatePlan, type Errors } from '@/features/clinic/lib/validation'

/**
 * Tính tiền hạng mục kế hoạch điều trị ngay trên form, cùng công thức với BE (07 §3.11, BR-22):
 * thành tiền = đơn giá × số lượng − giảm; giảm phần trăm làm tròn xuống bội số 1.000 ₫, tối đa 50% mỗi hạng mục.
 */

export type ItemDraft = {
  /** Khóa React của dòng */
  key: string
  id?: string | null
  serviceId: string
  teeth: number[]
  quantity: number
  discountType: DiscountType
  discountValue: number
}

export type LineAmounts = {
  unitPrice: number
  quantity: number
  gross: number
  discount: number
  amount: number
}

let seq = 0
export const newDraft = (): ItemDraft => ({
  key: `new-item-${++seq}`,
  serviceId: '',
  teeth: [],
  quantity: 1,
  discountType: 'PhanTram',
  discountValue: 0,
})

export const draftFromItem = (i: TreatmentPlanItemDto): ItemDraft => ({
  key: i.id,
  id: i.id,
  serviceId: i.serviceId,
  teeth: [...i.teeth],
  quantity: i.quantity,
  discountType: i.discountType ?? 'PhanTram',
  discountValue: i.discountType ? i.discountValue : 0,
})

export function lineAmounts(d: ItemDraft, svc: ServiceDto | undefined): LineAmounts {
  const unitPrice = svc?.price ?? 0
  const quantity = svc?.requiresTooth ? d.teeth.length : d.quantity
  const gross = unitPrice * quantity
  const type = d.discountValue > 0 ? d.discountType : null
  const raw = svc ? itemDiscount(unitPrice, quantity, type, d.discountValue) : 0
  const discount = Math.max(0, Math.min(raw, gross))
  return { unitPrice, quantity, gross, discount, amount: gross - discount }
}

export function planTotals(lines: LineAmounts[]) {
  const subTotal = lines.reduce((s, l) => s + l.gross, 0)
  const discountTotal = lines.reduce((s, l) => s + l.discount, 0)
  return {
    subTotal,
    discountTotal,
    total: subTotal - discountTotal,
    rate: discountRate(subTotal, discountTotal),
    approval: needsApproval(subTotal, discountTotal),
  }
}

/** Dòng gửi API: không giảm thì bỏ loại giảm; dịch vụ theo răng thì số lượng = số răng. */
export function toSaveLine(d: ItemDraft, svc: ServiceDto | undefined): SavePlanItemLine {
  const byTooth = !!svc?.requiresTooth
  return {
    id: d.id ?? null,
    serviceId: d.serviceId,
    teeth: byTooth ? d.teeth : null,
    quantity: byTooth ? d.teeth.length : d.quantity,
    discountType: d.discountValue > 0 ? d.discountType : null,
    discountValue: d.discountValue > 0 ? d.discountValue : 0,
  }
}

/** Lỗi của form, khóa dạng "items.0.discountValue" giống lỗi API sau khi chuẩn hóa. */
export function planErrors(
  input: SaveTreatmentPlanInput,
  drafts: ItemDraft[],
  services: Map<string, ServiceDto>
): Errors {
  const errors: Errors = {}
  for (const [k, v] of Object.entries(validatePlan(input))) errors[normalizeFieldKey(k)] = v
  drafts.forEach((d, n) => {
    const svc = services.get(d.serviceId)
    if (!svc) return
    const key = (f: string) => `items.${n}.${f}`
    if (svc.requiresTooth && d.teeth.length === 0) errors[key('teeth')] ??= 'Chọn vị trí răng'
    if (
      !svc.requiresTooth &&
      !(
        Number.isInteger(d.quantity) &&
        d.quantity >= 1 &&
        d.quantity <= clinicRules.maxOrderQuantity
      )
    )
      errors[key('quantity')] ??= `Số lượng từ 1 đến ${clinicRules.maxOrderQuantity}`
    const { gross } = lineAmounts(d, svc)
    if (
      d.discountType === 'SoTien' &&
      d.discountValue * 100 > gross * clinicRules.maxItemDiscountPercent
    )
      errors[key('discountValue')] ??=
        `Giảm tối đa ${clinicRules.maxItemDiscountPercent}% thành tiền (${formatVnd(Math.floor(gross / 2))})`
  })
  return errors
}

/** Lỗi giảm giá hiện ngay khi gõ (không đợi bấm Lưu). */
export function liveDiscountError(d: ItemDraft, gross: number): string | null {
  if (d.discountValue <= 0) return null
  if (d.discountType === 'PhanTram') {
    if (!Number.isInteger(d.discountValue) || d.discountValue > clinicRules.maxItemDiscountPercent)
      return `Tối đa ${clinicRules.maxItemDiscountPercent}%`
    return null
  }
  if (d.discountValue % 1000 !== 0) return 'Bội số 1.000 ₫'
  if (gross > 0 && d.discountValue * 100 > gross * clinicRules.maxItemDiscountPercent)
    return `Tối đa ${formatVnd(Math.floor(gross / 2))}`
  return null
}

/** Tỉ lệ giảm hiển thị 1 chữ số thập phân: 7,1% (07 §3.11). */
export const formatRate = (rate: number) =>
  rate === 0
    ? '0'
    : rate.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
