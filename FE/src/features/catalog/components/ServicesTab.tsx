'use client'

import { Fragment, useMemo, useState } from 'react'
import { Check, Plus, SearchX, Stethoscope, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { permissions } from '@/config/permissions'
import { usePermissions } from '@/hooks/use-permissions'
import { getErrorMessage } from '@/lib/api-error'
import { formatVnd } from '@/lib/format'
import { matchesSearch } from '@/lib/normalize'
import { cn } from '@/lib/utils'
import type { ServiceDto, ServiceGroup, SpecialtyDto } from '@/types/clinic'
import { useDeleteService, useServices, useSetServiceActive } from '@/features/clinic/hooks/use-clinic'
import { serviceGroupLabels, serviceUnitLabels } from '@/features/clinic/lib/labels'
import { ALL, activeValue, handleDeleteError, type ActiveFilter } from '../lib/catalog'
import { ActiveBadge, ActiveFilterSelect, CatalogRowActions, HeadCell, SpecialtyFilterSelect } from './CatalogParts'
import { ServiceFormDialog, type ServiceDialogTarget } from './ServiceFormDialog'

const GROUPS: ServiceGroup[] = ['Kham', 'ThuThuat', 'CanLamSang']

/**
 * Tab Dịch vụ (UC-01 luồng chính, 1c, 1d, E3; FR-03, BR-33): danh sách theo nhóm Khám, Thủ thuật, Cận lâm sàng; lọc theo
 * nhóm, chuyên khoa, trạng thái, tìm theo mã/tên không dấu. Danh mục nhỏ nên tải một lần rồi lọc tại chỗ cho mượt.
 */
export function ServicesTab({ specialties }: { specialties: SpecialtyDto[] }) {
  const { can } = usePermissions()
  const canCreate = can(permissions.services.create)
  const canUpdate = can(permissions.services.update)
  const canDelete = can(permissions.services.delete)
  const showActions = canUpdate || canDelete
  const services = useServices()
  const setActive = useSetServiceActive()
  const remove = useDeleteService()

  const [search, setSearch] = useState('')
  const [searchKey, setSearchKey] = useState(0)
  const [group, setGroup] = useState<ServiceGroup | typeof ALL>(ALL)
  const [specialty, setSpecialty] = useState<string>(ALL)
  const [status, setStatus] = useState<ActiveFilter>(ALL)
  const [dialog, setDialog] = useState<ServiceDialogTarget | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ServiceDto | null>(null)

  const examServiceIds = useMemo(() => new Set(specialties.map((s) => s.examServiceId).filter(Boolean)), [specialties])

  const sections = useMemo(() => {
    const active = activeValue(status)
    const rows = (services.data ?? []).filter(
      (s) =>
        (group === ALL || s.group === group) &&
        (specialty === ALL || s.specialtyId === specialty) &&
        (active === undefined || s.isActive === active) &&
        matchesSearch(`${s.code} ${s.name}`, search)
    )
    return GROUPS.map((g) => ({ group: g, items: rows.filter((s) => s.group === g) })).filter((x) => x.items.length > 0)
  }, [services.data, group, specialty, status, search])

  const total = services.data?.length ?? 0
  const inactiveCount = services.data?.filter((s) => !s.isActive).length ?? 0
  const filtering = !!search || group !== ALL || specialty !== ALL || status !== ALL
  const columnCount = showActions ? 8 : 7

  const clearFilters = () => {
    setSearch('')
    setSearchKey((k) => k + 1)
    setGroup(ALL)
    setSpecialty(ALL)
    setStatus(ALL)
  }

  const openCreate = () =>
    setDialog({ service: null, group: group === ALL ? undefined : group, specialtyId: specialty === ALL ? undefined : specialty })

  const toggleActive = (s: ServiceDto) =>
    setActive.mutate(
      { id: s.id, isActive: !s.isActive },
      {
        onSuccess: (saved) =>
          saved.isActive
            ? toast.success(`Đã dùng lại dịch vụ ${saved.code}`, { description: saved.name })
            : toast.success(`Đã ngừng dịch vụ ${saved.code}`, { description: 'Dịch vụ không còn chọn được ở lượt khám mới.' }),
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    )

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const target = deleteTarget
    try {
      await remove.mutateAsync(target.id)
      toast.success(`Đã xóa dịch vụ ${target.code}`, { description: target.name })
    } catch (err) {
      if (handleDeleteError(err, target.isActive && canUpdate ? () => toggleActive(target) : undefined)) return
      throw err
    }
  }

  return (
    <>
      <div className="bg-card text-card-foreground overflow-hidden rounded-xl border shadow-xs">
        <div className="space-y-3 border-b p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput key={searchKey} onSearch={setSearch} placeholder="Tìm theo mã, tên dịch vụ…" />
            <Select value={group} onValueChange={(v) => setGroup(v as ServiceGroup | typeof ALL)}>
              <SelectTrigger className="w-full sm:w-40" aria-label="Lọc theo nhóm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Mọi nhóm</SelectItem>
                {GROUPS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {serviceGroupLabels[g]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SpecialtyFilterSelect value={specialty} specialties={specialties} onChange={setSpecialty} />
            <ActiveFilterSelect value={status} onChange={setStatus} />
            {canCreate && (
              <Button className="sm:ml-auto" onClick={openCreate}>
                <Plus aria-hidden="true" />
                Thêm dịch vụ
              </Button>
            )}
          </div>
          {services.data && (
            <p className="text-muted-foreground text-sm">
              <b className="text-foreground tabular-nums">{total}</b> dịch vụ
              {inactiveCount > 0 && <>, {inactiveCount} đang ngừng</>}
            </p>
          )}
        </div>

        {services.error ? (
          <ErrorState error={services.error} onRetry={() => void services.refetch()} />
        ) : (
          <div
            className={cn('overflow-x-auto transition-opacity duration-200', services.isFetching && !services.isLoading && 'opacity-60')}
            aria-busy={services.isLoading || services.isFetching}
          >
            <Table style={{ minWidth: 960 }}>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent">
                  <HeadCell className="w-24">Mã</HeadCell>
                  <HeadCell>Dịch vụ</HeadCell>
                  <HeadCell className="w-40">Chuyên khoa</HeadCell>
                  <HeadCell className="w-24">Đơn vị</HeadCell>
                  <HeadCell className="w-32 text-right">Giá</HeadCell>
                  <HeadCell className="w-28 text-center">Theo răng</HeadCell>
                  <HeadCell className="w-28">Trạng thái</HeadCell>
                  {showActions && (
                    <HeadCell className="w-14">
                      <span className="sr-only">Thao tác</span>
                    </HeadCell>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.isLoading
                  ? Array.from({ length: 8 }, (_, i) => (
                      <TableRow key={`skeleton-${i}`} className="hover:bg-transparent">
                        {Array.from({ length: columnCount }, (_, j) => (
                          <TableCell key={j} className="h-14 px-4">
                            <Skeleton className={cn('h-4', j === 1 ? 'w-48' : 'w-16')} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : sections.map((section) => (
                      <Fragment key={section.group}>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={columnCount} className="px-4 py-2">
                            <span className="flex items-center gap-2">
                              <span className="font-semibold">{serviceGroupLabels[section.group]}</span>
                              <span className="text-muted-foreground text-xs tabular-nums">{section.items.length} dịch vụ</span>
                            </span>
                          </TableCell>
                        </TableRow>
                        {section.items.map((s) => (
                          <TableRow key={s.id} className={cn('hover:bg-muted/40 transition-colors duration-150', !s.isActive && 'text-muted-foreground')}>
                            <TableCell className="px-4 py-2 font-mono text-xs">{s.code}</TableCell>
                            <TableCell className="px-4 py-2">
                              <div className="flex max-w-96 min-w-52 flex-wrap items-center gap-x-2 gap-y-1">
                                {canUpdate ? (
                                  <button
                                    type="button"
                                    onClick={() => setDialog({ service: s })}
                                    className="focus-visible:ring-ring/50 cursor-pointer rounded-sm text-left font-medium whitespace-normal outline-none hover:underline focus-visible:ring-3"
                                  >
                                    {s.name}
                                  </button>
                                ) : (
                                  <span className="font-medium whitespace-normal">{s.name}</span>
                                )}
                                {examServiceIds.has(s.id) && (
                                  <StatusBadge tone="info" dot={false}>
                                    Phí khám
                                  </StatusBadge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-2">
                              {s.specialtyName ?? <span className="text-muted-foreground">Dùng chung</span>}
                            </TableCell>
                            <TableCell className="px-4 py-2">{serviceUnitLabels[s.unit]}</TableCell>
                            <TableCell className="px-4 py-2 text-right font-medium tabular-nums">{formatVnd(s.price)}</TableCell>
                            <TableCell className="px-4 py-2 text-center">
                              {s.requiresTooth ? (
                                <>
                                  <Check className="text-primary mx-auto size-4" aria-hidden="true" />
                                  <span className="sr-only">Cần vị trí răng</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-muted-foreground" aria-hidden="true">
                                    —
                                  </span>
                                  <span className="sr-only">Không cần vị trí răng</span>
                                </>
                              )}
                            </TableCell>
                            <TableCell className="px-4 py-2">
                              <ActiveBadge active={s.isActive} />
                            </TableCell>
                            {showActions && (
                              <TableCell className="w-14 px-4 py-2 text-right">
                                <CatalogRowActions
                                  name={s.name}
                                  kind="dịch vụ"
                                  isActive={s.isActive}
                                  isUsed={s.isUsed}
                                  usedHint="Dịch vụ đã dùng trong lượt khám, kế hoạch hoặc lịch hẹn nên không xóa được."
                                  canUpdate={canUpdate}
                                  canDelete={canDelete}
                                  onEdit={() => setDialog({ service: s })}
                                  onToggle={() => toggleActive(s)}
                                  onDelete={() => setDeleteTarget(s)}
                                />
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </Fragment>
                    ))}
              </TableBody>
            </Table>
            {!services.isLoading &&
              sections.length === 0 &&
              (filtering ? (
                <EmptyState
                  icon={SearchX}
                  title="Không tìm thấy dịch vụ"
                  description="Thử từ khóa khác hoặc bỏ bớt bộ lọc."
                  action={
                    <Button variant="outline" onClick={clearFilters}>
                      Xóa bộ lọc
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={Stethoscope}
                  title="Chưa có dịch vụ"
                  description="Thêm dịch vụ khám, thủ thuật, cận lâm sàng để bác sĩ chỉ định và lễ tân thu phí."
                  action={
                    canCreate && (
                      <Button onClick={openCreate}>
                        <Plus aria-hidden="true" />
                        Thêm dịch vụ
                      </Button>
                    )
                  }
                />
              ))}
          </div>
        )}
      </div>

      <ServiceFormDialog target={dialog} specialties={specialties} onOpenChange={(o) => !o && setDialog(null)} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        variant="destructive"
        icon={Trash2}
        title={`Xóa dịch vụ ${deleteTarget?.code ?? ''}?`}
        description={
          <>
            <span className="text-foreground font-medium">{deleteTarget?.name}</span> sẽ bị xóa khỏi danh mục. Chỉ xóa được dịch vụ chưa
            dùng trong lượt khám; dịch vụ đã dùng thì chọn &quot;Ngừng&quot;.
          </>
        }
        confirmText="Xóa dịch vụ"
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </>
  )
}
