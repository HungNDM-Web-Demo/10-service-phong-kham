import { Suspense } from 'react'
import type { Metadata } from 'next'
import { QueueDisplayPage } from '@/features/queue-display/pages/QueueDisplayPage'

export const metadata: Metadata = { title: 'Màn hình gọi số' }

export default function Page() {
  return (
    <Suspense>
      <QueueDisplayPage />
    </Suspense>
  )
}
