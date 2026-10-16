import { BellRing, CalendarDays, ClipboardList, ExternalLink, LayoutDashboard, Monitor, ReceiptText, Users, UsersRound } from 'lucide-react'
import { permissions } from '@/config/permissions'
import { routePath } from '@/config/route-path'
import type { NavGroup } from './index'

/** Nhóm menu chính: việc hằng ngày ở quầy lễ tân và phòng khám (docs/07 §6). */
export const mainRoutes: NavGroup = {
  id: 'main',
  items: [
    {
      title: 'Tổng quan',
      href: routePath.dashboard,
      icon: LayoutDashboard,
      permission: permissions.dashboard.view,
      description: 'Lượt khám hôm nay, hàng chờ, thực thu',
    },
    {
      title: 'Tiếp đón & hàng chờ',
      href: routePath.queue,
      icon: UsersRound,
      permission: permissions.queueTickets.view,
      description: 'Tiếp đón, cấp số, gọi bệnh nhân vào khám',
    },
    {
      title: 'Lịch hẹn',
      href: routePath.appointments,
      icon: CalendarDays,
      permission: permissions.appointments.view,
      description: 'Lịch theo bác sĩ, xác nhận lịch đặt online',
    },
    {
      title: 'Bệnh nhân',
      href: routePath.patients,
      icon: Users,
      permission: permissions.patients.view,
      description: 'Hồ sơ, lịch sử khám, công nợ',
    },
    {
      title: 'Kế hoạch điều trị',
      href: routePath.treatmentPlans,
      icon: ClipboardList,
      permission: permissions.treatmentPlans.view,
      description: 'Báo giá, duyệt giảm giá, tiến độ điều trị',
    },
    {
      title: 'Thu phí',
      href: routePath.invoices,
      icon: ReceiptText,
      permission: permissions.invoices.view,
      description: 'Phiếu chờ thu, công nợ, phiếu thu',
    },
    {
      title: 'Nhắc tái khám',
      href: routePath.followUps,
      icon: BellRing,
      permission: permissions.followUps.view,
      description: 'Danh sách đến hạn, gửi tin nhắc, ghi kết quả gọi',
    },
    {
      title: 'Màn hình sảnh',
      href: `${routePath.queueDisplay}?code=sanh2026`,
      icon: Monitor,
      permission: permissions.queueTickets.view,
      description: 'Bảng gọi số cho TV ngoài sảnh',
      newTab: true,
    },
    {
      title: 'Trang đặt lịch',
      href: routePath.booking,
      icon: ExternalLink,
      permission: permissions.appointments.view,
      description: 'Trang bệnh nhân tự đặt lịch online',
      newTab: true,
    },
  ],
}
