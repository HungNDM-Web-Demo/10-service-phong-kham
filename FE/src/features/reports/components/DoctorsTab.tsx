'use client'

import { useState } from 'react'
import { Stethoscope } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Card } from '@/components/ui/card'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useDoctorReport } from '@/features/clinic/hooks/use-clinic'
import { formatNumber, formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DoctorReportRow } from '@/types/clinic'
import { periodText, type DateRange } from '../lib/date-range'
import { excelFileName, excelSheet, type ExcelColumn } from '../lib/export-excel'
import { DoctorFilter, reportQuery, SpecialtyFilter } from './ReportFilters'
import { ChartCard, ExportButton, minutesText, Stat, TabLoading, TableCard, TabToolbar } from './ReportParts'

const chartConfig = {
  visits: { label: 'Lượt khám xong', color: 'var(--chart-1)' },
  newPatients: { label: 'Bệnh nhân mới', color: 'var(--chart-3)' },
} satisfies ChartConfig

type Row = Partial<DoctorReportRow>

const COLUMNS: ExcelColumn<Row>[] = [
  { header: 'Bác sĩ', value: (r) => r.displayName, width: 28 },
  { header: 'Chuyên khoa', value: (r) => r.specialtyName, width: 20 },
  { header: 'Lượt khám xong', value: (r) => r.visits, width: 16 },
  { header: 'Bệnh nhân mới', value: (r) => r.newPatients, width: 16 },
  { header: 'Doanh thu dịch vụ chỉ định', value: (r) => r.revenue, width: 26 },
  { header: 'Chờ trung bình (phút)', value: (r) => r.avgWaitMinutes, format: '0', width: 20 },
]

/**
 * Tab Theo bác sĩ (UC-15 bước 4; FR-39, BR-13): số lượt khám xong, bệnh nhân mới, doanh thu dịch vụ do bác sĩ chỉ định
 * (phí khám + dịch vụ, không gồm thuốc), thời gian chờ trung bình. Lọc theo chuyên khoa, bác sĩ.
 */
export function DoctorsTab({ range }: { range: DateRange }) {
  const [specialtyId, setSpecialtyId] = useState<string | undefined>()
  const [doctorId, setDoctorId] = useState<string | undefined>()
  const report = useDoctorReport(reportQuery({ ...range, specialtyId, doctorId }))
  const data = report.data

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <SpecialtyFilter
        value={specialtyId}
        onChange={(v) => {
          setSpecialtyId(v)
          setDoctorId(undefined)
        }}
      />
      <DoctorFilter value={doctorId} onChange={setDoctorId} specialtyId={specialtyId} />
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
        <TabLoading cards={3} />
      </div>
    )

  const rows = data.rows
  const sum = rows.reduce((s, r) => ({ visits: s.visits + r.visits, newPatients: s.newPatients + r.newPatients, revenue: s.revenue + r.revenue }), {
    visits: 0,
    newPatients: 0,
    revenue: 0,
  })
  const chartData = rows.map((r) => ({ ...r, short: r.displayName.replace(/^BS\.\s*/, '').split(' ').slice(-2).join(' ') }))

  return (
    <div className={cn('space-y-4 transition-opacity', report.isFetching && 'opacity-70')}>
      {toolbar}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Lượt khám xong" value={formatNumber(sum.visits, 0)} sub={`${rows.length} bác sĩ`} />
        <Stat label="Bệnh nhân mới" value={formatNumber(sum.newPatients, 0)} sub="Lượt khám đầu tiên của bệnh nhân" />
        <Stat label="Doanh thu dịch vụ chỉ định" value={formatVnd(sum.revenue)} sub="Phí khám và dịch vụ, không gồm thuốc" />
      </div>

      <TabToolbar title="Theo bác sĩ">
        <ExportButton
          fileName={excelFileName('Báo cáo theo bác sĩ', data.from, data.to)}
          disabled={!rows.length}
          build={() => [
            excelSheet('Theo bác sĩ', 'BÁO CÁO THEO BÁC SĨ', periodText(data), COLUMNS, rows, { displayName: 'Tổng cộng', ...sum }),
          ]}
        />
      </TabToolbar>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={Stethoscope} title="Không có bác sĩ phù hợp bộ lọc" description="Bỏ lọc chuyên khoa hoặc bác sĩ để xem toàn bộ." />
        </Card>
      ) : (
        <>
          <TableCard minWidth={820}>
            <TableHeader className="bg-muted/50">
              <TableRow className="text-xs uppercase hover:bg-transparent">
                <TableHead>Bác sĩ</TableHead>
                <TableHead className="text-right">Lượt khám xong</TableHead>
                <TableHead className="text-right">BN mới</TableHead>
                <TableHead className="text-right">Doanh thu dịch vụ</TableHead>
                <TableHead className="text-right">Chờ trung bình</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.doctorId}>
                  <TableCell>
                    <p className="font-medium">{r.displayName}</p>
                    <p className="text-muted-foreground text-xs">{r.specialtyName}</p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(r.visits, 0)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(r.newPatients, 0)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatVnd(r.revenue)}</TableCell>
                  <TableCell className="text-right tabular-nums">{minutesText(r.avgWaitMinutes)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <tfoot className="bg-muted border-t font-semibold">
              <TableRow className="hover:bg-transparent">
                <TableCell>Tổng cộng</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(sum.visits, 0)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(sum.newPatients, 0)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatVnd(sum.revenue)}</TableCell>
                <TableCell />
              </TableRow>
            </tfoot>
          </TableCard>
          <p className="text-muted-foreground text-xs">
            Thời gian chờ = giờ bắt đầu khám lần đầu − giờ xếp hàng ban đầu, chỉ tính lượt đã được gọi khám (BR-13).
          </p>

          <ChartCard title="Lượt khám và bệnh nhân mới theo bác sĩ">
            <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full" aria-label="Biểu đồ cột số lượt khám xong và bệnh nhân mới của từng bác sĩ">
              <BarChart data={chartData} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="short" tickLine={false} axisLine={false} interval={0} />
                <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                <ChartTooltip
                  content={<ChartTooltipContent labelFormatter={(_, payload) => String(payload?.[0]?.payload?.displayName ?? '')} />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="visits" fill="var(--color-visits)" radius={[3, 3, 0, 0]} maxBarSize={36} />
                <Bar dataKey="newPatients" fill="var(--color-newPatients)" radius={[3, 3, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ChartContainer>
          </ChartCard>
        </>
      )}
    </div>
  )
}
