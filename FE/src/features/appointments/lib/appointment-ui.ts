import { getErrorMessage } from '@/lib/api-error'
import type { AppointmentDetailDto, AppointmentStatus, MessageChannel, MessageDto } from '@/types/clinic'
import { problemCode } from '@/features/clinic/lib/problem'
import { addDaysKey, isoWeekdayOf } from '@/features/clinic/lib/vn-time'

/** Tiện ích giao diện màn hình Lịch hẹn (SCR-04, UC-04). */

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const isDateKey = (value: string | null | undefined): value is string =>
  !!value && DATE_RE.test(value) && !Number.isNaN(Date.parse(value))

export const appointmentStatuses: AppointmentStatus[] = ['ChoXacNhan', 'DaXacNhan', 'DaDen', 'KhongDen', 'DaHuy']

export const isAppointmentStatus = (value: string | null | undefined): value is AppointmentStatus =>
  !!value && (appointmentStatuses as string[]).includes(value)

/** Lịch chưa tiếp đón, còn đổi giờ, hủy được (BR-06) */
export const isActiveStatus = (status: AppointmentStatus) => status === 'ChoXacNhan' || status === 'DaXacNhan'

/** Thứ Hai của tuần chứa ngày `dateKey` */
export const mondayOf = (dateKey: string) => addDaysKey(dateKey, 1 - isoWeekdayOf(dateKey))

const pad = (n: number) => String(n).padStart(2, '0')

/** Khóa ngày ↔ Date theo giờ máy, chỉ dùng cho bộ chọn ngày (react-day-picker làm việc theo giờ máy) */
export function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const dateToKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const channelLabels: Record<MessageChannel, string> = { Zalo: 'Zalo', Sms: 'SMS' }

/** Tin xác nhận lịch mới nhất (FR-12) để hiện ở góc màn hình sau khi tạo, xác nhận, đổi giờ */
export function latestConfirmMessage(a: AppointmentDetailDto): MessageDto | null {
  const list = a.messages.filter((m) => m.kind === 'XacNhanLich')
  if (list.length === 0) return null
  return list.reduce((last, m) => (m.sentAt > last.sentAt ? m : last))
}

/** Lỗi khung giờ (07 §2.2): KhungHetCho, KhungKhongHopLe → câu báo tại ô khung giờ */
export function slotProblem(error: unknown): string | null {
  const code = problemCode(error)
  if (code === 'KhungHetCho') return 'Khung đã đủ lịch hẹn'
  if (code === 'KhungKhongHopLe') return getErrorMessage(error, 'Khung giờ không hợp lệ')
  return null
}
