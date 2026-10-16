'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { BarChart3 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PermissionGuard } from '@/components/shared/PermissionGuard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { permissions } from '@/config/permissions'
import { CancelledReceiptsTab } from '../components/CancelledReceiptsTab'
import { DateRangeFilter } from '../components/DateRangeFilter'
import { DebtsTab } from '../components/DebtsTab'
import { DoctorsTab } from '../components/DoctorsTab'
import { FollowUpsTab } from '../components/FollowUpsTab'
import { RevenueTab } from '../components/RevenueTab'
import { VisitsTab } from '../components/VisitsTab'
import { DEFAULT_PRESET, presetRange, type DateRange, type RangePreset } from '../lib/date-range'

const TABS = [
  { value: 'thuc-thu', label: 'Thực thu' },
  { value: 'bac-si', label: 'Theo bác sĩ' },
  { value: 'luot-kham', label: 'Lượt khám' },
  { value: 'tai-kham', label: 'Tái khám' },
  { value: 'cong-no', label: 'Công nợ' },
  { value: 'phieu-huy', label: 'Phiếu thu đã hủy' },
] as const
type TabValue = (typeof TABS)[number]['value']
const DEFAULT_TAB: TabValue = 'thuc-thu'
const isTab = (v: string | null): v is TabValue => TABS.some((t) => t.value === v)

/**
 * Báo cáo (SCR-17; UC-15; FR-38…FR-40): mặc định tab Thực thu, 30 ngày gần nhất; tab đồng bộ `?tab=`. Khoảng ngày dùng
 * chung cho mọi tab (trừ Công nợ tính tới hôm nay), chặn khoảng quá 366 ngày trước khi gọi API. Mỗi tab xuất Excel đúng
 * bảng đang xem. Radix chỉ gắn tab đang mở nên chỉ tab đó gọi API.
 */
export function ReportsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const tabParam = params.get('tab')
  const tab: TabValue = isTab(tabParam) ? tabParam : DEFAULT_TAB
  const [preset, setPreset] = useState<RangePreset>(DEFAULT_PRESET)
  const [range, setRange] = useState<DateRange>(() => presetRange(DEFAULT_PRESET))

  const setTab = (value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value === DEFAULT_TAB) next.delete('tab')
    else next.set('tab', value)
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  return (
    <PermissionGuard permission={permissions.reports.view} redirect>
      <div className="space-y-5">
        <PageHeader
          title="Báo cáo"
          icon={BarChart3}
          description="Thực thu, hiệu suất bác sĩ, lượt khám, tái khám, công nợ và phiếu thu đã hủy theo khoảng ngày."
        />
        {tab !== 'cong-no' && (
          <DateRangeFilter
            preset={preset}
            value={range}
            onChange={(p, r) => {
              setPreset(p)
              setRange(r)
            }}
          />
        )}
        <Tabs value={tab} onValueChange={setTab} className="gap-4">
          <div className="-mx-1 overflow-x-auto overflow-y-hidden px-1 pb-1">
            <TabsList className="w-max group-data-horizontal/tabs:h-10">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="min-h-8 px-4">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value="thuc-thu">
            <RevenueTab range={range} />
          </TabsContent>
          <TabsContent value="bac-si">
            <DoctorsTab range={range} />
          </TabsContent>
          <TabsContent value="luot-kham">
            <VisitsTab range={range} />
          </TabsContent>
          <TabsContent value="tai-kham">
            <FollowUpsTab range={range} />
          </TabsContent>
          <TabsContent value="cong-no">
            <DebtsTab />
          </TabsContent>
          <TabsContent value="phieu-huy">
            <CancelledReceiptsTab range={range} />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  )
}
