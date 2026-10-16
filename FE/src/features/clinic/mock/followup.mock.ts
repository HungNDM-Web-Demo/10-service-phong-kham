import { permissions } from '@/config/permissions'
import { mockDelay } from '@/lib/data-source'
import { normalizeVi } from '@/lib/normalize'
import { requirePermission } from '@/mock/mock-auth'
import { newId, paginate, sortItems } from '@/mock/mock-helpers'
import type { CallResultInput, FollowUpDto, FollowUpPageDto, FollowUpQuery, SendFollowUpResultItem, SendFollowUpsResult } from '@/types/clinic'
import { clinicRules, doctorShort, followUpMessage } from '../lib/rules'
import { diffDaysKey } from '../lib/vn-time'
import { conflictError, errorCodes, fieldError, invalidState, notFoundError } from './errors'
import { messageDto } from './mappers'
import { trimOrNull } from './patient-support'
import type { FollowUpRecord, MessageRecord } from './records'
import { addDaysKey, appointmentsDb, doctorsDb, ensureFresh, followUpsDb, messagesDb, nowIso, nowMs, patientsDb, profile, today, visitsDb } from './store'

/** Handler mock nhắc tái khám (07 §3.12, §4.10), giống BE `FollowUpService`. */

/** BR-30: tối đa 3 lần, cách nhau ít nhất 24 giờ. */
function sendBlockedReason(f: FollowUpRecord, now: number): string | null {
  if (f.status === 'DaQuayLai') return 'Bệnh nhân đã quay lại tái khám'
  if (f.sendCount >= clinicRules.maxReminderSends) return `Đã gửi đủ ${clinicRules.maxReminderSends} lần`
  if (f.lastSentAt && now - Date.parse(f.lastSentAt) < clinicRules.reminderGapHours * 3600_000) return 'Gửi lại sau 24 giờ'
  return null
}

function toDto(f: FollowUpRecord): FollowUpDto {
  const day = today()
  const patient = patientsDb.get(f.patientId)!
  const visit = visitsDb.get(f.visitId)
  const blocked = sendBlockedReason(f, nowMs())
  return {
    id: f.id,
    patientId: f.patientId,
    patientCode: patient.code,
    patientName: patient.fullName,
    patientPhone: patient.phone,
    doctorId: f.doctorId,
    doctorName: doctorShort(doctorsDb.get(f.doctorId)?.fullName ?? ''),
    visitId: f.visitId,
    visitCode: visit?.code ?? '',
    visitDate: visit?.date ?? '',
    dueDate: f.dueDate,
    daysToDue: diffDaysKey(day, f.dueDate),
    note: f.note,
    sendCount: f.sendCount,
    lastSentAt: f.lastSentAt,
    canSend: blocked === null,
    sendBlockedReason: blocked,
    callResult: f.callResult,
    callNote: f.callNote,
    calledAt: f.calledAt,
    status: f.status,
    appointmentId: f.appointmentId,
    appointmentCode: f.appointmentId ? (appointmentsDb.get(f.appointmentId)?.code ?? null) : null,
    returnedVisitId: f.returnedVisitId,
    returnedVisitCode: f.returnedVisitId ? (visitsDb.get(f.returnedVisitId)?.code ?? null) : null,
  }
}

export const followUpMock = {
  async getList(query: FollowUpQuery): Promise<FollowUpPageDto> {
    await mockDelay()
    requirePermission(permissions.followUps.view)
    ensureFresh()
    const day = today()
    const dueTo = addDaysKey(day, profile().followUpRemindDays)
    const dueFrom = addDaysKey(day, -clinicRules.followUpWindowAfter)
    const base = followUpsDb.filter(
      (f) => (!query.doctorId || f.doctorId === query.doctorId) && (!query.from || f.dueDate >= query.from) && (!query.to || f.dueDate <= query.to)
    )
    const isDue = (f: FollowUpRecord) => f.status === 'ChoNhac' && f.dueDate <= dueTo && f.dueDate >= dueFrom
    const isReminded = (f: FollowUpRecord) => f.status === 'DaNhac' || f.status === 'DaDatLich'
    const isOverdue = (f: FollowUpRecord) => f.status === 'QuaHan'
    const isReturned = (f: FollowUpRecord) => f.status === 'DaQuayLai'
    const counts = {
      due: base.filter(isDue).length,
      reminded: base.filter(isReminded).length,
      overdue: base.filter(isOverdue).length,
      returned: base.filter(isReturned).length,
    }
    const group = query.group ?? 'due'
    let list = base.filter(group === 'reminded' ? isReminded : group === 'overdue' ? isOverdue : group === 'returned' ? isReturned : isDue)
    const term = normalizeVi(query.search)
    if (term) {
      const patients = new Map(patientsDb.all().map((p) => [p.id, p]))
      list = list.filter((f) => {
        const p = patients.get(f.patientId)
        return normalizeVi(`${p?.fullName ?? ''} ${p?.phone ?? ''} ${p?.code ?? ''}`).includes(term)
      })
    }
    const sortDir = query.sortDir || (group === 'overdue' || group === 'returned' ? 'desc' : 'asc')
    const page = paginate(sortItems(list, query.sortBy || 'dueDate', sortDir), query)
    return { page: { ...page, items: page.items.map(toDto) }, counts }
  },

  async send(ids: string[]): Promise<SendFollowUpsResult> {
    await mockDelay()
    requirePermission(permissions.followUps.update)
    ensureFresh()
    const unique = [...new Set(ids)]
    if (unique.length === 0) throw fieldError('ids', 'Chọn dòng nhắc')
    const p = profile()
    const now = nowMs()
    const items: SendFollowUpResultItem[] = []
    for (const id of unique) {
      const f = followUpsDb.get(id)
      if (!f) {
        items.push({ id, sent: false, error: 'Không tìm thấy dòng nhắc', message: null })
        continue
      }
      const blocked = sendBlockedReason(f, now)
      if (blocked) {
        if (unique.length === 1) throw conflictError(errorCodes.guiNhacQuaSom, blocked)
        items.push({ id, sent: false, error: blocked, message: null })
        continue
      }
      const patient = patientsDb.get(f.patientId)!
      const message: MessageRecord = {
        id: newId(),
        kind: 'NhacTaiKham',
        channel: 'Zalo',
        phone: patient.phone,
        content: followUpMessage(p.name, patient.fullName, f.dueDate, doctorsDb.get(f.doctorId)?.fullName ?? '', p.hotline),
        sentAt: nowIso(),
        appointmentId: null,
        followUpId: f.id,
      }
      messagesDb.insert(message)
      followUpsDb.update(f.id, { sendCount: f.sendCount + 1, lastSentAt: message.sentAt, ...(f.status === 'ChoNhac' ? { status: 'DaNhac' as const } : {}) })
      items.push({ id, sent: true, error: null, message: messageDto(message) })
    }
    return { sentCount: items.filter((x) => x.sent).length, items }
  },

  async recordCall(id: string, input: CallResultInput): Promise<FollowUpDto> {
    await mockDelay()
    requirePermission(permissions.followUps.update)
    ensureFresh()
    if (!input.result) throw fieldError('result', 'Chọn kết quả gọi')
    const f = followUpsDb.get(id)
    if (!f) throw notFoundError('Không tìm thấy dòng nhắc.')
    if (f.status === 'DaQuayLai') throw invalidState('Bệnh nhân đã quay lại tái khám.')
    const next = followUpsDb.update(id, {
      callResult: input.result,
      callNote: trimOrNull(input.note),
      calledAt: nowIso(),
      ...(f.status === 'ChoNhac' ? { status: 'DaNhac' as const } : {}),
    })!
    return toDto(next)
  },
}
