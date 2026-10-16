import { normalizeFieldKey } from '@/lib/api-error'
import type { SaveScheduleInput, WorkingHourDto } from '@/types/clinic'
import { slotsOf } from '@/features/clinic/lib/rules'
import { parseHhmm } from '@/features/clinic/lib/vn-time'

/** Phép tính cho bộ sửa lịch làm việc theo tuần (UC-02 bước 3–5, E1, E2; BR-01; 07 §3.1). */

export const WEEK = [1, 2, 3, 4, 5, 6, 7] as const

/** Một khoảng làm việc đang sửa; `key` giữ ổn định khi thêm, xóa dòng */
export type RangeRow = WorkingHourDto & { key: string }

export type RowErrors = { startTime?: string; endTime?: string }

const hhmmRe = /^([01]\d|2[0-3]):[0-5]\d$/

export const isTime = (value: string) => hhmmRe.test(value)

const pad = (n: number) => String(n).padStart(2, '0')

/** Chuẩn hóa giờ gõ tay khi rời ô: "8" → "08:00", "800" → "08:00", "13h30" → "13:30". Không đọc được thì giữ nguyên. */
export function normalizeTime(text: string): string {
  const value = text.trim()
  const m = /^(\d{1,2})(?:[:hH.]?(\d{2}))?[hH]?$/.exec(value)
  if (!m) return value
  const h = Number(m[1])
  const min = Number(m[2] ?? 0)
  if (h > 23 || min > 59) return value
  return `${pad(h)}:${pad(min)}`
}

/** Khoảng phút [bắt đầu, kết thúc) khi hai giờ hợp lệ và kết thúc sau bắt đầu */
export function rangeOf(row: WorkingHourDto): [number, number] | null {
  if (!isTime(row.startTime) || !isTime(row.endTime)) return null
  const start = parseHhmm(row.startTime)
  const end = parseHhmm(row.endTime)
  return end > start ? [start, end] : null
}

/** Số khung của một khoảng: floor((kết thúc − bắt đầu) / độ dài khung) */
export const slotCountOf = (range: [number, number], slotMinutes: number) => Math.floor((range[1] - range[0]) / slotMinutes)

/** Phút lẻ cuối khoảng không đủ một khung (UC-02 E2) */
export const remainderOf = (range: [number, number], slotMinutes: number) => (range[1] - range[0]) % slotMinutes

/** Khung trong ngày, bỏ trùng khi hai khoảng chồng nhau (BR-01, `slotsOf`) */
export function daySlots(rows: WorkingHourDto[], slotMinutes: number): number[] {
  const ranges = rows.map(rangeOf).filter((r): r is [number, number] => r !== null)
  return slotsOf(ranges, slotMinutes, null)
}

export function dayMinutes(rows: WorkingHourDto[]): number {
  return rows.reduce((sum, row) => {
    const r = rangeOf(row)
    return r ? sum + r[1] - r[0] : sum
  }, 0)
}

/** Khoảng mới gợi ý: sáng 08:00–12:00, chiều 13:30–17:30, sau đó nối tiếp 2 giờ */
export function nextRange(existing: WorkingHourDto[]): { startTime: string; endTime: string } {
  const ends = existing.map(rangeOf).filter((r): r is [number, number] => r !== null).map((r) => r[1])
  if (ends.length === 0) return { startTime: '08:00', endTime: '12:00' }
  const last = Math.max(...ends)
  if (last <= 12 * 60) return { startTime: '13:30', endTime: '17:30' }
  const start = Math.min(last, 22 * 60)
  const end = Math.min(start + 120, 23 * 60 + 59)
  return { startTime: `${pad(Math.floor(start / 60))}:${pad(start % 60)}`, endTime: `${pad(Math.floor(end / 60))}:${pad(end % 60)}` }
}

/** Dòng theo thứ tự gửi lên máy chủ (Thứ Hai → Chủ nhật, giữ thứ tự trong ngày) để đọc lỗi `hours[i]` */
export const orderedRows = (rows: RangeRow[]) => WEEK.flatMap((day) => rows.filter((r) => r.dayOfWeek === day))

export const toInput = (slotMinutes: number, maxPerSlot: number, ordered: RangeRow[]): SaveScheduleInput => ({
  slotMinutes,
  maxPerSlot,
  hours: ordered.map((r) => ({ dayOfWeek: r.dayOfWeek, startTime: r.startTime, endTime: r.endTime })),
})

/**
 * Tách lỗi validate (của `validateSchedule` hoặc máy chủ) thành lỗi chung và lỗi từng dòng theo `key`.
 * Khóa lỗi dạng `hours[3].startTime` hoặc `hours.3.startTime` (đã chuẩn hóa) đều đọc được.
 */
export function splitErrors(errors: Record<string, string>, ordered: RangeRow[]) {
  const general: Record<string, string> = {}
  const rows: Record<string, RowErrors> = {}
  for (const [rawKey, message] of Object.entries(errors)) {
    const key = normalizeFieldKey(rawKey)
    const m = /^hours\.(\d+)\.(startTime|endTime)$/.exec(key)
    const row = m ? ordered[Number(m[1])] : undefined
    if (m && row) {
      const field = m[2] as keyof RowErrors
      rows[row.key] = { ...rows[row.key], [field]: rows[row.key]?.[field] ?? message }
    } else {
      general[key] = message
    }
  }
  return { general, rows }
}

/** So sánh bản đang sửa với lịch đã lưu (không phụ thuộc thứ tự dòng) */
export function scheduleSignature(slotMinutes: number, maxPerSlot: number | string, hours: WorkingHourDto[]): string {
  const list = hours.map((h) => `${h.dayOfWeek}|${h.startTime}|${h.endTime}`).sort()
  return `${slotMinutes}/${maxPerSlot}/${list.join(',')}`
}
