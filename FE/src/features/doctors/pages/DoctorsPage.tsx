'use client'

import { useMemo, useState } from 'react'
import { CirclePause, Plus, SearchX, Stethoscope, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { PermissionGuard } from '@/components/shared/PermissionGuard'
import { SearchInput } from '@/components/shared/SearchInput'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { permissions } from '@/config/permissions'
import { usePermissions } from '@/hooks/use-permissions'
import { getErrorMessage } from '@/lib/api-error'
import { matchesSearch } from '@/lib/normalize'
import type { DoctorDto } from '@/types/clinic'
import { useDeleteDoctor, useDoctors, useSetDoctorActive, useSpecialties, useUpdateDoctor } from '@/features/clinic/hooks/use-clinic'
import { problemCode } from '@/features/clinic/lib/problem'
import { DoctorCard, DoctorCardSkeleton } from '../components/DoctorCard'
import { DoctorSheet, type DoctorSheetState, type DoctorTab } from '../components/DoctorSheet'

const ALL = 'all'
type StatusFilter = 'all' | 'active' | 'inactive'

/**
 * Bác sĩ và lịch làm việc (SCR-03; UC-02, FR-06, FR-07, BR-01): danh sách thẻ bác sĩ, lọc theo chuyên khoa, trạng thái;
 * ngăn kéo Thông tin, Lịch làm việc, Ngày nghỉ; ngừng, hoạt động lại, ẩn khỏi trang đặt lịch, xóa (chỉ khi chưa có dữ liệu).
 */
export function DoctorsPage() {
  return (
    <PermissionGuard permission={permissions.doctors.view} redirect>
      <DoctorsView />
    </PermissionGuard>
  )
}

function DoctorsView() {
  const { can } = usePermissions()
  const canCreate = can(permissions.doctors.create)
  const canUpdate = can(permissions.doctors.update)
  const canDelete = can(permissions.doctors.delete)
  const doctors = useDoctors()
  const specialties = useSpecialties()
  const setActive = useSetDoctorActive()
  const update = useUpdateDoctor()
  const remove = useDeleteDoctor()

  const [search, setSearch] = useState('')
  const [searchKey, setSearchKey] = useState(0)
  const [specialty, setSpecialty] = useState<string>(ALL)
  const [status, setStatus] = useState<StatusFilter>(ALL)
  const [sheet, setSheet] = useState<DoctorSheetState | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<DoctorDto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DoctorDto | null>(null)

  const list = useMemo(() => doctors.data ?? [], [doctors.data])
  const rows = useMemo(
    () =>
      list.filter(
        (d) =>
          (specialty === ALL || d.specialtyId === specialty) &&
          (status === ALL || d.isActive === (status === 'active')) &&
          matchesSearch(`${d.code} ${d.fullName} ${d.title ?? ''} ${d.specialtyName} ${d.room} ${d.username ?? ''}`, search)
      ),
    [list, specialty, status, search]
  )

  const activeCount = list.filter((d) => d.isActive).length
  const onlineCount = list.filter((d) => d.isActive && d.showOnline).length
  const filtering = !!search || specialty !== ALL || status !== ALL
  const readOnly = !canCreate && !canUpdate

  const clearFilters = () => {
    setSearch('')
    setSearchKey((k) => k + 1)
    setSpecialty(ALL)
    setStatus(ALL)
  }

  const open = (d: DoctorDto, tab: DoctorTab) => setSheet({ id: d.id, tab })
  const openCreate = () => setSheet({ id: null, tab: 'info' })

  const reactivate = (d: DoctorDto) =>
    setActive.mutate(
      { id: d.id, isActive: true },
      {
        onSuccess: (saved) => toast.success(`${saved.displayName} đã hoạt động lại`, { description: 'Bác sĩ có lại trên lịch hẹn mới.' }),
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    )

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return
    try {
      const saved = await setActive.mutateAsync({ id: deactivateTarget.id, isActive: false })
      toast.success(`Đã ngừng ${saved.displayName}`, { description: 'Lịch sử khám giữ nguyên.' })
    } catch (err) {
      toast.error(getErrorMessage(err))
      throw err
    }
  }

  // UC-02 1b: ẩn/hiện trên trang đặt lịch, giữ nguyên các thông tin khác
  const toggleOnline = (d: DoctorDto) =>
    update.mutate(
      {
        id: d.id,
        input: {
          code: d.code,
          fullName: d.fullName,
          title: d.title,
          specialtyId: d.specialtyId,
          room: d.room,
          photoUrl: d.photoUrl,
          bio: d.bio,
          userId: d.userId,
          showOnline: !d.showOnline,
          slotMinutes: null,
          maxPerSlot: null,
        },
      },
      {
        onSuccess: (saved) =>
          saved.showOnline
            ? toast.success(`Đã hiện ${saved.displayName} trên trang đặt lịch`)
            : toast.success(`Đã ẩn ${saved.displayName} khỏi trang đặt lịch`, { description: 'Lễ tân vẫn đặt lịch cho bác sĩ được.' }),
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    )

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const target = deleteTarget
    try {
      await remove.mutateAsync(target.id)
      if (sheet?.id === target.id) setSheet(null)
      toast.success(`Đã xóa ${target.displayName}`)
    } catch (err) {
      // Bác sĩ đã có lịch hẹn, lượt khám (409 DaPhatSinh): hiện câu của máy chủ, gợi ý Ngừng
      if (problemCode(err) === 'DaPhatSinh') {
        toast.error(
          getErrorMessage(err),
          target.isActive && canUpdate
            ? { action: { label: 'Ngừng hoạt động', onClick: () => setDeactivateTarget(target) }, duration: 8000 }
            : undefined
        )
        return
      }
      toast.error(getErrorMessage(err))
      throw err
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bác sĩ"
        icon={Stethoscope}
        description={
          readOnly
            ? 'Bác sĩ, phòng khám, lịch làm việc theo tuần và ngày nghỉ. Chỉ quản lý thay đổi được.'
            : 'Thông tin bác sĩ, lịch làm việc theo tuần, độ dài khung giờ và ngày nghỉ đột xuất.'
        }
        actions={
          canCreate && (
            <Button onClick={openCreate}>
              <Plus aria-hidden="true" />
              Thêm bác sĩ
            </Button>
          )
        }
      />

      <div className="bg-card text-card-foreground space-y-3 rounded-xl border p-3 shadow-xs sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput key={searchKey} onSearch={setSearch} placeholder="Tìm theo mã, tên, phòng…" />
          <Select value={specialty} onValueChange={setSpecialty}>
            <SelectTrigger className="w-full sm:w-48" aria-label="Lọc theo chuyên khoa">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Mọi chuyên khoa</SelectItem>
              {(specialties.data ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Lọc theo trạng thái">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Mọi trạng thái</SelectItem>
              <SelectItem value="active">Đang khám</SelectItem>
              <SelectItem value="inactive">Ngừng</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {doctors.data && (
          <p className="text-muted-foreground text-sm">
            <b className="text-foreground tabular-nums">{list.length}</b> bác sĩ · {activeCount} đang khám · {onlineCount} hiện trên trang đặt
            lịch
          </p>
        )}
      </div>

      {doctors.error ? (
        <div className="bg-card rounded-xl border shadow-xs">
          <ErrorState error={doctors.error} onRetry={() => void doctors.refetch()} />
        </div>
      ) : doctors.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <DoctorCardSkeleton key={i} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-card rounded-xl border shadow-xs">
          {filtering ? (
            <EmptyState
              icon={SearchX}
              title="Không tìm thấy bác sĩ"
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
              title="Chưa có bác sĩ"
              description="Thêm bác sĩ, khai báo lịch làm việc để lễ tân đặt lịch và bệnh nhân đặt online."
              action={
                canCreate && (
                  <Button onClick={openCreate}>
                    <Plus aria-hidden="true" />
                    Thêm bác sĩ
                  </Button>
                )
              }
            />
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((d) => (
            <DoctorCard
              key={d.id}
              doctor={d}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onOpen={(tab) => open(d, tab)}
              onToggleActive={() => (d.isActive ? setDeactivateTarget(d) : reactivate(d))}
              onToggleOnline={() => toggleOnline(d)}
              onDelete={() => setDeleteTarget(d)}
            />
          ))}
        </div>
      )}

      <DoctorSheet
        state={sheet}
        doctors={list}
        specialties={specialties.data ?? []}
        canCreate={canCreate}
        canUpdate={canUpdate}
        onChange={setSheet}
        onClose={() => setSheet(null)}
      />

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(o) => !o && setDeactivateTarget(null)}
        icon={CirclePause}
        title={`Ngừng ${deactivateTarget?.displayName ?? ''}?`}
        description="Bác sĩ không còn trên lịch hẹn mới và trang đặt lịch; lịch sử khám, lịch hẹn đã có giữ nguyên. Hoạt động lại được bất cứ lúc nào."
        confirmText="Ngừng hoạt động"
        loading={setActive.isPending}
        onConfirm={confirmDeactivate}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        variant="destructive"
        icon={Trash2}
        title={`Xóa ${deleteTarget?.displayName ?? ''}?`}
        description="Chỉ xóa được bác sĩ chưa có lịch hẹn, lượt khám hay kế hoạch điều trị. Bác sĩ đã làm việc thì chọn Ngừng để giữ lịch sử."
        confirmText="Xóa bác sĩ"
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
