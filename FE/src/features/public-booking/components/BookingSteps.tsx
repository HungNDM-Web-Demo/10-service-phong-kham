import { cn } from '@/lib/utils'

/** Thanh tiến trình các bước đặt lịch; bước hiện tại đánh dấu aria-current cho trình đọc màn hình. */
export function BookingSteps({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <ol className="flex items-start gap-1.5" aria-label="Các bước đặt lịch">
      {steps.map((label, i) => (
        <li key={label} className="flex flex-1 flex-col gap-1" aria-current={i === current ? 'step' : undefined}>
          <span className={cn('h-1.5 rounded-full transition-colors', i <= current ? 'bg-primary' : 'bg-muted')} aria-hidden="true" />
          <span className={cn('text-xs', i === current ? 'text-foreground font-semibold' : 'text-muted-foreground')}>
            <span className="sr-only">Bước </span>
            {i + 1}. {label}
            {i < current && <span className="sr-only"> (đã xong)</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}
