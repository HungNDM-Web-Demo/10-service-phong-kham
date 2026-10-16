'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MoneyInput } from '@/features/clinic/components/MoneyInput'
import { useCollect } from '@/features/clinic/hooks/use-clinic'
import { problemCode, problemMinAmount, problemServerTotal } from '@/features/clinic/lib/problem'
import { getErrorMessage, getFieldErrors, isApiError } from '@/lib/api-error'
import { formatVnd } from '@/lib/format'
import { readJson, storageKey, writeJson } from '@/lib/storage'
import { cn } from '@/lib/utils'
import type { InvoiceDto, PaymentMethod, ReceiptDto } from '@/types/clinic'
import { collectIssues, type CollectIssues, type InvoiceTotals } from '../lib/collect'
import { PaymentMethodFields } from './PaymentMethodFields'

const PRINT_PREF_KEY = storageKey('receipt-auto-print')
const PARTIAL_REASONS = ['Trả góp đợt 1', 'Hẹn trả lần sau', 'Không đủ tiền mặt']

type CollectPanelProps = {
  invoice: InvoiceDto
  /** Tổng tính lại tại máy theo các dòng đang tick "Mua ngoài" */
  totals: InvoiceTotals
  outsideLineIds: string[]
  /** Mã chống gửi trùng, cố định trong một lần mở hộp (UC-11 E4) */
  clientRequestId: string
  /** Máy chủ báo tổng đã đổi (409 TongTienDaDoi): tải lại phiếu */
  onConflict: () => void
  onDone: (receipt: ReceiptDto, printNow: boolean) => void
}

/**
 * Khối thu tiền (UC-11 bước 4–5, 4c; FR-32, FR-33): số tiền mặc định bằng phần còn phải thu, sửa nhỏ hơn là thu một phần
 * (bắt buộc lý do, không thấp hơn tiền thuốc, BR-25), chọn phương thức, rồi "Hoàn tất". Lỗi máy chủ hiện ngay tại ô.
 */
export function CollectPanel({ invoice, totals, outsideLineIds, clientRequestId, onConflict, onDone }: CollectPanelProps) {
  const collect = useCollect()
  const [amountInput, setAmountInput] = useState<number | null>(null)
  const [amountEdited, setAmountEdited] = useState(false)
  const [method, setMethod] = useState<PaymentMethod>('TienMat')
  const [cashInput, setCashInput] = useState<number | null>(null)
  const [cashEdited, setCashEdited] = useState(false)
  const [partialReason, setPartialReason] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [serverErrors, setServerErrors] = useState<CollectIssues>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [printNow, setPrintNow] = useState(() => readJson<boolean>('local', PRINT_PREF_KEY) ?? true)

  const remaining = Math.max(0, totals.total - invoice.paid)
  const medicineMin = Math.max(0, totals.medicineTotal - invoice.paid)
  const amount = amountEdited ? amountInput : remaining
  const cash = cashEdited ? cashInput : amount
  const isPartial = (amount ?? 0) > 0 && (amount ?? 0) < remaining
  const { issues, blocking } = collectIssues({ amount, method, cashReceived: cash, partialReason }, remaining, medicineMin)
  const pending = collect.isPending

  const amountError = serverErrors.amount ?? issues.amount
  const cashError = serverErrors.cashReceived ?? issues.cashReceived
  const reasonError = serverErrors.partialReason ?? (submitted ? issues.partialReason : undefined)

  const clearServer = (key: keyof CollectIssues) =>
    setServerErrors((s) => {
      if (!s[key]) return s
      const next = { ...s }
      delete next[key]
      return next
    })

  const setAmount = (v: number | null) => {
    setAmountEdited(true)
    setAmountInput(v)
    clearServer('amount')
    setFormError(null)
  }

  const submit = () => {
    if (pending) return
    setSubmitted(true)
    if (blocking || issues.partialReason || !amount) return
    setFormError(null)
    setServerErrors({})
    collect.mutate(
      {
        id: invoice.id,
        input: {
          clientRequestId,
          outsideLineIds,
          amount,
          method,
          cashReceived: method === 'TienMat' ? cash : null,
          partialReason: isPartial ? partialReason.trim() : null,
          expectedTotal: totals.total,
        },
      },
      {
        onSuccess: (receipt) => onDone(receipt, printNow),
        onError: (err) => {
          if (isApiError(err) && err.status === 0) {
            setFormError('Chưa ghi nhận được do mất kết nối. Bấm Hoàn tất lần nữa, hệ thống không tạo trùng phiếu thu.')
            return
          }
          const code = problemCode(err)
          if (code === 'TongTienDaDoi') {
            const server = problemServerTotal(err)
            setFormError(
              `Tổng phải thu trên hệ thống đã đổi${server !== null ? ` thành ${formatVnd(server)}` : ''}. Phiếu vừa được tải lại, kiểm tra rồi bấm Hoàn tất.`
            )
            setAmountEdited(false)
            onConflict()
            return
          }
          if (code === 'ThuThieuTienThuoc') {
            const min = problemMinAmount(err)
            setServerErrors({ amount: min !== null ? `Số tiền thu tối thiểu ${formatVnd(min)} (tiền thuốc)` : getErrorMessage(err) })
            return
          }
          const fields = getFieldErrors(err)
          const mapped: CollectIssues = {}
          if (fields.amount) mapped.amount = fields.amount
          if (fields.cashReceived) mapped.cashReceived = fields.cashReceived
          if (fields.partialReason) mapped.partialReason = fields.partialReason
          if (Object.keys(mapped).length) setServerErrors(mapped)
          else setFormError(getErrorMessage(err))
        },
      }
    )
  }

  if (remaining <= 0)
    return (
      <p className="bg-success/10 text-success flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium">
        <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
        Phiếu không còn số phải thu.
      </p>
    )

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="bg-primary/5 flex items-baseline justify-between gap-3 rounded-lg px-3 py-2.5">
        <span className="text-muted-foreground text-sm">Còn phải thu</span>
        <span className="text-primary text-2xl font-semibold tabular-nums">{formatVnd(remaining)}</span>
      </div>

      <FormField
        label="Số tiền thu lần này"
        required
        error={amountError}
        hint={medicineMin > 0 ? `Tối thiểu ${formatVnd(medicineMin)} (tiền thuốc đã giao)` : undefined}
      >
        <MoneyInput value={amount} onValueChange={setAmount} disabled={pending} className="h-11 text-base font-semibold" />
      </FormField>
      <div className="-mt-2 flex flex-wrap gap-1.5">
        <Button type="button" variant="outline" size="sm" disabled={pending || amount === remaining} onClick={() => setAmount(remaining)}>
          Thu đủ {formatVnd(remaining)}
        </Button>
        {medicineMin > 0 && medicineMin < remaining && (
          <Button type="button" variant="outline" size="sm" disabled={pending || amount === medicineMin} onClick={() => setAmount(medicineMin)}>
            Chỉ tiền thuốc {formatVnd(medicineMin)}
          </Button>
        )}
      </div>

      {isPartial && (
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <p className="text-sm">
            Thu một phần, còn nợ <span className="font-semibold tabular-nums">{formatVnd(remaining - (amount ?? 0))}</span> ghi vào
            công nợ của bệnh nhân.
          </p>
          <FormField label="Lý do thu một phần" required error={reasonError}>
            <Textarea
              rows={2}
              maxLength={200}
              value={partialReason}
              disabled={pending}
              placeholder="Vd: Trả góp đợt 1"
              onChange={(e) => {
                setPartialReason(e.target.value)
                clearServer('partialReason')
              }}
            />
          </FormField>
          <div className="flex flex-wrap gap-1.5">
            {PARTIAL_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                disabled={pending}
                onClick={() => {
                  setPartialReason(r)
                  clearServer('partialReason')
                }}
                className="hover:bg-muted focus-visible:ring-ring/50 h-8 cursor-pointer rounded-full border px-3 text-xs outline-none focus-visible:ring-3"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      <PaymentMethodFields
        method={method}
        onMethodChange={(m) => {
          setMethod(m)
          clearServer('cashReceived')
          setFormError(null)
        }}
        amount={!issues.amount && amount ? amount : 0}
        cashReceived={cash}
        onCashChange={(v) => {
          setCashEdited(true)
          setCashInput(v)
          clearServer('cashReceived')
        }}
        cashError={cashError}
        invoiceCode={invoice.code}
        disabled={pending}
      />

      {formError && (
        <p role="alert" className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {formError}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Checkbox
          id="receipt-print-now"
          checked={printNow}
          disabled={pending}
          onCheckedChange={(c) => {
            const next = c === true
            setPrintNow(next)
            writeJson('local', PRINT_PREF_KEY, next)
          }}
        />
        <Label htmlFor="receipt-print-now" className="cursor-pointer text-sm font-normal">
          Mở bản in phiếu thu sau khi thu
        </Label>
      </div>

      <Button
        type="submit"
        variant="cta"
        size="lg"
        className={cn('w-full', pending && 'cursor-wait')}
        disabled={pending || blocking}
        aria-busy={pending}
      >
        {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
        {method === 'ChuyenKhoan' ? 'Đã nhận tiền' : 'Hoàn tất'}
        {amount && !issues.amount ? ` · ${formatVnd(amount)}` : ''}
      </Button>
    </form>
  )
}
