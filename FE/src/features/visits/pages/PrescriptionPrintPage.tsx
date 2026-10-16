'use client'

import { useSearchParams } from 'next/navigation'
import { ReceiptFrame } from '@/features/clinic/components/print/ReceiptFrame'
import { usePrescription } from '@/features/clinic/hooks/use-clinic'
import { genderLabels } from '@/features/clinic/lib/labels'
import { ddmmyyyy } from '@/features/clinic/lib/vn-time'
import { routePath } from '@/config/route-path'
import { useAssetUrl } from '@/hooks/use-asset-url'
import { getErrorMessage } from '@/lib/api-error'
import { formatPhone } from '@/lib/format'

/** Bản in đơn thuốc A5 (SCR-12, UC-09 bước 5): phòng khám, bệnh nhân, chẩn đoán, thuốc, cách dùng, lời dặn, ngày tái khám. */
export function PrescriptionPrintPage({ id }: { id: string }) {
  const params = useSearchParams()
  const data = usePrescription(id)
  const rx = data.data
  const logo = useAssetUrl(rx?.clinic.logoUrl ?? null)

  return (
    <ReceiptFrame paper="a5" autoPrint={params.get('print') === '1'} ready={!!rx} backHref={routePath.visitDetail(id)}>
      {data.isError ? (
        <p className="text-center text-sm">{getErrorMessage(data.error)}</p>
      ) : !rx ? (
        <p className="text-center text-sm">Đang tải đơn thuốc…</p>
      ) : (
        <div className="space-y-3">
          <header className="flex items-start gap-3 border-b pb-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo do phòng khám tự tải lên */}
            {logo && <img src={logo} alt="" className="size-12 object-contain" />}
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold uppercase">{rx.clinic.name}</p>
              <p>{rx.clinic.address}</p>
              <p>Hotline: {rx.clinic.hotline}</p>
            </div>
            <p className="text-right text-[11px]">
              Mã lượt khám
              <br />
              <b>{rx.visitCode}</b>
            </p>
          </header>

          <h1 className="text-center text-lg font-bold tracking-wide">ĐƠN THUỐC</h1>

          <section className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            <span>Họ tên:</span>
            <b className="uppercase">{rx.patientName}</b>
            <span>Mã bệnh nhân:</span>
            <span>{rx.patientCode}</span>
            <span>Ngày sinh:</span>
            <span>
              {ddmmyyyy(rx.birthDate)} ({rx.age} tuổi) · {genderLabels[rx.gender]}
            </span>
            <span>Điện thoại:</span>
            <span>{formatPhone(rx.phone)}</span>
            {rx.address && (
              <>
                <span>Địa chỉ:</span>
                <span>{rx.address}</span>
              </>
            )}
            {rx.allergies && (
              <>
                <span>Dị ứng:</span>
                <b>{rx.allergies}</b>
              </>
            )}
            <span>Chẩn đoán:</span>
            <span>{rx.diagnoses || '—'}</span>
          </section>

          <table>
            <thead>
              <tr>
                <th className="w-6">#</th>
                <th>Thuốc, cách dùng</th>
                <th className="w-20 text-right">Số lượng</th>
              </tr>
            </thead>
            <tbody>
              {rx.lines.map((l, i) => (
                <tr key={`${l.name}-${i}`}>
                  <td>{i + 1}</td>
                  <td>
                    <b>
                      {l.name}
                      {l.strength && !l.name.includes(l.strength) ? ` ${l.strength}` : ''}
                    </b>
                    <span className="text-[11px]"> ({l.activeIngredient})</span>
                    <br />
                    <i>
                      {l.usage} · {l.days} ngày
                    </i>
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {l.quantity} {l.unit}
                  </td>
                </tr>
              ))}
              {rx.lines.length === 0 && (
                <tr>
                  <td colSpan={3}>Không kê thuốc</td>
                </tr>
              )}
            </tbody>
          </table>

          {rx.advice && (
            <p>
              <b>Lời dặn:</b> {rx.advice}
            </p>
          )}
          {rx.followUpDate && (
            <p>
              <b>Hẹn tái khám:</b> ngày {ddmmyyyy(rx.followUpDate)}
              {rx.followUpNote ? ` · ${rx.followUpNote}` : ''}
            </p>
          )}

          <div className="flex justify-end pt-2">
            <div className="text-center">
              <p>Ngày {ddmmyyyy(rx.date)}</p>
              <p className="font-semibold">Bác sĩ điều trị</p>
              <div className="h-14" />
              <p className="font-semibold">{rx.doctorName}</p>
            </div>
          </div>

          <p className="border-t pt-1 text-center text-[10px] italic">Bản in từ phần mềm demo, không có giá trị sử dụng thật.</p>
        </div>
      )}
    </ReceiptFrame>
  )
}
