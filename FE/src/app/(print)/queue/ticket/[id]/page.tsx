import { Suspense } from 'react'
import type { Metadata } from 'next'
import { TicketPrintPage } from '@/features/queue-display/pages/TicketPrintPage'

export const metadata: Metadata = { title: 'In phiếu số thứ tự' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense>
      <TicketPrintPage key={id} id={id} />
    </Suspense>
  )
}
