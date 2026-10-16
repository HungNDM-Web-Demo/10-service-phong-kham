'use client'

import { CalendarRange, ChartColumn, Receipt, ReceiptText, Wallet } from 'lucide-react'
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Card } from '@/components/ui/card'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useRevenueReport } from '@/features/clinic/hooks/use-clinic'
import { paymentMethodLabels, revenueGroupLabels } from '@/features/clinic/lib/labels'
import { addDaysKey, ddmmyyyy, isoWeekdayOf, weekdayShort } from '@/features/clinic/lib/vn-time'
import { KpiCard } from '@/features/dashboard/components/KpiCard'
import { formatNumber, formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PaymentMethod, RevenueGroup } from '@/types/clinic'
import { periodText, rangeDays, shortDateKey, type DateRange } from '../lib/date-range'
import { excelFileName, excelSheet, type ExcelColumn } from '../lib/export-excel'
import { Breakdown, ChartCard, compactVnd, ExportButton, ratePercent, TabLoading, TableCard, TabToolbar } from './ReportParts'

const chartConfig = {
  amount: { label: 'Thực thu', color: 'var(--chart-1)' },
  previous: { label: 'Kỳ trước', color: 'var(--chart-2)' },
} satisfies ChartConfig

export const GROUP_COLORS: Record<RevenueGroup, string> = {
  Kham: 'var(--chart-1)',
  ThuThuat: 'var(--chart-2)',
  CanLamSang: 'var(--chart-3)',
  Thuoc: 'var(--chart-4)',
}
export const METHOD_COLORS: Record<PaymentMethod, string> = {
  TienMat: 'var(--chart-3)',
  ChuyenKhoan: 'var(--chart-1)',
  The: 'var(--chart-5)',
}

type DayRow = { date: string; label?: string; amount: number; previous: number | null; previousDate: string | null }
type GroupRow = { label: string; amount: number; share: number }
type MethodRow = { label: string; count: number; amount: number; share: number }

const DAY_COLUMNS: ExcelColumn<DayRow>[] = [
  { header: 'Ngày', value: (r) => r.label ?? ddmmyyyy(r.date), width: 14 },
  { header: 'Thực thu', value: (r) => r.amount, width: 16 },
  { header: 'Ngày kỳ trước', value: (r) => (r.previousDate ? ddmmyyyy(r.previousDate) : null), width: 16 },
  { header: 'Thực thu kỳ trước', value: (r) => r.previous, width: 18 },
]

/** Khoảng liền trước cùng số ngày (07 §3.14) */
export function previousRange(range: DateRange): DateRange {
  const days = rangeDays(range.from, range.to) ?? 1
  return { from: addDaysKey(range.from, -days), to: addDaysKey(range.from, -1) }
}

/**
 * Tab Thực thu (UC-15 bước 2; FR-38, BR-31): tổng phiếu thu hợp lệ theo ngày lập, so với kỳ liền trước cùng độ dài;
 * biểu đồ cột theo ngày kèm đường kỳ trước làm nền; tỉ trọng theo nhóm dịch vụ và theo phương thức.
 */
export function RevenueTab({ range }: { range: DateRange }) {
  const report = useRevenueReport(range)
  const prevRange = previousRange(range)
  const previous = useRevenueReport(prevRange)
  const data = report.data

  if (report.error && !data) return <ErrorState error={report.error} onRetry={() => void report.refetch()} />
  if (!data) return <TabLoading cards={4} />

  const prevDays = previous.data?.byDay ?? []
  const rows: DayRow[] = data.byDay.map((d, i) => ({
    date: d.date,
    amount: d.amount,
    previous: prevDays[i]?.amount ?? null,
    previousDate: prevDays[i]?.date ?? null,
  }))
  const prevLabel = `so với ${ddmmyyyy(prevRange.from)}–${ddmmyyyy(prevRange.to)}`
  const empty = data.receiptCount === 0
  const filters = periodText(data)
  const groupRows: GroupRow[] = data.byGroup.map((g) => ({
    label: revenueGroupLabels[g.group],
    amount: g.amount,
    share: ratePercent(g.amount, data.total),
  }))
  const methodRows: MethodRow[] = data.byMethod.map((m) => ({
    label: paymentMethodLabels[m.method],
    count: m.count,
    amount: m.amount,
    share: ratePercent(m.amount, data.total),
  }))

  return (
    <div className={cn('space-y-4 transition-opacity', report.isFetching && 'opacity-70')}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Thực thu"
          value={formatVnd(data.total)}
          icon={Wallet}
          change={data.changePercent ?? undefined}
          changeLabel={prevLabel}
        />
        <KpiCard label="Số phiếu thu" value={formatNumber(data.receiptCount, 0)} icon={ReceiptText} />
        <KpiCard label="Bình quân mỗi phiếu" value={formatVnd(data.receiptCount ? Math.round(data.total / data.receiptCount) : 0)} icon={Receipt} />
        <KpiCard label="Thực thu kỳ trước" value={formatVnd(data.previousTotal)} icon={CalendarRange} />
      </div>
      <p className="text-muted-foreground text-xs text-pretty">
        Thực thu là tổng phiếu thu hợp lệ theo thời điểm lập, không gồm phiếu thu đã hủy (BR-31). Theo nhóm: số thu của mỗi phiếu
        chia theo tỉ lệ tiền các dòng không mua ngoài. Kỳ trước chưa có số liệu thì không hiện % thay đổi.
      </p>

      <TabToolbar title="Thực thu theo ngày">
        <ExportButton
          fileName={excelFileName('Báo cáo thực thu', data.from, data.to)}
          disabled={empty}
          build={() => [
            excelSheet('Theo ngày', 'BÁO CÁO THỰC THU THEO NGÀY', `${filters} · Kỳ trước ${ddmmyyyy(prevRange.from)} – ${ddmmyyyy(prevRange.to)}`, DAY_COLUMNS, rows, {
              date: '',
              label: 'Tổng cộng',
              amount: data.total,
              previous: data.previousTotal,
              previousDate: null,
            }),
            excelSheet(
              'Theo nhóm dịch vụ',
              'THỰC THU THEO NHÓM DỊCH VỤ',
              filters,
              [
                { header: 'Nhóm', value: (r: GroupRow) => r.label, width: 20 },
                { header: 'Thực thu', value: (r) => r.amount, width: 16 },
                { header: 'Tỉ trọng (%)', value: (r) => r.share, format: '0.0', width: 14 },
              ],
              groupRows,
              { label: 'Tổng cộng', amount: data.total, share: 100 }
            ),
            excelSheet(
              'Theo phương thức',
              'THỰC THU THEO PHƯƠNG THỨC',
              filters,
              [
                { header: 'Phương thức', value: (r: MethodRow) => r.label, width: 18 },
                { header: 'Số phiếu', value: (r) => r.count, width: 12 },
                { header: 'Thực thu', value: (r) => r.amount, width: 16 },
                { header: 'Tỉ trọng (%)', value: (r) => r.share, format: '0.0', width: 14 },
              ],
              methodRows,
              { label: 'Tổng cộng', count: data.receiptCount, amount: data.total, share: 100 }
            ),
          ]}
        />
      </TabToolbar>

      {empty ? (
        <Card>
          <EmptyState icon={ChartColumn} title="Chưa có phiếu thu trong kỳ" description="Chọn khoảng ngày khác để xem thực thu." />
        </Card>
      ) : (
        <>
          <ChartCard title="Thực thu theo ngày" description="Cột: thực thu trong kỳ. Đường nét đứt: ngày tương ứng của kỳ trước.">
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-72 w-full"
              aria-label="Biểu đồ cột thực thu theo ngày, kèm đường thực thu kỳ trước"
            >
              <ComposedChart data={rows} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDateKey} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis tickFormatter={compactVnd} tickLine={false} axisLine={false} width={56} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => {
                        const date = String(payload?.[0]?.payload?.date ?? '')
                        return date ? `${weekdayShort(isoWeekdayOf(date))}, ${ddmmyyyy(date)}` : ''
                      }}
                      formatter={(value, name, item) => (
                        <div className="flex w-full items-center gap-2">
                          <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: `var(--color-${String(name)})` }} aria-hidden="true" />
                          <span className="text-muted-foreground">
                            {name === 'previous' && item?.payload?.previousDate
                              ? `Kỳ trước (${shortDateKey(String(item.payload.previousDate))})`
                              : chartConfig[name as keyof typeof chartConfig]?.label}
                          </span>
                          <span className="ml-auto pl-3 font-medium tabular-nums">{formatVnd(Number(value))}</span>
                        </div>
                      )}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="amount" fill="var(--color-amount)" radius={[3, 3, 0, 0]} maxBarSize={28} />
                <Line
                  dataKey="previous"
                  type="monotone"
                  stroke="var(--color-previous)"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  strokeOpacity={0.75}
                  dot={false}
                  connectNulls
                />
              </ComposedChart>
            </ChartContainer>
          </ChartCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Theo nhóm dịch vụ" description="Khám, thủ thuật, cận lâm sàng, thuốc">
              <Breakdown
                format={formatVnd}
                items={data.byGroup.map((g) => ({
                  key: g.group,
                  label: revenueGroupLabels[g.group],
                  value: g.amount,
                  color: GROUP_COLORS[g.group],
                }))}
              />
            </ChartCard>
            <ChartCard title="Theo phương thức" description="Tiền mặt, chuyển khoản, thẻ">
              <Breakdown
                format={formatVnd}
                items={data.byMethod.map((m) => ({
                  key: m.method,
                  label: paymentMethodLabels[m.method],
                  sub: `${formatNumber(m.count, 0)} phiếu`,
                  value: m.amount,
                  color: METHOD_COLORS[m.method],
                }))}
              />
            </ChartCard>
          </div>

          <TableCard minWidth={560} scroll>
            <TableHeader className="bg-muted sticky top-0 z-10">
              <TableRow className="text-xs uppercase hover:bg-transparent">
                <TableHead>Ngày</TableHead>
                <TableHead className="text-right">Thực thu</TableHead>
                <TableHead className="text-right">Kỳ trước (ngày tương ứng)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d.date} className={cn(d.amount === 0 && 'text-muted-foreground')}>
                  <TableCell className="tabular-nums">
                    <span className="text-muted-foreground mr-1.5 inline-block w-7 text-xs">{weekdayShort(isoWeekdayOf(d.date))}</span>
                    {ddmmyyyy(d.date)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatVnd(d.amount)}</TableCell>
                  <TableCell className="text-muted-foreground text-right tabular-nums">
                    {d.previous === null ? '—' : formatVnd(d.previous)}
                    {d.previousDate && <span className="ml-1.5 text-xs">({shortDateKey(d.previousDate)})</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <tfoot className="bg-muted sticky bottom-0 border-t font-semibold">
              <TableRow className="hover:bg-transparent">
                <TableCell>Tổng cộng</TableCell>
                <TableCell className="text-right tabular-nums">{formatVnd(data.total)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatVnd(data.previousTotal)}</TableCell>
              </TableRow>
            </tfoot>
          </TableCard>
        </>
      )}
    </div>
  )
}
