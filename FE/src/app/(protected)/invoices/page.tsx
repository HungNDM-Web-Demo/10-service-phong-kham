import { Suspense } from 'react'
import type { Metadata } from 'next'
import { InvoicesPage } from '@/features/invoices/pages/InvoicesPage'

export const metadata: Metadata = { title: 'Thu phí' }

export default function Page() {
  return (
    <Suspense>
      <InvoicesPage />
    </Suspense>
  )
}
