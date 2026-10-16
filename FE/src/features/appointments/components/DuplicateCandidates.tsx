'use client'

import { AlertTriangle, Loader2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPhone } from '@/lib/format'
import type { PatientBrief } from '@/types/clinic'
import { ddmmyyyy } from '@/features/clinic/lib/vn-time'

type DuplicateCandidatesProps = {
  candidates: PatientBrief[]
  onUse: (patient: PatientBrief) => void
  onForce: () => void
  pending?: boolean
}

/** Máy chủ báo trùng hồ sơ (409 TrungHoSo, BR-14): dùng hồ sơ có sẵn hoặc vẫn tạo hồ sơ mới. */
export function DuplicateCandidates({ candidates, onUse, onForce, pending }: DuplicateCandidatesProps) {
  return (
    <div role="alert" className="border-warning/40 bg-warning/10 space-y-2 rounded-lg border p-3 text-sm">
      <p className="text-warning flex items-center gap-1.5 font-medium">
        <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
        Có thể trùng hồ sơ: cùng số điện thoại và ngày sinh
      </p>
      <ul className="space-y-1">
        {candidates.map((p) => (
          <li key={p.id} className="bg-background flex flex-wrap items-center justify-between gap-2 rounded-md border px-2.5 py-1.5">
            <span className="min-w-0">
              <b>{p.fullName}</b>{' '}
              <span className="text-muted-foreground tabular-nums">
                · {p.code} · {formatPhone(p.phone)} · {ddmmyyyy(p.birthDate)}
              </span>
            </span>
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => onUse(p)}>
              Dùng hồ sơ này
            </Button>
          </li>
        ))}
      </ul>
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={onForce}>
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <UserPlus aria-hidden="true" />}
        Vẫn tạo hồ sơ mới
      </Button>
    </div>
  )
}
