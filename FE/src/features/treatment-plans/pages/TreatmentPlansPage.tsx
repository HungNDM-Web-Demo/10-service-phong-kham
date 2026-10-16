'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import { ClipboardList, Plus } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { PermissionGuard } from '@/components/shared/PermissionGuard'
import { SearchInput } from '@/components/shared/SearchInput'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { permissions } from '@/config/permissions'
import { routePath } from '@/config/route-path'
import { usePermissions } from '@/hooks/use-permissions'
import { useTableQuery } from '@/hooks/use-table-query'
import { formatPhone, formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PlanStatus, TreatmentPlanListItem } from '@/types/clinic'
import { PlanStatusBadge } from '@/features/clinic/components/ClinicBadges'
import { usePlans } from '@/features/clinic/hooks/use-clinic'
import { planStatusLabels } from '@/features/clinic/lib/labels'
import { vnDdMmYyyy } from '@/features/clinic/lib/vn-time'
import { PlanFormDialog } from '../components/PlanFormDialog'
import { PlanProgress } from '../components/PlanProgress'
import { formatRate } from '../lib/plan-calc'

const STATUSES: PlanStatus[] = ['Nhap', 'ChoDuyet', 'DaBaoGia', 'DangDieuTri', 'HoanThanh', 'DaHuy']
const isStatus = (v: string | null): v is PlanStatus => !!v && (STATUSES as string[]).includes(v)

/**
 * Danh sách kế hoạch điều trị (SCR-13, UC-10): lọc trạng thái (hỗ trợ `?status=ChoDuyet` từ Tổng quan), tìm theo mã,
 * bệnh nhân; tiến độ, đã thu, còn lại. Bác sĩ lập kế hoạch mới (FR-28).
 */
export function TreatmentPlansPage() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { can } = usePermissions()
  const statusParam = params.get('status')
  const status = isStatus(statusParam) ? statusParam : undefined
  const table = useTableQuery({ pageSize: 20 })
  const plans = usePlans({ ...table.query, status })
  const [creating, setCreating] = useState(false)

  const setStatus = (value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value === 'all') next.delete('status')
    else next.set('status', value)
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    table.setPage(1)
  }

  const columns = useMemo<ColumnDef<TreatmentPlanListItem>[]>(
    () => [
      {
        id: 'code',
        header: 'Mã kế hoạch',
        enableSorting: true,
        cell: ({ row }) => (
          <div className="tabular-nums">
            <p className="font-medium">{row.original.code}</p>
            <p className="text-muted-foreground text-xs">{vnDdMmYyyy(row.original.createdAt)}</p>
          </div>
        ),
      },
      {
        id: 'patient',
        header: 'Bệnh nhân',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.patientName}</p>
            <p className="text-muted-foreground text-xs tabular-nums">
              {row.original.patientCode} · {formatPhone(row.original.patientPhone)}
            </p>
          </div>
        ),
      },
      {
        id: 'doctor',
        header: 'Bác sĩ',
        cell: ({ row }) => <span className="whitespace-nowrap">{row.original.doctorName}</span>,
      },
      {
        id: 'total',
        header: () => <span className="block text-right">Tổng sau giảm</span>,
        cell: ({ row }) => (
          <span className="block text-right font-medium tabular-nums">
            {formatVnd(row.original.total)}
          </span>
        ),
      },
      {
        id: 'discountRate',
        header: () => <span className="block text-right">Giảm</span>,
        cell: ({ row }) => (
          <span
            className={cn(
              'block text-right tabular-nums',
              row.original.discountRate > 10
                ? 'text-warning font-medium'
                : row.original.discountRate === 0 && 'text-muted-foreground'
            )}
          >
            {row.original.discountRate > 0 ? `${formatRate(row.original.discountRate)}%` : '—'}
          </span>
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
          <span className="block text-right tabular-nums">{formatVnd(row.original.remaining)}</span>
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
    <PermissionGuard permission={permissions.treatmentPlans.view} redirect>
      <div className="space-y-6">
        <PageHeader
          title="Kế hoạch điều trị"
          icon={ClipboardList}
          description="Báo giá nhiều buổi, duyệt giảm giá, theo dõi tiến độ và số đã thu."
          actions={
            can(permissions.treatmentPlans.create) && (
              <Button onClick={() => setCreating(true)}>
                <Plus aria-hidden="true" />
                Lập kế hoạch
              </Button>
            )
          }
        />

        <Tabs value={status ?? 'all'} onValueChange={setStatus}>
          <div className="-mx-1 overflow-x-auto overflow-y-hidden px-1 pb-1">
            <TabsList aria-label="Lọc theo trạng thái">
              <TabsTrigger value="all">Tất cả</TabsTrigger>
              {STATUSES.map((s) => (
                <TabsTrigger key={s} value={s}>
                  {planStatusLabels[s]}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        <DataTable
          columns={columns}
          data={plans.data?.items}
          getRowId={(p) => p.id}
          isLoading={plans.isLoading}
          isFetching={plans.isFetching}
          error={plans.error}
          onRetry={() => void plans.refetch()}
          onRowClick={(p) => router.push(routePath.planDetail(p.id))}
          minWidth={1080}
          sorting={{
            sortBy: table.state.sortBy,
            sortDir: table.state.sortDir,
            onSortChange: table.setSort,
          }}
          pagination={
            plans.data && {
              page: plans.data.page,
              pageSize: plans.data.pageSize,
              totalCount: plans.data.totalCount,
              totalPages: plans.data.totalPages,
              onPageChange: table.setPage,
              onPageSizeChange: table.setPageSize,
            }
          }
          toolbar={
            <SearchInput
              value={table.state.search}
              onSearch={table.setSearch}
              placeholder="Tìm mã kế hoạch, bệnh nhân, số điện thoại"
              className="sm:max-w-sm"
            />
          }
          emptyState={
            <EmptyState
              icon={ClipboardList}
              title={
                status
                  ? `Không có kế hoạch "${planStatusLabels[status]}"`
                  : 'Chưa có kế hoạch điều trị'
              }
              description={
                table.state.search
                  ? 'Thử từ khóa khác.'
                  : 'Kế hoạch do bác sĩ lập từ hồ sơ bệnh nhân hoặc tại đây.'
              }
            />
          }
        />
      </div>
      <PlanFormDialog
        target={creating ? 'new' : null}
        onOpenChange={(o) => !o && setCreating(false)}
        onSaved={(plan) => router.push(routePath.planDetail(plan.id))}
      />
    </PermissionGuard>
  )
}
