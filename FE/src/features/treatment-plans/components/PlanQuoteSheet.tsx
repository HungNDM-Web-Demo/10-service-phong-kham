import { formatPhone } from '@/lib/format'
import type { ClinicProfileDto, TreatmentPlanDto } from '@/types/clinic'
import { genderLabels } from '@/features/clinic/lib/labels'
import { teethLabel, unitLabel } from '@/features/clinic/lib/rules'
import { ddmmyyyy, vnDdMmYyyy } from '@/features/clinic/lib/vn-time'
import { formatRate } from '../lib/plan-calc'

const money = (v: number) => v.toLocaleString('vi-VN')

/**
 * Bản báo giá kế hoạch điều trị khổ A5 (FR-28, UC-10 bước 6, NFR-05): thông tin phòng khám, mã và ngày, bệnh nhân, bác sĩ,
 * hạng mục, tổng trước giảm / giảm / sau giảm, chỗ ký; dòng chân bản demo.
 */
export function PlanQuoteSheet({
  plan,
  clinic,
}: {
  plan: TreatmentPlanDto
  clinic: ClinicProfileDto | undefined
}) {
  const items = plan.items.filter((i) => i.status !== 'DaHuy')
  const draft = plan.status === 'Nhap' || plan.status === 'ChoDuyet'
  const date = plan.quotedAt ?? plan.createdAt

  return (
    <div className="relative">
      {draft && (
        <p className="pointer-events-none absolute top-40 left-1/2 -translate-x-1/2 -rotate-12 rounded border-2 border-current px-3 py-1 text-lg font-bold tracking-widest opacity-30">
          BẢN NHÁP
        </p>
      )}
      {plan.status === 'DaHuy' && (
        <p className="pointer-events-none absolute top-40 left-1/2 -translate-x-1/2 -rotate-12 rounded border-2 border-current px-3 py-1 text-lg font-bold tracking-widest opacity-40">
          ĐÃ HỦY
        </p>
      )}

      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[14px] font-bold uppercase">{clinic?.name ?? ''}</p>
          {clinic?.address && <p>{clinic.address}</p>}
          {clinic?.hotline && <p>Hotline: {clinic.hotline}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p>
            Số: <b>{plan.code}</b>
          </p>
          <p>Ngày: {vnDdMmYyyy(date)}</p>
        </div>
      </header>
      <hr className="sheet-sep" />

      <h1 className="my-2 text-center text-[16px] font-bold uppercase">
        Báo giá kế hoạch điều trị
      </h1>

      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        <p className="col-span-2">
          Bệnh nhân: <b>{plan.patient.fullName}</b> ({plan.patient.code})
        </p>
        <p>
          Ngày sinh: {ddmmyyyy(plan.patient.birthDate)} ({plan.patient.age} tuổi)
        </p>
        <p>Giới tính: {genderLabels[plan.patient.gender]}</p>
        <p>Điện thoại: {formatPhone(plan.patient.phone)}</p>
        <p>Số buổi dự kiến: {plan.plannedSessions}</p>
        <p className="col-span-2">Bác sĩ điều trị: {plan.doctorName}</p>
      </div>

      <table className="mt-3">
        <thead>
          <tr>
            <th className="w-6">#</th>
            <th>Hạng mục</th>
            <th className="text-right">SL</th>
            <th className="text-right">Đơn giá</th>
            <th className="text-right">Giảm</th>
            <th className="text-right">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, n) => (
            <tr key={i.id}>
              <td>{n + 1}</td>
              <td>
                {i.serviceName}
                {i.teeth.length > 0 && (
                  <span className="block text-[11.5px]">{teethLabel(i.teeth)}</span>
                )}
              </td>
              <td className="text-right whitespace-nowrap">
                {i.quantity} {unitLabel(i.unit)}
              </td>
              <td className="text-right">{money(i.unitPrice)}</td>
              <td className="text-right whitespace-nowrap">
                {i.discountAmount > 0 ? (
                  <>
                    {money(i.discountAmount)}
                    {i.discountType === 'PhanTram' && (
                      <span className="block text-[11.5px]">({i.discountValue}%)</span>
                    )}
                  </>
                ) : (
                  '—'
                )}
              </td>
              <td className="text-right font-semibold">{money(i.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-2 ml-auto w-64 space-y-0.5">
        <Line label="Tổng trước giảm" value={`${money(plan.subTotal)} ₫`} />
        <Line
          label={`Giảm giá (${formatRate(plan.discountRate)}%)`}
          value={plan.discountTotal > 0 ? `−${money(plan.discountTotal)} ₫` : '0 ₫'}
        />
        <div className="flex justify-between border-t border-current pt-1 text-[14px] font-bold">
          <span>TỔNG CỘNG</span>
          <span>{money(plan.total)} ₫</span>
        </div>
      </div>

      {plan.note && <p className="mt-3">Ghi chú: {plan.note}</p>}
      <p className="mt-2 text-[11.5px] italic">
        Báo giá áp dụng cho các hạng mục trên; giá và giảm giá giữ nguyên theo lúc chốt báo giá. Chi
        phí khám và thuốc (nếu có) tính riêng ở mỗi buổi.
      </p>

      <div className="mt-6 grid grid-cols-2 text-center">
        <div>
          <p className="font-semibold">Bệnh nhân</p>
          <p className="text-[11.5px] italic">(Ký, ghi rõ họ tên)</p>
          <div className="h-16" />
          <p>{plan.patient.fullName}</p>
        </div>
        <div>
          <p className="font-semibold">Bác sĩ điều trị</p>
          <p className="text-[11.5px] italic">(Ký, ghi rõ họ tên)</p>
          <div className="h-16" />
          <p>{plan.doctorName}</p>
        </div>
      </div>

      <p className="mt-6 text-center text-[11px] italic">
        Bản demo – dữ liệu minh họa, không có giá trị y khoa
      </p>
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
