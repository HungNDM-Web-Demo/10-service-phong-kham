'use client'

import { Ban } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Card } from '@/components/ui/card'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCancelledReceiptReport } from '@/features/clinic/hooks/use-clinic'
import { paymentMethodLabels } from '@/features/clinic/lib/labels'
import { vnHhmmDate } from '@/features/clinic/lib/vn-time'
import { formatNumber, formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CancelledReceiptRow } from '@/types/clinic'
import { periodText, type DateRange } from '../lib/date-range'
import { excelFileName, excelSheet, type ExcelColumn } from '../lib/export-excel'
import { ExportButton, Stat, TabLoading, TableCard, TabToolbar } from './ReportParts'

type Row = Partial<CancelledReceiptRow>

const COLUMNS: ExcelColumn<Row>[] = [
  { header: 'Mã phiếu thu', value: (r) => r.code, width: 16 },
  { header: 'Phiếu thanh toán', value: (r) => r.invoiceCode, width: 16 },
  { header: 'Bệnh nhân', value: (r) => r.patientName, width: 26 },
  { header: 'Số tiền', value: (r) => r.amount, width: 14 },
  { header: 'Phương thức', value: (r) => (r.method ? paymentMethodLabels[r.method] : null), width: 14 },
  { header: 'Thời điểm thu', value: (r) => (r.collectedAt ? vnHhmmDate(r.collectedAt) : null), width: 18 },
  { header: 'Người thu', value: (r) => r.collectedByName, width: 20 },
  { header: 'Thời điểm hủy', value: (r) => (r.cancelledAt ? vnHhmmDate(r.cancelledAt) : null), width: 18 },
  { header: 'Người hủy', value: (r) => r.cancelledByName, width: 20 },
  { header: 'Lý do hủy', value: (r) => r.cancelReason, width: 32 },
]

/** Tab Phiếu thu đã hủy (UC-15 bước 4; FR-35, BR-27, BR-31): theo ngày hủy, kèm người hủy và lý do; không tính vào thực thu. */
export function CancelledReceiptsTab({ range }: { range: DateRange }) {
  const report = useCancelledReceiptReport(range)
  const data = report.data

  if (report.error && !data) return <ErrorState error={report.error} onRetry={() => void report.refetch()} />
  if (!data) return <TabLoading cards={2} />

  const rows = data.rows

  return (
    <div className={cn('space-y-4 transition-opacity', report.isFetching && 'opacity-70')}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Phiếu thu đã hủy" value={formatNumber(rows.length, 0)} />
        <Stat label="Tổng tiền đã hủy" value={formatVnd(data.total)} sub="Không tính vào thực thu" />
      </div>

      <TabToolbar title="Phiếu thu đã hủy theo ngày hủy">
        <ExportButton
          fileName={excelFileName('Báo cáo phiếu thu đã hủy', range.from, range.to)}
          disabled={!rows.length}
          build={() => [
            excelSheet('Phiếu thu đã hủy', 'BÁO CÁO PHIẾU THU ĐÃ HỦY', `${periodText(range)} (theo ngày hủy)`, COLUMNS, rows, {
              patientName: 'Tổng cộng',
              amount: data.total,
            }),
          ]}
        />
      </TabToolbar>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={Ban} title="Không có phiếu thu bị hủy trong kỳ" description="Phiếu thu bị quản lý hủy sẽ hiện ở đây kèm người hủy và lý do." />
        </Card>
      ) : (
        <TableCard minWidth={1000} scroll>
          <TableHeader className="bg-muted sticky top-0 z-10">
            <TableRow className="text-xs uppercase hover:bg-transparent">
              <TableHead>Phiếu thu</TableHead>
              <TableHead>Bệnh nhân</TableHead>
              <TableHead className="text-right">Số tiền</TableHead>
              <TableHead>Thu</TableHead>
              <TableHead>Hủy</TableHead>
              <TableHead>Lý do</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <p className="font-mono text-[0.8125rem] font-medium">{r.code}</p>
                  <p className="text-muted-foreground font-mono text-xs">{r.invoiceCode}</p>
                </TableCell>
                <TableCell className="font-medium">{r.patientName}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <p className="font-semibold">{formatVnd(r.amount)}</p>
                  <p className="text-muted-foreground text-xs">{paymentMethodLabels[r.method]}</p>
                </TableCell>
                <TableCell className="text-sm">
                  <p className="tabular-nums">{vnHhmmDate(r.collectedAt)}</p>
                  <p className="text-muted-foreground text-xs">{r.collectedByName}</p>
                </TableCell>
                <TableCell className="text-sm">
                  <p className="tabular-nums">{vnHhmmDate(r.cancelledAt)}</p>
                  <p className="text-muted-foreground text-xs">{r.cancelledByName}</p>
                </TableCell>
                <TableCell className="max-w-64 text-sm whitespace-normal">{r.cancelReason}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <tfoot className="bg-muted sticky bottom-0 border-t font-semibold">
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={2}>Tổng cộng ({formatNumber(rows.length, 0)} phiếu)</TableCell>
              <TableCell className="text-right tabular-nums">{formatVnd(data.total)}</TableCell>
              <TableCell colSpan={3} />
            </TableRow>
          </tfoot>
        </TableCard>
      )}
    </div>
  )
}
