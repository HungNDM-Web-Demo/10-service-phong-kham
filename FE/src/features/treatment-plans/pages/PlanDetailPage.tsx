'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  Info,
  Pencil,
  Printer,
  ShieldCheck,
  ShieldX,
  ThumbsDown,
  ThumbsUp,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PermissionGuard } from '@/components/shared/PermissionGuard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { permissions } from '@/config/permissions'
import { routePath } from '@/config/route-path'
import { usePermissions } from '@/hooks/use-permissions'
import { isApiError } from '@/lib/api-error'
import { formatPhone, formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PlanItemStatus, TreatmentPlanDto } from '@/types/clinic'
import { AllergyBadge, PlanStatusBadge } from '@/features/clinic/components/ClinicBadges'
import { usePlan } from '@/features/clinic/hooks/use-clinic'
import { genderLabels, planItemStatusLabels, type Tone } from '@/features/clinic/lib/labels'
import { clinicRules, teethLabel, unitLabel } from '@/features/clinic/lib/rules'
import { vnDdMmYyyy, vnHhmmDate } from '@/features/clinic/lib/vn-time'
import { PlanActionDialog, type PlanActionKind } from '../components/PlanActionDialog'
import { PlanFormDialog } from '../components/PlanFormDialog'
import { PlanProgress } from '../components/PlanProgress'
import { formatRate } from '../lib/plan-calc'

const itemTones: Record<PlanItemStatus, Tone> = {
  ChuaLam: 'neutral',
  DaLam: 'success',
  DaHuy: 'danger',
}

/**
 * Chi tiết kế hoạch điều trị (SCR-13, UC-10 bước 4–7): hạng mục, tiến độ, đã thu / còn lại; thao tác theo trạng thái
 * (chốt báo giá, duyệt / từ chối giảm giá, bệnh nhân đồng ý / từ chối, dừng điều trị), in báo giá A5.
 */
export function PlanDetailPage({ id }: { id: string }) {
  const { can } = usePermissions()
  const query = usePlan(id)
  const [action, setAction] = useState<PlanActionKind | null>(null)
  const [editing, setEditing] = useState<TreatmentPlanDto | null>(null)

  const body = () => {
    if (query.error) {
      const notFound = isApiError(query.error) && query.error.status === 404
      return notFound ? (
        <EmptyState
          icon={ClipboardList}
          title="Không tìm thấy kế hoạch điều trị"
          action={
            <Button asChild variant="outline">
              <Link href={routePath.treatmentPlans}>Về danh sách kế hoạch</Link>
            </Button>
          }
        />
      ) : (
        <ErrorState
          error={query.error}
          title="Không tải được kế hoạch"
          onRetry={() => void query.refetch()}
        />
      )
    }
    if (!query.data) return <DetailSkeleton />
    const plan = query.data
    const a = plan.actions
    const canUpdate = can(permissions.treatmentPlans.update)

    return (
      <>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight tabular-nums">
                Kế hoạch {plan.code}
              </h1>
              <PlanStatusBadge status={plan.status} />
            </div>
            <p className="text-muted-foreground text-sm">
              {plan.doctorName} · {plan.plannedSessions} buổi dự kiến · Lập ngày{' '}
              {vnDdMmYyyy(plan.createdAt)}
              {plan.createdByName ? ` bởi ${plan.createdByName}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {a.canEdit && canUpdate && (
              <Button variant="outline" onClick={() => setEditing(plan)}>
                <Pencil aria-hidden="true" />
                Sửa
              </Button>
            )}
            {a.canQuote && (
              <Button onClick={() => setAction('quote')}>
                <FileCheck2 aria-hidden="true" />
                Chốt báo giá
              </Button>
            )}
            {a.canApprove && (
              <>
                <Button variant="destructive" onClick={() => setAction('reject')}>
                  <ShieldX aria-hidden="true" />
                  Từ chối
                </Button>
                <Button onClick={() => setAction('approve')}>
                  <ShieldCheck aria-hidden="true" />
                  Duyệt
                </Button>
              </>
            )}
            {a.canAccept && (
              <>
                <Button variant="destructive" onClick={() => setAction('decline')}>
                  <ThumbsDown aria-hidden="true" />
                  Bệnh nhân từ chối
                </Button>
                <Button onClick={() => setAction('accept')}>
                  <ThumbsUp aria-hidden="true" />
                  Bệnh nhân đồng ý
                </Button>
              </>
            )}
            {a.canStop && (
              <Button variant="destructive" onClick={() => setAction('stop')}>
                <Ban aria-hidden="true" />
                Dừng điều trị
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href={`${routePath.planQuote(plan.id)}?print=1`}>
                <Printer aria-hidden="true" />
                In báo giá
              </Link>
            </Button>
          </div>
        </div>

        <StatusNotice plan={plan} />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section
            className="bg-card overflow-hidden rounded-xl border shadow-xs"
            aria-labelledby="plan-items"
          >
            <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
              <h2 id="plan-items" className="font-semibold">
                Hạng mục
              </h2>
              <PlanProgress done={plan.doneCount} total={plan.itemCount} className="w-44" />
            </div>
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 px-4">#</TableHead>
                    <TableHead>Dịch vụ</TableHead>
                    <TableHead className="text-right">SL</TableHead>
                    <TableHead className="text-right">Đơn giá</TableHead>
                    <TableHead className="text-right">Giảm</TableHead>
                    <TableHead className="text-right">Thành tiền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="px-4">Thực hiện</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plan.items.map((i, n) => (
                    <TableRow
                      key={i.id}
                      className={cn(i.status === 'DaHuy' && 'text-muted-foreground')}
                    >
                      <TableCell className="px-4 tabular-nums">{n + 1}</TableCell>
                      <TableCell className="max-w-64 whitespace-normal">
                        <p className={cn('font-medium', i.status === 'DaHuy' && 'line-through')}>
                          {i.serviceName}
                        </p>
                        <p className="text-muted-foreground text-xs tabular-nums">
                          {i.serviceCode}
                          {i.teeth.length > 0 && ` · ${teethLabel(i.teeth)}`}
                        </p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {i.quantity} {unitLabel(i.unit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatVnd(i.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {i.discountAmount > 0 ? (
                          <>
                            <p>−{formatVnd(i.discountAmount)}</p>
                            {i.discountType === 'PhanTram' && (
                              <p className="text-muted-foreground text-xs">{i.discountValue}%</p>
                            )}
                          </>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatVnd(i.amount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={itemTones[i.status]}>
                          {planItemStatusLabels[i.status]}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="px-4">
                        {i.visitId ? (
                          <div className="tabular-nums">
                            <Link
                              href={routePath.visitDetail(i.visitId)}
                              className="text-primary font-medium underline-offset-4 hover:underline"
                            >
                              {i.visitCode}
                            </Link>
                            {i.doneAt && (
                              <p className="text-muted-foreground text-xs">
                                {vnDdMmYyyy(i.doneAt)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {plan.note && (
              <div className="border-t px-4 py-3 text-sm">
                <span className="text-muted-foreground">Ghi chú: </span>
                <span className="whitespace-pre-line">{plan.note}</span>
              </div>
            )}
          </section>

          <div className="space-y-4">
            <section
              className="bg-card space-y-2 rounded-xl border p-4 shadow-xs"
              aria-labelledby="plan-patient"
            >
              <h2
                id="plan-patient"
                className="text-muted-foreground text-xs font-semibold tracking-wide uppercase"
              >
                Bệnh nhân
              </h2>
              <Link
                href={routePath.patientDetail(plan.patient.id)}
                className="hover:text-primary block font-semibold underline-offset-4 hover:underline"
              >
                {plan.patient.fullName}
              </Link>
              <p className="text-muted-foreground text-sm tabular-nums">
                {plan.patient.code} · {genderLabels[plan.patient.gender]} · {plan.patient.age} tuổi
              </p>
              <p className="text-sm tabular-nums">{formatPhone(plan.patient.phone)}</p>
              <AllergyBadge allergies={plan.patient.allergies} />
            </section>

            <section
              className="bg-card rounded-xl border p-4 shadow-xs"
              aria-labelledby="plan-money"
            >
              <h2
                id="plan-money"
                className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase"
              >
                Chi phí
              </h2>
              <dl className="grid gap-1.5 text-sm">
                <Row label="Tổng trước giảm" value={formatVnd(plan.subTotal)} />
                <Row
                  label={`Tổng giảm (${formatRate(plan.discountRate)}%)`}
                  value={
                    plan.discountTotal > 0 ? `−${formatVnd(plan.discountTotal)}` : formatVnd(0)
                  }
                />
                <Row label="Tổng sau giảm" value={formatVnd(plan.total)} strong />
                <div className="my-1.5 border-t" />
                <Row label="Đã làm" value={formatVnd(plan.doneAmount)} />
                <Row label="Đã thu" value={formatVnd(plan.paidAmount)} className="text-success" />
                <Row label="Còn lại" value={formatVnd(plan.remaining)} strong />
              </dl>
            </section>

            <Timeline plan={plan} />
          </div>
        </div>

        <PlanActionDialog plan={plan} kind={action} onOpenChange={(o) => !o && setAction(null)} />
        <PlanFormDialog target={editing} onOpenChange={(o) => !o && setEditing(null)} />
      </>
    )
  }

  return (
    <PermissionGuard permission={permissions.treatmentPlans.view} redirect>
      <div className="space-y-5">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={routePath.treatmentPlans}>
            <ArrowLeft aria-hidden="true" />
            Kế hoạch điều trị
          </Link>
        </Button>
        {body()}
      </div>
    </PermissionGuard>
  )
}

function StatusNotice({ plan }: { plan: TreatmentPlanDto }) {
  if (plan.status === 'ChoDuyet')
    return (
      <Notice tone="warning" icon={AlertTriangle}>
        Tổng giảm {formatRate(plan.discountRate)}% vượt {clinicRules.selfApproveDiscountPercent}%,
        đang chờ quản lý duyệt giảm giá.
      </Notice>
    )
  if (plan.status === 'Nhap' && plan.reviewNote)
    return (
      <Notice tone="danger" icon={XCircle}>
        <b>{plan.reviewedByName ?? 'Quản lý'}</b> từ chối giảm giá
        {plan.reviewedAt ? ` lúc ${vnHhmmDate(plan.reviewedAt)}` : ''}: {plan.reviewNote}
      </Notice>
    )
  if (plan.status === 'DaHuy')
    return (
      <Notice tone="danger" icon={Ban}>
        Kế hoạch đã hủy{plan.cancelledAt ? ` lúc ${vnHhmmDate(plan.cancelledAt)}` : ''}
        {plan.cancelReason ? `: ${plan.cancelReason}` : ''}
      </Notice>
    )
  if (plan.reviewedByName && plan.status !== 'Nhap')
    return (
      <Notice tone="info" icon={Info}>
        Giảm giá đã được <b>{plan.reviewedByName}</b> duyệt
        {plan.reviewedAt ? ` lúc ${vnHhmmDate(plan.reviewedAt)}` : ''}
        {plan.reviewNote ? `: ${plan.reviewNote}` : ''}
      </Notice>
    )
  if (plan.status === 'HoanThanh')
    return (
      <Notice tone="success" icon={CheckCircle2}>
        Đã làm xong mọi hạng mục{plan.completedAt ? ` (${vnDdMmYyyy(plan.completedAt)})` : ''}.
      </Notice>
    )
  return null
}

const noticeTones = {
  warning: 'border-warning/40 bg-warning/10 text-warning',
  danger: 'border-destructive/30 bg-destructive/10 text-destructive',
  info: 'border-info/30 bg-info/10 text-info',
  success: 'border-success/30 bg-success/10 text-success',
} as const

function Notice({
  tone,
  icon: Icon,
  children,
}: {
  tone: keyof typeof noticeTones
  icon: LucideIcon
  children: React.ReactNode
}) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm',
        noticeTones[tone]
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>{children}</p>
    </div>
  )
}

function Row({
  label,
  value,
  strong,
  className,
}: {
  label: string
  value: string
  strong?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex justify-between gap-3', strong && 'text-base font-semibold')}>
      <dt className={strong ? undefined : 'text-muted-foreground'}>{label}</dt>
      <dd className={cn('tabular-nums', className)}>{value}</dd>
    </div>
  )
}

function Timeline({ plan }: { plan: TreatmentPlanDto }) {
  const events = [
    { label: 'Lập kế hoạch', at: plan.createdAt, by: plan.createdByName },
    { label: 'Chốt báo giá', at: plan.quotedAt, by: null },
    {
      label: plan.status === 'Nhap' ? 'Từ chối giảm giá' : 'Duyệt giảm giá',
      at: plan.reviewedAt,
      by: plan.reviewedByName,
    },
    { label: 'Bệnh nhân đồng ý', at: plan.acceptedAt, by: null },
    { label: 'Hoàn thành', at: plan.completedAt, by: null },
    { label: 'Hủy', at: plan.cancelledAt, by: null },
  ].filter((e): e is { label: string; at: string; by: string | null } => !!e.at)

  return (
    <section className="bg-card rounded-xl border p-4 shadow-xs" aria-labelledby="plan-history">
      <h2
        id="plan-history"
        className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase"
      >
        Lịch sử
      </h2>
      <ol className="space-y-2.5 border-l pl-4">
        {events.map((e) => (
          <li key={e.label} className="relative text-sm">
            <span
              className="bg-primary absolute top-1.5 -left-[1.3rem] size-2 rounded-full"
              aria-hidden="true"
            />
            <p className="font-medium">{e.label}</p>
            <p className="text-muted-foreground text-xs tabular-nums">
              {vnHhmmDate(e.at)}
              {e.by ? ` · ${e.by}` : ''}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Đang tải kế hoạch">
      <div className="space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="h-80 rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
