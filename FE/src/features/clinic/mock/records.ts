import type {
  AppointmentCancelReason,
  AppointmentSource,
  AppointmentStatus,
  CallResult,
  DayOffPart,
  DiagnosisKind,
  DiscountType,
  FollowUpStatus,
  Gender,
  InvoiceLineKind,
  InvoiceStatus,
  MessageChannel,
  MessageKind,
  OrderStatus,
  PaymentMethod,
  PlanItemStatus,
  PlanStatus,
  ReceiptStatus,
  RevenueGroup,
  ServiceGroup,
  ServiceUnit,
  VisitStatus,
} from '@/types/clinic'

/**
 * Bản ghi trong mock-db, giống bảng BE (06 §4). Bảng con của lượt khám, kế hoạch, phiếu thanh toán lưu lồng trong bản ghi cha.
 * Thời điểm dạng ISO UTC, ngày thuần `yyyy-MM-dd`.
 */

export type MetaRecord = { id: 'meta'; anchor: number; date: string }

export type SpecialtyRecord = {
  id: string
  code: string
  name: string
  examServiceId: string | null
  defaultMaxPerSlot: number
  sortOrder: number
}

export type ServiceRecord = {
  id: string
  code: string
  name: string
  group: ServiceGroup
  specialtyId: string | null
  unit: ServiceUnit
  price: number
  requiresTooth: boolean
  isActive: boolean
}

export type MedicineRecord = {
  id: string
  code: string
  name: string
  activeIngredient: string
  strength: string | null
  dosageForm: string | null
  unit: string
  price: number
  isActive: boolean
}

export type DiagnosisRecord = { id: string; icdCode: string; name: string; specialtyId: string | null; isActive: boolean }

export type WorkingHourRecord = { dayOfWeek: number; startMinute: number; endMinute: number }

export type DoctorRecord = {
  id: string
  code: string
  fullName: string
  title: string | null
  specialtyId: string
  room: string
  photoUrl: string | null
  bio: string | null
  userId: string | null
  slotMinutes: number
  maxPerSlot: number
  showOnline: boolean
  isActive: boolean
  sortOrder: number
  hours: WorkingHourRecord[]
}

export type DayOffRecord = { id: string; doctorId: string; date: string; part: DayOffPart; reason: string }

export type PatientRecord = {
  id: string
  code: string
  fullName: string
  birthDate: string
  gender: Gender
  phone: string
  address: string | null
  contactPerson: string | null
  allergies: string | null
  medicalHistory: string | null
  note: string | null
  createdAt: string
}

export type PhraseRecord = { id: string; userId: string; text: string; createdAt: string }

export type PlanItemRecord = {
  id: string
  serviceId: string
  serviceCode: string
  serviceName: string
  unit: ServiceUnit
  teeth: string | null
  quantity: number
  unitPrice: number
  discountType: DiscountType | null
  discountValue: number
  discountAmount: number
  amount: number
  status: PlanItemStatus
  doneAt: string | null
  sortOrder: number
}

export type PlanRecord = {
  id: string
  code: string
  patientId: string
  doctorId: string
  plannedSessions: number
  note: string | null
  subTotal: number
  discountTotal: number
  total: number
  status: PlanStatus
  quotedAt: string | null
  acceptedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  cancelReason: string | null
  reviewedByName: string | null
  reviewedAt: string | null
  reviewNote: string | null
  createdByName: string | null
  createdAt: string
  items: PlanItemRecord[]
}

export type AppointmentRecord = {
  id: string
  code: string
  doctorId: string
  patientId: string | null
  guestName: string | null
  guestPhone: string | null
  guestBirthYear: number | null
  guestGender: Gender | null
  date: string
  startAt: string
  endAt: string
  source: AppointmentSource
  serviceId: string | null
  reason: string | null
  note: string | null
  status: AppointmentStatus
  cancelReason: AppointmentCancelReason | null
  cancelNote: string | null
  followUpId: string | null
  createdByName: string | null
  confirmedAt: string | null
  confirmedByName: string | null
  cancelledAt: string | null
  cancelledByName: string | null
  createdAt: string
}

export type VisitDiagnosisRecord = { id: string; kind: DiagnosisKind; icdCode: string | null; name: string; sortOrder: number }

export type VisitOrderRecord = {
  id: string
  serviceId: string
  serviceCode: string
  serviceName: string
  group: ServiceGroup
  unit: ServiceUnit
  teeth: string | null
  quantity: number
  unitPrice: number
  discount: number
  result: string | null
  imageUrls: string | null
  status: OrderStatus
  treatmentPlanItemId: string | null
  sortOrder: number
}

export type PrescriptionRecord = {
  id: string
  medicineId: string
  medicineCode: string
  name: string
  strength: string | null
  unit: string
  activeIngredient: string
  quantity: number
  days: number
  usage: string
  unitPrice: number
  allergyConfirmedByName: string | null
  allergyConfirmedAt: string | null
  sortOrder: number
}

export type VisitRecord = {
  id: string
  code: string
  patientId: string
  doctorId: string
  appointmentId: string | null
  date: string
  queueNumber: number
  checkedInAt: string
  initialQueueAt: string
  queueAt: string
  isPriority: boolean
  priorityReason: string | null
  isReturned: boolean
  isFollowUp: boolean
  followUpId: string | null
  skipCount: number
  startedAt: string | null
  calledAt: string | null
  callReason: string | null
  finishedAt: string | null
  status: VisitStatus
  reason: string | null
  cancelReason: string | null
  checkedInByName: string | null
  temperature: number | null
  pulse: number | null
  bpSystolic: number | null
  bpDiastolic: number | null
  weight: number | null
  height: number | null
  symptoms: string | null
  examination: string | null
  advice: string | null
  followUpDate: string | null
  followUpNote: string | null
  diagnoses: VisitDiagnosisRecord[]
  orders: VisitOrderRecord[]
  prescription: PrescriptionRecord[]
  createdAt: string
}

export type InvoiceLineRecord = {
  id: string
  kind: InvoiceLineKind
  reportGroup: RevenueGroup
  refId: string | null
  description: string
  note: string | null
  unitPrice: number
  quantity: number
  discount: number
  amount: number
  isOutside: boolean
  sortOrder: number
}

export type InvoiceRecord = {
  id: string
  code: string
  visitId: string
  patientId: string
  doctorId: string
  total: number
  medicineTotal: number
  paid: number
  status: InvoiceStatus
  cancelledAt: string | null
  createdAt: string
  lines: InvoiceLineRecord[]
}

export type ReceiptRecord = {
  id: string
  code: string
  invoiceId: string
  patientId: string
  amount: number
  method: PaymentMethod
  cashReceived: number | null
  changeAmount: number | null
  partialReason: string | null
  collectedAt: string
  collectedByName: string
  status: ReceiptStatus
  cancelReason: string | null
  cancelledAt: string | null
  cancelledByName: string | null
  clientRequestId: string | null
}

export type FollowUpRecord = {
  id: string
  patientId: string
  doctorId: string
  visitId: string
  dueDate: string
  note: string | null
  sendCount: number
  lastSentAt: string | null
  callResult: CallResult | null
  callNote: string | null
  calledAt: string | null
  appointmentId: string | null
  returnedVisitId: string | null
  status: FollowUpStatus
  createdAt: string
}

export type MessageRecord = {
  id: string
  kind: MessageKind
  channel: MessageChannel
  phone: string
  content: string
  sentAt: string
  appointmentId: string | null
  followUpId: string | null
}
