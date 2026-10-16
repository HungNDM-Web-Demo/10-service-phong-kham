'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage, getFieldErrors } from '@/lib/api-error'
import { formatPhone } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CallResult, FollowUpDto } from '@/types/clinic'
import { useRecordCall } from '@/features/clinic/hooks/use-clinic'
import { callResultLabels } from '@/features/clinic/lib/labels'
import { ddmmyyyy } from '@/features/clinic/lib/vn-time'

const RESULTS: { value: CallResult; hint: string }[] = [
  { value: 'DongYDen', hint: 'Bệnh nhân sẽ đến, có thể đặt lịch ngay' },
  { value: 'HenNgayKhac', hint: 'Ghi ngày bệnh nhân hẹn lại vào ghi chú' },
  { value: 'KhongLienLacDuoc', hint: 'Không nghe máy, thuê bao, sai số' },
]

type CallResultDialogProps = {
  followUp: FollowUpDto | null
  onOpenChange: (open: boolean) => void
  /** Gọi sau khi lưu; trang dùng để mở hộp đặt lịch khi bệnh nhân đồng ý đến (UC-13 bước 4) */
  onSaved?: (row: FollowUpDto, result: CallResult) => void
}

/** Ghi kết quả gọi điện nhắc tái khám (UC-13 bước 3, FR-37). */
export function CallResultDialog({ followUp, onOpenChange, onSaved }: CallResultDialogProps) {
  return (
    <Dialog open={followUp !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {followUp && (
          <CallResultForm
            key={followUp.id}
            row={followUp}
            onClose={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function CallResultForm({
  row,
  onClose,
  onSaved,
}: {
  row: FollowUpDto
  onClose: () => void
  onSaved?: (row: FollowUpDto, result: CallResult) => void
}) {
  const record = useRecordCall()
  const [result, setResult] = useState<CallResult | ''>('')
  const [note, setNote] = useState(row.callNote ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!result) {
      setErrors({ result: 'Chọn kết quả gọi' })
      return
    }
    record.mutate(
      { id: row.id, input: { result, note: note.trim() || null } },
      {
        onSuccess: (saved) => {
          toast.success(`Đã ghi kết quả gọi: ${callResultLabels[result]}`)
          onClose()
          onSaved?.(saved, result)
        },
        onError: (err) => {
          const fields = getFieldErrors(err)
          setErrors(fields)
          if (!Object.keys(fields).length) toast.error(getErrorMessage(err))
        },
      }
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>Ghi kết quả gọi</DialogTitle>
        <DialogDescription>
          {row.patientName} · <span className="tabular-nums">{formatPhone(row.patientPhone)}</span>{' '}
          · hẹn tái khám {ddmmyyyy(row.dueDate)}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-1.5">
        <Label id="call-result-label">
          Kết quả
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        </Label>
        <RadioGroup
          value={result}
          onValueChange={(v) => {
            setResult(v as CallResult)
            setErrors({})
          }}
          aria-labelledby="call-result-label"
          aria-invalid={errors.result ? true : undefined}
          className="grid gap-2"
        >
          {RESULTS.map((r) => (
            <Label
              key={r.value}
              htmlFor={`call-${r.value}`}
              className={cn(
                'hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal transition-colors',
                result === r.value && 'border-primary bg-primary/5'
              )}
            >
              <RadioGroupItem value={r.value} id={`call-${r.value}`} className="mt-0.5" />
              <span className="grid gap-0.5">
                <span className="font-medium">{callResultLabels[r.value]}</span>
                <span className="text-muted-foreground text-xs">{r.hint}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>
        {errors.result && (
          <p role="alert" className="text-destructive text-[0.8125rem]">
            {errors.result}
          </p>
        )}
      </div>

      <FormField label="Ghi chú" error={errors.note}>
        <Textarea
          rows={3}
          maxLength={300}
          value={note}
          placeholder={
            result === 'HenNgayKhac' ? 'Vd: Hẹn sáng thứ Bảy tuần sau' : 'Không bắt buộc'
          }
          onChange={(e) => setNote(e.target.value)}
        />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={record.isPending}>
          Hủy
        </Button>
        <Button type="submit" disabled={record.isPending}>
          {record.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Lưu kết quả
        </Button>
      </DialogFooter>
    </form>
  )
}
