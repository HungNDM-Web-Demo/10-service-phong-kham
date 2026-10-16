'use client'

import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useDiagnosisOptions } from '@/features/clinic/hooks/use-clinic'
import { clinicRules } from '@/features/clinic/lib/rules'
import { normalizeVi } from '@/lib/normalize'
import type { DiagnosisTemplateDto } from '@/types/clinic'
import { bmiOf, rowKey, type DiagnosisRow, type VisitForm } from '../lib/visit-form'

type SectionProps = {
  form: VisitForm
  set: (patch: Partial<VisitForm>) => void
  errors: Record<string, string>
  readOnly: boolean
}

export function SectionCard({ title, description, children, actions }: { title: string; description?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <Card className="gap-3 overflow-visible p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="text-muted-foreground text-xs">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </Card>
  )
}

/** Sinh hiệu (BR-16), triệu chứng, khám lâm sàng (UC-08 bước 2). */
export function VitalsSection({ form, set, errors, readOnly }: SectionProps) {
  const field = (key: keyof VisitForm, label: string, unit: string, inputMode: 'decimal' | 'numeric' = 'numeric') => (
    <FormField label={`${label} (${unit})`} error={errors[key]}>
      <Input
        value={form[key] as string}
        inputMode={inputMode}
        disabled={readOnly}
        onChange={(e) => set({ [key]: e.target.value.replace(/[^\d.,]/g, '').slice(0, 6) } as Partial<VisitForm>)}
        className="tabular-nums"
      />
    </FormField>
  )
  const bmi = bmiOf(form.weight, form.height)
  return (
    <SectionCard title="Sinh hiệu và khám" description="Nhập trong khoảng hợp lệ, ngoài khoảng sẽ báo lỗi tại ô">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {field('temperature', 'Nhiệt độ', '°C', 'decimal')}
        {field('pulse', 'Mạch', 'lần/phút')}
        {field('bpSystolic', 'HA tâm thu', 'mmHg')}
        {field('bpDiastolic', 'HA tâm trương', 'mmHg')}
        {field('weight', 'Cân nặng', 'kg', 'decimal')}
        {field('height', 'Chiều cao', 'cm')}
      </div>
      {bmi && <p className="text-muted-foreground text-xs">BMI ước tính: {bmi}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        <FormField label="Triệu chứng" error={errors.symptoms}>
          <Textarea rows={3} value={form.symptoms} maxLength={2000} disabled={readOnly} onChange={(e) => set({ symptoms: e.target.value })} />
        </FormField>
        <FormField label="Khám lâm sàng" error={errors.examination}>
          <Textarea rows={3} value={form.examination} maxLength={2000} disabled={readOnly} onChange={(e) => set({ examination: e.target.value })} />
        </FormField>
      </div>
    </SectionCard>
  )
}

function DiagnosisInput({
  row,
  options,
  onChange,
  onRemove,
  readOnly,
  error,
  label,
}: {
  row: DiagnosisRow
  options: DiagnosisTemplateDto[]
  onChange: (row: DiagnosisRow) => void
  onRemove?: () => void
  readOnly: boolean
  error?: string
  label: string
}) {
  const [focused, setFocused] = useState(false)
  const text = row.icdCode ? `${row.icdCode} ${row.name}` : row.name
  const term = normalizeVi(row.name)
  const matches = useMemo(
    () => (term && !row.icdCode ? options.filter((o) => normalizeVi(`${o.icdCode} ${o.name}`).includes(term)).slice(0, 8) : []),
    [options, term, row.icdCode]
  )
  return (
    <FormField label={label} error={error}>
      <div className="relative">
        <div className="flex gap-2">
          <Input
            value={text}
            disabled={readOnly}
            placeholder="Gõ mã ICD-10 hoặc tên chẩn đoán"
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 150)}
            onChange={(e) => onChange({ ...row, icdCode: null, name: e.target.value })}
          />
          {onRemove && !readOnly && (
            <Button type="button" variant="ghost" size="icon" aria-label="Bỏ chẩn đoán phụ" onClick={onRemove}>
              <X aria-hidden="true" />
            </Button>
          )}
        </div>
        {focused && matches.length > 0 && (
          <ul className="bg-popover absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border shadow-md" role="listbox">
            {matches.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  className="hover:bg-accent flex w-full gap-2 px-3 py-1.5 text-left text-sm"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange({ ...row, icdCode: o.icdCode, name: o.name })
                    setFocused(false)
                  }}
                >
                  <span className="text-muted-foreground w-14 shrink-0 tabular-nums">{o.icdCode}</span>
                  <span>{o.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </FormField>
  )
}

/** Chẩn đoán chính và tối đa 3 chẩn đoán phụ, chọn từ danh mục mẫu hoặc nhập tự do (UC-08 bước 3). */
export function DiagnosisSection({ form, set, errors, readOnly }: SectionProps) {
  const options = useDiagnosisOptions()
  const main = form.diagnoses.find((d) => d.kind === 'Chinh') ?? { key: 'main', kind: 'Chinh' as const, icdCode: null, name: '' }
  const extras = form.diagnoses.filter((d) => d.kind === 'Phu')
  const update = (rows: DiagnosisRow[]) => set({ diagnoses: rows })
  const setMain = (row: DiagnosisRow) => update([row, ...extras])
  const setExtra = (key: string, row: DiagnosisRow) => update([main, ...extras.map((x) => (x.key === key ? row : x))])
  return (
    <SectionCard
      title="Chẩn đoán"
      actions={
        !readOnly &&
        extras.length < clinicRules.maxSecondaryDiagnoses && (
          <Button type="button" variant="outline" size="sm" onClick={() => update([main, ...extras, { key: rowKey(), kind: 'Phu', icdCode: null, name: '' }])}>
            <Plus aria-hidden="true" />
            Chẩn đoán phụ
          </Button>
        )
      }
    >
      {errors.diagnoses && <p className="text-destructive text-sm">{errors.diagnoses}</p>}
      <DiagnosisInput label="Chẩn đoán chính" row={main} options={options.data ?? []} onChange={setMain} readOnly={readOnly} error={errors['diagnoses[0].name']} />
      {extras.map((row, i) => (
        <DiagnosisInput
          key={row.key}
          label={`Chẩn đoán phụ ${i + 1}`}
          row={row}
          options={options.data ?? []}
          onChange={(r) => setExtra(row.key, r)}
          onRemove={() => update([main, ...extras.filter((x) => x.key !== row.key)])}
          readOnly={readOnly}
        />
      ))}
    </SectionCard>
  )
}
