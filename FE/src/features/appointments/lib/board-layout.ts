import type { AppointmentCardDto, BoardDoctorDto, BoardSlotDto } from '@/types/clinic'
import { vnMinutesOfDay } from '@/features/clinic/lib/vn-time'

/**
 * Dựng lưới dạng ngày (SCR-04, UC-04 bước 1): mỗi cột một bác sĩ, mỗi hàng một mốc giờ bắt đầu khung.
 * Bác sĩ có độ dài khung khác nhau (15, 20, 30 phút; BR-01) nên hàng là hợp các mốc bắt đầu của mọi bác sĩ; một khung chiếm các hàng
 * nằm trong [bắt đầu, kết thúc). Lịch hẹn không rơi vào khung nào (bác sĩ nghỉ đột xuất, đổi lịch làm việc sau khi đặt) vẫn hiện ở ô
 * "Ngoài khung" để lễ tân xử lý (UC-02 1a). Khoảng không bác sĩ nào có khung (nghỉ trưa) là một dải ngăn cách.
 */

export type BoardRow = { kind: 'time'; minute: number; end: number } | { kind: 'gap'; from: number; to: number }

type CellBase = { key: string; col: number; doctor: BoardDoctorDto; rowStart: number; rowEnd: number }

export type SlotCell = CellBase & { kind: 'slot'; slot: BoardSlotDto; start: number; end: number; cards: AppointmentCardDto[] }
export type OrphanCell = CellBase & { kind: 'orphan'; start: number; cards: AppointmentCardDto[] }
export type EmptyCell = CellBase & { kind: 'empty' }
export type BoardCell = SlotCell | OrphanCell | EmptyCell

export type BoardLayout = { rows: BoardRow[]; cells: BoardCell[] }

export const rowKey = (r: BoardRow) => (r.kind === 'time' ? r.minute : r.from)

export function buildBoardLayout(doctors: BoardDoctorDto[], cards: AppointmentCardDto[]): BoardLayout {
  const perDoctor = doctors.map((doctor) => {
    const slots = doctor.slots.map((slot) => {
      const start = vnMinutesOfDay(slot.startAt)
      const end = vnMinutesOfDay(slot.endAt)
      return { slot, start, end: end <= start ? 1440 : end, cards: [] as AppointmentCardDto[] }
    })
    const orphans = new Map<number, AppointmentCardDto[]>()
    for (const c of cards) {
      if (c.doctorId !== doctor.id) continue
      const m = vnMinutesOfDay(c.startAt)
      const s = slots.find((x) => x.start <= m && m < x.end)
      if (s) s.cards.push(c)
      else orphans.set(m, [...(orphans.get(m) ?? []), c])
    }
    return { doctor, slots, orphans }
  })

  // Mốc giờ và thời điểm khung dài nhất bắt đầu ở mốc đó kết thúc
  const ends = new Map<number, number>()
  const bump = (m: number, e: number) => ends.set(m, Math.max(ends.get(m) ?? m, e))
  for (const d of perDoctor) {
    for (const s of d.slots) bump(s.start, s.end)
    for (const m of d.orphans.keys()) bump(m, m + d.doctor.slotMinutes)
  }

  const rows: BoardRow[] = []
  let covered = -1
  for (const m of [...ends.keys()].sort((a, b) => a - b)) {
    if (covered >= 0 && m > covered) rows.push({ kind: 'gap', from: covered, to: m })
    rows.push({ kind: 'time', minute: m, end: ends.get(m)! })
    covered = Math.max(covered, ends.get(m)!)
  }

  const indexOf = new Map<number, number>()
  rows.forEach((r, i) => r.kind === 'time' && indexOf.set(r.minute, i))
  const endIndex = (from: number, end: number) => {
    for (let i = from + 1; i < rows.length; i++) if (rowKey(rows[i]) >= end) return i
    return rows.length
  }

  const cells: BoardCell[] = []
  perDoctor.forEach((d, col) => {
    const used = new Array<boolean>(rows.length).fill(false)
    for (const s of d.slots) {
      const rowStart = indexOf.get(s.start)!
      const rowEnd = endIndex(rowStart, s.end)
      for (let i = rowStart; i < rowEnd; i++) used[i] = true
      cells.push({ kind: 'slot', key: `${d.doctor.id}-${s.start}`, col, doctor: d.doctor, rowStart, rowEnd, ...s })
    }
    for (const [m, list] of d.orphans) {
      const rowStart = indexOf.get(m)!
      used[rowStart] = true
      cells.push({ kind: 'orphan', key: `${d.doctor.id}-o${m}`, col, doctor: d.doctor, rowStart, rowEnd: rowStart + 1, start: m, cards: list })
    }
    // Gộp các hàng trống liền nhau của bác sĩ thành một ô, dừng ở dải ngăn cách
    let runStart = -1
    for (let i = 0; i <= rows.length; i++) {
      const free = i < rows.length && !used[i] && rows[i].kind === 'time'
      if (free && runStart < 0) runStart = i
      if (!free && runStart >= 0) {
        cells.push({ kind: 'empty', key: `${d.doctor.id}-e${runStart}`, col, doctor: d.doctor, rowStart: runStart, rowEnd: i })
        runStart = -1
      }
    }
  })

  return { rows, cells }
}
