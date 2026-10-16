import demoData from '@/mock/seed/demo-data.json'
import { mockDb, type Collection } from '@/mock/mock-db'
import { currentContext } from '@/mock/mock-auth'
import { writeAuditLog } from '@/mock/mock-audit'
import { stableId } from '@/mock/mock-helpers'
import { getSettingsMap, usersDb, userIdOf } from '@/mock/system-data'
import type { ClinicProfileDto, DayOffPart } from '@/types/clinic'
import { clinicRules, docCode, docStem, patientCode, reminderMessage, slotsOf } from '../lib/rules'
import { addDaysKey, isoWeekdayOf, vnDateKey, vnLocal, vnMinutesOfDay, vnNow, vnStartOfDay } from '../lib/vn-time'
import type {
  AppointmentRecord,
  DayOffRecord,
  DiagnosisRecord,
  DoctorRecord,
  FollowUpRecord,
  InvoiceRecord,
  MedicineRecord,
  MessageRecord,
  MetaRecord,
  PatientRecord,
  PhraseRecord,
  PlanRecord,
  ReceiptRecord,
  ServiceRecord,
  SpecialtyRecord,
  VisitRecord,
} from './records'
import { loadClinicSeed, type ClinicSeed, type ClinicSeedFile } from './seed-loader'

/**
 * Kho dữ liệu mock nghiệp vụ Phòng khám (06 §5). Mọi collection dùng chung một mốc nạp (meta.anchor); sang ngày mới thì nạp
 * lại để "hôm nay" của dữ liệu mẫu luôn đúng.
 *
 * Lịch hẹn, lượt khám, phiếu thanh toán, phiếu thu, tin nhắn có hàng nghìn bản ghi (khoảng 5 MB), vượt dung lượng localStorage.
 * Các bảng này dựng lại từ seed trong bộ nhớ theo mốc nạp (cùng mốc ra cùng dữ liệu) và chỉ lưu bản ghi đã thêm hoặc sửa.
 */

mockDb.registerSeed('demo-data', demoData)

let cache: { anchor: number; seed: ClinicSeed } | null = null

const metaDb = mockDb.collection<MetaRecord>('clinic-meta', () => {
  const anchor = vnNow()
  cache = null
  return [{ id: 'meta', anchor, date: vnDateKey(anchor) }]
})

function userName(username: string): string {
  return usersDb.find((u) => u.username === username)?.fullName ?? username
}

function seed(): ClinicSeed {
  const anchor = metaDb.get('meta')?.anchor ?? vnNow()
  if (!cache || cache.anchor !== anchor) {
    const settings = getSettingsMap()
    cache = {
      anchor,
      seed: loadClinicSeed(demoData as unknown as ClinicSeedFile, {
        now: anchor,
        receptionistName: userName('letan'),
        managerName: userName('quanly'),
        clinicName: settings['Clinic.Name'] || settings['Brand.AppName'] || 'Phòng khám',
        hotline: settings['Clinic.Hotline'] || '',
        userIds: { bacsi: userIdOf('bacsi'), letan: userIdOf('letan'), quanly: userIdOf('quanly') },
        makeId: (...parts) => parts.join('-'),
      }),
    }
  }
  return cache.seed
}

// ───────────────────────────── Collection phủ: dữ liệu gốc dựng từ seed + phần thay đổi lưu localStorage

type Overlay<T> = T | { id: string; removed: true }

export type OverlayCollection<T extends { id: string }> = Pick<
  Collection<T>,
  'all' | 'get' | 'find' | 'filter' | 'some' | 'count' | 'insert' | 'update' | 'remove' | 'removeWhere' | 'reseed'
> & { name: string }

const clone = <T>(value: T): T => (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)))

function overlayCollection<T extends { id: string }>(name: string, base: () => T[]): OverlayCollection<T> {
  const delta = mockDb.collection<Overlay<T>>(name, () => [])
  let merged: { baseRef: T[]; deltaRef: string; items: T[]; index: Map<string, T> } | null = null
  const read = (): { items: T[]; index: Map<string, T> } => {
    const baseItems = base()
    const changes = delta.all()
    const deltaKey = JSON.stringify(changes.map((c) => c.id)) + changes.length
    if (merged && merged.baseRef === baseItems && merged.deltaRef === deltaKey && changes.length === 0) return merged
    const overrides = new Map(changes.map((c) => [c.id, c]))
    const items: T[] = []
    for (const item of baseItems) {
      const o = overrides.get(item.id)
      if (!o) items.push(item)
      else if (!('removed' in o)) items.push(o as T)
      overrides.delete(item.id)
    }
    for (const o of overrides.values()) if (!('removed' in o)) items.push(o as T)
    merged = { baseRef: baseItems, deltaRef: deltaKey, items, index: new Map(items.map((x) => [x.id, x])) }
    return merged
  }
  const upsert = (item: T) => {
    if (delta.get(item.id)) delta.update(item.id, () => clone(item) as Overlay<T>)
    else delta.insert(clone(item) as Overlay<T>)
  }
  return {
    name,
    all: () => clone(read().items),
    get: (id) => {
      const found = read().index.get(id)
      return found ? clone(found) : undefined
    },
    find: (predicate) => {
      const found = read().items.find(predicate)
      return found ? clone(found) : undefined
    },
    filter: (predicate) => clone(read().items.filter(predicate)),
    some: (predicate) => read().items.some(predicate),
    count: (predicate) => (predicate ? read().items.filter(predicate).length : read().items.length),
    insert: (item) => {
      upsert(item)
      return clone(item)
    },
    update: (id, patch) => {
      const current = read().index.get(id)
      if (!current) return undefined
      const next = typeof patch === 'function' ? patch(clone(current)) : { ...clone(current), ...patch, id }
      upsert(next)
      return clone(next)
    },
    remove: (id) => {
      if (!read().index.has(id)) return false
      if (delta.get(id)) delta.update(id, () => ({ id, removed: true }))
      else delta.insert({ id, removed: true })
      return true
    },
    removeWhere: (predicate) => {
      const ids = read().items.filter(predicate).map((x) => x.id)
      for (const x of ids) {
        if (delta.get(x)) delta.update(x, () => ({ id: x, removed: true }))
        else delta.insert({ id: x, removed: true })
      }
      return ids.length
    },
    reseed: () => {
      merged = null
      delta.reseed()
    },
  }
}

// ───────────────────────────── Collection

export const specialtiesDb = mockDb.collection<SpecialtyRecord>('clinic-specialties', () => seed().specialties)
export const servicesDb = mockDb.collection<ServiceRecord>('clinic-services', () => seed().services)
export const medicinesDb = mockDb.collection<MedicineRecord>('clinic-medicines', () => seed().medicines)
export const diagnosesDb = mockDb.collection<DiagnosisRecord>('clinic-diagnoses', () => seed().diagnoses)
export const doctorsDb = mockDb.collection<DoctorRecord>('clinic-doctors', () => seed().doctors)
export const daysOffDb = mockDb.collection<DayOffRecord>('clinic-days-off', () => seed().daysOff)
export const patientsDb = mockDb.collection<PatientRecord>('clinic-patients', () => seed().patients)
export const phrasesDb = mockDb.collection<PhraseRecord>('clinic-usage-phrases', () => seed().phrases)
export const plansDb = mockDb.collection<PlanRecord>('clinic-treatment-plans', () => seed().plans)
export const followUpsDb = mockDb.collection<FollowUpRecord>('clinic-follow-ups', () => seed().followUps)
export const appointmentsDb = overlayCollection<AppointmentRecord>('clinic-appointments', () => seed().appointments)
export const visitsDb = overlayCollection<VisitRecord>('clinic-visits', () => seed().visits)
export const invoicesDb = overlayCollection<InvoiceRecord>('clinic-invoices', () => seed().invoices)
export const receiptsDb = overlayCollection<ReceiptRecord>('clinic-receipts', () => seed().receipts)
export const messagesDb = overlayCollection<MessageRecord>('clinic-messages', () => seed().messages)

const ALL = [
  specialtiesDb,
  servicesDb,
  medicinesDb,
  diagnosesDb,
  doctorsDb,
  daysOffDb,
  patientsDb,
  phrasesDb,
  plansDb,
  followUpsDb,
  appointmentsDb,
  visitsDb,
  invoicesDb,
  receiptsDb,
  messagesDb,
]

mockDb.onReset(() => {
  cache = null
})

/** Gọi đầu mỗi handler: dữ liệu nạp từ hôm trước thì nạp lại theo hôm nay; chạy việc nền (06 §3) như BE làm định kỳ. */
export function ensureFresh(): void {
  const meta = metaDb.get('meta')
  if (meta && meta.date !== vnDateKey(vnNow())) {
    mockDb.batch(() => {
      metaDb.reseed()
      for (const c of ALL) c.reseed()
    })
    cache = null
  }
  runMaintenance()
}

// ───────────────────────────── Đồng hồ, người thao tác

export const nowIso = (): string => new Date(Math.floor(vnNow() / 1000) * 1000).toISOString()
export const nowMs = (): number => Math.floor(vnNow() / 1000) * 1000
export const today = (): string => vnDateKey(vnNow())
export const nowMinute = (): number => vnMinutesOfDay(vnNow())
export const toIso = (date: string, minute: number): string => new Date(vnStartOfDay(date) + minute * 60_000).toISOString()
export const minuteOf = (iso: string): number => vnLocal(iso).minute
export { addDaysKey, isoWeekdayOf, vnDateKey, vnLocal }

export type Actor = {
  userId: string | null
  username: string | null
  fullName: string
  permissions: string[]
  isSuperAdmin: boolean
  doctorId: string | null
}

export function actor(): Actor {
  const ctx = currentContext()
  if (!ctx) return { userId: null, username: null, fullName: clinicRules.systemActorName, permissions: [], isSuperAdmin: false, doctorId: null }
  return {
    userId: ctx.user.id,
    username: ctx.user.username,
    fullName: ctx.user.fullName,
    permissions: ctx.permissions,
    isSuperAdmin: ctx.isSuperAdmin,
    doctorId: doctorsDb.find((d) => d.userId === ctx.user.id)?.id ?? null,
  }
}

export const can = (a: Actor, code: string): boolean => a.isSuperAdmin || a.permissions.includes(code)

/** Tài khoản gắn bác sĩ chỉ thấy dữ liệu của bác sĩ đó; quản trị viên thấy tất cả (BR-32). */
export const ownDoctor = (a: Actor): string | null => (a.isSuperAdmin ? null : a.doctorId)

export function profile(): ClinicProfileDto {
  const s = getSettingsMap()
  const remind = Number(s['Clinic.FollowUpRemindDays'])
  return {
    name: s['Clinic.Name'] || s['Brand.AppName'] || 'Phòng khám',
    address: s['Clinic.Address'] || '',
    hotline: s['Clinic.Hotline'] || s['Company.Hotline'] || '',
    workingHours: s['Clinic.WorkingHours'] || '',
    logoUrl: s['Brand.LogoUrl'] || null,
    bankBin: s['Clinic.BankBin'] || '',
    bankAccount: s['Clinic.BankAccount'] || '',
    bankAccountName: s['Clinic.BankAccountName'] || '',
    priorityReasons: [...new Set((s['Clinic.PriorityReasons'] || '').split(',').map((x) => x.trim()).filter(Boolean))],
    followUpRemindDays: remind >= 1 && remind <= 3 ? remind : clinicRules.defaultRemindDays,
  }
}

export const displayCode = (): string => (getSettingsMap()['Clinic.DisplayCode'] || '').trim()

// ───────────────────────────── Lịch bác sĩ theo ngày

export type DoctorDay = {
  doctor: DoctorRecord
  specialtyName: string
  offPart: DayOffPart | null
  offReason: string | null
  slots: number[]
  taken: Map<number, number>
  dayCount: number
  working: boolean
}

export function loadDay(date: string): DoctorDay[] {
  const weekday = isoWeekdayOf(date)
  const offs = daysOffDb.filter((o) => o.date === date)
  const specs = new Map(specialtiesDb.all().map((s) => [s.id, s.name]))
  const appts = appointmentsDb.filter((a) => a.date === date && a.status !== 'DaHuy')
  const start = vnStartOfDay(date)
  return doctorsDb
    .all()
    .sort((a, b) => a.sortOrder - b.sortOrder || (a.code < b.code ? -1 : 1))
    .map((d) => {
      const off = offs.find((o) => o.doctorId === d.id) ?? null
      const slots = slotsOf(
        d.hours.filter((h) => h.dayOfWeek === weekday).map((h) => [h.startMinute, h.endMinute] as [number, number]),
        d.slotMinutes,
        off?.part ?? null
      )
      const taken = new Map<number, number>()
      const mine = appts.filter((a) => a.doctorId === d.id)
      for (const a of mine) {
        const m = Math.round((Date.parse(a.startAt) - start) / 60_000)
        taken.set(m, (taken.get(m) ?? 0) + 1)
      }
      return {
        doctor: d,
        specialtyName: specs.get(d.specialtyId) ?? '',
        offPart: off?.part ?? null,
        offReason: off?.reason ?? null,
        slots,
        taken,
        dayCount: mine.length,
        working: d.isActive && slots.length > 0,
      }
    })
}

// ───────────────────────────── Mã chứng từ

export function nextDocCode(prefix: string, dateKey: string): string {
  const stem = docStem(prefix, dateKey)
  const codes =
    prefix === clinicRules.appointmentPrefix
      ? appointmentsDb.all().map((a) => a.code)
      : prefix === clinicRules.visitPrefix
        ? visitsDb.all().map((v) => v.code)
        : prefix === clinicRules.invoicePrefix
          ? invoicesDb.all().map((i) => i.code)
          : prefix === clinicRules.receiptPrefix
            ? receiptsDb.all().map((r) => r.code)
            : plansDb.all().map((p) => p.code)
  const last = codes.filter((c) => c.startsWith(stem)).reduce((m, c) => Math.max(m, Number(c.slice(stem.length)) || 0), 0)
  return docCode(prefix, dateKey, last + 1)
}

export function nextPatientCode(): string {
  const max = patientsDb
    .all()
    .map((p) => (p.code.startsWith(clinicRules.patientPrefix) ? Number(p.code.slice(2)) || 0 : 0))
    .reduce((m, n) => Math.max(m, n), 0)
  return patientCode(max + 1)
}

export function nextCatalogCode(codes: string[], prefix: string, digits: number): string {
  const max = codes
    .map((c) => /^([A-Z]+)(\d+)$/.exec(c))
    .filter((m): m is RegExpExecArray => !!m && m[1] === prefix)
    .reduce((acc, m) => Math.max(acc, Number(m[2])), 0)
  return `${prefix}${String(max + 1).padStart(digits, '0')}`
}

/** Nhật ký xem nội dung chuyên môn (BR-32, TC-30). */
export function logMedicalView(patient: PatientRecord, place: string): void {
  writeAuditLog({
    action: 'View',
    entityName: 'Patient',
    entityId: patient.code,
    newValues: { code: patient.code, fullName: patient.fullName, place },
  })
}

export const newSeedlessId = (...parts: (string | number)[]) => stableId(...parts)

// ───────────────────────────── Việc nền (06 §3)

let maintaining = false

export function runMaintenance(): void {
  if (maintaining) return
  maintaining = true
  try {
    const day = today()
    const stale = appointmentsDb.filter((a) => a.date < day && (a.status === 'ChoXacNhan' || a.status === 'DaXacNhan'))
    const left = visitsDb.filter((v) => v.date < day && (v.status === 'ChoKham' || v.status === 'ChoKetQua'))
    const overdueBefore = addDaysKey(day, -clinicRules.followUpWindowAfter)
    const overdue = followUpsDb.filter((f) => f.dueDate < overdueBefore && f.status !== 'DaQuayLai' && f.status !== 'QuaHan')
    let reminders: AppointmentRecord[] = []
    if (nowMinute() >= clinicRules.reminderHour * 60) {
      const tomorrow = addDaysKey(day, 1)
      const reminded = new Set(messagesDb.filter((m) => m.kind === 'NhacLich' && !!m.appointmentId).map((m) => m.appointmentId))
      reminders = appointmentsDb.filter((a) => a.date === tomorrow && a.status === 'DaXacNhan' && !reminded.has(a.id))
    }
    if (stale.length + left.length + overdue.length + reminders.length === 0) return
    mockDb.batch(() => {
      for (const a of stale) appointmentsDb.update(a.id, { status: 'KhongDen' })
      for (const v of left) visitsDb.update(v.id, { status: 'BoVe', cancelReason: clinicRules.endOfDayCancel })
      for (const f of overdue) followUpsDb.update(f.id, { status: 'QuaHan' })
      if (reminders.length) {
        const p = profile()
        const now = nowIso()
        for (const a of reminders) {
          const doctor = doctorsDb.get(a.doctorId)
          if (!doctor) continue
          const phone = a.patientId ? (patientsDb.get(a.patientId)?.phone ?? '') : (a.guestPhone ?? '')
          messagesDb.insert({
            id: stableId('msg', a.id, 'r'),
            kind: 'NhacLich',
            channel: 'Sms',
            phone,
            content: reminderMessage(p.name, a.code, a.date, minuteOf(a.startAt), doctor.fullName, p.hotline),
            sentAt: now,
            appointmentId: a.id,
            followUpId: null,
          })
        }
      }
    })
  } finally {
    maintaining = false
  }
}
