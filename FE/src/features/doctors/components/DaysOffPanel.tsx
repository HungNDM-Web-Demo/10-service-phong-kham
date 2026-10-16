'use client'

import { useId, useState } from 'react'
import { CalendarOff, CalendarX2, Info, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { FormField } from '@/components/shared/FormField'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { getErrorMessage, getFieldErrors } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import type { DayOffDto, DayOffPart, DayOffResult, DoctorDto } from '@/types/clinic'
import { useCreateDayOff, useDaysOff, useDeleteDayOff } from '@/features/clinic/hooks/use-clinic'
import { dayOffPartLabels } from '@/features/clinic/lib/labels'
import { clinicRules } from '@/features/clinic/lib/rules'
import { addDaysKey, ddmmyyyy, isoWeekdayOf, parseHhmm, vnToday, weekdayLabel } from '@/features/clinic/lib/vn-time'
import { AffectedAppointments } from './AffectedAppointments'

const PARTS: { value: DayOffPart; label: string }[] = [
  { value: 'CaNgay', label: 'Cả ngày' },
  { value: 'Sang', label: 'Sáng' },
  { value: 'Chieu', label: 'Chiều' },
]
const REASONS = ['Nghỉ phép', 'Nghỉ ốm', 'Dự hội thảo', 'Tập huấn', 'Việc gia đình']
const dateRe = /^\d{4}-\d{2}-\d{2}$/

type Errors = Record<string, string>

const dayText = (date: string) => `${weekdayLabel(isoWeekdayOf(date))}, ${ddmmyyyy(date)}`

/**
 * Tab Ngày nghỉ (UC-02 1a; FR-07, BR-01; TC-07): danh sách ngày nghỉ đột xuất của bác sĩ và form thêm (ngày từ hôm nay,
 * cả ngày hoặc buổi, lý do). Thêm xong hiện các lịch hẹn rơi vào phần nghỉ để lễ tân xử lý.
 */
export function DaysOffPanel({ doctor, canEdit }: { doctor: DoctorDto; canEdit: boolean }) {
  const formId = useId()
  const today = vnToday()
  const daysOff = useDaysOff({ doctorId: doctor.id })
  const create = useCreateDayOff()
  const remove = useDeleteDayOff()

  const [date, setDate] = useState(() => addDaysKey(vnToday(), 1))
  const [part, setPart] = useState<DayOffPart>('CaNgay')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [result, setResult] = useState<DayOffResult | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DayOffDto | null>(null)

  const list = daysOff.data ?? []
  const upcoming = list.filter((o) => o.date >= today)
  const past = list.filter((o) => o.date < today).reverse()
  const validDate = dateRe.test(date)
  const weekday = validDate ? isoWeekdayOf(date) : null
  const dayHours = weekday ? doctor.hours.filter((h) => h.dayOfWeek === weekday) : []
  const noon = clinicRules.noonMinute
  const worksInPart =
    part === 'CaNgay'
      ? dayHours.length > 0
      : dayHours.some((h) => (part === 'Sang' ? parseHhmm(h.startTime) < noon : parseHhmm(h.endTime) > noon))

  const clear = (key: string) =>
    setErrors((e) => {
      if (!(key in e)) return e
      const next = { ...e }
      delete next[key]
      return next
    })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const found: Errors = {}
    if (!validDate) found.date = 'Chọn ngày nghỉ'
    else if (date < today) found.date = 'Ngày nghỉ phải từ hôm nay trở đi'
    else if (list.some((o) => o.date === date)) found.date = `Bác sĩ đã có ngày nghỉ ${ddmmyyyy(date)}`
    if (!reason.trim()) found.reason = 'Nhập lý do nghỉ'
    setErrors(found)
    if (Object.keys(found).length) return

    create.mutate(
      { doctorId: doctor.id, date, part, reason: reason.trim() },
      {
        onSuccess: (saved) => {
          setReason('')
          if (saved.affected.length > 0) {
            setResult(saved)
            toast.warning(`Đã thêm ngày nghỉ ${ddmmyyyy(saved.dayOff.date)}`, {
              description: `${saved.affected.length} lịch hẹn cần đổi giờ hoặc hủy.`,
              duration: 8000,
            })
          } else {
            setResult(null)
            toast.success(`Đã thêm ngày nghỉ ${ddmmyyyy(saved.dayOff.date)}`, { description: 'Không có lịch hẹn nào rơi vào buổi nghỉ.' })
          }
        },
        onError: (err) => {
          const fields = getFieldErrors(err)
          if (Object.keys(fields).length) setErrors(fields)
          else toast.error(getErrorMessage(err))
        },
      }
    )
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove.mutateAsync(deleteTarget.id)
      if (result?.dayOff.id === deleteTarget.id) setResult(null)
      toast.success(`Đã xóa ngày nghỉ ${ddmmyyyy(deleteTarget.date)}`, { description: 'Bác sĩ có lại khung giờ của ngày này.' })
    } catch (err) {
      toast.error(getErrorMessage(err))
      throw err
    }
  }

  const saving = create.isPending

  return (
    <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
      {canEdit && (
        <form onSubmit={submit} noValidate className="space-y-4 rounded-lg border p-4" aria-labelledby={`${formId}-title`}>
          <h3 id={`${formId}-title`} className="font-semibold">
            Thêm ngày nghỉ đột xuất
          </h3>
          <div className="grid gap-4 sm:grid-cols-[11rem_1fr]">
            <FormField label="Ngày nghỉ" required error={errors.date} hint={validDate ? dayText(date) : undefined}>
              <Input
                type="date"
                min={today}
                value={date}
                disabled={saving}
                onChange={(e) => {
                  setDate(e.target.value)
                  clear('date')
                }}
              />
            </FormField>
            <div className="grid content-start gap-1.5">
              <Label id={`${formId}-part`}>
                Buổi nghỉ
                <span className="text-destructive" aria-hidden="true">
                  *
                </span>
              </Label>
              <ToggleGroup
                type="single"
                variant="outline"
                spacing={0}
                value={part}
                disabled={saving}
                aria-labelledby={`${formId}-part`}
                onValueChange={(v) => v && setPart(v as DayOffPart)}
              >
                {PARTS.map((p) => (
                  <ToggleGroupItem
                    key={p.value}
                    value={p.value}
                    className="data-[state=on]:bg-primary/10 data-[state=on]:text-primary h-10 px-4"
                  >
                    {p.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <p className="text-muted-foreground text-[0.8125rem]">Sáng là các khung trước 12:00, chiều từ 12:00</p>
            </div>
          </div>

          {validDate && weekday && !worksInPart && (
            <p className="bg-muted text-muted-foreground flex items-start gap-2 rounded-lg px-3 py-2 text-sm" role="note">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {doctor.displayName} không có lịch làm việc {part === 'CaNgay' ? '' : `buổi ${part === 'Sang' ? 'sáng' : 'chiều'} `}
              {weekdayLabel(weekday)}, nên ngày này vốn không có khung giờ.
            </p>
          )}

          <FormField label="Lý do" required error={errors.reason}>
            <Input
              autoComplete="off"
              maxLength={200}
              value={reason}
              placeholder="vd: Dự hội thảo nha khoa"
              disabled={saving}
              onChange={(e) => {
                setReason(e.target.value)
                clear('reason')
              }}
            />
          </FormField>
          <div className="-mt-2 flex flex-wrap gap-1.5">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                disabled={saving}
                onClick={() => {
                  setReason(r)
                  clear('reason')
                }}
                className="text-muted-foreground hover:border-primary hover:text-foreground focus-visible:ring-ring/50 cursor-pointer rounded-full border px-2.5 py-0.5 text-xs outline-none focus-visible:ring-3 disabled:opacity-50"
              >
                {r}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground text-sm">Lịch hẹn đã có trong buổi nghỉ không tự hủy; danh sách hiện ngay sau khi lưu.</p>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
              Thêm ngày nghỉ
            </Button>
          </div>
        </form>
      )}

      {result && <AffectedAppointments dayOff={result.dayOff} items={result.affected} onDismiss={() => setResult(null)} />}

      <section aria-labelledby={`${formId}-upcoming`} className="space-y-2">
        <h3 id={`${formId}-upcoming`} className="font-semibold">
          Ngày nghỉ sắp tới
          {daysOff.data && <span className="text-muted-foreground ml-1 font-normal tabular-nums">({upcoming.length})</span>}
        </h3>
        {daysOff.error ? (
          <div className="rounded-lg border">
            <ErrorState error={daysOff.error} onRetry={() => void daysOff.refetch()} />
          </div>
        ) : daysOff.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="rounded-lg border">
            <EmptyState
              compact
              icon={CalendarOff}
              title="Chưa có ngày nghỉ sắp tới"
              description={canEdit ? 'Bác sĩ xin nghỉ thì thêm ở form phía trên để khóa khung giờ ngày đó.' : undefined}
            />
          </div>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((o) => (
              <DayOffItem key={o.id} dayOff={o} canDelete={canEdit} onDelete={() => setDeleteTarget(o)} />
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section aria-labelledby={`${formId}-past`} className="space-y-2">
          <h3 id={`${formId}-past`} className="text-muted-foreground text-sm font-semibold">
            Đã qua (30 ngày gần đây)
          </h3>
          <ul className="space-y-2">
            {past.map((o) => (
              <DayOffItem key={o.id} dayOff={o} past />
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        variant="destructive"
        icon={CalendarX2}
        title={`Xóa ngày nghỉ ${deleteTarget ? ddmmyyyy(deleteTarget.date) : ''}?`}
        description="Bác sĩ có lại khung giờ của ngày này trên lịch hẹn và trang đặt lịch. Lịch hẹn đã hủy trước đó không tự khôi phục."
        confirmText="Xóa ngày nghỉ"
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

function DayOffItem({ dayOff, past, canDelete, onDelete }: { dayOff: DayOffDto; past?: boolean; canDelete?: boolean; onDelete?: () => void }) {
  return (
    <li className={cn('flex items-center gap-3 rounded-lg border px-3 py-2.5', past && 'bg-muted/40 text-muted-foreground')}>
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          past ? 'bg-muted' : dayOff.part === 'CaNgay' ? 'bg-warning/12 text-warning' : 'bg-info/10 text-info'
        )}
      >
        <CalendarOff className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('font-medium', !past && 'text-foreground')}>{dayText(dayOff.date)}</p>
        <p className="text-muted-foreground truncate text-xs" title={dayOff.reason}>
          {dayOff.reason}
        </p>
      </div>
      <StatusBadge tone={past ? 'neutral' : dayOff.part === 'CaNgay' ? 'warning' : 'info'}>{dayOffPartLabels[dayOff.part]}</StatusBadge>
      {canDelete && onDelete && (
        <Button variant="ghost" size="icon-sm" aria-label={`Xóa ngày nghỉ ${ddmmyyyy(dayOff.date)}`} onClick={onDelete}>
          <Trash2 />
        </Button>
      )}
    </li>
  )
}
