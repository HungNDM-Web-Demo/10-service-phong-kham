import type { RevenueGroup, ServiceGroup } from '@/types/clinic'
import { clinicRules, teethLabel } from '../lib/rules'
import type { InvoiceLineRecord, PrescriptionRecord, ServiceRecord, VisitOrderRecord } from './records'

/**
 * Lập dòng phiếu thanh toán khi kết thúc khám (07 §3.7 bước 3, BR-20, BR-21), giống BE `InvoiceBuilder`.
 * Dùng chung cho handler mock và bộ nạp dữ liệu mẫu.
 */

export const groupOf = (group: ServiceGroup): RevenueGroup =>
  group === 'Kham' ? 'Kham' : group === 'ThuThuat' ? 'ThuThuat' : 'CanLamSang'

export function buildLines(
  isFollowUp: boolean,
  examService: ServiceRecord | null | undefined,
  orders: VisitOrderRecord[],
  prescription: PrescriptionRecord[],
  makeId: () => string,
  outsideMedicineIds?: Set<string>
): InvoiceLineRecord[] {
  const lines: InvoiceLineRecord[] = []
  let order = 0
  const line = (
    kind: InvoiceLineRecord['kind'],
    reportGroup: RevenueGroup,
    refId: string | null,
    description: string,
    note: string | null,
    unitPrice: number,
    quantity: number,
    discount: number,
    isOutside: boolean
  ): InvoiceLineRecord => ({
    id: makeId(),
    kind,
    reportGroup,
    refId,
    description: description.slice(0, 250),
    note,
    unitPrice,
    quantity,
    discount,
    amount: unitPrice * quantity - discount,
    isOutside,
    sortOrder: order++,
  })
  if (examService) {
    lines.push(
      line('PhiKham', 'Kham', examService.id, examService.name, isFollowUp ? clinicRules.followUpFreeNote : null, isFollowUp ? 0 : examService.price, 1, 0, false)
    )
  }
  for (const o of [...orders].filter((x) => x.status !== 'KhongThucHien').sort((a, b) => a.sortOrder - b.sortOrder)) {
    const teeth = teethLabel(o.teeth)
    lines.push(line('DichVu', groupOf(o.group), o.id, teeth ? `${o.serviceName} (${teeth})` : o.serviceName, null, o.unitPrice, o.quantity, o.discount, false))
  }
  for (const p of [...prescription].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const name = p.strength?.trim() && !p.name.toLowerCase().includes(p.strength.trim().toLowerCase()) ? `${p.name} ${p.strength}` : p.name
    lines.push(line('Thuoc', 'Thuoc', p.id, name, null, p.unitPrice, p.quantity, 0, outsideMedicineIds?.has(p.medicineId) ?? false))
  }
  return lines
}

/** Tổng phải thu và tổng tiền thuốc, không gồm dòng mua ngoài (BR-21). */
export function totals(lines: InvoiceLineRecord[]): { total: number; medicineTotal: number } {
  const counted = lines.filter((l) => !l.isOutside)
  return {
    total: counted.reduce((s, l) => s + l.amount, 0),
    medicineTotal: counted.filter((l) => l.kind === 'Thuoc').reduce((s, l) => s + l.amount, 0),
  }
}

export const statusFor = (total: number, paid: number) =>
  paid <= 0 ? (total <= 0 ? 'DaThuDu' : 'ChoThu') : paid >= total ? 'DaThuDu' : 'ThuMotPhan'
