'use client'

import { useState } from 'react'
import { Check, Loader2, Search, UserPlus, X } from 'lucide-react'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useDebounce } from '@/hooks/use-debounce'
import { formatPhone } from '@/lib/format'
import type { Gender, NewPatientInput, PatientBrief, PatientDto } from '@/types/clinic'
import { useDuplicates, usePatients } from '../hooks/use-clinic'
import { ddmmyyyy } from '../lib/vn-time'
import { AllergyBadge } from './ClinicBadges'

export type PatientChoice = { patient: PatientBrief | PatientDto | null; newPatient: NewPatientInput | null }

type PatientPickerProps = {
  value: PatientChoice
  onChange: (value: PatientChoice) => void
  /** Gợi ý ban đầu khi tạo hồ sơ mới (thông tin khách đặt online) */
  defaults?: Partial<NewPatientInput>
  /** Hồ sơ cùng số điện thoại để chọn nhanh (lịch online chưa ghép hồ sơ, BR-14) */
  suggestions?: PatientBrief[]
  errors?: Record<string, string>
  disabled?: boolean
  allowCreate?: boolean
}

const emptyNew = (d?: Partial<NewPatientInput>): NewPatientInput => ({
  fullName: d?.fullName ?? '',
  phone: d?.phone ?? '',
  birthDate: d?.birthDate ?? '',
  gender: d?.gender ?? 'Nam',
})

/**
 * Chọn bệnh nhân: tìm theo mã, họ tên, số điện thoại, hoặc thêm nhanh hồ sơ (UC-04 bước 3, UC-05 2a). Khi thêm mới, cảnh báo
 * trùng số điện thoại và ngày sinh, gợi ý hồ sơ cùng số điện thoại (BR-14).
 */
export function PatientPicker({ value, onChange, defaults, suggestions = [], errors = {}, disabled, allowCreate = true }: PatientPickerProps) {
  const [search, setSearch] = useState('')
  const term = useDebounce(search.trim(), 250)
  const creating = value.newPatient !== null
  const found = usePatients({ search: term, pageSize: 6 }, !creating && !value.patient && term.length >= 2)
  const draft = value.newPatient
  const dup = useDuplicates(
    { phone: draft?.phone ?? '', birthDate: draft?.birthDate || undefined },
    creating && /^0\d{9}$/.test((draft?.phone ?? '').replace(/\s/g, ''))
  )

  const pick = (p: PatientBrief | PatientDto) => onChange({ patient: p, newPatient: null })
  const setDraft = (patch: Partial<NewPatientInput>) => onChange({ patient: null, newPatient: { ...(draft ?? emptyNew(defaults)), ...patch } })

  if (value.patient) {
    const p = value.patient
    return (
      <div className="bg-muted/50 flex items-start gap-3 rounded-lg border p-3 text-sm">
        <Check className="text-success mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-semibold">{p.fullName}</p>
          <p className="text-muted-foreground tabular-nums">
            {p.code} · {formatPhone(p.phone)} · {ddmmyyyy(p.birthDate)} ({p.age} tuổi)
          </p>
          <AllergyBadge allergies={p.allergies} />
        </div>
        {!disabled && (
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Chọn bệnh nhân khác" onClick={() => onChange({ patient: null, newPatient: null })}>
            <X aria-hidden="true" />
          </Button>
        )}
      </div>
    )
  }

  if (creating && draft) {
    const exact = dup.data?.exact ?? []
    const samePhone = dup.data?.samePhone ?? []
    return (
      <div className="space-y-3 rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <UserPlus className="size-4" aria-hidden="true" />
            Hồ sơ mới
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ patient: null, newPatient: null })}>
            Tìm hồ sơ có sẵn
          </Button>
        </div>
        <FormField label="Họ tên" required error={errors['newPatient.fullName']}>
          <Input value={draft.fullName} maxLength={100} disabled={disabled} onChange={(e) => setDraft({ fullName: e.target.value })} />
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Số điện thoại" required error={errors['newPatient.phone']}>
            <Input
              type="tel"
              inputMode="tel"
              value={draft.phone}
              disabled={disabled}
              onChange={(e) => setDraft({ phone: e.target.value.replace(/[^\d]/g, '').slice(0, 10) })}
              className="tabular-nums"
            />
          </FormField>
          <FormField label="Ngày sinh" required error={errors['newPatient.birthDate']}>
            <Input type="date" value={draft.birthDate} disabled={disabled} onChange={(e) => setDraft({ birthDate: e.target.value })} />
          </FormField>
        </div>
        <RadioGroup value={draft.gender} onValueChange={(v) => setDraft({ gender: v as Gender })} className="flex gap-4" aria-label="Giới tính">
          {(['Nam', 'Nu'] as const).map((g) => (
            <div key={g} className="flex items-center gap-2">
              <RadioGroupItem value={g} id={`gender-${g}`} disabled={disabled} />
              <Label htmlFor={`gender-${g}`}>{g === 'Nu' ? 'Nữ' : 'Nam'}</Label>
            </div>
          ))}
        </RadioGroup>
        {exact.length > 0 && (
          <div className="border-warning/40 bg-warning/10 space-y-2 rounded-md border p-2 text-sm" role="alert">
            <p className="text-warning font-medium">Có thể trùng hồ sơ (cùng số điện thoại và ngày sinh)</p>
            {exact.map((p) => (
              <button key={p.id} type="button" onClick={() => pick(p)} className="hover:bg-accent block w-full rounded px-2 py-1 text-left">
                Dùng hồ sơ {p.code} · {p.fullName}
              </button>
            ))}
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!draft.force} onChange={(e) => setDraft({ force: e.target.checked })} />
              Vẫn tạo hồ sơ mới
            </label>
          </div>
        )}
        {exact.length === 0 && samePhone.length > 0 && (
          <p className="text-muted-foreground text-sm">Cùng số điện thoại với: {samePhone.map((p) => `${p.fullName} (${p.code})`).join(', ')}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {suggestions.length > 0 && (
        <div className="space-y-1.5 rounded-lg border p-2">
          <p className="text-muted-foreground text-xs">Hồ sơ cùng số điện thoại</p>
          {suggestions.map((p) => (
            <button key={p.id} type="button" onClick={() => pick(p)} className="hover:bg-accent flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm">
              <span>
                <b>{p.fullName}</b> <span className="text-muted-foreground tabular-nums">· {p.code} · {ddmmyyyy(p.birthDate)}</span>
              </span>
              <span className="text-primary text-xs font-medium">Chọn</span>
            </button>
          ))}
        </div>
      )}
      <FormField label="Bệnh nhân" required error={errors.patientId}>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden="true" />
          <Input
            value={search}
            disabled={disabled}
            placeholder="Mã, họ tên hoặc số điện thoại"
            className="pl-9"
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
          {found.isFetching && <Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" aria-hidden="true" />}
        </div>
      </FormField>
      {term.length >= 2 && found.data && (
        <ul className="divide-y rounded-lg border" role="listbox" aria-label="Kết quả tìm bệnh nhân">
          {found.data.items.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => pick(p)} className="hover:bg-accent flex w-full flex-col items-start px-3 py-2 text-left text-sm">
                <span className="font-medium">{p.fullName}</span>
                <span className="text-muted-foreground tabular-nums">
                  {p.code} · {formatPhone(p.phone)} · {ddmmyyyy(p.birthDate)}
                </span>
              </button>
            </li>
          ))}
          {found.data.items.length === 0 && <li className="text-muted-foreground px-3 py-2 text-sm">Không tìm thấy bệnh nhân</li>}
        </ul>
      )}
      {allowCreate && (
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onChange({ patient: null, newPatient: emptyNew(defaults) })}>
          <UserPlus aria-hidden="true" />
          Thêm hồ sơ mới
        </Button>
      )}
    </div>
  )
}
