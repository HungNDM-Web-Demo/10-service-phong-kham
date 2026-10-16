'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, ClipboardPlus, Pencil, Trash2, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PermissionGuard } from '@/components/shared/PermissionGuard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { permissions } from '@/config/permissions'
import { routePath } from '@/config/route-path'
import { usePermissions } from '@/hooks/use-permissions'
import { getErrorMessage, isApiError } from '@/lib/api-error'
import { formatPhone, formatVnd } from '@/lib/format'
import { cn, getInitials } from '@/lib/utils'
import type { PatientDto } from '@/types/clinic'
import { useDeletePatient, usePatient } from '@/features/clinic/hooks/use-clinic'
import { genderLabels } from '@/features/clinic/lib/labels'
import { ddmmyyyy, vnDdMmYyyy } from '@/features/clinic/lib/vn-time'
import { PlanFormDialog } from '@/features/treatment-plans/components/PlanFormDialog'
import { PatientAppointmentsTab } from '../components/PatientAppointmentsTab'
import { PatientFormDialog } from '../components/PatientFormDialog'
import { PatientInfoTab } from '../components/PatientInfoTab'
import { PatientInvoicesTab } from '../components/PatientInvoicesTab'
import { PatientPlansTab } from '../components/PatientPlansTab'
import { PatientVisitsTab } from '../components/PatientVisitsTab'

type TabKey = 'info' | 'visits' | 'plans' | 'appointments' | 'payments'

/**
 * Hồ sơ bệnh nhân (SCR-10, UC-07 1a–1c, E4): đầu hồ sơ có dị ứng màu đỏ; các tab Thông tin, Lượt khám, Kế hoạch điều trị,
 * Lịch hẹn, Thanh toán (FR-21). Nội dung chuyên môn chỉ hiện với quyền xem hồ sơ bệnh án (BR-32).
 */
export function PatientDetailPage({ id }: { id: string }) {
  const router = useRouter()
  const { can } = usePermissions()
  const detail = usePatient(id)
  const remove = useDeletePatient()
  const [tab, setTab] = useState<TabKey>('info')
  const [editing, setEditing] = useState<PatientDto | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [planning, setPlanning] = useState(false)

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(id)
      toast.success('Đã xóa hồ sơ bệnh nhân')
      router.replace(routePath.patients)
    } catch (err) {
      toast.error(getErrorMessage(err))
      throw err
    }
  }

  const body = () => {
    if (detail.error) {
      const notFound = isApiError(detail.error) && detail.error.status === 404
      return notFound ? (
        <EmptyState
          icon={UserX}
          title="Không tìm thấy bệnh nhân"
          description="Hồ sơ có thể đã bị xóa hoặc đường dẫn không đúng."
          action={
            <Button asChild variant="outline">
              <Link href={routePath.patients}>Về danh sách bệnh nhân</Link>
            </Button>
          }
        />
      ) : (
        <ErrorState
          error={detail.error}
          title="Không tải được hồ sơ"
          onRetry={() => void detail.refetch()}
        />
      )
    }
    if (!detail.data) return <DetailSkeleton />

    const { patient: p, activePlanCount, debtInvoiceCount, upcomingAppointments } = detail.data
    const canUpdate = can(permissions.patients.update)
    const canPlan = can(permissions.treatmentPlans.create)

    return (
      <>
        <section
          className="bg-card space-y-4 rounded-xl border p-4 shadow-xs sm:p-5"
          aria-labelledby="patient-name"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span
                className="bg-primary/10 text-primary flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold"
                aria-hidden="true"
              >
                {getInitials(p.fullName)}
              </span>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 id="patient-name" className="text-2xl font-semibold tracking-tight">
                    {p.fullName}
                  </h1>
                  <span className="bg-muted rounded-md px-2 py-0.5 text-sm font-medium tabular-nums">
                    {p.code}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm tabular-nums">
                  {genderLabels[p.gender]} · {p.age} tuổi · Sinh {ddmmyyyy(p.birthDate)} ·{' '}
                  <a
                    href={`tel:${p.phone}`}
                    className="text-foreground hover:text-primary font-medium underline-offset-4 hover:underline"
                  >
                    {formatPhone(p.phone)}
                  </a>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canPlan && (
                <Button variant="outline" onClick={() => setPlanning(true)}>
                  <ClipboardPlus aria-hidden="true" />
                  Lập kế hoạch điều trị
                </Button>
              )}
              {canUpdate && (
                <Button variant="outline" onClick={() => setEditing(p)}>
                  <Pencil aria-hidden="true" />
                  Sửa
                </Button>
              )}
              {canUpdate && p.canDelete && (
                <Button variant="destructive" onClick={() => setDeleting(true)}>
                  <Trash2 aria-hidden="true" />
                  Xóa
                </Button>
              )}
            </div>
          </div>

          {p.allergies && (
            <div
              role="note"
              aria-label="Tiền sử dị ứng"
              className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                <b>Dị ứng:</b> {p.allergies}
              </span>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Số lượt khám" value={String(p.visitCount)} />
            <Stat
              label="Khám gần nhất"
              value={p.lastVisitAt ? vnDdMmYyyy(p.lastVisitAt) : 'Chưa khám'}
            />
            <Stat label="Kế hoạch đang theo dõi" value={String(activePlanCount)} />
            <Stat
              label="Công nợ"
              value={p.debt > 0 ? formatVnd(p.debt) : '0 ₫'}
              hint={p.debt > 0 ? `${debtInvoiceCount} phiếu chưa thu đủ` : undefined}
              danger={p.debt > 0}
            />
          </dl>
        </section>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="gap-4">
          <div className="-mx-1 overflow-x-auto overflow-y-hidden px-1 pb-1">
            <TabsList variant="line" className="h-10">
              <TabsTrigger value="info">Thông tin</TabsTrigger>
              <TabsTrigger value="visits">Lượt khám</TabsTrigger>
              <TabsTrigger value="plans">Kế hoạch điều trị</TabsTrigger>
              <TabsTrigger value="appointments">Lịch hẹn</TabsTrigger>
              <TabsTrigger value="payments">Thanh toán</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="info">
            <PatientInfoTab patient={p} upcoming={upcomingAppointments} />
          </TabsContent>
          <TabsContent value="visits">
            <PatientVisitsTab patientId={p.id} />
          </TabsContent>
          <TabsContent value="plans">
            <PatientPlansTab
              patientId={p.id}
              onCreate={canPlan ? () => setPlanning(true) : undefined}
            />
          </TabsContent>
          <TabsContent value="appointments">
            <PatientAppointmentsTab patientId={p.id} />
          </TabsContent>
          <TabsContent value="payments">
            <PatientInvoicesTab patient={p} debtInvoiceCount={debtInvoiceCount} />
          </TabsContent>
        </Tabs>

        <PatientFormDialog target={editing} onOpenChange={(o) => !o && setEditing(null)} />
        <PlanFormDialog
          target={planning ? 'new' : null}
          defaultPatient={p}
          onOpenChange={(o) => !o && setPlanning(false)}
          onSaved={(plan) => router.push(routePath.planDetail(plan.id))}
        />
        <ConfirmDialog
          open={deleting}
          onOpenChange={setDeleting}
          variant="destructive"
          title={`Xóa hồ sơ ${p.code}?`}
          description={`Hồ sơ ${p.fullName} chưa có lượt khám, lịch hẹn nên xóa được. Thao tác không hoàn tác.`}
          confirmText="Xóa hồ sơ"
          loading={remove.isPending}
          onConfirm={confirmDelete}
        />
      </>
    )
  }

  return (
    <PermissionGuard permission={permissions.patients.view} redirect>
      <div className="space-y-5">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={routePath.patients}>
            <ArrowLeft aria-hidden="true" />
            Bệnh nhân
          </Link>
        </Button>
        {body()}
      </div>
    </PermissionGuard>
  )
}

function Stat({
  label,
  value,
  hint,
  danger,
}: {
  label: string
  value: string
  hint?: string
  danger?: boolean
}) {
  return (
    <div className="bg-muted/40 rounded-lg px-3 py-2.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd
        className={cn('mt-0.5 text-base font-semibold tabular-nums', danger && 'text-destructive')}
      >
        {value}
      </dd>
      {hint && <dd className="text-muted-foreground text-xs">{hint}</dd>}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Đang tải hồ sơ">
      <div className="bg-card space-y-4 rounded-xl border p-5">
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
      <Skeleton className="h-10 w-full max-w-lg" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
