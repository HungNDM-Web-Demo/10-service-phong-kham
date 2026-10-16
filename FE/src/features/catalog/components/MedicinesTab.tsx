'use client'

import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Pill, Plus, SearchX, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { SearchInput } from '@/components/shared/SearchInput'
import { Button } from '@/components/ui/button'
import { permissions } from '@/config/permissions'
import { usePermissions } from '@/hooks/use-permissions'
import { useTableQuery } from '@/hooks/use-table-query'
import { getErrorMessage } from '@/lib/api-error'
import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { MedicineDto } from '@/types/clinic'
import { useDeleteMedicine, useMedicines, useSetMedicineActive } from '@/features/clinic/hooks/use-clinic'
import { activeFilterOf, activeValue, handleDeleteError } from '../lib/catalog'
import { ActiveBadge, ActiveFilterSelect, CatalogRowActions } from './CatalogParts'
import { MedicineFormDialog, type MedicineDialogTarget } from './MedicineFormDialog'

/**
 * Tab Thuốc (UC-01 1a, 1c, 1d, E3; FR-04, BR-33): danh sách phân trang phía máy chủ, tìm theo mã, tên, hoạt chất, lọc trạng
 * thái, sắp xếp theo mã, tên, giá.
 */
export function MedicinesTab() {
  const { can } = usePermissions()
  const canCreate = can(permissions.medicines.create)
  const canUpdate = can(permissions.medicines.update)
  const canDelete = can(permissions.medicines.delete)
  const table = useTableQuery<{ active: boolean }>({ pageSize: 10 })
  const medicines = useMedicines(table.query)
  const setActive = useSetMedicineActive()
  const remove = useDeleteMedicine()

  const [searchKey, setSearchKey] = useState(0)
  const [dialog, setDialog] = useState<MedicineDialogTarget | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MedicineDto | null>(null)

  const status = activeFilterOf(table.state.active)
  const filtering = !!table.state.search || status !== 'all'

  const toggleActive = (m: MedicineDto) =>
    setActive.mutate(
      { id: m.id, isActive: !m.isActive },
      {
        onSuccess: (saved) =>
          saved.isActive
            ? toast.success(`Đã dùng lại thuốc ${saved.code}`, { description: saved.name })
            : toast.success(`Đã ngừng thuốc ${saved.code}`, { description: 'Bác sĩ không kê được thuốc này ở đơn mới.' }),
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    )

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const target = deleteTarget
    try {
      await remove.mutateAsync(target.id)
      toast.success(`Đã xóa thuốc ${target.code}`, { description: target.name })
    } catch (err) {
      if (handleDeleteError(err, target.isActive && canUpdate ? () => toggleActive(target) : undefined)) return
      throw err
    }
  }

  const clearFilters = () => {
    table.resetFilters()
    setSearchKey((k) => k + 1)
  }

  const columns: ColumnDef<MedicineDto>[] = [
    {
      id: 'code',
      header: 'Mã',
      enableSorting: true,
      meta: { className: 'w-24 font-mono text-xs', headerClassName: 'w-24' },
      cell: ({ row }) => row.original.code,
    },
    {
      id: 'name',
      header: 'Tên thuốc',
      enableSorting: true,
      cell: ({ row }) => {
        const m = row.original
        return canUpdate ? (
          <button
            type="button"
            onClick={() => setDialog({ medicine: m })}
            className={cn(
              'focus-visible:ring-ring/50 max-w-72 cursor-pointer rounded-sm text-left font-medium whitespace-normal outline-none hover:underline focus-visible:ring-3',
              !m.isActive && 'text-muted-foreground'
            )}
          >
            {m.name}
          </button>
        ) : (
          <span className={cn('font-medium whitespace-normal', !m.isActive && 'text-muted-foreground')}>{m.name}</span>
        )
      },
    },
    {
      id: 'activeIngredient',
      header: 'Hoạt chất',
      enableSorting: true,
      meta: { className: 'max-w-56 whitespace-normal' },
      cell: ({ row }) => row.original.activeIngredient,
    },
    {
      id: 'strength',
      header: 'Hàm lượng',
      meta: { className: 'whitespace-nowrap' },
      cell: ({ row }) => row.original.strength ?? <span className="text-muted-foreground">—</span>,
    },
    {
      id: 'dosageForm',
      header: 'Dạng bào chế',
      meta: { className: 'whitespace-nowrap' },
      cell: ({ row }) => row.original.dosageForm ?? <span className="text-muted-foreground">—</span>,
    },
    {
      id: 'unit',
      header: 'Đơn vị',
      cell: ({ row }) => row.original.unit,
    },
    {
      id: 'price',
      header: 'Giá bán',
      enableSorting: true,
      meta: { className: 'text-right font-medium tabular-nums whitespace-nowrap', headerClassName: 'text-right' },
      cell: ({ row }) => formatVnd(row.original.price),
    },
    {
      id: 'isActive',
      header: 'Trạng thái',
      cell: ({ row }) => <ActiveBadge active={row.original.isActive} />,
    },
  ]
  if (canUpdate || canDelete) {
    columns.push({
      id: 'actions',
      header: () => <span className="sr-only">Thao tác</span>,
      meta: { className: 'w-14 text-right', headerClassName: 'w-14' },
      cell: ({ row }) => {
        const m = row.original
        return (
          <CatalogRowActions
            name={m.name}
            kind="thuốc"
            isActive={m.isActive}
            isUsed={m.isUsed}
            usedHint="Thuốc đã kê trong đơn nên không xóa được."
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={() => setDialog({ medicine: m })}
            onToggle={() => toggleActive(m)}
            onDelete={() => setDeleteTarget(m)}
          />
        )
      },
    })
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={medicines.data?.items}
        getRowId={(m) => m.id}
        isLoading={medicines.isLoading}
        isFetching={medicines.isFetching}
        error={medicines.error}
        onRetry={() => void medicines.refetch()}
        minWidth={1080}
        sorting={{ sortBy: table.state.sortBy, sortDir: table.state.sortDir, onSortChange: table.setSort }}
        pagination={
          medicines.data && {
            page: medicines.data.page,
            pageSize: medicines.data.pageSize,
            totalCount: medicines.data.totalCount,
            totalPages: medicines.data.totalPages,
            onPageChange: table.setPage,
            onPageSizeChange: table.setPageSize,
          }
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput key={searchKey} onSearch={table.setSearch} placeholder="Tìm theo mã, tên, hoạt chất…" />
            <ActiveFilterSelect value={status} onChange={(v) => table.setFilter('active', activeValue(v))} />
            {canCreate && (
              <Button className="sm:ml-auto" onClick={() => setDialog({ medicine: null })}>
                <Plus aria-hidden="true" />
                Thêm thuốc
              </Button>
            )}
          </div>
        }
        emptyState={
          filtering ? (
            <EmptyState
              icon={SearchX}
              title="Không tìm thấy thuốc"
              description="Thử từ khóa khác hoặc chọn mọi trạng thái."
              action={
                <Button variant="outline" onClick={clearFilters}>
                  Xóa bộ lọc
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Pill}
              title="Chưa có thuốc"
              description="Thêm thuốc để bác sĩ kê đơn và lễ tân thu tiền thuốc."
              action={
                canCreate && (
                  <Button onClick={() => setDialog({ medicine: null })}>
                    <Plus aria-hidden="true" />
                    Thêm thuốc
                  </Button>
                )
              }
            />
          )
        }
      />

      <MedicineFormDialog target={dialog} onOpenChange={(o) => !o && setDialog(null)} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        variant="destructive"
        icon={Trash2}
        title={`Xóa thuốc ${deleteTarget?.code ?? ''}?`}
        description={
          <>
            <span className="text-foreground font-medium">{deleteTarget?.name}</span> sẽ bị xóa khỏi danh mục. Chỉ xóa được thuốc chưa kê
            trong đơn nào; thuốc đã kê thì chọn &quot;Ngừng&quot;.
          </>
        }
        confirmText="Xóa thuốc"
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </>
  )
}
