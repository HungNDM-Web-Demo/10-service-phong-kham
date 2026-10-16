import { permissions } from '@/config/permissions'
import { mockDelay } from '@/lib/data-source'
import { requirePermission } from '@/mock/mock-auth'
import { newId } from '@/mock/mock-helpers'
import type {
  CallNextResultDto,
  CheckInInput,
  CheckInPreviewDto,
  CheckInPreviewQuery,
  CheckInResultDto,
  QueueDisplayDto,
  QueueTicketDto,
  QueueTodayDto,
  QueueVisitDto,
  ReasonInput,
} from '@/types/clinic'
import { autoPriorityReason, clinicRules, doctorShort, queueGroup, roomShort, shortName, ticketOf, visitStatusPhrase } from '../lib/rules'
import { conflictError, domainError, errorCodes, fieldError, fieldErrors, forbiddenError, invalidState, notFoundError } from './errors'
import { appointmentCard, inCallOrder, isActiveAppointment, isOpenVisit, patientBrief, queueVisitDto, waitMinutes } from './mappers'
import { createPatient, trimOrNull } from './patient-support'
import type { FollowUpRecord, VisitRecord } from './records'
import {
  actor,
  addDaysKey,
  appointmentsDb,
  displayCode,
  doctorsDb,
  ensureFresh,
  followUpsDb,
  loadDay,
  nextDocCode,
  nowIso,
  nowMs,
  ownDoctor,
  patientsDb,
  profile,
  servicesDb,
  today,
  visitsDb,
} from './store'

/** Handler mock tiếp đón, hàng chờ, màn hình sảnh (07 §3.4, §3.5, §4.5), giống BE `QueueService`. */

function mapVisit(v: VisitRecord): QueueVisitDto {
  const patient = patientsDb.get(v.patientId)!
  const doctor = doctorsDb.get(v.doctorId)!
  const appt = v.appointmentId ? appointmentsDb.get(v.appointmentId) : null
  return queueVisitDto(v, patient, doctor, appt?.startAt ?? null, nowMs(), today())
}

/** 07 §3.5 bước 5: dòng nhắc chưa quay lại, cùng bác sĩ, hôm nay trong khoảng từ 3 ngày trước tới 7 ngày sau ngày hẹn. */
function findFollowUp(patientId: string, doctorId: string, day: string): FollowUpRecord | undefined {
  const from = addDaysKey(day, -clinicRules.followUpWindowAfter)
  const to = addDaysKey(day, clinicRules.followUpWindowBefore)
  const dayNum = Date.parse(day)
  return followUpsDb
    .filter((f) => f.patientId === patientId && f.doctorId === doctorId && f.status !== 'DaQuayLai' && f.dueDate >= from && f.dueDate <= to)
    .sort((a, b) => Math.abs(Date.parse(a.dueDate) - dayNum) - Math.abs(Date.parse(b.dueDate) - dayNum) || (a.dueDate < b.dueDate ? -1 : 1))[0]
}

/** Số lượt chờ đứng trước một lượt (nhóm, giờ xếp hàng, STT) trong hàng của bác sĩ. */
function countAhead(doctorId: string, date: string, group: number, queueAt: string, queueNumber: number): number {
  return visitsDb
    .filter((v) => v.doctorId === doctorId && v.date === date && v.status === 'ChoKham')
    .filter((v) => {
      const g = queueGroup(v.isReturned, v.isPriority)
      return g < group || (g === group && (v.queueAt < queueAt || (v.queueAt === queueAt && v.queueNumber < queueNumber)))
    }).length
}

/** BR-12: một lượt đang khám mỗi bác sĩ. */
function ensureDoctorFree(doctorId: string, date: string, exceptId: string | null) {
  if (visitsDb.some((v) => v.doctorId === doctorId && v.date === date && v.status === 'DangKham' && v.id !== exceptId))
    throw conflictError(errorCodes.bacSiDangKham, 'Kết thúc khám hoặc chuyển Chờ kết quả trước')
}

function loadOwn(visitId: string): VisitRecord {
  const v = visitsDb.get(visitId)
  if (!v) throw notFoundError('Không tìm thấy lượt khám.')
  const own = ownDoctor(actor())
  if (own && v.doctorId !== own) throw forbiddenError('Lượt khám thuộc hàng chờ của bác sĩ khác.')
  return v
}

function start(v: VisitRecord, reason: string | null): VisitRecord {
  const now = nowIso()
  return visitsDb.update(v.id, { status: 'DangKham', startedAt: v.startedAt ?? now, calledAt: now, callReason: reason })!
}

const queueAtFor = (appointmentStartAt: string | null, nowMsValue: number) =>
  appointmentStartAt && nowMsValue <= Date.parse(appointmentStartAt) + clinicRules.lateToleranceMinutes * 60_000
    ? appointmentStartAt
    : new Date(nowMsValue).toISOString()

export const queueMock = {
  async getToday(): Promise<QueueTodayDto> {
    await mockDelay(60, 140)
    requirePermission(permissions.queueTickets.view)
    ensureFresh()
    const day = today()
    const me = actor()
    const own = ownDoctor(me)
    const visits = visitsDb.filter((v) => v.date === day)
    const appts = appointmentsDb.filter((a) => a.date === day)
    const checkedIn = new Set(visits.filter((v) => v.appointmentId).map((v) => v.appointmentId))
    const visitDoctors = new Set(visits.map((v) => v.doctorId))
    const now = nowMs()
    return {
      date: day,
      myDoctorId: me.doctorId,
      pendingAppointments: appts
        .filter((a) => isActiveAppointment(a.status) && !checkedIn.has(a.id) && (!own || a.doctorId === own))
        .sort((a, b) => (a.startAt < b.startAt ? -1 : a.startAt > b.startAt ? 1 : a.createdAt < b.createdAt ? -1 : 1))
        .map((a) =>
          appointmentCard(a, a.patientId ? patientsDb.get(a.patientId) : null, doctorsDb.get(a.doctorId), a.serviceId ? (servicesDb.get(a.serviceId)?.name ?? null) : null)
        ),
      doctors: loadDay(day)
        .filter((x) => (x.doctor.isActive && x.slots.length > 0) || visitDoctors.has(x.doctor.id))
        .filter((x) => !own || x.doctor.id === own)
        .map((x) => {
          const mine = visits.filter((v) => v.doctorId === x.doctor.id)
          const started = mine.filter((v) => v.startedAt)
          return {
            id: x.doctor.id,
            code: x.doctor.code,
            displayName: doctorShort(x.doctor.fullName),
            room: x.doctor.room,
            roomShort: roomShort(x.doctor.room),
            specialtyName: x.specialtyName,
            working: x.working,
            offReason: x.offReason,
            current: mine.filter((v) => v.status === 'DangKham').map(mapVisit)[0] ?? null,
            waiting: inCallOrder(mine.filter((v) => v.status === 'ChoKham')).map(mapVisit),
            awaiting: mine.filter((v) => v.status === 'ChoKetQua').sort((a, b) => a.queueNumber - b.queueNumber).map(mapVisit),
            doneCount: mine.filter((v) => v.status === 'ChoThanhToan' || v.status === 'HoanTat').length,
            avgWaitMinutes: started.length === 0 ? null : Math.round(started.reduce((s, v) => s + waitMinutes(v, now), 0) / started.length),
          }
        }),
    }
  },

  async previewCheckIn(query: CheckInPreviewQuery): Promise<CheckInPreviewDto> {
    await mockDelay(60, 120)
    requirePermission(permissions.queueTickets.create)
    ensureFresh()
    const day = today()
    const now = nowMs()
    const appointment = query.appointmentId ? appointmentsDb.get(query.appointmentId) : null
    if (query.appointmentId && !appointment) throw notFoundError('Không tìm thấy lịch hẹn.')
    const patientId = query.patientId ?? appointment?.patientId ?? null
    const patient = patientId ? patientsDb.get(patientId) : null
    const doctorId = query.doctorId ?? appointment?.doctorId ?? null
    const dd = doctorId ? loadDay(day).find((x) => x.doctor.id === doctorId) : undefined
    let openVisit: CheckInPreviewDto['openVisit'] = null
    let followUp: CheckInPreviewDto['followUp'] = null
    if (patient) {
      const open = visitsDb.find((v) => v.patientId === patient.id && isOpenVisit(v.status))
      if (open) {
        const d = doctorsDb.get(open.doctorId)!
        openVisit = { id: open.id, code: open.code, ticket: ticketOf(d.room, open.queueNumber), doctorName: doctorShort(d.fullName), status: open.status }
      }
      if (doctorId) {
        const fu = findFollowUp(patient.id, doctorId, day)
        if (fu) followUp = { id: fu.id, dueDate: fu.dueDate, doctorName: dd ? doctorShort(dd.doctor.fullName) : '', note: fu.note }
      }
    }
    const autoReason = patient ? autoPriorityReason(patient.birthDate, day) : null
    let waitingAhead = 0
    if (doctorId) {
      const queueAt = queueAtFor(appointment?.startAt ?? null, now)
      waitingAhead = countAhead(doctorId, day, queueGroup(false, autoReason !== null), queueAt, Number.MAX_SAFE_INTEGER)
    }
    return {
      patient: patient ? patientBrief(patient, day) : null,
      autoPriority: autoReason !== null,
      autoPriorityReason: autoReason,
      followUp,
      openVisit,
      doctorWorking: dd?.working ?? false,
      waitingAhead,
      lateForAppointment: appointment ? now > Date.parse(appointment.startAt) + clinicRules.lateToleranceMinutes * 60_000 : false,
    }
  },

  async checkIn(input: CheckInInput): Promise<CheckInResultDto> {
    await mockDelay()
    requirePermission(permissions.queueTickets.create)
    ensureFresh()
    const errors: Record<string, string> = {}
    if (!input.patientId && !input.newPatient && !input.appointmentId) errors.patientId = 'Chọn bệnh nhân'
    if (!input.doctorId) errors.doctorId = 'Chọn bác sĩ'
    if ((input.reason ?? '').length > 300) errors.reason = 'Lý do khám tối đa 300 ký tự'
    if (Object.keys(errors).length) throw fieldErrors(errors)
    const day = today()
    const now = nowMs()
    const me = actor()

    // 1. Lịch hẹn: còn hiệu lực, đúng hôm nay (BR-07)
    const appointment = input.appointmentId ? appointmentsDb.get(input.appointmentId) : null
    if (input.appointmentId) {
      if (!appointment) throw notFoundError('Không tìm thấy lịch hẹn.')
      if (!isActiveAppointment(appointment.status)) throw invalidState('Lịch hẹn đã tiếp đón, đã hủy hoặc không đến.')
      if (appointment.date !== day)
        throw domainError(errorCodes.khongTiepDonHomNay, `Lịch hẹn ngày ${appointment.date.split('-').reverse().join('/')}, không tiếp đón hôm nay`)
    }
    let patient
    if (input.patientId) {
      patient = patientsDb.get(input.patientId)
      if (!patient) throw fieldError('patientId', 'Bệnh nhân không tồn tại')
    } else if (input.newPatient) patient = createPatient(input.newPatient, 'newPatient.')
    else if (appointment?.patientId) patient = patientsDb.get(appointment.patientId)
    if (!patient) throw fieldError('patientId', 'Chọn hồ sơ có sẵn hoặc tạo hồ sơ mới cho lịch đặt online')

    // 2. Bác sĩ làm việc hôm nay
    const doctor = doctorsDb.get(input.doctorId)
    if (!doctor) throw fieldError('doctorId', 'Bác sĩ không tồn tại')
    const dd = loadDay(day).find((x) => x.doctor.id === doctor.id)!
    if (!dd.working) throw fieldError('doctorId', `${doctorShort(doctor.fullName)} không làm việc hôm nay`)

    // 3. Một lượt chưa kết thúc mỗi bệnh nhân (BR-07)
    const open = visitsDb.find((v) => v.patientId === patient!.id && isOpenVisit(v.status))
    if (open) {
      const od = doctorsDb.get(open.doctorId)!
      throw conflictError(
        errorCodes.benhNhanDangKham,
        `Bệnh nhân ${visitStatusPhrase(open.status)} với ${doctorShort(od.fullName)}, STT ${String(open.queueNumber).padStart(3, '0')}`,
        undefined,
        { visitId: open.id }
      )
    }

    // 4. Ưu tiên (BR-10)
    const autoReason = autoPriorityReason(patient.birthDate, day)
    const manualReason = input.isPriority ? trimOrNull(input.priorityReason) : null
    if (input.isPriority && !autoReason && !manualReason) throw fieldError('priorityReason', 'Chọn đối tượng ưu tiên')
    const priorityReason = autoReason ?? manualReason

    // 5. Tái khám theo hẹn (BR-20, BR-29)
    const followUp = findFollowUp(patient.id, doctor.id, day)

    // 6. Số thứ tự, giờ xếp hàng (BR-08, BR-09)
    const queueNumber = visitsDb.filter((v) => v.doctorId === doctor.id && v.date === day).reduce((m, v) => Math.max(m, v.queueNumber), 0) + 1
    const queueAt = queueAtFor(appointment?.startAt ?? null, now)
    const checkedAt = new Date(now).toISOString()
    const visit: VisitRecord = {
      id: newId(),
      code: nextDocCode(clinicRules.visitPrefix, day),
      patientId: patient.id,
      doctorId: doctor.id,
      appointmentId: appointment?.id ?? null,
      date: day,
      queueNumber,
      checkedInAt: checkedAt,
      initialQueueAt: queueAt,
      queueAt,
      isPriority: priorityReason !== null,
      priorityReason,
      isReturned: false,
      isFollowUp: !!followUp,
      followUpId: followUp?.id ?? null,
      skipCount: 0,
      startedAt: null,
      calledAt: null,
      callReason: null,
      finishedAt: null,
      status: 'ChoKham',
      reason: trimOrNull(input.reason) ?? appointment?.reason ?? null,
      cancelReason: null,
      checkedInByName: me.fullName,
      temperature: null,
      pulse: null,
      bpSystolic: null,
      bpDiastolic: null,
      weight: null,
      height: null,
      symptoms: null,
      examination: null,
      advice: null,
      followUpDate: null,
      followUpNote: null,
      diagnoses: [],
      orders: [],
      prescription: [],
      createdAt: checkedAt,
    }
    const ahead = countAhead(doctor.id, day, queueGroup(false, visit.isPriority), queueAt, queueNumber)
    visitsDb.insert(visit)
    if (appointment) {
      appointmentsDb.update(appointment.id, {
        status: 'DaDen',
        patientId: patient.id,
        ...(appointment.status === 'ChoXacNhan' ? { confirmedAt: checkedAt, confirmedByName: me.fullName } : {}),
      })
    }
    if (followUp) followUpsDb.update(followUp.id, { status: 'DaQuayLai', returnedVisitId: visit.id })
    return { visit: mapVisit(visit), waitingAhead: ahead, room: doctor.room }
  },

  async callNext(doctorId?: string | null): Promise<CallNextResultDto> {
    await mockDelay()
    requirePermission(permissions.queueTickets.call)
    ensureFresh()
    const me = actor()
    const target = me.doctorId ?? doctorId
    if (!target) throw fieldError('doctorId', 'Chọn bác sĩ')
    const day = today()
    ensureDoctorFree(target, day, null)
    const next = inCallOrder(visitsDb.filter((v) => v.doctorId === target && v.date === day && v.status === 'ChoKham'))[0]
    if (!next) return { visit: null }
    return { visit: mapVisit(start(next, null)) }
  },

  async call(visitId: string, reason: string): Promise<QueueVisitDto> {
    await mockDelay()
    requirePermission(permissions.queueTickets.call)
    ensureFresh()
    if (!reason?.trim()) throw fieldError('reason', 'Chọn lý do gọi trước')
    const v = loadOwn(visitId)
    if (v.status !== 'ChoKham') throw invalidState('Chỉ gọi lượt đang chờ khám.')
    ensureDoctorFree(v.doctorId, v.date, v.id)
    return mapVisit(start(v, reason.trim()))
  },

  async recall(visitId: string): Promise<QueueVisitDto> {
    await mockDelay()
    requirePermission(permissions.queueTickets.call)
    const v = loadOwn(visitId)
    if (v.status !== 'DangKham') throw invalidState('Chỉ gọi lại lượt đang khám.')
    return mapVisit(visitsDb.update(v.id, { calledAt: nowIso() })!)
  },

  /** BR-11: về cuối nhóm; lần thứ 3 thì bỏ về. */
  async skip(visitId: string): Promise<QueueVisitDto> {
    await mockDelay()
    requirePermission(permissions.queueTickets.call)
    const v = loadOwn(visitId)
    if (v.status !== 'DangKham') throw invalidState('Chỉ bỏ qua lượt đang khám.')
    const skipCount = v.skipCount + 1
    const next =
      skipCount >= clinicRules.maxSkips
        ? visitsDb.update(v.id, { skipCount, status: 'BoVe', cancelReason: clinicRules.skipCancel })!
        : visitsDb.update(v.id, { skipCount, status: 'ChoKham', queueAt: nowIso(), startedAt: null, calledAt: null, callReason: null })!
    return mapVisit(next)
  },

  async awaitResults(visitId: string): Promise<QueueVisitDto> {
    await mockDelay()
    requirePermission(permissions.queueTickets.call)
    const v = loadOwn(visitId)
    if (v.status !== 'DangKham') throw invalidState('Chỉ chuyển chờ kết quả với lượt đang khám.')
    return mapVisit(visitsDb.update(v.id, { status: 'ChoKetQua' })!)
  },

  async returned(visitId: string): Promise<QueueVisitDto> {
    await mockDelay()
    requirePermission(permissions.queueTickets.update)
    const v = visitsDb.get(visitId)
    if (!v) throw notFoundError('Không tìm thấy lượt khám.')
    if (v.status !== 'ChoKetQua') throw invalidState('Lượt không ở trạng thái chờ kết quả.')
    return mapVisit(visitsDb.update(v.id, { status: 'ChoKham', isReturned: true, queueAt: nowIso() })!)
  },

  async transfer(visitId: string, doctorId: string): Promise<QueueVisitDto> {
    await mockDelay()
    requirePermission(permissions.queueTickets.update)
    ensureFresh()
    const v = visitsDb.get(visitId)
    if (!v) throw notFoundError('Không tìm thấy lượt khám.')
    if (v.status !== 'ChoKham') throw invalidState('Chỉ chuyển bác sĩ cho lượt đang chờ khám.')
    if (!doctorId) throw fieldError('doctorId', 'Chọn bác sĩ')
    if (v.doctorId === doctorId) throw fieldError('doctorId', 'Chọn bác sĩ khác')
    const day = today()
    const doctor = doctorsDb.get(doctorId)
    if (!doctor) throw fieldError('doctorId', 'Bác sĩ không tồn tại')
    const dd = loadDay(day).find((x) => x.doctor.id === doctor.id)!
    if (!dd.working) throw fieldError('doctorId', `${doctorShort(doctor.fullName)} không làm việc hôm nay`)
    const queueNumber = visitsDb.filter((x) => x.doctorId === doctor.id && x.date === day).reduce((m, x) => Math.max(m, x.queueNumber), 0) + 1
    return mapVisit(visitsDb.update(v.id, { doctorId: doctor.id, queueNumber, queueAt: nowIso() })!)
  },

  async cancel(visitId: string, input: ReasonInput): Promise<QueueVisitDto> {
    await mockDelay()
    requirePermission(permissions.queueTickets.update)
    if (!input.reason?.trim()) throw fieldError('reason', 'Nhập lý do')
    const v = visitsDb.get(visitId)
    if (!v) throw notFoundError('Không tìm thấy lượt khám.')
    if (v.status !== 'ChoKham' && v.status !== 'ChoKetQua') throw invalidState('Chỉ hủy lượt đang chờ khám hoặc chờ kết quả.')
    return mapVisit(visitsDb.update(v.id, { status: 'BoVe', cancelReason: input.reason.trim() })!)
  },

  async getTicket(visitId: string): Promise<QueueTicketDto> {
    await mockDelay(40, 80)
    requirePermission(permissions.queueTickets.view)
    const v = visitsDb.get(visitId)
    if (!v) throw notFoundError('Không tìm thấy lượt khám.')
    const patient = patientsDb.get(v.patientId)!
    const doctor = doctorsDb.get(v.doctorId)!
    const p = profile()
    return {
      clinicName: p.name,
      clinicAddress: p.address,
      hotline: p.hotline,
      logoUrl: p.logoUrl,
      visitId: v.id,
      code: v.code,
      ticket: ticketOf(doctor.room, v.queueNumber),
      queueNumber: v.queueNumber,
      room: doctor.room,
      doctorName: doctorShort(doctor.fullName),
      patientName: patient.fullName,
      patientCode: patient.code,
      isPriority: v.isPriority,
      priorityReason: v.priorityReason,
      checkedInAt: v.checkedInAt,
      waitingAhead: v.status === 'ChoKham' ? countAhead(v.doctorId, v.date, queueGroup(v.isReturned, v.isPriority), v.queueAt, v.queueNumber) : 0,
    }
  },

  async getDisplay(code: string | null | undefined): Promise<QueueDisplayDto> {
    await mockDelay(40, 80)
    ensureFresh()
    const expected = displayCode()
    if (!expected || (code ?? '').trim() !== expected) throw notFoundError('Mã màn hình không đúng', errorCodes.saiMaManHinh)
    const day = today()
    const p = profile()
    const visits = visitsDb.filter((v) => v.date === day)
    const visitDoctors = new Set(visits.map((v) => v.doctorId))
    const rooms = loadDay(day).filter((x) => (x.doctor.isActive && x.slots.length > 0) || visitDoctors.has(x.doctor.id))
    const patients = new Map(patientsDb.all().map((x) => [x.id, x]))
    const ticket = (v: VisitRecord, room: string) => ({
      ticket: ticketOf(room, v.queueNumber),
      patientName: shortName(patients.get(v.patientId)?.fullName ?? ''),
      isPriority: v.isPriority,
    })
    const last = visits
      .filter((v) => v.calledAt && v.status === 'DangKham')
      .sort((a, b) => (a.calledAt! < b.calledAt! ? 1 : -1))[0]
    const lastRoom = last ? rooms.find((r) => r.doctor.id === last.doctorId) : undefined
    return {
      clinicName: p.name,
      logoUrl: p.logoUrl,
      now: nowIso(),
      rooms: rooms.map((r) => {
        const mine = visits.filter((v) => v.doctorId === r.doctor.id)
        return {
          doctorId: r.doctor.id,
          room: r.doctor.room,
          roomShort: roomShort(r.doctor.room),
          doctorName: doctorShort(r.doctor.fullName),
          current: mine.filter((v) => v.status === 'DangKham').map((v) => ticket(v, r.doctor.room))[0] ?? null,
          next: inCallOrder(mine.filter((v) => v.status === 'ChoKham'))
            .slice(0, 5)
            .map((v) => ticket(v, r.doctor.room)),
        }
      }),
      lastCall:
        last && lastRoom
          ? {
              ticket: ticketOf(lastRoom.doctor.room, last.queueNumber),
              patientName: shortName(patients.get(last.patientId)?.fullName ?? ''),
              room: lastRoom.doctor.room,
              calledAt: last.calledAt!,
            }
          : null,
    }
  },
}
