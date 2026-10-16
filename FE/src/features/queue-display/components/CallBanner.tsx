import { Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DisplayCallDto } from '@/types/clinic'

/**
 * Dải "Mời số" của lượt gọi gần nhất (UC-06 bước 4, TC-24): STT "P1 - 005" cao hơn 120 px ở 1920×1080 (NFR-03),
 * phòng, tên viết tắt. Lượt gọi mới (hoặc gọi lại) thì nhấp nháy; trình đọc màn hình đọc câu mời qua vùng aria-live.
 */
export function CallBanner({ call, fresh }: { call: DisplayCallDto | null; fresh: boolean }) {
  return (
    <section aria-label="Lượt gọi mới nhất" className="h-[23vh] shrink-0">
      <p className="sr-only" aria-live="assertive" aria-atomic="true">
        {call ? `Mời số ${call.ticket}, ${call.patientName}, vào ${call.room}.` : ''}
      </p>
      {call ? (
        <div
          // Đổi key theo lượt gọi để hiệu ứng nhấp nháy chạy lại cả khi bác sĩ bấm "Gọi lại" cùng một số
          key={`${call.ticket}|${call.calledAt}`}
          aria-hidden="true"
          className={cn(
            'bg-primary text-primary-foreground flex h-full items-center gap-[3vw] overflow-hidden rounded-[2.4vh] px-[3vw] shadow-lg',
            fresh && 'queue-call-flash'
          )}
        >
          <div className="flex shrink-0 flex-col items-center gap-[1vh]">
            <Megaphone className="size-[8vh]" strokeWidth={2.2} />
            <span className="text-[3.6vh] font-extrabold tracking-[0.18em] uppercase">Mời số</span>
          </div>
          <p className="min-w-0 flex-1 text-center text-[17vh] leading-none font-extrabold tracking-tight whitespace-nowrap tabular-nums">
            {call.ticket}
          </p>
          <div className="max-w-[32vw] shrink-0 text-right">
            <p className="text-[6vh] leading-tight font-extrabold">{call.room}</p>
            <p className="truncate text-[4.4vh] leading-tight font-semibold">{call.patientName}</p>
          </div>
        </div>
      ) : (
        <div className="bg-card text-muted-foreground flex h-full items-center justify-center gap-[1.5vw] rounded-[2.4vh] border text-[4vh] font-semibold">
          <Megaphone className="size-[6vh]" aria-hidden="true" />
          Chưa có lượt gọi. Vui lòng chờ đến số của bạn.
        </div>
      )}
    </section>
  )
}
