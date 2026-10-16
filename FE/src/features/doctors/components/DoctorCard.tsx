'use client'

import {
  CalendarClock,
  CalendarOff,
  CirclePause,
  CirclePlay,
  Eye,
  EyeOff,
  Globe,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserRound,
} from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DoctorDto } from '@/types/clinic'
import { weekdayLabel, weekdayShort } from '@/features/clinic/lib/vn-time'
import type { DoctorTab } from './DoctorSheet'

/**
 * Thẻ bác sĩ (UC-02 bước 1): ảnh hoặc chữ viết tắt, mã, tên hiển thị, học hàm học vị, chuyên khoa, phòng, số giờ làm mỗi
 * tuần, số khung mỗi ngày, hiện trên trang đặt lịch, trạng thái.
 */
export function DoctorCard({
  doctor: d,
  canUpdate,
  canDelete,
  onOpen,
  onToggleActive,
  onToggleOnline,
  onDelete,
}: {
  doctor: DoctorDto
  canUpdate: boolean
  canDelete: boolean
  onOpen: (tab: DoctorTab) => void
  onToggleActive: () => void
  onToggleOnline: () => void
  onDelete: () => void
}) {
  const weekSlots = d.slotsPerDay.reduce((s, n) => s + n, 0)

  return (
    <article
      className={cn(
        'bg-card text-card-foreground hover:border-primary/40 flex flex-col gap-4 rounded-xl border p-4 shadow-xs transition-colors duration-150',
        !d.isActive && 'bg-muted/40'
      )}
      aria-label={d.displayName}
    >
      <div className="flex items-start gap-3">
        <UserAvatar name={d.fullName} avatarUrl={d.photoUrl} size="lg" className={cn(!d.isActive && 'opacity-60')} />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpen('info')}
            className="focus-visible:ring-ring/50 block max-w-full cursor-pointer truncate rounded-sm text-left text-base font-semibold outline-none hover:underline focus-visible:ring-3"
          >
            {d.displayName}
          </button>
          <p className="text-muted-foreground truncate text-sm">
            <span className="font-mono text-xs">{d.code}</span>
            {d.title && <> · {d.title}</>}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {d.isActive ? <StatusBadge tone="success">Đang khám</StatusBadge> : <StatusBadge tone="neutral">Ngừng</StatusBadge>}
            {d.showOnline ? (
              <StatusBadge tone="info" dot={false} icon={<Globe className="size-3" aria-hidden="true" />}>
                Đặt online
              </StatusBadge>
            ) : (
              <StatusBadge tone="neutral" dot={false} icon={<EyeOff className="size-3" aria-hidden="true" />}>
                Ẩn trang đặt lịch
              </StatusBadge>
            )}
          </div>
        </div>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Thao tác với ${d.displayName}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="text-muted-foreground truncate text-xs font-normal">{d.displayName}</DropdownMenuLabel>
            <DropdownMenuItem className="h-9" onSelect={() => onOpen('info')}>
              <Pencil aria-hidden="true" /> {canUpdate ? 'Sửa thông tin' : 'Xem thông tin'}
            </DropdownMenuItem>
            <DropdownMenuItem className="h-9" onSelect={() => onOpen('schedule')}>
              <CalendarClock aria-hidden="true" /> Lịch làm việc
            </DropdownMenuItem>
            <DropdownMenuItem className="h-9" onSelect={() => onOpen('days-off')}>
              <CalendarOff aria-hidden="true" /> Ngày nghỉ
            </DropdownMenuItem>
            {canUpdate && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="h-9" onSelect={onToggleOnline}>
                  {d.showOnline ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  {d.showOnline ? 'Ẩn khỏi trang đặt lịch' : 'Hiện trên trang đặt lịch'}
                </DropdownMenuItem>
                <DropdownMenuItem className="h-9" onSelect={onToggleActive}>
                  {d.isActive ? <CirclePause aria-hidden="true" /> : <CirclePlay aria-hidden="true" />}
                  {d.isActive ? 'Ngừng hoạt động' : 'Hoạt động lại'}
                </DropdownMenuItem>
              </>
            )}
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" className="h-9" onSelect={onDelete}>
                  <Trash2 aria-hidden="true" /> Xóa bác sĩ
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="min-w-0">
          <dt className="text-muted-foreground text-xs">Chuyên khoa</dt>
          <dd className="truncate font-medium">{d.specialtyName}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground text-xs">Phòng</dt>
          <dd className="truncate font-medium">
            {d.room} <span className="text-muted-foreground font-normal">({d.roomShort})</span>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Giờ làm mỗi tuần</dt>
          <dd className="font-medium tabular-nums">{formatNumber(d.weeklyHours, 1)} giờ</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Khung giờ</dt>
          <dd className="font-medium tabular-nums">
            {d.slotMinutes} phút · tối đa {d.maxPerSlot}
          </dd>
        </div>
      </dl>

      <div>
        <p className="text-muted-foreground mb-1.5 flex items-center justify-between text-xs">
          <span>Số khung mỗi ngày</span>
          <span className="tabular-nums">{weekSlots} khung/tuần</span>
        </p>
        <ul className="grid grid-cols-7 gap-1">
          {d.slotsPerDay.map((n, i) => (
            <li
              key={i}
              className={cn('rounded-md py-1 text-center', n > 0 ? 'bg-primary/8 text-foreground' : 'bg-muted text-muted-foreground')}
              aria-label={`${weekdayLabel(i + 1)}: ${n > 0 ? `${n} khung` : 'nghỉ'}`}
            >
              <span className="block text-[0.6875rem] leading-tight">{weekdayShort(i + 1)}</span>
              <span className="text-sm font-semibold tabular-nums">{n > 0 ? n : '—'}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <p className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
          <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
          {d.username ? <span className="truncate font-mono">{d.username}</span> : <span>Chưa gắn tài khoản</span>}
        </p>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onOpen('schedule')}>
            <CalendarClock aria-hidden="true" />
            Lịch làm việc
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onOpen('days-off')}>
            <CalendarOff aria-hidden="true" />
            Ngày nghỉ
          </Button>
        </div>
      </div>
    </article>
  )
}

export function DoctorCardSkeleton() {
  return (
    <div className="bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-xs">
      <div className="flex items-start gap-3">
        <Skeleton className="size-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-36" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-9" />
        ))}
      </div>
      <Skeleton className="h-11" />
    </div>
  )
}
