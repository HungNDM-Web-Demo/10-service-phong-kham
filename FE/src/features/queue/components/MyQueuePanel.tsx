'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, Hourglass, Megaphone, PhoneCall, SkipForward, Stethoscope } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { routePath } from '@/config/route-path'
import { useAwaitResults, useCallNext, useRecall, useSkip } from '@/features/clinic/hooks/use-clinic'
import { genderLabels } from '@/features/clinic/lib/labels'
import { clinicRules } from '@/features/clinic/lib/rules'
import { vnHhmm } from '@/features/clinic/lib/vn-time'
import { getErrorMessage } from '@/lib/api-error'
import type { QueueDoctorDto, QueueVisitDto } from '@/types/clinic'
import { QueueVisitRow } from './QueueVisitRow'

/**
 * Hàng chờ của bác sĩ (UC-06): gọi kế tiếp, gọi lại, bỏ qua, chờ kết quả; bấm vào lượt để mở phiếu khám.
 * Đang có lượt "Đang khám" thì khóa "Gọi kế tiếp" (BR-12).
 */
export function MyQueuePanel({ doctor, onCall }: { doctor: QueueDoctorDto; onCall: (v: QueueVisitDto) => void }) {
  const router = useRouter()
  const callNext = useCallNext()
  const recall = useRecall()
  const skip = useSkip()
  const awaitResults = useAwaitResults()
  const current = doctor.current
  const onError = (e: unknown) => toast.error(getErrorMessage(e))

  const nextButton = (
    <Button
      size="lg"
      variant="cta"
      disabled={!!current || callNext.isPending || doctor.waiting.length === 0}
      onClick={() =>
        callNext.mutate(null, {
          onSuccess: (r) => (r.visit ? toast.success(`Đã gọi số ${r.visit.ticket} · ${r.visit.patientName}`) : toast.info('Không còn bệnh nhân chờ')),
          onError,
        })
      }
    >
      <Megaphone aria-hidden="true" />
      Gọi kế tiếp
    </Button>
  )

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card className="gap-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-semibold">{doctor.room}</p>
              <p className="text-muted-foreground text-sm">
                Đã khám {doctor.doneCount} · Đang chờ {doctor.waiting.length}
                {doctor.avgWaitMinutes !== null && ` · Chờ TB ${doctor.avgWaitMinutes} phút`}
              </p>
            </div>
            {current ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>{nextButton}</span>
                </TooltipTrigger>
                <TooltipContent>Kết thúc khám hoặc chuyển Chờ kết quả trước</TooltipContent>
              </Tooltip>
            ) : (
              nextButton
            )}
          </div>
          {current && <p className="text-muted-foreground text-xs">Kết thúc khám hoặc chuyển Chờ kết quả trước khi gọi người kế tiếp.</p>}
        </Card>

        {current ? (
          <Card className="border-primary/40 gap-3 p-4">
            <div className="flex items-start gap-3">
              <span className="bg-primary text-primary-foreground flex size-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold tabular-nums">
                {current.queueNumber.toString().padStart(3, '0')}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-primary flex items-center gap-1 text-xs font-medium">
                  <Stethoscope className="size-3.5" aria-hidden="true" />
                  Đang khám từ {current.startedAt ? vnHhmm(current.startedAt) : ''}
                </p>
                <p className="truncate text-lg font-semibold">{current.patientName}</p>
                <p className="text-muted-foreground text-sm">
                  {current.patientCode} · {current.age} tuổi · {genderLabels[current.gender]}
                  {current.reason ? ` · ${current.reason}` : ''}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={routePath.visitDetail(current.id)}>
                  <FileText aria-hidden="true" />
                  Mở phiếu khám
                </Link>
              </Button>
              <Button
                variant="outline"
                disabled={recall.isPending}
                onClick={() => recall.mutate(current.id, { onSuccess: () => toast.success(`Đã gọi lại số ${current.ticket}`), onError })}
              >
                <PhoneCall aria-hidden="true" />
                Gọi lại
              </Button>
              <Button
                variant="outline"
                disabled={skip.isPending}
                onClick={() =>
                  skip.mutate(current.id, {
                    onSuccess: (v) =>
                      toast.success(
                        v.status === 'BoVe'
                          ? `Bỏ qua lần thứ ${clinicRules.maxSkips}: lượt ${v.ticket} chuyển Bỏ về`
                          : `Đã bỏ qua ${v.ticket}, chuyển xuống cuối hàng (lần ${v.skipCount})`
                      ),
                    onError,
                  })
                }
              >
                <SkipForward aria-hidden="true" />
                Bỏ qua
              </Button>
              <Button
                variant="outline"
                disabled={awaitResults.isPending}
                onClick={() => awaitResults.mutate(current.id, { onSuccess: () => toast.success('Đã chuyển Chờ kết quả'), onError })}
              >
                <Hourglass aria-hidden="true" />
                Chờ kết quả
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="text-muted-foreground p-6 text-center text-sm">Chưa có bệnh nhân đang khám. Bấm “Gọi kế tiếp” để mời bệnh nhân vào phòng.</Card>
        )}

        {doctor.awaiting.length > 0 && (
          <Card className="gap-2 p-4">
            <p className="text-sm font-medium">Chờ kết quả ({doctor.awaiting.length})</p>
            <ul className="divide-y">
              {doctor.awaiting.map((v) => (
                <QueueVisitRow key={v.id} visit={v} onOpen={() => router.push(routePath.visitDetail(v.id))} />
              ))}
            </ul>
          </Card>
        )}
      </div>

      <Card className="gap-2 p-4">
        <p className="text-sm font-medium">Hàng chờ ({doctor.waiting.length})</p>
        {doctor.waiting.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">Không còn bệnh nhân chờ</p>
        ) : (
          <ul className="divide-y">
            {doctor.waiting.map((v, i) => (
              <QueueVisitRow
                key={v.id}
                visit={v}
                position={i + 1}
                actions={current ? [] : [{ label: 'Gọi người này', onSelect: () => onCall(v) }]}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
