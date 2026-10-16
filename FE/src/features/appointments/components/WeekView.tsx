'use client'

import { useMemo } from 'react'
import { CalendarRange, Clock } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { WeekCellDto } from '@/types/clinic'
import { useSpecialties, useWeek } from '@/features/clinic/hooks/use-clinic'
import { addDaysKey, ddmmyyyy, isoWeekdayOf, weekdayLabel, weekdayShort } from '@/features/clinic/lib/vn-time'
import { mondayOf } from '../lib/appointment-ui'

type WeekViewProps = {
  date: string
  today: string
  specialtyId?: string
  onPickDay: (date: string) => void
}

/** Dạng tuần (UC-04 1d): bác sĩ × 7 ngày, số lịch / sức chứa và số lịch chờ xác nhận; bấm ô để xem dạng ngày. */
export function WeekView({ date, today, specialtyId, onPickDay }: WeekViewProps) {
  const start = mondayOf(date)
  const week = useWeek(start)
  const specialties = useSpecialties()
  const specialtyName = specialties.data?.find((s) => s.id === specialtyId)?.name

  const data = week.data
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysKey(data?.start ?? start, i)), [data?.start, start])
  const doctors = useMemo(
    () => (data?.doctors ?? []).filter((d) => !specialtyId || !specialtyName || d.specialtyName === specialtyName),
    [data, specialtyId, specialtyName]
  )
  const totals = useMemo(
    () =>
      days.map((_, i) =>
        doctors.reduce(
          (acc, d) => {
            const c = d.days[i]
            return c ? { total: acc.total + c.total, pending: acc.pending + c.pending, capacity: acc.capacity + c.capacity } : acc
          },
          { total: 0, pending: 0, capacity: 0 }
        )
      ),
    [days, doctors]
  )

  if (week.isLoading)
    return (
      <div className="bg-card space-y-2 rounded-xl border p-3" aria-busy="true" aria-label="Đang tải lịch tuần">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  if (week.error && !data) return <ErrorState error={week.error} onRetry={() => week.refetch()} className="bg-card rounded-xl border" />
  if (!data) return null
  if (doctors.length === 0)
    return (
      <EmptyState
        icon={CalendarRange}
        title="Không có bác sĩ phù hợp"
        description="Chưa có bác sĩ nào thuộc chuyên khoa đang lọc."
        className="bg-card rounded-xl border"
      />
    )

  return (
    <div className={cn('bg-card overflow-x-auto rounded-xl border shadow-xs transition-opacity', week.isFetching && 'opacity-70')} aria-busy={week.isFetching}>
      <table className="w-full min-w-[56rem] border-collapse text-sm">
        <caption className="sr-only">
          Lịch hẹn tuần {ddmmyyyy(days[0])} – {ddmmyyyy(days[6])}: số lịch trên sức chứa và số lịch chờ xác nhận theo bác sĩ
        </caption>
        <thead>
          <tr className="bg-muted/50">
            <th scope="col" className="text-muted-foreground w-52 border-b px-3 py-2.5 text-left text-xs font-semibold tracking-wide uppercase">
              Bác sĩ
            </th>
            {days.map((d) => {
              const isToday = d === today
              return (
                <th
                  key={d}
                  scope="col"
                  className={cn('border-b border-l px-2 py-2.5 text-center text-xs font-semibold', isToday ? 'text-primary' : 'text-muted-foreground')}
                >
                  <span className="block">{weekdayShort(isoWeekdayOf(d))}</span>
                  <span className="block tabular-nums">{ddmmyyyy(d).slice(0, 5)}</span>
                  {isToday && <span className="block text-[0.625rem] font-medium">Hôm nay</span>}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {doctors.map((doc) => (
            <tr key={doc.id}>
              <th scope="row" className="border-b px-3 py-2 text-left font-normal">
                <span className="block font-semibold">{doc.displayName}</span>
                <span className="text-muted-foreground block text-xs">{doc.specialtyName}</span>
              </th>
              {days.map((d, i) => (
                <td key={d} className="border-b border-l p-1">
                  <WeekCell cell={doc.days[i]} doctorName={doc.displayName} date={d} today={today} onPick={() => onPickDay(d)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted/30">
            <th scope="row" className="px-3 py-2 text-left text-xs font-semibold">
              Tổng cộng
            </th>
            {totals.map((t, i) => (
              <td key={days[i]} className="border-l px-2 py-2 text-center text-xs tabular-nums">
                <span className="font-semibold">{t.total}</span>
                <span className="text-muted-foreground">/{t.capacity}</span>
                {t.pending > 0 && <span className="text-warning block font-medium">{t.pending} chờ xác nhận</span>}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function WeekCell({
  cell,
  doctorName,
  date,
  today,
  onPick,
}: {
  cell: WeekCellDto | undefined
  doctorName: string
  date: string
  today: string
  onPick: () => void
}) {
  const total = cell?.total ?? 0
  const capacity = cell?.capacity ?? 0
  const pending = cell?.pending ?? 0
  const off = capacity === 0
  const ratio = capacity > 0 ? Math.min(1, total / capacity) : 0
  const past = date < today
  const label = `${doctorName}, ${weekdayLabel(isoWeekdayOf(date))} ${ddmmyyyy(date)}: ${
    off ? 'không có khung giờ' : `${total} trên ${capacity} lịch`
  }${pending > 0 ? `, ${pending} chờ xác nhận` : ''}. Xem dạng ngày`

  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={label}
      className={cn(
        'hover:bg-muted/60 focus-visible:ring-ring/50 flex h-full min-h-16 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-center outline-none focus-visible:ring-3',
        date === today && 'bg-primary/5',
        past && 'opacity-70'
      )}
    >
      {off && total === 0 ? (
        <span className="text-muted-foreground text-xs">Nghỉ</span>
      ) : (
        <>
          <span className="text-sm tabular-nums">
            <b>{total}</b>
            <span className="text-muted-foreground">/{capacity}</span>
          </span>
          {capacity > 0 && (
            <span className="bg-muted block h-1.5 w-full max-w-16 overflow-hidden rounded-full" aria-hidden="true">
              <span className={cn('block h-full rounded-full', ratio >= 1 ? 'bg-destructive' : ratio >= 0.8 ? 'bg-warning' : 'bg-primary')} style={{ width: `${ratio * 100}%` }} />
            </span>
          )}
          {pending > 0 && (
            <span className="text-warning inline-flex items-center gap-0.5 text-[0.6875rem] font-medium">
              <Clock className="size-3" aria-hidden="true" />
              {pending} chờ
            </span>
          )}
          {off && <span className="text-warning text-[0.6875rem]">Ngoài khung</span>}
        </>
      )}
    </button>
  )
}
