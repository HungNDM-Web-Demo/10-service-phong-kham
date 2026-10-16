import type { Metadata } from 'next'
import { PlanDetailPage } from '@/features/treatment-plans/pages/PlanDetailPage'

export const metadata: Metadata = { title: 'Chi tiết kế hoạch điều trị' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PlanDetailPage key={id} id={id} />
}
