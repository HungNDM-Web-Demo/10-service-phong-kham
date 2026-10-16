'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Ticket } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { routePath } from '@/config/route-path'
import { getErrorMessage, getFieldErrors } from '@/lib/api-error'
import { formatPhone } from '@/lib/format'
import type { AppointmentDetailDto, PatientBrief } from '@/types/clinic'
import { AllergyBadge } from '@/features/clinic/components/ClinicBadges'
import { PatientPicker, type PatientChoice } from '@/features/clinic/components/PatientPicker'
import { useCheckIn } from '@/features/clinic/hooks/use-clinic'
import { problemCandidates, problemCode, problemVisitId } from '@/features/clinic/lib/problem'
import { vnHhmm } from '@/features/clinic/lib/vn-time'
import { choiceInput, emptyChoice, forceChoice, guestDefaults, validateChoice } from '../lib/patient-choice'
import { GuestInfo } from './ConfirmAppointmentDialog'
import { DuplicateCandidates } from './DuplicateCandidates'

type CheckInDialogProps = {
  appointment: AppointmentDetailDto
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Tiếp đón từ lịch hẹn hôm nay (UC-05 bước 2–4, BR-07): tạo lượt "Chờ khám", cấp số thứ tự; lịch "Chờ xác nhận" coi như đã xác nhận.
 * Lịch online chưa ghép hồ sơ phải chọn hoặc tạo hồ sơ trước (07 §3.3). Ưu tiên theo tuổi do máy chủ tự bật (BR-10).
 */
export function CheckInDialog({ appointment, open, onOpenChange }: CheckInDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        {open && <CheckInForm key={appointment.id} appointment={appointment} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function CheckInForm({ appointment: a, onClose }: { appointment: AppointmentDetailDto; onClose: () => void }) {
  const router = useRouter()
  const [choice, setChoice] = useState<PatientChoice>(a.patient ? { patient: a.patient, newPatient: null } : emptyChoice)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [candidates, setCandidates] = useState<PatientBrief[]>([])
  const checkIn = useCheckIn()
  const pending = checkIn.isPending

  const submit = (patientChoice: PatientChoice = choice) => {
    const local = validateChoice(patientChoice)
    setErrors(local)
    if (Object.keys(local).length > 0) return
    const patient = a.patient ? { patientId: a.patient.id, newPatient: null } : choiceInput(patientChoice)
    checkIn.mutate(
      { appointmentId: a.id, doctorId: a.doctorId, isPriority: false, ...patient },
      {
        onSuccess: (result) => {
          toast.success(`Đã cấp số ${result.visit.ticket}`, {
            description: `${result.visit.patientName} · ${result.room} · ${result.waitingAhead > 0 ? `${result.waitingAhead} người chờ trước` : 'Không có ai chờ trước'}`,
            duration: 10000,
            action: { label: 'Mở hàng chờ', onClick: () => router.push(routePath.queue) },
          })
          onClose()
        },
        onError: (err) => {
          const code = problemCode(err)
          if (code === 'TrungHoSo') {
            setCandidates(problemCandidates(err))
            toast.warning('Có thể trùng hồ sơ: chọn hồ sơ có sẵn hoặc vẫn tạo hồ sơ mới')
            return
          }
          if (code === 'BenhNhanDangKham') {
            const visitId = problemVisitId(err)
            toast.error(getErrorMessage(err), {
              action: visitId ? { label: 'Xem lượt khám', onClick: () => router.push(routePath.visitDetail(visitId)) } : undefined,
            })
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
          <Ticket className="text-primary size-5" aria-hidden="true" />
          Tiếp đón lịch {a.code}
        </DialogTitle>
        <DialogDescription>
          Hẹn {vnHhmm(a.startAt)} với {a.doctorName}, {a.room}. Hệ thống tạo lượt khám và cấp số thứ tự.
        </DialogDescription>
      </DialogHeader>
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {a.patient ? (
          <div className="bg-muted/40 space-y-1 rounded-lg border p-3 text-sm">
            <p className="font-semibold">{a.patient.fullName}</p>
            <p className="text-muted-foreground tabular-nums">
              {a.patient.code} · {formatPhone(a.patient.phone)} · {a.patient.age} tuổi
            </p>
            <AllergyBadge allergies={a.patient.allergies} />
          </div>
        ) : (
          <>
            <GuestInfo appointment={a} />
            <PatientPicker
              value={choice}
              onChange={(v) => {
                setChoice(v)
                setCandidates([])
                setErrors({})
              }}
              defaults={guestDefaults(a)}
              suggestions={a.suggestions}
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
          </>
        )}
        {a.status === 'ChoXacNhan' && (
          <p className="bg-info/10 text-info rounded-md px-3 py-2 text-sm">Lịch đang chờ xác nhận sẽ được coi như đã xác nhận khi tiếp đón.</p>
        )}
      </div>
      <DialogFooter className="border-t px-6 py-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          Đóng
        </Button>
        <Button type="button" variant="cta" onClick={() => submit()} disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Tiếp đón và cấp số
        </Button>
      </DialogFooter>
    </>
  )
}
