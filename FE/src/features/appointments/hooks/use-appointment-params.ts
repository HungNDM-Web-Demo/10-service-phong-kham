'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { vnToday } from '@/features/clinic/lib/vn-time'
import { isAppointmentStatus, isDateKey } from '../lib/appointment-ui'

export type AppointmentView = 'day' | 'week' | 'list' | 'pending'

type Patch = Record<string, string | null>

/**
 * Trạng thái màn hình Lịch hẹn trên URL (07 §6): `?date=` ngày đang xem, `?view=week|list`, `?status=ChoXacNhan` (tab Chờ xác nhận),
 * `?specialtyId=` lọc chuyên khoa, `?id=` lịch đang mở chi tiết. Đổi bằng router.replace để không chất lịch sử trình duyệt.
 */
export function useAppointmentParams() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const today = vnToday()

  const dateParam = params.get('date')
  const date = isDateKey(dateParam) ? dateParam : today
  const viewParam = params.get('view')
  const statusParam = params.get('status')
  const status = isAppointmentStatus(statusParam) ? statusParam : undefined
  const view: AppointmentView =
    viewParam === 'week'
      ? 'week'
      : viewParam === 'day'
        ? 'day'
        : viewParam === 'list' || status
          ? status === 'ChoXacNhan'
            ? 'pending'
            : 'list'
          : 'day'
  const specialtyId = params.get('specialtyId') || undefined
  const selectedId = params.get('id')

  const setQuery = useCallback(
    (patch: Patch) => {
      const next = new URLSearchParams(params.toString())
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === '') next.delete(key)
        else next.set(key, value)
      }
      if (next.get('date') === vnToday()) next.delete('date')
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [params, pathname, router]
  )

  const setView = useCallback(
    (v: AppointmentView) => {
      if (v === 'day') setQuery({ view: null, status: null })
      else if (v === 'week') setQuery({ view: 'week', status: null })
      else if (v === 'list') setQuery({ view: 'list', status: null })
      else setQuery({ view: null, status: 'ChoXacNhan' })
    },
    [setQuery]
  )

  return { today, date, view, status, specialtyId, selectedId, setQuery, setView }
}
