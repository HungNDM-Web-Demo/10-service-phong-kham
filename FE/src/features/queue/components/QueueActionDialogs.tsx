'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCallVisit, useCancelVisit, useTransfer } from '@/features/clinic/hooks/use-clinic'
import { getErrorMessage, getFieldErrors } from '@/lib/api-error'
import type { QueueDoctorDto, QueueVisitDto } from '@/types/clinic'

type Base = { visit: QueueVisitDto | null; onClose: () => void }

const CALL_REASONS = ['Đã quay lại', 'Khám nhanh', 'Khác']
const CANCEL_REASONS = ['Bệnh nhân bỏ về', 'Bệnh nhân đổi sang hôm khác', 'Tiếp đón nhầm', 'Khác']

/** Gọi một người không theo thứ tự (UC-06 2a): chọn lý do, ghi vào lượt. */
export function CallDialog({ visit, onClose }: Base) {
  const [reason, setReason] = useState(CALL_REASONS[0])
  const [other, setOther] = useState('')
  const call = useCallVisit()
  const submit = () => {
    if (!visit) return
    const value = reason === 'Khác' ? other.trim() : reason
    if (!value) return toast.error('Nhập lý do gọi trước')
    call.mutate(
      { id: visit.id, reason: value },
      {
        onSuccess: (v) => {
          toast.success(`Đã gọi số ${v.ticket}`)
          onClose()
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    )
  }
  return (
    <Dialog open={!!visit} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gọi {visit?.patientName}</DialogTitle>
          <DialogDescription>Gọi người này trước thứ tự hàng chờ, ghi lại lý do.</DialogDescription>
        </DialogHeader>
        <FormField label="Lý do" required>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CALL_REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        {reason === 'Khác' && (
          <FormField label="Ghi rõ lý do" required>
            <Input value={other} maxLength={100} onChange={(e) => setOther(e.target.value)} autoFocus />
          </FormField>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button onClick={submit} disabled={call.isPending}>
            Gọi vào khám
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Chuyển bác sĩ (UC-05 6a): cấp số mới của bác sĩ được chọn (BR-08). */
export function TransferDialog({ visit, onClose, doctors }: Base & { doctors: QueueDoctorDto[] }) {
  const [doctorId, setDoctorId] = useState('')
  const transfer = useTransfer()
  const options = doctors.filter((d) => d.id !== visit?.doctorId)
  const submit = () => {
    if (!visit || !doctorId) return toast.error('Chọn bác sĩ')
    transfer.mutate(
      { id: visit.id, doctorId },
      {
        onSuccess: (v) => {
          toast.success(`Đã chuyển sang ${v.doctorName}, số mới ${v.ticket}`)
          setDoctorId('')
          onClose()
        },
        onError: (e) => toast.error(getFieldErrors(e).doctorId ?? getErrorMessage(e)),
      }
    )
  }
  return (
    <Dialog open={!!visit} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chuyển bác sĩ</DialogTitle>
          <DialogDescription>
            {visit?.patientName} đang chờ {visit?.doctorName} với số {visit?.ticket}. Bác sĩ mới sẽ cấp số thứ tự mới.
          </DialogDescription>
        </DialogHeader>
        <FormField label="Bác sĩ mới" required>
          <Select value={doctorId} onValueChange={setDoctorId}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn bác sĩ" />
            </SelectTrigger>
            <SelectContent>
              {options.map((d) => (
                <SelectItem key={d.id} value={d.id} disabled={!d.working}>
                  {d.displayName} · {d.room} · {d.working ? `${d.waiting.length} người chờ` : (d.offReason ?? 'Không làm việc')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button onClick={submit} disabled={transfer.isPending}>
            Chuyển
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Hủy lượt (UC-05 6b): lượt chuyển "Bỏ về" kèm lý do. */
export function CancelVisitDialog({ visit, onClose }: Base) {
  const [reason, setReason] = useState(CANCEL_REASONS[0])
  const [other, setOther] = useState('')
  const cancel = useCancelVisit()
  const submit = () => {
    if (!visit) return
    const value = reason === 'Khác' ? other.trim() : reason
    if (!value) return toast.error('Nhập lý do')
    cancel.mutate(
      { id: visit.id, input: { reason: value } },
      {
        onSuccess: () => {
          toast.success(`Đã hủy lượt ${visit.ticket}`)
          onClose()
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    )
  }
  return (
    <Dialog open={!!visit} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hủy lượt {visit?.ticket}</DialogTitle>
          <DialogDescription>{visit?.patientName} sẽ được ghi nhận “Bỏ về”.</DialogDescription>
        </DialogHeader>
        <FormField label="Lý do" required>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CANCEL_REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        {reason === 'Khác' && (
          <FormField label="Ghi rõ lý do" required>
            <Input value={other} maxLength={200} onChange={(e) => setOther(e.target.value)} autoFocus />
          </FormField>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button variant="danger" onClick={submit} disabled={cancel.isPending}>
            Hủy lượt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
