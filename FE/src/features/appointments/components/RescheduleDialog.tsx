'use client'

import { useState } from 'react'
import { CalendarClock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { getErrorMessage, getFieldErrors } from '@/lib/api-error'
import type { AppointmentDetailDto } from '@/types/clinic'
import { useDoctorOptions, useDoctorSlots, useRescheduleAppointment } from '@/features/clinic/hooks/use-clinic'
import { ddmmyyyy, vnHhmm, vnToday } from '@/features/clinic/lib/vn-time'
import { latestConfirmMessage, slotProblem } from '../lib/appointment-ui'
import { DoctorSelect } from './DoctorSelect'
import { SlotPicker } from './SlotPicker'

type RescheduleDialogProps = {
  appointment: AppointmentDetailDto
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Đổi giờ, đổi bác sĩ (UC-04 1b, BR-06): khung mới phải còn trống theo BR-01; lịch đã xác nhận được gửi lại tin xác nhận. */
export function RescheduleDialog({ appointment, open, onOpenChange }: RescheduleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        {open && <RescheduleForm key={appointment.id} appointment={appointment} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function RescheduleForm({ appointment: a, onClose }: { appointment: AppointmentDetailDto; onClose: () => void }) {
  const today = vnToday()
  const [doctorId, setDoctorId] = useState(a.doctorId)
  const [date, setDate] = useState(a.date < today ? today : a.date)
  const [startAt, setStartAt] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const doctors = useDoctorOptions()
  const slots = useDoctorSlots(doctorId || null, date)
  const reschedule = useRescheduleAppointment()
  const pending = reschedule.isPending

  const submit = () => {
    const local: Record<string, string> = {}
    if (!doctorId) local.doctorId = 'Chọn bác sĩ'
    if (!startAt) local.startAt = 'Chọn khung giờ mới'
    setErrors(local)
    if (Object.keys(local).length > 0) return
    reschedule.mutate(
      { id: a.id, input: { doctorId, startAt: startAt! } },
      {
        onSuccess: (next) => {
          const message = next.status === 'DaXacNhan' ? latestConfirmMessage(next) : null
          toast.success(`Đã đổi lịch ${next.code} sang ${vnHhmm(next.startAt)} ${ddmmyyyy(next.date)}`, {
            description: message ? `Tin xác nhận mới (giả lập): ${message.content}` : next.doctorName,
            duration: 8000,
          })
          onClose()
        },
        onError: (err) => {
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

  return (
    <>
      <DialogHeader className="border-b px-6 pt-6 pb-4">
        <DialogTitle className="flex items-center gap-2">
          <CalendarClock className="text-primary size-5" aria-hidden="true" />
          Đổi giờ lịch {a.code}
        </DialogTitle>
        <DialogDescription>
          Hiện tại: {vnHhmm(a.startAt)} {ddmmyyyy(a.date)} với {a.doctorName}, {a.room}.
        </DialogDescription>
      </DialogHeader>
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Bác sĩ" required error={errors.doctorId}>
            <DoctorSelect
              doctors={doctors.data}
              value={doctorId}
              disabled={pending}
              onChange={(v) => {
                setDoctorId(v)
                setStartAt(null)
              }}
            />
          </FormField>
          <FormField label="Ngày hẹn" required>
            <Input
              type="date"
              value={date}
              min={today}
              disabled={pending}
              onChange={(e) => {
                setDate(e.target.value)
                setStartAt(null)
              }}
            />
          </FormField>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-foreground mb-1.5 text-sm font-medium">
            Khung giờ mới
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          </legend>
          <SlotPicker
            doctorId={doctorId}
            date={date}
            value={startAt}
            currentStartAt={doctorId === a.doctorId ? a.startAt : null}
            disabled={pending}
            error={errors.startAt}
            onChange={(v) => {
              setStartAt(v)
              setErrors({})
            }}
          />
        </fieldset>
      </div>
      <DialogFooter className="border-t px-6 py-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          Đóng
        </Button>
        <Button type="button" onClick={submit} disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Đổi giờ
        </Button>
      </DialogFooter>
    </>
  )
}
