import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PlanQuotePrintPage } from '@/features/treatment-plans/pages/PlanQuotePrintPage'

export const metadata: Metadata = { title: 'In báo giá kế hoạch điều trị' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense>
      <PlanQuotePrintPage key={id} id={id} />
    </Suspense>
  )
}
