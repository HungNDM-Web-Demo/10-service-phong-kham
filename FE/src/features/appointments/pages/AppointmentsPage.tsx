'use client'

import { useState } from 'react'
import { CalendarDays, CalendarRange, Clock, List, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PermissionGuard } from '@/components/shared/PermissionGuard'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { permissions } from '@/config/permissions'
import { usePermissions } from '@/hooks/use-permissions'
import { usePendingCount, useSpecialties } from '@/features/clinic/hooks/use-clinic'
import { addDaysKey, ddmmyyyy, isoWeekdayOf, weekdayLabel } from '@/features/clinic/lib/vn-time'
import { AppointmentDetailSheet } from '../components/AppointmentDetailSheet'
import { AppointmentList } from '../components/AppointmentList'
import { CreateAppointmentDialog, type CreateAppointmentTarget } from '../components/CreateAppointmentDialog'
import { DateNavigator } from '../components/DateNavigator'
import { DayView } from '../components/DayView'
import { WeekView } from '../components/WeekView'
import { useAppointmentParams, type AppointmentView } from '../hooks/use-appointment-params'
import { mondayOf } from '../lib/appointment-ui'

const ALL = '__all__'

/**
 * Lịch hẹn (SCR-04, UC-04; FR-09, FR-10, FR-12): dạng ngày theo bác sĩ × khung giờ, dạng tuần, danh sách và tab "Chờ xác nhận".
 * URL: `?date=`, `?view=week|list`, `?status=ChoXacNhan`, `?specialtyId=`, `?id=` (mở chi tiết). Bác sĩ chỉ thấy lịch của mình,
 * không có nút tạo, đổi giờ, hủy (UC-04 1e).
 */
export function AppointmentsPage() {
  const { can } = usePermissions()
  const { today, date, view, status, specialtyId, selectedId, setQuery, setView } = useAppointmentParams()
  const pending = usePendingCount()
  const specialties = useSpecialties()
  const [createTarget, setCreateTarget] = useState<CreateAppointmentTarget | null>(null)
  const canCreate = can(permissions.appointments.create)
  const pendingCount = pending.data?.count ?? 0
  const calendarView = view === 'day' || view === 'week'

  const description =
    view === 'day'
      ? `${weekdayLabel(isoWeekdayOf(date))}, ${ddmmyyyy(date)}${date === today ? ' (hôm nay)' : ''}`
      : view === 'week'
        ? `Tuần ${ddmmyyyy(mondayOf(date))} – ${ddmmyyyy(addDaysKey(mondayOf(date), 6))}`
        : view === 'pending'
          ? `${pendingCount} lịch đặt online đang chờ xác nhận`
          : 'Tra cứu lịch hẹn theo trạng thái, khoảng ngày, bác sĩ'

  const openDetail = (id: string) => setQuery({ id })

  return (
    <PermissionGuard permission={permissions.appointments.view} redirect>
      <div className="space-y-4">
        <PageHeader
          title="Lịch hẹn"
          icon={CalendarDays}
          description={description}
          actions={
            canCreate && (
              <Button onClick={() => setCreateTarget({ date: view === 'day' || view === 'week' ? date : today })}>
                <Plus aria-hidden="true" />
                Tạo lịch hẹn
              </Button>
            )
          }
        />

        <Tabs value={view} onValueChange={(v) => setView(v as AppointmentView)} className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList aria-label="Kiểu xem lịch hẹn" className="max-w-full overflow-x-auto overflow-y-hidden">
              <TabsTrigger value="day">
                <CalendarDays aria-hidden="true" />
                Ngày
              </TabsTrigger>
              <TabsTrigger value="week">
                <CalendarRange aria-hidden="true" />
                Tuần
              </TabsTrigger>
              <TabsTrigger value="list">
                <List aria-hidden="true" />
                Danh sách
              </TabsTrigger>
              <TabsTrigger value="pending">
                <Clock aria-hidden="true" />
                Chờ xác nhận
                {pendingCount > 0 && (
                  <span className="bg-warning text-warning-foreground min-w-5 rounded-full px-1.5 text-center text-[0.6875rem] leading-5 font-semibold tabular-nums">
                    {pendingCount}
                    <span className="sr-only"> lịch</span>
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {calendarView && (
              <div className="flex flex-wrap items-center gap-2">
                <DateNavigator date={date} today={today} mode={view} onChange={(d) => setQuery({ date: d })} />
                <Select value={specialtyId ?? ALL} onValueChange={(v) => setQuery({ specialtyId: v === ALL ? null : v })}>
                  <SelectTrigger className="w-48" aria-label="Lọc chuyên khoa">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Tất cả chuyên khoa</SelectItem>
                    {(specialties.data ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <TabsContent value="day">
            <DayView
              date={date}
              today={today}
              specialtyId={specialtyId}
              onCreate={(t) => setCreateTarget(t)}
              onOpen={openDetail}
            />
          </TabsContent>
          <TabsContent value="week">
            <WeekView date={date} today={today} specialtyId={specialtyId} onPickDay={(d) => setQuery({ date: d, view: null, status: null })} />
          </TabsContent>
          <TabsContent value="list">
            <AppointmentList
              mode="all"
              today={today}
              status={status}
              onStatusChange={(s) => setQuery({ view: 'list', status: s ?? null })}
              onOpen={openDetail}
            />
          </TabsContent>
          <TabsContent value="pending">
            <AppointmentList mode="pending" today={today} onOpen={openDetail} />
          </TabsContent>
        </Tabs>
      </div>

      <AppointmentDetailSheet id={selectedId} onOpenChange={(open) => !open && setQuery({ id: null })} />
      <CreateAppointmentDialog target={createTarget} onOpenChange={(open) => !open && setCreateTarget(null)} />
    </PermissionGuard>
  )
}
