'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import { AlertTriangle, Plus, Users } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { PermissionGuard } from '@/components/shared/PermissionGuard'
import { SearchInput } from '@/components/shared/SearchInput'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { permissions } from '@/config/permissions'
import { routePath } from '@/config/route-path'
import { usePermissions } from '@/hooks/use-permissions'
import { useTableQuery } from '@/hooks/use-table-query'
import { formatPhone, formatVnd } from '@/lib/format'
import type { PatientDto } from '@/types/clinic'
import { usePatients } from '@/features/clinic/hooks/use-clinic'
import { genderLabels } from '@/features/clinic/lib/labels'
import { vnDdMmYyyy } from '@/features/clinic/lib/vn-time'
import { PatientFormDialog } from '../components/PatientFormDialog'

type Filters = { hasDebt: boolean }

/** Danh sách bệnh nhân (SCR-09, UC-07 bước 1): tìm theo mã, họ tên, số điện thoại; lọc còn nợ; thêm hồ sơ (FR-19, FR-20). */
export function PatientsPage() {
  const router = useRouter()
  const { can } = usePermissions()
  const table = useTableQuery<Filters>({ pageSize: 20 })
  const patients = usePatients(table.query)
  const [creating, setCreating] = useState(false)
  const [searchKey, setSearchKey] = useState(0)
  const hasFilters = !!table.state.search || !!table.state.hasDebt

  const columns = useMemo<ColumnDef<PatientDto>[]>(
    () => [
      {
        id: 'code',
        header: 'Mã BN',
        enableSorting: true,
        meta: { className: 'w-28' },
        cell: ({ row }) => <span className="font-medium tabular-nums">{row.original.code}</span>,
      },
      {
        id: 'fullName',
        header: 'Họ tên',
        enableSorting: true,
        cell: ({ row }) => {
          const p = row.original
          return (
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-medium">{p.fullName}</span>
              {p.allergies && (
                <span
                  className="text-destructive inline-flex shrink-0"
                  title={`Dị ứng: ${p.allergies}`}
                >
                  <AlertTriangle className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">Có tiền sử dị ứng: {p.allergies}</span>
                </span>
              )}
            </div>
          )
        },
      },
      {
        id: 'age',
        header: 'Tuổi / Giới',
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {row.original.age} · {genderLabels[row.original.gender]}
          </span>
        ),
      },
      {
        id: 'phone',
        header: 'Số điện thoại',
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">{formatPhone(row.original.phone)}</span>
        ),
      },
      {
        id: 'lastVisitAt',
        header: 'Khám gần nhất',
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {row.original.lastVisitAt ? vnDdMmYyyy(row.original.lastVisitAt) : 'Chưa khám'}
          </span>
        ),
      },
      {
        id: 'visitCount',
        header: () => <span className="block text-right">Số lượt</span>,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">{row.original.visitCount}</span>
        ),
      },
      {
        id: 'debt',
        header: () => <span className="block text-right">Công nợ</span>,
        cell: ({ row }) =>
          row.original.debt > 0 ? (
            <span className="text-destructive block text-right font-semibold tabular-nums">
              {formatVnd(row.original.debt)}
            </span>
          ) : (
            <span className="text-muted-foreground block text-right">—</span>
          ),
      },
    ],
    []
  )

  return (
    <PermissionGuard permission={permissions.patients.view} redirect>
      <div className="space-y-6">
        <PageHeader
          title="Bệnh nhân"
          icon={Users}
          description="Hồ sơ hành chính, lịch sử khám, kế hoạch điều trị và công nợ."
          actions={
            can(permissions.patients.create) && (
              <Button onClick={() => setCreating(true)}>
                <Plus aria-hidden="true" />
                Thêm bệnh nhân
              </Button>
            )
          }
        />
        <DataTable
          columns={columns}
          data={patients.data?.items}
          getRowId={(p) => p.id}
          isLoading={patients.isLoading}
          isFetching={patients.isFetching}
          error={patients.error}
          onRetry={() => void patients.refetch()}
          onRowClick={(p) => router.push(routePath.patientDetail(p.id))}
          minWidth={860}
          sorting={{
            sortBy: table.state.sortBy,
            sortDir: table.state.sortDir,
            onSortChange: table.setSort,
          }}
          pagination={
            patients.data && {
              page: patients.data.page,
              pageSize: patients.data.pageSize,
              totalCount: patients.data.totalCount,
              totalPages: patients.data.totalPages,
              onPageChange: table.setPage,
              onPageSizeChange: table.setPageSize,
            }
          }
          toolbar={
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <SearchInput
                key={searchKey}
                value={table.state.search}
                onSearch={table.setSearch}
                placeholder="Tìm mã, họ tên, số điện thoại"
                className="sm:max-w-sm"
              />
              <div className="flex items-center gap-2">
                <Switch
                  id="filter-has-debt"
                  checked={!!table.state.hasDebt}
                  onCheckedChange={(v) => table.setFilter('hasDebt', v || undefined)}
                />
                <Label htmlFor="filter-has-debt">Còn nợ</Label>
              </div>
              {hasFilters && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    table.resetFilters()
                    setSearchKey((k) => k + 1)
                  }}
                >
                  Xóa bộ lọc
                </Button>
              )}
            </div>
          }
          emptyState={
            hasFilters ? (
              <EmptyState
                icon={Users}
                title="Không tìm thấy bệnh nhân"
                description="Thử từ khóa khác hoặc xóa bộ lọc."
              />
            ) : (
              <EmptyState
                icon={Users}
                title="Chưa có bệnh nhân"
                description="Hồ sơ được tạo khi tiếp đón hoặc thêm trực tiếp tại đây."
                action={
                  can(permissions.patients.create) && (
                    <Button onClick={() => setCreating(true)}>
                      <Plus aria-hidden="true" />
                      Thêm bệnh nhân
                    </Button>
                  )
                }
              />
            )
          }
        />
      </div>
      <PatientFormDialog
        target={creating ? 'new' : null}
        onOpenChange={(o) => !o && setCreating(false)}
      />
    </PermissionGuard>
  )
}
