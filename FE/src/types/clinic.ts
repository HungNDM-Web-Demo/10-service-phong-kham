/**
 * Kiểu dữ liệu nghiệp vụ Phòng khám, khớp DTO BE (Application/DTOs/Clinic, Booking, Finance; 07 §5).
 * Ngày thuần dạng `yyyy-MM-dd`, thời điểm dạng ISO UTC.
 */

import type { PaginatedResult, PaginationQuery } from '@/types/api'

// ───────────────────────────── Enum (07 §2.1)

export type ServiceGroup = 'Kham' | 'ThuThuat' | 'CanLamSang'
export type ServiceUnit = 'Lan' | 'Rang' | 'Phim' | 'Ca'
export type Gender = 'Nam' | 'Nu'
export type DayOffPart = 'CaNgay' | 'Sang' | 'Chieu'
export type AppointmentSource = 'Online' | 'LeTan'
export type AppointmentStatus = 'ChoXacNhan' | 'DaXacNhan' | 'DaDen' | 'KhongDen' | 'DaHuy'
export type AppointmentCancelReason = 'BenhNhanBan' | 'BacSiNghi' | 'DatTrung' | 'Khac'
export type VisitStatus = 'ChoKham' | 'DangKham' | 'ChoKetQua' | 'ChoThanhToan' | 'HoanTat' | 'BoVe'
export type DiagnosisKind = 'Chinh' | 'Phu'
export type OrderStatus = 'ChoThucHien' | 'CoKetQua' | 'KhongThucHien' | 'DaLam'
export type PlanStatus = 'Nhap' | 'ChoDuyet' | 'DaBaoGia' | 'DangDieuTri' | 'HoanThanh' | 'DaHuy'
export type PlanItemStatus = 'ChuaLam' | 'DaLam' | 'DaHuy'
export type DiscountType = 'PhanTram' | 'SoTien'
export type InvoiceStatus = 'ChoThu' | 'ThuMotPhan' | 'DaThuDu' | 'DaHuy'
export type InvoiceLineKind = 'PhiKham' | 'DichVu' | 'Thuoc'
export type RevenueGroup = 'Kham' | 'ThuThuat' | 'CanLamSang' | 'Thuoc'
export type PaymentMethod = 'TienMat' | 'ChuyenKhoan' | 'The'
export type ReceiptStatus = 'HopLe' | 'DaHuy'
export type FollowUpStatus = 'ChoNhac' | 'DaNhac' | 'DaDatLich' | 'DaQuayLai' | 'QuaHan'
export type CallResult = 'DongYDen' | 'HenNgayKhac' | 'KhongLienLacDuoc'
export type MessageKind = 'XacNhanLich' | 'NhacLich' | 'NhacTaiKham'
export type MessageChannel = 'Zalo' | 'Sms'
export type FollowUpGroup = 'due' | 'reminded' | 'overdue' | 'returned'

// ───────────────────────────── Danh mục (07 §4.1)

export type SpecialtyDto = {
  id: string
  code: string
  name: string
  examServiceId: string | null
  examServiceName: string | null
  examFee: number
  defaultMaxPerSlot: number
}

export type ServiceDto = {
  id: string
  code: string
  name: string
  group: ServiceGroup
  specialtyId: string | null
  specialtyName: string | null
  unit: ServiceUnit
  price: number
  requiresTooth: boolean
  isActive: boolean
  isUsed: boolean
}

export type ServiceQuery = { group?: ServiceGroup; specialtyId?: string; search?: string; active?: boolean }

export type SaveServiceInput = {
  code: string
  name: string
  group: ServiceGroup
  specialtyId: string | null
  unit: ServiceUnit
  price: number
  requiresTooth: boolean
  isActive: boolean
}

export type NextCodeDto = { code: string }

export type MedicineDto = {
  id: string
  code: string
  name: string
  activeIngredient: string
  strength: string | null
  dosageForm: string | null
  unit: string
  price: number
  isActive: boolean
  isUsed: boolean
}

export type MedicineQuery = PaginationQuery & { active?: boolean }

export type SaveMedicineInput = {
  code: string
  name: string
  activeIngredient: string
  strength: string | null
  dosageForm: string | null
  unit: string
  price: number
  isActive: boolean
}

export type DiagnosisTemplateDto = {
  id: string
  icdCode: string
  name: string
  specialtyId: string | null
  specialtyName: string | null
  isActive: boolean
  isUsed: boolean
}

export type DiagnosisQuery = { search?: string; specialtyId?: string; active?: boolean }

export type SaveDiagnosisInput = { icdCode: string; name: string; specialtyId: string | null; isActive: boolean }

export type ClinicProfileDto = {
  name: string
  address: string
  hotline: string
  workingHours: string
  logoUrl: string | null
  bankBin: string
  bankAccount: string
  bankAccountName: string
  priorityReasons: string[]
  followUpRemindDays: number
}

// ───────────────────────────── Bác sĩ (07 §4.2)

export type WorkingHourDto = { dayOfWeek: number; startTime: string; endTime: string }

export type DoctorDto = {
  id: string
  code: string
  fullName: string
  title: string | null
  displayName: string
  specialtyId: string
  specialtyName: string
  room: string
  roomShort: string
  photoUrl: string | null
  bio: string | null
  userId: string | null
  username: string | null
  slotMinutes: number
  maxPerSlot: number
  showOnline: boolean
  isActive: boolean
  sortOrder: number
  hours: WorkingHourDto[]
  weeklyHours: number
  slotsPerDay: number[]
}

export type DoctorOption = {
  id: string
  code: string
  fullName: string
  displayName: string
  specialtyId: string
  specialtyName: string
  room: string
  roomShort: string
  slotMinutes: number
  maxPerSlot: number
}

export type SaveDoctorInput = {
  code: string
  fullName: string
  title: string | null
  specialtyId: string
  room: string
  photoUrl: string | null
  bio: string | null
  userId: string | null
  showOnline: boolean
  slotMinutes?: number | null
  maxPerSlot?: number | null
}

export type SaveScheduleInput = { slotMinutes: number; maxPerSlot: number; hours: WorkingHourDto[] }

export type AccountCandidate = {
  id: string
  username: string
  fullName: string
  linkedDoctorId: string | null
  linkedDoctorName: string | null
}

export type DayOffDto = { id: string; doctorId: string; doctorName: string; date: string; part: DayOffPart; reason: string }

export type DayOffQuery = { doctorId?: string; from?: string; to?: string }

export type CreateDayOffInput = { doctorId: string; date: string; part: DayOffPart; reason: string }

export type DayOffResult = { dayOff: DayOffDto; affected: AppointmentBrief[] }

// ───────────────────────────── Bệnh nhân (07 §4.7)

export type PatientBrief = {
  id: string
  code: string
  fullName: string
  birthDate: string
  age: number
  gender: Gender
  phone: string
  allergies: string | null
}

export type PatientDto = {
  id: string
  code: string
  fullName: string
  birthDate: string
  age: number
  gender: Gender
  phone: string
  address: string | null
  contactPerson: string | null
  allergies: string | null
  medicalHistory: string | null
  note: string | null
  createdAt: string
  lastVisitAt: string | null
  visitCount: number
  debt: number
  canDelete: boolean
}

export type PatientDetailDto = {
  patient: PatientDto
  upcomingAppointments: AppointmentBrief[]
  activePlanCount: number
  debtInvoiceCount: number
}

export type PatientQuery = PaginationQuery & { hasDebt?: boolean }

export type DuplicateQuery = { phone?: string; birthDate?: string; excludeId?: string }

export type DuplicateResultDto = { exact: PatientBrief[]; samePhone: PatientBrief[] }

export type SavePatientInput = {
  fullName: string
  birthDate: string
  gender: Gender
  phone: string
  address: string | null
  contactPerson: string | null
  allergies: string | null
  medicalHistory: string | null
  note: string | null
  force?: boolean
}

export type NewPatientInput = { fullName: string; phone: string; birthDate: string; gender: Gender; force?: boolean }

// ───────────────────────────── Lịch hẹn (07 §4.3)

export type AppointmentBrief = {
  id: string
  code: string
  date: string
  startAt: string
  patientName: string
  patientPhone: string | null
  doctorName: string
  status: AppointmentStatus
}

export type AppointmentCardDto = {
  id: string
  code: string
  doctorId: string
  doctorName: string
  date: string
  startAt: string
  endAt: string
  status: AppointmentStatus
  source: AppointmentSource
  patientId: string | null
  patientCode: string | null
  patientName: string
  patientPhone: string
  isGuest: boolean
  serviceName: string | null
  reason: string | null
  createdAt: string
}

export type BoardSlotDto = { startAt: string; endAt: string; taken: number; max: number }

export type BoardDoctorDto = {
  id: string
  code: string
  displayName: string
  room: string
  specialtyId: string
  specialtyName: string
  slotMinutes: number
  maxPerSlot: number
  offReason: string | null
  slots: BoardSlotDto[]
}

export type BoardDto = { date: string; doctors: BoardDoctorDto[]; appointments: AppointmentCardDto[] }

export type WeekCellDto = { date: string; total: number; pending: number; capacity: number }

export type WeekDoctorDto = { id: string; displayName: string; specialtyName: string; days: WeekCellDto[] }

export type WeekDto = { start: string; doctors: WeekDoctorDto[] }

export type SlotDto = { startAt: string; time: string; taken: number; max: number; available: boolean; started: boolean }

export type DoctorSlotsDto = { date: string; offReason: string | null; slots: SlotDto[] }

export type MessageDto = { id: string; kind: MessageKind; channel: MessageChannel; phone: string; content: string; sentAt: string }

export type AppointmentDetailDto = {
  id: string
  code: string
  doctorId: string
  doctorName: string
  room: string
  date: string
  startAt: string
  endAt: string
  source: AppointmentSource
  status: AppointmentStatus
  patient: PatientBrief | null
  guestName: string | null
  guestPhone: string | null
  guestBirthYear: number | null
  guestGender: Gender | null
  serviceId: string | null
  serviceName: string | null
  reason: string | null
  note: string | null
  cancelReason: AppointmentCancelReason | null
  cancelNote: string | null
  createdAt: string
  createdByName: string | null
  confirmedAt: string | null
  confirmedByName: string | null
  cancelledAt: string | null
  cancelledByName: string | null
  visitId: string | null
  messages: MessageDto[]
  suggestions: PatientBrief[]
  canConfirm: boolean
  canReschedule: boolean
  canCancel: boolean
  canCheckIn: boolean
}

export type AppointmentQuery = PaginationQuery & {
  status?: AppointmentStatus
  from?: string
  to?: string
  doctorId?: string
  patientId?: string
}

export type CreateAppointmentInput = {
  patientId?: string | null
  newPatient?: NewPatientInput | null
  doctorId: string
  startAt: string
  serviceId?: string | null
  reason?: string | null
  note?: string | null
  followUpId?: string | null
}

export type RescheduleInput = { doctorId: string; startAt: string }

export type ConfirmAppointmentInput = { patientId?: string | null; newPatient?: NewPatientInput | null }

export type CancelAppointmentInput = { reason: AppointmentCancelReason; note?: string | null }

export type PendingCountDto = { count: number }

// ───────────────────────────── Đặt lịch online (07 §4.4)

export type PublicClinicDto = { name: string; address: string; hotline: string; workingHours: string; logoUrl: string | null }

export type PublicSpecialtyDto = { id: string; name: string }

export type PublicDoctorDto = {
  id: string
  code: string
  displayName: string
  fullName: string
  specialtyId: string
  room: string
  photoUrl: string | null
  bio: string | null
}

export type PublicCatalogDto = { clinic: PublicClinicDto; specialties: PublicSpecialtyDto[]; doctors: PublicDoctorDto[] }

export type PublicSlotsQuery = { specialtyId: string; doctorId?: string | null; date?: string | null }

export type PublicSlotDto = { startAt: string; time: string; available: boolean }

export type PublicSlotsDto = { date: string; slots: PublicSlotDto[]; closedReason: string | null; nextAvailableDate: string | null }

export type PublicBookingInput = {
  specialtyId: string
  doctorId?: string | null
  startAt: string
  fullName: string
  phone: string
  birthYear: number
  gender: Gender
  reason?: string | null
}

export type PublicLookupInput = { code: string; phone: string }

export type PublicAppointmentDto = {
  code: string
  status: AppointmentStatus
  date: string
  startAt: string
  endAt: string
  doctorName: string
  specialtyName: string
  room: string
  patientName: string
  phoneMasked: string
  clinicName: string
  clinicAddress: string
  hotline: string
  canCancel: boolean
}

// ───────────────────────────── Hàng chờ (07 §4.5)

export type QueueVisitDto = {
  id: string
  code: string
  doctorId: string
  doctorName: string
  queueNumber: number
  ticket: string
  patientId: string
  patientCode: string
  patientName: string
  patientPhone: string
  age: number
  gender: Gender
  isPriority: boolean
  priorityReason: string | null
  hasAppointment: boolean
  appointmentStartAt: string | null
  isFollowUp: boolean
  isReturned: boolean
  status: VisitStatus
  checkedInAt: string
  queueAt: string
  initialQueueAt: string
  startedAt: string | null
  calledAt: string | null
  waitMinutes: number
  skipCount: number
  reason: string | null
}

export type QueueDoctorDto = {
  id: string
  code: string
  displayName: string
  room: string
  roomShort: string
  specialtyName: string
  working: boolean
  offReason: string | null
  current: QueueVisitDto | null
  waiting: QueueVisitDto[]
  awaiting: QueueVisitDto[]
  doneCount: number
  avgWaitMinutes: number | null
}

export type QueueTodayDto = {
  date: string
  myDoctorId: string | null
  pendingAppointments: AppointmentCardDto[]
  doctors: QueueDoctorDto[]
}

export type CheckInPreviewQuery = { appointmentId?: string | null; patientId?: string | null; doctorId?: string | null }

export type OpenVisitBrief = { id: string; code: string; ticket: string; doctorName: string; status: VisitStatus }

export type FollowUpBrief = { id: string; dueDate: string; doctorName: string; note: string | null }

export type CheckInPreviewDto = {
  patient: PatientBrief | null
  autoPriority: boolean
  autoPriorityReason: string | null
  followUp: FollowUpBrief | null
  openVisit: OpenVisitBrief | null
  doctorWorking: boolean
  waitingAhead: number
  lateForAppointment: boolean
}

export type CheckInInput = {
  appointmentId?: string | null
  patientId?: string | null
  newPatient?: NewPatientInput | null
  doctorId: string
  reason?: string | null
  isPriority: boolean
  priorityReason?: string | null
}

export type CheckInResultDto = { visit: QueueVisitDto; waitingAhead: number; room: string }

export type CallNextResultDto = { visit: QueueVisitDto | null }

export type QueueTicketDto = {
  clinicName: string
  clinicAddress: string
  hotline: string
  logoUrl: string | null
  visitId: string
  code: string
  ticket: string
  queueNumber: number
  room: string
  doctorName: string
  patientName: string
  patientCode: string
  isPriority: boolean
  priorityReason: string | null
  checkedInAt: string
  waitingAhead: number
}

export type DisplayTicketDto = { ticket: string; patientName: string; isPriority: boolean }

export type DisplayRoomDto = {
  doctorId: string
  room: string
  roomShort: string
  doctorName: string
  current: DisplayTicketDto | null
  next: DisplayTicketDto[]
}

export type DisplayCallDto = { ticket: string; patientName: string; room: string; calledAt: string }

export type QueueDisplayDto = {
  clinicName: string
  logoUrl: string | null
  now: string
  rooms: DisplayRoomDto[]
  lastCall: DisplayCallDto | null
}

// ───────────────────────────── Phiếu khám (07 §4.6)

export type VisitDiagnosisDto = { kind: DiagnosisKind; icdCode: string | null; name: string }

export type VisitOrderDto = {
  id: string
  serviceId: string
  serviceCode: string
  serviceName: string
  group: ServiceGroup
  unit: ServiceUnit
  teeth: number[]
  quantity: number
  unitPrice: number
  discount: number
  amount: number
  result: string | null
  imageUrls: string[]
  status: OrderStatus
  treatmentPlanItemId: string | null
  planCode: string | null
}

export type PrescriptionLineDto = {
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
  amount: number
  allergyConfirmed: boolean
  allergyConfirmedByName: string | null
  allergyConfirmedAt: string | null
  allergyMatches: string[]
}

export type VisitMedicalDto = {
  temperature: number | null
  pulse: number | null
  bpSystolic: number | null
  bpDiastolic: number | null
  weight: number | null
  height: number | null
  symptoms: string | null
  examination: string | null
  diagnoses: VisitDiagnosisDto[]
  orders: VisitOrderDto[]
  prescription: PrescriptionLineDto[]
  advice: string | null
  followUpDate: string | null
  followUpNote: string | null
}

export type PlanItemOption = {
  id: string
  planId: string
  planCode: string
  serviceId: string
  serviceCode: string
  serviceName: string
  unit: ServiceUnit
  teeth: number[]
  quantity: number
  unitPrice: number
  discountAmount: number
  amount: number
  inOtherVisit: boolean
}

export type InvoiceBrief = { id: string; code: string; total: number; paid: number; debt: number; status: InvoiceStatus }

export type VisitDetailDto = {
  id: string
  code: string
  date: string
  status: VisitStatus
  queueNumber: number
  ticket: string
  doctorId: string
  doctorName: string
  room: string
  specialtyId: string
  specialtyName: string
  patient: PatientDto
  appointmentId: string | null
  appointmentCode: string | null
  isPriority: boolean
  priorityReason: string | null
  isFollowUp: boolean
  isReturned: boolean
  reason: string | null
  checkedInAt: string
  checkedInByName: string | null
  startedAt: string | null
  finishedAt: string | null
  skipCount: number
  cancelReason: string | null
  canEdit: boolean
  canFinish: boolean
  canReopen: boolean
  reopenBlockedReason: string | null
  canMedical: boolean
  medical: VisitMedicalDto | null
  activePlanItems: PlanItemOption[]
  invoice: InvoiceBrief | null
}

export type VisitSummaryDto = {
  id: string
  code: string
  date: string
  checkedInAt: string
  finishedAt: string | null
  patientId: string
  patientCode: string
  patientName: string
  doctorId: string
  doctorName: string
  specialtyName: string
  status: VisitStatus
  services: string
  total: number | null
  invoiceStatus: InvoiceStatus | null
  diagnoses: string | null
  prescription: string | null
  results: string | null
  advice: string | null
}

export type VisitQuery = PaginationQuery & {
  patientId?: string
  doctorId?: string
  from?: string
  to?: string
  status?: VisitStatus
  withMedical?: boolean
}

export type SaveDiagnosisLine = { kind: DiagnosisKind; icdCode: string | null; name: string }

export type SaveOrderLine = {
  id?: string | null
  serviceId: string
  teeth?: number[] | null
  quantity: number
  status?: OrderStatus | null
  result?: string | null
  imageUrls?: string[] | null
  treatmentPlanItemId?: string | null
}

export type SavePrescriptionLine = {
  id?: string | null
  medicineId: string
  quantity: number
  days: number
  usage: string
  allergyConfirmed: boolean
}

export type SaveVisitInput = {
  temperature: number | null
  pulse: number | null
  bpSystolic: number | null
  bpDiastolic: number | null
  weight: number | null
  height: number | null
  symptoms: string | null
  examination: string | null
  diagnoses: SaveDiagnosisLine[]
  orders: SaveOrderLine[]
  prescription: SavePrescriptionLine[]
  advice: string | null
  followUpDate: string | null
  followUpNote: string | null
}

export type PrescriptionPrintLine = {
  name: string
  strength: string | null
  activeIngredient: string
  unit: string
  quantity: number
  days: number
  usage: string
}

export type PrescriptionPrintDto = {
  clinic: ClinicProfileDto
  visitCode: string
  date: string
  patientCode: string
  patientName: string
  birthDate: string
  age: number
  gender: Gender
  phone: string
  address: string | null
  allergies: string | null
  doctorName: string
  diagnoses: string
  lines: PrescriptionPrintLine[]
  advice: string | null
  followUpDate: string | null
  followUpNote: string | null
}

export type UsagePhraseDto = { id: string; text: string }

// ───────────────────────────── Kế hoạch điều trị (07 §4.8)

export type TreatmentPlanItemDto = {
  id: string
  serviceId: string
  serviceCode: string
  serviceName: string
  unit: ServiceUnit
  teeth: number[]
  quantity: number
  unitPrice: number
  discountType: DiscountType | null
  discountValue: number
  discountAmount: number
  amount: number
  status: PlanItemStatus
  doneAt: string | null
  visitId: string | null
  visitCode: string | null
}

export type PlanActionsDto = { canEdit: boolean; canQuote: boolean; canApprove: boolean; canAccept: boolean; canStop: boolean }

export type TreatmentPlanDto = {
  id: string
  code: string
  patient: PatientBrief
  doctorId: string
  doctorName: string
  plannedSessions: number
  note: string | null
  subTotal: number
  discountTotal: number
  total: number
  discountRate: number
  status: PlanStatus
  items: TreatmentPlanItemDto[]
  doneCount: number
  itemCount: number
  doneAmount: number
  paidAmount: number
  remaining: number
  createdAt: string
  createdByName: string | null
  quotedAt: string | null
  acceptedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  cancelReason: string | null
  reviewedByName: string | null
  reviewedAt: string | null
  reviewNote: string | null
  actions: PlanActionsDto
}

export type TreatmentPlanListItem = {
  id: string
  code: string
  patientId: string
  patientCode: string
  patientName: string
  patientPhone: string
  doctorId: string
  doctorName: string
  total: number
  discountRate: number
  status: PlanStatus
  doneCount: number
  itemCount: number
  paidAmount: number
  remaining: number
  createdAt: string
}

export type TreatmentPlanQuery = PaginationQuery & { status?: PlanStatus; patientId?: string; doctorId?: string }

export type SavePlanItemLine = {
  id?: string | null
  serviceId: string
  teeth?: number[] | null
  quantity: number
  discountType?: DiscountType | null
  discountValue: number
}

export type SaveTreatmentPlanInput = { patientId: string; plannedSessions: number; note: string | null; items: SavePlanItemLine[] }

export type PlanNoteInput = { note?: string | null }

// ───────────────────────────── Thu phí (07 §4.9)

export type InvoiceLineDto = {
  id: string
  kind: InvoiceLineKind
  reportGroup: RevenueGroup
  description: string
  note: string | null
  unitPrice: number
  quantity: number
  discount: number
  amount: number
  isOutside: boolean
}

export type ReceiptBrief = {
  id: string
  code: string
  amount: number
  method: PaymentMethod
  collectedAt: string
  collectedByName: string
  status: ReceiptStatus
  cancelReason: string | null
}

export type InvoiceDto = {
  id: string
  code: string
  visitId: string
  visitCode: string
  patient: PatientBrief
  doctorId: string
  doctorName: string
  total: number
  medicineTotal: number
  paid: number
  debt: number
  status: InvoiceStatus
  createdAt: string
  cancelledAt: string | null
  lines: InvoiceLineDto[]
  receipts: ReceiptBrief[]
  canCollect: boolean
  canEditOutside: boolean
  patientOtherDebt: number
}

export type InvoiceListItem = {
  id: string
  code: string
  visitId: string
  visitCode: string
  /** Số thứ tự của lượt ("P1 - 005"), UC-11 bước 1 */
  ticket: string | null
  patientId: string
  patientCode: string
  patientName: string
  patientPhone: string
  doctorName: string
  total: number
  paid: number
  debt: number
  status: InvoiceStatus
  createdAt: string
}

export type InvoiceQuery = PaginationQuery & {
  status?: InvoiceStatus
  hasDebt?: boolean
  patientId?: string
  from?: string
  to?: string
}

export type CollectInput = {
  clientRequestId: string
  outsideLineIds: string[]
  amount: number
  method: PaymentMethod
  cashReceived?: number | null
  partialReason?: string | null
  expectedTotal: number
}

export type ReceiptDto = {
  id: string
  code: string
  invoiceId: string
  invoiceCode: string
  visitCode: string
  patient: PatientBrief
  doctorName: string
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
  canCancel: boolean
  lines: InvoiceLineDto[]
  invoiceTotal: number
  paidToDate: number
  debtAfter: number
}

export type ReceiptListItem = {
  id: string
  code: string
  invoiceId: string
  invoiceCode: string
  patientId: string
  patientCode: string
  patientName: string
  amount: number
  method: PaymentMethod
  collectedAt: string
  collectedByName: string
  status: ReceiptStatus
  cancelReason: string | null
  cancelledAt: string | null
}

export type ReceiptQuery = PaginationQuery & {
  from?: string
  to?: string
  method?: PaymentMethod
  status?: ReceiptStatus
  patientId?: string
}

export type ReasonInput = { reason: string }

// ───────────────────────────── Nhắc tái khám (07 §4.10)

export type FollowUpDto = {
  id: string
  patientId: string
  patientCode: string
  patientName: string
  patientPhone: string
  doctorId: string
  doctorName: string
  visitId: string
  visitCode: string
  visitDate: string
  dueDate: string
  daysToDue: number
  note: string | null
  sendCount: number
  lastSentAt: string | null
  canSend: boolean
  sendBlockedReason: string | null
  callResult: CallResult | null
  callNote: string | null
  calledAt: string | null
  status: FollowUpStatus
  appointmentId: string | null
  appointmentCode: string | null
  returnedVisitId: string | null
  returnedVisitCode: string | null
}

export type FollowUpQuery = PaginationQuery & { group?: FollowUpGroup; doctorId?: string; from?: string; to?: string }

export type FollowUpCountsDto = { due: number; reminded: number; overdue: number; returned: number }

export type FollowUpPageDto = {
  page: PaginatedResult<FollowUpDto>
  counts: FollowUpCountsDto
}

export type SendFollowUpResultItem = { id: string; sent: boolean; error: string | null; message: MessageDto | null }

export type SendFollowUpsResult = { sentCount: number; items: SendFollowUpResultItem[] }

export type CallResultInput = { result: CallResult; note?: string | null }

// ───────────────────────────── Tổng quan, báo cáo (07 §4.11)

export type HourCountDto = { hour: number; count: number }

export type DashboardDoctorDto = {
  id: string
  displayName: string
  room: string
  working: boolean
  currentTicket: string | null
  waiting: number
  done: number
  avgWaitMinutes: number | null
}

export type LongWaitDto = { visitId: string; ticket: string; patientName: string; doctorName: string; waitMinutes: number }

export type DashboardTodayDto = {
  date: string
  appointments: number
  checkedIn: number
  waiting: number
  done: number
  noShow: number
  revenue: number
  avgWaitMinutes: number | null
  hourly: HourCountDto[]
  doctors: DashboardDoctorDto[]
  longWaits: LongWaitDto[]
  pendingOnline: number
  pendingApprovals: number
}

export type ReportQuery = { from?: string; to?: string; doctorId?: string; specialtyId?: string; minDays?: number }

export type DayAmountDto = { date: string; amount: number }
export type GroupAmountDto = { group: RevenueGroup; amount: number }
export type MethodAmountDto = { method: PaymentMethod; amount: number; count: number }

export type RevenueReportDto = {
  from: string
  to: string
  total: number
  receiptCount: number
  previousTotal: number
  changePercent: number | null
  byDay: DayAmountDto[]
  byGroup: GroupAmountDto[]
  byMethod: MethodAmountDto[]
}

export type DoctorReportRow = {
  doctorId: string
  displayName: string
  specialtyName: string
  visits: number
  newPatients: number
  revenue: number
  avgWaitMinutes: number | null
}

export type DoctorReportDto = { from: string; to: string; rows: DoctorReportRow[] }

export type VisitDayRow = { date: string; total: number; newPatients: number; returning: number }

export type VisitReportDto = {
  from: string
  to: string
  total: number
  newPatients: number
  returning: number
  appointmentTotal: number
  cancelled: number
  noShow: number
  noShowRate: number
  fromOnline: number
  fromReception: number
  walkIn: number
  byDay: VisitDayRow[]
}

export type FollowUpDoctorRow = { doctorId: string; displayName: string; total: number; returned: number; overdue: number }

export type FollowUpReportDto = {
  from: string
  to: string
  total: number
  reminded: number
  returned: number
  overdue: number
  closed: number
  returnRate: number | null
  byDoctor: FollowUpDoctorRow[]
}

export type DebtReportRow = {
  patientId: string
  patientCode: string
  patientName: string
  patientPhone: string
  invoiceCount: number
  debt: number
  oldestDate: string
  days: number
  doctorNames: string
}

export type DebtReportDto = { total: number; patientCount: number; rows: DebtReportRow[] }

export type CancelledReceiptRow = {
  id: string
  code: string
  invoiceCode: string
  patientName: string
  amount: number
  method: PaymentMethod
  collectedAt: string
  collectedByName: string
  cancelledAt: string
  cancelledByName: string
  cancelReason: string
}

export type CancelledReceiptReportDto = { total: number; rows: CancelledReceiptRow[] }
