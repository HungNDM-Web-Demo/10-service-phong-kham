'use client'

import { Lock } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FollowUpBadge } from '@/features/clinic/components/ClinicBadges'
import { lineKindLabels } from '@/features/clinic/lib/labels'
import { clinicRules } from '@/features/clinic/lib/rules'
import { formatNumber, formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { InvoiceLineDto } from '@/types/clinic'

type InvoiceLinesTableProps = {
  lines: InvoiceLineDto[]
  /** Dòng thuốc đang tick "Mua ngoài" */
  outside: ReadonlySet<string>
  /** Cho tick "Mua ngoài" (chưa có phiếu thu và có quyền thu, BR-26) */
  canToggle: boolean
  onToggle?: (lineId: string, outside: boolean) => void
  /** Lý do khóa ô "Mua ngoài" hiện dưới bảng (UC-11 E3) */
  lockedReason?: string | null
}

/**
 * Bảng dòng phiếu thanh toán (UC-11 bước 2–3): phí khám (ghi "Tái khám theo hẹn" khi miễn phí, BR-20), dịch vụ kèm vị
 * trí răng "(R16, R26)", hạng mục kế hoạch kèm giảm giá, thuốc. Ô "Mua ngoài" chỉ có ở dòng thuốc; dòng mua ngoài gạch
 * tiền và ghi chữ "Mua ngoài", không tính vào tổng (BR-21, BR-26).
 */
export function InvoiceLinesTable({ lines, outside, canToggle, onToggle, lockedReason }: InvoiceLinesTableProps) {
  const hasMedicine = lines.some((l) => l.kind === 'Thuoc')
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border">
        <Table className="min-w-[640px]">
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground px-3 text-xs font-semibold uppercase">Nội dung</TableHead>
              <TableHead className="text-muted-foreground px-3 text-right text-xs font-semibold uppercase">Đơn giá</TableHead>
              <TableHead className="text-muted-foreground px-3 text-right text-xs font-semibold uppercase">SL</TableHead>
              <TableHead className="text-muted-foreground px-3 text-right text-xs font-semibold uppercase">Giảm</TableHead>
              <TableHead className="text-muted-foreground px-3 text-right text-xs font-semibold uppercase">Thành tiền</TableHead>
              {hasMedicine && (
                <TableHead className="text-muted-foreground w-24 px-3 text-center text-xs font-semibold uppercase">Mua ngoài</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l) => {
              const isOutside = l.kind === 'Thuoc' && outside.has(l.id)
              const checkboxId = `outside-${l.id}`
              return (
                <TableRow key={l.id} className={cn(isOutside && 'bg-muted/40')}>
                  <TableCell className="px-3 py-2 whitespace-normal">
                    <p className="text-muted-foreground text-[0.6875rem] font-medium tracking-wide uppercase">{lineKindLabels[l.kind]}</p>
                    <p className={cn('font-medium', isOutside && 'text-muted-foreground')}>{l.description}</p>
                    {l.note &&
                      (l.note === clinicRules.followUpFreeNote ? (
                        <FollowUpBadge />
                      ) : (
                        <p className="text-muted-foreground text-xs">{l.note}</p>
                      ))}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right tabular-nums">{formatVnd(l.unitPrice)}</TableCell>
                  <TableCell className="px-3 py-2 text-right tabular-nums">{formatNumber(l.quantity, 0)}</TableCell>
                  <TableCell className="px-3 py-2 text-right tabular-nums">
                    {l.discount > 0 ? <span className="text-success">−{formatVnd(l.discount)}</span> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right tabular-nums">
                    {isOutside ? (
                      <span className="flex flex-col items-end">
                        <span className="text-muted-foreground line-through">{formatVnd(l.amount)}</span>
                        <span className="text-muted-foreground text-xs">Không tính</span>
                      </span>
                    ) : (
                      <span className="font-medium">{formatVnd(l.amount)}</span>
                    )}
                  </TableCell>
                  {hasMedicine && (
                    <TableCell className="px-3 py-2 text-center">
                      {l.kind === 'Thuoc' ? (
                        <span className="inline-flex items-center justify-center">
                          <Checkbox
                            id={checkboxId}
                            checked={isOutside}
                            disabled={!canToggle}
                            onCheckedChange={(c) => onToggle?.(l.id, c === true)}
                            aria-label={`Mua ngoài: ${l.description}`}
                          />
                        </span>
                      ) : null}
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {hasMedicine && !canToggle && lockedReason && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Lock className="size-3.5 shrink-0" aria-hidden="true" />
          {lockedReason}
        </p>
      )}
    </div>
  )
}
