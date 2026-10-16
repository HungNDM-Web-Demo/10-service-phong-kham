'use client'

import { useId } from 'react'
import { CalendarOff, Info } from 'lucide-react'
import { ErrorState } from '@/components/shared/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { SlotDto } from '@/types/clinic'
import { useDoctorSlots } from '@/features/clinic/hooks/use-clinic'

type SlotPickerProps = {
  doctorId: string
  date: string
  value: string | null
  onChange: (startAt: string) => void
  /** Giờ hiện tại của lịch đang đổi (cùng bác sĩ): hiện "Giờ hiện tại", không chọn lại */
  currentStartAt?: string | null
  error?: string
  disabled?: boolean
}

const sameInstant = (a: string | null | undefined, b: string | null | undefined) => !!a && !!b && Date.parse(a) === Date.parse(b)

/**
 * Khung giờ của bác sĩ trong ngày (BR-01, 07 §3.1): mỗi ô hiện số đã đặt / tối đa; khung đã bắt đầu hoặc đã đủ thì khóa và ghi rõ lý do.
 * Lễ tân được chọn mọi khung chưa bắt đầu còn trống (BR-02).
 */
export function SlotPicker({ doctorId, date, value, onChange, currentStartAt, error, disabled }: SlotPickerProps) {
  const slots = useDoctorSlots(doctorId || null, date)
  const errorId = useId()

  if (!doctorId || !date)
    return <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-sm">Chọn bác sĩ và ngày để xem khung giờ.</p>

  if (slots.isLoading)
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" aria-busy="true" aria-label="Đang tải khung giờ">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="h-14 rounded-md" />
        ))}
      </div>
    )

  if (slots.error) return <ErrorState error={slots.error} onRetry={() => slots.refetch()} className="py-6" />

  const data = slots.data
  if (!data) return null

  const list = data.slots
  const freeCount = list.filter((s) => s.available).length

  return (
    <div className="space-y-2">
      {data.offReason && (
        <p className={cn('flex items-start gap-2 rounded-md px-3 py-2 text-sm', list.length === 0 ? 'bg-warning/12 text-warning' : 'bg-info/10 text-info')}>
          {list.length === 0 ? <CalendarOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
          {data.offReason}
        </p>
      )}
      {list.length === 0 ? (
        !data.offReason && <p className="text-muted-foreground text-sm">Bác sĩ không có khung giờ nào trong ngày này.</p>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            Còn trống {freeCount}/{list.length} khung. Số trong ô là lịch đã đặt / tối đa.
          </p>
          <div
            role="group"
            aria-label="Khung giờ"
            aria-describedby={error ? errorId : undefined}
            className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto p-0.5 sm:grid-cols-5"
          >
            {list.map((s) => (
              <SlotButton
                key={s.startAt}
                slot={s}
                selected={sameInstant(value, s.startAt)}
                current={sameInstant(currentStartAt, s.startAt)}
                disabled={disabled}
                onSelect={() => onChange(s.startAt)}
              />
            ))}
          </div>
        </>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-destructive text-[0.8125rem]">
          {error}
        </p>
      )}
    </div>
  )
}

function SlotButton({
  slot,
  selected,
  current,
  disabled,
  onSelect,
}: {
  slot: SlotDto
  selected: boolean
  current: boolean
  disabled?: boolean
  onSelect: () => void
}) {
  const full = slot.taken >= slot.max
  const blocked = current || !slot.available
  const note = current ? 'Giờ hiện tại' : slot.started ? 'Đã qua' : full ? 'Đã đủ' : `${slot.taken}/${slot.max}`
  const label = `${slot.time}, ${current ? 'giờ hiện tại của lịch' : slot.started ? 'khung đã bắt đầu' : full ? `đã đủ ${slot.taken}/${slot.max}` : `đã đặt ${slot.taken}/${slot.max}`}`

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      disabled={disabled || blocked}
      onClick={onSelect}
      className={cn(
        'flex h-14 flex-col items-center justify-center rounded-md border text-sm transition-colors outline-none',
        'focus-visible:ring-ring/50 focus-visible:border-ring focus-visible:ring-3',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : blocked
            ? 'bg-muted/60 text-muted-foreground cursor-not-allowed'
            : 'bg-background hover:border-primary hover:bg-primary/5 cursor-pointer',
        current && 'border-primary/50 border-dashed'
      )}
    >
      <span className={cn('font-semibold tabular-nums', blocked && !current && 'line-through decoration-1')}>{slot.time}</span>
      <span className={cn('text-[0.6875rem] tabular-nums', selected ? 'text-primary-foreground/85' : 'text-muted-foreground')}>{note}</span>
    </button>
  )
}
