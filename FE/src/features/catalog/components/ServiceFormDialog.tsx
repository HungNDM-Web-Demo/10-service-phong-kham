'use client'

import { useEffect, useState } from 'react'
import { Info, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getErrorMessage, getFieldErrors } from '@/lib/api-error'
import type { SaveServiceInput, ServiceDto, ServiceGroup, ServiceUnit, SpecialtyDto } from '@/types/clinic'
import { MoneyInput } from '@/features/clinic/components/MoneyInput'
import { useCreateService, useNextServiceCode, useUpdateService } from '@/features/clinic/hooks/use-clinic'
import { serviceGroupLabels, serviceUnitLabels } from '@/features/clinic/lib/labels'
import { validateService } from '@/features/clinic/lib/validation'
import { codeInput, NO_SPECIALTY, withoutError, type FormErrors } from '../lib/catalog'
import { CodeHint, SwitchRow } from './CatalogParts'

/** `service` null là thêm mới; `group`, `specialtyId` chọn sẵn theo bộ lọc đang xem */
export type ServiceDialogTarget = { service: ServiceDto | null; group?: ServiceGroup; specialtyId?: string }

const GROUPS: ServiceGroup[] = ['Kham', 'ThuThuat', 'CanLamSang']
const UNITS: ServiceUnit[] = ['Lan', 'Rang', 'Phim', 'Ca']

/** Thêm, sửa dịch vụ (UC-01 bước 2–4, 1c, E1, E2; FR-03). */
export function ServiceFormDialog({
  target,
  specialties,
  onOpenChange,
}: {
  target: ServiceDialogTarget | null
  specialties: SpecialtyDto[]
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {target && (
          <ServiceForm
            key={target.service?.id ?? 'new'}
            target={target}
            specialties={specialties}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ServiceForm({
  target,
  specialties,
  onClose,
}: {
  target: ServiceDialogTarget
  specialties: SpecialtyDto[]
  onClose: () => void
}) {
  const service = target.service
  const isNew = !service
  const create = useCreateService()
  const update = useUpdateService()
  const { mutate: fetchCode, isPending: codeLoading } = useNextServiceCode()
  const saving = create.isPending || update.isPending

  const [group, setGroup] = useState<ServiceGroup>(service?.group ?? target.group ?? 'ThuThuat')
  // Mã gợi ý theo nhóm (NK13, KB04, CLS05); null = người dùng chưa gõ mã riêng
  const [suggestion, setSuggestion] = useState<{ group: ServiceGroup; code: string } | null>(null)
  const [code, setCode] = useState<string | null>(service?.code ?? null)
  const [name, setName] = useState(service?.name ?? '')
  const [specialtyId, setSpecialtyId] = useState<string | null>(service?.specialtyId ?? target.specialtyId ?? null)
  const [unit, setUnit] = useState<ServiceUnit>(service?.unit ?? 'Lan')
  const [price, setPrice] = useState<number | null>(service?.price ?? null)
  const [requiresTooth, setRequiresTooth] = useState(service?.requiresTooth ?? false)
  const [isActive, setIsActive] = useState(service?.isActive ?? true)
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    if (!isNew) return
    fetchCode(group, { onSuccess: (d) => setSuggestion({ group, code: d.code }) })
  }, [isNew, group, fetchCode])

  const suggested = suggestion?.group === group ? suggestion.code : null
  const codeValue = code ?? suggested ?? ''
  const clear = (key: string) => setErrors((e) => withoutError(e, key))
  const examOf = service ? specialties.filter((s) => s.examServiceId === service.id) : []

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const input: SaveServiceInput = {
      code: codeValue.trim().toUpperCase(),
      name: name.trim(),
      group,
      specialtyId,
      unit,
      price: price ?? 0,
      requiresTooth,
      isActive,
    }
    const found: FormErrors = { ...validateService(input) }
    if (price === null) found.price = 'Nhập giá dịch vụ'
    setErrors(found)
    if (Object.keys(found).length) return

    const onError = (err: unknown) => {
      // Trùng mã (409, errors.code), giá sai bội số… gắn vào đúng ô (UC-01 E1, E2)
      const fields = getFieldErrors(err)
      if (Object.keys(fields).length) setErrors(fields)
      else toast.error(getErrorMessage(err))
    }
    const onSuccess = (saved: ServiceDto) => {
      toast.success(isNew ? `Đã thêm dịch vụ ${saved.code}` : 'Đã lưu dịch vụ', { description: saved.name })
      onClose()
    }
    if (service) update.mutate({ id: service.id, input }, { onSuccess, onError })
    else create.mutate(input, { onSuccess, onError })
  }

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-col">
      <DialogHeader className="border-b px-6 py-4">
        <DialogTitle>{service ? `Sửa dịch vụ ${service.code}` : 'Thêm dịch vụ'}</DialogTitle>
        <DialogDescription>
          {service
            ? 'Giá mới áp dụng cho lượt khám tạo sau; phiếu thanh toán đã lập giữ giá cũ.'
            : 'Chọn nhóm trước để có mã gợi ý. Giá là bội số 1.000 ₫.'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid max-h-[calc(100dvh-13rem)] gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
        <FormField label="Nhóm" required htmlFor="service-group">
          <Select
            value={group}
            disabled={saving}
            onValueChange={(v) => {
              setGroup(v as ServiceGroup)
              clear('specialtyId')
            }}
          >
            <SelectTrigger id="service-group">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUPS.map((g) => (
                <SelectItem key={g} value={g}>
                  {serviceGroupLabels[g]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          label="Chuyên khoa"
          required={group === 'Kham'}
          error={errors.specialtyId}
          htmlFor="service-specialty"
          hint={group === 'Kham' ? 'Dịch vụ khám phải thuộc một chuyên khoa' : 'Bỏ trống nếu dùng chung cho mọi chuyên khoa'}
        >
          <Select
            value={specialtyId ?? NO_SPECIALTY}
            disabled={saving}
            onValueChange={(v) => {
              setSpecialtyId(v === NO_SPECIALTY ? null : v)
              clear('specialtyId')
            }}
          >
            <SelectTrigger id="service-specialty" aria-invalid={errors.specialtyId ? true : undefined}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_SPECIALTY}>{group === 'Kham' ? 'Chọn chuyên khoa' : 'Dùng chung'}</SelectItem>
              {specialties.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-[10rem_1fr]">
          <FormField
            label="Mã dịch vụ"
            required
            error={errors.code}
            hint={
              isNew ? (
                <CodeHint
                  suggested={suggested}
                  current={codeValue}
                  loading={codeLoading}
                  onUse={() => {
                    setCode(null)
                    clear('code')
                  }}
                  fallback="2–10 chữ in hoa hoặc số"
                />
              ) : (
                '2–10 chữ in hoa hoặc số'
              )
            }
          >
            <Input
              autoComplete="off"
              maxLength={10}
              className="font-mono uppercase"
              value={codeValue}
              placeholder={codeLoading ? 'Đang lấy mã…' : 'vd: NK13'}
              disabled={saving}
              onChange={(e) => {
                setCode(codeInput(e.target.value))
                clear('code')
              }}
            />
          </FormField>
          <FormField label="Tên dịch vụ" required error={errors.name}>
            <Input
              autoComplete="off"
              autoFocus
              maxLength={150}
              value={name}
              placeholder="vd: Nhổ răng khôn hàm dưới"
              disabled={saving}
              onChange={(e) => {
                setName(e.target.value)
                clear('name')
              }}
            />
          </FormField>
        </div>

        <FormField label="Đơn vị tính" required htmlFor="service-unit">
          <Select value={unit} disabled={saving} onValueChange={(v) => setUnit(v as ServiceUnit)}>
            <SelectTrigger id="service-unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => (
                <SelectItem key={u} value={u}>
                  {serviceUnitLabels[u]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Giá" required error={errors.price} hint="Bội số 1.000 ₫">
          <MoneyInput
            value={price}
            disabled={saving}
            placeholder="vd: 2.000.000"
            onValueChange={(v) => {
              setPrice(v)
              clear('price')
            }}
          />
        </FormField>

        <SwitchRow
          id="service-requires-tooth"
          label="Cần vị trí răng"
          description="Bác sĩ phải chọn số răng khi chỉ định (thủ thuật theo răng)."
          checked={requiresTooth}
          disabled={saving}
          onCheckedChange={setRequiresTooth}
        />
        <SwitchRow
          id="service-active"
          label="Đang dùng"
          description="Tắt để ngừng: dịch vụ không chọn được ở lượt khám mới."
          checked={isActive}
          disabled={saving}
          onCheckedChange={setIsActive}
        />

        {unit === 'Rang' && !requiresTooth && (
          <p className="bg-info/10 text-info flex items-start gap-2 rounded-lg px-3 py-2 text-sm sm:col-span-2" role="note">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Đơn vị tính theo răng thường cần bật &quot;Cần vị trí răng&quot; để ghi đúng răng điều trị.
          </p>
        )}
        {examOf.length > 0 && (
          <p className="bg-muted text-muted-foreground flex items-start gap-2 rounded-lg px-3 py-2 text-sm sm:col-span-2" role="note">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Đây là phí khám của chuyên khoa {examOf.map((s) => s.name).join(', ')}: mỗi lượt khám mới tự có dòng phí này, nên không ngừng
            được.
          </p>
        )}
      </div>

      <DialogFooter className="border-t px-6 py-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          Hủy
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
          {service ? 'Lưu thay đổi' : 'Thêm dịch vụ'}
        </Button>
      </DialogFooter>
    </form>
  )
}
