import { BarChart3, Stethoscope, Tags } from 'lucide-react'
import { permissions } from '@/config/permissions'
import { routePath } from '@/config/route-path'
import type { NavGroup } from './index'

/** Nhóm Quản lý: danh mục, bác sĩ, báo cáo (quản lý phòng khám). */
export const manageRoutes: NavGroup = {
  id: 'manage',
  label: 'Quản lý',
  items: [
    {
      title: 'Danh mục',
      href: routePath.services,
      icon: Tags,
      // Lễ tân, bác sĩ có services.view để đọc tên dịch vụ nhưng không cần màn quản lý danh mục
      permission: [permissions.services.create, permissions.services.update, permissions.medicines.create, permissions.medicines.update],
      description: 'Dịch vụ, thuốc, chẩn đoán mẫu',
    },
    {
      title: 'Bác sĩ',
      href: routePath.doctors,
      icon: Stethoscope,
      permission: [permissions.doctors.create, permissions.doctors.update],
      description: 'Bác sĩ, lịch làm việc, ngày nghỉ',
    },
    {
      title: 'Báo cáo',
      href: routePath.reports,
      icon: BarChart3,
      permission: permissions.reports.view,
      description: 'Thực thu, theo bác sĩ, lượt khám, tái khám, công nợ',
    },
  ],
}
