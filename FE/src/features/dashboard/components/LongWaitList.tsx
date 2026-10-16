'use client'

import Link from 'next/link'
import { Smile } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { LongWaitDto } from '@/types/clinic'
import { clinicRules } from '@/features/clinic/lib/rules'
import { WaitBadge } from './WaitBadge'

/**
 * Danh sách lượt đang chờ khám từ 30 phút (FR-02, UC-14 bước 3), lâu nhất lên đầu; mức chờ ghi bằng chữ kèm màu
 * (từ 30 phút vàng, từ 60 phút đỏ — BR-13).
 */
export function LongWaitList({ items, isLoading, queueHref }: { items: LongWaitDto[] | undefined; isLoading: boolean; queueHref: string | null }) {
  if (isLoading || !items)
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  if (items.length === 0)
    return <EmptyState compact icon={Smile} title="Không có bệnh nhân chờ quá 30 phút" description="Danh sách tự cập nhật mỗi 30 giây." />
  return (
    <ul className="divide-y">
      {items.map((w) => {
        const severe = w.waitMinutes >= clinicRules.waitAlertMinutes
        const content = (
          <>
            <span
              className={cn(
                'flex h-9 min-w-16 shrink-0 items-center justify-center rounded-md px-2 font-mono text-sm font-semibold',
                severe ? 'bg-destructive/10 text-destructive' : 'bg-warning/12 text-warning'
              )}
            >
              {w.ticket}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{w.patientName}</span>
              <span className="text-muted-foreground block truncate text-xs">{w.doctorName}</span>
            </span>
            <WaitBadge minutes={w.waitMinutes} />
          </>
        )
        return (
          <li key={w.visitId}>
            {queueHref ? (
              <Link
                href={queueHref}
                className="hover:bg-muted/60 focus-visible:ring-ring/50 flex items-center gap-3 px-4 py-2.5 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-inset"
              >
                {content}
              </Link>
            ) : (
              <div className="flex items-center gap-3 px-4 py-2.5">{content}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
