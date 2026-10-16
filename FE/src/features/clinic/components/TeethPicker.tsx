'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Chọn vị trí răng theo sơ đồ FDI (07 §3.6): răng vĩnh viễn 11–48, răng sữa 51–85. Hàng trên là hàm trên (phải bệnh nhân
 * ở bên trái người nhìn), hàng dưới là hàm dưới.
 */

const PERMANENT_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const PERMANENT_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]
const PRIMARY_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65]
const PRIMARY_LOWER = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75]

type TeethPickerProps = {
  value: number[]
  onChange: (teeth: number[]) => void
  disabled?: boolean
  /** Bệnh nhân là trẻ em thì mở sẵn bảng răng sữa */
  preferPrimary?: boolean
}

export function TeethPicker({ value, onChange, disabled, preferPrimary }: TeethPickerProps) {
  const [primary, setPrimary] = useState(!!preferPrimary)
  const toggle = (n: number) => {
    if (disabled) return
    onChange(value.includes(n) ? value.filter((x) => x !== n) : [...value, n].sort((a, b) => a - b))
  }
  const row = (teeth: number[]) => (
    <div className="flex flex-wrap justify-center gap-1">
      {teeth.map((n, i) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          aria-pressed={value.includes(n)}
          aria-label={`Răng ${n}`}
          onClick={() => toggle(n)}
          className={cn(
            'focus-visible:ring-ring h-9 min-w-9 rounded-md border text-xs font-medium tabular-nums transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60',
            i === teeth.length / 2 && 'ml-2',
            value.includes(n) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-accent'
          )}
        >
          {n}
        </button>
      ))}
    </div>
  )
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs">Đã chọn: {value.length ? value.map((t) => `R${t}`).join(', ') : 'chưa chọn răng'}</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => setPrimary((p) => !p)}>
          {primary ? 'Răng vĩnh viễn' : 'Răng sữa'}
        </Button>
      </div>
      <div className="bg-muted/40 space-y-2 rounded-lg border p-2">
        {row(primary ? PRIMARY_UPPER : PERMANENT_UPPER)}
        <div className="border-t border-dashed" />
        {row(primary ? PRIMARY_LOWER : PERMANENT_LOWER)}
      </div>
    </div>
  )
}
