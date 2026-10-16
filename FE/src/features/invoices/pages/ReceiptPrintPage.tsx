'use client'

import { useState } from 'react'
import { ErrorState } from '@/components/shared/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { routePath } from '@/config/route-path'
import { ReceiptFrame } from '@/features/clinic/components/print/ReceiptFrame'
import { useClinicProfile, useReceipt } from '@/features/clinic/hooks/use-clinic'
import { vnNow } from '@/features/clinic/lib/vn-time'
import { ReceiptSheet } from '../components/ReceiptSheet'

/**
 * Bản in phiếu thu khổ A5 (SCR-15; UC-11 bước 5, UC-12 bước 2). `?print=1` (mở từ luồng thu tiền) tự mở hộp in;
 * `?reprint=1` in dòng "IN LẠI".
 */
export function ReceiptPrintPage({ id, reprint, autoPrint }: { id: string; reprint: boolean; autoPrint: boolean }) {
  const receipt = useReceipt(id)
  const profile = useClinicProfile()
  const [printedAt] = useState(vnNow)
  const ready = !!receipt.data && !profile.isLoading

  return (
    <ReceiptFrame autoPrint={autoPrint} ready={ready} paper="a5" backHref={routePath.invoices}>
      {receipt.error && !receipt.data ? (
        <ErrorState error={receipt.error} title="Không tải được phiếu thu" onRetry={() => void receipt.refetch()} />
      ) : receipt.data ? (
        <ReceiptSheet receipt={receipt.data} clinic={profile.data} reprint={reprint} printedAt={printedAt} />
      ) : (
        <div className="space-y-3" aria-busy="true" aria-label="Đang tải phiếu thu">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
    </ReceiptFrame>
  )
}
