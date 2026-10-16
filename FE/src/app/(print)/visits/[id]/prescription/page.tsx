import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PrescriptionPrintPage } from '@/features/visits/pages/PrescriptionPrintPage'

export const metadata: Metadata = { title: 'In đơn thuốc' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense>
      <PrescriptionPrintPage key={id} id={id} />
    </Suspense>
  )
}
