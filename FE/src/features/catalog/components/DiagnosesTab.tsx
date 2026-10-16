'use client'

import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { ClipboardList, Plus, SearchX, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { SearchInput } from '@/components/shared/SearchInput'
import { Button } from '@/components/ui/button'
import { permissions } from '@/config/permissions'
import { usePermissions } from '@/hooks/use-permissions'
import { getErrorMessage } from '@/lib/api-error'
import { matchesSearch } from '@/lib/normalize'
import { cn } from '@/lib/utils'
import type { DiagnosisTemplateDto, SpecialtyDto } from '@/types/clinic'
import { useDeleteDiagnosis, useDiagnoses, useSetDiagnosisActive } from '@/features/clinic/hooks/use-clinic'
import { ALL, activeValue, handleDeleteError, type ActiveFilter } from '../lib/catalog'
import { ActiveBadge, ActiveFilterSelect, CatalogRowActions, SpecialtyFilterSelect } from './CatalogParts'
import { DiagnosisFormDialog, type DiagnosisDialogTarget } from './DiagnosisFormDialog'

/**
 * Tab Chẩn đoán mẫu (UC-01 1b, 1d, E3; FR-05, BR-33): mã ICD-10, tên tiếng Việt, chuyên khoa; lọc theo chuyên khoa,
 * trạng thái, tìm theo mã/tên không dấu. Quyền dùng chung nhóm `services.*` (07 §4.1).
 */
export function DiagnosesTab({ specialties }: { specialties: SpecialtyDto[] }) {
  const { can } = usePermissions()
  const canCreate = can(permissions.services.create)
  const canUpdate = can(permissions.services.update)
  const canDelete = can(permissions.services.delete)
  const diagnoses = useDiagnoses()
  const setActive = useSetDiagnosisActive()
  const remove = useDeleteDiagnosis()

  const [search, setSearch] = useState('')
  const [searchKey, setSearchKey] = useState(0)
  const [specialty, setSpecialty] = useState<string>(ALL)
  const [status, setStatus] = useState<ActiveFilter>(ALL)
  const [dialog, setDialog] = useState<DiagnosisDialogTarget | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DiagnosisTemplateDto | null>(null)

  const rows = useMemo(() => {
    const active = activeValue(status)
    return (diagnoses.data ?? [])
      .filter(
        (d) =>
          (specialty === ALL || d.specialtyId === specialty) &&
          (active === undefined || d.isActive === active) &&
          matchesSearch(`${d.icdCode} ${d.name}`, search)
      )
      .sort((a, b) => (a.icdCode < b.icdCode ? -1 : a.icdCode > b.icdCode ? 1 : 0))
  }, [diagnoses.data, specialty, status, search])

  const filtering = !!search || specialty !== ALL || status !== ALL
  const openCreate = () => setDialog({ diagnosis: null, specialtyId: specialty === ALL ? undefined : specialty })

  const clearFilters = () => {
    setSearch('')
    setSearchKey((k) => k + 1)
    setSpecialty(ALL)
    setStatus(ALL)
  }

  const toggleActive = (d: DiagnosisTemplateDto) =>
    setActive.mutate(
      { id: d.id, isActive: !d.isActive },
      {
        onSuccess: (saved) =>
          saved.isActive
            ? toast.success(`Đã dùng lại chẩn đoán ${saved.icdCode}`, { description: saved.name })
            : toast.success(`Đã ngừng chẩn đoán ${saved.icdCode}`, { description: 'Chẩn đoán không còn trong danh sách chọn nhanh.' }),
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    )

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const target = deleteTarget
    try {
      await remove.mutateAsync(target.id)
      toast.success(`Đã xóa chẩn đoán ${target.icdCode}`, { description: target.name })
    } catch (err) {
      if (handleDeleteError(err, target.isActive && canUpdate ? () => toggleActive(target) : undefined)) return
      throw err
    }
  }

  const columns: ColumnDef<DiagnosisTemplateDto>[] = [
    {
      id: 'icdCode',
      header: 'Mã ICD-10',
      meta: { className: 'w-32 font-mono text-xs', headerClassName: 'w-32' },
      cell: ({ row }) => row.original.icdCode,
    },
    {
      id: 'name',
      header: 'Tên chẩn đoán',
      cell: ({ row }) => {
        const d = row.original
        return canUpdate ? (
          <button
            type="button"
            onClick={() => setDialog({ diagnosis: d })}
            className={cn(
              'focus-visible:ring-ring/50 cursor-pointer rounded-sm text-left font-medium whitespace-normal outline-none hover:underline focus-visible:ring-3',
              !d.isActive && 'text-muted-foreground'
            )}
          >
            {d.name}
          </button>
        ) : (
          <span className={cn('font-medium whitespace-normal', !d.isActive && 'text-muted-foreground')}>{d.name}</span>
        )
      },
    },
    {
      id: 'specialty',
      header: 'Chuyên khoa',
      meta: { className: 'w-48', headerClassName: 'w-48' },
      cell: ({ row }) => row.original.specialtyName ?? <span className="text-muted-foreground">Dùng chung</span>,
    },
    {
      id: 'isActive',
      header: 'Trạng thái',
      meta: { className: 'w-32', headerClassName: 'w-32' },
      cell: ({ row }) => <ActiveBadge active={row.original.isActive} />,
    },
  ]
  if (canUpdate || canDelete) {
    columns.push({
      id: 'actions',
      header: () => <span className="sr-only">Thao tác</span>,
      meta: { className: 'w-14 text-right', headerClassName: 'w-14' },
      cell: ({ row }) => {
        const d = row.original
        return (
          <CatalogRowActions
            name={`${d.icdCode} ${d.name}`}
            kind="chẩn đoán"
            isActive={d.isActive}
            isUsed={d.isUsed}
            usedHint="Chẩn đoán đã dùng trong lượt khám nên không xóa được."
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={() => setDialog({ diagnosis: d })}
            onToggle={() => toggleActive(d)}
            onDelete={() => setDeleteTarget(d)}
          />
        )
      },
    })
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(d) => d.id}
        isLoading={diagnoses.isLoading}
        isFetching={diagnoses.isFetching}
        error={diagnoses.error}
        onRetry={() => void diagnoses.refetch()}
        minWidth={760}
        toolbar={
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput key={searchKey} onSearch={setSearch} placeholder="Tìm theo mã ICD-10, tên…" />
              <SpecialtyFilterSelect value={specialty} specialties={specialties} onChange={setSpecialty} />
              <ActiveFilterSelect value={status} onChange={setStatus} />
              {canCreate && (
                <Button className="sm:ml-auto" onClick={openCreate}>
                  <Plus aria-hidden="true" />
                  Thêm chẩn đoán
                </Button>
              )}
            </div>
            {diagnoses.data && (
              <p className="text-muted-foreground text-sm">
                {filtering ? (
                  <>
                    <b className="text-foreground tabular-nums">{rows.length}</b> / {diagnoses.data.length} chẩn đoán mẫu
                  </>
                ) : (
                  <>
                    <b className="text-foreground tabular-nums">{diagnoses.data.length}</b> chẩn đoán mẫu
                  </>
                )}
              </p>
            )}
          </div>
        }
        emptyState={
          filtering ? (
            <EmptyState
              icon={SearchX}
              title="Không tìm thấy chẩn đoán"
              description="Thử từ khóa khác hoặc bỏ bớt bộ lọc."
              action={
                <Button variant="outline" onClick={clearFilters}>
                  Xóa bộ lọc
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="Chưa có chẩn đoán mẫu"
              description="Thêm chẩn đoán hay gặp để bác sĩ chọn nhanh khi khám."
              action={
                canCreate && (
                  <Button onClick={openCreate}>
                    <Plus aria-hidden="true" />
                    Thêm chẩn đoán
                  </Button>
                )
              }
            />
          )
        }
      />

      <DiagnosisFormDialog target={dialog} specialties={specialties} onOpenChange={(o) => !o && setDialog(null)} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        variant="destructive"
        icon={Trash2}
        title={`Xóa chẩn đoán ${deleteTarget?.icdCode ?? ''}?`}
        description={
          <>
            <span className="text-foreground font-medium">{deleteTarget?.name}</span> sẽ bị xóa khỏi danh sách chọn nhanh. Chẩn đoán đã dùng
            trong lượt khám thì chọn &quot;Ngừng&quot;.
          </>
        }
        confirmText="Xóa chẩn đoán"
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </>
  )
}
