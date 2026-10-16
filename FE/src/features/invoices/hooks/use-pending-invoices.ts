'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { clinicKeys } from '@/features/clinic/hooks/use-clinic'
import { invoiceService } from '@/features/clinic/services/clinic.service'
import type { InvoiceQuery } from '@/types/clinic'

/** Tab "Chờ thu" tự làm mới mỗi 15 giây để thấy ngay phiếu bác sĩ vừa kết thúc khám (UC-11 bước 1). */
export const PENDING_REFRESH_MS = 15_000

/**
 * Danh sách phiếu thanh toán có tự làm mới. Dùng chung khóa `clinicKeys.invoices` với `useInvoices` nên thu tiền xong
 * (invalidate nhóm 'clinic') danh sách cũng cập nhật.
 */
export const useLiveInvoices = (q: InvoiceQuery, refetchMs = PENDING_REFRESH_MS) =>
  useQuery({
    queryKey: clinicKeys.invoices(q),
    queryFn: () => invoiceService.getList(q),
    placeholderData: keepPreviousData,
    refetchInterval: refetchMs,
  })
