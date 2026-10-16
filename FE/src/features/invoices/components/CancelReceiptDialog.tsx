'use client'

import { useState } from 'react'
import { Ban } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FormField } from '@/components/shared/FormField'
import { Textarea } from '@/components/ui/textarea'
import { useCancelReceipt } from '@/features/clinic/hooks/use-clinic'
import { getErrorMessage, getFieldErrors } from '@/lib/api-error'
import { formatVnd } from '@/lib/format'

export type CancelTarget = { id: string; code: string; amount: number }

const QUICK_REASONS = ['Thu nhầm', 'Sai phương thức thanh toán', 'Sai số tiền']

/**
 * Hủy phiếu thu (UC-12 bước 3–4; FR-35, BR-27): chỉ phiếu lập hôm nay, bắt buộc lý do. Hủy xong, số đã thu và trạng thái
 * phiếu thanh toán được tính lại.
 */
export function CancelReceiptDialog({
  receipt,
  onOpenChange,
  onCancelled,
}: {
  receipt: CancelTarget | null
  onOpenChange: (open: boolean) => void
  onCancelled?: () => void
}) {
  const cancel = useCancelReceipt()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | undefined>()

  const reset = () => {
    setReason('')
    setError(undefined)
  }

  return (
    <ConfirmDialog
      open={!!receipt}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
      title={`Hủy phiếu thu ${receipt?.code ?? ''}?`}
      description={
        receipt
          ? `Số tiền ${formatVnd(receipt.amount)} sẽ không còn tính vào thực thu; phiếu thanh toán quay về trạng thái theo số đã thu còn lại. Không hoàn tác được.`
          : undefined
      }
      confirmText="Hủy phiếu thu"
      cancelText="Đóng"
      variant="destructive"
      icon={Ban}
      loading={cancel.isPending}
      onConfirm={() =>
        new Promise<void>((resolve, reject) => {
          if (!receipt) return resolve()
          const text = reason.trim()
          if (!text) {
            setError('Nhập lý do hủy')
            return reject(new Error('missing reason'))
          }
          cancel.mutate(
            { id: receipt.id, input: { reason: text } },
            {
              onSuccess: (r) => {
                toast.success(`Đã hủy phiếu thu ${r.code}`, {
                  description: r.debtAfter > 0 ? `Phiếu thanh toán còn nợ ${formatVnd(r.debtAfter)}` : undefined,
                })
                reset()
                onCancelled?.()
                resolve()
              },
              onError: (err) => {
                setError(getFieldErrors(err).reason ?? getErrorMessage(err))
                reject(err)
              },
            }
          )
        })
      }
    >
      <div className="space-y-2">
        <FormField label="Lý do hủy" required error={error}>
          <Textarea
            rows={2}
            maxLength={200}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              setError(undefined)
            }}
            placeholder="Vd: Thu nhầm"
          />
        </FormField>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setReason(r)
                setError(undefined)
              }}
              className="hover:bg-muted focus-visible:ring-ring/50 h-8 cursor-pointer rounded-full border px-3 text-xs outline-none focus-visible:ring-3"
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </ConfirmDialog>
  )
}
