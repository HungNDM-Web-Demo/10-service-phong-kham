'use client'

import { CalendarClock, CalendarOff, IdCard } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DoctorDto, SpecialtyDto } from '@/types/clinic'
import { DaysOffPanel } from './DaysOffPanel'
import { DoctorInfoForm } from './DoctorInfoForm'
import { ScheduleEditor } from './ScheduleEditor'

export type DoctorTab = 'info' | 'schedule' | 'days-off'

/** `id` null là thêm mới; `fallback` giữ bác sĩ vừa tạo trong lúc danh sách đang tải lại */
export type DoctorSheetState = { id: string | null; tab: DoctorTab; fallback?: DoctorDto }

/**
 * Ngăn kéo bác sĩ (SCR-03; UC-02): tab Thông tin, Lịch làm việc, Ngày nghỉ. Thêm mới chỉ mở tab Thông tin; lưu xong chuyển
 * sang tab Lịch làm việc của bác sĩ vừa tạo (UC-02 bước 2 → 3). Các tab giữ bản đang sửa khi chuyển qua lại.
 */
export function DoctorSheet({
  state,
  doctors,
  specialties,
  canCreate,
  canUpdate,
  onChange,
  onClose,
}: {
  state: DoctorSheetState | null
  doctors: DoctorDto[]
  specialties: SpecialtyDto[]
  canCreate: boolean
  canUpdate: boolean
  onChange: (state: DoctorSheetState) => void
  onClose: () => void
}) {
  const doctor = state?.id ? (doctors.find((d) => d.id === state.id) ?? (state.fallback?.id === state.id ? state.fallback : null)) : null
  const open = !!state && (state.id === null || !!doctor)

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl"
      >
        {state && (
          <SheetBody
            key={state.id ?? 'new'}
            state={state}
            doctor={doctor}
            specialties={specialties}
            canEdit={doctor ? canUpdate : canCreate}
            onChange={onChange}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function SheetBody({
  state,
  doctor,
  specialties,
  canEdit,
  onChange,
  onClose,
}: {
  state: DoctorSheetState
  doctor: DoctorDto | null
  specialties: SpecialtyDto[]
  canEdit: boolean
  onChange: (state: DoctorSheetState) => void
  onClose: () => void
}) {
  const tab: DoctorTab = doctor ? state.tab : 'info'

  return (
    <>
      <SheetHeader className="border-b px-6 py-4 pr-14">
        {doctor ? (
          <div className="flex items-center gap-3">
            <UserAvatar name={doctor.fullName} avatarUrl={doctor.photoUrl} size="lg" />
            <div className="min-w-0 space-y-1">
              <SheetTitle className="truncate text-lg font-semibold">{doctor.displayName}</SheetTitle>
              <SheetDescription className="truncate">
                {[doctor.title, doctor.specialtyName, `${doctor.room} (${doctor.roomShort})`].filter(Boolean).join(' · ')}
              </SheetDescription>
              <div className="flex flex-wrap gap-1.5">
                <StatusBadge tone="neutral" dot={false} className="font-mono">
                  {doctor.code}
                </StatusBadge>
                {doctor.isActive ? <StatusBadge tone="success">Đang khám</StatusBadge> : <StatusBadge tone="neutral">Ngừng</StatusBadge>}
                {!doctor.showOnline && <StatusBadge tone="warning">Ẩn khỏi trang đặt lịch</StatusBadge>}
              </div>
            </div>
          </div>
        ) : (
          <>
            <SheetTitle className="text-lg font-semibold">Thêm bác sĩ</SheetTitle>
            <SheetDescription>Lưu thông tin trước, sau đó khai báo lịch làm việc và ngày nghỉ.</SheetDescription>
          </>
        )}
      </SheetHeader>

      <Tabs
        value={tab}
        onValueChange={(v) => doctor && onChange({ ...state, tab: v as DoctorTab })}
        className="min-h-0 flex-1 gap-0"
      >
        <div className="max-w-full overflow-x-auto overflow-y-hidden border-b px-6 py-3">
          <TabsList className="group-data-horizontal/tabs:h-10">
            <TabsTrigger value="info" className="px-3">
              <IdCard aria-hidden="true" />
              Thông tin
            </TabsTrigger>
            <TabsTrigger value="schedule" className="px-3" disabled={!doctor}>
              <CalendarClock aria-hidden="true" />
              Lịch làm việc
            </TabsTrigger>
            <TabsTrigger value="days-off" className="px-3" disabled={!doctor}>
              <CalendarOff aria-hidden="true" />
              Ngày nghỉ
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="info" forceMount className="flex min-h-0 flex-col data-[state=inactive]:hidden">
          <DoctorInfoForm
            doctor={doctor}
            specialties={specialties}
            canEdit={canEdit}
            onCreated={(saved) => onChange({ id: saved.id, tab: 'schedule', fallback: saved })}
            onCancel={onClose}
          />
        </TabsContent>
        {doctor && (
          <>
            <TabsContent value="schedule" forceMount className="flex min-h-0 flex-col data-[state=inactive]:hidden">
              <ScheduleEditor doctor={doctor} specialties={specialties} canEdit={canEdit} />
            </TabsContent>
            <TabsContent value="days-off" forceMount className="flex min-h-0 flex-col data-[state=inactive]:hidden">
              <DaysOffPanel doctor={doctor} canEdit={canEdit} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </>
  )
}
