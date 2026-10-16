'use client'

import { CirclePause, CirclePlay, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { SpecialtyDto } from '@/types/clinic'
import { ALL, type ActiveFilter } from '../lib/catalog'

/** Trạng thái mục danh mục: Đang dùng / Ngừng (UC-01 1d) */
export function ActiveBadge({ active }: { active: boolean }) {
  return active ? <StatusBadge tone="success">Đang dùng</StatusBadge> : <StatusBadge tone="neutral">Ngừng</StatusBadge>
}

export function ActiveFilterSelect({ value, onChange }: { value: ActiveFilter; onChange: (value: ActiveFilter) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ActiveFilter)}>
      <SelectTrigger className="w-full sm:w-40" aria-label="Lọc theo trạng thái">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Mọi trạng thái</SelectItem>
        <SelectItem value="active">Đang dùng</SelectItem>
        <SelectItem value="inactive">Ngừng</SelectItem>
      </SelectContent>
    </Select>
  )
}

export function SpecialtyFilterSelect({
  value,
  specialties,
  onChange,
}: {
  value: string
  specialties: SpecialtyDto[]
  onChange: (value: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-48" aria-label="Lọc theo chuyên khoa">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Mọi chuyên khoa</SelectItem>
        {specialties.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Ô tiêu đề cột cho bảng tự dựng (bảng nhóm theo Khám, Thủ thuật, Cận lâm sàng) */
export function HeadCell({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <TableHead className={cn('text-muted-foreground h-11 px-4 text-xs font-semibold tracking-wide uppercase', className)}>{children}</TableHead>
  )
}

/** Dòng bật/tắt có nhãn và mô tả, nhấn vào nhãn cũng bật/tắt được */
export function SwitchRow({
  id,
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
  className,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5', className)}>
      <div className="min-w-0 space-y-0.5">
        <Label htmlFor={id} className="cursor-pointer">
          {label}
        </Label>
        <p className="text-muted-foreground text-xs leading-snug">{description}</p>
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} className="mt-0.5" />
    </div>
  )
}

/** Gợi ý dưới ô mã: mã hệ thống đề xuất, bấm để dùng lại khi đã gõ mã khác */
export function CodeHint({
  suggested,
  current,
  loading,
  onUse,
  fallback,
}: {
  suggested: string | null
  current: string
  loading: boolean
  onUse: () => void
  fallback: string
}) {
  if (loading && !suggested) return <>Đang lấy mã gợi ý…</>
  if (!suggested) return <>{fallback}</>
  if (current === suggested) return <>Mã gợi ý, sửa được</>
  return (
    <>
      Mã gợi ý:{' '}
      <button
        type="button"
        onClick={onUse}
        className="text-primary focus-visible:ring-ring/50 cursor-pointer rounded-sm font-mono font-medium underline-offset-2 outline-none hover:underline focus-visible:ring-3"
      >
        {suggested}
      </button>
    </>
  )
}

/**
 * Menu thao tác một dòng danh mục: Sửa, Ngừng/Dùng lại, Xóa. Mục đã dùng trong lượt khám thì nút Xóa bị khóa và ghi rõ
 * lý do, gợi ý dùng "Ngừng" (BR-33, UC-01 E3).
 */
export function CatalogRowActions({
  name,
  kind,
  isActive,
  isUsed,
  usedHint,
  canUpdate,
  canDelete,
  onEdit,
  onToggle,
  onDelete,
}: {
  name: string
  /** "dịch vụ", "thuốc", "chẩn đoán" */
  kind: string
  isActive: boolean
  isUsed: boolean
  usedHint: string
  canUpdate: boolean
  canDelete: boolean
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  if (!canUpdate && !canDelete) return null
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Thao tác với ${kind} ${name}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-muted-foreground truncate text-xs font-normal">{name}</DropdownMenuLabel>
        {canUpdate && (
          <>
            <DropdownMenuItem className="h-9" onSelect={onEdit}>
              <Pencil aria-hidden="true" /> Sửa {kind}
            </DropdownMenuItem>
            <DropdownMenuItem className="h-9" onSelect={onToggle}>
              {isActive ? <CirclePause aria-hidden="true" /> : <CirclePlay aria-hidden="true" />}
              {isActive ? 'Ngừng' : 'Dùng lại'}
            </DropdownMenuItem>
          </>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" className="h-9" disabled={isUsed} onSelect={onDelete}>
              <Trash2 aria-hidden="true" /> Xóa {kind}
            </DropdownMenuItem>
            {isUsed && (
              <p className="text-muted-foreground px-2 pb-1.5 text-xs leading-snug">
                {usedHint}
                {isActive && canUpdate ? ' Chọn "Ngừng" để không dùng nữa.' : ''}
              </p>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
