'use client'

import Link from 'next/link'
import {
  ArrowRight,
  BadgePercent,
  BarChart3,
  CalendarDays,
  CircleCheckBig,
  Clock,
  Compass,
  Globe,
  Hourglass,
  RefreshCw,
  UserCheck,
  UserX,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PermissionGuard } from '@/components/shared/PermissionGuard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { permissions } from '@/config/permissions'
import { routePath } from '@/config/route-path'
import { getVisibleNavGroups } from '@/config/routes'
import { useDashboardToday } from '@/features/clinic/hooks/use-clinic'
import { clinicRules } from '@/features/clinic/lib/rules'
import { ddmmyyyy, isoWeekdayOf, vnNow, vnParts, vnToday, weekdayLabel } from '@/features/clinic/lib/vn-time'
import { usePermissions } from '@/hooks/use-permissions'
import { formatNumber, formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { DoctorBoard } from '../components/DoctorBoard'
import { HourlyCheckInChart } from '../components/HourlyCheckInChart'
import { LongWaitList } from '../components/LongWaitList'
import { StatTile } from '../components/StatTile'

function greeting(hour: number) {
  if (hour < 11) return 'Chào buổi sáng'
  if (hour < 13) return 'Chào buổi trưa'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

const clock = (ms: number) => (ms ? new Date(ms).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—')

/**
 * Tổng quan (SCR-01; UC-14; FR-01, FR-02): 7 thẻ số hôm nay, biểu đồ lượt tiếp đón theo giờ, bảng theo bác sĩ, lượt chờ
 * từ 30 phút, khu "Cần xử lý" và lối tắt. Tự làm mới mỗi 30 giây. Người không có quyền `reports.view` chỉ thấy lời chào
 * và lối tắt (UC-14 E2).
 */
export function DashboardPage() {
  const { user, can } = usePermissions()
  const firstName = user?.fullName.split(' ').slice(-2).join(' ')
  const today = vnToday()
  const hour = vnParts(vnNow()).hour
  const canReports = can(permissions.reports.view)

  return (
    <PermissionGuard permission={permissions.dashboard.view} redirect>
      <div className="space-y-6">
        <section className="bg-card relative overflow-hidden rounded-2xl border p-5 shadow-xs sm:p-6">
          <div className="bg-primary/10 pointer-events-none absolute -top-24 -right-16 size-72 rounded-full blur-3xl" aria-hidden="true" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">
                {weekdayLabel(isoWeekdayOf(today))}, {ddmmyyyy(today)}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                {greeting(hour)}, {firstName}!
              </h1>
              <p className="text-muted-foreground text-sm">
                {canReports ? 'Tình hình phòng khám hôm nay: lịch hẹn, hàng chờ, thực thu.' : 'Chọn chức năng bên dưới để bắt đầu làm việc.'}
              </p>
            </div>
            <QuickActions />
          </div>
        </section>

        {canReports ? <TodayOverview hour={hour} /> : null}

        <Shortcuts />
      </div>
    </PermissionGuard>
  )
}

function QuickActions() {
  const { can } = usePermissions()
  const actions: { href: string; label: string; icon: LucideIcon; show: boolean }[] = [
    { href: routePath.queue, label: 'Hàng chờ', icon: Users, show: can(permissions.queueTickets.view) },
    { href: routePath.appointments, label: 'Lịch hẹn', icon: CalendarDays, show: can(permissions.appointments.view) },
    { href: routePath.invoices, label: 'Thu phí', icon: Wallet, show: can(permissions.invoices.view) },
    { href: routePath.reports, label: 'Báo cáo', icon: BarChart3, show: can(permissions.reports.view) },
  ]
  const visible = actions.filter((a) => a.show)
  if (!visible.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((a) => (
        <Button key={a.href} asChild variant="outline">
          <Link href={a.href}>
            <a.icon aria-hidden="true" />
            {a.label}
          </Link>
        </Button>
      ))}
    </div>
  )
}

function TodayOverview({ hour }: { hour: number }) {
  const { can } = usePermissions()
  const query = useDashboardToday()
  const data = query.data
  const loading = query.isLoading
  const canQueue = can(permissions.queueTickets.view)

  if (query.error && !data)
    return (
      <Card>
        <ErrorState error={query.error} title="Không tải được số liệu hôm nay" onRetry={() => void query.refetch()} />
      </Card>
    )

  const avg = data?.avgWaitMinutes ?? null

  return (
    <>
      <section aria-labelledby="today-stats-title" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="today-stats-title" className="mr-auto text-base font-semibold">
            Số liệu hôm nay
          </h2>
          <p className="text-muted-foreground flex items-center gap-1 text-xs" aria-live="polite">
            Tự làm mới mỗi 30 giây · cập nhật lúc {clock(query.dataUpdatedAt)}
            <Button variant="ghost" size="icon-sm" onClick={() => void query.refetch()} disabled={query.isFetching} aria-label="Làm mới số liệu">
              <RefreshCw className={cn(query.isFetching && 'animate-spin')} aria-hidden="true" />
            </Button>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <StatTile label="Lịch hẹn hôm nay" value={formatNumber(data?.appointments ?? 0, 0)} icon={CalendarDays} hint="Không gồm lịch đã hủy" isLoading={loading} />
          <StatTile
            label="Đã đến"
            value={formatNumber(data?.checkedIn ?? 0, 0)}
            icon={UserCheck}
            tone="info"
            hint="Lượt tiếp đón, gồm cả đến trực tiếp"
            isLoading={loading}
          />
          <StatTile
            label="Đang chờ"
            value={formatNumber(data?.waiting ?? 0, 0)}
            icon={Hourglass}
            tone="warning"
            hint="Chờ khám và chờ kết quả"
            isLoading={loading}
          />
          <StatTile
            label="Đã khám xong"
            value={formatNumber(data?.done ?? 0, 0)}
            icon={CircleCheckBig}
            tone="success"
            hint="Chờ thanh toán và hoàn tất"
            isLoading={loading}
          />
          <StatTile
            label="Không đến"
            value={formatNumber(data?.noShow ?? 0, 0)}
            icon={UserX}
            tone="neutral"
            hint="Lịch chưa tiếp đón chuyển Không đến lúc hết ngày"
            isLoading={loading}
          />
          <StatTile
            label="Thực thu hôm nay"
            value={formatVnd(data?.revenue ?? 0)}
            icon={Wallet}
            tone="success"
            hint="Phiếu thu hợp lệ lập hôm nay, không gồm phiếu đã hủy"
            isLoading={loading}
            className="col-span-2 max-md:order-last"
          />
          <StatTile
            label="Chờ trung bình"
            value={avg === null ? '—' : `${formatNumber(avg, 0)} phút`}
            icon={Clock}
            tone={avg !== null && avg >= clinicRules.waitAlertMinutes ? 'danger' : avg !== null && avg >= clinicRules.waitWarnMinutes ? 'warning' : 'primary'}
            hint={avg === null ? 'Chưa có lượt được gọi khám' : 'Chỉ tính lượt đã được gọi khám'}
            isLoading={loading}
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="gap-3 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Lượt tiếp đón theo giờ</CardTitle>
            <CardDescription>
              {data ? `${formatNumber(data.checkedIn, 0)} lượt hôm nay; cột đậm là giờ hiện tại.` : 'Số bệnh nhân được tiếp đón trong từng giờ.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HourlyCheckInChart data={data?.hourly} currentHour={hour} isLoading={loading} canOpenQueue={canQueue} />
          </CardContent>
        </Card>

        <section aria-labelledby="todo-title" className="space-y-3">
          <h2 id="todo-title" className="text-base font-semibold">
            Cần xử lý
          </h2>
          <TodoCard
            icon={Globe}
            title="Lịch online chờ xác nhận"
            count={data?.pendingOnline}
            loading={loading}
            href={can(permissions.appointments.view) ? `${routePath.appointments}?status=ChoXacNhan` : null}
            actionLabel="Xác nhận lịch"
            emptyText="Không còn lịch online chờ xác nhận."
          />
          <TodoCard
            icon={BadgePercent}
            title="Kế hoạch chờ duyệt giảm giá"
            count={data?.pendingApprovals}
            loading={loading}
            href={can(permissions.treatmentPlans.view) ? `${routePath.treatmentPlans}?status=ChoDuyet` : null}
            actionLabel="Xem kế hoạch chờ duyệt"
            emptyText="Không có kế hoạch giảm giá vượt 10% cần duyệt."
          />
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="gap-0 overflow-hidden py-0 xl:col-span-2">
          <CardHeader className="border-b py-4 [.border-b]:pb-4">
            <CardTitle className="text-base font-semibold">Theo bác sĩ</CardTitle>
            <CardDescription>Phòng, số đang khám, hàng chờ và thời gian chờ trung bình hôm nay.</CardDescription>
          </CardHeader>
          <DoctorBoard doctors={data?.doctors} isLoading={loading} canOpenQueue={canQueue} />
        </Card>
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-4 [.border-b]:pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              Chờ từ 30 phút
              {data && data.longWaits.length > 0 && (
                <span className="bg-warning/12 text-warning rounded-full px-2 text-xs leading-5 font-semibold tabular-nums">{data.longWaits.length}</span>
              )}
            </CardTitle>
            <CardDescription>Lượt đang chờ khám lâu nhất lên đầu.</CardDescription>
          </CardHeader>
          <LongWaitList items={data?.longWaits} isLoading={loading} queueHref={canQueue ? routePath.queue : null} />
        </Card>
      </div>
    </>
  )
}

function TodoCard({
  icon: Icon,
  title,
  count,
  loading,
  href,
  actionLabel,
  emptyText,
}: {
  icon: LucideIcon
  title: string
  count: number | undefined
  loading: boolean
  href: string | null
  actionLabel: string
  emptyText: string
}) {
  const has = (count ?? 0) > 0
  const body = (
    <>
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', has ? 'bg-warning/12 text-warning' : 'bg-muted text-muted-foreground')}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-muted-foreground block text-sm">{title}</span>
        {loading ? (
          <Skeleton className="mt-1 h-7 w-16" />
        ) : (
          <span className="block text-2xl font-semibold tabular-nums">{formatNumber(count ?? 0, 0)}</span>
        )}
        {!loading && (
          <span className={cn('block text-xs', has ? 'text-foreground font-medium' : 'text-muted-foreground')}>
            {has ? (href ? `${actionLabel} →` : 'Cần người có quyền xử lý') : emptyText}
          </span>
        )}
      </span>
    </>
  )
  const className = cn(
    'bg-card flex items-center gap-3 rounded-xl border p-4 shadow-xs transition-colors',
    has && 'border-warning/50'
  )
  return href ? (
    <Link href={href} className={cn(className, 'hover:border-primary/40 focus-visible:ring-ring/50 outline-none focus-visible:ring-3')}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}

function Shortcuts() {
  const { can } = usePermissions()
  const items = getVisibleNavGroups(can)
    .flatMap((g) => g.items)
    .filter((i) => i.href !== routePath.dashboard)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Lối tắt</CardTitle>
        <CardDescription>Các chức năng vai trò của bạn được dùng.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState compact icon={Compass} title="Chưa có chức năng nào khác" description="Liên hệ quản trị viên để được cấp thêm quyền." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                target={item.newTab ? '_blank' : undefined}
                rel={item.newTab ? 'noopener noreferrer' : undefined}
                className="group hover:border-primary/40 focus-visible:ring-ring/50 flex items-start gap-3 rounded-xl border p-3.5 transition-[border-color,box-shadow] duration-200 outline-none hover:shadow-sm focus-visible:ring-3"
              >
                <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <item.icon className="size-[1.125rem]" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2 text-sm font-medium">
                    {item.title}
                    <ArrowRight
                      className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                  {item.description && <span className="text-muted-foreground mt-0.5 block text-xs">{item.description}</span>}
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
