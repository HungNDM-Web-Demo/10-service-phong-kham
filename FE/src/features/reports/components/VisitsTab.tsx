'use client'

import { useState } from 'react'
import { ChartColumn } from 'lucide-react'
import { Bar, CartesianGrid, ComposedChart, XAxis, YAxis } from 'recharts'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Card } from '@/components/ui/card'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useVisitReport } from '@/features/clinic/hooks/use-clinic'
import { ddmmyyyy, isoWeekdayOf, weekdayShort } from '@/features/clinic/lib/vn-time'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { VisitDayRow } from '@/types/clinic'
import { periodText, shortDateKey, type DateRange } from '../lib/date-range'
import { excelFileName, excelSheet, type ExcelColumn } from '../lib/export-excel'
import { reportQuery, SpecialtyFilter } from './ReportFilters'
import { Breakdown, ChartCard, ExportButton, formatPercent, ratePercent, Stat, TabLoading, TableCard, TabToolbar } from './ReportParts'

const chartConfig = {
  newPatients: { label: 'Bệnh nhân mới', color: 'var(--chart-3)' },
  returning: { label: 'Bệnh nhân cũ', color: 'var(--chart-1)' },
} satisfies ChartConfig

type DayRow = VisitDayRow & { label?: string }
type SummaryRow = { metric: string; value: number; note?: string }

const DAY_COLUMNS: ExcelColumn<DayRow>[] = [
  { header: 'Ngày', value: (r) => r.label ?? ddmmyyyy(r.date), width: 14 },
  { header: 'Tổng lượt', value: (r) => r.total, width: 12 },
  { header: 'Bệnh nhân mới', value: (r) => r.newPatients, width: 16 },
  { header: 'Bệnh nhân cũ', value: (r) => r.returning, width: 16 },
]

/**
 * Tab Lượt khám (UC-15 bước 4; FR-39, BR-31): số lượt theo ngày, bệnh nhân mới và cũ, tỉ lệ không đến
 * = Không đến / (tổng lịch − Đã hủy), nguồn lượt khám (online, lễ tân, đến trực tiếp). Lọc theo chuyên khoa.
 */
export function VisitsTab({ range }: { range: DateRange }) {
  const [specialtyId, setSpecialtyId] = useState<string | undefined>()
  const report = useVisitReport(reportQuery({ ...range, specialtyId }))
  const data = report.data

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <SpecialtyFilter value={specialtyId} onChange={setSpecialtyId} id="visit-specialty" />
    </div>
  )

  if (report.error && !data)
    return (
      <div className="space-y-4">
        {toolbar}
        <ErrorState error={report.error} onRetry={() => void report.refetch()} />
      </div>
    )
  if (!data)
    return (
      <div className="space-y-4">
        {toolbar}
        <TabLoading cards={4} />
      </div>
    )

  const effective = data.appointmentTotal - data.cancelled
  const empty = data.total === 0 && data.appointmentTotal === 0
  const filters = periodText(data)
  const summary: SummaryRow[] = [
    { metric: 'Tổng lượt khám', value: data.total },
    { metric: 'Bệnh nhân mới', value: data.newPatients },
    { metric: 'Bệnh nhân cũ', value: data.returning },
    { metric: 'Tổng lịch hẹn', value: data.appointmentTotal },
    { metric: 'Lịch đã hủy', value: data.cancelled },
    { metric: 'Lịch không đến', value: data.noShow },
    { metric: 'Tỉ lệ không đến (%)', value: data.noShowRate, note: 'Không đến / (tổng lịch − đã hủy)' },
    { metric: 'Từ lịch online', value: data.fromOnline },
    { metric: 'Từ lịch lễ tân tạo', value: data.fromReception },
    { metric: 'Đến trực tiếp', value: data.walkIn },
  ]

  return (
    <div className={cn('space-y-4 transition-opacity', report.isFetching && 'opacity-70')}>
      {toolbar}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Tổng lượt khám" value={formatNumber(data.total, 0)} sub="Không gồm lượt bỏ về" />
        <Stat
          label="Bệnh nhân mới / cũ"
          value={`${formatNumber(data.newPatients, 0)} / ${formatNumber(data.returning, 0)}`}
          sub={`Mới chiếm ${formatPercent(ratePercent(data.newPatients, data.total))}`}
        />
        <Stat
          label="Tỉ lệ không đến"
          value={formatPercent(data.noShowRate)}
          tone={data.noShowRate >= 15 ? 'destructive' : data.noShowRate >= 10 ? 'warning' : undefined}
          sub={`${formatNumber(data.noShow, 0)} không đến / ${formatNumber(effective, 0)} lịch (đã trừ ${formatNumber(data.cancelled, 0)} lịch hủy)`}
        />
        <Stat label="Tổng lịch hẹn" value={formatNumber(data.appointmentTotal, 0)} sub={`${formatNumber(data.cancelled, 0)} lịch đã hủy`} />
      </div>

      <TabToolbar title="Lượt khám theo ngày">
        <ExportButton
          fileName={excelFileName('Báo cáo lượt khám', data.from, data.to)}
          disabled={empty}
          build={() => [
            excelSheet('Theo ngày', 'BÁO CÁO LƯỢT KHÁM THEO NGÀY', filters, DAY_COLUMNS, data.byDay, {
              date: '',
              label: 'Tổng cộng',
              total: data.total,
              newPatients: data.newPatients,
              returning: data.returning,
            }),
            excelSheet(
              'Tổng hợp',
              'TỔNG HỢP LƯỢT KHÁM',
              filters,
              [
                { header: 'Chỉ số', value: (r: SummaryRow) => r.metric, width: 26 },
                { header: 'Giá trị', value: (r) => r.value, format: 'General', width: 12 },
                { header: 'Ghi chú', value: (r) => r.note, width: 34 },
              ],
              summary
            ),
          ]}
        />
      </TabToolbar>

      {empty ? (
        <Card>
          <EmptyState icon={ChartColumn} title="Chưa có lượt khám trong kỳ" description="Chọn khoảng ngày hoặc chuyên khoa khác." />
        </Card>
      ) : (
        <>
          <ChartCard title="Lượt khám theo ngày" description="Cột chồng: bệnh nhân mới (lượt khám đầu tiên) và bệnh nhân cũ.">
            <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full" aria-label="Biểu đồ cột chồng số lượt khám theo ngày, chia bệnh nhân mới và cũ">
              <ComposedChart data={data.byDay} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDateKey} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => {
                        const date = String(payload?.[0]?.payload?.date ?? '')
                        return date ? `${weekdayShort(isoWeekdayOf(date))}, ${ddmmyyyy(date)}` : ''
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="newPatients" stackId="v" fill="var(--color-newPatients)" maxBarSize={28} />
                <Bar dataKey="returning" stackId="v" fill="var(--color-returning)" radius={[3, 3, 0, 0]} maxBarSize={28} />
              </ComposedChart>
            </ChartContainer>
          </ChartCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Nguồn lượt khám" description="Theo lịch hẹn gắn với lượt khám">
              <Breakdown
                format={(v) => `${formatNumber(v, 0)} lượt`}
                items={[
                  { key: 'online', label: 'Đặt lịch online', value: data.fromOnline, color: 'var(--chart-1)' },
                  { key: 'reception', label: 'Lễ tân tạo lịch', value: data.fromReception, color: 'var(--chart-2)' },
                  { key: 'walkin', label: 'Đến trực tiếp', value: data.walkIn, color: 'var(--chart-3)' },
                ]}
              />
            </ChartCard>
            <ChartCard title="Lịch hẹn trong kỳ" description="Tỉ lệ không đến tính trên lịch chưa hủy (BR-31)">
              <Breakdown
                format={(v) => `${formatNumber(v, 0)} lịch`}
                items={[
                  { key: 'came', label: 'Đến khám hoặc chưa tới ngày', value: Math.max(0, effective - data.noShow), color: 'var(--chart-3)' },
                  { key: 'noshow', label: 'Không đến', value: data.noShow, color: 'var(--chart-2)' },
                  { key: 'cancelled', label: 'Đã hủy', value: data.cancelled, color: 'var(--chart-5)' },
                ]}
              />
            </ChartCard>
          </div>

          <TableCard minWidth={560} scroll>
            <TableHeader className="bg-muted sticky top-0 z-10">
              <TableRow className="text-xs uppercase hover:bg-transparent">
                <TableHead>Ngày</TableHead>
                <TableHead className="text-right">Tổng lượt</TableHead>
                <TableHead className="text-right">Bệnh nhân mới</TableHead>
                <TableHead className="text-right">Bệnh nhân cũ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byDay.map((d) => (
                <TableRow key={d.date} className={cn(d.total === 0 && 'text-muted-foreground')}>
                  <TableCell className="tabular-nums">
                    <span className="text-muted-foreground mr-1.5 inline-block w-7 text-xs">{weekdayShort(isoWeekdayOf(d.date))}</span>
                    {ddmmyyyy(d.date)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatNumber(d.total, 0)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(d.newPatients, 0)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(d.returning, 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <tfoot className="bg-muted sticky bottom-0 border-t font-semibold">
              <TableRow className="hover:bg-transparent">
                <TableCell>Tổng cộng</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(data.total, 0)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(data.newPatients, 0)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(data.returning, 0)}</TableCell>
              </TableRow>
            </tfoot>
          </TableCard>
        </>
      )}
    </div>
  )
}
