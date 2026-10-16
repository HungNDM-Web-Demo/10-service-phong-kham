'use client'

import { CheckCircle2, MessageCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatPhone } from '@/lib/format'
import type { FollowUpDto, SendFollowUpsResult } from '@/types/clinic'
import { vnHhmmDate } from '@/features/clinic/lib/vn-time'

export type SendOutcome = { result: SendFollowUpsResult; rows: Map<string, FollowUpDto> }

/** Kết quả gửi tin nhắc (UC-13 bước 2): từng dòng đã gửi hay chưa, nội dung tin giả lập theo mẫu BR-30. */
export function SendResultDialog({
  outcome,
  onOpenChange,
}: {
  outcome: SendOutcome | null
  onOpenChange: (open: boolean) => void
}) {
  const items = outcome?.result.items ?? []
  const failed = items.filter((i) => !i.sent).length

  return (
    <Dialog open={outcome !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Kết quả gửi tin nhắc</DialogTitle>
          <DialogDescription>
            Đã gửi {outcome?.result.sentCount ?? 0}/{items.length} tin
            {failed > 0 ? `, ${failed} dòng chưa gửi được` : ''}. Tin nhắn giả lập, không gửi ra
            ngoài.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-3">
          {items.map((item) => {
            const row = outcome?.rows.get(item.id)
            return (
              <li key={item.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{row?.patientName ?? 'Dòng nhắc'}</p>
                    {row && (
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {row.patientCode} · {formatPhone(row.patientPhone)}
                      </p>
                    )}
                  </div>
                  {item.sent ? (
                    <span className="text-success inline-flex shrink-0 items-center gap-1 text-sm font-medium">
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      Đã gửi
                    </span>
                  ) : (
                    <span className="text-destructive inline-flex shrink-0 items-center gap-1 text-sm font-medium">
                      <XCircle className="size-4" aria-hidden="true" />
                      Chưa gửi
                    </span>
                  )}
                </div>
                {item.sent && item.message ? (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-muted-foreground flex items-center gap-1.5 text-xs tabular-nums">
                      <MessageCircle className="size-3.5" aria-hidden="true" />
                      {item.message.channel} tới {formatPhone(item.message.phone)} ·{' '}
                      {vnHhmmDate(item.message.sentAt)}
                    </p>
                    <p className="bg-muted rounded-lg rounded-tl-none px-3 py-2 text-sm leading-relaxed">
                      {item.message.content}
                    </p>
                  </div>
                ) : (
                  item.error && <p className="text-destructive mt-2 text-sm">{item.error}</p>
                )}
              </li>
            )
          })}
        </ul>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
