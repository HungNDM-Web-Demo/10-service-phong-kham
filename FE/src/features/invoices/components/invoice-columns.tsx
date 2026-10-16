'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { ChevronRight, HandCoins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InvoiceStatusBadge } from '@/features/clinic/components/ClinicBadges'
import { vnDateKey, vnDdMmYyyy, vnHhmm, vnToday } from '@/features/clinic/lib/vn-time'
import { formatPhone, formatVnd } from '@/lib/format'
import type { InvoiceListItem } from '@/types/clinic'

/** Cột dùng chung cho các tab phiếu thanh toán (SCR-14). */

export function PatientCell({ name, code, phone }: { name: string; code: string; phone?: string }) {
  return (
    <div className="min-w-0 leading-tight">
      <p className="truncate font-medium">{name}</p>
      <p className="text-muted-foreground text-xs tabular-nums">
        {code}
        {phone ? ` · ${formatPhone(phone)}` : ''}
      </p>
    </div>
  )
}

/** "08:45" nếu hôm nay, "08:45 · 14/10/2026" nếu ngày khác */
export function TimeCell({ iso }: { iso: string }) {
  const today = vnDateKey(iso) === vnToday()
  return (
    <div className="leading-tight tabular-nums">
      <p className="font-medium">{vnHhmm(iso)}</p>
      <p className="text-muted-foreground text-xs">{today ? 'Hôm nay' : vnDdMmYyyy(iso)}</p>
    </div>
  )
}

const money = (value: number, strong = false) => <span className={strong ? 'font-semibold tabular-nums' : 'tabular-nums'}>{formatVnd(value)}</span>

type Options = {
  /** Cột Đã thu, Còn nợ, Trạng thái (tab Còn nợ, Phiếu thanh toán) */
  detailed: boolean
  canCollect: boolean
  onOpen: (id: string) => void
}

export function invoiceColumns({ detailed, canCollect, onOpen }: Options): ColumnDef<InvoiceListItem>[] {
  const cols: ColumnDef<InvoiceListItem>[] = [
    ...(detailed
      ? []
      : [
          {
            id: 'ticket',
            header: 'STT',
            cell: ({ row }) => <span className="font-semibold whitespace-nowrap tabular-nums">{row.original.ticket ?? '—'}</span>,
          } satisfies ColumnDef<InvoiceListItem>,
        ]),
    {
      id: 'createdAt',
      header: detailed ? 'Ngày lập' : 'Kết thúc khám',
      enableSorting: detailed,
      cell: ({ row }) => <TimeCell iso={row.original.createdAt} />,
    },
    {
      id: 'code',
      header: 'Phiếu',
      cell: ({ row }) => (
        <div className="leading-tight">
          <p className="font-mono text-[0.8125rem] font-medium">{row.original.code}</p>
          <p className="text-muted-foreground font-mono text-xs">{row.original.visitCode}</p>
        </div>
      ),
    },
    {
      id: 'patient',
      header: 'Bệnh nhân',
      cell: ({ row }) => <PatientCell name={row.original.patientName} code={row.original.patientCode} phone={row.original.patientPhone} />,
    },
    { id: 'doctor', header: 'Bác sĩ', cell: ({ row }) => <span className="text-sm">{row.original.doctorName}</span> },
    {
      id: 'total',
      header: 'Phải thu',
      enableSorting: detailed,
      meta: { className: 'text-right', headerClassName: 'text-right' },
      cell: ({ row }) => money(row.original.total, !detailed),
    },
  ]
  if (detailed) {
    cols.push(
      {
        id: 'paid',
        header: 'Đã thu',
        meta: { className: 'text-right', headerClassName: 'text-right' },
        cell: ({ row }) => money(row.original.paid),
      },
      {
        id: 'debt',
        header: 'Còn nợ',
        meta: { className: 'text-right', headerClassName: 'text-right' },
        cell: ({ row }) =>
          row.original.debt > 0 ? (
            <span className="text-destructive font-semibold tabular-nums">{formatVnd(row.original.debt)}</span>
          ) : (
            <span className="text-muted-foreground tabular-nums">{formatVnd(0)}</span>
          ),
      },
      { id: 'status', header: 'Trạng thái', cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} /> }
    )
  }
  cols.push({
    id: 'actions',
    header: () => <span className="sr-only">Thao tác</span>,
    meta: { className: 'w-28 text-right' },
    cell: ({ row }) => {
      const open = row.original.status === 'ChoThu' || row.original.status === 'ThuMotPhan'
      if (canCollect && open)
        return (
          <Button
            size="sm"
            variant={row.original.paid > 0 ? 'outline' : 'cta'}
            onClick={(e) => {
              e.stopPropagation()
              onOpen(row.original.id)
            }}
          >
            <HandCoins aria-hidden="true" />
            {row.original.paid > 0 ? 'Thu nợ' : 'Thu tiền'}
          </Button>
        )
      return <ChevronRight className="text-muted-foreground ml-auto size-4" aria-hidden="true" />
    },
  })
  return cols
}
