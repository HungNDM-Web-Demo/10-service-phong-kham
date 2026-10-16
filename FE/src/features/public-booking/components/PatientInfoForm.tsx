'use client'

import { AlertCircle } from 'lucide-react'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { Gender } from '@/types/clinic'
import { genderLabels } from '@/features/clinic/lib/labels'
import { NAME_MAX, REASON_MAX, type PatientField, type PatientInfo } from '../lib/booking'

/** id ô nhập, để bước kiểm tra đưa con trỏ về ô lỗi đầu tiên */
export const patientFieldId = (field: PatientField) => `booking-${field}`

const GENDERS: Gender[] = ['Nam', 'Nu']

type PatientInfoFormProps = {
  value: PatientInfo
  errors: Partial<Record<PatientField, string>>
  onChange: <K extends PatientField>(field: K, value: PatientInfo[K]) => void
}

/** Bước 3 (UC-03 bước 5): họ tên, số điện thoại (BR-03), năm sinh, giới tính, lý do khám (không bắt buộc). */
export function PatientInfoForm({ value, errors, onChange }: PatientInfoFormProps) {
  const genderMessageId = `${patientFieldId('gender')}-message`

  return (
    <div className="space-y-4">
      <FormField label="Họ và tên" required error={errors.fullName} htmlFor={patientFieldId('fullName')}>
        <Input
          autoComplete="name"
          autoCapitalize="words"
          maxLength={NAME_MAX}
          placeholder="Vd Nguyễn Thị Mai"
          value={value.fullName}
          onChange={(e) => onChange('fullName', e.target.value)}
        />
      </FormField>

      <FormField
        label="Số điện thoại"
        required
        error={errors.phone}
        hint="Phòng khám gọi số này để xác nhận lịch"
        htmlFor={patientFieldId('phone')}
      >
        <Input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          maxLength={13}
          placeholder="Vd 0912 345 678"
          value={value.phone}
          onChange={(e) => onChange('phone', e.target.value.replace(/[^\d\s]/g, ''))}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Năm sinh" required error={errors.birthYear} htmlFor={patientFieldId('birthYear')}>
          <Input
            inputMode="numeric"
            autoComplete="bday-year"
            maxLength={4}
            placeholder="Vd 1990"
            value={value.birthYear}
            onChange={(e) => onChange('birthYear', e.target.value.replace(/\D/g, ''))}
          />
        </FormField>

        <fieldset className="grid gap-1.5" aria-describedby={errors.gender ? genderMessageId : undefined}>
          <legend className="mb-1.5 flex items-center gap-0.5 text-sm leading-none font-medium">
            Giới tính
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {GENDERS.map((g, i) => {
              const checked = value.gender === g
              return (
                <label
                  key={g}
                  className={cn(
                    'flex h-10 cursor-pointer items-center justify-center rounded-md border text-sm font-medium transition-colors',
                    'has-[input:focus-visible]:ring-ring/50 has-[input:focus-visible]:ring-3',
                    checked ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/40',
                    errors.gender && !checked && 'border-destructive'
                  )}
                >
                  <input
                    id={i === 0 ? patientFieldId('gender') : undefined}
                    type="radio"
                    name="gender"
                    value={g}
                    checked={checked}
                    onChange={() => onChange('gender', g)}
                    className="sr-only"
                  />
                  {genderLabels[g]}
                </label>
              )
            })}
          </div>
          {errors.gender && (
            <p id={genderMessageId} role="alert" className="text-destructive flex items-start gap-1 text-[0.8125rem]">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {errors.gender}
            </p>
          )}
        </fieldset>
      </div>

      <FormField
        label="Lý do khám"
        error={errors.reason}
        hint={`Không bắt buộc, tối đa ${REASON_MAX} ký tự. Vd đau răng hàm dưới 3 ngày nay`}
        htmlFor={patientFieldId('reason')}
      >
        <Textarea rows={3} maxLength={REASON_MAX} value={value.reason} onChange={(e) => onChange('reason', e.target.value)} />
      </FormField>
    </div>
  )
}
