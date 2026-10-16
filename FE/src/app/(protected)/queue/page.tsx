import { Suspense } from 'react'
import type { Metadata } from 'next'
import { QueuePage } from '@/features/queue/pages/QueuePage'

export const metadata: Metadata = { title: 'Tiếp đón & hàng chờ' }

export default function Page() {
  return (
    <Suspense>
      <QueuePage />
    </Suspense>
  )
}
