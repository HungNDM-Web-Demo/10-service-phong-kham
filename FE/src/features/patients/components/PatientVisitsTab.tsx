'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lock, Stethoscope } from 'lucide-react'
import { DataTablePagination } from '@/components/shared/DataTablePagination'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { permissions } from '@/config/permissions'
import { routePath } from '@/config/route-path'
import { usePermissions } from '@/hooks/use-permissions'
import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { VisitSummaryDto } from '@/types/clinic'
import { InvoiceStatusBadge, VisitStatusBadge } from '@/features/clinic/components/ClinicBadges'
import { useVisits } from '@/features/clinic/hooks/use-clinic'
import { ddmmyyyy, vnHhmm } from '@/features/clinic/lib/vn-time'

/**
 * Tab Lượt khám (UC-07 1b, FR-21): dòng thời gian các lượt khám. Lễ tân chỉ thấy ngày, bác sĩ, dịch vụ, số tiền; bác sĩ thấy
 * thêm chẩn đoán, kết quả cận lâm sàng, đơn thuốc, lời dặn (BR-32, máy chủ ghi nhật ký người xem).
 */
export function PatientVisitsTab({ patientId }: { patientId: string }) {
  const { can } = usePermissions()
  const canMedical = can(permissions.medicalRecords.view)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const visits = useVisits({ patientId, withMedical: true, page, pageSize })

  if (visits.error)
    return (
      <ErrorState
        error={visits.error}
        onRetry={() => void visits.refetch()}
        className="bg-card rounded-xl border"
      />
    )

  return (
    <div className="space-y-3">
      {!canMedical && (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Lock className="size-4 shrink-0" aria-hidden="true" />
          Chẩn đoán, kết quả cận lâm sàng, đơn thuốc chỉ hiện với bác sĩ.
        </p>
      )}
      {visits.isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : !visits.data || visits.data.items.length === 0 ? (
        <div className="bg-card rounded-xl border">
          <EmptyState
            icon={Stethoscope}
            title="Chưa có lượt khám"
            description="Lượt khám hiện ở đây sau khi bệnh nhân được tiếp đón."
          />
        </div>
      ) : (
        <>
          <ol
            className={cn('space-y-3 transition-opacity', visits.isFetching && 'opacity-60')}
            aria-label="Lịch sử lượt khám"
          >
            {visits.data.items.map((v) => (
              <VisitCard key={v.id} visit={v} />
            ))}
          </ol>
          <div className="bg-card rounded-xl border">
            <DataTablePagination
              page={visits.data.page}
              pageSize={visits.data.pageSize}
              totalCount={visits.data.totalCount}
              totalPages={visits.data.totalPages}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s)
                setPage(1)
              }}
              pageSizeOptions={[10, 20, 50]}
            />
          </div>
        </>
      )}
    </div>
  )
}

function VisitCard({ visit: v }: { visit: VisitSummaryDto }) {
  const medical = [
    { label: 'Chẩn đoán', value: v.diagnoses },
    { label: 'Kết quả cận lâm sàng', value: v.results },
    { label: 'Đơn thuốc', value: v.prescription },
    { label: 'Lời dặn', value: v.advice },
  ].filter((x) => !!x.value)

  return (
    <li className="bg-card relative rounded-xl border p-4 shadow-xs">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold tabular-nums">{ddmmyyyy(v.date)}</span>
            <span className="text-muted-foreground text-sm tabular-nums">
              {vnHhmm(v.checkedInAt)}
            </span>
            <Link
              href={routePath.visitDetail(v.id)}
              className="text-primary text-sm font-medium tabular-nums underline-offset-4 hover:underline"
            >
              {v.code}
            </Link>
            <VisitStatusBadge status={v.status} />
          </div>
          <p className="text-muted-foreground text-sm">
            {v.doctorName} · {v.specialtyName}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:flex-col sm:items-end">
          <span className="font-semibold tabular-nums">
            {v.total === null ? '—' : formatVnd(v.total)}
          </span>
          {v.invoiceStatus && <InvoiceStatusBadge status={v.invoiceStatus} />}
        </div>
      </div>
      <dl className="mt-3 grid gap-2 text-sm">
        <div className="grid gap-0.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3">
          <dt className="text-muted-foreground">Dịch vụ</dt>
          <dd>{v.services || 'Khám bệnh'}</dd>
        </div>
        {medical.map((m) => (
          <div key={m.label} className="grid gap-0.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3">
            <dt className="text-muted-foreground">{m.label}</dt>
            <dd className="whitespace-pre-line">{m.value}</dd>
          </div>
        ))}
      </dl>
    </li>
  )
}
