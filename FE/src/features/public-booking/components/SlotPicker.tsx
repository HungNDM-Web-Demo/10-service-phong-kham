'use client'

import { CalendarSearch, CalendarX2, Moon, Phone, Sun, Sunrise } from 'lucide-react'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { PublicSlotsDto } from '@/types/clinic'
import { fullDayLabel, groupSlots, telHref, type SlotSession } from '../lib/booking'

const SESSION_ICONS: Record<SlotSession['key'], typeof Sun> = { sang: Sunrise, chieu: Sun, toi: Moon }

type SlotPickerProps = {
  data: PublicSlotsDto | undefined
  /** Đang tải hoặc dữ liệu đang hiện là của lựa chọn cũ */
  loading: boolean
  error: unknown
  onRetry: () => void
  value: string | null
  onChange: (startAt: string) => void
  onPickDate: (day: string) => void
  hotline: string | null
}

/**
 * Lưới khung giờ của một ngày (UC-03 bước 4, BR-01, BR-02): chỉ khung bắt đầu sau ít nhất 2 giờ; khung đã đủ hiện mờ,
 * không bấm được. Ngày nghỉ hoặc hết chỗ thì báo lý do và gợi ý ngày gần nhất còn chỗ (UC-03 4a, TC-07).
 */
export function SlotPicker({ data, loading, error, onRetry, value, onChange, onPickDate, hotline }: SlotPickerProps) {
  if (loading)
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Đang tải khung giờ">
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-11 rounded-lg" />
          ))}
        </div>
      </div>
    )

  if (error) return <ErrorState error={error} title="Không tải được khung giờ" onRetry={onRetry} className="py-8" />
  if (!data) return null

  const sessions = groupSlots(data.slots)
  const freeCount = data.slots.filter((s) => s.available).length

  return (
    <div className="space-y-4">
      {(data.closedReason || freeCount === 0) && (
        <div className="bg-muted/60 space-y-3 rounded-xl border p-4 text-center" role="status">
          <span className="bg-background text-muted-foreground mx-auto flex size-10 items-center justify-center rounded-full" aria-hidden="true">
            <CalendarX2 className="size-5" />
          </span>
          <p className="font-medium text-pretty">{data.closedReason ?? 'Ngày này không còn khung giờ trống'}</p>
          {data.nextAvailableDate ? (
            <Button variant="outline" className="h-auto min-h-10 w-full py-2 whitespace-normal" onClick={() => onPickDate(data.nextAvailableDate!)}>
              <CalendarSearch aria-hidden="true" />
              Ngày gần nhất còn chỗ: {fullDayLabel(data.nextAvailableDate)}
            </Button>
          ) : (
            <p className="text-muted-foreground text-sm text-pretty">
              Trong 30 ngày tới chưa còn khung trống.{' '}
              {hotline && (
                <>
                  Vui lòng gọi{' '}
                  <a href={telHref(hotline)} className="text-primary inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline">
                    <Phone className="size-3.5" aria-hidden="true" />
                    {hotline}
                  </a>{' '}
                  để được hỗ trợ.
                </>
              )}
            </p>
          )}
        </div>
      )}

      {sessions.map((session) => {
        const Icon = SESSION_ICONS[session.key]
        const free = session.slots.filter((s) => s.available).length
        return (
          <div key={session.key} role="group" aria-label={session.label} className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Icon className="text-muted-foreground size-4" aria-hidden="true" />
              {session.label}
              <span className="text-muted-foreground font-normal">· {free > 0 ? `còn ${free} khung` : 'đã kín'}</span>
            </p>
            <div className="grid grid-cols-4 gap-2">
              {session.slots.map((s) => {
                const selected = s.startAt === value
                return (
                  <button
                    key={s.startAt}
                    type="button"
                    disabled={!s.available}
                    aria-pressed={s.available ? selected : undefined}
                    aria-label={s.available ? s.time : `${s.time}, hết chỗ`}
                    onClick={() => onChange(s.startAt)}
                    className={cn(
                      'h-11 rounded-lg border text-sm font-medium tabular-nums transition-colors outline-none',
                      'focus-visible:ring-ring/50 focus-visible:ring-3',
                      !s.available
                        ? 'bg-muted text-muted-foreground cursor-not-allowed line-through opacity-50'
                        : selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'bg-card hover:border-primary/40'
                    )}
                  >
                    {s.time}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {freeCount > 0 && freeCount < data.slots.length && <p className="text-muted-foreground text-xs">Khung mờ, gạch ngang là đã kín lịch.</p>}
    </div>
  )
}
