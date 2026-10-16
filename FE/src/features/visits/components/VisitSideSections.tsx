'use client'

import Link from 'next/link'
import { CalendarClock, History, Phone } from 'lucide-react'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { routePath } from '@/config/route-path'
import { AllergyBadge, FollowUpBadge, PriorityBadge, VisitStatusBadge } from '@/features/clinic/components/ClinicBadges'
import { useVisits } from '@/features/clinic/hooks/use-clinic'
import { genderLabels } from '@/features/clinic/lib/labels'
import { addDaysKey, ddmmyyyy, vnHhmm, vnToday } from '@/features/clinic/lib/vn-time'
import { formatPhone, formatVnd } from '@/lib/format'
import type { VisitDetailDto } from '@/types/clinic'
import type { VisitForm } from '../lib/visit-form'
import { SectionCard } from './ExamSections'

const PRESETS: { label: string; days: number }[] = [
  { label: '7 ngày', days: 7 },
  { label: '14 ngày', days: 14 },
  { label: '1 tháng', days: 30 },
  { label: '3 tháng', days: 90 },
]

/** Lời dặn, hẹn tái khám sau 7, 14 ngày, 1, 3 tháng hoặc ngày cụ thể (UC-08 bước 6). */
export function AdviceSection({
  form,
  set,
  errors,
  readOnly,
}: {
  form: VisitForm
  set: (patch: Partial<VisitForm>) => void
  errors: Record<string, string>
  readOnly: boolean
}) {
  const today = vnToday()
  return (
    <SectionCard title="Lời dặn và hẹn tái khám" description="Để trống ngày hẹn nếu không cần tái khám">
      <FormField label="Lời dặn" error={errors.advice}>
        <Textarea rows={2} value={form.advice} maxLength={1000} disabled={readOnly} onChange={(e) => set({ advice: e.target.value })} />
      </FormField>
      <div className="flex flex-wrap items-end gap-2">
        {!readOnly &&
          PRESETS.map((p) => (
            <Button key={p.days} type="button" size="sm" variant={form.followUpDate === addDaysKey(today, p.days) ? 'default' : 'outline'} onClick={() => set({ followUpDate: addDaysKey(today, p.days) })}>
              {p.label}
            </Button>
          ))}
        <FormField label="Ngày hẹn" error={errors.followUpDate} className="w-44">
          <Input type="date" min={addDaysKey(today, 1)} value={form.followUpDate} disabled={readOnly} onChange={(e) => set({ followUpDate: e.target.value })} />
        </FormField>
        {form.followUpDate && !readOnly && (
          <Button type="button" variant="ghost" size="sm" onClick={() => set({ followUpDate: '', followUpNote: '' })}>
            Không hẹn
          </Button>
        )}
      </div>
      {form.followUpDate && (
        <FormField label="Nội dung tái khám" error={errors.followUpNote}>
          <Input value={form.followUpNote} maxLength={300} disabled={readOnly} onChange={(e) => set({ followUpNote: e.target.value })} placeholder="Kiểm tra sau trám răng…" />
        </FormField>
      )}
    </SectionCard>
  )
}

/** Cột trái phiếu khám (UC-08 bước 1): thông tin bệnh nhân, dị ứng màu đỏ, các lượt khám trước. */
export function PatientPanel({ visit }: { visit: VisitDetailDto }) {
  const p = visit.patient
  const history = useVisits({ patientId: p.id, withMedical: visit.canMedical, pageSize: 8 }, true)
  const previous = (history.data?.items ?? []).filter((v) => v.id !== visit.id)
  return (
    <div className="space-y-4">
      <Card className="gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={routePath.patientDetail(p.id)} className="block truncate text-lg font-semibold hover:underline">
              {p.fullName}
            </Link>
            <p className="text-muted-foreground text-sm tabular-nums">
              {p.code} · {p.age} tuổi · {genderLabels[p.gender]}
            </p>
          </div>
          <VisitStatusBadge status={visit.status} />
        </div>
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm tabular-nums">
          <Phone className="size-3.5" aria-hidden="true" />
          {formatPhone(p.phone)}
        </p>
        <AllergyBadge allergies={p.allergies} />
        {p.medicalHistory && <p className="text-sm">Tiền sử: {p.medicalHistory}</p>}
        <div className="flex flex-wrap gap-1.5">
          {visit.isPriority && <PriorityBadge reason={visit.priorityReason} />}
          {visit.isFollowUp && <FollowUpBadge />}
        </div>
        <dl className="text-muted-foreground grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t pt-2 text-xs">
          <dt>Số thứ tự</dt>
          <dd className="text-foreground tabular-nums">{visit.ticket}</dd>
          <dt>Bác sĩ</dt>
          <dd className="text-foreground">{visit.doctorName}</dd>
          <dt>Tiếp đón</dt>
          <dd className="text-foreground tabular-nums">
            {vnHhmm(visit.checkedInAt)} {ddmmyyyy(visit.date)}
          </dd>
          {visit.appointmentCode && (
            <>
              <dt>Lịch hẹn</dt>
              <dd className="text-foreground tabular-nums">{visit.appointmentCode}</dd>
            </>
          )}
          {visit.reason && (
            <>
              <dt>Lý do khám</dt>
              <dd className="text-foreground">{visit.reason}</dd>
            </>
          )}
          {visit.invoice && (
            <>
              <dt>Thanh toán</dt>
              <dd className="text-foreground tabular-nums">
                {visit.invoice.code} · {formatVnd(visit.invoice.total)}
              </dd>
            </>
          )}
        </dl>
      </Card>

      <Card className="gap-2 p-4">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <History className="size-4" aria-hidden="true" />
          Lượt khám trước
        </p>
        {history.isLoading ? (
          <Skeleton className="h-24" />
        ) : previous.length === 0 ? (
          <p className="text-muted-foreground text-sm">Lần khám đầu tiên.</p>
        ) : (
          <ul className="divide-y">
            {previous.map((v) => (
              <li key={v.id} className="space-y-0.5 py-2 text-sm">
                <Link href={routePath.visitDetail(v.id)} className="flex items-center gap-1.5 font-medium hover:underline">
                  <CalendarClock className="text-muted-foreground size-3.5" aria-hidden="true" />
                  {ddmmyyyy(v.date)} · {v.doctorName}
                </Link>
                {v.diagnoses && <p className="text-muted-foreground line-clamp-2 text-xs">{v.diagnoses}</p>}
                {v.services && <p className="text-muted-foreground line-clamp-1 text-xs">Dịch vụ: {v.services}</p>}
                {v.prescription && <p className="text-muted-foreground line-clamp-1 text-xs">Đơn: {v.prescription}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
