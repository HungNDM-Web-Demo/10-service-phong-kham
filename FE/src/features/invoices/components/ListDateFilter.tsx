'use client'

import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { vnToday } from '@/features/clinic/lib/vn-time'
import { presetRange } from '@/features/reports/lib/date-range'

export type ListPreset = 'today' | '7d' | '30d' | 'thisMonth' | 'all' | 'custom'
export type ListRange = { from?: string; to?: string }

const OPTIONS: { value: ListPreset; label: string }[] = [
  { value: 'today', label: 'Hôm nay' },
  { value: '7d', label: '7 ngày gần nhất' },
  { value: '30d', label: '30 ngày gần nhất' },
  { value: 'thisMonth', label: 'Tháng này' },
  { value: 'all', label: 'Mọi ngày' },
  { value: 'custom', label: 'Tùy chọn' },
]

export const listRangeOf = (preset: Exclude<ListPreset, 'custom'>): ListRange => (preset === 'all' ? {} : presetRange(preset))

/** Bộ lọc ngày của danh sách phiếu (FR-34): chọn nhanh hoặc nhập hai ngày; khoảng sai thì báo và không áp dụng. */
export function ListDateFilter({
  id,
  preset,
  value,
  onChange,
}: {
  id: string
  preset: ListPreset
  value: ListRange
  onChange: (preset: ListPreset, range: ListRange) => void
}) {
  const [custom, setCustom] = useState<ListRange>(value)
  const error = preset === 'custom' && custom.from && custom.to && custom.from > custom.to ? 'Ngày kết thúc phải từ ngày bắt đầu trở đi' : null

  const updateCustom = (next: ListRange) => {
    setCustom(next)
    if (!(next.from && next.to && next.from > next.to)) onChange('custom', next)
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="grid gap-1.5">
        <Label htmlFor={id} className="text-muted-foreground text-xs">
          Ngày
        </Label>
        <Select
          value={preset}
          onValueChange={(v) => {
            const p = v as ListPreset
            if (p === 'custom') {
              const start = value.from || value.to ? value : { from: vnToday(), to: vnToday() }
              setCustom(start)
              onChange('custom', start)
            } else onChange(p, listRangeOf(p))
          }}
        >
          <SelectTrigger id={id} className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {preset === 'custom' && (
        <div className="grid gap-1.5">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={custom.from ?? ''}
              onChange={(e) => updateCustom({ ...custom, from: e.target.value || undefined })}
              aria-label="Từ ngày"
              aria-invalid={!!error || undefined}
              className="w-40"
            />
            <span className="text-muted-foreground" aria-hidden="true">
              →
            </span>
            <Input
              type="date"
              value={custom.to ?? ''}
              onChange={(e) => updateCustom({ ...custom, to: e.target.value || undefined })}
              aria-label="Đến ngày"
              aria-invalid={!!error || undefined}
              className="w-40"
            />
          </div>
          {error && (
            <p role="alert" className="text-destructive flex items-center gap-1 text-xs">
              <AlertCircle className="size-3.5" aria-hidden="true" />
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
