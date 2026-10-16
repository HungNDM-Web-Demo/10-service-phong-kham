import type { Metadata } from 'next'
import { PatientsPage } from '@/features/patients/pages/PatientsPage'

export const metadata: Metadata = { title: 'Bệnh nhân' }

export default function Page() {
  return <PatientsPage />
}
