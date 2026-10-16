'use client'

import { Globe, GripVertical, UserX } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { cn } from '@/lib/utils'
import type { AppointmentCardDto, AppointmentStatus } from '@/types/clinic'
import { AppointmentStatusBadge } from '@/features/clinic/components/ClinicBadges'

/** Khung thẻ theo trạng thái; "Chờ xác nhận" viền đứt nét tông cảnh báo, luôn kèm chữ trạng thái (không chỉ dựa vào màu) */
const TONES: Record<AppointmentStatus, string> = {
  ChoXacNhan: 'border-2 border-dashed border-warning bg-warning/10',
  DaXacNhan: 'border border-l-4 border-l-info bg-card',
  DaDen: 'border border-success/40 border-l-4 border-l-success bg-success/10',
  KhongDen: 'border border-destructive/30 bg-destructive/5 text-muted-foreground',
  DaHuy: 'border border-dashed bg-muted text-muted-foreground',
}

const BADGE = 'h-5 gap-1 px-1.5 text-[0.6875rem]'

type AppointmentCardProps = {
  card: AppointmentCardDto
  draggable?: boolean
  dragging?: boolean
  onOpen: () => void
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: () => void
}

/** Thẻ lịch hẹn trong ô khung giờ (SCR-04): tên bệnh nhân, mã lịch, trạng thái, nguồn Online, dấu "Chưa ghép hồ sơ". */
export function AppointmentCard({ card: a, draggable, dragging, onOpen, onDragStart, onDragEnd }: AppointmentCardProps) {
  const cancelled = a.status === 'DaHuy'
  return (
    // div role="button" thay cho <button>: Firefox không kéo được phần tử button
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      title={draggable ? 'Bấm để xem chi tiết, kéo sang khung khác để đổi giờ' : 'Bấm để xem chi tiết'}
      className={cn(
        'group/card relative w-full min-w-0 rounded-md px-2 py-1.5 text-left text-xs shadow-xs transition-[opacity,box-shadow] outline-none select-none',
        'hover:shadow-sm focus-visible:ring-ring/60 focus-visible:ring-3',
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        TONES[a.status],
        dragging && 'opacity-40'
      )}
    >
      <span className="flex items-start gap-1">
        <span className={cn('min-w-0 flex-1 truncate text-[0.8125rem] font-semibold', cancelled && 'line-through')}>{a.patientName}</span>
        {draggable && <GripVertical className="text-muted-foreground mt-0.5 size-3.5 shrink-0 opacity-0 group-hover/card:opacity-100" aria-hidden="true" />}
      </span>
      <span className="text-muted-foreground block truncate tabular-nums">
        {a.code}
        {a.patientCode ? ` · ${a.patientCode}` : ''}
      </span>
      {(a.serviceName || a.reason) && <span className="text-muted-foreground block truncate">{a.serviceName ?? a.reason}</span>}
      <span className="mt-1 flex flex-wrap items-center gap-1">
        <AppointmentStatusBadge status={a.status} className={BADGE} />
        {a.source === 'Online' && (
          <StatusBadge tone="info" dot={false} icon={<Globe className="size-3" aria-hidden="true" />} className={BADGE}>
            Online
          </StatusBadge>
        )}
        {a.isGuest && (
          <StatusBadge tone="warning" dot={false} icon={<UserX className="size-3" aria-hidden="true" />} className={BADGE}>
            Chưa ghép hồ sơ
          </StatusBadge>
        )}
      </span>
    </div>
  )
}
