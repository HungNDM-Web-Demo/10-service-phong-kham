'use client'

import Link from 'next/link'
import { ChartColumn } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from 'recharts'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { routePath } from '@/config/route-path'
import type { HourCountDto } from '@/types/clinic'

const chartConfig = { count: { label: 'Lượt tiếp đón', color: 'var(--chart-1)' } } satisfies ChartConfig

/**
 * Biểu đồ cột số lượt tiếp đón theo giờ hôm nay (FR-02, UC-14 bước 3). Cột của giờ hiện tại đậm hơn; chưa có lượt nào
 * thì hiện trạng thái trống có hướng dẫn (UC-14 E1).
 */
export function HourlyCheckInChart({
  data,
  currentHour,
  isLoading,
  canOpenQueue,
}: {
  data: HourCountDto[] | undefined
  currentHour: number
  isLoading: boolean
  canOpenQueue: boolean
}) {
  if (isLoading || !data) return <Skeleton className="h-64 w-full rounded-lg" />
  const total = data.reduce((s, h) => s + h.count, 0)
  if (total === 0)
    return (
      <EmptyState
        compact
        icon={ChartColumn}
        title="Hôm nay chưa có lượt tiếp đón"
        description="Biểu đồ tự cập nhật khi lễ tân tiếp đón bệnh nhân ở màn hình Tiếp đón & hàng chờ."
        action={
          canOpenQueue ? (
            <Button asChild variant="outline" size="sm">
              <Link href={routePath.queue}>Mở hàng chờ</Link>
            </Button>
          ) : undefined
        }
      />
    )
  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-64 w-full"
      aria-label={`Biểu đồ cột số lượt tiếp đón theo giờ hôm nay, tổng ${total} lượt`}
    >
      <BarChart data={data} margin={{ left: 0, right: 8, top: 20 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="hour" tickFormatter={(h: number) => `${h}h`} tickLine={false} axisLine={false} interval={0} />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const h = Number(payload?.[0]?.payload?.hour ?? 0)
                return `${String(h).padStart(2, '0')}:00 – ${String(h + 1).padStart(2, '0')}:00`
              }}
            />
          }
        />
        <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={32}>
          {data.map((h) => (
            <Cell key={h.hour} fillOpacity={h.hour === currentHour ? 1 : h.hour > currentHour ? 0.35 : 0.7} />
          ))}
          <LabelList dataKey="count" position="top" className="fill-foreground" fontSize={11} formatter={(v: unknown) => (Number(v) > 0 ? String(v) : '')} />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
