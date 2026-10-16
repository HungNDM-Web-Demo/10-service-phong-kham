'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Info, Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { routePath } from '@/config/route-path'
import { useDebounce } from '@/hooks/use-debounce'
import { getErrorMessage, getFieldErrors } from '@/lib/api-error'
import { formatPhone } from '@/lib/format'
import type { Gender, PatientBrief, PatientDto, SavePatientInput } from '@/types/clinic'
import {
  useCreatePatient,
  useDuplicates,
  useUpdatePatient,
} from '@/features/clinic/hooks/use-clinic'
import { genderLabels } from '@/features/clinic/lib/labels'
import { problemCandidates, problemCode } from '@/features/clinic/lib/problem'
import { digitsOnly, isPhone } from '@/features/clinic/lib/rules'
import { hasErrors, validatePatient, type Errors } from '@/features/clinic/lib/validation'
import { ddmmyyyy, vnToday } from '@/features/clinic/lib/vn-time'

type PatientFormDialogProps = {
  /** null: đóng; 'new': thêm; PatientDto: sửa */
  target: PatientDto | 'new' | null
  onOpenChange: (open: boolean) => void
}

/** Thêm, sửa hồ sơ bệnh nhân (UC-07 bước 2–3, 1c): kiểm tra số điện thoại (BR-03), cảnh báo trùng hồ sơ (BR-14, FR-20). */
export function PatientFormDialog({ target, onOpenChange }: PatientFormDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        {target !== null && (
          <PatientForm
            key={target === 'new' ? 'new' : target.id}
            patient={target === 'new' ? null : target}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

type FormState = Omit<
  SavePatientInput,
  'address' | 'contactPerson' | 'allergies' | 'medicalHistory' | 'note' | 'force'
> & {
  address: string
  contactPerson: string
  allergies: string
  medicalHistory: string
  note: string
}

const toForm = (p: PatientDto | null): FormState => ({
  fullName: p?.fullName ?? '',
  birthDate: p?.birthDate ?? '',
  gender: p?.gender ?? 'Nam',
  phone: p?.phone ?? '',
  address: p?.address ?? '',
  contactPerson: p?.contactPerson ?? '',
  allergies: p?.allergies ?? '',
  medicalHistory: p?.medicalHistory ?? '',
  note: p?.note ?? '',
})

const orNull = (v: string) => v.trim() || null

function PatientForm({ patient, onClose }: { patient: PatientDto | null; onClose: () => void }) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(() => toForm(patient))
  const [errors, setErrors] = useState<Errors>({})
  /** Hồ sơ trùng do máy chủ trả về (409 TrungHoSo) khi bấm Lưu */
  const [serverCandidates, setServerCandidates] = useState<PatientBrief[] | null>(null)
  const dupBoxRef = useRef<HTMLDivElement>(null)
  const create = useCreatePatient()
  const update = useUpdatePatient()
  const pending = create.isPending || update.isPending
  const today = vnToday()

  // Kiểm tra trùng khi đang gõ số điện thoại + ngày sinh (BR-14)
  const phone = useDebounce(digitsOnly(form.phone), 300)
  const birthDate = useDebounce(form.birthDate, 300)
  const dup = useDuplicates(
    { phone, birthDate: birthDate || undefined, excludeId: patient?.id },
    isPhone(phone)
  )
  const exact = serverCandidates ?? dup.data?.exact ?? []
  const samePhone = dup.data?.samePhone ?? []

  const set = (patch: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...patch }))
    if ('phone' in patch || 'birthDate' in patch) setServerCandidates(null)
    const keys = Object.keys(patch)
    if (keys.some((k) => errors[k]))
      setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !keys.includes(k))))
  }

  const submit = (force: boolean) => {
    const input: SavePatientInput = {
      fullName: form.fullName.trim().replace(/\s+/g, ' '),
      birthDate: form.birthDate,
      gender: form.gender,
      phone: digitsOnly(form.phone),
      address: orNull(form.address),
      contactPerson: orNull(form.contactPerson),
      allergies: orNull(form.allergies),
      medicalHistory: orNull(form.medicalHistory),
      note: orNull(form.note),
      ...(force ? { force: true } : {}),
    }
    const local = validatePatient(input)
    if (!local.birthDate && input.birthDate > today)
      local.birthDate = 'Ngày sinh không được sau hôm nay'
    setErrors(local)
    if (hasErrors(local)) return

    const onError = (err: unknown) => {
      if (problemCode(err) === 'TrungHoSo') {
        setServerCandidates(problemCandidates(err))
        requestAnimationFrame(() => dupBoxRef.current?.focus())
        return
      }
      const fields = getFieldErrors(err)
      setErrors(fields)
      if (!hasErrors(fields)) toast.error(getErrorMessage(err))
    }

    if (patient) {
      update.mutate(
        { id: patient.id, input },
        {
          onSuccess: (p) => {
            toast.success(`Đã lưu hồ sơ ${p.code}`)
            onClose()
          },
          onError,
        }
      )
    } else {
      create.mutate(input, {
        onSuccess: (p) => {
          toast.success(`Đã thêm bệnh nhân ${p.fullName} (${p.code})`)
          onClose()
          router.push(routePath.patientDetail(p.id))
        },
        onError,
      })
    }
  }

  const pickExisting = (p: PatientBrief) => {
    onClose()
    router.push(routePath.patientDetail(p.id))
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit(false)
      }}
      className="grid gap-5"
      noValidate
    >
      <DialogHeader>
        <DialogTitle>{patient ? `Sửa hồ sơ ${patient.code}` : 'Thêm bệnh nhân'}</DialogTitle>
        <DialogDescription>
          {patient
            ? 'Mã bệnh nhân giữ nguyên, thay đổi được ghi nhật ký.'
            : 'Hệ thống tự cấp mã BN và kiểm tra trùng theo số điện thoại, ngày sinh.'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Họ tên" required error={errors.fullName} className="sm:col-span-2">
          <Input
            value={form.fullName}
            maxLength={100}
            autoComplete="off"
            onChange={(e) => set({ fullName: e.target.value })}
          />
        </FormField>
        <FormField label="Ngày sinh" required error={errors.birthDate}>
          <Input
            type="date"
            max={today}
            value={form.birthDate}
            onChange={(e) => set({ birthDate: e.target.value })}
          />
        </FormField>
        <div className="grid gap-1.5">
          <Label id="patient-gender-label">Giới tính</Label>
          <RadioGroup
            value={form.gender}
            onValueChange={(v) => set({ gender: v as Gender })}
            className="flex h-10 items-center gap-6"
            aria-labelledby="patient-gender-label"
          >
            {(Object.keys(genderLabels) as Gender[]).map((g) => (
              <div key={g} className="flex items-center gap-2">
                <RadioGroupItem value={g} id={`patient-gender-${g}`} />
                <Label htmlFor={`patient-gender-${g}`} className="font-normal">
                  {genderLabels[g]}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <FormField label="Số điện thoại" required error={errors.phone}>
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="off"
            value={form.phone}
            className="tabular-nums"
            onChange={(e) => set({ phone: e.target.value.replace(/[^\d]/g, '').slice(0, 10) })}
          />
        </FormField>
        <FormField
          label="Người liên hệ"
          error={errors.contactPerson}
          hint="Vd: Mẹ – Lê Thị Hoa, 0903 111 222"
        >
          <Input
            value={form.contactPerson}
            maxLength={150}
            onChange={(e) => set({ contactPerson: e.target.value })}
          />
        </FormField>

        {exact.length > 0 && (
          <div
            ref={dupBoxRef}
            tabIndex={-1}
            role="alert"
            className="border-warning/40 bg-warning/10 space-y-3 rounded-lg border p-3 text-sm outline-none sm:col-span-2"
          >
            <p className="text-warning flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4" aria-hidden="true" />
              Có thể trùng hồ sơ
            </p>
            <p className="text-foreground/80">
              Đã có hồ sơ cùng số điện thoại và ngày sinh. Kiểm tra lại trước khi tạo mới.
            </p>
            <ul className="space-y-2">
              {exact.map((p) => (
                <li
                  key={p.id}
                  className="bg-card flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="font-medium">{p.fullName}</span>{' '}
                    <span className="text-muted-foreground tabular-nums">
                      · {p.code} · {formatPhone(p.phone)} · {ddmmyyyy(p.birthDate)}
                    </span>
                  </span>
                  {!patient && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => pickExisting(p)}
                    >
                      Dùng hồ sơ này
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {!patient && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => submit(true)}
                >
                  <UserPlus aria-hidden="true" />
                  Vẫn tạo mới
                </Button>
              </div>
            )}
          </div>
        )}
        {exact.length === 0 && samePhone.length > 0 && (
          <p className="text-muted-foreground flex items-start gap-2 text-sm sm:col-span-2">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              Cùng số điện thoại với: {samePhone.map((p) => `${p.fullName} (${p.code})`).join(', ')}
            </span>
          </p>
        )}

        <FormField label="Địa chỉ" error={errors.address} className="sm:col-span-2">
          <Input
            value={form.address}
            maxLength={250}
            onChange={(e) => set({ address: e.target.value })}
          />
        </FormField>
        <FormField
          label="Tiền sử dị ứng"
          error={errors.allergies}
          hint="Các từ khóa cách nhau bởi dấu phẩy, vd: Amoxicillin, Penicillin"
          className="sm:col-span-2"
        >
          <Input
            value={form.allergies}
            maxLength={500}
            onChange={(e) => set({ allergies: e.target.value })}
          />
        </FormField>
        <FormField label="Tiền sử bệnh" error={errors.medicalHistory} className="sm:col-span-2">
          <Textarea
            rows={2}
            maxLength={1000}
            value={form.medicalHistory}
            onChange={(e) => set({ medicalHistory: e.target.value })}
          />
        </FormField>
        <FormField label="Ghi chú" error={errors.note} className="sm:col-span-2">
          <Textarea
            rows={2}
            maxLength={500}
            value={form.note}
            onChange={(e) => set({ note: e.target.value })}
          />
        </FormField>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          Hủy
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Lưu
        </Button>
      </DialogFooter>
    </form>
  )
}
