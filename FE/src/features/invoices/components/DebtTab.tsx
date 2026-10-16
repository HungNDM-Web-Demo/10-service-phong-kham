'use client'

import { useMemo } from 'react'
import { Wallet } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { SearchInput } from '@/components/shared/SearchInput'
import { permissions } from '@/config/permissions'
import { useInvoices } from '@/features/clinic/hooks/use-clinic'
import { usePermissions } from '@/hooks/use-permissions'
import { useTableQuery } from '@/hooks/use-table-query'
import { invoiceColumns } from './invoice-columns'

/**
 * Tab "Còn nợ" (UC-11 2a; FR-33): phiếu thanh toán còn phải thu ("Chờ thu" hoặc "Thu một phần"), mới nhất lên đầu;
 * tìm theo bệnh nhân rồi bấm "Thu nợ".
 */
export function DebtTab({ onOpen, initialSearch }: { onOpen: (id: string) => void; initialSearch?: string }) {
  const { can } = usePermissions()
  const canCollect = can(permissions.invoices.collect)
  const table = useTableQuery({ pageSize: 20, search: initialSearch || undefined })
  const query = useInvoices({ ...table.query, hasDebt: true })
  const columns = useMemo(() => invoiceColumns({ detailed: true, canCollect, onOpen }), [canCollect, onOpen])

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
      sorting={{ sortBy: table.state.sortBy, sortDir: table.state.sortDir, onSortChange: table.setSort }}
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
      toolbar={<SearchInput value={initialSearch} onSearch={table.setSearch} placeholder="Tìm mã phiếu, tên, SĐT bệnh nhân…" />}
      emptyState={
        <EmptyState
          icon={Wallet}
          title={table.state.search ? 'Không có phiếu còn nợ khớp từ khóa' : 'Không có công nợ'}
          description={table.state.search ? 'Thử tìm bằng mã bệnh nhân hoặc số điện thoại.' : 'Mọi phiếu thanh toán đều đã thu đủ.'}
        />
      }
    />
  )
}
