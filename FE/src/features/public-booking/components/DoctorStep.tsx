'use client'

import { Baby, HeartPulse, Shuffle, Smile, Stethoscope, type LucideIcon } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import type { PublicDoctorDto, PublicSpecialtyDto } from '@/types/clinic'
import { ANY_DOCTOR, specialtyKind, type SpecialtyKind } from '../lib/booking'
import { ChoiceCard } from './ChoiceCard'
import { DoctorAvatar } from './DoctorAvatar'

const SPECIALTY_ICONS: Record<SpecialtyKind, LucideIcon> = { rang: Smile, nhi: Baby, noi: HeartPulse, khac: Stethoscope }

type DoctorStepProps = {
  specialties: PublicSpecialtyDto[]
  doctors: PublicDoctorDto[]
  specialtyId: string | null
  doctorChoice: string | null
  onSpecialty: (id: string) => void
  onDoctor: (choice: string) => void
}

/** Bước 1 (UC-03 bước 2, 3, 3a): chọn chuyên khoa, rồi một bác sĩ của chuyên khoa hoặc "Bác sĩ bất kỳ" (BR-04). */
export function DoctorStep({ specialties, doctors, specialtyId, doctorChoice, onSpecialty, onDoctor }: DoctorStepProps) {
  const list = doctors.filter((d) => d.specialtyId === specialtyId)

  return (
    <div className="space-y-6">
      <fieldset className="space-y-2.5">
        <legend className="mb-2.5 text-sm font-semibold">Chuyên khoa</legend>
        <div className="grid grid-cols-3 gap-2">
          {specialties.map((s) => {
            const Icon = SPECIALTY_ICONS[specialtyKind(s.name)]
            const count = doctors.filter((d) => d.specialtyId === s.id).length
            const checked = s.id === specialtyId
            return (
              <ChoiceCard
                key={s.id}
                name="specialty"
                value={s.id}
                checked={checked}
                onSelect={onSpecialty}
                showCheck={false}
                className="flex-col gap-1.5 py-1 text-center"
              >
                <span
                  className={cn(
                    'flex size-10 items-center justify-center rounded-full transition-colors',
                    checked ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                  )}
                  aria-hidden="true"
                >
                  <Icon className="size-5" />
                </span>
                <span className="text-sm leading-tight font-medium text-balance">{s.name}</span>
                <span className="text-muted-foreground text-xs">{count} bác sĩ</span>
              </ChoiceCard>
            )
          })}
        </div>
      </fieldset>

      {specialtyId ? (
        <fieldset className="space-y-2">
          <legend className="mb-2.5 text-sm font-semibold">Bác sĩ</legend>
          <ChoiceCard name="doctor" value={ANY_DOCTOR} checked={doctorChoice === ANY_DOCTOR} onSelect={onDoctor}>
            <span className="bg-cta/12 text-cta flex size-12 shrink-0 items-center justify-center rounded-full" aria-hidden="true">
              <Shuffle className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-medium">Bác sĩ bất kỳ</span>
              <span className="text-muted-foreground block text-sm">Phòng khám xếp bác sĩ còn trống, có nhiều giờ để chọn hơn</span>
            </span>
          </ChoiceCard>
          {list.map((d) => (
            <ChoiceCard key={d.id} name="doctor" value={d.id} checked={doctorChoice === d.id} onSelect={onDoctor} className="items-start">
              <DoctorAvatar photoUrl={d.photoUrl} name={d.fullName} />
              <span className="min-w-0">
                <span className="block font-medium">{d.displayName}</span>
                <span className="text-muted-foreground block text-xs">{d.room}</span>
                {d.bio && <span className="text-muted-foreground mt-1 line-clamp-2 block text-sm">{d.bio}</span>}
              </span>
            </ChoiceCard>
          ))}
          {list.length === 0 && (
            <EmptyState compact icon={Stethoscope} title="Chuyên khoa này chưa nhận đặt online" description="Vui lòng chọn chuyên khoa khác hoặc gọi phòng khám." />
          )}
        </fieldset>
      ) : (
        <p className="text-muted-foreground bg-muted/60 rounded-xl px-4 py-6 text-center text-sm">Chọn một chuyên khoa để xem bác sĩ.</p>
      )}
    </div>
  )
}
