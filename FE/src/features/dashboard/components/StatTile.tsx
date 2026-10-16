import type { LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const ICON_TONES: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/12 text-warning',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
  neutral: 'bg-muted text-muted-foreground',
}

type StatTileProps = {
  label: string
  value: React.ReactNode
  icon: LucideIcon
  /** Dòng chú thích dưới số (cách tính, đơn vị) */
  hint?: React.ReactNode
  tone?: Tone
  isLoading?: boolean
  className?: string
}

/** Thẻ số hôm nay của Tổng quan (FR-01): nhãn, số lớn, chú thích ngắn; màu biểu tượng chỉ minh họa. */
export function StatTile({ label, value, icon: Icon, hint, tone = 'primary', isLoading, className }: StatTileProps) {
  return (
    <div className={cn('bg-card flex flex-col rounded-xl border p-4 shadow-xs', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', ICON_TONES[tone])}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      {isLoading ? (
        <Skeleton className="mt-1 h-8 w-24" />
      ) : (
        <p className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      )}
      {hint && !isLoading && <p className="text-muted-foreground mt-1 text-xs text-pretty">{hint}</p>}
    </div>
  )
}
