import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api-error'
import { problemCode } from '@/features/clinic/lib/problem'

/** Hằng số, kiểu và hàm dùng chung của màn Danh mục (SCR-02; UC-01, FR-03, FR-04, FR-05, BR-33). */

export const ALL = 'all'

/** Giá trị Select cho "không chọn chuyên khoa" (Radix Select không nhận chuỗi rỗng) */
export const NO_SPECIALTY = 'none'

export type ActiveFilter = 'all' | 'active' | 'inactive'

export const activeValue = (filter: ActiveFilter): boolean | undefined => (filter === ALL ? undefined : filter === 'active')

export const activeFilterOf = (value: boolean | undefined): ActiveFilter =>
  value === undefined ? ALL : value ? 'active' : 'inactive'

export type FormErrors = Record<string, string>

/** Bỏ lỗi của một ô khi người dùng sửa ô đó */
export function withoutError(errors: FormErrors, key: string): FormErrors {
  if (!(key in errors)) return errors
  const next = { ...errors }
  delete next[key]
  return next
}

/**
 * Xóa mục đã dùng trong lượt khám (409 `DaPhatSinh`, BR-33, UC-01 E3): hiện đúng câu của máy chủ, kèm nút "Ngừng" nếu
 * mục còn đang dùng. Trả về true khi đã xử lý (hộp xác nhận được đóng), false với lỗi khác (giữ hộp để thử lại).
 */
export function handleDeleteError(error: unknown, deactivate?: () => void): boolean {
  if (problemCode(error) === 'DaPhatSinh') {
    toast.error(getErrorMessage(error), deactivate ? { action: { label: 'Ngừng', onClick: deactivate }, duration: 8000 } : undefined)
    return true
  }
  toast.error(getErrorMessage(error))
  return false
}

/** Chữ hoa, bỏ khoảng trắng cho ô mã (mã danh mục gồm chữ in hoa không dấu hoặc số) */
export const codeInput = (value: string) => value.toUpperCase().replace(/\s+/g, '')
