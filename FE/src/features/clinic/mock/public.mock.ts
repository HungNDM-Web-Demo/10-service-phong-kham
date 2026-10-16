import { mockDelay } from '@/lib/data-source'
import { newId } from '@/mock/mock-helpers'
import type {
  PublicAppointmentDto,
  PublicBookingInput,
  PublicCatalogDto,
  PublicLookupInput,
  PublicSlotsDto,
  PublicSlotsQuery,
} from '@/types/clinic'
import { clinicRules, digitsOnly, doctorTitled, maskPhone } from '../lib/rules'
import { phoneError } from '../lib/validation'
import { hhmm } from '../lib/vn-time'
import { domainError, errorCodes, fieldError, fieldErrors, invalidSlot, invalidState, notFoundError, slotFull, tooManyRequests } from './errors'
import { isActiveAppointment, patientNameOf, patientPhoneOf } from './mappers'
import { normalizeName, trimOrNull } from './patient-support'
import type { AppointmentRecord } from './records'
import {
  addDaysKey,
  appointmentsDb,
  doctorsDb,
  ensureFresh,
  loadDay,
  nextDocCode,
  nowIso,
  nowMs,
  patientsDb,
  profile,
  specialtiesDb,
  toIso,
  today,
  vnLocal,
} from './store'

/** Handler mock trang đặt lịch công khai, tra cứu, tự hủy (07 §3.2, §3.3, §4.4), giống BE `PublicBookingService`. */

const LOOKUP_MAX_FAILURES = 5
const LOOKUP_WINDOW_MS = 10 * 60_000
const lookupState: { failures: number[]; lockedUntil: number | null } = { failures: [], lockedUntil: null }

type OnlineDay = { times: { minute: number; available: boolean }[]; reason: string | null }

function onlineSlots(specialtyId: string, doctorId: string | null | undefined, date: string): OnlineDay {
  const day = today()
  if (date > addDaysKey(day, clinicRules.onlineMaxDaysAhead)) return { times: [], reason: null }
  const earliest = nowMs() + clinicRules.onlineMinLeadMinutes * 60_000
  const list = loadDay(date).filter((x) => x.doctor.isActive && x.doctor.showOnline && x.doctor.specialtyId === specialtyId && (!doctorId || x.doctor.id === doctorId))
  if (list.length === 0) return { times: [], reason: 'Không có bác sĩ nhận đặt online' }
  const working = list.filter((x) => x.slots.length > 0)
  if (working.length === 0) {
    const off = list.map((x) => x.offReason).find((r) => r !== null) ?? null
    return { times: [], reason: doctorId && off ? `Bác sĩ nghỉ ngày này (${off})` : 'Bác sĩ không làm việc ngày này' }
  }
  const byMinute = new Map<number, boolean>()
  for (const x of working)
    for (const m of x.slots) {
      if (Date.parse(toIso(date, m)) < earliest) continue
      const free = (x.taken.get(m) ?? 0) < x.doctor.maxPerSlot
      byMinute.set(m, (byMinute.get(m) ?? false) || free)
    }
  const times = [...byMinute.entries()].sort((a, b) => a[0] - b[0]).map(([minute, available]) => ({ minute, available }))
  return { times, reason: times.length === 0 ? 'Đã hết giờ nhận đặt online trong ngày' : null }
}

const canSelfCancel = (a: AppointmentRecord) =>
  isActiveAppointment(a.status) && Date.parse(a.startAt) - nowMs() >= clinicRules.selfCancelMinLeadMinutes * 60_000

function toPublic(a: AppointmentRecord): PublicAppointmentDto {
  const doctor = doctorsDb.get(a.doctorId)!
  const patient = a.patientId ? patientsDb.get(a.patientId) : null
  const p = profile()
  return {
    code: a.code,
    status: a.status,
    date: a.date,
    startAt: a.startAt,
    endAt: a.endAt,
    doctorName: doctorTitled(doctor.title, doctor.fullName),
    specialtyName: specialtiesDb.get(doctor.specialtyId)?.name ?? '',
    room: doctor.room,
    patientName: patientNameOf(a, patient),
    phoneMasked: maskPhone(patientPhoneOf(a, patient)),
    clinicName: p.name,
    clinicAddress: p.address,
    hotline: p.hotline,
    canCancel: canSelfCancel(a),
  }
}

/** Tìm lịch theo mã và số điện thoại; sai 5 lần trong 10 phút thì khóa 10 phút. */
function find(input: PublicLookupInput): AppointmentRecord {
  const now = nowMs()
  if (lookupState.lockedUntil && lookupState.lockedUntil > now)
    throw tooManyRequests('Bạn đã nhập sai 5 lần, vui lòng thử lại sau 10 phút', errorCodes.tamKhoaTraCuu, Math.ceil((lookupState.lockedUntil - now) / 1000))
  const code = (input.code ?? '').trim().toUpperCase()
  const digits = digitsOnly(input.phone ?? '')
  const a = appointmentsDb.find((x) => x.code === code && (x.guestPhone === digits || (x.patientId !== null && patientsDb.get(x.patientId)?.phone === digits)))
  if (a) {
    lookupState.failures = []
    lookupState.lockedUntil = null
    return a
  }
  lookupState.failures = lookupState.failures.filter((f) => now - f <= LOOKUP_WINDOW_MS)
  lookupState.failures.push(now)
  if (lookupState.failures.length >= LOOKUP_MAX_FAILURES) {
    lookupState.lockedUntil = now + LOOKUP_WINDOW_MS
    lookupState.failures = []
  }
  throw notFoundError('Không tìm thấy lịch hẹn với mã và số điện thoại này', 'KhongTimThay')
}

export const publicMock = {
  async getCatalog(): Promise<PublicCatalogDto> {
    await mockDelay()
    ensureFresh()
    const p = profile()
    const doctors = doctorsDb
      .filter((d) => d.isActive && d.showOnline)
      .sort((a, b) => a.sortOrder - b.sortOrder || (a.code < b.code ? -1 : 1))
    const specIds = new Set(doctors.map((d) => d.specialtyId))
    return {
      clinic: { name: p.name, address: p.address, hotline: p.hotline, workingHours: p.workingHours, logoUrl: p.logoUrl },
      specialties: specialtiesDb
        .filter((s) => specIds.has(s.id))
        .sort((a, b) => a.sortOrder - b.sortOrder || (a.code < b.code ? -1 : 1))
        .map((s) => ({ id: s.id, name: s.name })),
      doctors: doctors.map((d) => ({
        id: d.id,
        code: d.code,
        displayName: doctorTitled(d.title, d.fullName),
        fullName: d.fullName,
        specialtyId: d.specialtyId,
        room: d.room,
        photoUrl: d.photoUrl,
        bio: d.bio,
      })),
    }
  },

  async getSlots(query: PublicSlotsQuery): Promise<PublicSlotsDto> {
    await mockDelay(80, 160)
    ensureFresh()
    const day = today()
    let date = query.date || day
    if (date < day) date = day
    const slots = onlineSlots(query.specialtyId, query.doctorId, date)
    let closed: string | null = null
    let next: string | null = null
    if (slots.times.length === 0 || slots.times.every((t) => !t.available)) {
      closed =
        date > addDaysKey(day, clinicRules.onlineMaxDaysAhead)
          ? `Chỉ nhận đặt lịch trong ${clinicRules.onlineMaxDaysAhead} ngày tới`
          : (slots.reason ?? (slots.times.length === 0 ? 'Không còn khung giờ nhận đặt online trong ngày này' : 'Các khung giờ trong ngày đã kín lịch'))
      for (let n = 1; n <= clinicRules.onlineMaxDaysAhead; n++) {
        const candidate = addDaysKey(date, n)
        if (candidate > addDaysKey(day, clinicRules.onlineMaxDaysAhead)) break
        if (onlineSlots(query.specialtyId, query.doctorId, candidate).times.some((t) => t.available)) {
          next = candidate
          break
        }
      }
    }
    return {
      date,
      slots: slots.times.map((t) => ({ startAt: toIso(date, t.minute), time: hhmm(t.minute), available: t.available })),
      closedReason: closed,
      nextAvailableDate: next,
    }
  },

  async book(input: PublicBookingInput): Promise<PublicAppointmentDto> {
    await mockDelay()
    ensureFresh()
    const errors: Record<string, string> = {}
    if (!input.specialtyId) errors.specialtyId = 'Chọn chuyên khoa'
    if (!input.startAt) errors.startAt = 'Chọn khung giờ'
    if (!input.fullName?.trim()) errors.fullName = 'Nhập họ tên'
    const phoneMsg = phoneError(input.phone)
    if (phoneMsg) errors.phone = phoneMsg
    if (!(input.birthYear >= 1900 && input.birthYear <= 2100)) errors.birthYear = 'Năm sinh không hợp lệ'
    if ((input.reason ?? '').length > 300) errors.reason = 'Lý do khám tối đa 300 ký tự'
    if (Object.keys(errors).length) throw fieldErrors(errors)
    const day = today()
    if (input.birthYear > Number(day.slice(0, 4))) throw fieldError('birthYear', 'Năm sinh không được sau năm nay')
    const phone = digitsOnly(input.phone)
    const active = appointmentsDb.count((a) => a.source === 'Online' && a.guestPhone === phone && isActiveAppointment(a.status))
    if (active >= clinicRules.onlineMaxActivePerPhone)
      throw domainError(
        errorCodes.quaSoLichOnline,
        `Số điện thoại này đã có ${clinicRules.onlineMaxActivePerPhone} lịch hẹn sắp tới. Vui lòng gọi ${profile().hotline} để được hỗ trợ`
      )
    const { date, minute } = vnLocal(input.startAt)
    if (date > addDaysKey(day, clinicRules.onlineMaxDaysAhead) || Date.parse(input.startAt) < nowMs() + clinicRules.onlineMinLeadMinutes * 60_000)
      throw invalidSlot(`Chỉ đặt khung bắt đầu sau ít nhất 2 giờ và trong ${clinicRules.onlineMaxDaysAhead} ngày tới`)
    const list = loadDay(date).filter(
      (x) => x.doctor.isActive && x.doctor.showOnline && x.doctor.specialtyId === input.specialtyId && (!input.doctorId || x.doctor.id === input.doctorId)
    )
    if (input.doctorId && list.length === 0) throw invalidSlot('Bác sĩ không nhận đặt online')
    const withSlot = list.filter((x) => x.slots.includes(minute))
    if (withSlot.length === 0) throw invalidSlot('Giờ đã chọn không phải khung làm việc của bác sĩ')
    // BR-04: bác sĩ bất kỳ còn trống khung, ít lịch nhất trong ngày, bằng nhau thì mã nhỏ hơn
    const chosen = withSlot
      .filter((x) => (x.taken.get(minute) ?? 0) < x.doctor.maxPerSlot)
      .sort((a, b) => a.dayCount - b.dayCount || (a.doctor.code < b.doctor.code ? -1 : 1))[0]
    if (!chosen) throw slotFull('Khung giờ vừa hết chỗ, vui lòng chọn khung khác')
    const record: AppointmentRecord = {
      id: newId(),
      code: nextDocCode(clinicRules.appointmentPrefix, day),
      doctorId: chosen.doctor.id,
      patientId: null,
      guestName: normalizeName(input.fullName),
      guestPhone: phone,
      guestBirthYear: input.birthYear,
      guestGender: input.gender,
      date,
      startAt: toIso(date, minute),
      endAt: toIso(date, minute + chosen.doctor.slotMinutes),
      source: 'Online',
      serviceId: null,
      reason: trimOrNull(input.reason),
      note: null,
      status: 'ChoXacNhan',
      cancelReason: null,
      cancelNote: null,
      followUpId: null,
      createdByName: clinicRules.onlineCreatorName,
      confirmedAt: null,
      confirmedByName: null,
      cancelledAt: null,
      cancelledByName: null,
      createdAt: nowIso(),
    }
    appointmentsDb.insert(record)
    return toPublic(record)
  },

  async lookup(input: PublicLookupInput): Promise<PublicAppointmentDto> {
    await mockDelay()
    ensureFresh()
    return toPublic(find(input))
  },

  async cancel(input: PublicLookupInput): Promise<PublicAppointmentDto> {
    await mockDelay()
    ensureFresh()
    const a = find(input)
    if (!canSelfCancel(a)) throw invalidState(`Chỉ hủy được lịch chưa tiếp đón, trước giờ hẹn ít nhất 2 giờ. Vui lòng gọi ${profile().hotline}`)
    const next = appointmentsDb.update(a.id, {
      status: 'DaHuy',
      cancelReason: 'BenhNhanBan',
      cancelNote: 'Bệnh nhân tự hủy trên trang tra cứu',
      cancelledAt: nowIso(),
      cancelledByName: patientNameOf(a, a.patientId ? patientsDb.get(a.patientId) : null),
    })!
    return toPublic(next)
  },
}
