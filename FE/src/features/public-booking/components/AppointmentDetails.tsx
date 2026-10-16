import { CalendarDays, DoorOpen, MapPin, Phone, Stethoscope, UserRound, type LucideIcon } from 'lucide-react'
import type { PublicAppointmentDto } from '@/types/clinic'
import { vnHhmm } from '@/features/clinic/lib/vn-time'
import { fullDayLabel, mapsUrl, telHref } from '../lib/booking'

/** Thông tin một lịch hẹn cho bệnh nhân: giờ, bác sĩ, phòng, người khám (số điện thoại che giữa, NFR-04), địa chỉ, hotline. */
export function AppointmentDetails({ appointment: a }: { appointment: PublicAppointmentDto }) {
  return (
    <dl className="space-y-3 text-sm">
      <Row icon={CalendarDays} label="Thời gian">
        <span className="font-semibold tabular-nums">
          {vnHhmm(a.startAt)} – {vnHhmm(a.endAt)}
        </span>
        <span className="block">{fullDayLabel(a.date)}</span>
      </Row>
      <Row icon={Stethoscope} label="Bác sĩ">
        <span className="font-medium">{a.doctorName}</span>
        {a.specialtyName && <span className="text-muted-foreground block">{a.specialtyName}</span>}
      </Row>
      <Row icon={DoorOpen} label="Phòng khám">
        {a.room}
      </Row>
      <Row icon={UserRound} label="Người khám">
        {a.patientName}
        <span className="text-muted-foreground block tabular-nums">{a.phoneMasked}</span>
      </Row>
      <Row icon={MapPin} label="Địa chỉ">
        <span className="font-medium">{a.clinicName}</span>
        <span className="block">{a.clinicAddress}</span>
        <a
          href={mapsUrl(a.clinicAddress)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary mt-0.5 inline-block font-medium underline-offset-2 hover:underline"
        >
          Xem chỉ đường
        </a>
      </Row>
      {a.hotline && (
        <Row icon={Phone} label="Hotline">
          <a href={telHref(a.hotline)} className="text-primary font-semibold tabular-nums underline-offset-2 hover:underline">
            {a.hotline}
          </a>
        </Row>
      )}
    </dl>
  )
}

function Row({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="relative min-h-8 pl-11">
      <dt className="text-muted-foreground text-xs">
        <span className="bg-muted absolute top-0 left-0 flex size-8 items-center justify-center rounded-full" aria-hidden="true">
          <Icon className="size-4" />
        </span>
        {label}
      </dt>
      <dd className="mt-0.5 break-words">{children}</dd>
    </div>
  )
}
