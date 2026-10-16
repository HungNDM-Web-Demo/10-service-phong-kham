import type { Gender, PublicSlotDto } from '@/types/clinic'
import { clinicRules, unaccent } from '@/features/clinic/lib/rules'
import { phoneError } from '@/features/clinic/lib/validation'
import { addDaysKey, ddmmyyyy, isoWeekdayOf, vnDateKey, vnHhmm, weekdayLabel, weekdayShort } from '@/features/clinic/lib/vn-time'

/** Hằng số, kiểm tra nhập liệu và nhãn hiển thị của trang đặt lịch online (SCR-05, UC-03, FR-11). */

/** Giá trị chọn "Bác sĩ bất kỳ" (BR-04): gửi `doctorId = null`, máy chủ tự xếp bác sĩ. */
export const ANY_DOCTOR = 'any'

export const NAME_MAX = 100
export const REASON_MAX = 300
export const BIRTH_YEAR_MIN = 1900

export type PatientInfo = {
  fullName: string
  phone: string
  birthYear: string
  gender: Gender | null
  reason: string
}

export type PatientField = keyof PatientInfo

export const emptyPatient: PatientInfo = { fullName: '', phone: '', birthYear: '', gender: null, reason: '' }

/** Kiểm tra thông tin người khám trước khi sang bước xác nhận; câu chữ khớp BE (BR-03, UC-03 E1). */
export function validatePatient(info: PatientInfo, currentYear: number): Partial<Record<PatientField, string>> {
  const errors: Partial<Record<PatientField, string>> = {}
  const name = info.fullName.trim()
  if (!name) errors.fullName = 'Nhập họ tên người khám'
  else if (name.length > NAME_MAX) errors.fullName = `Họ tên tối đa ${NAME_MAX} ký tự`

  const phone = phoneError(info.phone)
  if (phone) errors.phone = phone

  const year = info.birthYear.trim()
  if (!year) errors.birthYear = 'Nhập năm sinh'
  else if (!/^\d{4}$/.test(year)) errors.birthYear = 'Năm sinh gồm 4 chữ số, vd 1990'
  else if (Number(year) < BIRTH_YEAR_MIN || Number(year) > currentYear) errors.birthYear = `Năm sinh từ ${BIRTH_YEAR_MIN} đến ${currentYear}`

  if (!info.gender) errors.gender = 'Chọn giới tính'
  if (info.reason.trim().length > REASON_MAX) errors.reason = `Lý do khám tối đa ${REASON_MAX} ký tự`
  return errors
}

/** Các ngày nhận đặt online: hôm nay tới hôm nay + 30 (BR-02). */
export const bookingDays = (today: string): string[] =>
  Array.from({ length: clinicRules.onlineMaxDaysAhead + 1 }, (_, i) => addDaysKey(today, i))

/** Dòng trên của ô ngày: "Hôm nay", "Mai", "T2"… */
export function dayChipTop(day: string, today: string): string {
  if (day === today) return 'Hôm nay'
  if (day === addDaysKey(today, 1)) return 'Mai'
  return weekdayShort(isoWeekdayOf(day))
}

/** "Thứ Bảy, 18/10/2026" */
export const fullDayLabel = (day: string): string => `${weekdayLabel(isoWeekdayOf(day))}, ${ddmmyyyy(day)}`

/** "08:30, Thứ Bảy, 18/10/2026" */
export const slotLabel = (startAt: string): string => `${vnHhmm(startAt)}, ${fullDayLabel(vnDateKey(startAt))}`

/** "08:30 · T7 18/10" cho thanh dưới màn hình điện thoại */
export function slotShortLabel(startAt: string): string {
  const day = vnDateKey(startAt)
  return `${vnHhmm(startAt)} · ${weekdayShort(isoWeekdayOf(day))} ${ddmmyyyy(day).slice(0, 5)}`
}

export type SlotSession = { key: 'sang' | 'chieu' | 'toi'; label: string; slots: PublicSlotDto[] }

/** Chia khung giờ theo buổi để dễ tìm trên điện thoại: sáng trước 12:00, chiều tới 18:00, tối từ 18:00. */
export function groupSlots(slots: PublicSlotDto[]): SlotSession[] {
  const sessions: SlotSession[] = [
    { key: 'sang', label: 'Buổi sáng', slots: [] },
    { key: 'chieu', label: 'Buổi chiều', slots: [] },
    { key: 'toi', label: 'Buổi tối', slots: [] },
  ]
  for (const slot of slots) {
    const hour = Number(slot.time.slice(0, 2))
    sessions[hour < 12 ? 0 : hour < 18 ? 1 : 2].slots.push(slot)
  }
  return sessions.filter((s) => s.slots.length > 0)
}

export type SpecialtyKind = 'rang' | 'nhi' | 'noi' | 'khac'

/** Nhận dạng chuyên khoa theo tên để chọn biểu tượng. */
export function specialtyKind(name: string): SpecialtyKind {
  const n = unaccent(name)
  if (n.includes('rang')) return 'rang'
  if (n.includes('nhi')) return 'nhi'
  if (n.includes('noi')) return 'noi'
  return 'khac'
}

/** Câu lỗi của máy chủ, bỏ dấu chấm cuối để ghép thêm hướng dẫn. */
export const trimSentence = (text: string): string => text.trim().replace(/[.。]+$/, '')

/** Link chỉ đường Google Maps tới địa chỉ phòng khám */
export const mapsUrl = (address: string): string => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

/** Link gọi điện từ số hiển thị có khoảng trắng */
export const telHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, '')}`
