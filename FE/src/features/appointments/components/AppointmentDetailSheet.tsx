'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CalendarCheck2, CalendarClock, CalendarX2, ExternalLink, MessageSquareText, Stethoscope, Ticket, UserRound, UserX } from 'lucide-react'
import { ErrorState } from '@/components/shared/ErrorState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { permissions } from '@/config/permissions'
import { routePath } from '@/config/route-path'
import { usePermissions } from '@/hooks/use-permissions'
import { formatPhone } from '@/lib/format'
import type { AppointmentDetailDto } from '@/types/clinic'
import { AllergyBadge, AppointmentStatusBadge, SourceBadge } from '@/features/clinic/components/ClinicBadges'
import { useAppointment } from '@/features/clinic/hooks/use-clinic'
import { cancelReasonLabels, genderLabels, messageKindLabels } from '@/features/clinic/lib/labels'
import { ddmmyyyy, isoWeekdayOf, vnHhmm, vnHhmmDate, weekdayLabel } from '@/features/clinic/lib/vn-time'
import { channelLabels } from '../lib/appointment-ui'
import { CancelAppointmentDialog } from './CancelAppointmentDialog'
import { CheckInDialog } from './CheckInDialog'
import { ConfirmAppointmentDialog } from './ConfirmAppointmentDialog'
import { RescheduleDialog } from './RescheduleDialog'

type AppointmentDetailSheetProps = {
  id: string | null
  onOpenChange: (open: boolean) => void
}

/** Ngăn kéo chi tiết lịch hẹn (SCR-04): thông tin, lịch sử thao tác, tin nhắn giả lập (FR-12), thao tác theo trạng thái và quyền. */
export function AppointmentDetailSheet({ id, onOpenChange }: AppointmentDetailSheetProps) {
  return (
    <Sheet open={!!id} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg">{id && <DetailBody key={id} id={id} />}</SheetContent>
    </Sheet>
  )
}

type ActionDialog = 'confirm' | 'reschedule' | 'cancel' | 'checkin' | null

function DetailBody({ id }: { id: string }) {
  const { can } = usePermissions()
  const detail = useAppointment(id)
  const [dialog, setDialog] = useState<ActionDialog>(null)
  const a = detail.data

  if (detail.isLoading)
    return (
      <>
        <SheetHeader className="border-b pr-12">
          <SheetTitle>Lịch hẹn</SheetTitle>
          <SheetDescription>Đang tải thông tin lịch hẹn…</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 p-4" aria-busy="true">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </>
    )

  if (detail.error || !a)
    return (
      <>
        <SheetHeader className="border-b pr-12">
          <SheetTitle>Lịch hẹn</SheetTitle>
          <SheetDescription>Không mở được lịch hẹn.</SheetDescription>
        </SheetHeader>
        <ErrorState error={detail.error} title="Không tải được lịch hẹn" onRetry={() => detail.refetch()} />
      </>
    )

  const actions = {
    checkIn: a.canCheckIn && can(permissions.queueTickets.create),
    confirm: a.canConfirm && can(permissions.appointments.update),
    reschedule: a.canReschedule && can(permissions.appointments.update),
    cancel: a.canCancel && can(permissions.appointments.cancel),
  }
  const hasActions = Object.values(actions).some(Boolean)

  return (
    <>
      <SheetHeader className="border-b pr-12">
        <div className="flex flex-wrap items-center gap-2">
          <AppointmentStatusBadge status={a.status} />
          <SourceBadge source={a.source} />
          {!a.patient && (
            <StatusBadge tone="warning" dot={false} icon={<UserX className="size-3" aria-hidden="true" />}>
              Chưa ghép hồ sơ
            </StatusBadge>
          )}
        </div>
        <SheetTitle className="text-lg tabular-nums">Lịch hẹn {a.code}</SheetTitle>
        <SheetDescription className="tabular-nums">
          {vnHhmm(a.startAt)}–{vnHhmm(a.endAt)} · {weekdayLabel(isoWeekdayOf(a.date))}, {ddmmyyyy(a.date)}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <PatientSection appointment={a} canViewPatient={can(permissions.patients.view)} />

        <Section title="Lịch khám" icon={Stethoscope}>
          <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-sm">
            <Row label="Bác sĩ">{a.doctorName}</Row>
            <Row label="Phòng">{a.room}</Row>
            <Row label="Giờ hẹn">
              <span className="tabular-nums">
                {vnHhmm(a.startAt)}–{vnHhmm(a.endAt)} {ddmmyyyy(a.date)}
              </span>
            </Row>
            <Row label="Dịch vụ dự kiến">{a.serviceName ?? '—'}</Row>
            <Row label="Lý do khám">{a.reason ?? '—'}</Row>
            <Row label="Ghi chú">{a.note ?? '—'}</Row>
            {a.status === 'DaHuy' && (
              <>
                <Row label="Lý do hủy">{a.cancelReason ? cancelReasonLabels[a.cancelReason] : '—'}</Row>
                {a.cancelNote && <Row label="Ghi chú hủy">{a.cancelNote}</Row>}
              </>
            )}
          </dl>
          {a.visitId && can(permissions.queueTickets.view) && (
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href={routePath.visitDetail(a.visitId)}>
                <ExternalLink aria-hidden="true" />
                Mở phiếu khám
              </Link>
            </Button>
          )}
        </Section>

        <Section title="Lịch sử" icon={CalendarClock}>
          <ol className="space-y-2 text-sm">
            <HistoryItem label="Tạo lịch" by={a.createdByName ?? (a.source === 'Online' ? 'Bệnh nhân đặt online' : null)} at={a.createdAt} />
            {a.confirmedAt && <HistoryItem label="Xác nhận" by={a.confirmedByName} at={a.confirmedAt} />}
            {a.cancelledAt && <HistoryItem label="Hủy lịch" by={a.cancelledByName} at={a.cancelledAt} />}
          </ol>
        </Section>

        <Section title="Tin nhắn giả lập" icon={MessageSquareText}>
          {a.messages.length === 0 ? (
            <p className="text-muted-foreground text-sm">Chưa có tin nào. Tin xác nhận được tạo khi lịch được xác nhận hoặc đổi giờ.</p>
          ) : (
            <ul className="space-y-2">
              {a.messages.map((m) => (
                <li key={m.id} className="bg-muted/40 rounded-lg border p-3">
                  <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                    <span className="text-foreground font-medium">
                      {messageKindLabels[m.kind]} · {channelLabels[m.channel]}
                    </span>
                    <span className="tabular-nums">
                      {formatPhone(m.phone)} · {vnHhmmDate(m.sentAt)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-pretty">{m.content}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="text-muted-foreground mt-2 text-xs">Tin mô phỏng để demo, không gửi ra ngoài.</p>
        </Section>
      </div>

      {hasActions && (
        <div className="bg-popover flex flex-wrap gap-2 border-t p-4">
          {actions.checkIn && (
            <Button variant="cta" onClick={() => setDialog('checkin')}>
              <Ticket aria-hidden="true" />
              Tiếp đón
            </Button>
          )}
          {actions.confirm && (
            <Button onClick={() => setDialog('confirm')}>
              <CalendarCheck2 aria-hidden="true" />
              Xác nhận
            </Button>
          )}
          {actions.reschedule && (
            <Button variant="outline" onClick={() => setDialog('reschedule')}>
              <CalendarClock aria-hidden="true" />
              Đổi giờ
            </Button>
          )}
          {actions.cancel && (
            <Button variant="destructive" className="sm:ml-auto" onClick={() => setDialog('cancel')}>
              <CalendarX2 aria-hidden="true" />
              Hủy lịch
            </Button>
          )}
        </div>
      )}

      <ConfirmAppointmentDialog appointment={a} open={dialog === 'confirm'} onOpenChange={(o) => setDialog(o ? 'confirm' : null)} />
      <RescheduleDialog appointment={a} open={dialog === 'reschedule'} onOpenChange={(o) => setDialog(o ? 'reschedule' : null)} />
      <CancelAppointmentDialog appointment={a} open={dialog === 'cancel'} onOpenChange={(o) => setDialog(o ? 'cancel' : null)} />
      <CheckInDialog appointment={a} open={dialog === 'checkin'} onOpenChange={(o) => setDialog(o ? 'checkin' : null)} />
    </>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof UserRound; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <h3 className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
        <Icon className="size-3.5" aria-hidden="true" />
        {title}
      </h3>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  )
}

function HistoryItem({ label, by, at }: { label: string; by: string | null; at: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" aria-hidden="true" />
      <span>
        <span className="font-medium">{label}</span>
        {by ? ` · ${by}` : ''} <span className="text-muted-foreground tabular-nums">· {vnHhmmDate(at)}</span>
      </span>
    </li>
  )
}

function PatientSection({ appointment: a, canViewPatient }: { appointment: AppointmentDetailDto; canViewPatient: boolean }) {
  if (a.patient) {
    const p = a.patient
    return (
      <Section title="Bệnh nhân" icon={UserRound}>
        <div className="space-y-1.5 rounded-lg border p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-base font-semibold">{p.fullName}</p>
            {canViewPatient && (
              <Button asChild variant="link" size="sm" className="h-auto p-0">
                <Link href={routePath.patientDetail(p.id)}>Xem hồ sơ</Link>
              </Button>
            )}
          </div>
          <p className="text-muted-foreground tabular-nums">
            {p.code} · {formatPhone(p.phone)}
          </p>
          <p className="text-muted-foreground tabular-nums">
            {genderLabels[p.gender]} · {ddmmyyyy(p.birthDate)} ({p.age} tuổi)
          </p>
          <AllergyBadge allergies={p.allergies} />
        </div>
      </Section>
    )
  }
  return (
    <Section title="Khách đặt online" icon={UserRound}>
      <div className="border-warning/40 space-y-1.5 rounded-lg border border-dashed p-3 text-sm">
        <p className="text-base font-semibold">{a.guestName ?? '—'}</p>
        <p className="text-muted-foreground tabular-nums">
          {formatPhone(a.guestPhone)} · Năm sinh {a.guestBirthYear ?? '—'}
          {a.guestGender ? ` · ${genderLabels[a.guestGender]}` : ''}
        </p>
        <p className="text-warning text-xs font-medium">
          Chưa ghép hồ sơ.
          {(a.canConfirm || a.canCheckIn) &&
            (a.suggestions.length > 0
              ? ` Có ${a.suggestions.length} hồ sơ cùng số điện thoại, chọn khi xác nhận hoặc tiếp đón.`
              : ' Chưa có hồ sơ cùng số điện thoại, có thể tạo mới khi xác nhận hoặc tiếp đón.')}
        </p>
      </div>
    </Section>
  )
}
