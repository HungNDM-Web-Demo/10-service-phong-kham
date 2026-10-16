import { apiRoutes } from '@/config/api-routes'
import { apiCall } from '@/lib/axios'
import { isMockMode } from '@/lib/data-source'
import type { PaginatedResult } from '@/types/api'
import type {
  AccountCandidate,
  AppointmentCardDto,
  AppointmentDetailDto,
  AppointmentQuery,
  BoardDto,
  CallNextResultDto,
  CallResultInput,
  CancelAppointmentInput,
  CancelledReceiptReportDto,
  CheckInInput,
  CheckInPreviewDto,
  CheckInPreviewQuery,
  CheckInResultDto,
  ClinicProfileDto,
  CollectInput,
  ConfirmAppointmentInput,
  CreateAppointmentInput,
  CreateDayOffInput,
  DashboardTodayDto,
  DayOffDto,
  DayOffQuery,
  DayOffResult,
  DebtReportDto,
  DiagnosisQuery,
  DiagnosisTemplateDto,
  DoctorDto,
  DoctorOption,
  DoctorReportDto,
  DoctorSlotsDto,
  DuplicateQuery,
  DuplicateResultDto,
  FollowUpDto,
  FollowUpPageDto,
  FollowUpQuery,
  FollowUpReportDto,
  InvoiceDto,
  InvoiceListItem,
  InvoiceQuery,
  MedicineDto,
  MedicineQuery,
  NextCodeDto,
  PatientDetailDto,
  PatientDto,
  PatientQuery,
  PendingCountDto,
  PlanNoteInput,
  PrescriptionPrintDto,
  PublicAppointmentDto,
  PublicBookingInput,
  PublicCatalogDto,
  PublicLookupInput,
  PublicSlotsDto,
  PublicSlotsQuery,
  QueueDisplayDto,
  QueueTicketDto,
  QueueTodayDto,
  QueueVisitDto,
  ReasonInput,
  ReceiptDto,
  ReceiptListItem,
  ReceiptQuery,
  ReportQuery,
  RescheduleInput,
  RevenueReportDto,
  SaveDiagnosisInput,
  SaveDoctorInput,
  SaveMedicineInput,
  SavePatientInput,
  SaveScheduleInput,
  SaveServiceInput,
  SaveTreatmentPlanInput,
  SaveVisitInput,
  SendFollowUpsResult,
  ServiceDto,
  ServiceGroup,
  ServiceQuery,
  SpecialtyDto,
  TreatmentPlanDto,
  TreatmentPlanListItem,
  TreatmentPlanQuery,
  UsagePhraseDto,
  VisitDetailDto,
  VisitQuery,
  VisitReportDto,
  VisitSummaryDto,
  WeekDto,
} from '@/types/clinic'
import { appointmentMock } from '../mock/appointment.mock'
import { catalogMock } from '../mock/catalog.mock'
import { doctorMock } from '../mock/doctor.mock'
import { followUpMock } from '../mock/followup.mock'
import { invoiceMock } from '../mock/invoice.mock'
import { patientMock } from '../mock/patient.mock'
import { planMock } from '../mock/plan.mock'
import { publicMock } from '../mock/public.mock'
import { queueMock } from '../mock/queue.mock'
import { reportMock } from '../mock/report.mock'
import { visitMock } from '../mock/visit.mock'

/** Mọi dữ liệu nghiệp vụ Phòng khám đi qua đây; chế độ mock dùng handler trong `../mock`, chế độ api gọi BE (07 §4). */

const m = isMockMode

/** Danh mục (07 §4.1) */
export const catalogService = {
  getSpecialties: (): Promise<SpecialtyDto[]> => (m() ? catalogMock.getSpecialties() : apiCall.get(apiRoutes.specialties.list)),
  getServices: (query: ServiceQuery = {}): Promise<ServiceDto[]> =>
    m() ? catalogMock.getServices(query) : apiCall.get(apiRoutes.services.list, { params: query }),
  getServiceOptions: (): Promise<ServiceDto[]> => (m() ? catalogMock.getServiceOptions() : apiCall.get(apiRoutes.services.options)),
  nextServiceCode: (group: ServiceGroup): Promise<NextCodeDto> =>
    m() ? catalogMock.nextServiceCode(group) : apiCall.get(apiRoutes.services.nextCode, { params: { group } }),
  createService: (input: SaveServiceInput): Promise<ServiceDto> => (m() ? catalogMock.createService(input) : apiCall.post(apiRoutes.services.list, input)),
  updateService: (id: string, input: SaveServiceInput): Promise<ServiceDto> =>
    m() ? catalogMock.updateService(id, input) : apiCall.put(apiRoutes.services.detail(id), input),
  setServiceActive: (id: string, isActive: boolean): Promise<ServiceDto> =>
    m() ? catalogMock.setServiceActive(id, isActive) : apiCall.patch(apiRoutes.services.status(id), { isActive }),
  deleteService: (id: string): Promise<void> => (m() ? catalogMock.deleteService(id) : apiCall.delete(apiRoutes.services.detail(id))),
  getMedicines: (query: MedicineQuery): Promise<PaginatedResult<MedicineDto>> =>
    m() ? catalogMock.getMedicines(query) : apiCall.get(apiRoutes.medicines.list, { params: query }),
  getMedicineOptions: (): Promise<MedicineDto[]> => (m() ? catalogMock.getMedicineOptions() : apiCall.get(apiRoutes.medicines.options)),
  nextMedicineCode: (): Promise<NextCodeDto> => (m() ? catalogMock.nextMedicineCode() : apiCall.get(apiRoutes.medicines.nextCode)),
  createMedicine: (input: SaveMedicineInput): Promise<MedicineDto> =>
    m() ? catalogMock.createMedicine(input) : apiCall.post(apiRoutes.medicines.list, input),
  updateMedicine: (id: string, input: SaveMedicineInput): Promise<MedicineDto> =>
    m() ? catalogMock.updateMedicine(id, input) : apiCall.put(apiRoutes.medicines.detail(id), input),
  setMedicineActive: (id: string, isActive: boolean): Promise<MedicineDto> =>
    m() ? catalogMock.setMedicineActive(id, isActive) : apiCall.patch(apiRoutes.medicines.status(id), { isActive }),
  deleteMedicine: (id: string): Promise<void> => (m() ? catalogMock.deleteMedicine(id) : apiCall.delete(apiRoutes.medicines.detail(id))),
  getDiagnoses: (query: DiagnosisQuery = {}): Promise<DiagnosisTemplateDto[]> =>
    m() ? catalogMock.getDiagnoses(query) : apiCall.get(apiRoutes.diagnoses.list, { params: query }),
  getDiagnosisOptions: (): Promise<DiagnosisTemplateDto[]> => (m() ? catalogMock.getDiagnosisOptions() : apiCall.get(apiRoutes.diagnoses.options)),
  createDiagnosis: (input: SaveDiagnosisInput): Promise<DiagnosisTemplateDto> =>
    m() ? catalogMock.createDiagnosis(input) : apiCall.post(apiRoutes.diagnoses.list, input),
  updateDiagnosis: (id: string, input: SaveDiagnosisInput): Promise<DiagnosisTemplateDto> =>
    m() ? catalogMock.updateDiagnosis(id, input) : apiCall.put(apiRoutes.diagnoses.detail(id), input),
  setDiagnosisActive: (id: string, isActive: boolean): Promise<DiagnosisTemplateDto> =>
    m() ? catalogMock.setDiagnosisActive(id, isActive) : apiCall.patch(apiRoutes.diagnoses.status(id), { isActive }),
  deleteDiagnosis: (id: string): Promise<void> => (m() ? catalogMock.deleteDiagnosis(id) : apiCall.delete(apiRoutes.diagnoses.detail(id))),
  getProfile: (): Promise<ClinicProfileDto> => (m() ? catalogMock.getProfile() : apiCall.get(apiRoutes.clinicProfile)),
}

/** Bác sĩ, ngày nghỉ (07 §4.2) */
export const doctorService = {
  getAll: (): Promise<DoctorDto[]> => (m() ? doctorMock.getAll() : apiCall.get(apiRoutes.doctors.list)),
  getOptions: (): Promise<DoctorOption[]> => (m() ? doctorMock.getOptions() : apiCall.get(apiRoutes.doctors.options)),
  getAccountCandidates: (): Promise<AccountCandidate[]> =>
    m() ? doctorMock.getAccountCandidates() : apiCall.get(apiRoutes.doctors.accountCandidates),
  nextCode: (): Promise<NextCodeDto> => (m() ? doctorMock.nextCode() : apiCall.get(apiRoutes.doctors.nextCode)),
  create: (input: SaveDoctorInput): Promise<DoctorDto> => (m() ? doctorMock.create(input) : apiCall.post(apiRoutes.doctors.list, input)),
  update: (id: string, input: SaveDoctorInput): Promise<DoctorDto> =>
    m() ? doctorMock.update(id, input) : apiCall.put(apiRoutes.doctors.detail(id), input),
  saveSchedule: (id: string, input: SaveScheduleInput): Promise<DoctorDto> =>
    m() ? doctorMock.saveSchedule(id, input) : apiCall.put(apiRoutes.doctors.schedule(id), input),
  setActive: (id: string, isActive: boolean): Promise<DoctorDto> =>
    m() ? doctorMock.setActive(id, isActive) : apiCall.patch(apiRoutes.doctors.status(id), { isActive }),
  remove: (id: string): Promise<void> => (m() ? doctorMock.remove(id) : apiCall.delete(apiRoutes.doctors.detail(id))),
  getDaysOff: (query: DayOffQuery = {}): Promise<DayOffDto[]> =>
    m() ? doctorMock.getDaysOff(query) : apiCall.get(apiRoutes.daysOff.list, { params: query }),
  createDayOff: (input: CreateDayOffInput): Promise<DayOffResult> =>
    m() ? doctorMock.createDayOff(input) : apiCall.post(apiRoutes.daysOff.list, input),
  deleteDayOff: (id: string): Promise<void> => (m() ? doctorMock.deleteDayOff(id) : apiCall.delete(apiRoutes.daysOff.detail(id))),
}

/** Lịch hẹn (07 §4.3) */
export const appointmentService = {
  getBoard: (date?: string, specialtyId?: string): Promise<BoardDto> =>
    m() ? appointmentMock.getBoard(date, specialtyId) : apiCall.get(apiRoutes.appointments.board, { params: { date, specialtyId } }),
  getWeek: (start?: string): Promise<WeekDto> => (m() ? appointmentMock.getWeek(start) : apiCall.get(apiRoutes.appointments.week, { params: { start } })),
  getList: (query: AppointmentQuery): Promise<PaginatedResult<AppointmentCardDto>> =>
    m() ? appointmentMock.getList(query) : apiCall.get(apiRoutes.appointments.list, { params: query }),
  getPendingCount: (): Promise<PendingCountDto> => (m() ? appointmentMock.getPendingCount() : apiCall.get(apiRoutes.appointments.pendingCount)),
  get: (id: string): Promise<AppointmentDetailDto> => (m() ? appointmentMock.get(id) : apiCall.get(apiRoutes.appointments.detail(id))),
  getSlots: (doctorId: string, date?: string): Promise<DoctorSlotsDto> =>
    m() ? appointmentMock.getSlots(doctorId, date) : apiCall.get(apiRoutes.appointments.slots, { params: { doctorId, date } }),
  create: (input: CreateAppointmentInput): Promise<AppointmentDetailDto> =>
    m() ? appointmentMock.create(input) : apiCall.post(apiRoutes.appointments.list, input),
  reschedule: (id: string, input: RescheduleInput): Promise<AppointmentDetailDto> =>
    m() ? appointmentMock.reschedule(id, input) : apiCall.put(apiRoutes.appointments.time(id), input),
  confirm: (id: string, input: ConfirmAppointmentInput): Promise<AppointmentDetailDto> =>
    m() ? appointmentMock.confirm(id, input) : apiCall.post(apiRoutes.appointments.confirm(id), input),
  cancel: (id: string, input: CancelAppointmentInput): Promise<AppointmentDetailDto> =>
    m() ? appointmentMock.cancel(id, input) : apiCall.post(apiRoutes.appointments.cancel(id), input),
}

/** Đặt lịch online công khai (07 §4.4) */
export const publicBookingService = {
  getCatalog: (): Promise<PublicCatalogDto> => (m() ? publicMock.getCatalog() : apiCall.get(apiRoutes.publicBooking.catalog)),
  getSlots: (query: PublicSlotsQuery): Promise<PublicSlotsDto> =>
    m() ? publicMock.getSlots(query) : apiCall.get(apiRoutes.publicBooking.slots, { params: query }),
  book: (input: PublicBookingInput): Promise<PublicAppointmentDto> => (m() ? publicMock.book(input) : apiCall.post(apiRoutes.publicBooking.book, input)),
  lookup: (input: PublicLookupInput): Promise<PublicAppointmentDto> =>
    m() ? publicMock.lookup(input) : apiCall.post(apiRoutes.publicBooking.lookup, input),
  cancel: (input: PublicLookupInput): Promise<PublicAppointmentDto> =>
    m() ? publicMock.cancel(input) : apiCall.post(apiRoutes.publicBooking.cancel, input),
}

/** Tiếp đón, hàng chờ, màn hình sảnh (07 §4.5) */
export const queueService = {
  getToday: (): Promise<QueueTodayDto> => (m() ? queueMock.getToday() : apiCall.get(apiRoutes.queue.today)),
  previewCheckIn: (query: CheckInPreviewQuery): Promise<CheckInPreviewDto> =>
    m() ? queueMock.previewCheckIn(query) : apiCall.get(apiRoutes.visits.checkInPreview, { params: query }),
  checkIn: (input: CheckInInput): Promise<CheckInResultDto> => (m() ? queueMock.checkIn(input) : apiCall.post(apiRoutes.visits.list, input)),
  callNext: (doctorId?: string | null): Promise<CallNextResultDto> =>
    m() ? queueMock.callNext(doctorId) : apiCall.post(apiRoutes.queue.callNext, { doctorId: doctorId ?? null }),
  call: (id: string, reason: string): Promise<QueueVisitDto> => (m() ? queueMock.call(id, reason) : apiCall.post(apiRoutes.visits.call(id), { reason })),
  recall: (id: string): Promise<QueueVisitDto> => (m() ? queueMock.recall(id) : apiCall.post(apiRoutes.visits.recall(id))),
  skip: (id: string): Promise<QueueVisitDto> => (m() ? queueMock.skip(id) : apiCall.post(apiRoutes.visits.skip(id))),
  awaitResults: (id: string): Promise<QueueVisitDto> => (m() ? queueMock.awaitResults(id) : apiCall.post(apiRoutes.visits.awaitResults(id))),
  returned: (id: string): Promise<QueueVisitDto> => (m() ? queueMock.returned(id) : apiCall.post(apiRoutes.visits.returned(id))),
  transfer: (id: string, doctorId: string): Promise<QueueVisitDto> =>
    m() ? queueMock.transfer(id, doctorId) : apiCall.post(apiRoutes.visits.transfer(id), { doctorId }),
  cancel: (id: string, input: ReasonInput): Promise<QueueVisitDto> => (m() ? queueMock.cancel(id, input) : apiCall.post(apiRoutes.visits.cancel(id), input)),
  getTicket: (id: string): Promise<QueueTicketDto> => (m() ? queueMock.getTicket(id) : apiCall.get(apiRoutes.visits.ticket(id))),
  getDisplay: (code: string): Promise<QueueDisplayDto> => (m() ? queueMock.getDisplay(code) : apiCall.get(apiRoutes.queueDisplay, { params: { code } })),
}

/** Phiếu khám (07 §4.6) */
export const visitService = {
  get: (id: string): Promise<VisitDetailDto> => (m() ? visitMock.get(id) : apiCall.get(apiRoutes.visits.detail(id))),
  getList: (query: VisitQuery): Promise<PaginatedResult<VisitSummaryDto>> =>
    m() ? visitMock.getList(query) : apiCall.get(apiRoutes.visits.list, { params: query }),
  save: (id: string, input: SaveVisitInput): Promise<VisitDetailDto> => (m() ? visitMock.save(id, input) : apiCall.put(apiRoutes.visits.detail(id), input)),
  finish: (id: string): Promise<VisitDetailDto> => (m() ? visitMock.finish(id) : apiCall.post(apiRoutes.visits.finish(id))),
  reopen: (id: string): Promise<VisitDetailDto> => (m() ? visitMock.reopen(id) : apiCall.post(apiRoutes.visits.reopen(id))),
  getPrescription: (id: string): Promise<PrescriptionPrintDto> =>
    m() ? visitMock.getPrescription(id) : apiCall.get(apiRoutes.visits.prescription(id)),
  getPhrases: (): Promise<UsagePhraseDto[]> => (m() ? visitMock.getPhrases() : apiCall.get(apiRoutes.usagePhrases.list)),
  addPhrase: (text: string): Promise<UsagePhraseDto> => (m() ? visitMock.addPhrase(text) : apiCall.post(apiRoutes.usagePhrases.list, { text })),
  deletePhrase: (id: string): Promise<void> => (m() ? visitMock.deletePhrase(id) : apiCall.delete(apiRoutes.usagePhrases.detail(id))),
}

/** Bệnh nhân (07 §4.7) */
export const patientService = {
  getList: (query: PatientQuery): Promise<PaginatedResult<PatientDto>> =>
    m() ? patientMock.getList(query) : apiCall.get(apiRoutes.patients.list, { params: query }),
  get: (id: string): Promise<PatientDetailDto> => (m() ? patientMock.get(id) : apiCall.get(apiRoutes.patients.detail(id))),
  findDuplicates: (query: DuplicateQuery): Promise<DuplicateResultDto> =>
    m() ? patientMock.findDuplicates(query) : apiCall.get(apiRoutes.patients.duplicates, { params: query }),
  create: (input: SavePatientInput): Promise<PatientDto> => (m() ? patientMock.create(input) : apiCall.post(apiRoutes.patients.list, input)),
  update: (id: string, input: SavePatientInput): Promise<PatientDto> =>
    m() ? patientMock.update(id, input) : apiCall.put(apiRoutes.patients.detail(id), input),
  remove: (id: string): Promise<void> => (m() ? patientMock.remove(id) : apiCall.delete(apiRoutes.patients.detail(id))),
}

/** Kế hoạch điều trị (07 §4.8) */
export const planService = {
  getList: (query: TreatmentPlanQuery): Promise<PaginatedResult<TreatmentPlanListItem>> =>
    m() ? planMock.getList(query) : apiCall.get(apiRoutes.treatmentPlans.list, { params: query }),
  get: (id: string): Promise<TreatmentPlanDto> => (m() ? planMock.get(id) : apiCall.get(apiRoutes.treatmentPlans.detail(id))),
  create: (input: SaveTreatmentPlanInput): Promise<TreatmentPlanDto> =>
    m() ? planMock.create(input) : apiCall.post(apiRoutes.treatmentPlans.list, input),
  update: (id: string, input: SaveTreatmentPlanInput): Promise<TreatmentPlanDto> =>
    m() ? planMock.update(id, input) : apiCall.put(apiRoutes.treatmentPlans.detail(id), input),
  quote: (id: string): Promise<TreatmentPlanDto> => (m() ? planMock.quote(id) : apiCall.post(apiRoutes.treatmentPlans.action(id, 'quote'))),
  approve: (id: string, input: PlanNoteInput): Promise<TreatmentPlanDto> =>
    m() ? planMock.approve(id, input) : apiCall.post(apiRoutes.treatmentPlans.action(id, 'approve'), input),
  reject: (id: string, input: PlanNoteInput): Promise<TreatmentPlanDto> =>
    m() ? planMock.reject(id, input) : apiCall.post(apiRoutes.treatmentPlans.action(id, 'reject'), input),
  accept: (id: string): Promise<TreatmentPlanDto> => (m() ? planMock.accept(id) : apiCall.post(apiRoutes.treatmentPlans.action(id, 'accept'))),
  decline: (id: string, input: PlanNoteInput): Promise<TreatmentPlanDto> =>
    m() ? planMock.decline(id, input) : apiCall.post(apiRoutes.treatmentPlans.action(id, 'decline'), input),
  stop: (id: string, input: PlanNoteInput): Promise<TreatmentPlanDto> =>
    m() ? planMock.stop(id, input) : apiCall.post(apiRoutes.treatmentPlans.action(id, 'stop'), input),
}

/** Thu phí, phiếu thu (07 §4.9) */
export const invoiceService = {
  getList: (query: InvoiceQuery): Promise<PaginatedResult<InvoiceListItem>> =>
    m() ? invoiceMock.getList(query) : apiCall.get(apiRoutes.invoices.list, { params: query }),
  get: (id: string): Promise<InvoiceDto> => (m() ? invoiceMock.get(id) : apiCall.get(apiRoutes.invoices.detail(id))),
  collect: async (id: string, input: CollectInput): Promise<ReceiptDto> =>
    m() ? (await invoiceMock.collect(id, input)).value : apiCall.post(apiRoutes.invoices.receipts(id), input),
  getReceipts: (query: ReceiptQuery): Promise<PaginatedResult<ReceiptListItem>> =>
    m() ? invoiceMock.getReceipts(query) : apiCall.get(apiRoutes.receipts.list, { params: query }),
  getReceipt: (id: string): Promise<ReceiptDto> => (m() ? invoiceMock.getReceipt(id) : apiCall.get(apiRoutes.receipts.detail(id))),
  cancelReceipt: (id: string, input: ReasonInput): Promise<ReceiptDto> =>
    m() ? invoiceMock.cancelReceipt(id, input) : apiCall.post(apiRoutes.receipts.cancel(id), input),
}

/** Nhắc tái khám (07 §4.10) */
export const followUpService = {
  getList: (query: FollowUpQuery): Promise<FollowUpPageDto> => (m() ? followUpMock.getList(query) : apiCall.get(apiRoutes.followUps.list, { params: query })),
  send: (ids: string[]): Promise<SendFollowUpsResult> => (m() ? followUpMock.send(ids) : apiCall.post(apiRoutes.followUps.send, { ids })),
  recordCall: (id: string, input: CallResultInput): Promise<FollowUpDto> =>
    m() ? followUpMock.recordCall(id, input) : apiCall.post(apiRoutes.followUps.callResult(id), input),
}

/** Tổng quan, báo cáo (07 §4.11) */
export const reportService = {
  getDashboard: (): Promise<DashboardTodayDto> => (m() ? reportMock.getDashboard() : apiCall.get(apiRoutes.dashboard.today)),
  getRevenue: (query: ReportQuery): Promise<RevenueReportDto> => (m() ? reportMock.getRevenue(query) : apiCall.get(apiRoutes.reports.revenue, { params: query })),
  getDoctors: (query: ReportQuery): Promise<DoctorReportDto> => (m() ? reportMock.getDoctors(query) : apiCall.get(apiRoutes.reports.doctors, { params: query })),
  getVisits: (query: ReportQuery): Promise<VisitReportDto> => (m() ? reportMock.getVisits(query) : apiCall.get(apiRoutes.reports.visits, { params: query })),
  getFollowUps: (query: ReportQuery): Promise<FollowUpReportDto> =>
    m() ? reportMock.getFollowUps(query) : apiCall.get(apiRoutes.reports.followUps, { params: query }),
  getDebts: (query: ReportQuery): Promise<DebtReportDto> => (m() ? reportMock.getDebts(query) : apiCall.get(apiRoutes.reports.debts, { params: query })),
  getCancelledReceipts: (query: ReportQuery): Promise<CancelledReceiptReportDto> =>
    m() ? reportMock.getCancelledReceipts(query) : apiCall.get(apiRoutes.reports.cancelledReceipts, { params: query }),
}
