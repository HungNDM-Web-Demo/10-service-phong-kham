'use client'

import { useMemo, useState } from 'react'
import { FileSearch } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { SearchInput } from '@/components/shared/SearchInput'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { permissions } from '@/config/permissions'
import { useInvoices } from '@/features/clinic/hooks/use-clinic'
import { invoiceStatusLabels } from '@/features/clinic/lib/labels'
import { usePermissions } from '@/hooks/use-permissions'
import { useTableQuery } from '@/hooks/use-table-query'
import type { InvoiceStatus } from '@/types/clinic'
import { invoiceColumns } from './invoice-columns'
import { ListDateFilter, listRangeOf, type ListPreset } from './ListDateFilter'

type Filters = { status: InvoiceStatus; from: string; to: string }
const DEFAULT_PRESET = '30d' as const

/** Tab "Phiếu thanh toán" (UC-12; FR-34): tra cứu theo mã, bệnh nhân, ngày lập, trạng thái; bấm dòng để xem chi tiết. */
export function InvoicesTab({ onOpen }: { onOpen: (id: string) => void }) {
  const { can } = usePermissions()
  const canCollect = can(permissions.invoices.collect)
  const table = useTableQuery<Filters>({ pageSize: 20, ...listRangeOf(DEFAULT_PRESET) })
  const [preset, setPreset] = useState<ListPreset>(DEFAULT_PRESET)
  const query = useInvoices(table.query)
  const columns = useMemo(() => invoiceColumns({ detailed: true, canCollect, onOpen }), [canCollect, onOpen])
  const { state } = table

  return (
    <DataTable
      columns={columns}
      data={query.data?.items}
      getRowId={(r) => r.id}
      onRowClick={(r) => onOpen(r.id)}
      isLoading={query.isLoading}
      isFetching={query.isFetching}
      error={query.error}
      onRetry={() => void query.refetch()}
      minWidth={1040}
      sorting={{ sortBy: state.sortBy, sortDir: state.sortDir, onSortChange: table.setSort }}
      pagination={
        query.data && {
          page: query.data.page,
          pageSize: query.data.pageSize,
          totalCount: query.data.totalCount,
          totalPages: query.data.totalPages,
          onPageChange: table.setPage,
          onPageSizeChange: table.setPageSize,
        }
      }
      toolbar={
        <div className="flex flex-wrap items-end gap-3">
          <SearchInput onSearch={table.setSearch} placeholder="Tìm mã phiếu, tên, SĐT bệnh nhân…" className="sm:max-w-72" />
          <ListDateFilter
            id="invoice-date"
            preset={preset}
            value={{ from: state.from, to: state.to }}
            onChange={(p, r) => {
              setPreset(p)
              table.setFilter('from', r.from)
              table.setFilter('to', r.to)
            }}
          />
          <div className="grid gap-1.5">
            <Label htmlFor="invoice-status" className="text-muted-foreground text-xs">
              Trạng thái
            </Label>
            <Select value={state.status ?? 'all'} onValueChange={(v) => table.setFilter('status', v === 'all' ? undefined : (v as InvoiceStatus))}>
              <SelectTrigger id="invoice-status" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {(Object.keys(invoiceStatusLabels) as InvoiceStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {invoiceStatusLabels[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      }
      emptyState={
        <EmptyState icon={FileSearch} title="Không có phiếu thanh toán phù hợp" description="Đổi khoảng ngày, trạng thái hoặc từ khóa tìm kiếm." />
      }
    />
  )
}
