import { permissions, roleCodes } from '@/config/permissions'
import { mockDelay } from '@/lib/data-source'
import { auditCreate, auditDelete, auditUpdate } from '@/mock/mock-audit'
import { requirePermission, requireSession } from '@/mock/mock-auth'
import { newId } from '@/mock/mock-helpers'
import { liveUsers, rolesOfUser } from '@/mock/system-data'
import type {
  AccountCandidate,
  CreateDayOffInput,
  DayOffDto,
  DayOffQuery,
  DayOffResult,
  DoctorDto,
  DoctorOption,
  NextCodeDto,
  SaveDoctorInput,
  SaveScheduleInput,
} from '@/types/clinic'
import { clinicRules, doctorShort } from '../lib/rules'
import { hasErrors, validateDoctor, validateSchedule } from '../lib/validation'
import { parseHhmm } from '../lib/vn-time'
import { conflictError, fieldError, fieldErrors, inUse, notFoundError } from './errors'
import { appointmentBrief, doctorDto, doctorOption, isActiveAppointment } from './mappers'
import type { DayOffRecord, DoctorRecord } from './records'
import {
  addDaysKey,
  appointmentsDb,
  daysOffDb,
  doctorsDb,
  ensureFresh,
  followUpsDb,
  minuteOf,
  nextCatalogCode,
  patientsDb,
  plansDb,
  specialtiesDb,
  today,
  visitsDb,
} from './store'

/** Handler mock bác sĩ, lịch làm việc, ngày nghỉ (07 §4.2). */

const specName = (id: string) => specialtiesDb.get(id)?.name ?? ''
const usernameOf = (userId: string | null) => (userId ? (liveUsers().find((u) => u.id === userId)?.username ?? null) : null)
const toDto = (d: DoctorRecord) => doctorDto(d, specName(d.specialtyId), usernameOf(d.userId))
const sorted = (list: DoctorRecord[]) => [...list].sort((a, b) => a.sortOrder - b.sortOrder || (a.code < b.code ? -1 : 1))

function ensureAccount(userId: string | null, doctorId: string | null) {
  if (!userId) return
  if (!liveUsers().some((u) => u.id === userId)) throw conflictError(null, 'Tài khoản không tồn tại.', 'userId')
  const other = doctorsDb.find((d) => d.userId === userId && d.id !== doctorId)
  if (other) throw conflictError(null, `Tài khoản đã gắn với ${doctorShort(other.fullName)}.`, 'userId')
}

const dayOffDto = (o: DayOffRecord): DayOffDto => ({
  id: o.id,
  doctorId: o.doctorId,
  doctorName: doctorShort(doctorsDb.get(o.doctorId)?.fullName ?? ''),
  date: o.date,
  part: o.part,
  reason: o.reason,
})

export const doctorMock = {
  async getAll(): Promise<DoctorDto[]> {
    await mockDelay()
    requirePermission(permissions.doctors.view)
    ensureFresh()
    return sorted(doctorsDb.all()).map(toDto)
  },

  async getOptions(): Promise<DoctorOption[]> {
    await mockDelay(60, 120)
    requireSession()
    ensureFresh()
    return sorted(doctorsDb.filter((d) => d.isActive)).map((d) => doctorOption(d, specName(d.specialtyId)))
  },

  async getAccountCandidates(): Promise<AccountCandidate[]> {
    await mockDelay(60, 120)
    requirePermission(permissions.doctors.update, permissions.doctors.create)
    return liveUsers()
      .filter((u) => u.isActive && rolesOfUser(u).some((r) => r.code === roleCodes.doctor))
      .sort((a, b) => (a.username < b.username ? -1 : 1))
      .map((u) => {
        const link = doctorsDb.find((d) => d.userId === u.id)
        return { id: u.id, username: u.username, fullName: u.fullName, linkedDoctorId: link?.id ?? null, linkedDoctorName: link ? doctorShort(link.fullName) : null }
      })
  },

  async nextCode(): Promise<NextCodeDto> {
    await mockDelay(60, 120)
    requirePermission(permissions.doctors.create)
    return { code: nextCatalogCode(doctorsDb.all().map((d) => d.code), 'BS', 2) }
  },

  async create(input: SaveDoctorInput): Promise<DoctorDto> {
    await mockDelay()
    requirePermission(permissions.doctors.create)
    ensureFresh()
    const e = validateDoctor(input)
    if (hasErrors(e)) throw fieldErrors(e)
    const code = input.code.trim().toUpperCase()
    if (doctorsDb.some((d) => d.code === code)) throw conflictError(null, `Mã ${code} đã có.`, 'code')
    const spec = specialtiesDb.get(input.specialtyId)
    if (!spec) throw conflictError(null, 'Chuyên khoa không tồn tại.', 'specialtyId')
    ensureAccount(input.userId, null)
    const record: DoctorRecord = {
      id: newId(),
      code,
      fullName: input.fullName.trim(),
      title: input.title?.trim() || null,
      specialtyId: input.specialtyId,
      room: input.room.trim(),
      photoUrl: input.photoUrl?.trim() || null,
      bio: input.bio?.trim() || null,
      userId: input.userId,
      slotMinutes: input.slotMinutes ?? 30,
      maxPerSlot: input.maxPerSlot ?? Math.max(1, spec.defaultMaxPerSlot),
      showOnline: input.showOnline,
      isActive: true,
      sortOrder: doctorsDb.all().reduce((m, d) => Math.max(m, d.sortOrder), 0) + 10,
      hours: [],
    }
    doctorsDb.insert(record)
    auditCreate('Doctor', record)
    return toDto(record)
  },

  async update(id: string, input: SaveDoctorInput): Promise<DoctorDto> {
    await mockDelay()
    requirePermission(permissions.doctors.update)
    const before = doctorsDb.get(id)
    if (!before) throw notFoundError('Không tìm thấy bác sĩ.')
    const e = validateDoctor(input)
    if (hasErrors(e)) throw fieldErrors(e)
    const code = input.code.trim().toUpperCase()
    if (doctorsDb.some((d) => d.code === code && d.id !== id)) throw conflictError(null, `Mã ${code} đã có.`, 'code')
    if (!specialtiesDb.get(input.specialtyId)) throw conflictError(null, 'Chuyên khoa không tồn tại.', 'specialtyId')
    ensureAccount(input.userId, id)
    const after = doctorsDb.update(id, {
      code,
      fullName: input.fullName.trim(),
      title: input.title?.trim() || null,
      specialtyId: input.specialtyId,
      room: input.room.trim(),
      photoUrl: input.photoUrl?.trim() || null,
      bio: input.bio?.trim() || null,
      userId: input.userId,
      showOnline: input.showOnline,
      ...(input.slotMinutes ? { slotMinutes: input.slotMinutes } : {}),
      ...(input.maxPerSlot ? { maxPerSlot: input.maxPerSlot } : {}),
    })!
    auditUpdate('Doctor', before, after)
    return toDto(after)
  },

  async saveSchedule(id: string, input: SaveScheduleInput): Promise<DoctorDto> {
    await mockDelay()
    requirePermission(permissions.doctors.update)
    const before = doctorsDb.get(id)
    if (!before) throw notFoundError('Không tìm thấy bác sĩ.')
    const e = validateSchedule(input)
    if (hasErrors(e)) throw fieldErrors(e)
    const after = doctorsDb.update(id, {
      slotMinutes: input.slotMinutes,
      maxPerSlot: input.maxPerSlot,
      hours: input.hours
        .map((h) => ({ dayOfWeek: h.dayOfWeek, startMinute: parseHhmm(h.startTime), endMinute: parseHhmm(h.endTime) }))
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startMinute - b.startMinute),
    })!
    auditUpdate('Doctor', before, after)
    return toDto(after)
  },

  async setActive(id: string, isActive: boolean): Promise<DoctorDto> {
    await mockDelay()
    requirePermission(permissions.doctors.update)
    const before = doctorsDb.get(id)
    if (!before) throw notFoundError('Không tìm thấy bác sĩ.')
    const after = doctorsDb.update(id, { isActive })!
    auditUpdate('Doctor', before, after)
    return toDto(after)
  },

  async remove(id: string): Promise<void> {
    await mockDelay()
    requirePermission(permissions.doctors.delete)
    const record = doctorsDb.get(id)
    if (!record) throw notFoundError('Không tìm thấy bác sĩ.')
    if (
      appointmentsDb.some((a) => a.doctorId === id) ||
      visitsDb.some((v) => v.doctorId === id) ||
      plansDb.some((p) => p.doctorId === id) ||
      followUpsDb.some((f) => f.doctorId === id)
    )
      throw inUse('Bác sĩ đã có lịch hẹn hoặc lượt khám. Hãy chọn "Ngừng".')
    daysOffDb.removeWhere((o) => o.doctorId === id)
    doctorsDb.remove(id)
    auditDelete('Doctor', record)
  },

  async getDaysOff(query: DayOffQuery): Promise<DayOffDto[]> {
    await mockDelay()
    requirePermission(permissions.doctors.view)
    ensureFresh()
    const from = query.from || addDaysKey(today(), -30)
    return daysOffDb
      .filter((o) => o.date >= from && (!query.to || o.date <= query.to) && (!query.doctorId || o.doctorId === query.doctorId))
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map(dayOffDto)
  },

  async createDayOff(input: CreateDayOffInput): Promise<DayOffResult> {
    await mockDelay()
    requirePermission(permissions.doctors.update)
    ensureFresh()
    const errors: Record<string, string> = {}
    if (!input.doctorId) errors.doctorId = 'Chọn bác sĩ'
    if (!input.date) errors.date = 'Chọn ngày nghỉ'
    if (!input.reason?.trim()) errors.reason = 'Nhập lý do nghỉ'
    if (Object.keys(errors).length) throw fieldErrors(errors)
    const doctor = doctorsDb.get(input.doctorId)
    if (!doctor) throw notFoundError('Không tìm thấy bác sĩ.')
    if (input.date < today()) throw fieldError('date', 'Ngày nghỉ phải từ hôm nay trở đi')
    if (daysOffDb.some((o) => o.doctorId === doctor.id && o.date === input.date))
      throw conflictError(null, `Bác sĩ đã có ngày nghỉ ${input.date.split('-').reverse().join('/')}.`, 'date')
    const record: DayOffRecord = { id: newId(), doctorId: doctor.id, date: input.date, part: input.part, reason: input.reason.trim() }
    daysOffDb.insert(record)
    auditCreate('DayOff', record)
    const affected = appointmentsDb
      .filter((a) => a.doctorId === doctor.id && a.date === input.date && isActiveAppointment(a.status))
      .filter((a) => input.part === 'CaNgay' || (input.part === 'Sang' ? minuteOf(a.startAt) < clinicRules.noonMinute : minuteOf(a.startAt) >= clinicRules.noonMinute))
      .sort((a, b) => (a.startAt < b.startAt ? -1 : 1))
    return {
      dayOff: dayOffDto(record),
      affected: affected.map((a) => appointmentBrief(a, a.patientId ? patientsDb.get(a.patientId) : null, doctor)),
    }
  },

  async deleteDayOff(id: string): Promise<void> {
    await mockDelay()
    requirePermission(permissions.doctors.update)
    const record = daysOffDb.get(id)
    if (!record) throw notFoundError('Không tìm thấy ngày nghỉ.')
    daysOffDb.remove(id)
    auditDelete('DayOff', record)
  },
}
