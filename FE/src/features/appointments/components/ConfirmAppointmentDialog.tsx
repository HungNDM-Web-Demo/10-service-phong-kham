'use client'

import { useState } from 'react'
import { CalendarCheck2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getErrorMessage, getFieldErrors } from '@/lib/api-error'
import { formatPhone } from '@/lib/format'
import type { AppointmentDetailDto, PatientBrief } from '@/types/clinic'
import { PatientPicker, type PatientChoice } from '@/features/clinic/components/PatientPicker'
import { useConfirmAppointment } from '@/features/clinic/hooks/use-clinic'
import { genderLabels } from '@/features/clinic/lib/labels'
import { problemCandidates, problemCode } from '@/features/clinic/lib/problem'
import { ddmmyyyy, vnHhmm, vnHhmmDate } from '@/features/clinic/lib/vn-time'
import { latestConfirmMessage } from '../lib/appointment-ui'
import { choiceInput, emptyChoice, forceChoice, guestDefaults, validateChoice } from '../lib/patient-choice'
import { DuplicateCandidates } from './DuplicateCandidates'

type ConfirmAppointmentDialogProps = {
  appointment: AppointmentDetailDto
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Thẻ thông tin khách đặt online chưa ghép hồ sơ */
export function GuestInfo({ appointment: a }: { appointment: AppointmentDetailDto }) {
  return (
    <div className="bg-muted/40 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 rounded-lg border p-3 text-sm">
      <span className="text-muted-foreground">Khách đặt</span>
      <span className="font-medium">{a.guestName ?? '—'}</span>
      <span className="text-muted-foreground">Số điện thoại</span>
      <span className="tabular-nums">{formatPhone(a.guestPhone)}</span>
      <span className="text-muted-foreground">Năm sinh</span>
      <span className="tabular-nums">
        {a.guestBirthYear ?? '—'}
        {a.guestGender ? ` · ${genderLabels[a.guestGender]}` : ''}
      </span>
      <span className="text-muted-foreground">Đặt lúc</span>
      <span className="tabular-nums">{vnHhmmDate(a.createdAt)}</span>
    </div>
  )
}

/**
 * Xác nhận lịch đặt online (UC-04 1a, FR-10, TC-14): gợi ý hồ sơ cùng số điện thoại (BR-14); lễ tân chọn hồ sơ có sẵn, tìm hồ sơ khác
 * hoặc tạo hồ sơ mới từ thông tin khách đã nhập.
 */
export function ConfirmAppointmentDialog({ appointment, open, onOpenChange }: ConfirmAppointmentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        {open && <ConfirmForm key={appointment.id} appointment={appointment} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function ConfirmForm({ appointment: a, onClose }: { appointment: AppointmentDetailDto; onClose: () => void }) {
  const [choice, setChoice] = useState<PatientChoice>(a.patient ? { patient: a.patient, newPatient: null } : emptyChoice)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [candidates, setCandidates] = useState<PatientBrief[]>([])
  const confirm = useConfirmAppointment()
  const pending = confirm.isPending
  const yearOnly = !!choice.newPatient && !!a.guestBirthYear && choice.newPatient.birthDate === `${a.guestBirthYear}-01-01`

  const submit = (patientChoice: PatientChoice = choice) => {
    const local = validateChoice(patientChoice)
    setErrors(local)
    if (Object.keys(local).length > 0) return
    confirm.mutate(
      { id: a.id, input: choiceInput(patientChoice) },
      {
        onSuccess: (next) => {
          const message = latestConfirmMessage(next)
          toast.success(`Đã xác nhận lịch ${next.code}`, {
            description: message ? `Tin xác nhận (giả lập): ${message.content}` : `Đã ghép hồ sơ ${next.patient?.code ?? ''}`,
            duration: 8000,
          })
          onClose()
        },
        onError: (err) => {
          if (problemCode(err) === 'TrungHoSo') {
            setCandidates(problemCandidates(err))
            toast.warning('Có thể trùng hồ sơ: chọn hồ sơ có sẵn hoặc vẫn tạo hồ sơ mới')
            return
          }
          setErrors(getFieldErrors(err))
          toast.error(getErrorMessage(err))
        },
      }
    )
  }

  return (
    <>
      <DialogHeader className="border-b px-6 pt-6 pb-4">
        <DialogTitle className="flex items-center gap-2">
          <CalendarCheck2 className="text-primary size-5" aria-hidden="true" />
          Xác nhận lịch {a.code}
        </DialogTitle>
        <DialogDescription>
          {vnHhmm(a.startAt)} {ddmmyyyy(a.date)} với {a.doctorName}, {a.room}. Chọn hồ sơ bệnh nhân để ghép với lịch đặt online.
        </DialogDescription>
      </DialogHeader>
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {!a.patient && <GuestInfo appointment={a} />}
        <PatientPicker
          value={choice}
          onChange={(v) => {
            setChoice(v)
            setCandidates([])
            setErrors({})
          }}
          defaults={guestDefaults(a)}
          suggestions={a.patient ? [] : a.suggestions}
          errors={errors}
          disabled={pending}
        />
        {yearOnly && (
          <p className="text-muted-foreground text-xs">
            Khách chỉ khai năm sinh {a.guestBirthYear}, ngày sinh đang tạm để 01/01. Sửa lại nếu biết ngày chính xác.
          </p>
        )}
        {!a.patient && !choice.patient && !choice.newPatient && a.suggestions.length === 0 && (
          <p className="text-muted-foreground text-sm">Chưa có hồ sơ nào cùng số điện thoại. Tìm hồ sơ khác hoặc thêm hồ sơ mới từ thông tin khách.</p>
        )}
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
      </div>
      <DialogFooter className="border-t px-6 py-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          Đóng
        </Button>
        <Button type="button" onClick={() => submit()} disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Xác nhận lịch
        </Button>
      </DialogFooter>
    </>
  )
}
