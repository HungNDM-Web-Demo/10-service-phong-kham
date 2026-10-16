'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDoctorOptions, useSpecialties } from '@/features/clinic/hooks/use-clinic'

const ALL = 'all'

/** Bộ lọc bác sĩ của báo cáo (Theo bác sĩ, Tái khám, Công nợ — SRS §6) */
export function DoctorFilter({
  value,
  onChange,
  specialtyId,
  id = 'report-doctor',
}: {
  value: string | undefined
  onChange: (doctorId: string | undefined) => void
  /** Chỉ hiện bác sĩ của chuyên khoa đang lọc */
  specialtyId?: string
  id?: string
}) {
  const doctors = useDoctorOptions()
  const list = (doctors.data ?? []).filter((d) => !specialtyId || d.specialtyId === specialtyId)
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="text-muted-foreground shrink-0 text-sm font-normal">
        Bác sĩ
      </Label>
      <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)} disabled={!doctors.data}>
        <SelectTrigger id={id} className="w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tất cả bác sĩ</SelectItem>
          {list.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** Bộ lọc chuyên khoa (Theo bác sĩ, Lượt khám — SRS §6) */
export function SpecialtyFilter({
  value,
  onChange,
  id = 'report-specialty',
}: {
  value: string | undefined
  onChange: (specialtyId: string | undefined) => void
  id?: string
}) {
  const specialties = useSpecialties()
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="text-muted-foreground shrink-0 text-sm font-normal">
        Chuyên khoa
      </Label>
      <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)} disabled={!specialties.data}>
        <SelectTrigger id={id} className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tất cả chuyên khoa</SelectItem>
          {(specialties.data ?? []).map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** Tham số báo cáo bỏ trường rỗng để khóa query ổn định */
export function reportQuery<T extends Record<string, string | number | undefined>>(q: T): Partial<T> {
  return Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== '')) as Partial<T>
}
