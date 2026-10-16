'use client'

import Link from 'next/link'
import { Ban, FileText, Info, Printer } from 'lucide-react'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { permissions } from '@/config/permissions'
import { ReceiptStatusBadge } from '@/features/clinic/components/ClinicBadges'
import { useReceipt } from '@/features/clinic/hooks/use-clinic'
import { paymentMethodLabels } from '@/features/clinic/lib/labels'
import { vnDateKey, vnHhmmDate, vnToday } from '@/features/clinic/lib/vn-time'
import { usePermissions } from '@/hooks/use-permissions'
import { formatPhone, formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ReceiptDto } from '@/types/clinic'
import { receiptPrintUrl } from '../lib/print-url'
import type { CancelTarget } from './CancelReceiptDialog'

type ReceiptDetailDialogProps = {
  receiptId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenInvoice: (invoiceId: string) => void
  onCancel: (target: CancelTarget) => void
}

/** Chi tiết phiếu thu (UC-12 bước 2–3): in lại (dòng "IN LẠI"), hủy phiếu lập hôm nay khi có quyền `invoices.cancel`. */
export function ReceiptDetailDialog({ receiptId, open, onOpenChange, onOpenInvoice, onCancel }: ReceiptDetailDialogProps) {
  const query = useReceipt(receiptId)
  const r = query.data
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b px-5 py-4 pr-12 sm:px-6">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Phiếu thu {r?.code ?? ''}
            {r && <ReceiptStatusBadge status={r.status} />}
          </DialogTitle>
          <DialogDescription>{r ? `Lập lúc ${vnHhmmDate(r.collectedAt)} bởi ${r.collectedByName}` : 'Đang tải phiếu thu…'}</DialogDescription>
        </DialogHeader>
        {query.isLoading ? (
          <div className="space-y-3 p-6" aria-busy="true">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : query.error && !r ? (
          <ErrorState error={query.error} title="Không tải được phiếu thu" onRetry={() => void query.refetch()} />
        ) : r ? (
          <ReceiptBody receipt={r} onOpenInvoice={onOpenInvoice} onCancel={onCancel} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function ReceiptBody({
  receipt: r,
  onOpenInvoice,
  onCancel,
}: {
  receipt: ReceiptDto
  onOpenInvoice: (invoiceId: string) => void
  onCancel: (target: CancelTarget) => void
}) {
  const { can } = usePermissions()
  const canCancelRole = can(permissions.invoices.cancel)
  const isValid = r.status === 'HopLe'
  const isToday = vnDateKey(r.collectedAt) === vnToday()
  const canCancel = canCancelRole && isValid && r.canCancel

  return (
    <>
      <div className="max-h-[calc(100svh-14rem)] space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Item label="Bệnh nhân" value={`${r.patient.fullName} (${r.patient.code})`} />
          <Item label="Số điện thoại" value={formatPhone(r.patient.phone)} />
          <Item label="Bác sĩ" value={r.doctorName} />
          <Item label="Lượt khám" value={r.visitCode} mono />
          <Item label="Phiếu thanh toán" value={r.invoiceCode} mono />
          <Item label="Phương thức" value={paymentMethodLabels[r.method]} />
        </dl>

        <div className="bg-muted/40 space-y-1.5 rounded-lg border p-3 text-sm">
          <Line label="Tổng phải thu của phiếu" value={formatVnd(r.invoiceTotal)} />
          <Line label="Thu lần này" value={formatVnd(r.amount)} strong struck={!isValid} />
          {r.cashReceived !== null && <Line label="Tiền khách đưa" value={formatVnd(r.cashReceived)} />}
          {r.changeAmount !== null && <Line label="Tiền thối" value={formatVnd(r.changeAmount)} />}
          <Line label="Đã thu tới phiếu này" value={formatVnd(r.paidToDate)} />
          <Line label="Còn nợ sau phiếu này" value={formatVnd(r.debtAfter)} strong />
          {r.partialReason && <p className="text-muted-foreground pt-1 text-xs">Lý do thu một phần: {r.partialReason}</p>}
        </div>

        {r.status === 'DaHuy' && (
          <p className="bg-destructive/10 text-destructive rounded-lg px-3 py-2.5 text-sm">
            Đã hủy {r.cancelledAt ? `lúc ${vnHhmmDate(r.cancelledAt)}` : ''}
            {r.cancelledByName ? ` bởi ${r.cancelledByName}` : ''}. Lý do: {r.cancelReason ?? '—'}
          </p>
        )}

        {canCancelRole && isValid && !canCancel && (
          <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {isToday ? 'Phiếu thu này không hủy được ở trạng thái hiện tại.' : 'Chỉ hủy được phiếu thu lập trong hôm nay (BR-27).'}
          </p>
        )}
      </div>
      <DialogFooter className="border-t px-5 py-3 sm:px-6">
        <Button variant="ghost" onClick={() => onOpenInvoice(r.invoiceId)}>
          <FileText aria-hidden="true" />
          Xem phiếu thanh toán
        </Button>
        {canCancelRole && isValid && (
          <Button variant="destructive" disabled={!canCancel} onClick={() => onCancel({ id: r.id, code: r.code, amount: r.amount })}>
            <Ban aria-hidden="true" />
            Hủy phiếu thu
          </Button>
        )}
        <Button asChild>
          <Link href={receiptPrintUrl(r.id, { reprint: true })}>
            <Printer aria-hidden="true" />
            In lại
          </Link>
        </Button>
      </DialogFooter>
    </>
  )
}

function Item({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 sm:block">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={cn('font-medium', mono && 'font-mono text-[0.8125rem]')}>{value}</dd>
    </div>
  )
}

function Line({ label, value, strong, struck }: { label: string; value: string; strong?: boolean; struck?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={cn('text-muted-foreground', strong && 'text-foreground font-medium')}>{label}</span>
      <span className={cn('tabular-nums', strong && 'font-semibold', struck && 'text-muted-foreground line-through')}>{value}</span>
    </div>
  )
}
