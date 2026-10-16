'use client'

import { CalendarCheck2, Clock, CornerDownLeft, MoreHorizontal, RotateCcw, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { clinicRules } from '@/features/clinic/lib/rules'
import { genderLabels } from '@/features/clinic/lib/labels'
import { vnHhmm } from '@/features/clinic/lib/vn-time'
import { cn } from '@/lib/utils'
import type { QueueVisitDto } from '@/types/clinic'

export type RowAction = { label: string; onSelect: () => void; destructive?: boolean }

/** Số phút đã chờ: tô vàng từ 30 phút, đỏ từ 60 phút, luôn kèm chữ (BR-13). */
export function WaitBadge({ minutes }: { minutes: number }) {
  const level = minutes >= clinicRules.waitAlertMinutes ? 'alert' : minutes >= clinicRules.waitWarnMinutes ? 'warn' : 'ok'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums',
        level === 'alert' && 'bg-destructive/10 text-destructive',
        level === 'warn' && 'bg-warning/12 text-warning',
        level === 'ok' && 'text-muted-foreground'
      )}
      title={level === 'ok' ? undefined : level === 'alert' ? 'Đã chờ từ 60 phút' : 'Đã chờ từ 30 phút'}
    >
      <Clock className="size-3" aria-hidden="true" />
      {minutes} phút
    </span>
  )
}

type QueueVisitRowProps = {
  visit: QueueVisitDto
  position?: number
  actions?: RowAction[]
  primaryAction?: React.ReactNode
  onOpen?: () => void
}

/** Một lượt trong hàng chờ: STT, họ tên, tuổi, nhãn Có hẹn, Ưu tiên, Tái khám, Quay lại, số phút đã chờ (UC-06 bước 1). */
export function QueueVisitRow({ visit, position, actions = [], primaryAction, onOpen }: QueueVisitRowProps) {
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="bg-muted text-foreground flex h-10 min-w-16 shrink-0 flex-col items-center justify-center rounded-md px-1 text-xs leading-tight font-semibold tabular-nums">
        {visit.ticket.split(' - ')[1] ?? visit.queueNumber}
        {position !== undefined && <span className="text-muted-foreground text-[0.625rem] font-normal">thứ {position}</span>}
      </span>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onOpen}
          disabled={!onOpen}
          className="block max-w-full truncate text-left text-sm font-medium hover:underline disabled:no-underline"
        >
          {visit.patientName}
        </button>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span>
            {visit.age} tuổi · {genderLabels[visit.gender]}
          </span>
          {visit.hasAppointment && (
            <span className="text-info inline-flex items-center gap-0.5">
              <CalendarCheck2 className="size-3" aria-hidden="true" />
              Có hẹn {visit.appointmentStartAt ? vnHhmm(visit.appointmentStartAt) : ''}
            </span>
          )}
          {visit.isPriority && (
            <span className="text-warning inline-flex items-center gap-0.5 font-medium">
              <Star className="size-3" aria-hidden="true" />
              {visit.priorityReason ?? 'Ưu tiên'}
            </span>
          )}
          {visit.isFollowUp && (
            <span className="text-success inline-flex items-center gap-0.5">
              <RotateCcw className="size-3" aria-hidden="true" />
              Tái khám
            </span>
          )}
          {visit.isReturned && (
            <span className="text-primary inline-flex items-center gap-0.5 font-medium">
              <CornerDownLeft className="size-3" aria-hidden="true" />
              Có kết quả
            </span>
          )}
          {visit.skipCount > 0 && <span>Bỏ qua {visit.skipCount} lần</span>}
        </div>
      </div>
      {visit.status === 'ChoKham' && <WaitBadge minutes={visit.waitMinutes} />}
      {primaryAction}
      {actions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Thao tác với ${visit.patientName}`}>
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {actions.map((a) => (
              <DropdownMenuItem key={a.label} onSelect={a.onSelect} className={cn(a.destructive && 'text-destructive focus:text-destructive')}>
                {a.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  )
}
