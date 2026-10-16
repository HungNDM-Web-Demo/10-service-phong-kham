'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Ban, CheckCircle2, Eye, Printer, Stethoscope, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { permissions } from '@/config/permissions'
import { routePath } from '@/config/route-path'
import { InvoiceStatusBadge, ReceiptStatusBadge } from '@/features/clinic/components/ClinicBadges'
import { useInvoice } from '@/features/clinic/hooks/use-clinic'
import { genderLabels, paymentMethodLabels } from '@/features/clinic/lib/labels'
import { vnHhmmDate } from '@/features/clinic/lib/vn-time'
import { usePermissions } from '@/hooks/use-permissions'
import { formatPhone, formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { InvoiceDto, ReceiptDto } from '@/types/clinic'
import { computeTotals, newRequestId, outsideIdsOf, type InvoiceTotals } from '../lib/collect'
import { receiptPrintUrl } from '../lib/print-url'
import { CollectPanel } from './CollectPanel'
import { InvoiceLinesTable } from './InvoiceLinesTable'

type InvoiceDialogProps = {
  invoiceId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Chi tiết phiếu thanh toán và thu tiền (SCR-14; UC-11, UC-12): dòng phí, tick thuốc mua ngoài, tổng, phiếu thu đã lập,
 * công nợ cũ của bệnh nhân; khối thu tiền bên phải khi phiếu còn phải thu và có quyền `invoices.collect`.
 */
export function InvoiceDialog({ invoiceId, open, onOpenChange }: InvoiceDialogProps) {
  const query = useInvoice(invoiceId)
  const invoice = query.data
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100svh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-5xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b px-5 py-4 pr-12 sm:px-6">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Phiếu thanh toán {invoice?.code ?? ''}
            {invoice && <InvoiceStatusBadge status={invoice.status} />}
          </DialogTitle>
          <DialogDescription>
            {invoice
              ? `Lượt khám ${invoice.visitCode} · lập lúc ${vnHhmmDate(invoice.createdAt)}`
              : 'Đang tải các dòng phí của lượt khám…'}
          </DialogDescription>
        </DialogHeader>
        {query.isLoading ? (
          <div className="space-y-3 p-6" aria-busy="true">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : query.error && !invoice ? (
          <ErrorState error={query.error} title="Không tải được phiếu thanh toán" onRetry={() => void query.refetch()} />
        ) : invoice ? (
          <InvoiceBody key={invoice.id} invoice={invoice} onRefetch={() => void query.refetch()} onClose={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function InvoiceBody({ invoice, onRefetch, onClose }: { invoice: InvoiceDto; onRefetch: () => void; onClose: () => void }) {
  const router = useRouter()
  const { can } = usePermissions()
  const [clientRequestId] = useState(newRequestId)
  const [outsideOverride, setOutsideOverride] = useState<Set<string> | null>(null)

  const canCollect = can(permissions.invoices.collect) && invoice.canCollect
  const canToggle = canCollect && invoice.canEditOutside
  const outside = outsideOverride ?? outsideIdsOf(invoice.lines)
  const totals = computeTotals(invoice.lines, outside)
  const outsideLineIds = invoice.lines.filter((l) => l.kind === 'Thuoc' && outside.has(l.id)).map((l) => l.id)

  const toggle = (lineId: string, checked: boolean) => {
    const next = new Set(outside)
    if (checked) next.add(lineId)
    else next.delete(lineId)
    setOutsideOverride(next)
  }

  const done = (receipt: ReceiptDto, printNow: boolean) => {
    const printUrl = receiptPrintUrl(receipt.id, { print: true })
    toast.success(`Đã thu ${formatVnd(receipt.amount)}, phiếu thu ${receipt.code}`, {
      description: receipt.debtAfter > 0 ? `Còn nợ ${formatVnd(receipt.debtAfter)}` : 'Phiếu thanh toán đã thu đủ',
      action: printNow ? undefined : { label: 'In phiếu thu', onClick: () => router.push(printUrl) },
      duration: printNow ? 4000 : 10_000,
    })
    onClose()
    if (printNow) router.push(printUrl)
  }

  const lockedReason = !invoice.canCollect
    ? null
    : !can(permissions.invoices.collect)
      ? 'Bạn không có quyền đánh dấu thuốc mua ngoài.'
      : !invoice.canEditOutside
        ? 'Phiếu đã có phiếu thu nên không đổi được thuốc mua ngoài (BR-26).'
        : null

  return (
    <div className="grid max-h-[calc(100svh-8.5rem)] overflow-y-auto lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-hidden">
      <div className="space-y-4 px-5 py-4 sm:px-6 lg:max-h-[calc(100svh-8.5rem)] lg:overflow-y-auto">
        <PatientStrip invoice={invoice} canViewPatient={can(permissions.patients.view)} />

        {invoice.patientOtherDebt > 0 && (
          <div className="border-warning/40 bg-warning/10 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm" role="note">
            <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              Cảnh báo: bệnh nhân còn nợ <span className="font-semibold tabular-nums">{formatVnd(invoice.patientOtherDebt)}</span> ở phiếu
              thanh toán khác. Thu nợ ở tab &quot;Còn nợ&quot;.
            </p>
          </div>
        )}

        <section className="space-y-2" aria-labelledby="invoice-lines-title">
          <h3 id="invoice-lines-title" className="text-sm font-semibold">
            Các khoản phải trả
          </h3>
          <InvoiceLinesTable lines={invoice.lines} outside={outside} canToggle={canToggle} onToggle={toggle} lockedReason={lockedReason} />
        </section>

        <TotalsSummary invoice={invoice} totals={totals} />

        {invoice.receipts.length > 0 && (
          <section className="space-y-2" aria-labelledby="invoice-receipts-title">
            <h3 id="invoice-receipts-title" className="text-sm font-semibold">
              Phiếu thu đã lập ({invoice.receipts.length})
            </h3>
            <ul className="divide-y rounded-lg border">
              {invoice.receipts.map((r) => (
                <li key={r.id} className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm', r.status === 'DaHuy' && 'bg-muted/40')}>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-medium">{r.code}</span>
                      <ReceiptStatusBadge status={r.status} />
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {vnHhmmDate(r.collectedAt)} · {paymentMethodLabels[r.method]} · {r.collectedByName}
                      {r.cancelReason ? ` · Lý do hủy: ${r.cancelReason}` : ''}
                    </p>
                  </div>
                  <span className={cn('font-semibold tabular-nums', r.status === 'DaHuy' && 'text-muted-foreground line-through')}>
                    {formatVnd(r.amount)}
                  </span>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={receiptPrintUrl(r.id, { reprint: true })}>
                      <Printer aria-hidden="true" />
                      In lại
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside
        className="bg-muted/30 border-t px-5 py-4 sm:px-6 lg:max-h-[calc(100svh-8.5rem)] lg:overflow-y-auto lg:border-t-0 lg:border-l"
        aria-label="Thu tiền"
      >
        {canCollect ? (
          <>
            <h3 className="mb-3 text-sm font-semibold">{invoice.paid > 0 ? 'Thu nợ' : 'Thu tiền'}</h3>
            <CollectPanel
              invoice={invoice}
              totals={totals}
              outsideLineIds={outsideLineIds}
              clientRequestId={clientRequestId}
              onConflict={() => {
                setOutsideOverride(null)
                onRefetch()
              }}
              onDone={done}
            />
          </>
        ) : (
          <ReadOnlyNotice invoice={invoice} />
        )}
      </aside>
    </div>
  )
}

function PatientStrip({ invoice, canViewPatient }: { invoice: InvoiceDto; canViewPatient: boolean }) {
  const p = invoice.patient
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-3 py-2.5">
      <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
        <UserRound className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{p.fullName}</p>
        <p className="text-muted-foreground text-xs">
          {p.code} · {genderLabels[p.gender]}, {p.age} tuổi · {formatPhone(p.phone)}
        </p>
      </div>
      <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
        <Stethoscope className="size-4" aria-hidden="true" />
        {invoice.doctorName}
      </p>
      {canViewPatient && (
        <Button asChild variant="outline" size="sm">
          <Link href={routePath.patientDetail(p.id)}>Hồ sơ bệnh nhân</Link>
        </Button>
      )}
    </div>
  )
}

function TotalsSummary({ invoice, totals }: { invoice: InvoiceDto; totals: InvoiceTotals }) {
  const debt = Math.max(0, totals.total - invoice.paid)
  const changed = totals.total !== invoice.total
  return (
    <dl className="bg-card ml-auto w-full space-y-1.5 rounded-lg border p-3 text-sm sm:max-w-sm">
      <Row label="Khám, dịch vụ" value={formatVnd(totals.total - totals.medicineTotal)} />
      <Row label="Tiền thuốc (lấy tại quầy)" value={formatVnd(totals.medicineTotal)} />
      {totals.outsideTotal > 0 && <Row label="Thuốc mua ngoài (không tính)" value={formatVnd(totals.outsideTotal)} muted />}
      <div className="border-t pt-1.5">
        <Row
          label={changed ? 'Phải thu (đã tính lại)' : 'Phải thu'}
          value={formatVnd(totals.total)}
          strong
          sub={changed ? `Trước khi đổi: ${formatVnd(invoice.total)}` : undefined}
        />
      </div>
      <Row label="Đã thu" value={formatVnd(invoice.paid)} />
      <Row label="Còn nợ" value={formatVnd(debt)} strong tone={debt > 0 && invoice.paid > 0 ? 'destructive' : undefined} />
    </dl>
  )
}

function Row({
  label,
  value,
  strong,
  muted,
  sub,
  tone,
}: {
  label: string
  value: string
  strong?: boolean
  muted?: boolean
  sub?: string
  tone?: 'destructive'
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={cn('text-muted-foreground', strong && 'text-foreground font-medium')}>
        {label}
        {sub && <span className="text-muted-foreground block text-xs font-normal">{sub}</span>}
      </dt>
      <dd
        className={cn(
          'tabular-nums',
          strong && 'text-base font-semibold',
          muted && 'text-muted-foreground line-through',
          tone === 'destructive' && 'text-destructive'
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function ReadOnlyNotice({ invoice }: { invoice: InvoiceDto }) {
  if (invoice.status === 'DaThuDu')
    return (
      <p className="bg-success/10 text-success flex items-start gap-2 rounded-lg px-3 py-3 text-sm font-medium">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Phiếu đã thu đủ. In lại phiếu thu ở mục &quot;Phiếu thu đã lập&quot;.
      </p>
    )
  if (invoice.status === 'DaHuy')
    return (
      <p className="bg-muted text-muted-foreground flex items-start gap-2 rounded-lg px-3 py-3 text-sm">
        <Ban className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Phiếu đã hủy do bác sĩ mở lại phiếu khám{invoice.cancelledAt ? ` lúc ${vnHhmmDate(invoice.cancelledAt)}` : ''}. Phiếu mới được lập
        khi bác sĩ kết thúc khám lần sau.
      </p>
    )
  return (
    <p className="bg-muted text-muted-foreground flex items-start gap-2 rounded-lg px-3 py-3 text-sm">
      <Eye className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      Bạn chỉ có quyền xem phiếu thanh toán. Thu tiền cần quyền &quot;Thu tiền&quot; (lễ tân, quản lý).
    </p>
  )
}
