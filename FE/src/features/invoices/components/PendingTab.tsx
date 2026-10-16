'use client'

import { useMemo } from 'react'
import { CheckCircle2, RefreshCw } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { SearchInput } from '@/components/shared/SearchInput'
import { Button } from '@/components/ui/button'
import { permissions } from '@/config/permissions'
import { usePermissions } from '@/hooks/use-permissions'
import { useTableQuery } from '@/hooks/use-table-query'
import { cn } from '@/lib/utils'
import { PENDING_REFRESH_MS, useLiveInvoices } from '../hooks/use-pending-invoices'
import { invoiceColumns } from './invoice-columns'

const clock = (ms: number) => (ms ? new Date(ms).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—')

/**
 * Tab "Chờ thu" (UC-11 bước 1): phiếu thanh toán "Chờ thu" theo thời điểm kết thúc khám, cũ nhất lên đầu; tự làm mới
 * mỗi 15 giây. Bấm dòng hoặc "Thu tiền" để mở hộp thu.
 */
export function PendingTab({ onOpen }: { onOpen: (id: string) => void }) {
  const { can } = usePermissions()
  const canCollect = can(permissions.invoices.collect)
  const table = useTableQuery({ pageSize: 20 })
  const query = useLiveInvoices({ ...table.query, status: 'ChoThu' })
  const columns = useMemo(() => invoiceColumns({ detailed: false, canCollect, onOpen }), [canCollect, onOpen])

  return (
    <DataTable
      columns={columns}
      data={query.data?.items}
      getRowId={(r) => r.id}
      onRowClick={(r) => onOpen(r.id)}
      isLoading={query.isLoading}
      isFetching={query.isPlaceholderData}
      error={query.error && !query.data ? query.error : undefined}
      onRetry={() => void query.refetch()}
      minWidth={820}
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
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput onSearch={table.setSearch} placeholder="Tìm mã phiếu, tên, SĐT bệnh nhân…" />
          <p className="text-muted-foreground ml-auto flex items-center gap-2 text-xs" aria-live="polite">
            Tự cập nhật mỗi {PENDING_REFRESH_MS / 1000} giây · lần cuối {clock(query.dataUpdatedAt)}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
              aria-label="Làm mới danh sách chờ thu"
            >
              <RefreshCw className={cn(query.isFetching && 'animate-spin')} aria-hidden="true" />
            </Button>
          </p>
        </div>
      }
      emptyState={
        <EmptyState
          icon={CheckCircle2}
          title={table.state.search ? 'Không có phiếu chờ thu khớp từ khóa' : 'Không còn phiếu chờ thu'}
          description={
            table.state.search
              ? 'Thử tìm bằng mã phiếu, mã bệnh nhân hoặc số điện thoại.'
              : 'Khi bác sĩ kết thúc khám, phiếu thanh toán tự hiện ở đây.'
          }
        />
      }
    />
  )
}
