import type { Metadata } from 'next'
import { PatientDetailPage } from '@/features/patients/pages/PatientDetailPage'

export const metadata: Metadata = { title: 'Hồ sơ bệnh nhân' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PatientDetailPage key={id} id={id} />
}
