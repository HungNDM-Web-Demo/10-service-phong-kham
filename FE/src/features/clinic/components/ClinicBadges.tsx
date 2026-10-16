import { AlertTriangle, Globe, RotateCcw, Star } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { AppointmentSource, AppointmentStatus, FollowUpStatus, InvoiceStatus, PlanStatus, ReceiptStatus, VisitStatus } from '@/types/clinic'
import {
  appointmentStatusLabels,
  appointmentStatusTones,
  followUpStatusLabels,
  followUpStatusTones,
  invoiceStatusLabels,
  invoiceStatusTones,
  planStatusLabels,
  planStatusTones,
  receiptStatusLabels,
  visitStatusLabels,
  visitStatusTones,
} from '../lib/labels'

/** Huy hiệu trạng thái nghiệp vụ Phòng khám: chữ kèm màu token, không chỉ dựa vào màu. */

export const AppointmentStatusBadge = ({ status, className }: { status: AppointmentStatus; className?: string }) => (
  <StatusBadge tone={appointmentStatusTones[status]} className={className}>
    {appointmentStatusLabels[status]}
  </StatusBadge>
)

export const VisitStatusBadge = ({ status, className }: { status: VisitStatus; className?: string }) => (
  <StatusBadge tone={visitStatusTones[status]} className={className}>
    {visitStatusLabels[status]}
  </StatusBadge>
)

export const PlanStatusBadge = ({ status }: { status: PlanStatus }) => <StatusBadge tone={planStatusTones[status]}>{planStatusLabels[status]}</StatusBadge>

export const InvoiceStatusBadge = ({ status }: { status: InvoiceStatus }) => (
  <StatusBadge tone={invoiceStatusTones[status]}>{invoiceStatusLabels[status]}</StatusBadge>
)

export const ReceiptStatusBadge = ({ status }: { status: ReceiptStatus }) => (
  <StatusBadge tone={status === 'HopLe' ? 'success' : 'neutral'}>{receiptStatusLabels[status]}</StatusBadge>
)

export const FollowUpStatusBadge = ({ status }: { status: FollowUpStatus }) => (
  <StatusBadge tone={followUpStatusTones[status]}>{followUpStatusLabels[status]}</StatusBadge>
)

export const SourceBadge = ({ source }: { source: AppointmentSource }) =>
  source === 'Online' ? (
    <StatusBadge tone="info" dot={false} icon={<Globe className="size-3" aria-hidden="true" />}>
      Online
    </StatusBadge>
  ) : null

/** Ưu tiên (BR-10): trẻ dưới 6 tuổi, người từ 75 tuổi, đối tượng lễ tân bật tay. */
export const PriorityBadge = ({ reason }: { reason: string | null }) => (
  <StatusBadge tone="warning" dot={false} icon={<Star className="size-3" aria-hidden="true" />}>
    {reason ?? 'Ưu tiên'}
  </StatusBadge>
)

export const FollowUpBadge = () => (
  <StatusBadge tone="success" dot={false} icon={<RotateCcw className="size-3" aria-hidden="true" />}>
    Tái khám theo hẹn
  </StatusBadge>
)

/** Tiền sử dị ứng hiện nổi bật màu đỏ (UC-07 1a). */
export const AllergyBadge = ({ allergies }: { allergies: string | null }) =>
  allergies ? (
    <StatusBadge tone="danger" dot={false} icon={<AlertTriangle className="size-3" aria-hidden="true" />}>
      Dị ứng: {allergies}
    </StatusBadge>
  ) : null
