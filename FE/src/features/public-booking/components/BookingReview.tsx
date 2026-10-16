import { CalendarDays, Info, MessageSquareText, Pencil, Stethoscope, UserRound, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPhone } from '@/lib/format'
import { genderLabels } from '@/features/clinic/lib/labels'
import { slotLabel, type PatientInfo } from '../lib/booking'

type BookingReviewProps = {
  specialtyName: string
  /** null = "Bác sĩ bất kỳ" */
  doctor: { displayName: string; room: string } | null
  startAt: string
  patient: PatientInfo
  onEdit: (step: number) => void
}

/** Bước 4: xem lại toàn bộ lựa chọn trước khi đặt (UC-03 bước 6); mỗi mục có nút sửa quay về đúng bước. */
export function BookingReview({ specialtyName, doctor, startAt, patient, onEdit }: BookingReviewProps) {
  const reason = patient.reason.trim()
  return (
    <div className="space-y-4">
      <dl className="bg-card divide-y rounded-xl border">
        <ReviewRow icon={Stethoscope} label="Bác sĩ" onEdit={() => onEdit(0)} editLabel="Sửa bác sĩ">
          <span className="font-medium">{doctor ? doctor.displayName : 'Bác sĩ bất kỳ'}</span>
          <span className="text-muted-foreground block">
            {specialtyName}
            {doctor ? ` · ${doctor.room}` : ' · phòng khám xếp bác sĩ còn trống'}
          </span>
        </ReviewRow>
        <ReviewRow icon={CalendarDays} label="Thời gian" onEdit={() => onEdit(1)} editLabel="Sửa ngày giờ">
          <span className="font-medium tabular-nums">{slotLabel(startAt)}</span>
        </ReviewRow>
        <ReviewRow icon={UserRound} label="Người khám" onEdit={() => onEdit(2)} editLabel="Sửa thông tin người khám">
          <span className="font-medium">{patient.fullName.trim()}</span>
          <span className="text-muted-foreground block tabular-nums">
            {patient.gender ? genderLabels[patient.gender] : ''} · Sinh năm {patient.birthYear} · {formatPhone(patient.phone)}
          </span>
        </ReviewRow>
        {reason && (
          <ReviewRow icon={MessageSquareText} label="Lý do khám" onEdit={() => onEdit(2)} editLabel="Sửa lý do khám">
            <span className="whitespace-pre-line">{reason}</span>
          </ReviewRow>
        )}
      </dl>

      <p className="bg-info/10 text-info flex gap-2 rounded-xl px-3.5 py-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Lịch đặt online ở trạng thái <b>Chờ xác nhận</b>. Phòng khám sẽ gọi xác nhận trong giờ làm việc, vui lòng để ý điện thoại.
        </span>
      </p>
    </div>
  )
}

function ReviewRow({
  icon: Icon,
  label,
  onEdit,
  editLabel,
  children,
}: {
  icon: LucideIcon
  label: string
  onEdit: () => void
  editLabel: string
  children: React.ReactNode
}) {
  return (
    <div className="relative py-3.5 pr-14 pl-14 text-sm">
      <dt className="text-muted-foreground text-xs">
        <span className="bg-primary/10 text-primary absolute top-3.5 left-3.5 flex size-8 items-center justify-center rounded-full" aria-hidden="true">
          <Icon className="size-4" />
        </span>
        {label}
      </dt>
      <dd className="mt-0.5 break-words">
        {children}
        <Button variant="ghost" size="icon-sm" className="absolute top-3 right-3" onClick={onEdit} aria-label={editLabel}>
          <Pencil aria-hidden="true" />
        </Button>
      </dd>
    </div>
  )
}
