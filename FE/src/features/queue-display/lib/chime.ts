'use client'

import { useSyncExternalStore } from 'react'

/**
 * Chuông gọi số của màn hình sảnh (FR-17, UC-06 bước 4), tạo bằng Web Audio, không cần file âm thanh: hai nốt "ding – dong".
 * Trình duyệt chặn phát âm thanh tới khi có thao tác chạm/bấm trên trang, nên màn hình có nút "Bật âm thanh"
 * và tự mở khóa ở lần chạm đầu tiên. TV chạy chế độ kiosk cho phép tự phát thì chuông bật ngay.
 */

let ctx: AudioContext | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    ctx.addEventListener('statechange', notify)
  }
  return ctx
}

/** Gọi trong sự kiện chạm/bấm (hoặc lúc mở trang trên TV kiosk). Trả true nếu chuông đã sẵn sàng. */
export async function unlockChime(): Promise<boolean> {
  const c = getContext()
  if (!c) return false
  try {
    if (c.state !== 'running') await c.resume()
  } catch {
    return false
  }
  notify()
  return c.state === 'running'
}

const isReady = () => ctx?.state === 'running'

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Chuông đã được phép phát chưa (đổi khi trình duyệt mở khóa âm thanh). */
export function useChimeReady(): boolean {
  return useSyncExternalStore(subscribe, isReady, () => false)
}

/** Một nốt chuông: âm cơ bản + họa âm bậc 2 nhỏ hơn, tăng nhanh rồi tắt dần như tiếng chuông. */
function bell(c: AudioContext, frequency: number, start: number, duration: number) {
  const out = c.createGain()
  out.gain.setValueAtTime(0.0001, start)
  out.gain.exponentialRampToValueAtTime(0.32, start + 0.015)
  out.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  out.connect(c.destination)
  for (const [ratio, level] of [
    [1, 1],
    [2, 0.28],
    [3, 0.08],
  ] as const) {
    const osc = c.createOscillator()
    const amp = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = frequency * ratio
    amp.gain.value = level
    osc.connect(amp).connect(out)
    osc.start(start)
    osc.stop(start + duration + 0.05)
  }
}

/** "Ding – dong": nốt cao Mi5 rồi nốt thấp Đô5. Không phát khi trình duyệt chưa cho phép. */
export function playChime() {
  const c = getContext()
  if (!c || c.state !== 'running') return
  const t = c.currentTime + 0.05
  bell(c, 659.25, t, 1.1)
  bell(c, 523.25, t + 0.6, 1.6)
}
