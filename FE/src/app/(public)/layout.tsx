import type { Metadata } from 'next'
import { PublicShell } from '@/features/public-booking/components/PublicShell'

/** Trang bệnh nhân công khai (SCR-05): không AuthGuard, không sidebar, không lập chỉ mục. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>
}
