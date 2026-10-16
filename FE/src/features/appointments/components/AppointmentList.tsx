'use client'

import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarSearch, CheckCircle2, UserX } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTableQuery } from '@/hooks/use-table-query'
import { formatPhone } from '@/lib/format'
import type { AppointmentCardDto, AppointmentQuery, AppointmentStatus } from '@/types/clinic'
import { AppointmentStatusBadge, SourceBadge } from '@/features/clinic/components/ClinicBadges'
import { useAppointments, useDoctorOptions } from '@/features/clinic/hooks/use-clinic'
import { appointmentStatusLabels } from '@/features/clinic/lib/labels'
import { ddmmyyyy, isoWeekdayOf, vnHhmm, vnHhmmDate, weekdayShort } from '@/features/clinic/lib/vn-time'
import { appointmentStatuses } from '../lib/appointment-ui'
import { DoctorSelect } from './DoctorSelect'

type AppointmentListProps = {
  /** all: tab Danh sách (lọc trạng thái); pending: tab Chờ xác nhận (UC-04 1a) */
  mode: 'all' | 'pending'
  today: string
  status?: AppointmentStatus
  onStatusChange?: (status: AppointmentStatus | undefined) => void
  onOpen: (id: string) => void
}

type Filters = { doctorId: string; from: string; to: string }

const ALL = '__all__'

const columns: ColumnDef<AppointmentCardDto>[] = [
  {
    id: 'startAt',
    header: 'Giờ hẹn',
    enableSorting: true,
    cell: ({ row }) => (
      <div className="tabular-nums">
        <p className="font-semibold">{vnHhmm(row.original.startAt)}</p>
        <p className="text-muted-foreground text-xs">
          {weekdayShort(isoWeekdayOf(row.original.date))}, {ddmmyyyy(row.original.date)}
        </p>
      </div>
    ),
  },
  {
    id: 'code',
    header: 'Mã lịch',
    enableSorting: true,
    cell: ({ row }) => <span className="font-medium tabular-nums">{row.original.code}</span>,
  },
  {
    id: 'patient',
    header: 'Bệnh nhân',
    cell: ({ row }) => {
      const a = row.original
      return (
        <div className="min-w-0 space-y-0.5">
          <p className="truncate font-medium">{a.patientName}</p>
          <p className="text-muted-foreground text-xs tabular-nums">
            {formatPhone(a.patientPhone)}
            {a.patientCode ? ` · ${a.patientCode}` : ''}
          </p>
          {a.isGuest && (
            <StatusBadge tone="warning" dot={false} icon={<UserX className="size-3" aria-hidden="true" />} className="h-5 px-1.5 text-[0.6875rem]">
              Chưa ghép hồ sơ
            </StatusBadge>
          )}
        </div>
      )
    },
  },
  { id: 'doctor', header: 'Bác sĩ', cell: ({ row }) => row.original.doctorName },
  {
    id: 'service',
    header: 'Dịch vụ / lý do',
    meta: { className: 'max-w-56' },
    cell: ({ row }) => <span className="line-clamp-2 text-sm">{row.original.serviceName ?? row.original.reason ?? '—'}</span>,
  },
  {
    id: 'source',
    header: 'Nguồn',
    cell: ({ row }) => (row.original.source === 'Online' ? <SourceBadge source="Online" /> : <span className="text-muted-foreground text-sm">Lễ tân</span>),
  },
  { id: 'status', header: 'Trạng thái', cell: ({ row }) => <AppointmentStatusBadge status={row.original.status} /> },
  {
    id: 'createdAt',
    header: 'Đặt lúc',
    enableSorting: true,
    cell: ({ row }) => <span className="text-muted-foreground text-xs tabular-nums">{vnHhmmDate(row.original.createdAt)}</span>,
  },
]

/** Dạng danh sách (UC-04 1d) và tab "Chờ xác nhận" (UC-04 1a, TC-14): phân trang, lọc trạng thái, khoảng ngày, bác sĩ, tìm kiếm. */
export function AppointmentList({ mode, today, status, onStatusChange, onOpen }: AppointmentListProps) {
  const pendingMode = mode === 'pending'
  const table = useTableQuery<Filters>({ pageSize: 20, ...(pendingMode ? {} : { from: today }) })
  // Đổi key để ô tìm kiếm xóa chữ đang gõ khi bấm "Xóa lọc"
  const [resetKey, setResetKey] = useState(0)
  const doctors = useDoctorOptions()
  const query: AppointmentQuery = useMemo(
    () => ({ ...table.query, status: pendingMode ? 'ChoXacNhan' : status }),
    [table.query, pendingMode, status]
  )
  const list = useAppointments(query)
  const { from, to, doctorId, search } = table.state
  const filtered = !!(search || doctorId || to || (pendingMode ? from : from !== today) || (!pendingMode && status))

  const reset = () => {
    table.resetFilters()
    if (!pendingMode) table.setFilter('from', today)
    setResetKey((k) => k + 1)
    if (status) onStatusChange?.(undefined)
  }

  return (
    <div className="space-y-3">
      {pendingMode && (
        <p className="text-muted-foreground text-sm">
          Lịch bệnh nhân tự đặt online đang giữ chỗ trong khung. Mở từng lịch để ghép hồ sơ và xác nhận; tin xác nhận (giả lập) được tạo khi xác nhận.
        </p>
      )}
      <DataTable
        columns={columns}
        data={list.data?.items}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        getRowId={(a) => a.id}
        onRowClick={(a) => onOpen(a.id)}
        minWidth={1040}
        sorting={{ sortBy: table.state.sortBy, sortDir: table.state.sortDir, onSortChange: table.setSort }}
        pagination={list.data && { ...list.data, onPageChange: table.setPage, onPageSizeChange: table.setPageSize }}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput key={resetKey} onSearch={table.setSearch} placeholder="Mã lịch, tên, số điện thoại" className="sm:max-w-64" />
            {!pendingMode && (
              <Select
                value={status ?? ALL}
                onValueChange={(v) => onStatusChange?.(v === ALL ? undefined : (v as AppointmentStatus))}
              >
                <SelectTrigger className="w-full sm:w-44" aria-label="Lọc trạng thái">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tất cả trạng thái</SelectItem>
                  {appointmentStatuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {appointmentStatusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <DoctorSelect
              doctors={doctors.data}
              value={doctorId ?? ''}
              allowAll
              onChange={(v) => table.setFilter('doctorId', v || undefined)}
              className="w-full sm:w-56"
              aria-label="Lọc bác sĩ"
            />
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={from ?? ''}
                max={to || undefined}
                onChange={(e) => table.setFilter('from', e.target.value || undefined)}
                aria-label="Từ ngày"
                className="w-40"
              />
              <span className="text-muted-foreground" aria-hidden="true">
                –
              </span>
              <Input
                type="date"
                value={to ?? ''}
                min={from || undefined}
                onChange={(e) => table.setFilter('to', e.target.value || undefined)}
                aria-label="Đến ngày"
                className="w-40"
              />
            </div>
            {filtered && (
              <Button variant="ghost" onClick={reset}>
                Xóa lọc
              </Button>
            )}
          </div>
        }
        emptyState={
          pendingMode && !filtered ? (
            <EmptyState icon={CheckCircle2} title="Không còn lịch chờ xác nhận" description="Lịch online mới sẽ hiện ở đây để lễ tân xác nhận." />
          ) : (
            <EmptyState
              icon={CalendarSearch}
              title="Không có lịch hẹn phù hợp"
              description="Thử đổi khoảng ngày, bác sĩ hoặc từ khóa tìm kiếm."
              action={
                filtered && (
                  <Button variant="outline" onClick={reset}>
                    Xóa lọc
                  </Button>
                )
              }
            />
          )
        }
      />
    </div>
  )
}
