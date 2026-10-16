'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CalendarOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { permissions } from '@/config/permissions'
import { usePermissions } from '@/hooks/use-permissions'
import { getErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import type { AppointmentCardDto, AppointmentStatus, BoardDoctorDto, BoardSlotDto } from '@/types/clinic'
import { useBoard, useRescheduleAppointment } from '@/features/clinic/hooks/use-clinic'
import { appointmentStatusLabels } from '@/features/clinic/lib/labels'
import { ddmmyyyy, vnHhmm, vnNow } from '@/features/clinic/lib/vn-time'
import { latestConfirmMessage, slotProblem } from '../lib/appointment-ui'
import { DayBoard } from './DayBoard'

type DayViewProps = {
  date: string
  today: string
  specialtyId?: string
  onCreate: (target: { date: string; doctorId: string; startAt: string }) => void
  onOpen: (id: string) => void
}

/** Mẫu nhỏ minh họa khung thẻ theo trạng thái, đi kèm chữ */
const SWATCH: Record<AppointmentStatus, string> = {
  ChoXacNhan: 'border-2 border-dashed border-warning bg-warning/10',
  DaXacNhan: 'border border-l-4 border-l-info bg-card',
  DaDen: 'border border-l-4 border-l-success bg-success/10',
  KhongDen: 'border border-destructive/30 bg-destructive/5',
  DaHuy: 'border border-dashed bg-muted',
}

const LEGEND: AppointmentStatus[] = ['ChoXacNhan', 'DaXacNhan', 'DaDen', 'KhongDen']

/** Dạng ngày của Lịch hẹn (UC-04 bước 1): lưới bác sĩ × khung giờ, tự làm mới mỗi 30 giây. */
export function DayView({ date, today, specialtyId, onCreate, onOpen }: DayViewProps) {
  const { can } = usePermissions()
  const board = useBoard(date, specialtyId)
  const reschedule = useRescheduleAppointment()
  const [showCancelled, setShowCancelled] = useState(false)
  const [now, setNow] = useState(() => vnNow())

  // Khung đã bắt đầu, vạch "đang diễn ra" chạy theo phút
  useEffect(() => {
    const timer = window.setInterval(() => setNow(vnNow()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const data = board.data
  const view = useMemo(() => {
    if (!data) return null
    const withCards = new Set(data.appointments.map((a) => a.doctorId))
    const doctors = data.doctors.filter((d) => d.slots.length > 0 || d.offReason || withCards.has(d.id))
    const idle = data.doctors.filter((d) => !doctors.includes(d))
    const active = data.appointments.filter((a) => a.status !== 'DaHuy')
    const counts = new Map<AppointmentStatus, number>()
    for (const a of data.appointments) counts.set(a.status, (counts.get(a.status) ?? 0) + 1)
    const freeSlots = doctors.reduce(
      (sum, d) => sum + d.slots.filter((s) => Date.parse(s.startAt) > now && s.taken < s.max).length,
      0
    )
    return {
      doctors,
      idle,
      counts,
      total: active.length,
      freeSlots,
      hasSlots: doctors.some((d) => d.slots.length > 0) || data.appointments.length > 0,
      cards: showCancelled ? data.appointments : active,
    }
  }, [data, showCancelled, now])

  const move = (card: AppointmentCardDto, doctor: BoardDoctorDto, slot: BoardSlotDto) => {
    reschedule.mutate(
      { id: card.id, input: { doctorId: doctor.id, startAt: slot.startAt } },
      {
        onSuccess: (next) => {
          const message = next.status === 'DaXacNhan' ? latestConfirmMessage(next) : null
          toast.success(`Đã đổi lịch ${next.code} sang ${vnHhmm(next.startAt)} · ${next.doctorName}`, {
            description: message ? `Tin xác nhận mới (giả lập): ${message.content}` : undefined,
            duration: 8000,
          })
        },
        onError: (err) => toast.error(slotProblem(err) ?? getErrorMessage(err), { description: `Lịch ${card.code} giữ nguyên giờ cũ.` }),
      }
    )
  }

  if (board.isLoading) return <BoardSkeleton />
  if (board.error && !data) return <ErrorState error={board.error} onRetry={() => board.refetch()} className="bg-card rounded-xl border" />
  if (!data || !view) return null

  const isToday = data.date === today
  const isPast = data.date < today

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="text-sm">
          <b className="tabular-nums">{view.total}</b> lịch hẹn
          {!isPast && (
            <>
              {' '}
              · còn <b className="tabular-nums">{view.freeSlots}</b> khung trống
            </>
          )}
        </span>
        <ul className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1" aria-label="Chú thích trạng thái">
          {LEGEND.map((s) => (
            <li key={s} className="flex items-center gap-1.5">
              <span className={cn('size-3 rounded-sm', SWATCH[s])} aria-hidden="true" />
              {appointmentStatusLabels[s]} <b className="text-foreground tabular-nums">{view.counts.get(s) ?? 0}</b>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-3">
          {(board.isFetching || reschedule.isPending) && (
            <span className="text-muted-foreground flex items-center gap-1" role="status">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Đang cập nhật…
            </span>
          )}
          <div className="flex items-center gap-2">
            <Switch id="show-cancelled" checked={showCancelled} onCheckedChange={setShowCancelled} />
            <Label htmlFor="show-cancelled" className="cursor-pointer text-xs font-normal">
              Hiện lịch đã hủy ({view.counts.get('DaHuy') ?? 0})
            </Label>
          </div>
        </div>
      </div>

      {view.idle.length > 0 && view.doctors.length > 0 && (
        <p className="text-muted-foreground text-xs">Không làm việc ngày này: {view.idle.map((d) => d.displayName).join(', ')}.</p>
      )}

      {data.doctors.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Không có bác sĩ phù hợp"
          description="Chưa có bác sĩ nào thuộc chuyên khoa đang lọc. Chọn chuyên khoa khác."
          className="bg-card rounded-xl border"
        />
      ) : !view.hasSlots ? (
        <EmptyState
          icon={CalendarOff}
          title={`Không có khung giờ nào ngày ${ddmmyyyy(data.date)}`}
          description={
            view.doctors.length > 0
              ? `Bác sĩ nghỉ: ${view.doctors.map((d) => `${d.displayName}${d.offReason ? ` (${d.offReason})` : ''}`).join(', ')}.`
              : 'Không bác sĩ nào làm việc ngày này. Chọn ngày khác.'
          }
          className="bg-card rounded-xl border"
        />
      ) : (
        <DayBoard
          date={data.date}
          doctors={view.doctors}
          cards={view.cards}
          now={now}
          isToday={isToday}
          isPast={isPast}
          canCreate={can(permissions.appointments.create)}
          canMove={can(permissions.appointments.update)}
          onCreate={(doctor, slot) => onCreate({ date: data.date, doctorId: doctor.id, startAt: slot.startAt })}
          onOpen={(card) => onOpen(card.id)}
          onMove={move}
        />
      )}
    </div>
  )
}

function BoardSkeleton() {
  return (
    <div className="bg-card space-y-3 rounded-xl border p-3" aria-busy="true" aria-label="Đang tải lịch hẹn">
      <div className="grid grid-cols-[4.5rem_repeat(4,1fr)] gap-2">
        <Skeleton className="h-12" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
      {Array.from({ length: 6 }, (_, r) => (
        <div key={r} className="grid grid-cols-[4.5rem_repeat(4,1fr)] gap-2">
          <Skeleton className="h-14" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ))}
    </div>
  )
}
