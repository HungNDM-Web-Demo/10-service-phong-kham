import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type DisplayMessageProps = {
  icon: LucideIcon
  title: string
  description?: React.ReactNode
  tone?: 'danger' | 'warning' | 'muted'
  /** Biểu tượng xoay (đang kết nối lại) */
  spin?: boolean
}

/** Thông báo toàn màn hình cho TV ở sảnh (sai mã màn hình, mất kết nối), chữ lớn đọc được từ xa. */
export function DisplayMessage({ icon: Icon, title, description, tone = 'muted', spin }: DisplayMessageProps) {
  return (
    <div role="alert" className="flex h-full flex-col items-center justify-center gap-[3vh] px-[6vw] text-center">
      <span
        className={cn(
          'flex size-[16vh] items-center justify-center rounded-full',
          tone === 'danger' && 'bg-destructive/15 text-destructive',
          tone === 'warning' && 'bg-warning/15 text-warning',
          tone === 'muted' && 'bg-muted text-muted-foreground'
        )}
        aria-hidden="true"
      >
        <Icon className={cn('size-[8vh]', spin && 'animate-spin')} />
      </span>
      <h1 className="text-[6vh] leading-tight font-bold">{title}</h1>
      {description && <div className="text-muted-foreground max-w-[60vw] text-[2.8vh] text-pretty">{description}</div>}
    </div>
  )
}
