/**
 * Mã quyền, khai báo giống hệt BE `Application/Constants/Permissions.cs`
 * và danh sách seed `src/mock/seed/system.json` (+ project.json).
 * Định dạng `{resource}.{action}`. Không gõ chuỗi mã quyền trực tiếp trong component.
 */
export const permissions = {
  dashboard: {
    view: 'dashboard.view',
  },
  users: {
    view: 'users.view',
    create: 'users.create',
    update: 'users.update',
    delete: 'users.delete',
  },
  roles: {
    view: 'roles.view',
    create: 'roles.create',
    update: 'roles.update',
    delete: 'roles.delete',
  },
  settings: {
    view: 'settings.view',
    update: 'settings.update',
  },
  auditLogs: {
    view: 'audit-logs.view',
  },
  // Quyền nghiệp vụ Phòng khám (docs/07 §1), khớp BE ProjectPermissions.cs
  services: { view: 'services.view', create: 'services.create', update: 'services.update', delete: 'services.delete' },
  medicines: { view: 'medicines.view', create: 'medicines.create', update: 'medicines.update', delete: 'medicines.delete' },
  doctors: { view: 'doctors.view', create: 'doctors.create', update: 'doctors.update', delete: 'doctors.delete' },
  appointments: {
    view: 'appointments.view',
    create: 'appointments.create',
    update: 'appointments.update',
    cancel: 'appointments.cancel',
  },
  queueTickets: {
    view: 'queue-tickets.view',
    create: 'queue-tickets.create',
    update: 'queue-tickets.update',
    call: 'queue-tickets.call',
  },
  patients: { view: 'patients.view', create: 'patients.create', update: 'patients.update' },
  medicalRecords: { view: 'medical-records.view' },
  visits: { examine: 'visits.examine', reopen: 'visits.reopen' },
  treatmentPlans: {
    view: 'treatment-plans.view',
    create: 'treatment-plans.create',
    update: 'treatment-plans.update',
    approve: 'treatment-plans.approve',
  },
  invoices: { view: 'invoices.view', collect: 'invoices.collect', cancel: 'invoices.cancel' },
  followUps: { view: 'follow-ups.view', update: 'follow-ups.update' },
  reports: { view: 'reports.view' },
} as const

/** Mã vai trò hệ thống (BR-SYS-06). */
export const roleCodes = {
  admin: 'ADMIN',
  manager: 'MANAGER',
  staff: 'STAFF',
  receptionist: 'RECEPTIONIST',
  doctor: 'DOCTOR',
} as const

type Leaves<T> = T extends string ? T : { [K in keyof T]: Leaves<T[K]> }[keyof T]
export type PermissionCode = Leaves<typeof permissions>
