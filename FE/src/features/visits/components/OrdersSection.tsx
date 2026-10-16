'use client'

import { useMemo, useState } from 'react'
import { ClipboardList, Plus, Search, Trash2 } from 'lucide-react'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { TeethPicker } from '@/features/clinic/components/TeethPicker'
import { useServiceOptions } from '@/features/clinic/hooks/use-clinic'
import { orderStatusLabels, serviceGroupLabels, serviceUnitLabels } from '@/features/clinic/lib/labels'
import { clinicRules, teethLabel } from '@/features/clinic/lib/rules'
import { formatVnd } from '@/lib/format'
import { normalizeVi } from '@/lib/normalize'
import type { OrderStatus, PlanItemOption, ServiceDto } from '@/types/clinic'
import { rowKey, type OrderRow, type VisitForm } from '../lib/visit-form'
import { SectionCard } from './ExamSections'

type OrdersSectionProps = {
  form: VisitForm
  set: (patch: Partial<VisitForm>) => void
  errors: Record<string, string>
  readOnly: boolean
  planItems: PlanItemOption[]
  childPatient: boolean
}

function ServicePicker({ onPick }: { onPick: (s: ServiceDto) => void }) {
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const options = useServiceOptions()
  const list = useMemo(() => {
    const t = normalizeVi(term)
    return (options.data ?? []).filter((s) => s.group !== 'Kham' && (!t || normalizeVi(`${s.code} ${s.name}`).includes(t)))
  }, [options.data, term])
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Plus aria-hidden="true" />
          Thêm chỉ định
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <div className="relative mb-2">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" aria-hidden="true" />
          <Input autoFocus value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Tìm dịch vụ" className="pl-8" />
        </div>
        <ul className="max-h-72 overflow-y-auto">
          {(['ThuThuat', 'CanLamSang'] as const).map((g) => {
            const items = list.filter((s) => s.group === g)
            if (!items.length) return null
            return (
              <li key={g}>
                <p className="text-muted-foreground px-2 pt-2 pb-1 text-xs font-medium">{serviceGroupLabels[g]}</p>
                <ul>
                  {items.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="hover:bg-accent flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm"
                        onClick={() => {
                          onPick(s)
                          setOpen(false)
                          setTerm('')
                        }}
                      >
                        <span className="min-w-0 truncate">
                          <span className="text-muted-foreground tabular-nums">{s.code}</span> {s.name}
                        </span>
                        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                          {formatVnd(s.price)}/{serviceUnitLabels[s.unit].toLowerCase()}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
          {list.length === 0 && <li className="text-muted-foreground px-2 py-3 text-sm">Không tìm thấy dịch vụ</li>}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

/** Chỉ định dịch vụ, vị trí răng, kết quả cận lâm sàng, hạng mục kế hoạch đang điều trị (UC-08 bước 4, 4a, 4b; BR-23). */
export function OrdersSection({ form, set, errors, readOnly, planItems, childPatient }: OrdersSectionProps) {
  const update = (key: string, patch: Partial<OrderRow>) => set({ orders: form.orders.map((o) => (o.key === key ? { ...o, ...patch } : o)) })
  const remove = (key: string) => set({ orders: form.orders.filter((o) => o.key !== key) })
  const addService = (s: ServiceDto) =>
    set({
      orders: [
        ...form.orders,
        {
          key: rowKey(),
          id: null,
          serviceId: s.id,
          serviceCode: s.code,
          serviceName: s.name,
          group: s.group,
          unit: s.unit,
          requiresTooth: s.requiresTooth,
          teeth: [],
          quantity: 1,
          unitPrice: s.price,
          discount: 0,
          status: 'ChoThucHien',
          result: '',
          imageUrls: [],
          treatmentPlanItemId: null,
          planCode: null,
        },
      ],
    })
  const togglePlanItem = (item: PlanItemOption, checked: boolean) => {
    if (!checked) return set({ orders: form.orders.filter((o) => o.treatmentPlanItemId !== item.id) })
    set({
      orders: [
        ...form.orders,
        {
          key: rowKey(),
          id: null,
          serviceId: item.serviceId,
          serviceCode: item.serviceCode,
          serviceName: item.serviceName,
          group: item.serviceCode.startsWith('CLS') ? 'CanLamSang' : 'ThuThuat',
          unit: item.unit,
          requiresTooth: false,
          teeth: item.teeth,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discountAmount,
          status: 'ChoThucHien',
          result: '',
          imageUrls: [],
          treatmentPlanItemId: item.id,
          planCode: item.planCode,
        },
      ],
    })
  }
  const total = form.orders.filter((o) => o.status !== 'KhongThucHien').reduce((s, o) => s + o.unitPrice * (o.requiresTooth ? o.teeth.length : o.quantity) - o.discount, 0)

  return (
    <SectionCard
      title="Chỉ định"
      description="Thủ thuật, cận lâm sàng; dịch vụ theo răng chọn răng trên sơ đồ"
      actions={!readOnly && <ServicePicker onPick={addService} />}
    >
      {planItems.length > 0 && (
        <div className="bg-primary/5 space-y-2 rounded-lg border p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <ClipboardList className="text-primary size-4" aria-hidden="true" />
            Kế hoạch đang điều trị: chọn hạng mục làm hôm nay
          </p>
          <ul className="space-y-1.5">
            {planItems.map((item) => {
              const checked = form.orders.some((o) => o.treatmentPlanItemId === item.id)
              return (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    id={`plan-${item.id}`}
                    checked={checked}
                    disabled={readOnly || (item.inOtherVisit && !checked)}
                    onCheckedChange={(v) => togglePlanItem(item, v === true)}
                  />
                  <label htmlFor={`plan-${item.id}`} className="min-w-0 flex-1">
                    <span className="text-muted-foreground tabular-nums">{item.planCode}</span> · {item.serviceName}
                    {item.teeth.length > 0 && ` (${teethLabel(item.teeth)})`}
                    <span className="text-muted-foreground"> · {formatVnd(item.amount)}</span>
                    {item.inOtherVisit && <span className="text-warning"> · đang ở lượt khám khác</span>}
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {form.orders.length === 0 ? (
        <p className="text-muted-foreground py-2 text-sm">Chưa có chỉ định.</p>
      ) : (
        <ul className="space-y-3">
          {form.orders.map((o, i) => {
            const qty = o.requiresTooth ? o.teeth.length : o.quantity
            return (
              <li key={o.key} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      <span className="text-muted-foreground tabular-nums">{o.serviceCode}</span> {o.serviceName}
                      {o.planCode && <span className="text-primary text-xs"> · theo kế hoạch {o.planCode}</span>}
                    </p>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {formatVnd(o.unitPrice)} × {qty} {serviceUnitLabels[o.unit].toLowerCase()}
                      {o.discount > 0 && ` − giảm ${formatVnd(o.discount)}`} = <b className="text-foreground">{formatVnd(o.unitPrice * qty - o.discount)}</b>
                    </p>
                  </div>
                  {!readOnly && (
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Bỏ chỉ định ${o.serviceName}`} onClick={() => remove(o.key)}>
                      <Trash2 aria-hidden="true" />
                    </Button>
                  )}
                </div>
                {o.requiresTooth && !o.treatmentPlanItemId && (
                  <FormField label="Vị trí răng" required error={errors[`orders[${i}].teeth`]}>
                    <div>
                      <TeethPicker value={o.teeth} onChange={(teeth) => update(o.key, { teeth })} disabled={readOnly} preferPrimary={childPatient} />
                    </div>
                  </FormField>
                )}
                {!o.requiresTooth && !o.treatmentPlanItemId && o.group !== 'CanLamSang' && (
                  <FormField label="Số lượng" error={errors[`orders[${i}].quantity`]} className="max-w-32">
                    <Input
                      type="number"
                      min={1}
                      max={clinicRules.maxOrderQuantity}
                      value={o.quantity}
                      disabled={readOnly}
                      onChange={(e) => update(o.key, { quantity: Number(e.target.value) || 1 })}
                    />
                  </FormField>
                )}
                {o.group === 'CanLamSang' && (
                  <div className="grid gap-2 sm:grid-cols-[12rem_minmax(0,1fr)]">
                    <FormField label="Kết quả">
                      <Select value={o.status} onValueChange={(v) => update(o.key, { status: v as OrderStatus })} disabled={readOnly}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(['ChoThucHien', 'CoKetQua', 'KhongThucHien'] as const).map((s) => (
                            <SelectItem key={s} value={s}>
                              {orderStatusLabels[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    {o.status === 'CoKetQua' && (
                      <FormField label="Nội dung kết quả" required error={errors[`orders[${i}].result`]}>
                        <Textarea rows={2} value={o.result} maxLength={2000} disabled={readOnly} onChange={(e) => update(o.key, { result: e.target.value })} />
                      </FormField>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {form.orders.length > 0 && (
        <p className="text-right text-sm">
          Tạm tính chỉ định: <b className="tabular-nums">{formatVnd(total)}</b>
        </p>
      )}
    </SectionCard>
  )
}
