import { Star } from 'lucide-react'
import type { QueueTicketDto } from '@/types/clinic'
import { vnHhmmDate } from '@/features/clinic/lib/vn-time'

/**
 * Nội dung phiếu số thứ tự khổ 80 mm (SCR-07, UC-05 bước 5, TC-18): phòng khám, STT "P1 - 005" giống màn hình sảnh,
 * phòng, bác sĩ, bệnh nhân, ưu tiên (BR-10), giờ tiếp đón, số người chờ trước. Chỉ đen trắng cho máy in nhiệt.
 */
export function QueueTicketReceipt({ ticket: t }: { ticket: QueueTicketDto }) {
  return (
    <div className="text-center">
      <p className="text-[15px] leading-snug font-bold uppercase">{t.clinicName}</p>
      {t.clinicAddress && <p>{t.clinicAddress}</p>}
      {t.hotline && <p>Hotline: {t.hotline}</p>}
      <hr className="receipt-sep" />

      <p className="text-[14px] font-bold tracking-wide">PHIẾU SỐ THỨ TỰ</p>
      <p className="mt-1 text-[13px] font-semibold uppercase">{t.room}</p>
      <p className="my-1 text-[44px] leading-none font-extrabold whitespace-nowrap tabular-nums">{t.ticket}</p>
      <p className="text-[13px] font-semibold">{t.doctorName}</p>
      {t.isPriority && (
        <p className="mt-2 inline-flex items-center gap-1 rounded-sm border-2 border-current px-2 py-0.5 text-[13px] font-bold">
          <Star className="size-3.5 fill-current" aria-hidden="true" />
          ƯU TIÊN{t.priorityReason ? `: ${t.priorityReason}` : ''}
        </p>
      )}
      <hr className="receipt-sep" />

      <div className="space-y-0.5 text-left">
        <Line label="Bệnh nhân:" value={<b>{t.patientName}</b>} />
        <Line label="Mã bệnh nhân:" value={t.patientCode} />
        <Line label="Mã lượt khám:" value={t.code} />
        <Line label="Giờ tiếp đón:" value={vnHhmmDate(t.checkedInAt)} />
      </div>
      <hr className="receipt-sep" />

      <p className="text-[15px] font-bold">{t.waitingAhead > 0 ? `Trước bạn còn ${t.waitingAhead} người` : 'Trước bạn không còn ai chờ'}</p>
      <p className="mt-1 font-semibold">Vui lòng chờ gọi số trên màn hình</p>
      <p>Lỡ lượt gọi, vui lòng báo lễ tân.</p>
      <hr className="receipt-sep" />
      <p>Bản demo – dữ liệu minh họa, không có giá trị y khoa</p>
    </div>
  )
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="shrink-0">{label}</span>
      <span className="min-w-0 text-right break-words">{value}</span>
    </div>
  )
}
