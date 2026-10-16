'use client'

import { useState } from 'react'
import { BellRing } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Card } from '@/components/ui/card'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useFollowUpReport } from '@/features/clinic/hooks/use-clinic'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { FollowUpDoctorRow } from '@/types/clinic'
import { periodText, type DateRange } from '../lib/date-range'
import { excelFileName, excelSheet, type ExcelColumn } from '../lib/export-excel'
import { DoctorFilter, reportQuery } from './ReportFilters'
import { ChartCard, ExportButton, formatPercent, ratePercent, Stat, TabLoading, TableCard, TabToolbar } from './ReportParts'

const chartConfig = {
  returned: { label: 'Đã quay lại', color: 'var(--chart-3)' },
  overdue: { label: 'Quá hạn', color: 'var(--chart-2)' },
  others: { label: 'Đang theo dõi', color: 'var(--chart-1)' },
} satisfies ChartConfig

type Row = Partial<FollowUpDoctorRow>

const COLUMNS: ExcelColumn<Row>[] = [
  { header: 'Bác sĩ', value: (r) => r.displayName, width: 28 },
  { header: 'Số dòng nhắc', value: (r) => r.total, width: 14 },
  { header: 'Đã quay lại', value: (r) => r.returned, width: 14 },
  { header: 'Quá hạn', value: (r) => r.overdue, width: 12 },
  {
    header: 'Đã quay lại / tổng (%)',
    value: (r) => (r.total ? ratePercent(r.returned ?? 0, r.total) : null),
    format: '0.0',
    width: 22,
  },
]

/**
 * Tab Tái khám (UC-15 bước 4; FR-39, BR-31): dòng nhắc có ngày hẹn trong kỳ — tổng, đã nhắc, đã quay lại, quá hạn;
 * tỉ lệ quay lại = Đã quay lại / số dòng có ngày hẹn đã quá 7 ngày. Lọc theo bác sĩ.
 */
export function FollowUpsTab({ range }: { range: DateRange }) {
  const [doctorId, setDoctorId] = useState<string | undefined>()
  const report = useFollowUpReport(reportQuery({ ...range, doctorId }))
  const data = report.data

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <DoctorFilter value={doctorId} onChange={setDoctorId} id="follow-up-doctor" />
      <p className="text-muted-foreground text-xs">Khoảng ngày áp dụng theo ngày hẹn tái khám.</p>
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

  const rows = data.byDoctor
  const chartData = rows.map((r) => ({
    ...r,
    others: Math.max(0, r.total - r.returned - r.overdue),
    short: r.displayName.replace(/^BS\.\s*/, '').split(' ').slice(-2).join(' '),
  }))

  return (
    <div className={cn('space-y-4 transition-opacity', report.isFetching && 'opacity-70')}>
      {toolbar}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Dòng nhắc tái khám" value={formatNumber(data.total, 0)} />
        <Stat label="Đã nhắc" value={formatNumber(data.reminded, 0)} sub="Đã gửi tin hoặc đã gọi" />
        <Stat label="Đã quay lại" value={formatNumber(data.returned, 0)} tone="success" />
        <Stat label="Quá hạn" value={formatNumber(data.overdue, 0)} tone={data.overdue > 0 ? 'destructive' : undefined} sub="Quá 7 ngày chưa đến" />
        <Stat
          label="Tỉ lệ quay lại"
          value={formatPercent(data.returnRate)}
          sub={data.closed > 0 ? `Trên ${formatNumber(data.closed, 0)} dòng đã quá ngày hẹn 7 ngày` : 'Chưa có dòng nào quá ngày hẹn 7 ngày'}
        />
      </div>

      <TabToolbar title="Theo bác sĩ hẹn">
        <ExportButton
          fileName={excelFileName('Báo cáo tái khám', data.from, data.to)}
          disabled={!rows.length}
          build={() => [
            excelSheet(
              'Tái khám theo bác sĩ',
              'BÁO CÁO TÁI KHÁM',
              `${periodText(data)} (theo ngày hẹn) · Tỉ lệ quay lại ${formatPercent(data.returnRate)}`,
              COLUMNS,
              rows,
              { displayName: 'Tổng cộng', total: data.total, returned: data.returned, overdue: data.overdue }
            ),
          ]}
        />
      </TabToolbar>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={BellRing} title="Không có lịch hẹn tái khám trong kỳ" description="Chọn khoảng ngày hoặc bác sĩ khác." />
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <TableCard minWidth={520}>
            <TableHeader className="bg-muted/50">
              <TableRow className="text-xs uppercase hover:bg-transparent">
                <TableHead>Bác sĩ</TableHead>
                <TableHead className="text-right">Dòng nhắc</TableHead>
                <TableHead className="text-right">Đã quay lại</TableHead>
                <TableHead className="text-right">Quá hạn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.doctorId}>
                  <TableCell className="font-medium">{r.displayName}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(r.total, 0)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(r.returned, 0)}
                    <span className="text-muted-foreground ml-1.5 text-xs">({formatPercent(ratePercent(r.returned, r.total))})</span>
                  </TableCell>
                  <TableCell className={cn('text-right tabular-nums', r.overdue > 0 && 'text-destructive')}>{formatNumber(r.overdue, 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <tfoot className="bg-muted border-t font-semibold">
              <TableRow className="hover:bg-transparent">
                <TableCell>Tổng cộng</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(data.total, 0)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(data.returned, 0)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(data.overdue, 0)}</TableCell>
              </TableRow>
            </tfoot>
          </TableCard>

          <ChartCard title="Kết quả nhắc theo bác sĩ" description="Cột chồng: đã quay lại, quá hạn, đang theo dõi">
            <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full" aria-label="Biểu đồ cột chồng kết quả nhắc tái khám của từng bác sĩ">
              <BarChart data={chartData} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="short" tickLine={false} axisLine={false} interval={0} />
                <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                <ChartTooltip
                  content={<ChartTooltipContent labelFormatter={(_, payload) => String(payload?.[0]?.payload?.displayName ?? '')} />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="returned" stackId="f" fill="var(--color-returned)" maxBarSize={40} />
                <Bar dataKey="overdue" stackId="f" fill="var(--color-overdue)" maxBarSize={40} />
                <Bar dataKey="others" stackId="f" fill="var(--color-others)" radius={[3, 3, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ChartContainer>
          </ChartCard>
        </div>
      )}
    </div>
  )
}
