'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, Maximize, MonitorX, Star, Volume2, VolumeX, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAssetUrl } from '@/hooks/use-asset-url'
import { isApiError } from '@/lib/api-error'
import { useQueueDisplay } from '@/features/clinic/hooks/use-clinic'
import { problemCode } from '@/features/clinic/lib/problem'
import { vnParts } from '@/features/clinic/lib/vn-time'
import { CallBanner } from '../components/CallBanner'
import { DisplayClock } from '../components/DisplayClock'
import { DisplayMessage } from '../components/DisplayMessage'
import { RoomCard } from '../components/RoomCard'
import { playChime, unlockChime, useChimeReady } from '../lib/chime'
import '../display.css'

/** Lượt gọi trong khoảng này (theo giờ máy chủ) mới nhấp nháy, để mở lại màn hình không nháy số đã gọi từ lâu. */
const FRESH_CALL_MS = 15_000
/** Tối đa 5 phòng một hàng; nhiều hơn thì chia hai hàng, thẻ gọn lại. */
const MAX_PER_ROW = 5

const pad = (n: number) => String(n).padStart(2, '0')
const hhmmss = (ms: number) => {
  const p = vnParts(ms)
  return `${pad(p.hour)}:${pad(p.minute)}:${pad(Math.floor((ms / 1000) % 60))}`
}

function subscribeFullscreen(listener: () => void) {
  document.addEventListener('fullscreenchange', listener)
  return () => document.removeEventListener('fullscreenchange', listener)
}
const useFullscreen = () =>
  useSyncExternalStore(
    subscribeFullscreen,
    () => !!document.fullscreenElement,
    () => false
  )

/**
 * Màn hình gọi số cho TV ở sảnh (SCR-08, FR-17, UC-06, NFR-03), không cần đăng nhập, mở bằng `/queue/display?code=…`:
 * tên, logo phòng khám, đồng hồ; dải "Mời số" của lượt gọi gần nhất (chuông Web Audio + nhấp nháy khi có lượt mới);
 * lưới phòng với số đang khám và 5 số kế tiếp. Dữ liệu tự làm mới mỗi 2 giây; mất mạng thì báo đang kết nối lại (UC-06 E3).
 */
export function QueueDisplayPage() {
  const params = useSearchParams()
  const code = (params.get('code') ?? '').trim()
  const display = useQueueDisplay(code)
  const { data, error } = display
  const logo = useAssetUrl(data?.logoUrl ?? '/logo/logo-mark.svg')
  const soundReady = useChimeReady()
  const fullscreen = useFullscreen()

  const wrongCode = !code || (isApiError(error) && (error.status === 404 || problemCode(error) === 'SaiMaManHinh'))
  const lastCall = data?.lastCall ?? null
  const callKey = lastCall ? `${lastCall.ticket}|${lastCall.calledAt}` : null
  const fresh = !!data && !!lastCall && Date.parse(data.now) - Date.parse(lastCall.calledAt) < FRESH_CALL_MS

  // TV kiosk cho phép tự phát âm thanh thì bật chuông ngay; không thì mở khóa ở lần chạm/bấm phím đầu tiên
  useEffect(() => {
    void unlockChime()
    const onGesture = () => void unlockChime()
    window.addEventListener('pointerdown', onGesture)
    window.addEventListener('keydown', onGesture)
    return () => {
      window.removeEventListener('pointerdown', onGesture)
      window.removeEventListener('keydown', onGesture)
    }
  }, [])

  // Chuông khi có lượt gọi mới hoặc gọi lại (calledAt đổi); lần tải đầu chỉ ghi nhận, không kêu
  const hasData = !!data
  const seenCall = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    if (!hasData) return
    if (seenCall.current !== undefined && callKey && callKey !== seenCall.current) playChime()
    seenCall.current = callKey
  }, [hasData, callKey])

  if (wrongCode)
    return (
      <DisplayMessage
        icon={MonitorX}
        tone="danger"
        title="Mã màn hình không đúng"
        description={
          <>
            {code ? 'Kiểm tra lại đường dẫn đang mở trên TV.' : 'Đường dẫn chưa có mã màn hình.'} Mã nằm trong Cài đặt chung, mục Phòng khám
            (Mã màn hình sảnh); đường dẫn có dạng <span className="text-foreground font-semibold">/queue/display?code=…</span>
          </>
        }
      />
    )

  if (!data)
    return error ? (
      <DisplayMessage
        icon={Loader2}
        spin
        tone="warning"
        title="Đang kết nối lại…"
        description="Màn hình sẽ tự hiện số thứ tự khi có mạng trở lại."
      />
    ) : (
      <DisplaySkeleton />
    )

  const rooms = data.rooms
  const rows = rooms.length > MAX_PER_ROW ? 2 : 1
  const cols = Math.max(1, Math.ceil(rooms.length / rows))
  const offline = display.isError

  return (
    <div className="flex h-full flex-col gap-[1.6vh] p-[2.2vh]">
      <header className="flex h-[9vh] shrink-0 items-center gap-[1.2vw]">
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element -- logo do phòng khám tự tải lên
          <img src={logo} alt="" className="bg-foreground size-[8vh] shrink-0 rounded-[1.6vh] object-contain p-[0.5vh]" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[4.6vh] leading-tight font-bold">{data.clinicName}</p>
          <p className="text-muted-foreground text-[2.4vh] leading-tight font-medium">Màn hình gọi số</p>
        </div>
        <DisplayClock />
      </header>

      <CallBanner call={lastCall} fresh={fresh} />

      {rooms.length === 0 ? (
        <div className="bg-card text-muted-foreground flex min-h-0 flex-1 items-center justify-center rounded-[2vh] border text-[4vh] font-semibold">
          Hôm nay chưa có phòng khám nào làm việc
        </div>
      ) : (
        <div
          className="grid min-h-0 flex-1 gap-[1.4vh]"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
        >
          {rooms.map((room) => (
            <RoomCard
              key={room.doctorId}
              room={room}
              dense={rows > 1}
              called={fresh && !!lastCall && room.current?.ticket === lastCall.ticket}
            />
          ))}
        </div>
      )}

      <footer className="flex h-[4.6vh] shrink-0 items-center gap-[1.2vw] text-[2.1vh]">
        <p className="text-muted-foreground min-w-0 flex-1 truncate">
          Vui lòng theo dõi số thứ tự trên màn hình và nghe loa gọi. Số có{' '}
          <Star className="text-warning inline size-[1em] fill-current align-[-0.125em]" aria-hidden="true" /> là lượt ưu tiên.
        </p>
        {offline ? (
          <span role="status" className="bg-warning/15 text-warning flex shrink-0 items-center gap-[0.5vw] rounded-full px-[1vw] py-[0.4vh] font-semibold">
            <WifiOff className="size-[1.1em]" aria-hidden="true" />
            Mất kết nối, đang kết nối lại…
          </span>
        ) : (
          <span className="text-muted-foreground shrink-0 tabular-nums">Cập nhật {hhmmss(display.dataUpdatedAt)}</span>
        )}
        {!(soundReady && fullscreen) && (
          <div className="flex shrink-0 items-center gap-2">
            {soundReady ? (
              <Button variant="ghost" size="sm" onClick={() => playChime()}>
                <Volume2 aria-hidden="true" />
                Thử chuông
              </Button>
            ) : (
              <Button
                variant="cta"
                size="sm"
                onClick={() => {
                  void unlockChime().then((ok) => ok && playChime())
                }}
              >
                <VolumeX aria-hidden="true" />
                Bật âm thanh
              </Button>
            )}
            {!fullscreen && (
              <Button variant="ghost" size="sm" onClick={() => void document.documentElement.requestFullscreen?.().catch(() => undefined)}>
                <Maximize aria-hidden="true" />
                Toàn màn hình
              </Button>
            )}
          </div>
        )}
      </footer>
    </div>
  )
}

function DisplaySkeleton() {
  return (
    <div className="flex h-full flex-col gap-[1.6vh] p-[2.2vh]" aria-busy="true" aria-label="Đang tải màn hình gọi số">
      <div className="flex h-[9vh] items-center gap-[1.2vw]">
        <Skeleton className="size-[8vh] rounded-[1.6vh]" />
        <Skeleton className="h-[5vh] w-[30vw]" />
        <Skeleton className="ml-auto h-[7vh] w-[14vw]" />
      </div>
      <Skeleton className="h-[23vh] rounded-[2.4vh]" />
      <div className="grid min-h-0 flex-1 grid-cols-4 gap-[1.4vh]">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="rounded-[2vh]" />
        ))}
      </div>
    </div>
  )
}
