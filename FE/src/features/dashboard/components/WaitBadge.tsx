import { AlertTriangle, Clock } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { clinicRules } from '@/features/clinic/lib/rules'
import { formatNumber } from '@/lib/format'

/**
 * Số phút chờ kèm mức cảnh báo bằng chữ (BR-13, FR-15): từ 30 phút "Chờ lâu" (vàng), từ 60 phút "Chờ rất lâu" (đỏ).
 * `plain`: dưới 30 phút chỉ hiện chữ, không có nền.
 */
export function WaitBadge({ minutes, plain }: { minutes: number; plain?: boolean }) {
  const text = `${formatNumber(minutes, 0)} phút`
  if (minutes >= clinicRules.waitAlertMinutes)
    return (
      <StatusBadge tone="danger" dot={false} icon={<AlertTriangle className="size-3" aria-hidden="true" />}>
        {text} · Chờ rất lâu
      </StatusBadge>
    )
  if (minutes >= clinicRules.waitWarnMinutes)
    return (
      <StatusBadge tone="warning" dot={false} icon={<Clock className="size-3" aria-hidden="true" />}>
        {text} · Chờ lâu
      </StatusBadge>
    )
  return plain ? <span className="text-sm tabular-nums">{text}</span> : <StatusBadge tone="neutral">{text}</StatusBadge>
}
