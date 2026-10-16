'use client'

import { useCallback, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ReceiptText } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PermissionGuard } from '@/components/shared/PermissionGuard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { permissions } from '@/config/permissions'
import { CancelReceiptDialog, type CancelTarget } from '../components/CancelReceiptDialog'
import { DebtTab } from '../components/DebtTab'
import { InvoiceDialog } from '../components/InvoiceDialog'
import { InvoicesTab } from '../components/InvoicesTab'
import { PendingTab } from '../components/PendingTab'
import { ReceiptDetailDialog } from '../components/ReceiptDetailDialog'
import { ReceiptsTab } from '../components/ReceiptsTab'
import { useLiveInvoices } from '../hooks/use-pending-invoices'

const TABS = [
  { value: 'cho-thu', label: 'Chờ thu' },
  { value: 'con-no', label: 'Còn nợ' },
  { value: 'phieu-thanh-toan', label: 'Phiếu thanh toán' },
  { value: 'phieu-thu', label: 'Phiếu thu' },
] as const
type TabValue = (typeof TABS)[number]['value']
const DEFAULT_TAB: TabValue = 'cho-thu'
const isTab = (v: string | null): v is TabValue => TABS.some((t) => t.value === v)

type DialogState = { id: string | null; open: boolean }
const closed: DialogState = { id: null, open: false }

/**
 * Thu phí (SCR-14; UC-11, UC-12; FR-31…FR-35): tab Chờ thu, Còn nợ, Phiếu thanh toán, Phiếu thu, đồng bộ `?tab=`.
 * Bấm một phiếu để mở hộp chi tiết và thu tiền; tab Phiếu thu cho in lại và hủy phiếu thu (quản lý).
 */
export function InvoicesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const tabParam = params.get('tab')
  const tab: TabValue = isTab(tabParam) ? tabParam : DEFAULT_TAB

  const [invoiceDialog, setInvoiceDialog] = useState<DialogState>(closed)
  const [receiptDialog, setReceiptDialog] = useState<DialogState>(closed)
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null)

  // Đếm phiếu chờ thu cho nhãn tab, tự làm mới cùng nhịp với tab Chờ thu
  const pendingCount = useLiveInvoices({ status: 'ChoThu', page: 1, pageSize: 1 }).data?.totalCount

  const setTab = (value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value === DEFAULT_TAB) next.delete('tab')
    else next.set('tab', value)
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const openInvoice = useCallback((id: string) => setInvoiceDialog({ id, open: true }), [])
  const openReceipt = useCallback((id: string) => setReceiptDialog({ id, open: true }), [])
  const askCancel = useCallback((target: CancelTarget) => setCancelTarget(target), [])

  return (
    <PermissionGuard permission={permissions.invoices.view} redirect>
      <div className="space-y-5">
        <PageHeader
          title="Thu phí"
          icon={ReceiptText}
          description="Thu tiền sau khám bằng tiền mặt, chuyển khoản hoặc thẻ; thu nợ, tra cứu, in lại và hủy phiếu thu."
        />
        <Tabs value={tab} onValueChange={setTab} className="gap-4">
          <div className="-mx-1 overflow-x-auto overflow-y-hidden px-1 pb-1">
            <TabsList className="w-max group-data-horizontal/tabs:h-10">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="min-h-8 px-4">
                  {t.label}
                  {t.value === 'cho-thu' && pendingCount !== undefined && pendingCount > 0 && (
                    <span className="bg-cta text-cta-foreground ml-1 rounded-full px-1.5 text-[0.6875rem] leading-5 font-semibold tabular-nums">
                      {pendingCount}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value="cho-thu">
            <PendingTab onOpen={openInvoice} />
          </TabsContent>
          <TabsContent value="con-no">
            <DebtTab onOpen={openInvoice} initialSearch={params.get('search') ?? undefined} />
          </TabsContent>
          <TabsContent value="phieu-thanh-toan">
            <InvoicesTab onOpen={openInvoice} />
          </TabsContent>
          <TabsContent value="phieu-thu">
            <ReceiptsTab onOpen={openReceipt} onCancel={askCancel} />
          </TabsContent>
        </Tabs>
      </div>

      <InvoiceDialog
        invoiceId={invoiceDialog.id}
        open={invoiceDialog.open}
        onOpenChange={(open) => setInvoiceDialog((s) => ({ ...s, open }))}
      />
      <ReceiptDetailDialog
        receiptId={receiptDialog.id}
        open={receiptDialog.open}
        onOpenChange={(open) => setReceiptDialog((s) => ({ ...s, open }))}
        onOpenInvoice={(id) => {
          setReceiptDialog((s) => ({ ...s, open: false }))
          openInvoice(id)
        }}
        onCancel={askCancel}
      />
      <CancelReceiptDialog receipt={cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)} />
    </PermissionGuard>
  )
}
