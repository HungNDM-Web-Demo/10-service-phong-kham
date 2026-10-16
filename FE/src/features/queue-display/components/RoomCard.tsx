import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DisplayRoomDto } from '@/types/clinic'

type RoomCardProps = {
  room: DisplayRoomDto
  /** Lưới hai hàng (trên 5 phòng): số đang khám và số tiếp theo đặt cạnh nhau, số tiếp theo không kèm tên */
  dense: boolean
  /** Phòng vừa gọi số: viền sáng nhấp nháy */
  called: boolean
}

/**
 * Thẻ một phòng trên màn hình sảnh (FR-17, NFR-03): số phòng, bác sĩ, STT đang khám cỡ lớn kèm tên viết tắt "Nguyễn V. A",
 * 5 số kế tiếp theo thứ tự gọi (BR-09), sao cho lượt ưu tiên. Cỡ chữ theo chiều cao màn hình (vh) và bề rộng thẻ (cqw)
 * để vừa khít 1920×1080 mà không cuộn.
 */
export function RoomCard({ room, dense, called }: RoomCardProps) {
  return (
    <article
      aria-label={`${room.room}, ${room.doctorName}`}
      className={cn('bg-card @container flex min-h-0 flex-col overflow-hidden rounded-[2vh] border', called && 'queue-room-called')}
    >
      <header className={cn('bg-muted flex shrink-0 items-center gap-[0.8vw] px-[1.2vw]', dense ? 'py-[0.6vh]' : 'py-[0.8vh]')}>
        <span
          className={cn(
            'bg-primary text-primary-foreground shrink-0 rounded-[1.2vh] px-[0.9vw] py-[0.2vh] leading-tight font-extrabold',
            dense ? 'text-[3.6vh]' : 'text-[4.4vh]'
          )}
        >
          {room.roomShort}
        </span>
        <div className="min-w-0">
          <p className={cn('truncate leading-tight font-bold', dense ? 'text-[2.4vh]' : 'text-[2.8vh]')}>{room.doctorName}</p>
          <p className="text-muted-foreground truncate text-[2vh] leading-tight">{room.room}</p>
        </div>
      </header>

      <div className={cn('flex min-h-0 flex-1', dense ? 'flex-row' : 'flex-col')}>
        <div
          className={cn(
            'flex shrink-0 flex-col items-center justify-center px-[1vw] text-center',
            dense ? 'w-[56%] border-r py-[0.8vh]' : 'border-b py-[1vh]'
          )}
        >
          <p className="text-muted-foreground text-[2.1vh] leading-tight font-semibold tracking-wider uppercase">Đang khám</p>
          {room.current ? (
            <>
              <p
                className={cn(
                  'text-primary leading-none font-extrabold whitespace-nowrap tabular-nums',
                  dense ? 'text-[length:min(11cqw,7.5vh)]' : 'text-[length:min(20cqw,10vh)]'
                )}
              >
                {room.current.ticket}
              </p>
              <p
                className={cn(
                  'mt-[0.6vh] flex max-w-full items-center gap-[0.5vw] leading-tight font-semibold',
                  dense ? 'text-[2.6vh]' : 'text-[3.2vh]'
                )}
              >
                <span className="truncate">{room.current.patientName}</span>
                {room.current.isPriority && <PriorityStar />}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground py-[2vh] text-[3.6vh] font-semibold">Chưa gọi số</p>
          )}
        </div>

        <div className={cn('min-h-0 min-w-0 flex-1 overflow-hidden px-[1.2vw]', dense ? 'py-[0.6vh]' : 'py-[1vh]')}>
          <p className="text-muted-foreground mb-[0.4vh] text-[2.1vh] font-semibold tracking-wider uppercase">Số tiếp theo</p>
          {room.next.length === 0 ? (
            <p className="text-muted-foreground text-[2.6vh]">Không có người chờ</p>
          ) : (
            <ol className="divide-y">
              {room.next.map((t) => (
                <li
                  key={t.ticket}
                  className={cn('flex items-center gap-[0.8vw] leading-tight', dense ? 'py-[0.2vh] text-[2.2vh]' : 'py-[0.5vh] text-[2.8vh]')}
                >
                  <span className="font-bold whitespace-nowrap tabular-nums">{t.ticket}</span>
                  {!dense && <span className="text-muted-foreground min-w-0 flex-1 truncate">{t.patientName}</span>}
                  {t.isPriority && <PriorityStar />}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </article>
  )
}

function PriorityStar() {
  return (
    <span className="text-warning inline-flex shrink-0">
      <Star className="size-[0.9em] fill-current" aria-hidden="true" />
      <span className="sr-only">Ưu tiên</span>
    </span>
  )
}
