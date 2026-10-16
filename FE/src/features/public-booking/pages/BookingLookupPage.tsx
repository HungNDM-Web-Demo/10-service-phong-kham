'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, CalendarPlus, CalendarX2, Loader2, LockKeyhole, Phone, Search, SearchX } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { routePath } from '@/config/route-path'
import { getErrorMessage, getFieldErrors, isApiError } from '@/lib/api-error'
import type { AppointmentStatus, PublicAppointmentDto } from '@/types/clinic'
import { AppointmentStatusBadge } from '@/features/clinic/components/ClinicBadges'
import { usePublicCancel, usePublicCatalog, usePublicLookup } from '@/features/clinic/hooks/use-clinic'
import { problemCode } from '@/features/clinic/lib/problem'
import { digitsOnly } from '@/features/clinic/lib/rules'
import { phoneError } from '@/features/clinic/lib/validation'
import { vnHhmm, vnToday, yyMMdd } from '@/features/clinic/lib/vn-time'
import { useNow } from '@/features/queue-display/hooks/use-now'
import { AppointmentDetails } from '../components/AppointmentDetails'
import { fullDayLabel, telHref } from '../lib/booking'

const NOT_FOUND = 'Không tìm thấy lịch hẹn với mã và số điện thoại này'
const DEFAULT_LOCK_SECONDS = 600

const STATUS_HINTS: Record<AppointmentStatus, string> = {
  ChoXacNhan: 'Phòng khám sẽ gọi xác nhận trong giờ làm việc, vui lòng để ý điện thoại.',
  DaXacNhan: 'Lịch đã được xác nhận. Vui lòng có mặt trước giờ hẹn 10 phút.',
  DaDen: 'Bạn đã đến khám theo lịch này. Chúc bạn mau khỏe!',
  KhongDen: 'Lịch đã qua giờ hẹn mà chưa đến khám. Bạn có thể đặt lịch mới.',
  DaHuy: 'Lịch đã hủy. Bạn có thể đặt lịch mới bất cứ lúc nào.',
}

type Found = { appointment: PublicAppointmentDto; phone: string }
type FieldErrors = { code?: string; phone?: string }

const retryAfterOf = (error: unknown): number => {
  const value = isApiError(error) ? error.problem.retryAfterSeconds : undefined
  return typeof value === 'number' && value > 0 ? value : DEFAULT_LOCK_SECONDS
}

const isLockError = (error: unknown) => problemCode(error) === 'TamKhoaTraCuu' || (isApiError(error) && error.status === 429)

const mmss = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

/**
 * Tra cứu, tự hủy lịch hẹn online (SCR-05, UC-16, FR-13): nhập mã lịch hẹn + số điện thoại; `?code=` điền sẵn mã.
 * Sai 5 lần trong 10 phút thì máy chủ tạm khóa (429 TamKhoaTraCuu) và trang đếm ngược tới lúc được thử lại.
 */
export function BookingLookupPage() {
  const params = useSearchParams()
  const lookup = usePublicLookup()
  const cancel = usePublicCancel()
  const hotline = usePublicCatalog().data?.clinic.hotline || null
  const now = useNow()

  const [code, setCode] = useState(() => (params.get('code') ?? '').trim().toUpperCase())
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [notFound, setNotFound] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [found, setFound] = useState<Found | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const lockLeft = lockedUntil && now ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0
  const locked = lockLeft > 0
  const sampleCode = `LH${yyMMdd(vnToday())}0012`

  const lockFor = (error: unknown) => {
    setLockedUntil(Date.now() + retryAfterOf(error) * 1000)
    setNotFound(false)
    setNotice(null)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (locked || lookup.isPending) return
    const next: FieldErrors = {}
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) next.code = 'Nhập mã lịch hẹn'
    else if (trimmed.length < 6) next.code = `Mã lịch hẹn chưa đủ, vd ${sampleCode}`
    const phoneMsg = phoneError(phone)
    if (phoneMsg) next.phone = phoneMsg
    setErrors(next)
    if (next.code || next.phone) {
      document.getElementById(next.code ? 'lookup-code' : 'lookup-phone')?.focus()
      return
    }

    const digits = digitsOnly(phone)
    setNotFound(false)
    setNotice(null)
    setCancelError(null)
    lookup.mutate(
      { code: trimmed, phone: digits },
      {
        onSuccess: (appointment) => setFound({ appointment, phone: digits }),
        onError: (err) => {
          setFound(null)
          if (isLockError(err)) return lockFor(err)
          if (isApiError(err) && err.status === 404) return setNotFound(true)
          const fields = getFieldErrors(err)
          if (fields.code || fields.phone) return setErrors({ code: fields.code, phone: fields.phone })
          setNotice(getErrorMessage(err))
        },
      }
    )
  }

  const confirmCancel = async () => {
    if (!found) return
    setCancelError(null)
    try {
      const updated = await cancel.mutateAsync({ code: found.appointment.code, phone: found.phone })
      setFound({ ...found, appointment: updated })
      toast.success(`Đã hủy lịch hẹn ${updated.code}`)
    } catch (err) {
      if (isLockError(err)) {
        setFound(null)
        lockFor(err)
      } else setCancelError(getErrorMessage(err))
    }
  }

  const a = found?.appointment
  const active = a?.status === 'ChoXacNhan' || a?.status === 'DaXacNhan'

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1">
        <Button asChild variant="ghost" size="icon" className="-ml-2">
          <Link href={routePath.booking} aria-label="Về trang đặt lịch">
            <ArrowLeft aria-hidden="true" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Tra cứu lịch hẹn</h1>
      </div>
      <p className="text-muted-foreground -mt-2 text-sm text-pretty">Nhập mã lịch hẹn và số điện thoại đã dùng khi đặt để xem hoặc hủy lịch.</p>

      <form noValidate onSubmit={submit} className="bg-card space-y-4 rounded-xl border p-4" aria-label="Tra cứu lịch hẹn">
        <FormField label="Mã lịch hẹn" required htmlFor="lookup-code" error={errors.code} hint={`Có ở màn hình đặt thành công, vd ${sampleCode}`}>
          <Input
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={20}
            className="uppercase tabular-nums"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\s/g, '').toUpperCase())
              if (errors.code) setErrors((x) => ({ ...x, code: undefined }))
            }}
          />
        </FormField>
        <FormField label="Số điện thoại đã đặt" required htmlFor="lookup-phone" error={errors.phone}>
          <Input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={13}
            placeholder="Vd 0912 345 678"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value.replace(/[^\d\s]/g, ''))
              if (errors.phone) setErrors((x) => ({ ...x, phone: undefined }))
            }}
          />
        </FormField>

        {locked && (
          <div className="bg-warning/10 text-warning space-y-1 rounded-lg px-3.5 py-3 text-sm">
            <p role="alert" className="flex gap-2 font-medium">
              <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Bạn đã nhập sai nhiều lần nên tra cứu tạm khóa để bảo vệ thông tin.
            </p>
            <p className="pl-6">
              Vui lòng thử lại sau <span className="font-semibold tabular-nums">{mmss(lockLeft)}</span>
              {hotline ? (
                <>
                  {' '}
                  hoặc gọi{' '}
                  <a href={telHref(hotline)} className="font-semibold underline underline-offset-2">
                    {hotline}
                  </a>{' '}
                  nếu cần gấp
                </>
              ) : null}
              .
            </p>
          </div>
        )}
        {notFound && !locked && (
          <div role="alert" className="bg-destructive/10 text-destructive flex gap-2 rounded-lg px-3.5 py-3 text-sm">
            <SearchX className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-medium">{NOT_FOUND}.</span> Kiểm tra lại mã trong màn hình đặt thành công và số điện thoại đã dùng khi đặt.
            </span>
          </div>
        )}
        {notice && !locked && (
          <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-3.5 py-3 text-sm font-medium">
            {notice}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={locked || lookup.isPending} aria-busy={lookup.isPending}>
          {lookup.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Search aria-hidden="true" />}
          {locked ? `Thử lại sau ${mmss(lockLeft)}` : 'Tra cứu'}
        </Button>
      </form>

      {a && (
        <section aria-labelledby="lookup-result-title" className="bg-card space-y-4 rounded-xl border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Mã lịch hẹn</p>
              <h2 id="lookup-result-title" className="text-lg font-semibold tracking-wide tabular-nums">
                {a.code}
              </h2>
            </div>
            <AppointmentStatusBadge status={a.status} className="mt-1 shrink-0" />
          </div>
          <p className="bg-muted/60 rounded-lg px-3 py-2 text-sm text-pretty">{STATUS_HINTS[a.status]}</p>

          <AppointmentDetails appointment={a} />

          {cancelError && (
            <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-3.5 py-3 text-sm font-medium">
              {cancelError}
            </p>
          )}

          {a.canCancel ? (
            <Button variant="destructive" size="lg" className="w-full" onClick={() => setConfirmOpen(true)}>
              <CalendarX2 aria-hidden="true" />
              Hủy lịch hẹn
            </Button>
          ) : active ? (
            <p className="bg-warning/10 text-warning rounded-lg px-3.5 py-3 text-sm text-pretty">
              Lịch còn dưới 2 giờ nữa nên không tự hủy được. Nếu không đến được, vui lòng gọi{' '}
              <a href={telHref(a.hotline)} className="inline-flex items-center gap-1 font-semibold underline underline-offset-2">
                <Phone className="size-3.5" aria-hidden="true" />
                {a.hotline}
              </a>
              .
            </p>
          ) : (
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href={routePath.booking}>
                <CalendarPlus aria-hidden="true" />
                Đặt lịch mới
              </Link>
            </Button>
          )}
        </section>
      )}

      {!a && (
        <Link
          href={routePath.booking}
          className="text-primary flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium underline-offset-2 hover:underline"
        >
          <CalendarPlus className="size-4" aria-hidden="true" />
          Chưa có lịch? Đặt lịch khám
        </Link>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Hủy lịch hẹn ${a?.code ?? ''}?`}
        description={
          a ? (
            <>
              Lịch lúc {vnHhmm(a.startAt)}, {fullDayLabel(a.date)} với {a.doctorName} sẽ bị hủy và nhường chỗ cho người khác. Bạn không thể hoàn tác thao
              tác này.
            </>
          ) : undefined
        }
        variant="destructive"
        icon={CalendarX2}
        confirmText="Hủy lịch"
        cancelText="Giữ lịch"
        loading={cancel.isPending}
        onConfirm={confirmCancel}
      />
    </div>
  )
}
