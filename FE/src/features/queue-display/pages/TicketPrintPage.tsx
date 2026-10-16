'use client'

import { useSearchParams } from 'next/navigation'
import { ErrorState } from '@/components/shared/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { routePath } from '@/config/route-path'
import { useTicket } from '@/features/clinic/hooks/use-clinic'
import { ReceiptFrame } from '@/features/clinic/components/print/ReceiptFrame'
import { QueueTicketReceipt } from '../components/QueueTicketReceipt'

/** Bản in phiếu số thứ tự 80 mm (SCR-07, UC-05 bước 5). Mở từ hộp tiếp đón kèm `?print=1` thì tự mở hộp in (UC-05 5a: tắt in). */
export function TicketPrintPage({ id }: { id: string }) {
  const params = useSearchParams()
  const ticket = useTicket(id)

  return (
    <ReceiptFrame autoPrint={params.get('print') === '1'} ready={!!ticket.data} backHref={routePath.queue}>
      {ticket.error ? (
        <ErrorState error={ticket.error} title="Không tải được phiếu số thứ tự" onRetry={() => ticket.refetch()} />
      ) : ticket.data ? (
        <QueueTicketReceipt ticket={ticket.data} />
      ) : (
        <div className="space-y-2" aria-busy="true" aria-label="Đang tải phiếu số thứ tự">
          <Skeleton className="mx-auto h-5 w-3/4" />
          <Skeleton className="mx-auto h-4 w-2/3" />
          <Skeleton className="mx-auto h-14 w-1/2" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}
    </ReceiptFrame>
  )
}
