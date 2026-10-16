'use client'

import { vnParts, weekdayLabel } from '@/features/clinic/lib/vn-time'
import { useNow } from '../hooks/use-now'

const pad = (n: number) => String(n).padStart(2, '0')

/** Đồng hồ giờ Việt Nam ở góc màn hình sảnh; tách riêng để chỉ khối này vẽ lại mỗi giây. */
export function DisplayClock() {
  const now = useNow()
  if (!now)
    return (
      <div className="text-right" aria-hidden="true">
        <p className="text-[6.4vh] leading-none font-bold tabular-nums">--:--</p>
        <p className="text-muted-foreground mt-[0.6vh] text-[2.4vh]">&nbsp;</p>
      </div>
    )

  const p = vnParts(now)
  return (
    <div className="text-right">
      <p className="text-[6.4vh] leading-none font-bold tabular-nums">
        <time dateTime={new Date(now).toISOString()}>
          {pad(p.hour)}:{pad(p.minute)}
          <span className="text-muted-foreground text-[3.6vh]">:{pad(Math.floor((now / 1000) % 60))}</span>
        </time>
      </p>
      <p className="text-muted-foreground mt-[0.6vh] text-[2.4vh] font-medium">
        {weekdayLabel(p.isoWeekday)}, {pad(p.day)}/{pad(p.month)}/{p.year}
      </p>
    </div>
  )
}
