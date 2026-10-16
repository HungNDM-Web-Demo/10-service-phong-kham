'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { getErrorMessage, getFieldErrors } from '@/lib/api-error'
import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type {
  DiscountType,
  PatientBrief,
  PatientDto,
  SaveTreatmentPlanInput,
  ServiceDto,
  TreatmentPlanDto,
} from '@/types/clinic'
import { MoneyInput } from '@/features/clinic/components/MoneyInput'
import { PatientPicker, type PatientChoice } from '@/features/clinic/components/PatientPicker'
import { TeethPicker } from '@/features/clinic/components/TeethPicker'
import { useCreatePlan, useServiceOptions, useUpdatePlan } from '@/features/clinic/hooks/use-clinic'
import { serviceGroupLabels } from '@/features/clinic/lib/labels'
import { clinicRules, unitLabel } from '@/features/clinic/lib/rules'
import { hasErrors, type Errors } from '@/features/clinic/lib/validation'
import {
  draftFromItem,
  formatRate,
  lineAmounts,
  liveDiscountError,
  newDraft,
  planErrors,
  planTotals,
  toSaveLine,
  type ItemDraft,
  type LineAmounts,
} from '../lib/plan-calc'

type PlanFormDialogProps = {
  /** null: đóng; 'new': lập mới; TreatmentPlanDto: sửa (chỉ khi Nháp) */
  target: TreatmentPlanDto | 'new' | null
  /** Bệnh nhân chọn sẵn khi lập từ hồ sơ bệnh nhân (UC-10 bước 1) */
  defaultPatient?: PatientBrief | PatientDto | null
  onOpenChange: (open: boolean) => void
  onSaved?: (plan: TreatmentPlanDto) => void
}

/**
 * Lập, sửa kế hoạch điều trị (UC-10 bước 1–3, FR-28): hạng mục dịch vụ thủ thuật, cận lâm sàng; vị trí răng; giảm theo % hoặc
 * số tiền (BR-22); tổng trước giảm, tổng giảm, tỉ lệ, tổng sau giảm tính ngay khi nhập.
 */
export function PlanFormDialog({
  target,
  defaultPatient,
  onOpenChange,
  onSaved,
}: PlanFormDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94svh] overflow-y-auto sm:max-w-5xl">
        {target !== null && (
          <PlanForm
            key={target === 'new' ? 'new' : target.id}
            plan={target === 'new' ? null : target}
            defaultPatient={defaultPatient ?? null}
            onClose={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

type PlanFormProps = {
  plan: TreatmentPlanDto | null
  defaultPatient: PatientBrief | PatientDto | null
  onClose: () => void
  onSaved?: (plan: TreatmentPlanDto) => void
}

const PLAN_GROUPS = ['ThuThuat', 'CanLamSang'] as const

function PlanForm({ plan, defaultPatient, onClose, onSaved }: PlanFormProps) {
  const services = useServiceOptions()
  const create = useCreatePlan()
  const update = useUpdatePlan()
  const pending = create.isPending || update.isPending

  const [choice, setChoice] = useState<PatientChoice>({
    patient: plan?.patient ?? defaultPatient,
    newPatient: null,
  })
  const [sessions, setSessions] = useState(String(plan?.plannedSessions ?? 1))
  const [note, setNote] = useState(plan?.note ?? '')
  const [items, setItems] = useState<ItemDraft[]>(() =>
    plan ? plan.items.filter((i) => i.status !== 'DaHuy').map(draftFromItem) : [newDraft()]
  )
  const [submitted, setSubmitted] = useState(false)
  const [serverErrors, setServerErrors] = useState<Errors>({})

  const planServices = useMemo(
    () => (services.data ?? []).filter((s) => s.group === 'ThuThuat' || s.group === 'CanLamSang'),
    [services.data]
  )
  const serviceMap = useMemo(() => new Map(planServices.map((s) => [s.id, s])), [planServices])

  const lines = items.map((d) => lineAmounts(d, serviceMap.get(d.serviceId)))
  const totals = planTotals(lines)

  const input: SaveTreatmentPlanInput = {
    patientId: choice.patient?.id ?? '',
    plannedSessions: Number(sessions) || 0,
    note: note.trim() || null,
    items: items.map((d) => toSaveLine(d, serviceMap.get(d.serviceId))),
  }
  const localErrors = submitted ? planErrors(input, items, serviceMap) : {}
  const errors: Errors = { ...localErrors, ...serverErrors }

  const touch = () => setServerErrors({})
  const updateItem = (key: string, patch: Partial<ItemDraft>) => {
    setItems((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)))
    touch()
  }
  const changeService = (d: ItemDraft, serviceId: string) => {
    const svc = serviceMap.get(serviceId)
    updateItem(d.key, {
      serviceId,
      teeth: svc?.requiresTooth ? d.teeth : [],
      quantity: svc?.requiresTooth ? d.quantity : Math.max(1, d.quantity),
    })
  }
  const removeItem = (key: string) => {
    setItems((list) => list.filter((d) => d.key !== key))
    touch()
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    const local = planErrors(input, items, serviceMap)
    if (hasErrors(local)) {
      toast.error('Kiểm tra lại các ô báo lỗi')
      return
    }
    const handlers = {
      onSuccess: (p: TreatmentPlanDto) => {
        toast.success(plan ? `Đã lưu kế hoạch ${p.code}` : `Đã lập kế hoạch ${p.code} (nháp)`)
        onClose()
        onSaved?.(p)
      },
      onError: (err: unknown) => {
        const fields = getFieldErrors(err)
        setServerErrors(fields)
        toast.error(hasErrors(fields) ? 'Kiểm tra lại các ô báo lỗi' : getErrorMessage(err))
      },
    }
    if (plan) update.mutate({ id: plan.id, input }, handlers)
    else create.mutate(input, handlers)
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>{plan ? `Sửa kế hoạch ${plan.code}` : 'Lập kế hoạch điều trị'}</DialogTitle>
        <DialogDescription>
          Giảm giá tối đa {clinicRules.maxItemDiscountPercent}% mỗi hạng mục. Tổng giảm không quá{' '}
          {clinicRules.selfApproveDiscountPercent}% thì bác sĩ tự chốt báo giá, vượt thì cần quản lý
          duyệt.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="grid gap-1.5">
          {plan ? <span className="text-sm font-medium">Bệnh nhân</span> : null}
          <PatientPicker
            value={choice}
            onChange={(v) => {
              setChoice(v)
              touch()
            }}
            allowCreate={false}
            disabled={!!plan}
            errors={errors}
          />
        </div>
        <FormField label="Số buổi dự kiến" required error={errors.plannedSessions}>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={50}
            value={sessions}
            onChange={(e) => {
              setSessions(e.target.value.replace(/\D/g, '').slice(0, 2))
              touch()
            }}
            className="tabular-nums"
          />
        </FormField>
        <FormField label="Ghi chú" error={errors.note} className="md:col-span-2">
          <Textarea
            rows={2}
            maxLength={500}
            value={note}
            placeholder="Vd: Điều trị tủy R36 trước, bọc sứ sau 2 tuần"
            onChange={(e) => {
              setNote(e.target.value)
              touch()
            }}
          />
        </FormField>
      </div>

      <section className="space-y-3" aria-labelledby="plan-items-title">
        <div className="flex items-center justify-between gap-2">
          <h3 id="plan-items-title" className="text-sm font-semibold">
            Hạng mục <span className="text-muted-foreground font-normal">({items.length})</span>
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setItems((list) => [...list, newDraft()])}
          >
            <Plus aria-hidden="true" />
            Thêm hạng mục
          </Button>
        </div>
        {errors.items && (
          <p role="alert" className="text-destructive text-sm">
            {errors.items}
          </p>
        )}
        {services.error && (
          <p role="alert" className="text-destructive text-sm">
            Không tải được danh mục dịch vụ.{' '}
            <button
              type="button"
              className="underline underline-offset-4"
              onClick={() => void services.refetch()}
            >
              Thử lại
            </button>
          </p>
        )}
        <ol className="space-y-3">
          {items.map((d, n) => (
            <ItemRow
              key={d.key}
              index={n}
              draft={d}
              line={lines[n]}
              service={serviceMap.get(d.serviceId)}
              services={planServices}
              loading={services.isLoading}
              errors={errors}
              preferPrimary={(choice.patient?.age ?? 99) < 12}
              onService={(id) => changeService(d, id)}
              onChange={(patch) => updateItem(d.key, patch)}
              onRemove={items.length > 1 ? () => removeItem(d.key) : undefined}
            />
          ))}
        </ol>
      </section>

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-h-6 md:pt-2">
          {totals.approval && (
            <p className="text-warning flex items-center gap-2 text-sm font-medium" role="status">
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              Tổng giảm vượt {clinicRules.selfApproveDiscountPercent}%, cần quản lý duyệt
            </p>
          )}
        </div>
        <dl className="bg-muted/40 grid w-full gap-1.5 rounded-lg border p-4 text-sm md:max-w-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Tổng trước giảm</dt>
            <dd className="tabular-nums">{formatVnd(totals.subTotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">
              Tổng giảm{' '}
              <span className={cn('tabular-nums', totals.approval && 'text-warning font-medium')}>
                ({formatRate(totals.rate)}%)
              </span>
            </dt>
            <dd className="tabular-nums">
              {totals.discountTotal > 0 ? `−${formatVnd(totals.discountTotal)}` : formatVnd(0)}
            </dd>
          </div>
          <div className="mt-1 flex justify-between gap-4 border-t pt-2 text-base font-semibold">
            <dt>Tổng sau giảm</dt>
            <dd className="tabular-nums">{formatVnd(totals.total)}</dd>
          </div>
        </dl>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          Hủy
        </Button>
        <Button type="submit" disabled={pending || services.isLoading}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {plan ? 'Lưu thay đổi' : 'Lưu nháp'}
        </Button>
      </DialogFooter>
    </form>
  )
}

type ItemRowProps = {
  index: number
  draft: ItemDraft
  line: LineAmounts
  service: ServiceDto | undefined
  services: ServiceDto[]
  loading: boolean
  errors: Errors
  preferPrimary: boolean
  onService: (serviceId: string) => void
  onChange: (patch: Partial<ItemDraft>) => void
  onRemove?: () => void
}

function ItemRow({
  index: n,
  draft: d,
  line,
  service: svc,
  services,
  loading,
  errors,
  preferPrimary,
  onService,
  onChange,
  onRemove,
}: ItemRowProps) {
  const err = (f: string) => errors[`items.${n}.${f}`]
  const discountError = err('discountValue') ?? liveDiscountError(d, line.gross)
  const missingService = !!d.serviceId && !svc && !loading
  const teethError = err('teeth')

  return (
    <li className="bg-card rounded-lg border p-3 sm:p-4">
      <div className="grid gap-3 md:grid-cols-12 md:items-start">
        <FormField
          label={`Dịch vụ ${n + 1}`}
          required
          error={
            err('serviceId') ?? (missingService ? 'Dịch vụ đã ngừng, chọn dịch vụ khác' : undefined)
          }
          hint={svc ? `${formatVnd(svc.price)} / ${unitLabel(svc.unit)}` : undefined}
          className="md:col-span-5"
        >
          <Select value={svc ? d.serviceId : ''} onValueChange={onService} disabled={loading}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loading ? 'Đang tải dịch vụ…' : 'Chọn dịch vụ'} />
            </SelectTrigger>
            <SelectContent>
              {PLAN_GROUPS.map((g) => {
                const list = services.filter((s) => s.group === g)
                if (list.length === 0) return null
                return (
                  <SelectGroup key={g}>
                    <SelectLabel>{serviceGroupLabels[g]}</SelectLabel>
                    {list.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code} · {s.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )
              })}
            </SelectContent>
          </Select>
        </FormField>

        {svc?.requiresTooth ? (
          <div className="grid gap-1.5 md:col-span-2">
            <span className="text-sm font-medium">Số lượng</span>
            <p
              className="bg-muted/50 flex h-10 items-center rounded-md border px-3 text-sm tabular-nums"
              aria-live="polite"
            >
              {d.teeth.length} răng
            </p>
          </div>
        ) : (
          <FormField label="Số lượng" required error={err('quantity')} className="md:col-span-2">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={clinicRules.maxOrderQuantity}
              value={d.quantity || ''}
              onChange={(e) =>
                onChange({ quantity: Number(e.target.value.replace(/\D/g, '').slice(0, 2)) || 0 })
              }
              className="tabular-nums"
            />
          </FormField>
        )}

        <div className="grid gap-1.5 md:col-span-3">
          <span className="text-sm font-medium" id={`discount-label-${d.key}`}>
            Giảm giá
          </span>
          <div className="flex gap-2">
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={0}
              value={d.discountType}
              onValueChange={(v) =>
                v && onChange({ discountType: v as DiscountType, discountValue: 0 })
              }
              aria-label="Kiểu giảm giá"
              className="h-10"
            >
              <ToggleGroupItem
                value="PhanTram"
                aria-label="Giảm theo phần trăm"
                className="h-10 px-3"
              >
                %
              </ToggleGroupItem>
              <ToggleGroupItem value="SoTien" aria-label="Giảm theo số tiền" className="h-10 px-3">
                ₫
              </ToggleGroupItem>
            </ToggleGroup>
            <div className="min-w-0 flex-1">
              {d.discountType === 'PhanTram' ? (
                <div className="relative">
                  <Input
                    inputMode="numeric"
                    autoComplete="off"
                    value={d.discountValue || ''}
                    placeholder="0"
                    aria-labelledby={`discount-label-${d.key}`}
                    aria-invalid={discountError ? true : undefined}
                    onChange={(e) =>
                      onChange({
                        discountValue: Number(e.target.value.replace(/\D/g, '').slice(0, 3)) || 0,
                      })
                    }
                    className="pr-8 text-right tabular-nums"
                  />
                  <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm">
                    %
                  </span>
                </div>
              ) : (
                <MoneyInput
                  value={d.discountValue || null}
                  placeholder="0"
                  aria-labelledby={`discount-label-${d.key}`}
                  aria-invalid={discountError ? true : undefined}
                  onValueChange={(v) => onChange({ discountValue: v ?? 0 })}
                />
              )}
            </div>
          </div>
          {discountError ? (
            <p role="alert" className="text-destructive text-[0.8125rem]">
              {discountError}
            </p>
          ) : line.discount > 0 ? (
            <p className="text-muted-foreground text-[0.8125rem] tabular-nums">
              Giảm {formatVnd(line.discount)}
            </p>
          ) : null}
        </div>

        <div className="flex items-start justify-between gap-2 md:col-span-2 md:flex-col md:items-end">
          <span className="text-sm font-medium md:sr-only">Thành tiền</span>
          <div className="text-right md:pt-7">
            <p className="font-semibold tabular-nums">{formatVnd(line.amount)}</p>
            {line.discount > 0 && (
              <p className="text-muted-foreground text-xs tabular-nums line-through">
                {formatVnd(line.gross)}
              </p>
            )}
          </div>
        </div>
      </div>

      {svc?.requiresTooth && (
        <div className="mt-3 grid gap-1.5" role="group" aria-label={`Vị trí răng dịch vụ ${n + 1}`}>
          <span className="text-sm font-medium">
            Vị trí răng
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          </span>
          <TeethPicker
            value={d.teeth}
            onChange={(teeth) => onChange({ teeth })}
            preferPrimary={preferPrimary}
          />
          {teethError && (
            <p role="alert" className="text-destructive text-[0.8125rem]">
              {teethError}
            </p>
          )}
        </div>
      )}

      {onRemove && (
        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" />
            Bỏ hạng mục
          </Button>
        </div>
      )}
    </li>
  )
}
