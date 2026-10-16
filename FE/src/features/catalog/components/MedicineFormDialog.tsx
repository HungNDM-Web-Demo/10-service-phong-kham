'use client'

import { useEffect, useId, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { getErrorMessage, getFieldErrors } from '@/lib/api-error'
import type { MedicineDto, SaveMedicineInput } from '@/types/clinic'
import { MoneyInput } from '@/features/clinic/components/MoneyInput'
import { useCreateMedicine, useNextMedicineCode, useUpdateMedicine } from '@/features/clinic/hooks/use-clinic'
import { validateMedicine } from '@/features/clinic/lib/validation'
import { codeInput, withoutError, type FormErrors } from '../lib/catalog'
import { CodeHint, SwitchRow } from './CatalogParts'

/** `medicine` null là thêm mới */
export type MedicineDialogTarget = { medicine: MedicineDto | null }

const DOSAGE_FORMS = ['Viên nén', 'Viên nang', 'Viên sủi', 'Viên ngậm', 'Dung dịch', 'Siro', 'Gel', 'Thuốc mỡ', 'Thuốc nhỏ', 'Thuốc xịt', 'Bột pha uống']
const UNITS = ['viên', 'gói', 'chai', 'lọ', 'tuýp', 'ống', 'vỉ', 'hộp']

/** Thêm, sửa thuốc (UC-01 1a, 1c, E1, E2; FR-04): giá bán là bội số 100 ₫. */
export function MedicineFormDialog({ target, onOpenChange }: { target: MedicineDialogTarget | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {target && <MedicineForm key={target.medicine?.id ?? 'new'} medicine={target.medicine} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function MedicineForm({ medicine, onClose }: { medicine: MedicineDto | null; onClose: () => void }) {
  const isNew = !medicine
  const listId = useId()
  const create = useCreateMedicine()
  const update = useUpdateMedicine()
  const { mutate: fetchCode, isPending: codeLoading } = useNextMedicineCode()
  const saving = create.isPending || update.isPending

  const [suggested, setSuggested] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(medicine?.code ?? null)
  const [name, setName] = useState(medicine?.name ?? '')
  const [ingredient, setIngredient] = useState(medicine?.activeIngredient ?? '')
  const [strength, setStrength] = useState(medicine?.strength ?? '')
  const [dosageForm, setDosageForm] = useState(medicine?.dosageForm ?? '')
  const [unit, setUnit] = useState(medicine?.unit ?? '')
  const [price, setPrice] = useState<number | null>(medicine?.price ?? null)
  const [isActive, setIsActive] = useState(medicine?.isActive ?? true)
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    if (!isNew) return
    fetchCode(undefined, { onSuccess: (d) => setSuggested(d.code) })
  }, [isNew, fetchCode])

  const codeValue = code ?? suggested ?? ''
  const clear = (key: string) => setErrors((e) => withoutError(e, key))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const input: SaveMedicineInput = {
      code: codeValue.trim().toUpperCase(),
      name: name.trim(),
      activeIngredient: ingredient.trim(),
      strength: strength.trim() || null,
      dosageForm: dosageForm.trim() || null,
      unit: unit.trim(),
      price: price ?? 0,
      isActive,
    }
    const found = validateMedicine(input)
    setErrors(found)
    if (Object.keys(found).length) return

    const onError = (err: unknown) => {
      const fields = getFieldErrors(err)
      if (Object.keys(fields).length) setErrors(fields)
      else toast.error(getErrorMessage(err))
    }
    const onSuccess = (saved: MedicineDto) => {
      toast.success(isNew ? `Đã thêm thuốc ${saved.code}` : 'Đã lưu thuốc', { description: saved.name })
      onClose()
    }
    if (medicine) update.mutate({ id: medicine.id, input }, { onSuccess, onError })
    else create.mutate(input, { onSuccess, onError })
  }

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-col">
      <DialogHeader className="border-b px-6 py-4">
        <DialogTitle>{medicine ? `Sửa thuốc ${medicine.code}` : 'Thêm thuốc'}</DialogTitle>
        <DialogDescription>
          {medicine
            ? 'Giá mới áp dụng cho đơn kê sau; đơn thuốc đã kê giữ giá tại thời điểm kê.'
            : 'Hoạt chất dùng để cảnh báo dị ứng khi kê đơn. Giá bán là bội số 100 ₫.'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid max-h-[calc(100dvh-13rem)] gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-[10rem_1fr]">
          <FormField
            label="Mã thuốc"
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
              placeholder={codeLoading ? 'Đang lấy mã…' : 'vd: T051'}
              disabled={saving}
              onChange={(e) => {
                setCode(codeInput(e.target.value))
                clear('code')
              }}
            />
          </FormField>
          <FormField label="Tên thuốc" required error={errors.name}>
            <Input
              autoComplete="off"
              autoFocus
              maxLength={150}
              value={name}
              placeholder="vd: Paracetamol 500 mg"
              disabled={saving}
              onChange={(e) => {
                setName(e.target.value)
                clear('name')
              }}
            />
          </FormField>
        </div>

        <FormField
          label="Hoạt chất"
          required
          error={errors.activeIngredient}
          hint="Nhiều hoạt chất thì ngăn bằng dấu phẩy"
          className="sm:col-span-2"
        >
          <Input
            autoComplete="off"
            maxLength={150}
            value={ingredient}
            placeholder="vd: Amoxicillin, Acid clavulanic"
            disabled={saving}
            onChange={(e) => {
              setIngredient(e.target.value)
              clear('activeIngredient')
            }}
          />
        </FormField>

        <FormField label="Hàm lượng" error={errors.strength}>
          <Input
            autoComplete="off"
            maxLength={50}
            value={strength}
            placeholder="vd: 500 mg"
            disabled={saving}
            onChange={(e) => {
              setStrength(e.target.value)
              clear('strength')
            }}
          />
        </FormField>

        <FormField label="Dạng bào chế" error={errors.dosageForm}>
          <Input
            autoComplete="off"
            maxLength={50}
            list={`${listId}-forms`}
            value={dosageForm}
            placeholder="vd: Viên nén"
            disabled={saving}
            onChange={(e) => {
              setDosageForm(e.target.value)
              clear('dosageForm')
            }}
          />
        </FormField>

        <FormField label="Đơn vị tính" required error={errors.unit} hint="Đơn vị khi kê và bán, vd viên, chai">
          <Input
            autoComplete="off"
            maxLength={20}
            list={`${listId}-units`}
            value={unit}
            placeholder="vd: viên"
            disabled={saving}
            onChange={(e) => {
              setUnit(e.target.value)
              clear('unit')
            }}
          />
        </FormField>

        <FormField label="Giá bán" required error={errors.price} hint="Bội số 100 ₫, tính theo đơn vị tính">
          <MoneyInput
            value={price}
            disabled={saving}
            placeholder="vd: 1.500"
            onValueChange={(v) => {
              setPrice(v)
              clear('price')
            }}
          />
        </FormField>

        <SwitchRow
          id="medicine-active"
          label="Đang dùng"
          description="Tắt để ngừng: bác sĩ không kê được thuốc này ở đơn mới."
          checked={isActive}
          disabled={saving}
          onCheckedChange={setIsActive}
          className="sm:col-span-2"
        />

        <datalist id={`${listId}-forms`}>
          {DOSAGE_FORMS.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
        <datalist id={`${listId}-units`}>
          {UNITS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
      </div>

      <DialogFooter className="border-t px-6 py-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          Hủy
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
          {medicine ? 'Lưu thay đổi' : 'Thêm thuốc'}
        </Button>
      </DialogFooter>
    </form>
  )
}
