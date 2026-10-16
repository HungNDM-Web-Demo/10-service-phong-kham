'use client'

import { useAssetUrl } from '@/hooks/use-asset-url'
import { cn, getInitials } from '@/lib/utils'

/** Ảnh bác sĩ (UC-03 bước 3); chưa có ảnh thì hiện chữ viết tắt trên nền màu chính nhạt. */
export function DoctorAvatar({ photoUrl, name, className }: { photoUrl: string | null; name: string; className?: string }) {
  const src = useAssetUrl(photoUrl)
  return (
    <span
      className={cn('bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold', className)}
      aria-hidden="true"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- ảnh do phòng khám tự tải lên (idb:// hoặc /uploads)
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </span>
  )
}
