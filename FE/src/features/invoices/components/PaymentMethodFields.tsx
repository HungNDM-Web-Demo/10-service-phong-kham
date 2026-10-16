'use client'

import { useMemo } from 'react'
import { AlertCircle, Banknote, CreditCard, Info, QrCode } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { MoneyInput } from '@/features/clinic/components/MoneyInput'
import { QrImage } from '@/features/clinic/components/QrImage'
import { useClinicProfile } from '@/features/clinic/hooks/use-clinic'
import { buildVietQr, toTransferContent } from '@/features/clinic/lib/vietqr'
import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PaymentMethod } from '@/types/clinic'
import { quickCashAmounts } from '../lib/collect'

const METHODS: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: 'TienMat', label: 'Tiền mặt', icon: Banknote },
  { value: 'ChuyenKhoan', label: 'Chuyển khoản', icon: QrCode },
  { value: 'The', label: 'Thẻ', icon: CreditCard },
]

/** Tên ngân hàng theo mã BIN NAPAS (chỉ để hiển thị) */
const BANK_NAMES: Record<string, string> = {
  '970418': 'BIDV',
  '970436': 'Vietcombank',
  '970415': 'VietinBank',
  '970405': 'Agribank',
  '970422': 'MB Bank',
  '970407': 'Techcombank',
  '970416': 'ACB',
  '970432': 'VPBank',
  '970423': 'TPBank',
  '970403': 'Sacombank',
}

type PaymentMethodFieldsProps = {
  method: PaymentMethod
  onMethodChange: (method: PaymentMethod) => void
  /** Số tiền thu lần này (đã hợp lệ thì mới vẽ QR) */
  amount: number
  cashReceived: number | null
  onCashChange: (value: number | null) => void
  cashError?: string
  /** Nội dung chuyển khoản = mã phiếu thanh toán (07 §3.9) */
  invoiceCode: string
  disabled?: boolean
}

/**
 * Chọn phương thức và nhập tiền (UC-11 bước 4, 4a, 4b): tiền mặt có nút mệnh giá nhanh và tiền thối (BR-24); chuyển
 * khoản hiện QR VietQR giả lập có số tiền, nội dung là mã phiếu thanh toán; thẻ chỉ ghi nhận phương thức.
 */
export function PaymentMethodFields({
  method,
  onMethodChange,
  amount,
  cashReceived,
  onCashChange,
  cashError,
  invoiceCode,
  disabled,
}: PaymentMethodFieldsProps) {
  const profile = useClinicProfile()
  const clinic = profile.data
  const qr = useMemo(() => {
    if (method !== 'ChuyenKhoan' || !clinic?.bankBin || !clinic.bankAccount || amount <= 0) return null
    return buildVietQr({ bankBin: clinic.bankBin, bankAccount: clinic.bankAccount, amount, content: invoiceCode })
  }, [method, clinic, amount, invoiceCode])

  const change = (cashReceived ?? 0) - amount

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Phương thức thanh toán" className="grid grid-cols-3 gap-2">
        {METHODS.map((m) => {
          const active = method === m.value
          return (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onMethodChange(m.value)}
              className={cn(
                'flex h-12 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border text-xs font-medium transition-colors sm:flex-row sm:gap-2 sm:text-sm',
                'focus-visible:ring-ring/50 outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50',
                active ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'
              )}
            >
              <m.icon className="size-4" aria-hidden="true" />
              {m.label}
            </button>
          )
        })}
      </div>

      {method === 'TienMat' && (
        <div className="space-y-2">
          <div className="grid gap-1.5">
            <label htmlFor="cash-received" className="text-sm font-medium">
              Tiền khách đưa
            </label>
            <MoneyInput
              id="cash-received"
              value={cashReceived}
              onValueChange={onCashChange}
              disabled={disabled}
              aria-invalid={!!cashError || undefined}
              aria-describedby="cash-change"
              className="h-11 text-base"
            />
          </div>
          <div className="flex flex-wrap gap-1.5" aria-label="Mệnh giá nhanh">
            {quickCashAmounts(amount).map((v) => (
              <button
                key={v}
                type="button"
                disabled={disabled}
                onClick={() => onCashChange(v)}
                className={cn(
                  'h-9 cursor-pointer rounded-md border px-2.5 text-sm tabular-nums transition-colors',
                  'focus-visible:ring-ring/50 outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50',
                  cashReceived === v ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'
                )}
              >
                {formatVnd(v)}
              </button>
            ))}
          </div>
          <p id="cash-change" role="status" className="text-sm" aria-live="polite">
            {cashError ? (
              <span className="text-destructive flex items-center gap-1 font-medium">
                <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
                {cashError}
              </span>
            ) : amount > 0 ? (
              <span className="bg-success/10 flex items-center justify-between rounded-md px-3 py-2">
                <span className="text-muted-foreground">Tiền thối</span>
                <span className="text-success text-lg font-semibold tabular-nums">{formatVnd(Math.max(0, change))}</span>
              </span>
            ) : null}
          </p>
        </div>
      )}

      {method === 'ChuyenKhoan' && (
        <div className="flex flex-col items-center gap-3 rounded-lg border p-3 sm:flex-row sm:items-start">
          {qr ? (
            <QrImage value={qr} size={164} alt={`Mã QR chuyển khoản ${formatVnd(amount)}, nội dung ${invoiceCode}`} />
          ) : profile.isLoading ? (
            <Skeleton className="size-[164px] rounded-md" />
          ) : (
            <div className="bg-muted text-muted-foreground flex size-[164px] items-center justify-center rounded-md p-3 text-center text-xs">
              {amount > 0 ? 'Chưa cấu hình tài khoản nhận tiền' : 'Nhập số tiền thu hợp lệ để hiện QR'}
            </div>
          )}
          <dl className="min-w-0 flex-1 space-y-1 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Ngân hàng</dt>
              <dd className="font-medium">{clinic ? (BANK_NAMES[clinic.bankBin] ?? clinic.bankBin) : '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Số tài khoản</dt>
              <dd className="font-medium tabular-nums">{clinic?.bankAccount || '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Chủ tài khoản</dt>
              <dd className="text-right font-medium">{clinic?.bankAccountName || '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Số tiền</dt>
              <dd className="font-semibold tabular-nums">{formatVnd(amount)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Nội dung</dt>
              <dd className="font-medium tabular-nums">{toTransferContent(invoiceCode)}</dd>
            </div>
            <p className="text-muted-foreground flex items-start gap-1.5 pt-1 text-xs">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Tài khoản demo, QR giả lập theo chuẩn VietQR, không chuyển được tiền thật. Bệnh nhân chuyển xong thì bấm
              &quot;Đã nhận tiền&quot;.
            </p>
          </dl>
        </div>
      )}

      {method === 'The' && (
        <p className="bg-muted/60 text-muted-foreground flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm">
          <CreditCard className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Quẹt thẻ trên máy POS của ngân hàng. Hệ thống chỉ ghi nhận phương thức Thẻ, không nhập số thẻ.
        </p>
      )}
    </div>
  )
}
