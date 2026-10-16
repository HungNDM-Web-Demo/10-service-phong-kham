import type { Metadata } from 'next'
import { FollowUpsPage } from '@/features/follow-ups/pages/FollowUpsPage'

export const metadata: Metadata = { title: 'Nhắc tái khám' }

export default function Page() {
  return <FollowUpsPage />
}
