'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { Ban, Printer, ReceiptText } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { SearchInput } from '@/components/shared/SearchInput'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { permissions } from '@/config/permissions'
import { ReceiptStatusBadge } from '@/features/clinic/components/ClinicBadges'
import { useReceipts } from '@/features/clinic/hooks/use-clinic'
import { paymentMethodLabels, receiptStatusLabels } from '@/features/clinic/lib/labels'
import { vnDateKey, vnToday } from '@/features/clinic/lib/vn-time'
import { usePermissions } from '@/hooks/use-permissions'
import { useTableQuery } from '@/hooks/use-table-query'
import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PaymentMethod, ReceiptListItem, ReceiptStatus } from '@/types/clinic'
import { receiptPrintUrl } from '../lib/print-url'
import type { CancelTarget } from './CancelReceiptDialog'
import { PatientCell, TimeCell } from './invoice-columns'
import { ListDateFilter, listRangeOf, type ListPreset } from './ListDateFilter'

type Filters = { method: PaymentMethod; status: ReceiptStatus; from: string; to: string }
const DEFAULT_PRESET = 'today' as const

/**
 * Tab "Phiếu thu" (UC-12; FR-34, FR-35): tìm theo mã, tên, SĐT; lọc ngày, phương thức, trạng thái; in lại; quản lý hủy
 * phiếu thu lập hôm nay (BR-27). Mặc định xem phiếu thu hôm nay để đối soát cuối ca.
 */
export function ReceiptsTab({ onOpen, onCancel }: { onOpen: (id: string) => void; onCancel: (target: CancelTarget) => void }) {
  const { can } = usePermissions()
  const canCancel = can(permissions.invoices.cancel)
  const table = useTableQuery<Filters>({ pageSize: 20, ...listRangeOf(DEFAULT_PRESET) })
  const [preset, setPreset] = useState<ListPreset>(DEFAULT_PRESET)
  const query = useReceipts(table.query)
  const { state } = table
  const today = vnToday()

  const pageTotal = (query.data?.items ?? []).filter((r) => r.status === 'HopLe').reduce((s, r) => s + r.amount, 0)

  const columns = useMemo<ColumnDef<ReceiptListItem>[]>(
    () => [
      { id: 'collectedAt', header: 'Thời điểm', enableSorting: true, cell: ({ row }) => <TimeCell iso={row.original.collectedAt} /> },
      {
        id: 'code',
        header: 'Phiếu thu',
        cell: ({ row }) => (
          <div className="leading-tight">
            <p className="font-mono text-[0.8125rem] font-medium">{row.original.code}</p>
            <p className="text-muted-foreground font-mono text-xs">{row.original.invoiceCode}</p>
          </div>
        ),
      },
      { id: 'patient', header: 'Bệnh nhân', cell: ({ row }) => <PatientCell name={row.original.patientName} code={row.original.patientCode} /> },
      {
        id: 'amount',
        header: 'Số tiền',
        enableSorting: true,
        meta: { className: 'text-right', headerClassName: 'text-right' },
        cell: ({ row }) => (
          <span className={cn('font-semibold tabular-nums', row.original.status === 'DaHuy' && 'text-muted-foreground line-through')}>
            {formatVnd(row.original.amount)}
          </span>
        ),
      },
      { id: 'method', header: 'Phương thức', cell: ({ row }) => paymentMethodLabels[row.original.method] },
      { id: 'collectedBy', header: 'Người thu', cell: ({ row }) => <span className="text-sm">{row.original.collectedByName}</span> },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <ReceiptStatusBadge status={row.original.status} />
            {row.original.cancelReason && (
              <p className="text-muted-foreground max-w-40 truncate text-xs" title={row.original.cancelReason}>
                {row.original.cancelReason}
              </p>
            )}
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Thao tác</span>,
        meta: { className: 'w-24 text-right' },
        cell: ({ row }) => {
          const r = row.original
          const cancellable = canCancel && r.status === 'HopLe' && vnDateKey(r.collectedAt) === today
          return (
            <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              <Button asChild variant="ghost" size="icon-sm" aria-label={`In lại phiếu thu ${r.code}`} title="In lại">
                <Link href={receiptPrintUrl(r.id, { reprint: true })}>
                  <Printer aria-hidden="true" />
                </Link>
              </Button>
              {cancellable && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  aria-label={`Hủy phiếu thu ${r.code}`}
                  title="Hủy phiếu thu"
                  onClick={() => onCancel({ id: r.id, code: r.code, amount: r.amount })}
                >
                  <Ban aria-hidden="true" />
                </Button>
              )}
            </div>
          )
        },
      },
    ],
    [canCancel, onCancel, today]
  )

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
      minWidth={1000}
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
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <SearchInput onSearch={table.setSearch} placeholder="Tìm mã phiếu, tên, SĐT bệnh nhân…" className="sm:max-w-72" />
            <ListDateFilter
              id="receipt-date"
              preset={preset}
              value={{ from: state.from, to: state.to }}
              onChange={(p, r) => {
                setPreset(p)
                table.setFilter('from', r.from)
                table.setFilter('to', r.to)
              }}
            />
            <div className="grid gap-1.5">
              <Label htmlFor="receipt-method" className="text-muted-foreground text-xs">
                Phương thức
              </Label>
              <Select value={state.method ?? 'all'} onValueChange={(v) => table.setFilter('method', v === 'all' ? undefined : (v as PaymentMethod))}>
                <SelectTrigger id="receipt-method" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {(Object.keys(paymentMethodLabels) as PaymentMethod[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {paymentMethodLabels[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="receipt-status" className="text-muted-foreground text-xs">
                Trạng thái
              </Label>
              <Select value={state.status ?? 'all'} onValueChange={(v) => table.setFilter('status', v === 'all' ? undefined : (v as ReceiptStatus))}>
                <SelectTrigger id="receipt-status" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {(Object.keys(receiptStatusLabels) as ReceiptStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {receiptStatusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {query.data && query.data.totalCount > 0 && (
            <p className="text-muted-foreground text-xs">
              {query.data.totalCount} phiếu thu · Tổng tiền phiếu hợp lệ ở trang này:{' '}
              <span className="text-foreground font-semibold tabular-nums">{formatVnd(pageTotal)}</span>
              {canCancel ? ' · Chỉ hủy được phiếu thu lập hôm nay.' : ''}
            </p>
          )}
        </div>
      }
      emptyState={
        <EmptyState icon={ReceiptText} title="Không có phiếu thu phù hợp" description="Đổi khoảng ngày, phương thức, trạng thái hoặc từ khóa tìm kiếm." />
      }
    />
  )
}
