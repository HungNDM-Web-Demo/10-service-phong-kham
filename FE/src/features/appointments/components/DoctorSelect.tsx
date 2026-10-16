'use client'

import { useMemo } from 'react'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DoctorOption } from '@/types/clinic'

type DoctorSelectProps = {
  id?: string
  doctors: DoctorOption[] | undefined
  value: string
  onChange: (doctorId: string) => void
  disabled?: boolean
  placeholder?: string
  /** Thêm mục "Tất cả bác sĩ" (giá trị rỗng) cho bộ lọc */
  allowAll?: boolean
  className?: string
  'aria-label'?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

const ALL = '__all__'

/** Chọn bác sĩ, nhóm theo chuyên khoa; mỗi dòng có phòng khám để lễ tân tư vấn. */
export function DoctorSelect({
  id,
  doctors,
  value,
  onChange,
  disabled,
  placeholder = 'Chọn bác sĩ',
  allowAll,
  className,
  ...aria
}: DoctorSelectProps) {
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; items: DoctorOption[] }>()
    for (const d of doctors ?? []) {
      const g = map.get(d.specialtyId) ?? { name: d.specialtyName, items: [] }
      g.items.push(d)
      map.set(d.specialtyId, g)
    }
    return [...map.values()]
  }, [doctors])

  return (
    <Select value={value || (allowAll ? ALL : '')} onValueChange={(v) => onChange(v === ALL ? '' : v)} disabled={disabled}>
      <SelectTrigger id={id} className={className} {...aria}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value={ALL}>Tất cả bác sĩ</SelectItem>}
        {groups.map((g) => (
          <SelectGroup key={g.name}>
            <SelectLabel>{g.name}</SelectLabel>
            {g.items.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.displayName} · {d.room}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
