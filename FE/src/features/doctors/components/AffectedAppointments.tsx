'use client'

import Link from 'next/link'
import { ArrowRight, TriangleAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { routePath } from '@/config/route-path'
import { formatPhone } from '@/lib/format'
import type { AppointmentBrief, DayOffDto } from '@/types/clinic'
import { AppointmentStatusBadge } from '@/features/clinic/components/ClinicBadges'
import { dayOffPartLabels } from '@/features/clinic/lib/labels'
import { ddmmyyyy, vnHhmm } from '@/features/clinic/lib/vn-time'

/**
 * Lịch hẹn rơi vào ngày nghỉ vừa thêm (UC-02 1a, TC-07; 07 §3.1): hệ thống không tự đổi lịch, lễ tân gọi bệnh nhân để đổi
 * giờ hoặc hủy với lý do "Bác sĩ nghỉ".
 */
export function AffectedAppointments({
  dayOff,
  items,
  onDismiss,
}: {
  dayOff: DayOffDto
  items: AppointmentBrief[]
  onDismiss: () => void
}) {
  return (
    <section role="status" className="border-warning/30 bg-warning/5 space-y-3 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <span className="bg-warning/15 text-warning flex size-8 shrink-0 items-center justify-center rounded-full">
          <TriangleAlert className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="font-medium">
            {items.length} lịch hẹn rơi vào ngày nghỉ {ddmmyyyy(dayOff.date)} ({dayOffPartLabels[dayOff.part].toLowerCase()})
          </p>
          <p className="text-muted-foreground text-sm">
            Báo lễ tân gọi bệnh nhân để đổi giờ hoặc hủy với lý do &quot;Bác sĩ nghỉ&quot;. Các lịch này vẫn giữ nguyên tới khi được xử lý.
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Ẩn danh sách lịch hẹn cần xử lý" onClick={onDismiss}>
          <X />
        </Button>
      </div>

      <div className="bg-background overflow-x-auto rounded-md border">
        <Table style={{ minWidth: 520 }}>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground h-9 px-3 text-xs font-semibold uppercase">Mã lịch</TableHead>
              <TableHead className="text-muted-foreground h-9 px-3 text-xs font-semibold uppercase">Giờ</TableHead>
              <TableHead className="text-muted-foreground h-9 px-3 text-xs font-semibold uppercase">Bệnh nhân</TableHead>
              <TableHead className="text-muted-foreground h-9 px-3 text-xs font-semibold uppercase">Điện thoại</TableHead>
              <TableHead className="text-muted-foreground h-9 px-3 text-xs font-semibold uppercase">Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((a) => (
              <TableRow key={a.id} className="hover:bg-muted/40">
                <TableCell className="px-3 py-2 font-mono text-xs">{a.code}</TableCell>
                <TableCell className="px-3 py-2 font-medium tabular-nums">{vnHhmm(a.startAt)}</TableCell>
                <TableCell className="px-3 py-2">{a.patientName}</TableCell>
                <TableCell className="px-3 py-2 tabular-nums whitespace-nowrap">
                  {a.patientPhone ? (
                    <a href={`tel:${a.patientPhone}`} className="hover:text-primary underline-offset-2 hover:underline">
                      {formatPhone(a.patientPhone)}
                    </a>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="px-3 py-2">
                  <AppointmentStatusBadge status={a.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Button asChild variant="outline" size="sm">
        <Link href={`${routePath.appointments}?date=${dayOff.date}`}>
          Mở lịch hẹn ngày {ddmmyyyy(dayOff.date)}
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </section>
  )
}
