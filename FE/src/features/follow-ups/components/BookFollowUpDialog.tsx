'use client'

import { useState } from 'react'
import { CalendarX2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage, getFieldErrors } from '@/lib/api-error'
import { formatPhone } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { FollowUpDto } from '@/types/clinic'
import {
  useCreateAppointment,
  useDoctorOptions,
  useDoctorSlots,
} from '@/features/clinic/hooks/use-clinic'
import { clinicRules } from '@/features/clinic/lib/rules'
import { ddmmyyyy, vnHhmm, vnToday } from '@/features/clinic/lib/vn-time'

type BookFollowUpDialogProps = {
  followUp: FollowUpDto | null
  onOpenChange: (open: boolean) => void
}

/**
 * Tạo lịch hẹn từ dòng nhắc tái khám (UC-13 bước 4, TC-50): điền sẵn bệnh nhân, bác sĩ đã hẹn, ngày hẹn; chọn khung còn trống
 * (BR-01, BR-02). Lưu xong dòng nhắc chuyển "Đã đặt lịch".
 */
export function BookFollowUpDialog({ followUp, onOpenChange }: BookFollowUpDialogProps) {
  return (
    <Dialog open={followUp !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-xl">
        {followUp && (
          <BookForm key={followUp.id} row={followUp} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function BookForm({ row, onClose }: { row: FollowUpDto; onClose: () => void }) {
  const today = vnToday()
  const doctors = useDoctorOptions()
  const create = useCreateAppointment()
  const [doctorId, setDoctorId] = useState(row.doctorId)
  const [date, setDate] = useState(row.dueDate >= today ? row.dueDate : today)
  const [startAt, setStartAt] = useState<string | null>(null)
  const [reason, setReason] = useState(row.note?.trim() || clinicRules.followUpFreeNote)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const slots = useDoctorSlots(doctorId, date)
  const list = slots.data?.slots ?? []
  const availableCount = list.filter((s) => s.available).length

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const local: Record<string, string> = {}
    if (!doctorId) local.doctorId = 'Chọn bác sĩ'
    if (!date) local.date = 'Chọn ngày hẹn'
    else if (date < today) local.date = 'Ngày hẹn không được trước hôm nay'
    if (!startAt) local.startAt = 'Chọn khung giờ'
    setErrors(local)
    if (Object.keys(local).length || !startAt) return
    create.mutate(
      {
        patientId: row.patientId,
        doctorId,
        startAt,
        reason: reason.trim() || null,
        followUpId: row.id,
      },
      {
        onSuccess: (appt) => {
          toast.success(
            `Đã đặt lịch ${appt.code} lúc ${vnHhmm(appt.startAt)} ngày ${ddmmyyyy(appt.date)}`
          )
          onClose()
        },
        onError: (err) => {
          const fields = getFieldErrors(err)
          setErrors(fields)
          toast.error(getErrorMessage(err))
          setStartAt(null)
          void slots.refetch()
        },
      }
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>Đặt lịch tái khám</DialogTitle>
        <DialogDescription>
          {row.patientName} ({row.patientCode}) ·{' '}
          <span className="tabular-nums">{formatPhone(row.patientPhone)}</span> · hẹn tái khám{' '}
          {ddmmyyyy(row.dueDate)}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Bác sĩ" required error={errors.doctorId}>
          <Select
            value={doctorId}
            onValueChange={(v) => {
              setDoctorId(v)
              setStartAt(null)
              setErrors({})
            }}
            disabled={doctors.isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={doctors.isLoading ? 'Đang tải…' : 'Chọn bác sĩ'} />
            </SelectTrigger>
            <SelectContent>
              {(doctors.data ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.displayName} · {d.specialtyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Ngày hẹn" required error={errors.date}>
          <Input
            type="date"
            min={today}
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              setStartAt(null)
              setErrors({})
            }}
          />
        </FormField>
      </div>

      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <span id="slot-label" className="text-sm font-medium">
            Khung giờ
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          </span>
          {slots.data && list.length > 0 && (
            <span className="text-muted-foreground text-xs">Còn {availableCount} khung trống</span>
          )}
        </div>
        {slots.isLoading ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} className="h-9" />
            ))}
          </div>
        ) : slots.error ? (
          <p role="alert" className="text-destructive text-sm">
            {getErrorMessage(slots.error)}{' '}
            <button
              type="button"
              className="underline underline-offset-4"
              onClick={() => void slots.refetch()}
            >
              Thử lại
            </button>
          </p>
        ) : list.length === 0 ? (
          <div className="text-muted-foreground flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm">
            <CalendarX2 className="size-4 shrink-0" aria-hidden="true" />
            {slots.data?.offReason ?? 'Bác sĩ không có khung làm việc ngày này'}. Chọn ngày hoặc bác
            sĩ khác.
          </div>
        ) : (
          <div
            role="group"
            aria-labelledby="slot-label"
            className="grid grid-cols-4 gap-2 sm:grid-cols-6"
          >
            {list.map((s) => {
              const active = startAt === s.startAt
              return (
                <button
                  key={s.startAt}
                  type="button"
                  aria-pressed={active}
                  disabled={!s.available}
                  title={
                    s.available
                      ? `Còn ${s.max - s.taken} chỗ`
                      : s.started
                        ? 'Đã qua giờ'
                        : 'Đã đủ lịch'
                  }
                  onClick={() => {
                    setStartAt(s.startAt)
                    setErrors((e) => ({ ...e, startAt: '' }))
                  }}
                  className={cn(
                    'focus-visible:ring-ring/50 h-9 rounded-md border text-sm font-medium tabular-nums transition-colors outline-none focus-visible:ring-3',
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card hover:bg-muted',
                    !s.available &&
                      'text-muted-foreground cursor-not-allowed line-through opacity-60 hover:bg-transparent'
                  )}
                >
                  {s.time}
                </button>
              )
            })}
          </div>
        )}
        {errors.startAt && (
          <p role="alert" className="text-destructive text-[0.8125rem]">
            {errors.startAt}
          </p>
        )}
      </div>

      <FormField label="Lý do khám" error={errors.reason}>
        <Textarea
          rows={2}
          maxLength={300}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={create.isPending}>
          Hủy
        </Button>
        <Button type="submit" disabled={create.isPending || !startAt}>
          {create.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Đặt lịch
        </Button>
      </DialogFooter>
    </form>
  )
}
