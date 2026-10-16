'use client'

import { useState } from 'react'
import { vi } from 'react-day-picker/locale'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { addDaysKey, ddmmyyyy, isoWeekdayOf, weekdayShort } from '@/features/clinic/lib/vn-time'
import { dateToKey, keyToDate, mondayOf } from '../lib/appointment-ui'

type DateNavigatorProps = {
  date: string
  today: string
  /** day: lùi/tiến 1 ngày; week: lùi/tiến 1 tuần, nhãn hiện khoảng Thứ Hai – Chủ nhật */
  mode: 'day' | 'week'
  onChange: (date: string) => void
}

/** Chuyển ngày xem lịch hẹn: ngày trước, ngày sau, hôm nay, chọn ngày trên lịch (UC-04 bước 2). */
export function DateNavigator({ date, today, mode, onChange }: DateNavigatorProps) {
  const [open, setOpen] = useState(false)
  const step = mode === 'week' ? 7 : 1
  const monday = mondayOf(date)
  const sunday = addDaysKey(monday, 6)
  const atToday = mode === 'week' ? today >= monday && today <= sunday : date === today
  const label =
    mode === 'week'
      ? `${ddmmyyyy(monday).slice(0, 5)} – ${ddmmyyyy(sunday)}`
      : `${weekdayShort(isoWeekdayOf(date))}, ${ddmmyyyy(date)}`

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        aria-label={mode === 'week' ? 'Tuần trước' : 'Ngày trước'}
        onClick={() => onChange(addDaysKey(date, -step))}
      >
        <ChevronLeft aria-hidden="true" />
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-40 justify-start tabular-nums" aria-label={`Chọn ngày, đang xem ${label}`}>
            <CalendarDays aria-hidden="true" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={vi}
            weekStartsOn={1}
            selected={keyToDate(date)}
            defaultMonth={keyToDate(date)}
            onSelect={(d) => {
              if (!d) return
              onChange(dateToKey(d))
              setOpen(false)
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>
      <Button
        variant="outline"
        size="icon"
        aria-label={mode === 'week' ? 'Tuần sau' : 'Ngày sau'}
        onClick={() => onChange(addDaysKey(date, step))}
      >
        <ChevronRight aria-hidden="true" />
      </Button>
      <Button variant="ghost" disabled={atToday} onClick={() => onChange(today)}>
        {mode === 'week' ? 'Tuần này' : 'Hôm nay'}
      </Button>
    </div>
  )
}
