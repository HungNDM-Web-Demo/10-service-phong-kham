import { ApiError } from '@/lib/api-error'

/** Lỗi nghiệp vụ có `code` giống BE (07 §2.2, `ClinicProblems`). */

export const errorCodes = {
  khungKhongHopLe: 'KhungKhongHopLe',
  khungHetCho: 'KhungHetCho',
  quaSoLichOnline: 'QuaSoLichOnline',
  khongTiepDonHomNay: 'KhongTiepDonHomNay',
  benhNhanDangKham: 'BenhNhanDangKham',
  bacSiDangKham: 'BacSiDangKham',
  thieuThongTinKham: 'ThieuThongTinKham',
  trungDiUng: 'TrungDiUng',
  trungHoSo: 'TrungHoSo',
  khongMoLaiDuoc: 'KhongMoLaiDuoc',
  thuThieuTienThuoc: 'ThuThieuTienThuoc',
  tongTienDaDoi: 'TongTienDaDoi',
  guiNhacQuaSom: 'GuiNhacQuaSom',
  trangThaiKhongHopLe: 'TrangThaiKhongHopLe',
  daPhatSinh: 'DaPhatSinh',
  tamKhoaTraCuu: 'TamKhoaTraCuu',
  saiMaManHinh: 'SaiMaManHinh',
} as const

/** 400 vi phạm nghiệp vụ (DomainException) */
export const domainError = (code: string, detail: string, extra: Record<string, unknown> = {}) =>
  ApiError.fromStatus(400, detail, { code, ...extra })

/** 409 có `code`; `field` thì kèm errors để gắn vào ô nhập */
export const conflictError = (code: string | null, detail: string, field?: string, extra: Record<string, unknown> = {}) =>
  ApiError.fromStatus(409, detail, {
    ...(code ? { code } : {}),
    ...(field ? { errors: { [field]: [detail] } } : {}),
    ...extra,
  })

/** 400 lỗi theo trường; một lỗi thì detail là chính câu đó (giống BE) */
export function fieldErrors(errors: Record<string, string>): ApiError {
  const entries = Object.entries(errors)
  return ApiError.fromStatus(400, entries.length === 1 ? entries[0][1] : 'Dữ liệu chưa hợp lệ.', {
    errors: Object.fromEntries(entries.map(([k, v]) => [k, [v]])),
  })
}

export const fieldError = (field: string, message: string) => fieldErrors({ [field]: message })

export const invalidState = (detail: string) => conflictError(errorCodes.trangThaiKhongHopLe, detail)
export const inUse = (detail: string) => conflictError(errorCodes.daPhatSinh, detail)
export const invalidSlot = (detail: string) => domainError(errorCodes.khungKhongHopLe, detail)
export const slotFull = (detail: string) => conflictError(errorCodes.khungHetCho, detail)
export const notFoundError = (detail: string, code?: string) => ApiError.fromStatus(404, detail, code ? { code } : {})
export const forbiddenError = (detail: string) => ApiError.fromStatus(403, detail)

export const tooManyRequests = (detail: string, code: string, retryAfterSeconds: number) =>
  ApiError.fromStatus(429, detail, { code, retryAfterSeconds })
