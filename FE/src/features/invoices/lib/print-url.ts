import { routePath } from '@/config/route-path'

/**
 * Đường dẫn bản in phiếu thu (SCR-15): `print` tự mở hộp in khi mở từ luồng thu tiền, `reprint` in dòng "IN LẠI" (UC-12).
 */
export function receiptPrintUrl(id: string, options: { print?: boolean; reprint?: boolean } = {}): string {
  const base = routePath.receiptPrint(id, options.reprint)
  if (!options.print) return base
  return `${base}${base.includes('?') ? '&' : '?'}print=1`
}
