'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, FileText, Hourglass, Lock, Printer, RotateCcw, Save } from 'lucide-react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { permissions } from '@/config/permissions'
import { routePath } from '@/config/route-path'
import { useAwaitResults, useFinishVisit, useReopenVisit, useSaveVisit, useServiceOptions, useVisit } from '@/features/clinic/hooks/use-clinic'
import { problemCode, problemKeywords, problemMedicineId, problemMissing } from '@/features/clinic/lib/problem'
import { hasErrors, validateVisit } from '@/features/clinic/lib/validation'
import { usePermissions } from '@/hooks/use-permissions'
import { getErrorMessage, getFieldErrors } from '@/lib/api-error'
import { formatVnd } from '@/lib/format'
import type { VisitDetailDto } from '@/types/clinic'
import { DiagnosisSection, VitalsSection } from '../components/ExamSections'
import { OrdersSection } from '../components/OrdersSection'
import { PrescriptionSection } from '../components/PrescriptionSection'
import { AdviceSection, PatientPanel } from '../components/VisitSideSections'
import { toForm, toInput, type VisitForm } from '../lib/visit-form'

/**
 * Phiếu khám (SCR-11, UC-08, UC-09): sinh hiệu, chẩn đoán, chỉ định, đơn thuốc, lời dặn, hẹn tái khám; kết thúc khám lập phiếu
 * thanh toán. Bác sĩ khác hoặc phiếu đã khóa chỉ xem (BR-32); người không có quyền xem nội dung chuyên môn chỉ thấy thông tin lượt.
 */
export function VisitPage({ id }: { id: string }) {
  const visit = useVisit(id)
  if (visit.isError) return <ErrorState error={visit.error} onRetry={() => visit.refetch()} />
  if (!visit.data)
    return (
      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-[40rem] rounded-xl" />
      </div>
    )
  return <VisitEditor key={`${visit.data.id}-${visit.data.status}-${visit.dataUpdatedAt === 0 ? 0 : 1}`} visit={visit.data} />
}

function VisitEditor({ visit }: { visit: VisitDetailDto }) {
  const router = useRouter()
  const { can } = usePermissions()
  const services = useServiceOptions(visit.canEdit)
  const requiresTooth = useMemo(() => {
    const map = new Map((services.data ?? []).map((s) => [s.id, s.requiresTooth]))
    return (id: string) => map.get(id) ?? false
  }, [services.data])
  const [form, setForm] = useState<VisitForm>(() => toForm(visit.medical, requiresTooth))
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [missing, setMissing] = useState<string[]>([])
  const save = useSaveVisit()
  const finish = useFinishVisit()
  const reopen = useReopenVisit()
  const awaitResults = useAwaitResults()
  const readOnly = !visit.canEdit
  const busy = save.isPending || finish.isPending || reopen.isPending || awaitResults.isPending

  const set = (patch: Partial<VisitForm>) => {
    setForm((f) => ({ ...f, ...patch }))
    setDirty(true)
  }

  /** Lưu phiếu; trả về true khi thành công. Lỗi trùng dị ứng từ máy chủ thì đánh dấu dòng cần xác nhận. */
  const persist = async (): Promise<boolean> => {
    const input = toInput(form)
    const local = validateVisit(input)
    if (hasErrors(local)) {
      setErrors(local)
      toast.error(Object.values(local)[0])
      return false
    }
    try {
      await save.mutateAsync({ id: visit.id, input })
      setErrors({})
      setDirty(false)
      return true
    } catch (e) {
      const code = problemCode(e)
      if (code === 'TrungDiUng') {
        const medicineId = problemMedicineId(e)
        toast.error(`Bệnh nhân có ghi nhận dị ứng: ${problemKeywords(e).join(', ')}. Xác nhận "Vẫn kê" hoặc bỏ thuốc.`)
        if (medicineId && window.confirm(`Bệnh nhân có ghi nhận dị ứng: ${problemKeywords(e).join(', ')}. Vẫn kê thuốc này?`)) {
          setForm((f) => ({ ...f, prescription: f.prescription.map((p) => (p.medicineId === medicineId ? { ...p, allergyConfirmed: true } : p)) }))
        }
        return false
      }
      const fields = getFieldErrors(e)
      setErrors(fields)
      toast.error(getErrorMessage(e))
      return false
    }
  }

  const onSave = async () => {
    if (await persist()) toast.success('Đã lưu phiếu khám')
  }

  const onFinish = async () => {
    setMissing([])
    if (dirty && !(await persist())) return
    finish.mutate(visit.id, {
      onSuccess: (v) => {
        toast.success('Đã kết thúc khám', {
          description: v.invoice ? `Phiếu thanh toán ${v.invoice.code}: ${formatVnd(v.invoice.total)}` : undefined,
        })
      },
      onError: (e) => {
        if (problemCode(e) === 'ThieuThongTinKham') setMissing(problemMissing(e))
        toast.error(getErrorMessage(e))
      },
    })
  }

  const onAwait = async () => {
    if (dirty && !(await persist())) return
    awaitResults.mutate(visit.id, {
      onSuccess: () => {
        toast.success('Đã chuyển Chờ kết quả, có thể gọi người kế tiếp')
        router.push(routePath.queue)
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    })
  }

  const onReopen = () =>
    reopen.mutate(visit.id, {
      onSuccess: () => toast.success('Đã mở lại phiếu, phiếu thanh toán cũ bị hủy'),
      onError: (e) => toast.error(getErrorMessage(e)),
    })

  const childPatient = visit.patient.age <= 12

  return (
    <div className="space-y-4 pb-20">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => (window.history.length > 1 ? router.back() : router.push(routePath.queue))}>
          <ArrowLeft aria-hidden="true" />
          Quay lại
        </Button>
        <h1 className="text-xl font-semibold">
          Phiếu khám <span className="text-muted-foreground tabular-nums">{visit.code}</span>
        </h1>
        {readOnly && visit.canMedical && (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-sm">
            <Lock className="size-3.5" aria-hidden="true" />
            {visit.status === 'DangKham' || visit.status === 'ChoKetQua' ? 'Chỉ bác sĩ khám sửa được phiếu này' : 'Phiếu đã khóa'}
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <PatientPanel visit={visit} />

        <div className="space-y-4">
          {!visit.canMedical ? (
            <Card className="text-muted-foreground p-6 text-sm">
              Nội dung chuyên môn (triệu chứng, chẩn đoán, đơn thuốc) chỉ hiển thị với bác sĩ.
              {visit.invoice && (
                <p className="text-foreground mt-2">
                  Phiếu thanh toán {visit.invoice.code}: {formatVnd(visit.invoice.total)}
                </p>
              )}
            </Card>
          ) : (
            <>
              {missing.length > 0 && (
                <Card className="border-destructive/40 bg-destructive/5 gap-1 p-4" role="alert">
                  <p className="text-destructive font-medium">Chưa kết thúc được khám</p>
                  <ul className="text-destructive list-disc pl-5 text-sm">
                    {missing.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </Card>
              )}
              <VitalsSection form={form} set={set} errors={errors} readOnly={readOnly} />
              <DiagnosisSection form={form} set={set} errors={errors} readOnly={readOnly} />
              <OrdersSection form={form} set={set} errors={errors} readOnly={readOnly} planItems={visit.canEdit ? visit.activePlanItems : []} childPatient={childPatient} />
              <PrescriptionSection
                form={form}
                set={set}
                errors={errors}
                readOnly={readOnly}
                allergies={visit.patient.allergies}
                canEditPhrases={can(permissions.visits.examine)}
              />
              <AdviceSection form={form} set={set} errors={errors} readOnly={readOnly} />
            </>
          )}
        </div>
      </div>

      {visit.canMedical && (
        <div className="bg-card/95 supports-[backdrop-filter]:bg-card/80 fixed inset-x-0 bottom-0 z-20 border-t backdrop-blur md:left-[var(--sidebar-width,0px)]">
          <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-end gap-2 py-3 pr-4 pl-4 sm:pr-36">
            {dirty && <span className="text-muted-foreground mr-auto text-sm">Có thay đổi chưa lưu</span>}
            {!visit.canEdit && visit.reopenBlockedReason && visit.status === 'HoanTat' && (
              <span className="text-muted-foreground mr-auto text-xs">Không mở lại được: {visit.reopenBlockedReason}</span>
            )}
            {(visit.medical?.prescription.length ?? 0) > 0 && (
              <Button variant="outline" asChild>
                <Link href={routePath.prescriptionPrint(visit.id)} target="_blank">
                  <Printer aria-hidden="true" />
                  In đơn thuốc
                </Link>
              </Button>
            )}
            {visit.invoice && can(permissions.invoices.view) && (
              <Button variant="outline" asChild>
                <Link href={routePath.invoices}>
                  <FileText aria-hidden="true" />
                  Thu phí
                </Link>
              </Button>
            )}
            {visit.canReopen && (
              <Button variant="outline" onClick={onReopen} disabled={busy}>
                <RotateCcw aria-hidden="true" />
                Mở lại phiếu
              </Button>
            )}
            {visit.canEdit && (
              <>
                {visit.status === 'DangKham' && form.orders.some((o) => o.group === 'CanLamSang' && o.status === 'ChoThucHien') && (
                  <Button variant="outline" onClick={onAwait} disabled={busy}>
                    <Hourglass aria-hidden="true" />
                    Chờ kết quả
                  </Button>
                )}
                <Button variant="outline" onClick={onSave} disabled={busy || !dirty}>
                  <Save aria-hidden="true" />
                  Lưu
                </Button>
                <Button variant="cta" onClick={onFinish} disabled={busy}>
                  <CheckCircle2 aria-hidden="true" />
                  Kết thúc khám
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
