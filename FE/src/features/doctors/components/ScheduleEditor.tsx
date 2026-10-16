'use client'

import { useId, useState } from 'react'
import { Copy, Info, Loader2, Plus, RotateCcw, Save, TriangleAlert, X } from 'lucide-react'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getErrorMessage, getFieldErrors } from '@/lib/api-error'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DoctorDto, SpecialtyDto } from '@/types/clinic'
import { useSaveSchedule } from '@/features/clinic/hooks/use-clinic'
import { clinicRules } from '@/features/clinic/lib/rules'
import { hasErrors, validateSchedule } from '@/features/clinic/lib/validation'
import { hhmm, weekdayLabel, weekdayShort } from '@/features/clinic/lib/vn-time'
import {
  dayMinutes,
  daySlots,
  isTime,
  nextRange,
  normalizeTime,
  orderedRows,
  rangeOf,
  remainderOf,
  scheduleSignature,
  slotCountOf,
  splitErrors,
  toInput,
  WEEK,
  type RangeRow,
  type RowErrors,
} from '../lib/schedule'

let keySeq = 0
const newKey = () => `new-${++keySeq}`

const rowsOf = (doctor: DoctorDto): RangeRow[] => doctor.hours.map((h, i) => ({ ...h, key: `${doctor.id}-${i}` }))

const COPY_TARGETS: { label: string; days: number[] }[] = [
  { label: 'Thứ Hai – Thứ Sáu', days: [1, 2, 3, 4, 5] },
  { label: 'Thứ Hai – Thứ Bảy', days: [1, 2, 3, 4, 5, 6] },
  { label: 'Cả tuần', days: [1, 2, 3, 4, 5, 6, 7] },
]

type ServerErrors = { general: Record<string, string>; rows: Record<string, RowErrors> }

const hoursText = (minutes: number) => `${formatNumber(minutes / 60, 1)} giờ`

/**
 * Tab Lịch làm việc (UC-02 bước 3–6, E1, E2; FR-07, BR-01): mỗi thứ thêm, xóa các khoảng HH:mm–HH:mm, chọn độ dài khung
 * 15/20/30 phút và số lịch tối đa mỗi khung (1–10). Xem trước số khung mỗi ngày bằng `slotsOf`, báo phần lẻ cuối khoảng
 * không thành khung, kiểm tra chồng giờ bằng `validateSchedule` và báo lỗi tại từng dòng.
 */
export function ScheduleEditor({ doctor, specialties, canEdit }: { doctor: DoctorDto; specialties: SpecialtyDto[]; canEdit: boolean }) {
  const formId = useId()
  const save = useSaveSchedule()
  const [slotMinutes, setSlotMinutes] = useState(doctor.slotMinutes)
  const [maxPerSlot, setMaxPerSlot] = useState(String(doctor.maxPerSlot))
  const [rows, setRows] = useState<RangeRow[]>(() => rowsOf(doctor))
  const [submitted, setSubmitted] = useState(false)
  const [serverErrors, setServerErrors] = useState<ServerErrors | null>(null)

  const saving = save.isPending
  const disabled = saving || !canEdit
  const specialty = specialties.find((s) => s.id === doctor.specialtyId)
  // Chỉ nhận số nguyên; "1.5" hay ô trống thành NaN để validateSchedule báo lỗi tại ô
  const maxValue = /^\d{1,2}$/.test(maxPerSlot.trim()) ? Number(maxPerSlot) : NaN

  const ordered = orderedRows(rows)
  const input = toInput(slotMinutes, maxValue, ordered)
  const live = splitErrors(validateSchedule(input), ordered)
  const general = { ...live.general, ...serverErrors?.general }
  const rowErrors = (row: RangeRow): RowErrors | undefined =>
    serverErrors?.rows[row.key] ?? (submitted || (isTime(row.startTime) && isTime(row.endTime)) ? live.rows[row.key] : undefined)

  const dirty =
    scheduleSignature(slotMinutes, Number.isFinite(maxValue) ? maxValue : maxPerSlot, rows) !==
    scheduleSignature(doctor.slotMinutes, doctor.maxPerSlot, doctor.hours)

  const days = WEEK.map((day) => {
    const list = ordered.filter((r) => r.dayOfWeek === day)
    return { day, rows: list, slots: daySlots(list, slotMinutes).length, minutes: dayMinutes(list) }
  })
  const weekSlots = days.reduce((s, d) => s + d.slots, 0)
  const weekMinutes = days.reduce((s, d) => s + d.minutes, 0)
  const workDays = days.filter((d) => d.slots > 0).length

  const edit = (next: RangeRow[] | ((prev: RangeRow[]) => RangeRow[])) => {
    setRows(next)
    setServerErrors(null)
  }

  const addRange = (day: number) => {
    const row: RangeRow = { key: newKey(), dayOfWeek: day, ...nextRange(rows.filter((r) => r.dayOfWeek === day)) }
    edit((prev) => [...prev, row])
  }

  const removeRange = (key: string) => edit((prev) => prev.filter((r) => r.key !== key))

  const setTime = (key: string, field: 'startTime' | 'endTime', value: string) =>
    edit((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)))

  /** Thay lịch các ngày đích bằng bản sao lịch ngày nguồn */
  const copyDay = (source: number, targets: number[]) => {
    const src = rows.filter((r) => r.dayOfWeek === source)
    const copies = targets.filter((d) => d !== source).flatMap((d) => src.map((r) => ({ ...r, key: newKey(), dayOfWeek: d })))
    edit([...rows.filter((r) => r.dayOfWeek === source || !targets.includes(r.dayOfWeek)), ...copies])
    toast.success(`Đã chép lịch ${weekdayLabel(source)}`, { description: 'Bấm "Lưu lịch làm việc" để áp dụng.' })
  }

  const reset = () => {
    setSlotMinutes(doctor.slotMinutes)
    setMaxPerSlot(String(doctor.maxPerSlot))
    setRows(rowsOf(doctor))
    setSubmitted(false)
    setServerErrors(null)
  }

  const submit = () => {
    setSubmitted(true)
    setServerErrors(null)
    const found = validateSchedule(input)
    if (hasErrors(found)) {
      toast.error('Lịch làm việc chưa hợp lệ', { description: Object.values(found)[0] })
      return
    }
    save.mutate(
      { id: doctor.id, input },
      {
        onSuccess: (saved) => {
          setSubmitted(false)
          toast.success(`Đã lưu lịch làm việc của ${saved.displayName}`, {
            description: `${saved.slotsPerDay.reduce((s, n) => s + n, 0)} khung mỗi tuần, khung ${saved.slotMinutes} phút.`,
          })
        },
        onError: (err) => {
          // Chồng giờ, giờ sai… máy chủ trả lỗi theo trường `hours[i].startTime` (UC-02 E1)
          const fields = getFieldErrors(err)
          if (Object.keys(fields).length) setServerErrors(splitErrors(fields, ordered))
          toast.error(getErrorMessage(err))
        },
      }
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Độ dài khung" required htmlFor={`${formId}-slot`} error={general.slotMinutes} hint="Mặc định 30 phút (BR-01)">
            <Select
              value={String(slotMinutes)}
              disabled={disabled}
              onValueChange={(v) => {
                setSlotMinutes(Number(v))
                setServerErrors(null)
              }}
            >
              <SelectTrigger id={`${formId}-slot`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {clinicRules.slotLengths.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} phút
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Số lịch tối đa mỗi khung"
            required
            error={general.maxPerSlot}
            hint={specialty ? `Từ 1 đến 10; mặc định ${specialty.name}: ${specialty.defaultMaxPerSlot}` : 'Từ 1 đến 10'}
          >
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={10}
              step={1}
              value={maxPerSlot}
              disabled={disabled}
              className="tabular-nums"
              onChange={(e) => {
                setMaxPerSlot(e.target.value)
                setServerErrors(null)
              }}
            />
          </FormField>
        </div>

        <section aria-labelledby={`${formId}-preview`} className="bg-primary/5 border-primary/15 rounded-lg border px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 id={`${formId}-preview`} className="text-sm font-semibold">
              Xem trước
            </h3>
            <p className="text-muted-foreground text-sm tabular-nums" aria-live="polite">
              <b className="text-foreground">{weekSlots}</b> khung/tuần · {hoursText(weekMinutes)} · {workDays} ngày làm
              {Number.isFinite(maxValue) && maxValue > 0 && <> · tối đa {formatNumber(weekSlots * maxValue)} lịch hẹn</>}
            </p>
          </div>
          <ul className="mt-2 grid grid-cols-7 gap-1.5">
            {days.map((d) => (
              <li
                key={d.day}
                className={cn('bg-background rounded-md border py-1.5 text-center', d.slots === 0 && 'text-muted-foreground')}
                aria-label={`${weekdayLabel(d.day)}: ${d.slots ? `${d.slots} khung` : 'nghỉ'}`}
              >
                <span className="block text-xs">{weekdayShort(d.day)}</span>
                <span className="font-semibold tabular-nums">{d.slots || '—'}</span>
              </li>
            ))}
          </ul>
        </section>

        <ul className="divide-y rounded-lg border">
          {days.map((d) => (
            <li key={d.day} className="grid gap-2 px-4 py-3 sm:grid-cols-[7.5rem_1fr]">
              <div>
                <p className="font-medium">{weekdayLabel(d.day)}</p>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {d.slots > 0 ? `${d.slots} khung · ${hoursText(d.minutes)}` : d.rows.length > 0 ? 'Chưa có khung' : 'Nghỉ'}
                </p>
              </div>
              <div className="space-y-2">
                {d.rows.map((row, index) => (
                  <RangeEditor
                    key={row.key}
                    row={row}
                    label={`khoảng ${index + 1} ${weekdayLabel(d.day)}`}
                    slotMinutes={slotMinutes}
                    errors={rowErrors(row)}
                    disabled={disabled}
                    canEdit={canEdit}
                    onChange={(field, value) => setTime(row.key, field, value)}
                    onRemove={() => removeRange(row.key)}
                  />
                ))}
                {d.rows.length === 0 && !canEdit && <p className="text-muted-foreground text-sm">Không làm việc</p>}
                {canEdit && (
                  <div className="flex flex-wrap items-center gap-1">
                    <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => addRange(d.day)}>
                      <Plus aria-hidden="true" />
                      Thêm khoảng
                    </Button>
                    {d.rows.length > 0 && (
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="sm" disabled={disabled}>
                            <Copy aria-hidden="true" />
                            Chép sang
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                          <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                            Thay lịch các ngày bằng lịch {weekdayLabel(d.day)}
                          </DropdownMenuLabel>
                          {COPY_TARGETS.map((t) => (
                            <DropdownMenuItem key={t.label} className="h-9" onSelect={() => copyDay(d.day, t.days)}>
                              {t.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>

        <p className="text-muted-foreground flex items-start gap-2 text-sm">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Khung giờ trên lịch hẹn và trang đặt lịch sinh theo lịch mới. Lịch hẹn đã đặt giữ nguyên, kể cả khi rơi ra ngoài giờ làm.
        </p>
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t px-6 py-4">
          {dirty && <span className="text-muted-foreground mr-auto text-sm">Có thay đổi chưa lưu</span>}
          <Button type="button" variant="outline" disabled={!dirty || saving} onClick={reset}>
            <RotateCcw aria-hidden="true" />
            Hoàn tác
          </Button>
          <Button type="button" disabled={!dirty || saving} onClick={submit}>
            {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
            Lưu lịch làm việc
          </Button>
        </div>
      )}
    </div>
  )
}

function RangeEditor({
  row,
  label,
  slotMinutes,
  errors,
  disabled,
  canEdit,
  onChange,
  onRemove,
}: {
  row: RangeRow
  label: string
  slotMinutes: number
  errors: RowErrors | undefined
  disabled: boolean
  canEdit: boolean
  onChange: (field: 'startTime' | 'endTime', value: string) => void
  onRemove: () => void
}) {
  const range = rangeOf(row)
  const remainder = range ? remainderOf(range, slotMinutes) : 0
  const count = range ? slotCountOf(range, slotMinutes) : 0

  const timeInput = (field: 'startTime' | 'endTime', text: string) => (
    <Input
      value={row[field]}
      inputMode="numeric"
      autoComplete="off"
      maxLength={5}
      placeholder={field === 'startTime' ? '08:00' : '12:00'}
      disabled={disabled}
      aria-label={`${text} ${label}`}
      aria-invalid={errors?.[field] ? true : undefined}
      className="w-[4.75rem] text-center tabular-nums"
      onChange={(e) => onChange(field, e.target.value.replace(/[^\dhH:.]/g, ''))}
      onBlur={(e) => {
        const value = normalizeTime(e.target.value)
        if (value !== row[field]) onChange(field, value)
      }}
    />
  )

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        {timeInput('startTime', 'Giờ bắt đầu')}
        <span className="text-muted-foreground" aria-hidden="true">
          –
        </span>
        {timeInput('endTime', 'Giờ kết thúc')}
        <span className={cn('text-sm tabular-nums', range ? 'text-muted-foreground' : 'text-muted-foreground/60')}>
          {range ? `${count} khung` : '— khung'}
        </span>
        {canEdit && (
          <Button type="button" variant="ghost" size="icon-sm" disabled={disabled} aria-label={`Xóa ${label}`} onClick={onRemove}>
            <X />
          </Button>
        )}
      </div>
      {range && remainder > 0 && (
        <p className="text-warning flex items-start gap-1 text-xs">
          <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          Phần lẻ cuối khoảng không thành khung: {hhmm(range[1] - remainder)}–{row.endTime} ({remainder} phút), chỉ có {count} khung.
        </p>
      )}
      {errors?.startTime && (
        <p role="alert" className="text-destructive text-xs">
          {errors.startTime}
        </p>
      )}
      {errors?.endTime && errors.endTime !== errors.startTime && (
        <p role="alert" className="text-destructive text-xs">
          {errors.endTime}
        </p>
      )}
    </div>
  )
}
