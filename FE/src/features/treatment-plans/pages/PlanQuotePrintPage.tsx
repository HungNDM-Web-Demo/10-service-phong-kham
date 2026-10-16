'use client'

import { useSearchParams } from 'next/navigation'
import { ErrorState } from '@/components/shared/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { routePath } from '@/config/route-path'
import { ReceiptFrame } from '@/features/clinic/components/print/ReceiptFrame'
import { useClinicProfile, usePlan } from '@/features/clinic/hooks/use-clinic'
import { PlanQuoteSheet } from '../components/PlanQuoteSheet'

/** Bản in báo giá kế hoạch điều trị khổ A5 (SCR-13, UC-10 bước 6). Mở kèm `?print=1` thì tự mở hộp in. */
export function PlanQuotePrintPage({ id }: { id: string }) {
  const params = useSearchParams()
  const plan = usePlan(id)
  const clinic = useClinicProfile()
  const ready = !!plan.data && !clinic.isLoading

  return (
    <ReceiptFrame
      autoPrint={params.get('print') === '1'}
      ready={ready}
      paper="a5"
      backHref={routePath.planDetail(id)}
    >
      {plan.error ? (
        <ErrorState
          error={plan.error}
          title="Không tải được kế hoạch điều trị"
          onRetry={() => void plan.refetch()}
        />
      ) : plan.data ? (
        <PlanQuoteSheet plan={plan.data} clinic={clinic.data} />
      ) : (
        <div className="space-y-3" aria-busy="true" aria-label="Đang tải báo giá">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-16 w-1/2" />
        </div>
      )}
    </ReceiptFrame>
  )
}
