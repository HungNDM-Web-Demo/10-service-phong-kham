'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CalendarOff, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { AppointmentCardDto, BoardDoctorDto, BoardSlotDto } from '@/types/clinic'
import { hhmm, vnMinutesOfDay } from '@/features/clinic/lib/vn-time'
import { isActiveStatus } from '../lib/appointment-ui'
import { buildBoardLayout, rowKey, type BoardCell, type OrphanCell, type SlotCell } from '../lib/board-layout'
import { AppointmentCard } from './AppointmentCard'

type DayBoardProps = {
  date: string
  doctors: BoardDoctorDto[]
  /** Thẻ hiển thị (đã lọc lịch hủy nếu đang ẩn) */
  cards: AppointmentCardDto[]
  now: number
  isToday: boolean
  isPast: boolean
  canCreate: boolean
  canMove: boolean
  onCreate: (doctor: BoardDoctorDto, slot: BoardSlotDto) => void
  onOpen: (card: AppointmentCardDto) => void
  onMove: (card: AppointmentCardDto, doctor: BoardDoctorDto, slot: BoardSlotDto) => void
}

type DropState = { key: string; ok: boolean } | null

const TIME_COL = '4.5rem'
const DOCTOR_COL = 'minmax(13.5rem, 1fr)'
const stripes = 'bg-[repeating-linear-gradient(135deg,transparent_0_7px,var(--border)_7px_8px)]'

/**
 * Lưới lịch hẹn dạng ngày (SCR-04, UC-04 bước 1–2): cột bác sĩ × hàng khung giờ, mỗi ô hiện đã đặt / tối đa và các thẻ lịch hẹn.
 * Bấm ô còn trống, chưa bắt đầu để tạo lịch; kéo thẻ sang khung khác để đổi giờ (UC-04 1b), khung đủ thì báo "Khung đã đủ lịch hẹn" (E1, TC-15).
 */
export function DayBoard({ date, doctors, cards, now, isToday, isPast, canCreate, canMove, onCreate, onOpen, onMove }: DayBoardProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  // Thẻ đang kéo: ref để sự kiện kéo thả đọc ngay, state chỉ để vẽ (làm mờ thẻ gốc)
  const dragRef = useRef<AppointmentCardDto | null>(null)
  const [dragging, setDragging] = useState<AppointmentCardDto | null>(null)
  const [drop, setDrop] = useState<DropState>(null)
  const layout = useMemo(() => buildBoardLayout(doctors, cards), [doctors, cards])
  const nowMinute = vnMinutesOfDay(now)

  // Hàng đang diễn ra (hôm nay): mốc đã tới và chưa sang mốc kế tiếp
  const nowRow = useMemo(() => {
    if (!isToday) return -1
    return layout.rows.findIndex((r, i) => {
      if (r.kind !== 'time' || r.minute > nowMinute) return false
      const next = layout.rows[i + 1]
      return nowMinute < (next ? rowKey(next) : r.end)
    })
  }, [isToday, layout.rows, nowMinute])

  // Mở lưới hôm nay thì cuộn tới khung đang diễn ra
  const scrolledFor = useRef<string | null>(null)
  useEffect(() => {
    const el = scrollRef.current
    if (!el || scrolledFor.current === date) return
    scrolledFor.current = date
    const target = el.querySelector<HTMLElement>('[data-now-row="true"]')
    el.scrollTop = target ? Math.max(0, target.offsetTop - 96) : 0
  }, [date, layout.rows.length])

  const stats = useMemo(() => {
    const map = new Map<string, { booked: number; capacity: number }>()
    for (const d of doctors) map.set(d.id, { booked: 0, capacity: d.slots.length * d.maxPerSlot })
    for (const c of cards) {
      const s = map.get(c.doctorId)
      if (s && c.status !== 'DaHuy') s.booked++
    }
    return map
  }, [doctors, cards])

  const movable = (c: AppointmentCardDto) => canMove && !isPast && isActiveStatus(c.status)

  const evaluate = (cell: SlotCell): 'ok' | 'full' | 'none' => {
    const card = dragRef.current
    if (!card || isPast) return 'none'
    if (Date.parse(cell.slot.startAt) <= now) return 'none'
    if (card.doctorId === cell.doctor.id && Date.parse(card.startAt) === Date.parse(cell.slot.startAt)) return 'none'
    return cell.slot.taken >= cell.slot.max ? 'full' : 'ok'
  }

  const endDrag = () => {
    dragRef.current = null
    setDragging(null)
    setDrop(null)
  }

  const dropHandlers = (cell: SlotCell) => ({
    onDragOver: (e: React.DragEvent) => {
      const result = evaluate(cell)
      if (result === 'none') return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (drop?.key !== cell.key || drop.ok !== (result === 'ok')) setDrop({ key: cell.key, ok: result === 'ok' })
    },
    onDragLeave: (e: React.DragEvent) => {
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
      if (drop?.key === cell.key) setDrop(null)
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      const result = evaluate(cell)
      const card = dragRef.current
      endDrag()
      if (!card || result === 'none') return
      if (result === 'full') {
        toast.error('Khung đã đủ lịch hẹn', { description: `Lịch ${card.code} giữ nguyên giờ cũ.` })
        return
      }
      onMove(card, cell.doctor, cell.slot)
    },
  })

  const renderCards = (list: AppointmentCardDto[]) =>
    list.map((c) => (
      <AppointmentCard
        key={c.id}
        card={c}
        draggable={movable(c)}
        dragging={dragging?.id === c.id}
        onOpen={() => onOpen(c)}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', c.id)
          e.dataTransfer.effectAllowed = 'move'
          dragRef.current = c
          // Đổi trạng thái sau khi trình duyệt chụp ảnh kéo, để ảnh kéo không bị làm mờ
          window.setTimeout(() => dragRef.current === c && setDragging(c), 0)
        }}
        onDragEnd={endDrag}
      />
    ))

  const renderCell = (cell: BoardCell) => {
    const style = { gridColumn: cell.col + 2, gridRow: `${cell.rowStart + 2} / ${cell.rowEnd + 2}` }
    const off = cell.doctor.slots.length === 0

    if (cell.kind === 'empty')
      return <div key={cell.key} style={style} className={cn('border-r border-b', stripes, off && 'bg-muted/40')} aria-hidden="true" />

    if (cell.kind === 'orphan') return <OrphanSlot key={cell.key} cell={cell} style={style} renderCards={renderCards} />

    const started = Date.parse(cell.slot.startAt) <= now
    const full = cell.slot.taken >= cell.slot.max
    const creatable = canCreate && !isPast && !started && !full
    const dropping = drop?.key === cell.key ? drop : null
    const range = `${hhmm(cell.start)}–${hhmm(cell.end)}`

    return (
      <div
        key={cell.key}
        style={style}
        {...dropHandlers(cell)}
        className={cn(
          'relative flex min-w-0 flex-col gap-1 border-r border-b p-1.5 transition-colors',
          (started || isPast) && 'bg-muted/40',
          dropping && (dropping.ok ? 'bg-primary/8 ring-primary ring-2 ring-inset' : 'bg-destructive/8 ring-destructive ring-2 ring-inset')
        )}
      >
        <div className="text-muted-foreground flex items-center justify-between gap-2 text-[0.6875rem] tabular-nums">
          <span>{range}</span>
          <span
            className={cn('rounded px-1.5 py-px font-medium', full ? 'bg-muted text-muted-foreground' : 'bg-success/12 text-success')}
            title={`Đã đặt ${cell.slot.taken}/${cell.slot.max}`}
          >
            <span className="sr-only">Đã đặt </span>
            {cell.slot.taken}/{cell.slot.max}
            {full && ' · Đủ'}
          </span>
        </div>
        {renderCards(cell.cards)}
        {creatable && (
          <button
            type="button"
            onClick={() => onCreate(cell.doctor, cell.slot)}
            aria-label={`Tạo lịch ${range} với ${cell.doctor.displayName}, còn ${cell.slot.max - cell.slot.taken} chỗ`}
            className={cn(
              'text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary focus-visible:ring-ring/50 flex min-h-7 flex-1 cursor-pointer items-center justify-center gap-1 rounded-md border border-dashed border-transparent text-xs transition-colors outline-none focus-visible:ring-3',
              cell.cards.length === 0 && 'border-border'
            )}
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Đặt lịch
          </button>
        )}
        {dropping && (
          <span
            className={cn(
              'pointer-events-none absolute inset-x-1.5 bottom-1.5 rounded px-1.5 py-0.5 text-center text-[0.6875rem] font-medium',
              dropping.ok ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground'
            )}
          >
            {dropping.ok ? `Thả để đổi sang ${hhmm(cell.start)}` : 'Khung đã đủ lịch hẹn'}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      role="region"
      aria-label={`Lịch hẹn theo bác sĩ ngày ${date.split('-').reverse().join('/')}`}
      tabIndex={0}
      className="bg-card focus-visible:ring-ring/50 relative max-h-[calc(100svh-17rem)] min-h-96 overflow-auto rounded-xl border shadow-xs outline-none focus-visible:ring-3"
    >
      <div
        className="relative grid"
        style={{
          gridTemplateColumns: `${TIME_COL} repeat(${doctors.length}, ${DOCTOR_COL})`,
          gridTemplateRows: `auto ${layout.rows.map((r) => (r.kind === 'gap' ? 'auto' : 'minmax(3.5rem, auto)')).join(' ')}`,
        }}
      >
        {/* Góc trái trên */}
        <div className="bg-card text-muted-foreground sticky top-0 left-0 z-30 flex items-end border-r border-b px-2 py-2 text-xs font-medium" style={{ gridColumn: 1, gridRow: 1 }}>
          Giờ
        </div>

        {/* Đầu cột bác sĩ */}
        {doctors.map((d, i) => {
          const s = stats.get(d.id)
          const fullOff = d.slots.length === 0
          return (
            <div key={d.id} className="bg-card sticky top-0 z-20 min-w-0 space-y-0.5 border-r border-b px-3 py-2" style={{ gridColumn: i + 2, gridRow: 1 }}>
              <p className="truncate text-sm font-semibold">{d.displayName}</p>
              <p className="text-muted-foreground truncate text-xs">
                {d.room} · {d.specialtyName}
              </p>
              {!fullOff && (
                <p className="text-muted-foreground text-xs tabular-nums">
                  {s?.booked ?? 0}/{s?.capacity ?? 0} lịch · khung {d.slotMinutes} phút
                </p>
              )}
              {d.offReason ? (
                <p className="bg-warning/12 text-warning mt-1 flex items-start gap-1 rounded px-1.5 py-1 text-xs font-medium">
                  <CalendarOff className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">{fullOff ? `Nghỉ cả ngày: ${d.offReason}` : `Nghỉ: ${d.offReason}`}</span>
                </p>
              ) : (
                fullOff && <p className="text-muted-foreground mt-1 text-xs">Không làm việc ngày này</p>
              )}
            </div>
          )
        })}

        {/* Cột giờ và dải ngăn cách */}
        {layout.rows.map((r, i) =>
          r.kind === 'time' ? (
            <div
              key={`t${r.minute}`}
              data-now-row={i === nowRow ? 'true' : undefined}
              className={cn(
                'bg-card sticky left-0 z-10 border-r border-b px-2 py-1.5 text-xs tabular-nums',
                i === nowRow ? 'text-primary font-semibold' : 'text-muted-foreground'
              )}
              style={{ gridColumn: 1, gridRow: i + 2 }}
            >
              {hhmm(r.minute)}
              {i === nowRow && <span className="block text-[0.625rem] font-medium">Đang diễn ra</span>}
            </div>
          ) : (
            <div key={`g${r.from}`} className="bg-muted/60 border-b" style={{ gridColumn: '1 / -1', gridRow: i + 2 }}>
              <span className="text-muted-foreground sticky left-0 inline-block px-2 py-1 text-[0.6875rem] tabular-nums">
                Không có khung giờ {hhmm(r.from)}–{hhmm(r.to)}
              </span>
            </div>
          )
        )}

        {layout.cells.map(renderCell)}
      </div>
    </div>
  )
}

function OrphanSlot({
  cell,
  style,
  renderCards,
}: {
  cell: OrphanCell
  style: React.CSSProperties
  renderCards: (list: AppointmentCardDto[]) => React.ReactNode
}) {
  return (
    <div style={style} className="border-warning/50 bg-warning/5 flex min-w-0 flex-col gap-1 border-r border-b border-dashed p-1.5">
      <p className="text-warning flex items-center gap-1 text-[0.6875rem] font-medium">
        <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
        {hhmm(cell.start)} · Ngoài khung làm việc
      </p>
      {renderCards(cell.cards)}
    </div>
  )
}
