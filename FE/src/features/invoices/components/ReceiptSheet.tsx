import { paymentMethodLabels } from '@/features/clinic/lib/labels'
import { vnHhmmDate } from '@/features/clinic/lib/vn-time'
import { formatPhone } from '@/lib/format'
import type { ClinicProfileDto, ReceiptDto } from '@/types/clinic'
import { vndInWords } from '../lib/money-words'

const money = (v: number) => `${v.toLocaleString('vi-VN')} ₫`

/**
 * Nội dung phiếu thu khổ A5 (SCR-15; UC-11 bước 5, UC-12 bước 2; NFR-05): thông tin phòng khám, mã và ngày phiếu thu,
 * bệnh nhân, bác sĩ, lượt khám, các dòng, tổng, số thu lần này, phương thức, tiền khách đưa, tiền thối, đã thu, còn nợ,
 * người thu. Phiếu đã hủy in chữ "ĐÃ HỦY"; in lại có dòng "IN LẠI". Chỉ dùng đen trắng để in rõ.
 */
export function ReceiptSheet({
  receipt: r,
  clinic,
  reprint,
  printedAt,
}: {
  receipt: ReceiptDto
  clinic: ClinicProfileDto | undefined
  reprint: boolean
  /** Thời điểm mở bản in lại (ms) */
  printedAt: number
}) {
  const cancelled = r.status === 'DaHuy'
  const lines = r.lines
  return (
    <div className="relative">
      {cancelled && (
        <p
          aria-hidden="true"
          className="pointer-events-none absolute top-40 left-1/2 -translate-x-1/2 -rotate-12 rounded border-4 border-current px-6 py-2 text-4xl font-bold tracking-[0.3em] opacity-30"
        >
          ĐÃ HỦY
        </p>
      )}

      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[15px] font-bold uppercase">{clinic?.name ?? ''}</p>
          {clinic?.address && <p>{clinic.address}</p>}
          {clinic?.hotline && <p>Điện thoại: {clinic.hotline}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p>
            Số: <b className="font-mono">{r.code}</b>
          </p>
          <p>Ngày: {vnHhmmDate(r.collectedAt)}</p>
        </div>
      </header>

      <div className="my-4 text-center">
        <p className="text-[18px] font-bold tracking-wide">PHIẾU THU</p>
        {reprint && <p className="mt-1 inline-block border border-current px-3 text-[13px] font-bold tracking-widest">IN LẠI</p>}
        {cancelled && <p className="mt-1 text-[13px] font-bold">(Phiếu đã hủy)</p>}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        <p>
          Bệnh nhân: <b>{r.patient.fullName}</b>
        </p>
        <p>Mã BN: {r.patient.code}</p>
        <p>
          Năm sinh: {r.patient.birthDate.slice(0, 4)} ({r.patient.age} tuổi)
        </p>
        <p>SĐT: {formatPhone(r.patient.phone)}</p>
        <p>Bác sĩ: {r.doctorName}</p>
        <p>Lượt khám: {r.visitCode}</p>
        <p className="col-span-2">Phiếu thanh toán: {r.invoiceCode}</p>
      </div>

      <table className="mt-3">
        <thead>
          <tr>
            <th className="w-6">#</th>
            <th>Nội dung</th>
            <th className="text-right!">SL</th>
            <th className="text-right!">Đơn giá</th>
            <th className="text-right!">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={l.id}>
              <td>{i + 1}</td>
              <td>
                {l.description}
                {l.note && <span className="block text-[11.5px] italic">{l.note}</span>}
                {l.discount > 0 && <span className="block text-[11.5px]">Giảm {money(l.discount)}</span>}
              </td>
              <td className="text-right!">{l.quantity}</td>
              <td className="text-right! whitespace-nowrap">{money(l.unitPrice)}</td>
              <td className="text-right! whitespace-nowrap">{l.isOutside ? <i>Mua ngoài</i> : money(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 ml-auto w-full max-w-[260px] space-y-0.5">
        <Line left="Tổng phải thu" right={money(r.invoiceTotal)} />
        <div className="flex justify-between gap-2 border-y border-current py-1 text-[15px] font-bold">
          <span>Thu lần này</span>
          <span>{money(r.amount)}</span>
        </div>
        <Line left="Phương thức" right={paymentMethodLabels[r.method]} />
        {r.cashReceived !== null && <Line left="Tiền khách đưa" right={money(r.cashReceived)} />}
        {r.changeAmount !== null && <Line left="Tiền thối" right={money(r.changeAmount)} />}
        <Line left="Đã thu" right={money(r.paidToDate)} />
        <Line left="Còn nợ" right={<b>{money(r.debtAfter)}</b>} />
      </div>

      <p className="mt-2">
        Bằng chữ: <i>{vndInWords(r.amount)}</i>
      </p>
      {r.partialReason && <p>Lý do thu một phần: {r.partialReason}</p>}
      {cancelled && (
        <p className="mt-1 font-semibold">
          Đã hủy {r.cancelledAt ? `lúc ${vnHhmmDate(r.cancelledAt)}` : ''}
          {r.cancelledByName ? ` bởi ${r.cancelledByName}` : ''}. Lý do: {r.cancelReason ?? '—'}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 text-center">
        <div>
          <p className="font-semibold">Người nộp tiền</p>
          <p className="text-[11.5px] italic">(Ký, ghi rõ họ tên)</p>
          <p className="mt-12">{r.patient.fullName}</p>
        </div>
        <div>
          <p className="font-semibold">Người thu tiền</p>
          <p className="text-[11.5px] italic">(Ký, ghi rõ họ tên)</p>
          <p className="mt-12">{r.collectedByName}</p>
        </div>
      </div>

      <hr className="sheet-sep mt-6" />
      <p className="text-center text-[11.5px]">Bản demo – dữ liệu minh họa, không có giá trị y khoa</p>
      {reprint && <p className="text-center text-[11.5px]">In lại lúc {vnHhmmDate(printedAt)}</p>}
    </div>
  )
}

function Line({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{left}</span>
      <span className="text-right">{right}</span>
    </div>
  )
}
