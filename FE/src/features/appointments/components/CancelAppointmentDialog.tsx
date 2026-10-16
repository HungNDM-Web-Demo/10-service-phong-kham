'use client'

import { useState } from 'react'
import { CalendarX2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage, getFieldErrors } from '@/lib/api-error'
import type { AppointmentCancelReason, AppointmentDetailDto } from '@/types/clinic'
import { useCancelAppointment } from '@/features/clinic/hooks/use-clinic'
import { cancelReasonLabels } from '@/features/clinic/lib/labels'
import { validateCancel } from '@/features/clinic/lib/validation'
import { ddmmyyyy, vnHhmm } from '@/features/clinic/lib/vn-time'

type CancelAppointmentDialogProps = {
  appointment: AppointmentDetailDto
  open: boolean
  onOpenChange: (open: boolean) => void
}

const reasons = Object.keys(cancelReasonLabels) as AppointmentCancelReason[]

/** Hủy lịch kèm lý do (UC-04 1c, BR-06): bắt buộc chọn lý do, "Khác" phải ghi chú; khung được giải phóng ngay. */
export function CancelAppointmentDialog({ appointment, open, onOpenChange }: CancelAppointmentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && <CancelForm key={appointment.id} appointment={appointment} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function CancelForm({ appointment: a, onClose }: { appointment: AppointmentDetailDto; onClose: () => void }) {
  const [reason, setReason] = useState<AppointmentCancelReason | ''>('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const cancel = useCancelAppointment()
  const pending = cancel.isPending
  const patientName = a.patient?.fullName ?? a.guestName ?? ''

  const submit = () => {
    const input = { reason: reason as AppointmentCancelReason, note: note.trim() || null }
    const local = validateCancel(input)
    setErrors(local)
    if (Object.keys(local).length > 0) return
    cancel.mutate(
      { id: a.id, input },
      {
        onSuccess: (next) => {
          toast.success(`Đã hủy lịch ${next.code}`, { description: `Lý do: ${cancelReasonLabels[input.reason]}. Khung giờ đã được giải phóng.` })
          onClose()
        },
        onError: (err) => {
          setErrors(getFieldErrors(err))
          toast.error(getErrorMessage(err))
        },
      }
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CalendarX2 className="text-destructive size-5" aria-hidden="true" />
          Hủy lịch {a.code}
        </DialogTitle>
        <DialogDescription>
          {patientName} · {vnHhmm(a.startAt)} {ddmmyyyy(a.date)} với {a.doctorName}.
        </DialogDescription>
      </DialogHeader>
      <form
        id="cancel-appointment-form"
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <fieldset className="space-y-2">
          <legend className="text-foreground mb-1.5 text-sm font-medium">
            Lý do hủy
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          </legend>
          <RadioGroup
            value={reason}
            onValueChange={(v) => {
              setReason(v as AppointmentCancelReason)
              setErrors({})
            }}
            aria-label="Lý do hủy"
            aria-invalid={errors.reason ? true : undefined}
            className="grid gap-2 sm:grid-cols-2"
          >
            {reasons.map((r) => (
              <Label
                key={r}
                htmlFor={`cancel-reason-${r}`}
                className="has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 font-normal"
              >
                <RadioGroupItem id={`cancel-reason-${r}`} value={r} disabled={pending} />
                {cancelReasonLabels[r]}
              </Label>
            ))}
          </RadioGroup>
          {errors.reason && (
            <p role="alert" className="text-destructive text-[0.8125rem]">
              {errors.reason}
            </p>
          )}
        </fieldset>
        <FormField label="Ghi chú" required={reason === 'Khac'} error={errors.note} hint={reason === 'Khac' ? 'Bắt buộc khi chọn lý do Khác' : undefined}>
          <Textarea rows={3} maxLength={300} value={note} disabled={pending} onChange={(e) => setNote(e.target.value)} />
        </FormField>
      </form>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          Đóng
        </Button>
        <Button type="submit" form="cancel-appointment-form" variant="danger" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Hủy lịch hẹn
        </Button>
      </DialogFooter>
    </>
  )
}
