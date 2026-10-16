'use client'

import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarDays, Lock } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { permissions } from '@/config/permissions'
import { usePermissions } from '@/hooks/use-permissions'
import type { AppointmentCardDto } from '@/types/clinic'
import { AppointmentStatusBadge } from '@/features/clinic/components/ClinicBadges'
import { useAppointments } from '@/features/clinic/hooks/use-clinic'
import { sourceLabels } from '@/features/clinic/lib/labels'
import { ddmmyyyy, vnHhmm } from '@/features/clinic/lib/vn-time'

/** Tab Lịch hẹn của hồ sơ (UC-07 1a): mọi lịch hẹn của bệnh nhân, mới nhất trước. */
export function PatientAppointmentsTab({ patientId }: { patientId: string }) {
  const { can } = usePermissions()
  const allowed = can(permissions.appointments.view)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const appointments = useAppointments(
    { patientId, page, pageSize, sortBy: 'startAt', sortDir: 'desc' },
    allowed
  )

  const columns = useMemo<ColumnDef<AppointmentCardDto>[]>(
    () => [
      {
        id: 'startAt',
        header: 'Thời gian',
        cell: ({ row }) => (
          <div className="tabular-nums">
            <p className="font-medium">
              {vnHhmm(row.original.startAt)} · {ddmmyyyy(row.original.date)}
            </p>
            <p className="text-muted-foreground text-xs">{row.original.code}</p>
          </div>
        ),
      },
      { id: 'doctor', header: 'Bác sĩ', cell: ({ row }) => row.original.doctorName },
      {
        id: 'service',
        header: 'Dịch vụ / Lý do',
        cell: ({ row }) => (
          <span className="text-muted-foreground line-clamp-2 max-w-72 text-sm">
            {[row.original.serviceName, row.original.reason].filter(Boolean).join(' · ') || '—'}
          </span>
        ),
      },
      { id: 'source', header: 'Nguồn', cell: ({ row }) => sourceLabels[row.original.source] },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <AppointmentStatusBadge status={row.original.status} />,
      },
    ],
    []
  )

  if (!allowed)
    return (
      <div className="bg-card rounded-xl border">
        <EmptyState icon={Lock} title="Không có quyền xem lịch hẹn" compact />
      </div>
    )

  return (
    <DataTable
      columns={columns}
      data={appointments.data?.items}
      getRowId={(a) => a.id}
      isLoading={appointments.isLoading}
      isFetching={appointments.isFetching}
      error={appointments.error}
      onRetry={() => void appointments.refetch()}
      minWidth={720}
      pagination={
        appointments.data && {
          page: appointments.data.page,
          pageSize: appointments.data.pageSize,
          totalCount: appointments.data.totalCount,
          totalPages: appointments.data.totalPages,
          onPageChange: setPage,
          onPageSizeChange: (s) => {
            setPageSize(s)
            setPage(1)
          },
          pageSizeOptions: [10, 20, 50],
        }
      }
      emptyState={<EmptyState icon={CalendarDays} title="Chưa có lịch hẹn" compact />}
    />
  )
}
