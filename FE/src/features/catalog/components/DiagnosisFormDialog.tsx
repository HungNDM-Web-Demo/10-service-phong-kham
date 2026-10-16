'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getErrorMessage, getFieldErrors } from '@/lib/api-error'
import type { DiagnosisTemplateDto, SaveDiagnosisInput, SpecialtyDto } from '@/types/clinic'
import { useCreateDiagnosis, useUpdateDiagnosis } from '@/features/clinic/hooks/use-clinic'
import { validateDiagnosis } from '@/features/clinic/lib/validation'
import { NO_SPECIALTY, withoutError, type FormErrors } from '../lib/catalog'
import { SwitchRow } from './CatalogParts'

/** `diagnosis` null là thêm mới; `specialtyId` chọn sẵn theo bộ lọc */
export type DiagnosisDialogTarget = { diagnosis: DiagnosisTemplateDto | null; specialtyId?: string }

/** Thêm, sửa chẩn đoán mẫu (UC-01 1b, E1; FR-05): mã ICD-10, tên tiếng Việt, chuyên khoa. */
export function DiagnosisFormDialog({
  target,
  specialties,
  onOpenChange,
}: {
  target: DiagnosisDialogTarget | null
  specialties: SpecialtyDto[]
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-xl">
        {target && (
          <DiagnosisForm
            key={target.diagnosis?.id ?? 'new'}
            target={target}
            specialties={specialties}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function DiagnosisForm({
  target,
  specialties,
  onClose,
}: {
  target: DiagnosisDialogTarget
  specialties: SpecialtyDto[]
  onClose: () => void
}) {
  const diagnosis = target.diagnosis
  const create = useCreateDiagnosis()
  const update = useUpdateDiagnosis()
  const saving = create.isPending || update.isPending

  const [icdCode, setIcdCode] = useState(diagnosis?.icdCode ?? '')
  const [name, setName] = useState(diagnosis?.name ?? '')
  const [specialtyId, setSpecialtyId] = useState<string | null>(diagnosis?.specialtyId ?? target.specialtyId ?? null)
  const [isActive, setIsActive] = useState(diagnosis?.isActive ?? true)
  const [errors, setErrors] = useState<FormErrors>({})
  const clear = (key: string) => setErrors((e) => withoutError(e, key))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const input: SaveDiagnosisInput = { icdCode: icdCode.trim().toUpperCase(), name: name.trim(), specialtyId, isActive }
    const found = validateDiagnosis(input)
    setErrors(found)
    if (Object.keys(found).length) return

    const onError = (err: unknown) => {
      const fields = getFieldErrors(err)
      if (Object.keys(fields).length) setErrors(fields)
      else toast.error(getErrorMessage(err))
    }
    const onSuccess = (saved: DiagnosisTemplateDto) => {
      toast.success(diagnosis ? 'Đã lưu chẩn đoán mẫu' : `Đã thêm chẩn đoán ${saved.icdCode}`, { description: saved.name })
      onClose()
    }
    if (diagnosis) update.mutate({ id: diagnosis.id, input }, { onSuccess, onError })
    else create.mutate(input, { onSuccess, onError })
  }

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-col">
      <DialogHeader className="border-b px-6 py-4">
        <DialogTitle>{diagnosis ? `Sửa chẩn đoán ${diagnosis.icdCode}` : 'Thêm chẩn đoán mẫu'}</DialogTitle>
        <DialogDescription>Bác sĩ gõ mã hoặc tên để chọn nhanh khi ghi chẩn đoán trong phiếu khám.</DialogDescription>
      </DialogHeader>

      <div className="grid max-h-[calc(100dvh-13rem)] gap-4 overflow-y-auto px-6 py-5">
        <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
          <FormField label="Mã ICD-10" required error={errors.icdCode} hint="Dạng K02.1">
            <Input
              autoComplete="off"
              autoFocus={!diagnosis}
              maxLength={7}
              className="font-mono uppercase"
              value={icdCode}
              placeholder="vd: K02.1"
              disabled={saving}
              onChange={(e) => {
                setIcdCode(e.target.value.toUpperCase().replace(/\s+/g, ''))
                clear('icdCode')
              }}
            />
          </FormField>
          <FormField label="Tên chẩn đoán" required error={errors.name}>
            <Input
              autoComplete="off"
              autoFocus={!!diagnosis}
              maxLength={200}
              value={name}
              placeholder="vd: Sâu ngà răng"
              disabled={saving}
              onChange={(e) => {
                setName(e.target.value)
                clear('name')
              }}
            />
          </FormField>
        </div>

        <FormField label="Chuyên khoa" error={errors.specialtyId} htmlFor="diagnosis-specialty" hint="Bỏ trống nếu dùng cho mọi chuyên khoa">
          <Select
            value={specialtyId ?? NO_SPECIALTY}
            disabled={saving}
            onValueChange={(v) => {
              setSpecialtyId(v === NO_SPECIALTY ? null : v)
              clear('specialtyId')
            }}
          >
            <SelectTrigger id="diagnosis-specialty">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_SPECIALTY}>Dùng chung</SelectItem>
              {specialties.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <SwitchRow
          id="diagnosis-active"
          label="Đang dùng"
          description="Tắt để ngừng: chẩn đoán không còn trong danh sách chọn nhanh."
          checked={isActive}
          disabled={saving}
          onCheckedChange={setIsActive}
        />
      </div>

      <DialogFooter className="border-t px-6 py-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          Hủy
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
          {diagnosis ? 'Lưu thay đổi' : 'Thêm chẩn đoán'}
        </Button>
      </DialogFooter>
    </form>
  )
}
