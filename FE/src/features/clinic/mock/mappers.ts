import type {
  AppointmentBrief,
  AppointmentCardDto,
  DoctorDto,
  DoctorOption,
  InvoiceBrief,
  InvoiceLineDto,
  MessageDto,
  PatientBrief,
  PatientDto,
  QueueVisitDto,
  VisitStatus,
} from '@/types/clinic'
import { ageOn, doctorShort, queueGroup, roomShort, slotsOf, ticketOf } from '../lib/rules'
import { hhmm } from '../lib/vn-time'
import type {
  AppointmentRecord,
  DoctorRecord,
  InvoiceLineRecord,
  InvoiceRecord,
  MessageRecord,
  PatientRecord,
  ReceiptRecord,
  VisitRecord,
} from './records'

/** Chuyển bản ghi mock sang DTO, giống BE `ClinicMappings`. */

export const doctorName = (d: Pick<DoctorRecord, 'fullName'> | undefined | null) => (d ? doctorShort(d.fullName) : '')

export const patientBrief = (p: PatientRecord, today: string): PatientBrief => ({
  id: p.id,
  code: p.code,
  fullName: p.fullName,
  birthDate: p.birthDate,
  age: ageOn(p.birthDate, today),
  gender: p.gender,
  phone: p.phone,
  allergies: p.allergies,
})

export type PatientStats = { lastVisitAt: string | null; visitCount: number; debt: number; hasData: boolean }

export const patientDto = (p: PatientRecord, today: string, stats?: PatientStats): PatientDto => ({
  id: p.id,
  code: p.code,
  fullName: p.fullName,
  birthDate: p.birthDate,
  age: ageOn(p.birthDate, today),
  gender: p.gender,
  phone: p.phone,
  address: p.address,
  contactPerson: p.contactPerson,
  allergies: p.allergies,
  medicalHistory: p.medicalHistory,
  note: p.note,
  createdAt: p.createdAt,
  lastVisitAt: stats?.lastVisitAt ?? null,
  visitCount: stats?.visitCount ?? 0,
  debt: stats?.debt ?? 0,
  canDelete: stats ? !stats.hasData : false,
})

export function doctorDto(d: DoctorRecord, specialtyName: string, username: string | null): DoctorDto {
  const hours = [...d.hours].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startMinute - b.startMinute)
  return {
    id: d.id,
    code: d.code,
    fullName: d.fullName,
    title: d.title,
    displayName: doctorShort(d.fullName),
    specialtyId: d.specialtyId,
    specialtyName,
    room: d.room,
    roomShort: roomShort(d.room),
    photoUrl: d.photoUrl,
    bio: d.bio,
    userId: d.userId,
    username,
    slotMinutes: d.slotMinutes,
    maxPerSlot: d.maxPerSlot,
    showOnline: d.showOnline,
    isActive: d.isActive,
    sortOrder: d.sortOrder,
    hours: hours.map((h) => ({ dayOfWeek: h.dayOfWeek, startTime: hhmm(h.startMinute), endTime: hhmm(h.endMinute) })),
    weeklyHours: Math.round((hours.reduce((s, h) => s + h.endMinute - h.startMinute, 0) / 60) * 10) / 10,
    slotsPerDay: [1, 2, 3, 4, 5, 6, 7].map(
      (day) =>
        slotsOf(
          hours.filter((h) => h.dayOfWeek === day).map((h) => [h.startMinute, h.endMinute] as [number, number]),
          d.slotMinutes,
          null
        ).length
    ),
  }
}

export const doctorOption = (d: DoctorRecord, specialtyName: string): DoctorOption => ({
  id: d.id,
  code: d.code,
  fullName: d.fullName,
  displayName: doctorShort(d.fullName),
  specialtyId: d.specialtyId,
  specialtyName,
  room: d.room,
  roomShort: roomShort(d.room),
  slotMinutes: d.slotMinutes,
  maxPerSlot: d.maxPerSlot,
})

export const patientNameOf = (a: AppointmentRecord, patient: PatientRecord | undefined | null) => patient?.fullName ?? a.guestName ?? ''
export const patientPhoneOf = (a: AppointmentRecord, patient: PatientRecord | undefined | null) => patient?.phone ?? a.guestPhone ?? ''

export const appointmentCard = (
  a: AppointmentRecord,
  patient: PatientRecord | undefined | null,
  doctor: DoctorRecord | undefined | null,
  serviceName: string | null
): AppointmentCardDto => ({
  id: a.id,
  code: a.code,
  doctorId: a.doctorId,
  doctorName: doctorName(doctor),
  date: a.date,
  startAt: a.startAt,
  endAt: a.endAt,
  status: a.status,
  source: a.source,
  patientId: a.patientId,
  patientCode: patient?.code ?? null,
  patientName: patientNameOf(a, patient),
  patientPhone: patientPhoneOf(a, patient),
  isGuest: a.patientId === null,
  serviceName,
  reason: a.reason,
  createdAt: a.createdAt,
})

export const appointmentBrief = (a: AppointmentRecord, patient: PatientRecord | undefined | null, doctor: DoctorRecord | undefined | null): AppointmentBrief => ({
  id: a.id,
  code: a.code,
  date: a.date,
  startAt: a.startAt,
  patientName: patientNameOf(a, patient),
  patientPhone: patientPhoneOf(a, patient),
  doctorName: doctorName(doctor),
  status: a.status,
})

export const isActiveAppointment = (status: AppointmentRecord['status']) => status === 'ChoXacNhan' || status === 'DaXacNhan'

export const isOpenVisit = (status: VisitStatus) => status === 'ChoKham' || status === 'DangKham' || status === 'ChoKetQua'

/** Số phút đã chờ (07 §3.4): từ giờ xếp hàng ban đầu tới lúc bắt đầu khám, hoặc tới bây giờ khi chưa khám. */
export const waitMinutes = (v: VisitRecord, nowMs: number) =>
  Math.max(0, Math.floor(((v.startedAt ? Date.parse(v.startedAt) : nowMs) - Date.parse(v.initialQueueAt)) / 60_000))

export const queueVisitDto = (
  v: VisitRecord,
  patient: PatientRecord,
  doctor: DoctorRecord,
  appointmentStartAt: string | null,
  nowMs: number,
  today: string
): QueueVisitDto => ({
  id: v.id,
  code: v.code,
  doctorId: v.doctorId,
  doctorName: doctorName(doctor),
  queueNumber: v.queueNumber,
  ticket: ticketOf(doctor.room, v.queueNumber),
  patientId: v.patientId,
  patientCode: patient.code,
  patientName: patient.fullName,
  patientPhone: patient.phone,
  age: ageOn(patient.birthDate, today),
  gender: patient.gender,
  isPriority: v.isPriority,
  priorityReason: v.priorityReason,
  hasAppointment: v.appointmentId !== null,
  appointmentStartAt,
  isFollowUp: v.isFollowUp,
  isReturned: v.isReturned,
  status: v.status,
  checkedInAt: v.checkedInAt,
  queueAt: v.queueAt,
  initialQueueAt: v.initialQueueAt,
  startedAt: v.startedAt,
  calledAt: v.calledAt,
  waitMinutes: waitMinutes(v, nowMs),
  skipCount: v.skipCount,
  reason: v.reason,
})

/** Thứ tự gọi (BR-09): quay lại trước, ưu tiên, rồi giờ xếp hàng, STT. */
export const inCallOrder = (list: VisitRecord[]) =>
  [...list].sort(
    (a, b) =>
      queueGroup(a.isReturned, a.isPriority) - queueGroup(b.isReturned, b.isPriority) ||
      (a.queueAt < b.queueAt ? -1 : a.queueAt > b.queueAt ? 1 : 0) ||
      a.queueNumber - b.queueNumber
  )

export const invoiceBrief = (i: InvoiceRecord): InvoiceBrief => ({
  id: i.id,
  code: i.code,
  total: i.total,
  paid: i.paid,
  debt: invoiceDebt(i),
  status: i.status,
})

export const invoiceDebt = (i: InvoiceRecord) => (i.status === 'ChoThu' || i.status === 'ThuMotPhan' ? i.total - i.paid : 0)

export const lineDto = (l: InvoiceLineRecord): InvoiceLineDto => ({
  id: l.id,
  kind: l.kind,
  reportGroup: l.reportGroup,
  description: l.description,
  note: l.note,
  unitPrice: l.unitPrice,
  quantity: l.quantity,
  discount: l.discount,
  amount: l.amount,
  isOutside: l.isOutside,
})

export const messageDto = (m: MessageRecord): MessageDto => ({
  id: m.id,
  kind: m.kind,
  channel: m.channel,
  phone: m.phone,
  content: m.content,
  sentAt: m.sentAt,
})

export const isValidReceipt = (r: ReceiptRecord) => r.status === 'HopLe'

export const teethList = (teeth: string | null): number[] => (teeth ? teeth.split(',').map(Number).filter((n) => n > 0) : [])

export const imageList = (urls: string | null): string[] => (urls ? urls.split('\n').map((x) => x.trim()).filter(Boolean) : [])

export const money = (amount: number) => `${new Intl.NumberFormat('vi-VN').format(amount)} ₫`
