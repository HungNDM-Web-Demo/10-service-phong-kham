'use client'

import Link from 'next/link'
import { Stethoscope } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { routePath } from '@/config/route-path'
import { formatNumber } from '@/lib/format'
import type { DashboardDoctorDto } from '@/types/clinic'
import { WaitBadge } from './WaitBadge'

/** Hàng chờ của một bác sĩ ở chế độ chỉ xem (UC-14 3a) */
export const doctorQueueHref = (doctorId: string) => `${routePath.queue}?doctorId=${encodeURIComponent(doctorId)}`

/**
 * Bảng theo bác sĩ hôm nay (FR-02, UC-14 bước 3): phòng, số đang khám, đang chờ, đã khám, thời gian chờ trung bình
 * (BR-13). Bấm tên bác sĩ mở hàng chờ của bác sĩ đó.
 */
export function DoctorBoard({ doctors, isLoading, canOpenQueue }: { doctors: DashboardDoctorDto[] | undefined; isLoading: boolean; canOpenQueue: boolean }) {
  if (isLoading || !doctors)
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  if (doctors.length === 0)
    return <EmptyState compact icon={Stethoscope} title="Hôm nay không có bác sĩ làm việc" description="Kiểm tra lịch làm việc ở trang Bác sĩ." />
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[640px]">
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-muted-foreground px-4 text-xs font-semibold uppercase">Bác sĩ</TableHead>
            <TableHead className="text-muted-foreground px-4 text-xs font-semibold uppercase">Đang khám</TableHead>
            <TableHead className="text-muted-foreground px-4 text-right text-xs font-semibold uppercase">Đang chờ</TableHead>
            <TableHead className="text-muted-foreground px-4 text-right text-xs font-semibold uppercase">Đã khám</TableHead>
            <TableHead className="text-muted-foreground px-4 text-right text-xs font-semibold uppercase">Chờ trung bình</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {doctors.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="px-4 py-2.5">
                {canOpenQueue ? (
                  <Link href={doctorQueueHref(d.id)} className="text-primary font-medium hover:underline">
                    {d.displayName}
                  </Link>
                ) : (
                  <p className="font-medium">{d.displayName}</p>
                )}
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  {d.room}
                  {!d.working && (
                    <StatusBadge tone="neutral" className="h-5 px-1.5 text-[0.6875rem]">
                      Ngoài giờ làm
                    </StatusBadge>
                  )}
                </p>
              </TableCell>
              <TableCell className="px-4 py-2.5">
                {d.currentTicket ? (
                  <StatusBadge tone="primary" className="font-mono">
                    {d.currentTicket}
                  </StatusBadge>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>
              <TableCell className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatNumber(d.waiting, 0)}</TableCell>
              <TableCell className="px-4 py-2.5 text-right tabular-nums">{formatNumber(d.done, 0)}</TableCell>
              <TableCell className="px-4 py-2.5 text-right">
                {d.avgWaitMinutes === null ? <span className="text-muted-foreground text-sm">—</span> : <WaitBadge minutes={d.avgWaitMinutes} plain />}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
