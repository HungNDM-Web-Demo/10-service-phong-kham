import type { StatusTone } from '@/components/shared/StatusBadge'
import type { AuditAction } from './types/audit-log.types'

/** Nhãn hiển thị cho nhật ký. Dự án thêm tên entity và tên cột nghiệp vụ của mình vào đây. */

export const auditActionLabels: Record<AuditAction, { label: string; tone: StatusTone }> = {
  Create: { label: 'Thêm', tone: 'success' },
  Update: { label: 'Sửa', tone: 'info' },
  Delete: { label: 'Xóa', tone: 'danger' },
  Login: { label: 'Đăng nhập', tone: 'neutral' },
  View: { label: 'Xem hồ sơ', tone: 'warning' },
}

/** Tên entity (BE) → tên tiếng Việt; cũng là danh sách cho bộ lọc "Đối tượng". */
export const auditEntityLabels: Record<string, string> = {
  User: 'Tài khoản',
  Role: 'Vai trò',
  Setting: 'Cài đặt',
  // Phòng khám (docs/06 §4)
  Specialty: 'Chuyên khoa',
  Service: 'Dịch vụ',
  Medicine: 'Thuốc',
  DiagnosisTemplate: 'Chẩn đoán mẫu',
  Doctor: 'Bác sĩ',
  WorkingHour: 'Lịch làm việc',
  DayOff: 'Ngày nghỉ',
  Patient: 'Bệnh nhân',
  TreatmentPlan: 'Kế hoạch điều trị',
  TreatmentPlanItem: 'Hạng mục kế hoạch',
}

/** Tên cột (camelCase) → nhãn tiếng Việt trong bảng "trước / sau". */
export const auditFieldLabels: Record<string, string> = {
  username: 'Tên đăng nhập',
  fullName: 'Họ tên',
  email: 'Email',
  phone: 'Số điện thoại',
  avatarUrl: 'Ảnh đại diện',
  isActive: 'Đang hoạt động',
  isDemoAccount: 'Tài khoản demo',
  lastLoginAt: 'Đăng nhập gần nhất',
  roleIds: 'Vai trò',
  code: 'Mã',
  name: 'Tên',
  description: 'Mô tả',
  isSystem: 'Vai trò hệ thống',
  permissions: 'Quyền',
  key: 'Khóa',
  value: 'Giá trị',
  groupName: 'Nhóm',
  quickLogin: 'Đăng nhập nhanh',
  sortOrder: 'Thứ tự',
  status: 'Trạng thái',
  createdAt: 'Ngày tạo',
  updatedAt: 'Ngày sửa',
  // Phòng khám (docs/06 §4)
  group: 'Nhóm',
  specialtyId: 'Chuyên khoa',
  unit: 'Đơn vị tính',
  price: 'Giá',
  requiresTooth: 'Cần vị trí răng',
  activeIngredient: 'Hoạt chất',
  strength: 'Hàm lượng',
  dosageForm: 'Dạng bào chế',
  icdCode: 'Mã ICD-10',
  title: 'Học hàm, học vị',
  room: 'Phòng',
  photoUrl: 'Ảnh',
  bio: 'Giới thiệu',
  userId: 'Tài khoản đăng nhập',
  slotMinutes: 'Độ dài khung (phút)',
  maxPerSlot: 'Số lịch tối đa mỗi khung',
  showOnline: 'Hiện trên trang đặt lịch',
  hours: 'Lịch làm việc',
  doctorId: 'Bác sĩ',
  date: 'Ngày',
  part: 'Buổi nghỉ',
  reason: 'Lý do',
  birthDate: 'Ngày sinh',
  gender: 'Giới tính',
  address: 'Địa chỉ',
  contactPerson: 'Người liên hệ',
  allergies: 'Tiền sử dị ứng',
  medicalHistory: 'Tiền sử bệnh',
  note: 'Ghi chú',
  patientId: 'Bệnh nhân',
  plannedSessions: 'Số buổi dự kiến',
  subTotal: 'Tổng trước giảm',
  discountTotal: 'Tổng giảm',
  total: 'Tổng tiền',
  items: 'Hạng mục',
  reviewNote: 'Ghi chú duyệt',
  place: 'Nơi xem',
}

export const entityLabel = (name: string) => auditEntityLabels[name] ?? name
export const fieldLabel = (name: string) => auditFieldLabels[name] ?? name
