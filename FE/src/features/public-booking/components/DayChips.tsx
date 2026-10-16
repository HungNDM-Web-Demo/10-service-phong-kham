'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { dayChipTop, fullDayLabel } from '../lib/booking'

type DayChipsProps = {
  days: string[]
  today: string
  value: string
  onChange: (day: string) => void
}

/** Dải chọn ngày cuộn ngang (UC-03 bước 4): hôm nay tới 30 ngày tới; ngày đang chọn luôn được cuộn vào giữa. */
export function DayChips({ days, today, value, onChange }: DayChipsProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const selected = listRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')
    selected?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [value])

  return (
    <div ref={listRef} role="group" aria-label="Chọn ngày khám" className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pt-0.5 pb-2">
      {days.map((d) => {
        const selected = d === value
        const month = Number(d.slice(5, 7))
        const top = dayChipTop(d, today)
        return (
          <button
            key={d}
            type="button"
            aria-pressed={selected}
            // Tên đọc chứa chữ đang hiện ("Hôm nay", "Mai") để điều khiển bằng giọng nói vẫn khớp
            aria-label={d === today || top === 'Mai' ? `${top}, ${fullDayLabel(d)}` : fullDayLabel(d)}
            onClick={() => onChange(d)}
            className={cn(
              'flex w-15 shrink-0 snap-start flex-col items-center rounded-xl border py-2 transition-colors outline-none',
              'focus-visible:ring-ring/50 focus-visible:ring-3',
              selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/40'
            )}
          >
            <span className={cn('text-xs', selected ? 'font-semibold' : 'text-muted-foreground')}>{top}</span>
            <span className="text-lg leading-tight font-semibold tabular-nums">{d.slice(8)}</span>
            <span className={cn('text-xs', !selected && 'text-muted-foreground')}>Th{month}</span>
          </button>
        )
      })}
    </div>
  )
}
