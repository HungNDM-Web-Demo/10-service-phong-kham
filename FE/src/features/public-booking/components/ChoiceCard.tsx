import { CircleCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

type ChoiceCardProps = {
  name: string
  value: string
  checked: boolean
  onSelect: (value: string) => void
  /** Hiện dấu tích ở góc phải khi đang chọn */
  showCheck?: boolean
  className?: string
  children: React.ReactNode
}

/**
 * Thẻ chọn một trong nhiều (chuyên khoa, bác sĩ, giới tính): radio thật ẩn bên trong nhãn nên dùng được phím mũi tên,
 * trình đọc màn hình đọc đúng "đã chọn"; viền và nền màu chính khi chọn, vùng chạm lớn cho điện thoại.
 */
export function ChoiceCard({ name, value, checked, onSelect, showCheck = true, className, children }: ChoiceCardProps) {
  return (
    <label
      className={cn(
        'bg-card relative flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-left transition-colors',
        'has-[input:focus-visible]:ring-ring/50 has-[input:focus-visible]:ring-3',
        checked ? 'border-primary bg-primary/5 ring-primary/25 ring-2' : 'hover:border-primary/40'
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onSelect(value)} className="sr-only" />
      <span className={cn('flex min-w-0 flex-1 items-center gap-3', className)}>{children}</span>
      {showCheck && checked && <CircleCheck className="text-primary size-5 shrink-0" aria-hidden="true" />}
    </label>
  )
}
