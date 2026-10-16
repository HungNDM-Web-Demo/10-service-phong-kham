'use client'

import { useSyncExternalStore } from 'react'

/**
 * Đồng hồ dùng chung, nhảy mỗi giây: một bộ đếm cho mọi component đang nghe, tự dừng khi không còn ai.
 * Trả 0 khi render phía máy chủ (chưa biết giờ của máy khách), nơi dùng hiện chỗ trống thay vì giờ sai.
 * Dùng cho đồng hồ màn hình sảnh (SCR-08) và đếm ngược khóa tra cứu (FR-13, 429 TamKhoaTraCuu).
 */

const TICK_MS = 1000
const listeners = new Set<() => void>()
let current = 0
let timer: number | null = null

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (timer === null) {
    current = Date.now()
    timer = window.setInterval(() => {
      current = Date.now()
      listeners.forEach((l) => l())
    }, TICK_MS)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer !== null) {
      window.clearInterval(timer)
      timer = null
    }
  }
}

function getSnapshot(): number {
  // Chưa có bộ đếm (lần render đầu): làm mới tối đa mỗi giây một lần để hai lần đọc liền nhau trả cùng giá trị
  if (timer === null) {
    const now = Date.now()
    if (now - current >= TICK_MS) current = now
  }
  return current
}

const getServerSnapshot = () => 0

export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
