import { permissions } from '@/config/permissions'
import { mockDelay } from '@/lib/data-source'
import { normalizeVi } from '@/lib/normalize'
import { requirePermission } from '@/mock/mock-auth'
import { newId, paginate, sortItems } from '@/mock/mock-helpers'
import type { PaginatedResult } from '@/types/api'
import type {
  AppointmentCardDto,
  AppointmentDetailDto,
  AppointmentQuery,
  BoardDto,
  CancelAppointmentInput,
  ConfirmAppointmentInput,
  CreateAppointmentInput,
  DoctorSlotsDto,
  NewPatientInput,
  PendingCountDto,
  RescheduleInput,
  WeekDto,
} from '@/types/clinic'
import { clinicRules, confirmMessage, doctorShort } from '../lib/rules'
import { hasErrors, validateCancel } from '../lib/validation'
import { hhmm } from '../lib/vn-time'
import { fieldError, fieldErrors, invalidSlot, invalidState, notFoundError, slotFull } from './errors'
import { appointmentCard, isActiveAppointment, messageDto, patientBrief, patientPhoneOf } from './mappers'
import { createPatient, trimOrNull } from './patient-support'
import type { AppointmentRecord, DoctorRecord, PatientRecord } from './records'
import {
  actor,
  addDaysKey,
  appointmentsDb,
  doctorsDb,
  ensureFresh,
  followUpsDb,
  isoWeekdayOf,
  loadDay,
  messagesDb,
  nextDocCode,
  nowIso,
  nowMs,
  ownDoctor,
  patientsDb,
  profile,
  servicesDb,
  toIso,
  today,
  vnLocal,
  visitsDb,
} from './store'

/** Handler mock lịch hẹn (07 §3.1, §4.3), giống BE `AppointmentService`. */

const partLabel = (part: string | null) => (part === 'Sang' ? 'nghỉ sáng' : part === 'Chieu' ? 'nghỉ chiều' : 'nghỉ cả ngày')

function serviceName(id: string | null): string | null {
  return id ? (servicesDb.get(id)?.name ?? null) : null
}

function card(a: AppointmentRecord): AppointmentCardDto {
  return appointmentCard(a, a.patientId ? patientsDb.get(a.patientId) : null, doctorsDb.get(a.doctorId), serviceName(a.serviceId))
}

/** Tin xác nhận lịch giả lập (FR-12). */
export function confirmMessageRecord(a: AppointmentRecord, doctor: DoctorRecord, phone: string) {
  const local = vnLocal(a.startAt)
  messagesDb.insert({
    id: newId(),
    kind: 'XacNhanLich',
    channel: 'Zalo',
    phone,
    content: confirmMessage(profile().name, a.code, local.date, local.minute, doctor.fullName, doctor.room),
    sentAt: nowIso(),
    appointmentId: a.id,
    followUpId: null,
  })
}

/** 07 §3.1: khung của bác sĩ ở ngày đó, chưa bắt đầu, còn trống (không tính chính lịch đang đổi). */
function checkSlot(doctor: DoctorRecord, startAt: string, self: AppointmentRecord | null): { date: string; minute: number } {
  if (!doctor.isActive) throw invalidSlot('Bác sĩ đã ngừng nhận lịch.')
  const { date, minute } = vnLocal(startAt)
  const dd = loadDay(date).find((x) => x.doctor.id === doctor.id)!
  if (!dd.slots.includes(minute))
    throw invalidSlot(dd.offReason && dd.slots.length === 0 ? `Bác sĩ nghỉ ngày ${date.split('-').reverse().join('/')}: ${dd.offReason}` : 'Giờ đã chọn không phải khung làm việc của bác sĩ')
  if (Date.parse(startAt) <= nowMs()) throw invalidSlot('Khung giờ đã bắt đầu')
  let taken = dd.taken.get(minute) ?? 0
  if (self && self.doctorId === doctor.id && Date.parse(self.startAt) === Date.parse(startAt)) taken--
  if (taken >= doctor.maxPerSlot) throw slotFull('Khung đã đủ lịch hẹn')
  return { date, minute }
}

function resolvePatient(a: AppointmentRecord | null, patientId?: string | null, newPatient?: NewPatientInput | null): PatientRecord {
  if (patientId) {
    const p = patientsDb.get(patientId)
    if (!p) throw fieldError('patientId', 'Bệnh nhân không tồn tại')
    return p
  }
  if (newPatient) return createPatient(newPatient, 'newPatient.')
  if (a?.patientId) {
    const p = patientsDb.get(a.patientId)
    if (p) return p
  }
  throw fieldError('patientId', 'Chọn hồ sơ có sẵn hoặc tạo hồ sơ mới cho lịch đặt online')
}

export function appointmentDetail(a: AppointmentRecord): AppointmentDetailDto {
  const doctor = doctorsDb.get(a.doctorId)!
  const patient = a.patientId ? patientsDb.get(a.patientId) : null
  const day = today()
  const active = isActiveAppointment(a.status)
  return {
    id: a.id,
    code: a.code,
    doctorId: a.doctorId,
    doctorName: doctorShort(doctor.fullName),
    room: doctor.room,
    date: a.date,
    startAt: a.startAt,
    endAt: a.endAt,
    source: a.source,
    status: a.status,
    patient: patient ? patientBrief(patient, day) : null,
    guestName: a.guestName,
    guestPhone: a.guestPhone,
    guestBirthYear: a.guestBirthYear,
    guestGender: a.guestGender,
    serviceId: a.serviceId,
    serviceName: serviceName(a.serviceId),
    reason: a.reason,
    note: a.note,
    cancelReason: a.cancelReason,
    cancelNote: a.cancelNote,
    createdAt: a.createdAt,
    createdByName: a.createdByName,
    confirmedAt: a.confirmedAt,
    confirmedByName: a.confirmedByName,
    cancelledAt: a.cancelledAt,
    cancelledByName: a.cancelledByName,
    visitId: visitsDb.find((v) => v.appointmentId === a.id)?.id ?? null,
    messages: messagesDb
      .filter((m) => m.appointmentId === a.id)
      .sort((x, y) => (x.sentAt < y.sentAt ? -1 : 1))
      .map(messageDto),
    suggestions:
      a.patientId === null && a.guestPhone
        ? patientsDb
            .filter((p) => p.phone === a.guestPhone)
            .sort((x, y) => (x.code < y.code ? -1 : 1))
            .map((p) => patientBrief(p, day))
        : [],
    canConfirm: a.status === 'ChoXacNhan',
    canReschedule: active,
    canCancel: active,
    canCheckIn: active && a.date === day,
  }
}

export const appointmentMock = {
  async getBoard(date?: string, specialtyId?: string): Promise<BoardDto> {
    await mockDelay()
    requirePermission(permissions.appointments.view)
    ensureFresh()
    const day = date || today()
    const own = ownDoctor(actor())
    const list = appointmentsDb.filter((a) => a.date === day)
    const withAppointments = new Set(list.map((a) => a.doctorId))
    const doctors = loadDay(day)
      .filter((x) => x.doctor.isActive || withAppointments.has(x.doctor.id))
      .filter((x) => !specialtyId || x.doctor.specialtyId === specialtyId)
      .filter((x) => !own || x.doctor.id === own)
    const ids = new Set(doctors.map((x) => x.doctor.id))
    return {
      date: day,
      doctors: doctors.map((x) => ({
        id: x.doctor.id,
        code: x.doctor.code,
        displayName: doctorShort(x.doctor.fullName),
        room: x.doctor.room,
        specialtyId: x.doctor.specialtyId,
        specialtyName: x.specialtyName,
        slotMinutes: x.doctor.slotMinutes,
        maxPerSlot: x.doctor.maxPerSlot,
        offReason:
          x.offPart === 'CaNgay' || (x.slots.length === 0 && x.offReason !== null) ? x.offReason : x.offReason === null ? null : `${x.offReason} (${partLabel(x.offPart)})`,
        slots: x.slots.map((m) => ({ startAt: toIso(day, m), endAt: toIso(day, m + x.doctor.slotMinutes), taken: x.taken.get(m) ?? 0, max: x.doctor.maxPerSlot })),
      })),
      appointments: list
        .filter((a) => ids.has(a.doctorId))
        .sort((a, b) => (a.startAt < b.startAt ? -1 : a.startAt > b.startAt ? 1 : a.createdAt < b.createdAt ? -1 : 1))
        .map(card),
    }
  },

  async getWeek(start?: string): Promise<WeekDto> {
    await mockDelay()
    requirePermission(permissions.appointments.view)
    ensureFresh()
    const anchor = start || today()
    const monday = addDaysKey(anchor, 1 - isoWeekdayOf(anchor))
    const own = ownDoctor(actor())
    const days = Array.from({ length: 7 }, (_, n) => loadDay(addDaysKey(monday, n)))
    const counts = appointmentsDb.filter((a) => a.date >= monday && a.date <= addDaysKey(monday, 6) && a.status !== 'DaHuy')
    return {
      start: monday,
      doctors: days[0]
        .filter((x) => x.doctor.isActive && (!own || x.doctor.id === own))
        .map((x) => ({
          id: x.doctor.id,
          displayName: doctorShort(x.doctor.fullName),
          specialtyName: x.specialtyName,
          days: days.map((dayList, n) => {
            const date = addDaysKey(monday, n)
            const dd = dayList.find((y) => y.doctor.id === x.doctor.id)!
            const mine = counts.filter((c) => c.doctorId === x.doctor.id && c.date === date)
            return { date, total: mine.length, pending: mine.filter((c) => c.status === 'ChoXacNhan').length, capacity: dd.slots.length * dd.doctor.maxPerSlot }
          }),
        })),
    }
  },

  async getList(query: AppointmentQuery): Promise<PaginatedResult<AppointmentCardDto>> {
    await mockDelay()
    requirePermission(permissions.appointments.view)
    ensureFresh()
    const own = ownDoctor(actor())
    const term = normalizeVi(query.search)
    const patients = new Map(patientsDb.all().map((p) => [p.id, p]))
    const list = appointmentsDb.filter((a) => {
      if (own && a.doctorId !== own) return false
      if (query.status && a.status !== query.status) return false
      if (query.from && a.date < query.from) return false
      if (query.to && a.date > query.to) return false
      if (query.doctorId && a.doctorId !== query.doctorId) return false
      if (query.patientId && a.patientId !== query.patientId) return false
      if (term) {
        const p = a.patientId ? patients.get(a.patientId) : undefined
        const text = normalizeVi([a.code, a.guestName, a.guestPhone, p?.fullName, p?.phone, p?.code].filter(Boolean).join(' '))
        if (!text.includes(term)) return false
      }
      return true
    })
    const sortBy = query.sortBy || 'startAt'
    const sortDir = query.sortDir || (query.sortBy ? 'desc' : query.patientId ? 'desc' : 'asc')
    const page = paginate(sortItems(list, sortBy, sortDir), query)
    return { ...page, items: page.items.map(card) }
  },

  async getPendingCount(): Promise<PendingCountDto> {
    await mockDelay(40, 80)
    requirePermission(permissions.appointments.view)
    ensureFresh()
    const own = ownDoctor(actor())
    const day = today()
    return { count: appointmentsDb.count((a) => a.status === 'ChoXacNhan' && a.date >= day && (!own || a.doctorId === own)) }
  },

  async get(id: string): Promise<AppointmentDetailDto> {
    await mockDelay()
    requirePermission(permissions.appointments.view)
    ensureFresh()
    const a = appointmentsDb.get(id)
    const own = ownDoctor(actor())
    if (!a || (own && a.doctorId !== own)) throw notFoundError('Không tìm thấy lịch hẹn.')
    return appointmentDetail(a)
  },

  async getSlots(doctorId: string, date?: string): Promise<DoctorSlotsDto> {
    await mockDelay(60, 120)
    requirePermission(permissions.appointments.view)
    ensureFresh()
    const day = date || today()
    const dd = loadDay(day).find((x) => x.doctor.id === doctorId)
    if (!dd) throw notFoundError('Không tìm thấy bác sĩ.')
    const now = nowMs()
    return {
      date: day,
      offReason: dd.slots.length === 0 ? (dd.offReason ?? (dd.doctor.isActive ? 'Bác sĩ không làm việc ngày này' : 'Bác sĩ đã ngừng')) : dd.offReason,
      slots: dd.slots.map((m) => {
        const at = toIso(day, m)
        const taken = dd.taken.get(m) ?? 0
        return {
          startAt: at,
          time: hhmm(m),
          taken,
          max: dd.doctor.maxPerSlot,
          started: Date.parse(at) <= now,
          available: dd.doctor.isActive && Date.parse(at) > now && taken < dd.doctor.maxPerSlot,
        }
      }),
    }
  },

  async create(input: CreateAppointmentInput): Promise<AppointmentDetailDto> {
    await mockDelay()
    requirePermission(permissions.appointments.create)
    ensureFresh()
    const errors: Record<string, string> = {}
    if (!input.patientId && !input.newPatient) errors.patientId = 'Chọn bệnh nhân'
    if (!input.doctorId) errors.doctorId = 'Chọn bác sĩ'
    if (!input.startAt) errors.startAt = 'Chọn khung giờ'
    if ((input.reason ?? '').length > 300) errors.reason = 'Lý do khám tối đa 300 ký tự'
    if (Object.keys(errors).length) throw fieldErrors(errors)
    const me = actor()
    const doctor = doctorsDb.get(input.doctorId)
    if (!doctor) throw fieldError('doctorId', 'Bác sĩ không tồn tại')
    const { date, minute } = checkSlot(doctor, input.startAt, null)
    const patient = resolvePatient(null, input.patientId, input.newPatient)
    if (input.serviceId && !servicesDb.get(input.serviceId)?.isActive) throw fieldError('serviceId', 'Dịch vụ không còn dùng')
    const now = nowIso()
    const record: AppointmentRecord = {
      id: newId(),
      code: nextDocCode(clinicRules.appointmentPrefix, today()),
      doctorId: doctor.id,
      patientId: patient.id,
      guestName: null,
      guestPhone: null,
      guestBirthYear: null,
      guestGender: null,
      date,
      startAt: toIso(date, minute),
      endAt: toIso(date, minute + doctor.slotMinutes),
      source: 'LeTan',
      serviceId: input.serviceId || null,
      reason: trimOrNull(input.reason),
      note: trimOrNull(input.note),
      status: 'DaXacNhan',
      cancelReason: null,
      cancelNote: null,
      followUpId: null,
      createdByName: me.fullName,
      confirmedAt: now,
      confirmedByName: me.fullName,
      cancelledAt: null,
      cancelledByName: null,
      createdAt: now,
    }
    if (input.followUpId) {
      const fu = followUpsDb.get(input.followUpId)
      if (!fu) throw fieldError('followUpId', 'Không tìm thấy dòng nhắc')
      if (fu.status === 'DaQuayLai') throw invalidState('Bệnh nhân đã quay lại tái khám.')
      followUpsDb.update(fu.id, { status: 'DaDatLich', appointmentId: record.id })
      record.followUpId = fu.id
    }
    appointmentsDb.insert(record)
    confirmMessageRecord(record, doctor, patient.phone)
    return appointmentDetail(record)
  },

  async reschedule(id: string, input: RescheduleInput): Promise<AppointmentDetailDto> {
    await mockDelay()
    requirePermission(permissions.appointments.update)
    ensureFresh()
    const a = appointmentsDb.get(id)
    if (!a) throw notFoundError('Không tìm thấy lịch hẹn.')
    if (!isActiveAppointment(a.status)) throw invalidState('Chỉ đổi giờ lịch hẹn chưa tiếp đón (BR-06).')
    const doctor = doctorsDb.get(input.doctorId)
    if (!doctor) throw fieldError('doctorId', 'Bác sĩ không tồn tại')
    const { date, minute } = checkSlot(doctor, input.startAt, a)
    const next = appointmentsDb.update(id, {
      doctorId: doctor.id,
      date,
      startAt: toIso(date, minute),
      endAt: toIso(date, minute + doctor.slotMinutes),
    })!
    if (next.status === 'DaXacNhan') confirmMessageRecord(next, doctor, patientPhoneOf(next, next.patientId ? patientsDb.get(next.patientId) : null))
    return appointmentDetail(next)
  },

  async confirm(id: string, input: ConfirmAppointmentInput): Promise<AppointmentDetailDto> {
    await mockDelay()
    requirePermission(permissions.appointments.update)
    ensureFresh()
    const a = appointmentsDb.get(id)
    if (!a) throw notFoundError('Không tìm thấy lịch hẹn.')
    if (a.status !== 'ChoXacNhan') throw invalidState('Lịch hẹn không ở trạng thái chờ xác nhận.')
    const patient = resolvePatient(a, input.patientId, input.newPatient)
    const me = actor()
    const next = appointmentsDb.update(id, { patientId: patient.id, status: 'DaXacNhan', confirmedAt: nowIso(), confirmedByName: me.fullName })!
    confirmMessageRecord(next, doctorsDb.get(next.doctorId)!, patient.phone)
    return appointmentDetail(next)
  },

  async cancel(id: string, input: CancelAppointmentInput): Promise<AppointmentDetailDto> {
    await mockDelay()
    requirePermission(permissions.appointments.cancel)
    ensureFresh()
    const e = validateCancel(input)
    if (hasErrors(e)) throw fieldErrors(e)
    const a = appointmentsDb.get(id)
    if (!a) throw notFoundError('Không tìm thấy lịch hẹn.')
    if (!isActiveAppointment(a.status)) throw invalidState('Chỉ hủy lịch hẹn chưa tiếp đón (BR-06).')
    const me = actor()
    const next = appointmentsDb.update(id, {
      status: 'DaHuy',
      cancelReason: input.reason,
      cancelNote: trimOrNull(input.note),
      cancelledAt: nowIso(),
      cancelledByName: me.fullName,
    })!
    if (a.followUpId) {
      const fu = followUpsDb.get(a.followUpId)
      if (fu?.status === 'DaDatLich') followUpsDb.update(fu.id, { status: 'DaNhac', appointmentId: null })
    }
    return appointmentDetail(next)
  },
}

