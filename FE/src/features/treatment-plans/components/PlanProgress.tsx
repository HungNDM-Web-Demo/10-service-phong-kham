import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

/** Tiến độ kế hoạch: số hạng mục đã làm / số hạng mục chưa hủy (07 §3.11). */
export function PlanProgress({
  done,
  total,
  className,
}: {
  done: number
  total: number
  className?: string
}) {
  const percent = total > 0 ? Math.round((done * 100) / total) : 0
  return (
    <div className={cn('flex min-w-28 items-center gap-2', className)}>
      <Progress
        value={percent}
        className="h-1.5 flex-1"
        aria-label={`Đã làm ${done} trên ${total} hạng mục`}
      />
      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
        {done}/{total}
      </span>
    </div>
  )
}
