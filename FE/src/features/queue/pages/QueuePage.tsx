'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CalendarClock, Monitor, Search, UserPlus, UsersRound, X } from 'lucide-react'
import { ErrorState } from '@/components/shared/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { permissions } from '@/config/permissions'
import { routePath } from '@/config/route-path'
import { AppointmentStatusBadge, SourceBadge } from '@/features/clinic/components/ClinicBadges'
import { useQueueToday } from '@/features/clinic/hooks/use-clinic'
import { clinicRules } from '@/features/clinic/lib/rules'
import { ddmmyyyy, vnHhmm } from '@/features/clinic/lib/vn-time'
import { usePermissions } from '@/hooks/use-permissions'
import { normalizeVi } from '@/lib/normalize'
import { cn } from '@/lib/utils'
import type { AppointmentCardDto, QueueVisitDto } from '@/types/clinic'
import { CheckInDialog } from '../components/CheckInDialog'
import { DoctorQueueCard } from '../components/DoctorQueueCard'
import { MyQueuePanel } from '../components/MyQueuePanel'
import { CallDialog, CancelVisitDialog, TransferDialog } from '../components/QueueActionDialogs'

/**
 * Tiếp đón và hàng chờ (SCR-06, UC-05, UC-06). Lễ tân: lịch hẹn hôm nay chưa tiếp đón bên trái, hàng chờ từng bác sĩ bên phải.
 * Bác sĩ (tài khoản gắn bác sĩ): "Hàng chờ của tôi". `?doctorId=` (từ Tổng quan, UC-14 3a) chỉ hiện hàng chờ của một bác sĩ.
 * Tự làm mới mỗi 3 giây.
 */
export function QueuePage() {
  const { can } = usePermissions()
  const focusId = useSearchParams().get('doctorId')
  const queue = useQueueToday(3000)
  const [search, setSearch] = useState('')
  const [checkIn, setCheckIn] = useState<{ open: boolean; appointment: AppointmentCardDto | null }>({ open: false, appointment: null })
  const [transfer, setTransfer] = useState<QueueVisitDto | null>(null)
  const [cancel, setCancel] = useState<QueueVisitDto | null>(null)
  const [call, setCall] = useState<QueueVisitDto | null>(null)
  const canCreate = can(permissions.queueTickets.create)
  const data = queue.data
  const mine = data?.myDoctorId ? data.doctors.find((d) => d.id === data.myDoctorId) : undefined
  const focused = !mine && focusId ? data?.doctors.find((d) => d.id === focusId) : undefined
  const shownDoctors = focused ? [focused] : (data?.doctors ?? [])

  const pending = useMemo(() => {
    const term = normalizeVi(search)
    const list = data?.pendingAppointments ?? []
    return term ? list.filter((a) => normalizeVi(`${a.patientName} ${a.patientPhone} ${a.code} ${a.patientCode ?? ''}`).includes(term)) : list
  }, [data?.pendingAppointments, search])

  if (queue.isError && !data) return <ErrorState onRetry={() => queue.refetch()} />

  const header = (
    <PageHeader
      title={mine ? 'Hàng chờ của tôi' : 'Tiếp đón & hàng chờ'}
      icon={UsersRound}
      description={data ? `Hôm nay ${ddmmyyyy(data.date)} · tự cập nhật mỗi 3 giây` : 'Đang tải hàng chờ…'}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href={`${routePath.queueDisplay}?code=sanh2026`} target="_blank" rel="noopener noreferrer">
              <Monitor aria-hidden="true" />
              Màn hình sảnh
            </a>
          </Button>
          {canCreate && (
            <Button variant="cta" onClick={() => setCheckIn({ open: true, appointment: null })}>
              <UserPlus aria-hidden="true" />
              Tiếp đón mới
            </Button>
          )}
        </div>
      }
    />
  )

  return (
    <div className="space-y-4">
      {header}
      {!data ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : mine ? (
        <MyQueuePanel doctor={mine} onCall={setCall} />
      ) : (
        <div className={cn('grid gap-4', canCreate && !focused && 'xl:grid-cols-[22rem_minmax(0,1fr)]')}>
          {focused && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              Đang xem hàng chờ của <span className="text-foreground font-medium">{focused.displayName}</span>
              <Button variant="ghost" size="xs" asChild>
                <Link href={routePath.queue}>
                  <X aria-hidden="true" />
                  Xem tất cả
                </Link>
              </Button>
            </div>
          )}
          {canCreate && !focused && (
            <Card className="h-fit gap-3 p-3 xl:sticky xl:top-20">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">Lịch hẹn chưa tiếp đón</p>
                <span className="text-muted-foreground text-sm tabular-nums">{data.pendingAppointments.length}</span>
              </div>
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden="true" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tên, số điện thoại, mã lịch" className="pl-9" />
              </div>
              <ul className="max-h-[calc(100svh-16rem)] divide-y overflow-y-auto">
                {pending.map((a) => {
                  const late = queue.dataUpdatedAt > Date.parse(a.startAt) + clinicRules.lateToleranceMinutes * 60_000
                  return (
                    <li key={a.id} className="flex items-center gap-3 py-2">
                      <span className={cn('w-12 shrink-0 text-sm font-semibold tabular-nums', late && 'text-warning')}>{vnHhmm(a.startAt)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{a.patientName}</p>
                        <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="truncate">{a.doctorName}</span>
                          {a.status === 'ChoXacNhan' && <AppointmentStatusBadge status={a.status} />}
                          <SourceBadge source={a.source} />
                          {late && (
                            <span className="text-warning inline-flex items-center gap-0.5">
                              <CalendarClock className="size-3" aria-hidden="true" />
                              Muộn
                            </span>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setCheckIn({ open: true, appointment: a })}>
                        Tiếp đón
                      </Button>
                    </li>
                  )
                })}
                {pending.length === 0 && <li className="text-muted-foreground py-6 text-center text-sm">Không còn lịch hẹn chờ tiếp đón</li>}
              </ul>
            </Card>
          )}
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {shownDoctors.map((d) => (
              <DoctorQueueCard key={d.id} doctor={d} onTransfer={setTransfer} onCancel={setCancel} onCall={setCall} />
            ))}
            {data.doctors.length === 0 && <Card className="text-muted-foreground p-6 text-center text-sm">Hôm nay không có bác sĩ làm việc</Card>}
          </div>
        </div>
      )}

      <CheckInDialog
        open={checkIn.open}
        appointment={checkIn.appointment}
        doctors={data?.doctors ?? []}
        onClose={() => setCheckIn({ open: false, appointment: null })}
      />
      <TransferDialog visit={transfer} doctors={data?.doctors ?? []} onClose={() => setTransfer(null)} />
      <CancelVisitDialog visit={cancel} onClose={() => setCancel(null)} />
      <CallDialog visit={call} onClose={() => setCall(null)} />
    </div>
  )
}
