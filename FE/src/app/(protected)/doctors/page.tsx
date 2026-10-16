import type { Metadata } from 'next'
import { DoctorsPage } from '@/features/doctors/pages/DoctorsPage'

export const metadata: Metadata = { title: 'Bác sĩ' }

export default function Page() {
  return <DoctorsPage />
}
