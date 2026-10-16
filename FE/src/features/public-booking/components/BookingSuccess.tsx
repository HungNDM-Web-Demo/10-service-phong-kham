'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { CircleCheckBig, Clock, Copy, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { routePath } from '@/config/route-path'
import type { PublicAppointmentDto } from '@/types/clinic'
import { AppointmentStatusBadge } from '@/features/clinic/components/ClinicBadges'
import { AppointmentDetails } from './AppointmentDetails'

/**
 * Màn đặt lịch thành công (UC-03 bước 7, TC-08): mã lịch hẹn, giờ, bác sĩ (bác sĩ được xếp nếu chọn "Bác sĩ bất kỳ", UC-03 3a),
 * phòng, địa chỉ, trạng thái "Chờ xác nhận" (BR-05), nút sang trang tra cứu.
 */
export function BookingSuccess({ result, onRestart }: { result: PublicAppointmentDto; onRestart: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    window.scrollTo({ top: 0 })
    headingRef.current?.focus()
  }, [])

  const copyCode = () => {
    if (!navigator.clipboard) {
      toast.error('Không sao chép được, vui lòng ghi lại mã lịch hẹn')
      return
    }
    navigator.clipboard.writeText(result.code).then(
      () => toast.success('Đã sao chép mã lịch hẹn'),
      () => toast.error('Không sao chép được, vui lòng ghi lại mã lịch hẹn')
    )
  }

  return (
    <div className="space-y-5 pt-2">
      <div className="space-y-2 text-center">
        <span className="bg-success/12 text-success mx-auto flex size-16 items-center justify-center rounded-full">
          <CircleCheckBig className="size-8" aria-hidden="true" />
        </span>
        <h1 ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">
          Đặt lịch thành công
        </h1>
        <p className="text-muted-foreground text-sm">Cảm ơn bạn đã tin chọn {result.clinicName}.</p>
      </div>

      <section aria-label="Thông tin lịch hẹn" className="bg-card space-y-4 rounded-xl border p-4">
        <div className="space-y-1 border-b pb-4 text-center">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Mã lịch hẹn</p>
          <p className="text-3xl font-bold tracking-wider tabular-nums">{result.code}</p>
          <Button variant="ghost" size="sm" onClick={copyCode}>
            <Copy aria-hidden="true" />
            Sao chép mã
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Trạng thái</span>
          <AppointmentStatusBadge status={result.status} />
        </div>
        <AppointmentDetails appointment={result} />
      </section>

      <p className="bg-warning/10 text-warning flex gap-2 rounded-xl px-3.5 py-3 text-sm">
        <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          <b>Chờ phòng khám xác nhận.</b> Phòng khám sẽ gọi số {result.phoneMasked} trong giờ làm việc. Khi đến, vui lòng có mặt trước 10 phút
          và đọc mã lịch hẹn cho lễ tân.
        </span>
      </p>

      <div className="flex flex-col gap-2">
        <Button asChild size="lg">
          <Link href={`${routePath.bookingLookup}?code=${encodeURIComponent(result.code)}`}>
            <Search aria-hidden="true" />
            Tra cứu, hủy lịch hẹn
          </Link>
        </Button>
        <Button variant="ghost" size="lg" onClick={onRestart}>
          Đặt thêm lịch khác
        </Button>
      </div>
    </div>
  )
}
