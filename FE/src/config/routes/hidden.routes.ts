import { ClipboardList, FileText, Printer, UserRound } from 'lucide-react'
import { permissions } from '@/config/permissions'
import { routePath } from '@/config/route-path'
import type { NavItem } from './index'

/** Trang không nằm trong menu nhưng cần tiêu đề trên Header và kiểm tra quyền. */
export const hiddenRoutes: NavItem[] = [
  {
    title: 'Hồ sơ cá nhân',
    href: routePath.profile,
    icon: UserRound,
  },
  {
    title: 'Phiếu khám',
    href: routePath.visits,
    icon: FileText,
    permission: [permissions.queueTickets.view, permissions.patients.view],
  },
  {
    title: 'In phiếu số thứ tự',
    href: routePath.queueTicketPrefix,
    icon: Printer,
    permission: permissions.queueTickets.view,
  },
  {
    title: 'In phiếu thu',
    href: routePath.receiptPrintPrefix,
    icon: Printer,
    permission: permissions.invoices.view,
  },
  {
    title: 'Kế hoạch điều trị',
    href: routePath.treatmentPlans,
    icon: ClipboardList,
    permission: permissions.treatmentPlans.view,
  },
]
