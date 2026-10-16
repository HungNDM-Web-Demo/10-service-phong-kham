'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarPlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage, getFieldErrors } from '@/lib/api-error'
import type { AppointmentDetailDto, PatientBrief, PatientDto } from '@/types/clinic'
import { PatientPicker, type PatientChoice } from '@/features/clinic/components/PatientPicker'
import {
  useAppointments,
  useCreateAppointment,
  useDoctorOptions,
  useDoctorSlots,
  useServiceOptions,
} from '@/features/clinic/hooks/use-clinic'
import { problemCandidates, problemCode } from '@/features/clinic/lib/problem'
import { vnHhmm, vnToday } from '@/features/clinic/lib/vn-time'
import { isActiveStatus, latestConfirmMessage, slotProblem } from '../lib/appointment-ui'
import { choiceInput, emptyChoice, forceChoice, validateChoice } from '../lib/patient-choice'
import { DoctorSelect } from './DoctorSelect'
import { DuplicateCandidates } from './DuplicateCandidates'
import { SlotPicker } from './SlotPicker'

export type CreateAppointmentTarget = {
  date: string
  doctorId?: string
  startAt?: string
  patient?: PatientBrief | PatientDto | null
  /** Tạo từ dòng nhắc tái khám (07 §3.12) */
  followUpId?: string | null
}

type CreateAppointmentDialogProps = {
  target: CreateAppointmentTarget | null
  onOpenChange: (open: boolean) => void
  onCreated?: (appointment: AppointmentDetailDto) => void
}

/** Hộp tạo lịch hẹn khi bệnh nhân gọi điện (UC-04 luồng chính, FR-09): lịch tạo ở trạng thái "Đã xác nhận" (BR-05). */
export function CreateAppointmentDialog({ target, onOpenChange, onCreated }: CreateAppointmentDialogProps) {
  const key = target ? `${target.date}|${target.doctorId ?? ''}|${target.startAt ?? ''}|${target.patient?.id ?? ''}` : 'closed'
  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {target && <CreateForm key={key} target={target} onClose={() => onOpenChange(false)} onCreated={onCreated} />}
      </DialogContent>
    </Dialog>
  )
}

const NO_SERVICE = '__none__'

function CreateForm({
  target,
  onClose,
  onCreated,
}: {
  target: CreateAppointmentTarget
  onClose: () => void
  onCreated?: (appointment: AppointmentDetailDto) => void
}) {
  const today = vnToday()
  const [choice, setChoice] = useState<PatientChoice>(target.patient ? { patient: target.patient, newPatient: null } : emptyChoice)
  const [doctorId, setDoctorId] = useState(target.doctorId ?? '')
  const [date, setDate] = useState(target.date < today ? today : target.date)
  const [startAt, setStartAt] = useState<string | null>(target.startAt ?? null)
  const [serviceId, setServiceId] = useState('')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [candidates, setCandidates] = useState<PatientBrief[]>([])

  const doctors = useDoctorOptions()
  const services = useServiceOptions()
  const slots = useDoctorSlots(doctorId || null, date)
  const create = useCreateAppointment()
  const doctor = doctors.data?.find((d) => d.id === doctorId)

  // E3: bệnh nhân đã có lịch khác cùng ngày thì cảnh báo, vẫn cho lưu
  const patientId = choice.patient?.id
  const sameDay = useAppointments({ patientId, from: date, to: date, page: 1, pageSize: 10 }, !!patientId && !!date)
  const otherAppointments = (sameDay.data?.items ?? []).filter((a) => isActiveStatus(a.status))

  // Dịch vụ dự kiến: cùng chuyên khoa với bác sĩ hoặc dùng chung
  const serviceOptions = useMemo(
    () => (services.data ?? []).filter((s) => !doctor || s.specialtyId === null || s.specialtyId === doctor.specialtyId),
    [services.data, doctor]
  )

  const clearError = (...keys: string[]) =>
    setErrors((e) => {
      if (!keys.some((k) => k in e)) return e
      const next = { ...e }
      for (const k of keys) delete next[k]
      return next
    })

  const submit = (patientChoice: PatientChoice = choice) => {
    const local: Record<string, string> = { ...validateChoice(patientChoice) }
    if (!doctorId) local.doctorId = 'Chọn bác sĩ'
    if (!date) local.date = 'Chọn ngày hẹn'
    if (!startAt) local.startAt = 'Chọn khung giờ'
    if (reason.length > 300) local.reason = 'Lý do khám tối đa 300 ký tự'
    if (note.length > 500) local.note = 'Ghi chú tối đa 500 ký tự'
    setErrors(local)
    if (Object.keys(local).length > 0) return

    create.mutate(
      {
        ...choiceInput(patientChoice),
        doctorId,
        startAt: startAt!,
        serviceId: serviceId || null,
        reason: reason.trim() || null,
        note: note.trim() || null,
        followUpId: target.followUpId ?? null,
      },
      {
        onSuccess: (a) => {
          const message = latestConfirmMessage(a)
          toast.success(`Đã tạo lịch hẹn ${a.code}`, {
            description: message ? `Tin xác nhận (giả lập): ${message.content}` : `${vnHhmm(a.startAt)} · ${a.doctorName}`,
            duration: 8000,
          })
          onCreated?.(a)
          onClose()
        },
        onError: (err) => {
          if (problemCode(err) === 'TrungHoSo') {
            setCandidates(problemCandidates(err))
            toast.warning('Có thể trùng hồ sơ: chọn hồ sơ có sẵn hoặc vẫn tạo hồ sơ mới')
            return
          }
          const slotMessage = slotProblem(err)
          if (slotMessage) {
            setErrors({ startAt: slotMessage })
            setStartAt(null)
            void slots.refetch()
            toast.error(slotMessage)
            return
          }
          setErrors(getFieldErrors(err))
          toast.error(getErrorMessage(err))
        },
      }
    )
  }

  const pending = create.isPending

  return (
    <>
      <DialogHeader className="border-b px-6 pt-6 pb-4">
        <DialogTitle className="flex items-center gap-2">
          <CalendarPlus className="text-primary size-5" aria-hidden="true" />
          Tạo lịch hẹn
        </DialogTitle>
        <DialogDescription>Lịch do lễ tân tạo được xác nhận ngay và gửi tin xác nhận (giả lập) cho bệnh nhân.</DialogDescription>
      </DialogHeader>

      <form
        id="create-appointment-form"
        className="flex-1 space-y-5 overflow-y-auto px-6 py-5"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        noValidate
      >
        <section className="space-y-2" aria-label="Bệnh nhân">
          <PatientPicker
            value={choice}
            onChange={(v) => {
              setChoice(v)
              setCandidates([])
              clearError('patientId', 'newPatient.fullName', 'newPatient.phone', 'newPatient.birthDate')
            }}
            errors={errors}
            disabled={pending}
          />
          {candidates.length > 0 && choice.newPatient && (
            <DuplicateCandidates
              candidates={candidates}
              pending={pending}
              onUse={(p) => {
                setChoice({ patient: p, newPatient: null })
                setCandidates([])
              }}
              onForce={() => {
                const next = forceChoice(choice)
                setChoice(next)
                setCandidates([])
                submit(next)
              }}
            />
          )}
          {otherAppointments.length > 0 && (
            <p role="status" className="bg-warning/10 text-warning flex items-start gap-2 rounded-md px-3 py-2 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                Bệnh nhân đã có lịch {otherAppointments.map((a) => `${vnHhmm(a.startAt)} với ${a.doctorName}`).join(', ')} trong ngày này. Vẫn có thể lưu
                thêm lịch.
              </span>
            </p>
          )}
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Bác sĩ" required error={errors.doctorId}>
            <DoctorSelect
              doctors={doctors.data}
              value={doctorId}
              disabled={pending}
              onChange={(v) => {
                setDoctorId(v)
                setStartAt(null)
                setServiceId('')
                clearError('doctorId', 'startAt')
              }}
            />
          </FormField>
          <FormField label="Ngày hẹn" required error={errors.date}>
            <Input
              type="date"
              value={date}
              min={today}
              disabled={pending}
              onChange={(e) => {
                setDate(e.target.value)
                setStartAt(null)
                clearError('date', 'startAt')
              }}
            />
          </FormField>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-foreground mb-1.5 text-sm font-medium">
            Khung giờ
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          </legend>
          <SlotPicker
            doctorId={doctorId}
            date={date}
            value={startAt}
            disabled={pending}
            error={errors.startAt}
            onChange={(v) => {
              setStartAt(v)
              clearError('startAt')
            }}
          />
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Dịch vụ dự kiến"
            htmlFor="create-appointment-service"
            error={errors.serviceId}
            hint={doctor ? `Dịch vụ của ${doctor.specialtyName} và dùng chung` : undefined}
          >
            <Select value={serviceId || NO_SERVICE} onValueChange={(v) => setServiceId(v === NO_SERVICE ? '' : v)} disabled={pending}>
              <SelectTrigger id="create-appointment-service">
                <SelectValue placeholder="Không chọn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SERVICE}>Không chọn</SelectItem>
                {serviceOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Lý do khám" error={errors.reason}>
            <Input value={reason} maxLength={300} disabled={pending} placeholder="Đau răng hàm dưới, ho kéo dài…" onChange={(e) => setReason(e.target.value)} />
          </FormField>
        </div>

        <FormField label="Ghi chú" error={errors.note}>
          <Textarea rows={2} value={note} maxLength={500} disabled={pending} onChange={(e) => setNote(e.target.value)} />
        </FormField>
      </form>

      <DialogFooter className="border-t px-6 py-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          Đóng
        </Button>
        <Button type="submit" form="create-appointment-form" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Lưu lịch hẹn
        </Button>
      </DialogFooter>
    </>
  )
}
