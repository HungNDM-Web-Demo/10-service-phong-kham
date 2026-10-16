'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Wallet } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { permissions } from '@/config/permissions'
import { routePath } from '@/config/route-path'
import { useDebtReport } from '@/features/clinic/hooks/use-clinic'
import { ddmmyyyy, vnToday } from '@/features/clinic/lib/vn-time'
import { usePermissions } from '@/hooks/use-permissions'
import { formatNumber, formatPhone, formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DebtReportRow } from '@/types/clinic'
import { excelFileName, excelSheet, type ExcelColumn } from '../lib/export-excel'
import { DoctorFilter } from './ReportFilters'
import { ExportButton, Stat, TabLoading, TableCard, TabToolbar } from './ReportParts'

const MIN_DAY_OPTIONS = [
  { value: 0, label: 'Mọi khoản nợ' },
  { value: 7, label: 'Nợ từ 7 ngày' },
  { value: 15, label: 'Nợ từ 15 ngày' },
  { value: 30, label: 'Nợ từ 30 ngày' },
  { value: 60, label: 'Nợ từ 60 ngày' },
  { value: 90, label: 'Nợ từ 90 ngày' },
]

type Row = Partial<DebtReportRow>

const COLUMNS: ExcelColumn<Row>[] = [
  { header: 'Mã BN', value: (r) => r.patientCode, width: 12 },
  { header: 'Bệnh nhân', value: (r) => r.patientName, width: 26 },
  { header: 'Số điện thoại', value: (r) => r.patientPhone, width: 14 },
  { header: 'Số phiếu', value: (r) => r.invoiceCount, width: 10 },
  { header: 'Tổng nợ', value: (r) => r.debt, width: 16 },
  { header: 'Ngày phát sinh cũ nhất', value: (r) => (r.oldestDate ? ddmmyyyy(r.oldestDate) : null), width: 22 },
  { header: 'Số ngày nợ', value: (r) => r.days, width: 12 },
  { header: 'Bác sĩ', value: (r) => r.doctorNames, width: 30 },
]

/** Nợ lâu: chữ kèm màu, không chỉ dựa vào màu */
function AgeBadge({ days }: { days: number }) {
  if (days >= 60) return <StatusBadge tone="danger">{days} ngày</StatusBadge>
  if (days >= 30) return <StatusBadge tone="warning">{days} ngày</StatusBadge>
  return <StatusBadge tone="neutral">{days === 0 ? 'Hôm nay' : `${days} ngày`}</StatusBadge>
}

/**
 * Tab Công nợ (UC-15 bước 4; FR-38): bệnh nhân còn nợ, số phiếu, tổng nợ, ngày phát sinh cũ nhất; lọc theo bác sĩ và
 * số ngày nợ tối thiểu. Tính tới hôm nay, không theo khoảng ngày.
 */
export function DebtsTab() {
  const { can } = usePermissions()
  const canViewPatient = can(permissions.patients.view)
  const [doctorId, setDoctorId] = useState<string | undefined>()
  const [minDays, setMinDays] = useState(0)
  const report = useDebtReport({ ...(doctorId ? { doctorId } : {}), ...(minDays > 0 ? { minDays } : {}) })
  const data = report.data

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <DoctorFilter value={doctorId} onChange={setDoctorId} id="debt-doctor" />
      <div className="flex items-center gap-2">
        <Label htmlFor="debt-min-days" className="text-muted-foreground shrink-0 text-sm font-normal">
          Số ngày nợ
        </Label>
        <Select value={String(minDays)} onValueChange={(v) => setMinDays(Number(v))}>
          <SelectTrigger id="debt-min-days" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MIN_DAY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={String(o.value)}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-muted-foreground text-xs">Công nợ tính tới hôm nay, không theo khoảng ngày.</p>
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

  const rows = data.rows
  const invoiceCount = rows.reduce((s, r) => s + r.invoiceCount, 0)
  const oldest = rows.reduce((m, r) => Math.max(m, r.days), 0)
  const filterText = [
    `Tính tới ${ddmmyyyy(vnToday())}`,
    minDays > 0 ? `nợ từ ${minDays} ngày` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className={cn('space-y-4 transition-opacity', report.isFetching && 'opacity-70')}>
      {toolbar}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Tổng công nợ" value={formatVnd(data.total)} tone={data.total > 0 ? 'destructive' : undefined} />
        <Stat label="Bệnh nhân còn nợ" value={formatNumber(data.patientCount, 0)} />
        <Stat label="Số phiếu còn nợ" value={formatNumber(invoiceCount, 0)} sub="Chờ thu hoặc thu một phần" />
        <Stat label="Khoản nợ lâu nhất" value={rows.length ? `${formatNumber(oldest, 0)} ngày` : '—'} />
      </div>

      <TabToolbar title="Danh sách bệnh nhân còn nợ">
        <ExportButton
          fileName={excelFileName('Báo cáo công nợ', vnToday())}
          disabled={!rows.length}
          build={() => [
            excelSheet('Công nợ', 'BÁO CÁO CÔNG NỢ BỆNH NHÂN', filterText, COLUMNS, rows, {
              patientName: 'Tổng cộng',
              invoiceCount,
              debt: data.total,
            }),
          ]}
        />
      </TabToolbar>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={Wallet} title="Không có công nợ phù hợp" description="Mọi phiếu thanh toán đã thu đủ, hoặc đổi bộ lọc để xem thêm." />
        </Card>
      ) : (
        <TableCard minWidth={900} scroll>
          <TableHeader className="bg-muted sticky top-0 z-10">
            <TableRow className="text-xs uppercase hover:bg-transparent">
              <TableHead>Bệnh nhân</TableHead>
              <TableHead className="text-right">Số phiếu</TableHead>
              <TableHead className="text-right">Tổng nợ</TableHead>
              <TableHead>Phát sinh cũ nhất</TableHead>
              <TableHead>Số ngày nợ</TableHead>
              <TableHead>Bác sĩ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.patientId}>
                <TableCell>
                  {canViewPatient ? (
                    <Link href={routePath.patientDetail(r.patientId)} className="text-primary font-medium hover:underline">
                      {r.patientName}
                    </Link>
                  ) : (
                    <p className="font-medium">{r.patientName}</p>
                  )}
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {r.patientCode} · {formatPhone(r.patientPhone)}
                  </p>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(r.invoiceCount, 0)}</TableCell>
                <TableCell className="text-destructive text-right font-semibold tabular-nums">{formatVnd(r.debt)}</TableCell>
                <TableCell className="tabular-nums">{ddmmyyyy(r.oldestDate)}</TableCell>
                <TableCell>
                  <AgeBadge days={r.days} />
                </TableCell>
                <TableCell className="text-muted-foreground max-w-56 text-sm whitespace-normal">{r.doctorNames}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <tfoot className="bg-muted sticky bottom-0 border-t font-semibold">
            <TableRow className="hover:bg-transparent">
              <TableCell>Tổng cộng ({formatNumber(data.patientCount, 0)} bệnh nhân)</TableCell>
              <TableCell className="text-right tabular-nums">{formatNumber(invoiceCount, 0)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatVnd(data.total)}</TableCell>
              <TableCell colSpan={3} />
            </TableRow>
          </tfoot>
        </TableCard>
      )}
    </div>
  )
}
