'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, Printer, RotateCcw, Star } from 'lucide-react'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { routePath } from '@/config/route-path'
import { PatientPicker, type PatientChoice } from '@/features/clinic/components/PatientPicker'
import { useAppointment, useCheckIn, useCheckInPreview, useClinicProfile } from '@/features/clinic/hooks/use-clinic'
import { problemCode } from '@/features/clinic/lib/problem'
import { ddmmyyyy, vnHhmm } from '@/features/clinic/lib/vn-time'
import { getErrorMessage, getFieldErrors } from '@/lib/api-error'
import type { AppointmentCardDto, QueueDoctorDto } from '@/types/clinic'

type CheckInDialogProps = {
  open: boolean
  onClose: () => void
  /** Lịch hẹn được tiếp đón; null là bệnh nhân đến trực tiếp (UC-05 2a) */
  appointment: AppointmentCardDto | null
  doctors: QueueDoctorDto[]
}

/**
 * Tiếp đón (UC-05 bước 3–5): bác sĩ theo lịch, lý do khám, cờ ưu tiên tự bật (BR-10), nhãn tái khám theo hẹn (BR-20),
 * cảnh báo lượt đang mở (BR-07); xong thì mở bản in phiếu số thứ tự.
 */
export function CheckInDialog({ open, onClose, appointment, doctors }: CheckInDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        {open && <CheckInForm key={appointment?.id ?? 'walk-in'} appointment={appointment} doctors={doctors} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function CheckInForm({ appointment, doctors, onClose }: Omit<CheckInDialogProps, 'open'>) {
  const detail = useAppointment(appointment?.isGuest ? appointment.id : null)
  const profile = useClinicProfile()
  const [choice, setChoice] = useState<PatientChoice>({ patient: null, newPatient: null })
  const [doctorId, setDoctorId] = useState(appointment?.doctorId ?? '')
  const [reason, setReason] = useState(appointment?.reason ?? '')
  const [manualPriority, setManualPriority] = useState(false)
  const [priorityReason, setPriorityReason] = useState('')
  const [printTicket, setPrintTicket] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const checkIn = useCheckIn()

  const patientId = appointment?.patientId ?? choice.patient?.id ?? null
  const preview = useCheckInPreview(
    { appointmentId: appointment?.id ?? null, patientId, doctorId: doctorId || null },
    !!(appointment || patientId || doctorId)
  )
  const p = preview.data
  const auto = !!p?.autoPriority
  const doctor = doctors.find((d) => d.id === doctorId)
  const guestDefaults = useMemo(() => {
    const d = detail.data
    if (!d) return undefined
    return {
      fullName: d.guestName ?? '',
      phone: d.guestPhone ?? '',
      birthDate: d.guestBirthYear ? `${d.guestBirthYear}-01-01` : '',
      gender: d.guestGender ?? 'Nam',
    }
  }, [detail.data])

  const submit = () => {
    setErrors({})
    if (!doctorId) return setErrors({ doctorId: 'Chọn bác sĩ' })
    if (!appointment?.patientId && !choice.patient && !choice.newPatient) return setErrors({ patientId: 'Chọn bệnh nhân hoặc tạo hồ sơ mới' })
    if (manualPriority && !auto && !priorityReason) return setErrors({ priorityReason: 'Chọn đối tượng ưu tiên' })
    checkIn.mutate(
      {
        appointmentId: appointment?.id ?? null,
        patientId: choice.patient?.id ?? null,
        newPatient: choice.newPatient,
        doctorId,
        reason: reason.trim() || null,
        isPriority: auto || manualPriority,
        priorityReason: auto ? null : priorityReason || null,
      },
      {
        onSuccess: (r) => {
          toast.success(`Đã cấp số ${r.visit.ticket} · ${r.room}`, {
            description: r.waitingAhead > 0 ? `Trước bệnh nhân còn ${r.waitingAhead} người` : 'Bệnh nhân là người kế tiếp',
          })
          if (printTicket) window.open(`${routePath.queueTicket(r.visit.id)}?print=1`, '_blank', 'noopener')
          onClose()
        },
        onError: (e) => {
          const fields = getFieldErrors(e)
          if (Object.keys(fields).length) setErrors(fields)
          const code = problemCode(e)
          toast.error(code === 'TrungHoSo' ? 'Có thể trùng hồ sơ, chọn hồ sơ có sẵn hoặc đánh dấu "Vẫn tạo hồ sơ mới"' : getErrorMessage(e))
        },
      }
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{appointment ? 'Tiếp đón theo lịch hẹn' : 'Tiếp đón mới'}</DialogTitle>
        <DialogDescription>
          {appointment
            ? `${appointment.code} · hẹn ${vnHhmm(appointment.startAt)} với ${appointment.doctorName}`
            : 'Bệnh nhân đến trực tiếp: tìm hồ sơ hoặc thêm nhanh, chọn bác sĩ'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {appointment?.patientId ? (
          <div className="bg-muted/50 rounded-lg border p-3 text-sm">
            <p className="font-semibold">{appointment.patientName}</p>
            <p className="text-muted-foreground tabular-nums">
              {appointment.patientCode} · {appointment.patientPhone}
            </p>
          </div>
        ) : (
          <PatientPicker
            value={choice}
            onChange={setChoice}
            defaults={guestDefaults}
            suggestions={detail.data?.suggestions ?? []}
            errors={errors}
          />
        )}

        <FormField label="Bác sĩ" required error={errors.doctorId}>
          <Select value={doctorId} onValueChange={setDoctorId}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn bác sĩ" />
            </SelectTrigger>
            <SelectContent>
              {doctors.map((d) => (
                <SelectItem key={d.id} value={d.id} disabled={!d.working}>
                  {d.displayName} · {d.specialtyName} · {d.working ? `${d.waiting.length} người chờ` : (d.offReason ?? 'Không làm việc hôm nay')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Lý do khám" error={errors.reason}>
          <Input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="Đau răng, khám định kỳ…" />
        </FormField>

        {p?.openVisit && (
          <div className="border-destructive/40 bg-destructive/10 text-destructive flex gap-2 rounded-md border p-3 text-sm" role="alert">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              Bệnh nhân đang có lượt {p.openVisit.ticket} với {p.openVisit.doctorName}, không tiếp đón thêm được.
            </span>
          </div>
        )}
        {p?.lateForAppointment && (
          <p className="text-warning flex items-center gap-2 text-sm">
            <CalendarClock className="size-4" aria-hidden="true" />
            Đến muộn quá 15 phút: xếp hàng theo giờ tiếp đón.
          </p>
        )}
        {p?.followUp && (
          <p className="text-success flex items-center gap-2 text-sm">
            <RotateCcw className="size-4" aria-hidden="true" />
            Tái khám theo hẹn ngày {ddmmyyyy(p.followUp.dueDate)}: miễn phí khám.
          </p>
        )}

        <div className="space-y-2 rounded-lg border p-3">
          {auto ? (
            <p className="text-warning flex items-center gap-2 text-sm font-medium">
              <Star className="size-4" aria-hidden="true" />
              Ưu tiên tự động: {p?.autoPriorityReason}
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="manual-priority">Ưu tiên</Label>
                <Switch id="manual-priority" checked={manualPriority} onCheckedChange={setManualPriority} />
              </div>
              {manualPriority && (
                <FormField label="Đối tượng ưu tiên" required error={errors.priorityReason}>
                  <Select value={priorityReason} onValueChange={setPriorityReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn đối tượng" />
                    </SelectTrigger>
                    <SelectContent>
                      {(profile.data?.priorityReasons ?? []).map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </>
          )}
        </div>

        {doctor && p && !p.openVisit && (
          <p className="text-muted-foreground text-sm">
            Sau khi tiếp đón, trước bệnh nhân còn khoảng <b className="text-foreground tabular-nums">{p.waitingAhead}</b> người ở {doctor.room}.
          </p>
        )}

        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={printTicket} onCheckedChange={(v) => setPrintTicket(v === true)} />
          <Printer className="size-4" aria-hidden="true" />
          In phiếu số thứ tự
        </label>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Đóng
        </Button>
        <Button variant="cta" onClick={submit} disabled={checkIn.isPending || !!p?.openVisit}>
          Xác nhận tiếp đón
        </Button>
      </DialogFooter>
    </>
  )
}
