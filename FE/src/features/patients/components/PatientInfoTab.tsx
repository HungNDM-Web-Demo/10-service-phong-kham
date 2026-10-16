import { CalendarClock } from 'lucide-react'
import { formatPhone } from '@/lib/format'
import type { AppointmentBrief, PatientDto } from '@/types/clinic'
import { AppointmentStatusBadge } from '@/features/clinic/components/ClinicBadges'
import { genderLabels } from '@/features/clinic/lib/labels'
import { ddmmyyyy, vnDdMmYyyy, vnHhmm } from '@/features/clinic/lib/vn-time'

/** Tab Thông tin (UC-07 1a): thông tin hành chính, tiền sử, lịch hẹn sắp tới. */
export function PatientInfoTab({
  patient: p,
  upcoming,
}: {
  patient: PatientDto
  upcoming: AppointmentBrief[]
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section
        className="bg-card rounded-xl border p-4 shadow-xs sm:p-5"
        aria-labelledby="info-admin"
      >
        <h2 id="info-admin" className="mb-4 text-base font-semibold">
          Thông tin hành chính
        </h2>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Item label="Mã bệnh nhân" value={p.code} />
          <Item label="Họ tên" value={p.fullName} />
          <Item label="Ngày sinh" value={`${ddmmyyyy(p.birthDate)} (${p.age} tuổi)`} />
          <Item label="Giới tính" value={genderLabels[p.gender]} />
          <Item label="Số điện thoại" value={formatPhone(p.phone)} />
          <Item label="Người liên hệ" value={p.contactPerson} />
          <Item label="Địa chỉ" value={p.address} wide />
          <Item
            label="Tiền sử dị ứng"
            value={p.allergies}
            wide
            danger={!!p.allergies}
            empty="Không ghi nhận"
          />
          <Item label="Tiền sử bệnh" value={p.medicalHistory} wide empty="Không ghi nhận" />
          <Item label="Ghi chú" value={p.note} wide />
          <Item label="Ngày tạo hồ sơ" value={vnDdMmYyyy(p.createdAt)} />
        </dl>
      </section>

      <section
        className="bg-card rounded-xl border p-4 shadow-xs sm:p-5"
        aria-labelledby="info-upcoming"
      >
        <h2 id="info-upcoming" className="mb-4 flex items-center gap-2 text-base font-semibold">
          <CalendarClock className="text-primary size-4" aria-hidden="true" />
          Lịch hẹn sắp tới
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground text-sm">Chưa có lịch hẹn sắp tới.</p>
        ) : (
          <ul className="space-y-2.5">
            {upcoming.map((a) => (
              <li key={a.id} className="rounded-lg border px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium tabular-nums">
                    {vnHhmm(a.startAt)} · {ddmmyyyy(a.date)}
                  </span>
                  <AppointmentStatusBadge status={a.status} />
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  {a.doctorName} · <span className="tabular-nums">{a.code}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Item({
  label,
  value,
  wide,
  danger,
  empty = '—',
}: {
  label: string
  value: string | null
  wide?: boolean
  danger?: boolean
  empty?: string
}) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd
        className={`mt-0.5 text-sm whitespace-pre-line ${danger ? 'text-destructive font-semibold' : value ? '' : 'text-muted-foreground'}`}
      >
        {value || empty}
      </dd>
    </div>
  )
}
