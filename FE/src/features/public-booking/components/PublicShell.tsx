'use client'

import Link from 'next/link'
import { MapPin, Phone } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { routePath } from '@/config/route-path'
import { useAssetUrl } from '@/hooks/use-asset-url'
import { usePublicCatalog } from '@/features/clinic/hooks/use-clinic'

/** Khung trang công khai cho khách (SCR-05): logo, tên, địa chỉ, hotline của phòng khám; tối ưu 360–414 px. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  const catalog = usePublicCatalog()
  const shop = catalog.data?.clinic
  const logo = useAssetUrl(shop?.logoUrl ?? '/logo/logo-mark.svg')

  return (
    <div className="bg-background min-h-svh">
      <header className="bg-card border-b">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          <Link href={routePath.booking} className="flex min-w-0 items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo do phòng khám tự tải lên */}
            <img src={logo ?? undefined} alt="" className="size-11 shrink-0 rounded-xl object-contain" />
            <div className="min-w-0">
              {shop ? (
                <p className="line-clamp-2 leading-tight font-semibold">{shop.name}</p>
              ) : (
                <Skeleton className="h-5 w-40" />
              )}
              {shop?.address && (
                <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                  <MapPin className="size-3 shrink-0" aria-hidden="true" />
                  {shop.address}
                </p>
              )}
            </div>
          </Link>
          {shop?.hotline && (
            <a
              href={`tel:${shop.hotline.replace(/\s/g, '')}`}
              aria-label={`Gọi phòng khám ${shop.hotline}`}
              className="text-primary hover:bg-primary/5 focus-visible:ring-ring/50 ml-auto flex min-h-10 shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium outline-none focus-visible:ring-3"
            >
              <Phone className="size-3.5" aria-hidden="true" />
              Gọi<span className="hidden min-[400px]:inline"> phòng khám</span>
            </a>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 pt-4 pb-28">{children}</main>
    </div>
  )
}
