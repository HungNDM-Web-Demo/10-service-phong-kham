'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CalendarCheck, CalendarX2, Clock, Loader2, Phone, Search, Stethoscope, TriangleAlert } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { routePath } from '@/config/route-path'
import { getErrorMessage, getFieldErrors } from '@/lib/api-error'
import type { PublicAppointmentDto, PublicCatalogDto } from '@/types/clinic'
import { usePublicBook, usePublicCatalog, usePublicSlots } from '@/features/clinic/hooks/use-clinic'
import { problemCode } from '@/features/clinic/lib/problem'
import { digitsOnly } from '@/features/clinic/lib/rules'
import { vnToday } from '@/features/clinic/lib/vn-time'
import { BookingReview } from '../components/BookingReview'
import { BookingSteps } from '../components/BookingSteps'
import { BookingSuccess } from '../components/BookingSuccess'
import { DayChips } from '../components/DayChips'
import { DoctorStep } from '../components/DoctorStep'
import { PatientInfoForm, patientFieldId } from '../components/PatientInfoForm'
import { SlotPicker } from '../components/SlotPicker'
import {
  ANY_DOCTOR,
  bookingDays,
  emptyPatient,
  slotShortLabel,
  telHref,
  trimSentence,
  validatePatient,
  type PatientField,
  type PatientInfo,
} from '../lib/booking'

/** 4 bước + màn thành công = 5 màn hình (NFR-02: đặt xong một lịch không quá 5 màn hình). */
const STEPS = [
  { label: 'Bác sĩ', title: 'Chọn chuyên khoa và bác sĩ', description: 'Chọn bác sĩ bạn muốn khám, hoặc để phòng khám xếp bác sĩ còn trống.' },
  { label: 'Ngày giờ', title: 'Chọn ngày giờ khám', description: 'Nhận đặt trước ít nhất 2 giờ, trong vòng 30 ngày tới.' },
  { label: 'Thông tin', title: 'Thông tin người khám', description: 'Điền đúng số điện thoại để phòng khám gọi xác nhận lịch.' },
  { label: 'Xác nhận', title: 'Xác nhận đặt lịch', description: 'Kiểm tra lại thông tin trước khi gửi.' },
] as const
const STEP_LABELS = STEPS.map((s) => s.label)
const LAST_STEP = STEPS.length - 1
const PATIENT_FIELDS: PatientField[] = ['fullName', 'phone', 'birthYear', 'gender', 'reason']

/**
 * Trang đặt lịch online cho bệnh nhân (SCR-05, UC-03, FR-11), tối ưu điện thoại 360–414 px:
 * chuyên khoa + bác sĩ → ngày giờ → thông tin → xác nhận → màn thành công có mã lịch hẹn.
 */
export function BookingPage() {
  // Đổi key để làm mới toàn bộ lựa chọn khi bấm "Đặt thêm lịch khác"
  const [round, setRound] = useState(0)
  return <BookingFlow key={round} onRestart={() => setRound((r) => r + 1)} />
}

function BookingFlow({ onRestart }: { onRestart: () => void }) {
  const catalog = usePublicCatalog()

  if (catalog.isPending) return <BookingSkeleton />
  if (catalog.error || !catalog.data)
    return <ErrorState error={catalog.error} title="Không tải được trang đặt lịch" onRetry={() => catalog.refetch()} />

  const { clinic, specialties } = catalog.data
  if (specialties.length === 0)
    return (
      <EmptyState
        icon={CalendarX2}
        title="Phòng khám chưa mở đặt lịch online"
        description="Vui lòng gọi phòng khám để được đặt lịch."
        action={
          clinic.hotline && (
            <Button asChild>
              <a href={telHref(clinic.hotline)}>
                <Phone aria-hidden="true" />
                Gọi {clinic.hotline}
              </a>
            </Button>
          )
        }
      />
    )

  return <BookingWizard catalog={catalog.data} onRestart={onRestart} />
}

type SubmitError = { message: string; phoneLimit: boolean }

function BookingWizard({ catalog, onRestart }: { catalog: PublicCatalogDto; onRestart: () => void }) {
  const today = vnToday()
  const hotline = catalog.clinic.hotline || null
  const book = usePublicBook()

  const [step, setStep] = useState(0)
  const [specialtyPick, setSpecialtyPick] = useState<string | null>(null)
  const [doctorChoice, setDoctorChoice] = useState<string | null>(null)
  const [date, setDate] = useState(today)
  const [slotAt, setSlotAt] = useState<string | null>(null)
  const [patient, setPatient] = useState<PatientInfo>(emptyPatient)
  const [errors, setErrors] = useState<Partial<Record<PatientField, string>>>({})
  const [slotNotice, setSlotNotice] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<SubmitError | null>(null)
  const [done, setDone] = useState<PublicAppointmentDto | null>(null)

  // Chỉ có một chuyên khoa thì chọn sẵn
  const specialtyId = specialtyPick ?? (catalog.specialties.length === 1 ? catalog.specialties[0].id : null)
  const specialty = catalog.specialties.find((s) => s.id === specialtyId) ?? null
  const doctor = doctorChoice && doctorChoice !== ANY_DOCTOR ? (catalog.doctors.find((d) => d.id === doctorChoice) ?? null) : null
  const doctorLabel = doctor?.displayName ?? (doctorChoice === ANY_DOCTOR ? 'Bác sĩ bất kỳ' : null)

  const slots = usePublicSlots(
    { specialtyId: specialtyId ?? '', doctorId: doctor?.id ?? null, date },
    step >= 1 && !!specialtyId && !!doctorChoice
  )
  // Dữ liệu giữ chỗ (của ngày hoặc bác sĩ trước) không được hiện như khung của lựa chọn mới
  const slotsLoading = slots.isPending || slots.isPlaceholderData
  const slotsData = slotsLoading ? undefined : slots.data
  const selectedSlot = slotsData?.slots.find((s) => s.startAt === slotAt && s.available) ?? null

  // Đổi bước: cuộn lên đầu, đưa con trỏ về tiêu đề bước cho trình đọc màn hình
  const headingRef = useRef<HTMLHeadingElement>(null)
  const shownStep = useRef(step)
  useEffect(() => {
    if (shownStep.current === step) return
    shownStep.current = step
    window.scrollTo({ top: 0 })
    headingRef.current?.focus({ preventScroll: true })
  }, [step])

  if (done) return <BookingSuccess result={done} onRestart={onRestart} />

  const pickSpecialty = (id: string) => {
    if (id === specialtyId) return
    setSpecialtyPick(id)
    setDoctorChoice(null)
    setSlotAt(null)
    setSlotNotice(null)
  }

  const pickDoctor = (choice: string) => {
    if (choice === doctorChoice) return
    setDoctorChoice(choice)
    setSlotAt(null)
    setSlotNotice(null)
  }

  const pickDate = (day: string) => {
    setDate(day)
    setSlotAt(null)
  }

  const pickSlot = (startAt: string) => {
    setSlotAt(startAt)
    setSlotNotice(null)
  }

  const changePatient = <K extends PatientField>(field: K, value: PatientInfo[K]) => {
    setPatient((p) => ({ ...p, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
    if (field === 'phone') setSubmitError(null)
  }

  const goNext = () => {
    if (step === 2) {
      const found = validatePatient(patient, Number(today.slice(0, 4)))
      setErrors(found)
      const first = PATIENT_FIELDS.find((f) => found[f])
      if (first) {
        document.getElementById(patientFieldId(first))?.focus()
        return
      }
    }
    setSubmitError(null)
    setStep(step + 1)
  }

  const handleBookError = (err: unknown) => {
    const code = problemCode(err)
    // UC-03 E3: khung vừa hết chỗ hoặc không còn hợp lệ → về bước chọn giờ, giữ nguyên thông tin đã nhập
    if (code === 'KhungHetCho' || code === 'KhungKhongHopLe') {
      setSlotNotice(
        code === 'KhungHetCho'
          ? 'Khung giờ vừa hết chỗ do có người đặt trước. Vui lòng chọn khung khác, thông tin bạn đã nhập vẫn được giữ.'
          : `${trimSentence(getErrorMessage(err))}. Vui lòng chọn khung khác.`
      )
      setSlotAt(null)
      setStep(1)
      void slots.refetch()
      return
    }
    // UC-03 E2, BR-03: số điện thoại đã có 2 lịch online sắp tới; câu của máy chủ có sẵn hotline (TC-11)
    if (code === 'QuaSoLichOnline') {
      setSubmitError({ message: getErrorMessage(err), phoneLimit: true })
      return
    }
    const fields = getFieldErrors(err)
    if (fields.specialtyId || fields.startAt) {
      setSlotNotice(fields.startAt ?? fields.specialtyId)
      setSlotAt(null)
      setStep(fields.specialtyId ? 0 : 1)
      return
    }
    const patientErrors = Object.fromEntries(PATIENT_FIELDS.filter((f) => fields[f]).map((f) => [f, fields[f]]))
    if (Object.keys(patientErrors).length > 0) {
      setErrors(patientErrors)
      setStep(2)
      return
    }
    setSubmitError({ message: getErrorMessage(err), phoneLimit: false })
  }

  const submit = () => {
    if (!specialtyId || !doctorChoice || !slotAt || !patient.gender) return
    setSubmitError(null)
    book.mutate(
      {
        specialtyId,
        doctorId: doctor?.id ?? null,
        startAt: slotAt,
        fullName: patient.fullName.trim().replace(/\s+/g, ' '),
        phone: digitsOnly(patient.phone),
        birthYear: Number(patient.birthYear),
        gender: patient.gender,
        reason: patient.reason.trim() || null,
      },
      { onSuccess: setDone, onError: handleBookError }
    )
  }

  const meta = STEPS[step]
  const canNext = step === 0 ? !!specialtyId && !!doctorChoice : step === 1 ? !!selectedSlot : true
  const shownSlot = step === 1 ? (selectedSlot?.startAt ?? null) : slotAt

  return (
    <div className="space-y-5">
      <BookingSteps steps={STEP_LABELS} current={step} />

      <header className="space-y-1">
        <h1 ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-balance outline-none">
          {meta.title}
        </h1>
        <p className="text-muted-foreground text-sm text-pretty">{meta.description}</p>
        {step === 0 && catalog.clinic.workingHours && (
          <p className="text-muted-foreground flex items-center gap-1.5 pt-1 text-xs">
            <Clock className="size-3.5 shrink-0" aria-hidden="true" />
            Giờ làm việc: {catalog.clinic.workingHours}
          </p>
        )}
      </header>

      {step === 0 && (
        <>
          <DoctorStep
            specialties={catalog.specialties}
            doctors={catalog.doctors}
            specialtyId={specialtyId}
            doctorChoice={doctorChoice}
            onSpecialty={pickSpecialty}
            onDoctor={pickDoctor}
          />
          <Link
            href={routePath.bookingLookup}
            className="text-primary flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium underline-offset-2 hover:underline"
          >
            <Search className="size-4" aria-hidden="true" />
            Đã đặt lịch? Tra cứu hoặc hủy lịch
          </Link>
        </>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <p className="bg-muted/60 flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
            <Stethoscope className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">
              <span className="font-medium">{doctorLabel}</span>
              {specialty && <span className="text-muted-foreground"> · {specialty.name}</span>}
            </span>
          </p>
          {slotNotice && (
            <p role="alert" className="bg-destructive/10 text-destructive flex gap-2 rounded-xl px-3.5 py-3 text-sm font-medium">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {slotNotice}
            </p>
          )}
          <DayChips days={bookingDays(today)} today={today} value={date} onChange={pickDate} />
          <SlotPicker
            data={slotsData}
            loading={slotsLoading}
            error={slots.isError ? slots.error : null}
            onRetry={() => slots.refetch()}
            value={slotAt}
            onChange={pickSlot}
            onPickDate={pickDate}
            hotline={hotline}
          />
        </div>
      )}

      {step === 2 && <PatientInfoForm value={patient} errors={errors} onChange={changePatient} />}

      {step === 3 && slotAt && specialty && (
        <div className="space-y-4">
          <BookingReview
            specialtyName={specialty.name}
            doctor={doctor}
            startAt={slotAt}
            patient={patient}
            onEdit={(s) => {
              setSubmitError(null)
              setStep(s)
            }}
          />
          {submitError && (
            <div role="alert" className="bg-destructive/10 text-destructive space-y-3 rounded-xl px-3.5 py-3 text-sm">
              <p className="flex gap-2 font-medium">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {submitError.message}
              </p>
              {submitError.phoneLimit && (
                <div className="flex flex-wrap gap-2 pl-6">
                  {hotline && (
                    <Button asChild size="sm" variant="outline">
                      <a href={telHref(hotline)}>
                        <Phone aria-hidden="true" />
                        Gọi {hotline}
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setStep(2)}>
                    Đổi số điện thoại
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Thanh dưới cố định: quay lại, tóm tắt lựa chọn, bước tiếp */}
      <div className="bg-card/95 fixed inset-x-0 bottom-0 z-20 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          {step > 0 && (
            <Button
              variant="outline"
              size="icon-lg"
              aria-label="Quay lại bước trước"
              onClick={() => setStep(step - 1)}
              disabled={book.isPending}
            >
              <ArrowLeft aria-hidden="true" />
            </Button>
          )}
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-medium">{doctorLabel ?? 'Chưa chọn bác sĩ'}</p>
            <p className="text-muted-foreground truncate text-xs tabular-nums">
              {shownSlot ? slotShortLabel(shownSlot) : (specialty?.name ?? 'Chưa chọn chuyên khoa')}
            </p>
          </div>
          {step < LAST_STEP ? (
            <Button size="lg" disabled={!canNext} onClick={goNext}>
              Tiếp tục
            </Button>
          ) : (
            <Button size="lg" variant="cta" disabled={book.isPending} aria-busy={book.isPending} onClick={submit}>
              {book.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <CalendarCheck aria-hidden="true" />}
              Đặt lịch
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function BookingSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Đang tải trang đặt lịch">
      <div className="flex gap-1.5">
        {STEPS.map((s) => (
          <Skeleton key={s.label} className="h-1.5 flex-1 rounded-full" />
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  )
}
