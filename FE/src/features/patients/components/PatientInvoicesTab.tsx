'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { HandCoins, Lock, ReceiptText } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { permissions } from '@/config/permissions'
import { routePath } from '@/config/route-path'
import { usePermissions } from '@/hooks/use-permissions'
import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { InvoiceListItem, PatientDto } from '@/types/clinic'
import { InvoiceStatusBadge } from '@/features/clinic/components/ClinicBadges'
import { useInvoices } from '@/features/clinic/hooks/use-clinic'
import { vnDdMmYyyy } from '@/features/clinic/lib/vn-time'

/** Tab Thanh toán của hồ sơ (UC-07 1a, FR-33): phiếu thanh toán, đã thu, công nợ còn lại. */
export function PatientInvoicesTab({
  patient,
  debtInvoiceCount,
}: {
  patient: PatientDto
  debtInvoiceCount: number
}) {
  const { can } = usePermissions()
  const allowed = can(permissions.invoices.view)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const invoices = useInvoices(
    { patientId: patient.id, page, pageSize, sortBy: 'createdAt', sortDir: 'desc' },
    allowed
  )

  const columns = useMemo<ColumnDef<InvoiceListItem>[]>(
    () => [
      {
        id: 'code',
        header: 'Phiếu thanh toán',
        cell: ({ row }) => (
          <div className="tabular-nums">
            <p className="font-medium">{row.original.code}</p>
            <p className="text-muted-foreground text-xs">{vnDdMmYyyy(row.original.createdAt)}</p>
          </div>
        ),
      },
      {
        id: 'visit',
        header: 'Lượt khám',
        cell: ({ row }) => (
          <Link
            href={routePath.visitDetail(row.original.visitId)}
            className="text-primary font-medium tabular-nums underline-offset-4 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.visitCode}
          </Link>
        ),
      },
      { id: 'doctor', header: 'Bác sĩ', cell: ({ row }) => row.original.doctorName },
      {
        id: 'total',
        header: () => <span className="block text-right">Phải thu</span>,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">{formatVnd(row.original.total)}</span>
        ),
      },
      {
        id: 'paid',
        header: () => <span className="block text-right">Đã thu</span>,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">{formatVnd(row.original.paid)}</span>
        ),
      },
      {
        id: 'debt',
        header: () => <span className="block text-right">Còn nợ</span>,
        cell: ({ row }) => (
          <span
            className={cn(
              'block text-right tabular-nums',
              row.original.debt > 0 ? 'text-destructive font-semibold' : 'text-muted-foreground'
            )}
          >
            {row.original.debt > 0 ? formatVnd(row.original.debt) : '—'}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} />,
      },
    ],
    []
  )

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between',
          patient.debt > 0 ? 'border-destructive/30 bg-destructive/5' : 'bg-card'
        )}
      >
        <div>
          <p className="text-muted-foreground text-sm">Công nợ hiện tại</p>
          <p
            className={cn(
              'text-2xl font-semibold tabular-nums',
              patient.debt > 0 && 'text-destructive'
            )}
          >
            {formatVnd(patient.debt)}
          </p>
          {patient.debt > 0 && (
            <p className="text-muted-foreground text-sm">
              {debtInvoiceCount} phiếu thanh toán chưa thu đủ
            </p>
          )}
        </div>
        {patient.debt > 0 && can(permissions.invoices.collect) && (
          <Button asChild variant="cta">
            <Link href={`${routePath.invoices}?tab=con-no&search=${encodeURIComponent(patient.code)}`}>
              <HandCoins aria-hidden="true" />
              Thu nợ tại Thu phí
            </Link>
          </Button>
        )}
      </div>

      {!allowed ? (
        <div className="bg-card rounded-xl border">
          <EmptyState
            icon={Lock}
            title="Không có quyền xem phiếu thanh toán"
            description="Lễ tân, quản lý xem chi tiết phiếu tại màn hình Thu phí."
            compact
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={invoices.data?.items}
          getRowId={(i) => i.id}
          isLoading={invoices.isLoading}
          isFetching={invoices.isFetching}
          error={invoices.error}
          onRetry={() => void invoices.refetch()}
          minWidth={760}
          pagination={
            invoices.data && {
              page: invoices.data.page,
              pageSize: invoices.data.pageSize,
              totalCount: invoices.data.totalCount,
              totalPages: invoices.data.totalPages,
              onPageChange: setPage,
              onPageSizeChange: (s) => {
                setPageSize(s)
                setPage(1)
              },
              pageSizeOptions: [10, 20, 50],
            }
          }
          emptyState={<EmptyState icon={ReceiptText} title="Chưa có phiếu thanh toán" compact />}
        />
      )}
    </div>
  )
}
