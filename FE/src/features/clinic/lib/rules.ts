import type { AppointmentCancelReason, DayOffPart, DiscountType, Gender, ServiceUnit, VisitStatus } from '@/types/clinic'
import { ddmmyyyy, hhmm } from './vn-time'

/**
 * Hằng số và phép tính nghiệp vụ Phòng khám, cùng giá trị với BE `Domain/Entities/Clinic/ClinicRules.cs` (06 §3).
 */
export const clinicRules = {
  slotLengths: [15, 20, 30],
  onlineMinLeadMinutes: 120,
  onlineMaxDaysAhead: 30,
  onlineMaxActivePerPhone: 2,
  selfCancelMinLeadMinutes: 120,
  lateToleranceMinutes: 15,
  priorityChildAge: 6,
  priorityElderAge: 75,
  waitWarnMinutes: 30,
  waitAlertMinutes: 60,
  maxSkips: 3,
  maxSecondaryDiagnoses: 3,
  maxImages: 5,
  maxMedicineQuantity: 999,
  maxMedicineDays: 90,
  maxOrderQuantity: 99,
  maxItemDiscountPercent: 50,
  selfApproveDiscountPercent: 10,
  followUpWindowBefore: 3,
  followUpWindowAfter: 7,
  defaultRemindDays: 1,
  maxReminderSends: 3,
  reminderGapHours: 24,
  reminderHour: 18,
  maxReportDays: 366,
  maxFollowUpDays: 365,
  noonMinute: 720,
  appointmentPrefix: 'LH',
  visitPrefix: 'LK',
  invoicePrefix: 'TT',
  receiptPrefix: 'PT',
  planPrefix: 'KH',
  patientPrefix: 'BN',
  systemActorName: 'Hệ thống',
  onlineCreatorName: 'Bệnh nhân đặt online',
  followUpFreeNote: 'Tái khám theo hẹn',
  childPriority: 'Trẻ dưới 6 tuổi',
  elderPriority: 'Người từ 75 tuổi',
  endOfDayCancel: 'Hết ngày',
  skipCancel: 'Bỏ qua 3 lần',
} as const

export const docStem = (prefix: string, dateKey: string) => prefix + dateKey.slice(2).replace(/-/g, '')

export const docDigits = (prefix: string) => (prefix === clinicRules.planPrefix ? 3 : 4)

export const docCode = (prefix: string, dateKey: string, seq: number) =>
  docStem(prefix, dateKey) + String(seq).padStart(docDigits(prefix), '0')

export const patientCode = (n: number) => clinicRules.patientPrefix + String(n).padStart(6, '0')

/** Khung giờ (phút bắt đầu) của các khoảng làm việc trong ngày, bỏ phần nghỉ (BR-01). */
export function slotsOf(ranges: [number, number][], slotMinutes: number, off: DayOffPart | null | undefined): number[] {
  if (off === 'CaNgay' || slotMinutes <= 0) return []
  const list: number[] = []
  for (const [start, end] of ranges) {
    for (let t = start; t + slotMinutes <= end; t += slotMinutes) {
      if (off === 'Sang' && t < clinicRules.noonMinute) continue
      if (off === 'Chieu' && t >= clinicRules.noonMinute) continue
      list.push(t)
    }
  }
  return [...new Set(list)].sort((a, b) => a - b)
}

/** Tuổi tròn năm tính tới ngày `on` (yyyy-MM-dd). */
export function ageOn(birth: string, on: string): number {
  const [by, bm, bd] = birth.split('-').map(Number)
  const [y, m, d] = on.split('-').map(Number)
  let age = y - by
  if (m < bm || (m === bm && d < bd)) age--
  return Math.max(0, age)
}

/** Ưu tiên tự động theo tuổi (BR-10). */
export function autoPriorityReason(birth: string, on: string): string | null {
  const age = ageOn(birth, on)
  return age < clinicRules.priorityChildAge ? clinicRules.childPriority : age >= clinicRules.priorityElderAge ? clinicRules.elderPriority : null
}

/** Nhóm trong thứ tự gọi (BR-09): quay lại từ chờ kết quả, ưu tiên, còn lại. */
export const queueGroup = (isReturned: boolean, isPriority: boolean) => (isReturned ? 0 : isPriority ? 1 : 2)

export function isValidTooth(n: number): boolean {
  const quadrant = Math.floor(n / 10)
  const tooth = n % 10
  if (quadrant >= 1 && quadrant <= 4) return tooth >= 1 && tooth <= 8
  if (quadrant >= 5 && quadrant <= 8) return tooth >= 1 && tooth <= 5
  return false
}

/** Đọc danh sách số răng FDI "16, 26"; trả lỗi tiếng Việt khi sai (07 §3.6). */
export function parseTeeth(text: string): { teeth: number[]; error: string | null } {
  if (!text.trim()) return { teeth: [], error: 'Chọn vị trí răng' }
  const teeth: number[] = []
  for (const part of text.split(/[,; ]+/).filter(Boolean)) {
    const n = Number(part)
    if (!Number.isInteger(n) || !isValidTooth(n)) return { teeth: [], error: `Số răng ${part} không hợp lệ (11–48, răng sữa 51–85)` }
    if (teeth.includes(n)) return { teeth: [], error: `Răng ${n} bị lặp` }
    teeth.push(n)
  }
  return { teeth: teeth.sort((a, b) => a - b), error: null }
}

export const formatTeeth = (teeth: number[]) => [...teeth].sort((a, b) => a - b).join(',')

/** "R16, R26" để ghi vào dòng phiếu thanh toán, bản in. */
export const teethLabel = (teeth: string | number[] | null | undefined): string => {
  const list = Array.isArray(teeth) ? teeth.map(String) : (teeth ?? '').split(',').filter(Boolean)
  return list.map((t) => 'R' + t.trim()).join(', ')
}

/** Bỏ dấu tiếng Việt, chữ thường (so khớp dị ứng, tìm kiếm). */
export const unaccent = (value: string): string =>
  value.replace(/đ/g, 'd').replace(/Đ/g, 'D').normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC').toLowerCase()

/**
 * Từ khóa dị ứng trùng hoạt chất (BR-19): tách theo dấu phẩy, so khớp không dấu, không phân biệt hoa thường; từ khóa nằm
 * trong hoạt chất hoặc hoạt chất nằm trong từ khóa. Trả từ khóa gốc.
 */
export function allergyMatches(allergies: string | null | undefined, ingredient: string): string[] {
  if (!allergies?.trim() || !ingredient.trim()) return []
  const ing = unaccent(ingredient)
  const parts = ing.split(',').map((p) => p.trim()).filter(Boolean)
  return allergies
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
    .filter((k) => {
      const key = unaccent(k)
      return key.length > 0 && (ing.includes(key) || parts.some((p) => key.includes(p)))
    })
}

export const floor1000 = (value: number) => Math.floor(value / 1000) * 1000

/** Giảm giá hạng mục (BR-22): phần trăm làm tròn xuống tới 1.000 ₫. */
export function itemDiscount(unitPrice: number, quantity: number, type: DiscountType | null | undefined, value: number): number {
  if (type === 'PhanTram') return floor1000((unitPrice * quantity * value) / 100)
  if (type === 'SoTien') return value
  return 0
}

/** Tỉ lệ giảm hiển thị, 1 chữ số thập phân (07 §3.11). */
export const discountRate = (subTotal: number, discountTotal: number) =>
  subTotal <= 0 ? 0 : Math.round(((discountTotal * 100) / subTotal) * 10) / 10

/** Vượt 10% tổng tiền trước giảm thì cần quản lý duyệt (BR-22). */
export const needsApproval = (subTotal: number, discountTotal: number) =>
  discountTotal * 100 > subTotal * clinicRules.selfApproveDiscountPercent

export const doctorShort = (fullName: string) => `BS. ${fullName}`

export const doctorTitled = (title: string | null | undefined, fullName: string) => (title?.trim() ? `${title.trim()} ${fullName}` : `BS. ${fullName}`)

export function roomShort(room: string): string {
  const digits = room.replace(/\D/g, '')
  return digits ? 'P' + digits : room
}

/** Số thứ tự hiển thị kèm phòng: "P1 - 005" (SRS §5.3). */
export const ticketOf = (room: string, n: number) => `${roomShort(room)} - ${String(n).padStart(3, '0')}`

/** Tên viết tắt cho màn hình sảnh: "Nguyễn V. A". */
export function shortName(fullName: string): string {
  const parts = fullName.split(' ').filter(Boolean)
  if (parts.length <= 1) return fullName
  const middle = parts.slice(1, -1).map((p) => p[0].toUpperCase() + '.')
  return [parts[0], ...middle, parts[parts.length - 1][0].toUpperCase()].join(' ')
}

/** Che giữa số điện thoại: "0912***678". */
export const maskPhone = (phone: string) => (phone.length < 7 ? phone : `${phone.slice(0, 4)}***${phone.slice(-3)}`)

export const genderLabel = (g: Gender) => (g === 'Nu' ? 'Nữ' : 'Nam')

export const confirmMessage = (clinic: string, code: string, date: string, minute: number, doctorName: string, room: string) =>
  `${clinic}: Xác nhận lịch khám ${code} lúc ${hhmm(minute)} ngày ${ddmmyyyy(date)} với ${doctorShort(doctorName)}, ${room}. Vui lòng đến trước 10 phút.`

export const reminderMessage = (clinic: string, code: string, date: string, minute: number, doctorName: string, hotline: string) =>
  `${clinic}: Nhắc lịch khám ${code} lúc ${hhmm(minute)} ngày mai ${ddmmyyyy(date)} với ${doctorShort(doctorName)}. Gọi ${hotline} nếu cần đổi lịch.`

export const followUpMessage = (clinic: string, patientName: string, dueDate: string, doctorName: string, hotline: string) =>
  `${clinic}: ${patientName} có lịch tái khám ngày ${ddmmyyyy(dueDate)} với ${doctorShort(doctorName)}. Gọi ${hotline} nếu cần đổi lịch.`

export const cancelReasonLabel = (reason: AppointmentCancelReason) =>
  ({ BenhNhanBan: 'Bệnh nhân bận', BacSiNghi: 'Bác sĩ nghỉ', DatTrung: 'Đặt trùng', Khac: 'Khác' })[reason]

export const visitStatusPhrase = (status: VisitStatus) =>
  ({
    ChoKham: 'đang chờ khám',
    DangKham: 'đang khám',
    ChoKetQua: 'đang chờ kết quả',
    ChoThanhToan: 'chờ thanh toán',
    HoanTat: 'đã hoàn tất',
    BoVe: 'đã bỏ về',
  })[status]

export const unitLabel = (unit: ServiceUnit) => ({ Lan: 'lần', Rang: 'răng', Phim: 'phim', Ca: 'ca' })[unit]

/** Số điện thoại di động Việt Nam (BR-03). */
export const phonePattern = /^0(3|5|7|8|9)[0-9]{8}$/

export const digitsOnly = (value: string) => value.replace(/[\s.-]/g, '')

export const isPhone = (value: string) => phonePattern.test(digitsOnly(value))
