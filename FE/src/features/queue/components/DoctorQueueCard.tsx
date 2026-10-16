'use client'

import Link from 'next/link'
import { CornerDownLeft, Megaphone, Stethoscope } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { permissions } from '@/config/permissions'
import { routePath } from '@/config/route-path'
import { useCallNext, useReturned } from '@/features/clinic/hooks/use-clinic'
import { vnHhmm } from '@/features/clinic/lib/vn-time'
import { usePermissions } from '@/hooks/use-permissions'
import { getErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import type { QueueDoctorDto, QueueVisitDto } from '@/types/clinic'
import { QueueVisitRow, type RowAction } from './QueueVisitRow'

type DoctorQueueCardProps = {
  doctor: QueueDoctorDto
  onTransfer: (v: QueueVisitDto) => void
  onCancel: (v: QueueVisitDto) => void
  onCall: (v: QueueVisitDto) => void
}

/** Hàng chờ một bác sĩ trên màn lễ tân (SCR-06): đang khám, hàng chờ theo thứ tự gọi, chờ kết quả, số đã khám. */
export function DoctorQueueCard({ doctor, onTransfer, onCancel, onCall }: DoctorQueueCardProps) {
  const { can } = usePermissions()
  const returned = useReturned()
  const callNext = useCallNext()
  const canUpdate = can(permissions.queueTickets.update)
  const canCall = can(permissions.queueTickets.call)
  const canPrint = can(permissions.queueTickets.view)
  const current = doctor.current

  const actionsFor = (v: QueueVisitDto): RowAction[] => [
    ...(canCall && !current ? [{ label: 'Gọi người này', onSelect: () => onCall(v) }] : []),
    ...(canPrint ? [{ label: 'In phiếu số', onSelect: () => window.open(`${routePath.queueTicket(v.id)}?print=1`, '_blank', 'noopener') }] : []),
    ...(canUpdate ? [{ label: 'Chuyển bác sĩ', onSelect: () => onTransfer(v) }] : []),
    ...(canUpdate ? [{ label: 'Hủy lượt', onSelect: () => onCancel(v), destructive: true }] : []),
  ]

  return (
    <Card className={cn('flex flex-col gap-0 p-0', !doctor.working && !current && doctor.waiting.length === 0 && 'opacity-60')}>
      <div className="flex items-start justify-between gap-2 border-b p-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{doctor.displayName}</p>
          <p className="text-muted-foreground truncate text-xs">
            {doctor.room} · {doctor.specialtyName}
          </p>
        </div>
        <div className="text-right text-xs">
          <p className="text-muted-foreground">
            Đã khám <b className="text-foreground tabular-nums">{doctor.doneCount}</b>
          </p>
          {doctor.avgWaitMinutes !== null && <p className="text-muted-foreground tabular-nums">Chờ TB {doctor.avgWaitMinutes} phút</p>}
        </div>
      </div>

      {!doctor.working && <p className="text-muted-foreground border-b px-3 py-2 text-xs">{doctor.offReason ?? 'Không làm việc hôm nay'}</p>}

      <div className="border-b px-3 py-2">
        {current ? (
          <div className="bg-primary/8 flex items-center gap-3 rounded-md p-2">
            <Stethoscope className="text-primary size-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-primary text-xs font-medium">Đang khám · từ {current.startedAt ? vnHhmm(current.startedAt) : ''}</p>
              <Link href={routePath.visitDetail(current.id)} className="block truncate text-sm font-semibold hover:underline">
                {current.ticket} · {current.patientName}
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <p className="text-muted-foreground text-sm">Chưa gọi bệnh nhân</p>
            {canCall && doctor.working && doctor.waiting.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                disabled={callNext.isPending}
                onClick={() =>
                  callNext.mutate(doctor.id, {
                    onSuccess: (r) => (r.visit ? toast.success(`Đã gọi số ${r.visit.ticket}`) : toast.info('Không còn bệnh nhân chờ')),
                    onError: (e) => toast.error(getErrorMessage(e)),
                  })
                }
              >
                <Megaphone aria-hidden="true" />
                Gọi kế tiếp
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 px-3">
        <p className="text-muted-foreground pt-2 text-xs font-medium">Hàng chờ ({doctor.waiting.length})</p>
        {doctor.waiting.length === 0 ? (
          <p className="text-muted-foreground py-3 text-sm">Không còn bệnh nhân chờ</p>
        ) : (
          <ul className="divide-y">
            {doctor.waiting.map((v, i) => (
              <QueueVisitRow key={v.id} visit={v} position={i + 1} actions={actionsFor(v)} />
            ))}
          </ul>
        )}
      </div>

      {doctor.awaiting.length > 0 && (
        <div className="border-t px-3 pb-2">
          <p className="text-muted-foreground pt-2 text-xs font-medium">Chờ kết quả ({doctor.awaiting.length})</p>
          <ul className="divide-y">
            {doctor.awaiting.map((v) => (
              <QueueVisitRow
                key={v.id}
                visit={v}
                actions={canUpdate ? [{ label: 'Hủy lượt', onSelect: () => onCancel(v), destructive: true }] : []}
                primaryAction={
                  canUpdate ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={returned.isPending}
                      onClick={() =>
                        returned.mutate(v.id, {
                          onSuccess: () => toast.success(`${v.patientName} đã quay lại, xếp đầu hàng chờ`),
                          onError: (e) => toast.error(getErrorMessage(e)),
                        })
                      }
                    >
                      <CornerDownLeft aria-hidden="true" />
                      Đã quay lại
                    </Button>
                  ) : undefined
                }
              />
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
