/** Đường dẫn FE (kebab-case, docs/07-DANH-SACH-API.md §6). Không gõ đường dẫn trực tiếp trong component. */
export const routePath = {
  root: '/',
  login: '/login',
  forbidden: '/forbidden',
  profile: '/profile',

  dashboard: '/dashboard',
  queue: '/queue',
  queueTicket: (id: string) => `/queue/ticket/${id}`,
  queueTicketPrefix: '/queue/ticket',
  queueDisplay: '/queue/display',
  appointments: '/appointments',
  patients: '/patients',
  patientDetail: (id: string) => `/patients/${id}`,
  visits: '/visits',
  visitDetail: (id: string) => `/visits/${id}`,
  prescriptionPrint: (id: string) => `/visits/${id}/prescription`,
  treatmentPlans: '/treatment-plans',
  planDetail: (id: string) => `/treatment-plans/${id}`,
  planQuote: (id: string) => `/treatment-plans/${id}/quote`,
  invoices: '/invoices',
  receiptPrintPrefix: '/invoices/receipts',
  receiptPrint: (id: string, reprint = false) => `/invoices/receipts/${id}${reprint ? '?reprint=1' : ''}`,
  followUps: '/follow-ups',
  services: '/services',
  doctors: '/doctors',
  reports: '/reports',
  booking: '/dat-lich',
  bookingLookup: '/dat-lich/tra-cuu',

  settingsUsers: '/settings/users',
  settingsRoles: '/settings/roles',
  settingsGeneral: '/settings/general',
  settingsAuditLogs: '/settings/audit-logs',
} as const

type Paths = typeof routePath
export type RoutePath = { [K in keyof Paths]: Paths[K] extends string ? Paths[K] : never }[keyof Paths]
