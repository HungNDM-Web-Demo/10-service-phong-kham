'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { BellRing, CalendarPlus, Loader2, PhoneCall, Send } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { PermissionGuard } from '@/components/shared/PermissionGuard'
import { SearchInput } from '@/components/shared/SearchInput'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { permissions } from '@/config/permissions'
import { routePath } from '@/config/route-path'
import { usePermissions } from '@/hooks/use-permissions'
import { useTableQuery } from '@/hooks/use-table-query'
import { getErrorMessage } from '@/lib/api-error'
import { formatPhone } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CallResult, FollowUpDto, FollowUpGroup } from '@/types/clinic'
import { FollowUpStatusBadge } from '@/features/clinic/components/ClinicBadges'
import {
  useDoctorOptions,
  useFollowUps,
  useSendFollowUps,
} from '@/features/clinic/hooks/use-clinic'
import { callResultLabels } from '@/features/clinic/lib/labels'
import { problemCode } from '@/features/clinic/lib/problem'
import { clinicRules } from '@/features/clinic/lib/rules'
import { ddmmyyyy, vnHhmmDate } from '@/features/clinic/lib/vn-time'
import { BookFollowUpDialog } from '../components/BookFollowUpDialog'
import { CallResultDialog } from '../components/CallResultDialog'
import { SendResultDialog, type SendOutcome } from '../components/SendResultDialog'

type Filters = { group: FollowUpGroup; doctorId: string; from: string; to: string }

const GROUPS: { value: FollowUpGroup; label: string; empty: string }[] = [
  { value: 'due', label: 'Đến hạn nhắc', empty: 'Không có bệnh nhân đến hạn nhắc' },
  { value: 'reminded', label: 'Đã nhắc', empty: 'Chưa có dòng nào đã nhắc' },
  { value: 'overdue', label: 'Quá hạn', empty: 'Không có dòng quá hạn' },
  { value: 'returned', label: 'Đã quay lại', empty: 'Chưa có bệnh nhân quay lại tái khám' },
]

const callTones: Record<CallResult, string> = {
  DongYDen: 'text-success',
  HenNgayKhac: 'text-info',
  KhongLienLacDuoc: 'text-warning',
}

/**
 * Nhắc tái khám (SCR-16, UC-13, FR-36, FR-37): nhóm Đến hạn nhắc / Đã nhắc / Quá hạn / Đã quay lại; gửi tin nhắc giả lập
 * (BR-30: tối đa 3 lần, cách nhau 24 giờ), ghi kết quả gọi, đặt lịch hẹn ngay từ dòng nhắc.
 */
export function FollowUpsPage() {
  const { can } = usePermissions()
  const canUpdate = can(permissions.followUps.update)
  const canBook = can(permissions.appointments.create)
  const table = useTableQuery<Filters>({ pageSize: 20, group: 'due' })
  const group = table.state.group ?? 'due'
  const list = useFollowUps(table.query)
  const doctors = useDoctorOptions()
  const send = useSendFollowUps()
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [outcome, setOutcome] = useState<SendOutcome | null>(null)
  const [calling, setCalling] = useState<FollowUpDto | null>(null)
  const [booking, setBooking] = useState<FollowUpDto | null>(null)

  const rows = useMemo(() => list.data?.page.items ?? [], [list.data])
  const counts = list.data?.counts
  const selectable = rows.filter((r) => r.canSend)
  const selectedRows = selectable.filter((r) => selected.has(r.id))
  const allSelected = selectable.length > 0 && selectedRows.length === selectable.length
  const showSelect = canUpdate && group !== 'returned'

  const changeGroup = (value: string) => {
    table.setFilter('group', value as FollowUpGroup)
    setSelected(new Set())
  }

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  const doSend = (targets: FollowUpDto[]) => {
    if (targets.length === 0) return
    send.mutate(
      targets.map((t) => t.id),
      {
        onSuccess: (result) => {
          setOutcome({ result, rows: new Map(targets.map((t) => [t.id, t])) })
          setSelected(new Set())
          const failed = result.items.length - result.sentCount
          if (result.sentCount > 0) toast.success(`Đã gửi ${result.sentCount} tin nhắc tái khám`)
          if (failed > 0) toast.warning(`${failed} dòng chưa gửi được`)
        },
        onError: (err) =>
          toast.error(
            problemCode(err) === 'GuiNhacQuaSom'
              ? `Chưa gửi được: ${getErrorMessage(err)}`
              : getErrorMessage(err)
          ),
      }
    )
  }

  const afterCall = (row: FollowUpDto, result: CallResult) => {
    if (result === 'DongYDen' && canBook && !row.appointmentId && row.status !== 'DaQuayLai')
      setBooking(row)
  }

  const cols: ColumnDef<FollowUpDto>[] = []
  if (showSelect) {
    cols.push({
      id: 'select',
      meta: { className: 'w-10', headerClassName: 'w-10' },
      header: () => (
        <Checkbox
          aria-label="Chọn tất cả dòng gửi được trên trang"
          disabled={selectable.length === 0}
          checked={allSelected ? true : selectedRows.length > 0 ? 'indeterminate' : false}
          onCheckedChange={(v) =>
            setSelected(v === true ? new Set(selectable.map((r) => r.id)) : new Set())
          }
        />
      ),
      cell: ({ row }) => {
        const r = row.original
        if (r.canSend)
          return (
            <Checkbox
              aria-label={`Chọn ${r.patientName}`}
              checked={selected.has(r.id)}
              onCheckedChange={(v) => toggle(r.id, v === true)}
            />
          )
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                tabIndex={0}
                className="focus-visible:ring-ring/50 inline-flex rounded outline-none focus-visible:ring-3"
              >
                <Checkbox
                  aria-label={`Không gửi được cho ${r.patientName}: ${r.sendBlockedReason ?? ''}`}
                  disabled
                  checked={false}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent>{r.sendBlockedReason ?? 'Không gửi được'}</TooltipContent>
          </Tooltip>
        )
      },
    })
  }
  cols.push(
    {
      id: 'patient',
      header: 'Bệnh nhân',
      cell: ({ row }) => {
        const r = row.original
        return (
          <div className="min-w-0">
            <Link
              href={routePath.patientDetail(r.patientId)}
              className="hover:text-primary font-medium underline-offset-4 hover:underline"
            >
              {r.patientName}
            </Link>
            <p className="text-muted-foreground text-xs tabular-nums">
              {r.patientCode} ·{' '}
              <a href={`tel:${r.patientPhone}`} className="hover:text-foreground">
                {formatPhone(r.patientPhone)}
              </a>
            </p>
          </div>
        )
      },
    },
    {
      id: 'doctor',
      header: 'Bác sĩ',
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.doctorName}</span>,
    },
    {
      id: 'visit',
      header: 'Lượt khám',
      cell: ({ row }) => (
        <div className="tabular-nums">
          <p>{row.original.visitDate ? ddmmyyyy(row.original.visitDate) : '—'}</p>
          {row.original.visitCode && (
            <Link
              href={routePath.visitDetail(row.original.visitId)}
              className="text-primary text-xs underline-offset-4 hover:underline"
            >
              {row.original.visitCode}
            </Link>
          )}
        </div>
      ),
    },
    {
      id: 'dueDate',
      header: 'Ngày hẹn',
      cell: ({ row }) => (
        <div className="tabular-nums">
          <p className="font-medium">{ddmmyyyy(row.original.dueDate)}</p>
          {row.original.status !== 'DaQuayLai' && <DueHint days={row.original.daysToDue} />}
        </div>
      ),
    },
    {
      id: 'note',
      header: 'Nội dung tái khám',
      cell: ({ row }) => (
        <span
          className="text-muted-foreground line-clamp-2 max-w-56 text-sm"
          title={row.original.note ?? undefined}
        >
          {row.original.note || 'Tái khám'}
        </span>
      ),
    },
    {
      id: 'sends',
      header: 'Tin đã gửi',
      cell: ({ row }) => {
        const r = row.original
        return (
          <div className="text-sm">
            <p className="tabular-nums">
              {r.sendCount}/{clinicRules.maxReminderSends} lần
            </p>
            {r.lastSentAt && (
              <p className="text-muted-foreground text-xs tabular-nums">
                {vnHhmmDate(r.lastSentAt)}
              </p>
            )}
            {!r.canSend && r.sendBlockedReason && r.status !== 'DaQuayLai' && (
              <p className="text-warning text-xs">{r.sendBlockedReason}</p>
            )}
          </div>
        )
      },
    },
    {
      id: 'call',
      header: 'Kết quả gọi',
      cell: ({ row }) => {
        const r = row.original
        if (!r.callResult) return <span className="text-muted-foreground text-sm">Chưa gọi</span>
        return (
          <div className="max-w-44 text-sm">
            <p className={cn('font-medium', callTones[r.callResult])}>
              {callResultLabels[r.callResult]}
            </p>
            {r.callNote && (
              <p className="text-muted-foreground line-clamp-2 text-xs" title={r.callNote}>
                {r.callNote}
              </p>
            )}
          </div>
        )
      },
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => {
        const r = row.original
        return (
          <div className="space-y-1">
            <FollowUpStatusBadge status={r.status} />
            {r.appointmentCode && (
              <p className="text-muted-foreground text-xs tabular-nums">Lịch {r.appointmentCode}</p>
            )}
            {r.returnedVisitId && r.returnedVisitCode && (
              <Link
                href={routePath.visitDetail(r.returnedVisitId)}
                className="text-primary block text-xs tabular-nums underline-offset-4 hover:underline"
              >
                {r.returnedVisitCode}
              </Link>
            )}
          </div>
        )
      },
    }
  )
  if (canUpdate || canBook) {
    cols.push({
      id: 'actions',
      header: () => <span className="sr-only">Thao tác</span>,
      meta: { className: 'text-right' },
      cell: ({ row }) => {
        const r = row.original
        if (r.status === 'DaQuayLai') return null
        return (
          <div className="flex justify-end gap-1">
            {canUpdate && (
              <RowAction
                label={r.canSend ? 'Gửi tin nhắc' : (r.sendBlockedReason ?? 'Không gửi được')}
                disabled={!r.canSend || send.isPending}
                onClick={() => doSend([r])}
              >
                <Send aria-hidden="true" />
              </RowAction>
            )}
            {canUpdate && (
              <RowAction label="Ghi kết quả gọi" onClick={() => setCalling(r)}>
                <PhoneCall aria-hidden="true" />
              </RowAction>
            )}
            {canBook && !r.appointmentId && (
              <RowAction label="Đặt lịch hẹn" onClick={() => setBooking(r)}>
                <CalendarPlus aria-hidden="true" />
              </RowAction>
            )}
          </div>
        )
      },
    })
  }

  const activeGroup = GROUPS.find((g) => g.value === group) ?? GROUPS[0]

  return (
    <PermissionGuard permission={permissions.followUps.view} redirect>
      <div className="space-y-6">
        <PageHeader
          title="Nhắc tái khám"
          icon={BellRing}
          description="Gửi tin nhắc giả lập, ghi kết quả gọi điện và đặt lịch cho bệnh nhân đến hạn tái khám."
        />

        <Tabs value={group} onValueChange={changeGroup}>
          <div className="-mx-1 overflow-x-auto overflow-y-hidden px-1 pb-1">
            <TabsList aria-label="Nhóm nhắc tái khám" className="h-10">
              {GROUPS.map((g) => (
                <TabsTrigger key={g.value} value={g.value} className="gap-2 px-3">
                  {g.label}
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-px text-xs tabular-nums',
                      g.value === 'overdue' && (counts?.overdue ?? 0) > 0
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-muted-foreground/10'
                    )}
                  >
                    {counts ? counts[g.value] : '…'}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        <DataTable
          columns={cols}
          data={rows}
          getRowId={(r) => r.id}
          isLoading={list.isLoading}
          isFetching={list.isFetching}
          error={list.error}
          onRetry={() => void list.refetch()}
          minWidth={1180}
          pagination={
            list.data && {
              page: list.data.page.page,
              pageSize: list.data.page.pageSize,
              totalCount: list.data.page.totalCount,
              totalPages: list.data.page.totalPages,
              onPageChange: (p) => {
                table.setPage(p)
                setSelected(new Set())
              },
              onPageSizeChange: table.setPageSize,
            }
          }
          toolbar={
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <SearchInput
                  value={table.state.search}
                  onSearch={table.setSearch}
                  placeholder="Tìm tên, số điện thoại, mã BN"
                  className="sm:max-w-xs"
                />
                <Select
                  value={table.state.doctorId ?? 'all'}
                  onValueChange={(v) => table.setFilter('doctorId', v === 'all' ? undefined : v)}
                >
                  <SelectTrigger className="sm:w-60" aria-label="Lọc theo bác sĩ">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả bác sĩ</SelectItem>
                    {(doctors.data ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div
                  className="flex items-center gap-2"
                  role="group"
                  aria-label="Lọc theo ngày hẹn"
                >
                  <Input
                    type="date"
                    aria-label="Ngày hẹn từ"
                    value={table.state.from ?? ''}
                    max={table.state.to}
                    onChange={(e) => table.setFilter('from', e.target.value || undefined)}
                    className="sm:w-40"
                  />
                  <span className="text-muted-foreground text-sm" aria-hidden="true">
                    –
                  </span>
                  <Input
                    type="date"
                    aria-label="Ngày hẹn đến"
                    value={table.state.to ?? ''}
                    min={table.state.from}
                    onChange={(e) => table.setFilter('to', e.target.value || undefined)}
                    className="sm:w-40"
                  />
                </div>
              </div>
              {showSelect && (
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm" aria-live="polite">
                    {selectedRows.length > 0
                      ? `Đã chọn ${selectedRows.length} dòng`
                      : 'Chọn dòng để gửi tin'}
                  </span>
                  <Button
                    variant="cta"
                    disabled={selectedRows.length === 0 || send.isPending}
                    onClick={() => doSend(selectedRows)}
                  >
                    {send.isPending ? (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Send aria-hidden="true" />
                    )}
                    Gửi tin nhắc{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
                  </Button>
                </div>
              )}
            </div>
          }
          emptyState={
            <EmptyState
              icon={BellRing}
              title={activeGroup.empty}
              description={
                table.state.search || table.state.doctorId || table.state.from || table.state.to
                  ? 'Thử bỏ bớt bộ lọc.'
                  : undefined
              }
            />
          }
        />
      </div>

      <SendResultDialog outcome={outcome} onOpenChange={(o) => !o && setOutcome(null)} />
      <CallResultDialog
        followUp={calling}
        onOpenChange={(o) => !o && setCalling(null)}
        onSaved={afterCall}
      />
      <BookFollowUpDialog followUp={booking} onOpenChange={(o) => !o && setBooking(null)} />
    </PermissionGuard>
  )
}

function DueHint({ days }: { days: number }) {
  if (days === 0) return <p className="text-warning text-xs font-medium">Hôm nay</p>
  if (days > 0) return <p className="text-muted-foreground text-xs">Còn {days} ngày</p>
  return <p className="text-destructive text-xs font-medium">Quá {-days} ngày</p>
}

function RowAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Bọc span để nút bị khóa vẫn hiện chú thích lý do khi rê chuột / focus */}
        <span
          tabIndex={disabled ? 0 : -1}
          className="focus-visible:ring-ring/50 inline-flex rounded-md outline-none focus-visible:ring-3"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
          >
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
