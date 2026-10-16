import type { Metadata } from 'next'

/**
 * Màn hình công khai toàn màn hình cho TV ở sảnh (SCR-08): không đăng nhập (không AuthGuard), không sidebar, không lập chỉ mục.
 * Luôn dùng bộ màu tối của theme để tương phản cao, ít chói khi xem từ xa (NFR-03).
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function DisplayLayout({ children }: { children: React.ReactNode }) {
  return <div className="dark bg-background text-foreground h-svh overflow-hidden">{children}</div>
}
