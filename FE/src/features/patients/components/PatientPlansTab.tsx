'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import { ClipboardList, ClipboardPlus } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { routePath } from '@/config/route-path'
import { formatVnd } from '@/lib/format'
import type { TreatmentPlanListItem } from '@/types/clinic'
import { PlanStatusBadge } from '@/features/clinic/components/ClinicBadges'
import { usePlans } from '@/features/clinic/hooks/use-clinic'
import { vnDdMmYyyy } from '@/features/clinic/lib/vn-time'
import { PlanProgress } from '@/features/treatment-plans/components/PlanProgress'

/** Tab Kế hoạch điều trị của hồ sơ (UC-07 1a, UC-10 bước 1): tiến độ, đã thu, còn lại. */
export function PatientPlansTab({
  patientId,
  onCreate,
}: {
  patientId: string
  onCreate?: () => void
}) {
  const router = useRouter()
  const plans = usePlans({ patientId, pageSize: 50, sortBy: 'createdAt', sortDir: 'desc' })

  const columns = useMemo<ColumnDef<TreatmentPlanListItem>[]>(
    () => [
      {
        id: 'code',
        header: 'Mã kế hoạch',
        cell: ({ row }) => (
          <div>
            <p className="font-medium tabular-nums">{row.original.code}</p>
            <p className="text-muted-foreground text-xs tabular-nums">
              {vnDdMmYyyy(row.original.createdAt)}
            </p>
          </div>
        ),
      },
      { id: 'doctor', header: 'Bác sĩ', cell: ({ row }) => row.original.doctorName },
      {
        id: 'total',
        header: () => <span className="block text-right">Tổng sau giảm</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <p className="font-medium tabular-nums">{formatVnd(row.original.total)}</p>
            {row.original.discountRate > 0 && (
              <p className="text-muted-foreground text-xs tabular-nums">
                Giảm {row.original.discountRate.toLocaleString('vi-VN')}%
              </p>
            )}
          </div>
        ),
      },
      {
        id: 'progress',
        header: 'Tiến độ',
        cell: ({ row }) => (
          <PlanProgress done={row.original.doneCount} total={row.original.itemCount} />
        ),
      },
      {
        id: 'paid',
        header: () => <span className="block text-right">Đã thu</span>,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">
            {formatVnd(row.original.paidAmount)}
          </span>
        ),
      },
      {
        id: 'remaining',
        header: () => <span className="block text-right">Còn lại</span>,
        cell: ({ row }) => (
          <span className="block text-right font-medium tabular-nums">
            {formatVnd(row.original.remaining)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <PlanStatusBadge status={row.original.status} />,
      },
    ],
    []
  )

  return (
    <div className="space-y-3">
      {onCreate && (
        <div className="flex justify-end">
          <Button onClick={onCreate}>
            <ClipboardPlus aria-hidden="true" />
            Lập kế hoạch điều trị
          </Button>
        </div>
      )}
      <DataTable
        columns={columns}
        data={plans.data?.items}
        getRowId={(p) => p.id}
        isLoading={plans.isLoading}
        isFetching={plans.isFetching}
        error={plans.error}
        onRetry={() => void plans.refetch()}
        onRowClick={(p) => router.push(routePath.planDetail(p.id))}
        minWidth={820}
        emptyState={
          <EmptyState
            icon={ClipboardList}
            title="Chưa có kế hoạch điều trị"
            description="Bác sĩ lập kế hoạch nhiều buổi kèm báo giá cho bệnh nhân."
            compact
          />
        }
      />
    </div>
  )
}
