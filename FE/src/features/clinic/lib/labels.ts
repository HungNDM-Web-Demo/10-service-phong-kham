import type { StatusTone } from '@/components/shared/StatusBadge'
import type {
  AppointmentCancelReason,
  AppointmentSource,
  AppointmentStatus,
  CallResult,
  DayOffPart,
  DiscountType,
  FollowUpStatus,
  Gender,
  InvoiceLineKind,
  InvoiceStatus,
  MessageKind,
  OrderStatus,
  PaymentMethod,
  PlanItemStatus,
  PlanStatus,
  ReceiptStatus,
  RevenueGroup,
  ServiceGroup,
  ServiceUnit,
  VisitStatus,
} from '@/types/clinic'

/** Nhãn tiếng Việt và tông màu (token theme) của enum nghiệp vụ (07 §2.1). */

export type Tone = StatusTone

export const serviceGroupLabels: Record<ServiceGroup, string> = { Kham: 'Khám', ThuThuat: 'Thủ thuật', CanLamSang: 'Cận lâm sàng' }
export const serviceUnitLabels: Record<ServiceUnit, string> = { Lan: 'Lần', Rang: 'Răng', Phim: 'Phim', Ca: 'Ca' }
export const genderLabels: Record<Gender, string> = { Nam: 'Nam', Nu: 'Nữ' }
export const dayOffPartLabels: Record<DayOffPart, string> = { CaNgay: 'Cả ngày', Sang: 'Buổi sáng', Chieu: 'Buổi chiều' }
export const sourceLabels: Record<AppointmentSource, string> = { Online: 'Online', LeTan: 'Lễ tân' }

export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  ChoXacNhan: 'Chờ xác nhận',
  DaXacNhan: 'Đã xác nhận',
  DaDen: 'Đã đến',
  KhongDen: 'Không đến',
  DaHuy: 'Đã hủy',
}
export const appointmentStatusTones: Record<AppointmentStatus, Tone> = {
  ChoXacNhan: 'warning',
  DaXacNhan: 'info',
  DaDen: 'success',
  KhongDen: 'danger',
  DaHuy: 'neutral',
}

export const cancelReasonLabels: Record<AppointmentCancelReason, string> = {
  BenhNhanBan: 'Bệnh nhân bận',
  BacSiNghi: 'Bác sĩ nghỉ',
  DatTrung: 'Đặt trùng',
  Khac: 'Khác',
}

export const visitStatusLabels: Record<VisitStatus, string> = {
  ChoKham: 'Chờ khám',
  DangKham: 'Đang khám',
  ChoKetQua: 'Chờ kết quả',
  ChoThanhToan: 'Chờ thanh toán',
  HoanTat: 'Hoàn tất',
  BoVe: 'Bỏ về',
}
export const visitStatusTones: Record<VisitStatus, Tone> = {
  ChoKham: 'warning',
  DangKham: 'primary',
  ChoKetQua: 'info',
  ChoThanhToan: 'warning',
  HoanTat: 'success',
  BoVe: 'neutral',
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  ChoThucHien: 'Chờ thực hiện',
  CoKetQua: 'Có kết quả',
  KhongThucHien: 'Không thực hiện',
  DaLam: 'Đã làm',
}

export const planStatusLabels: Record<PlanStatus, string> = {
  Nhap: 'Nháp',
  ChoDuyet: 'Chờ duyệt',
  DaBaoGia: 'Đã báo giá',
  DangDieuTri: 'Đang điều trị',
  HoanThanh: 'Hoàn thành',
  DaHuy: 'Đã hủy',
}
export const planStatusTones: Record<PlanStatus, Tone> = {
  Nhap: 'neutral',
  ChoDuyet: 'warning',
  DaBaoGia: 'info',
  DangDieuTri: 'primary',
  HoanThanh: 'success',
  DaHuy: 'danger',
}

export const planItemStatusLabels: Record<PlanItemStatus, string> = { ChuaLam: 'Chưa làm', DaLam: 'Đã làm', DaHuy: 'Đã hủy' }
export const discountTypeLabels: Record<DiscountType, string> = { PhanTram: '%', SoTien: '₫' }

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  ChoThu: 'Chờ thu',
  ThuMotPhan: 'Thu một phần',
  DaThuDu: 'Đã thu đủ',
  DaHuy: 'Đã hủy',
}
export const invoiceStatusTones: Record<InvoiceStatus, Tone> = {
  ChoThu: 'warning',
  ThuMotPhan: 'info',
  DaThuDu: 'success',
  DaHuy: 'neutral',
}

export const lineKindLabels: Record<InvoiceLineKind, string> = { PhiKham: 'Phí khám', DichVu: 'Dịch vụ', Thuoc: 'Thuốc' }
export const revenueGroupLabels: Record<RevenueGroup, string> = {
  Kham: 'Khám',
  ThuThuat: 'Thủ thuật',
  CanLamSang: 'Cận lâm sàng',
  Thuoc: 'Thuốc',
}
export const paymentMethodLabels: Record<PaymentMethod, string> = { TienMat: 'Tiền mặt', ChuyenKhoan: 'Chuyển khoản', The: 'Thẻ' }
export const receiptStatusLabels: Record<ReceiptStatus, string> = { HopLe: 'Hợp lệ', DaHuy: 'Đã hủy' }

export const followUpStatusLabels: Record<FollowUpStatus, string> = {
  ChoNhac: 'Chờ nhắc',
  DaNhac: 'Đã nhắc',
  DaDatLich: 'Đã đặt lịch',
  DaQuayLai: 'Đã quay lại',
  QuaHan: 'Quá hạn',
}
export const followUpStatusTones: Record<FollowUpStatus, Tone> = {
  ChoNhac: 'warning',
  DaNhac: 'info',
  DaDatLich: 'primary',
  DaQuayLai: 'success',
  QuaHan: 'danger',
}

export const callResultLabels: Record<CallResult, string> = {
  DongYDen: 'Đồng ý đến',
  HenNgayKhac: 'Hẹn ngày khác',
  KhongLienLacDuoc: 'Không liên lạc được',
}

export const messageKindLabels: Record<MessageKind, string> = {
  XacNhanLich: 'Xác nhận lịch',
  NhacLich: 'Nhắc lịch',
  NhacTaiKham: 'Nhắc tái khám',
}
