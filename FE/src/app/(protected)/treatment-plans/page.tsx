import { Suspense } from 'react'
import type { Metadata } from 'next'
import { TreatmentPlansPage } from '@/features/treatment-plans/pages/TreatmentPlansPage'

export const metadata: Metadata = { title: 'Kế hoạch điều trị' }

export default function Page() {
  return (
    <Suspense>
      <TreatmentPlansPage />
    </Suspense>
  )
}
