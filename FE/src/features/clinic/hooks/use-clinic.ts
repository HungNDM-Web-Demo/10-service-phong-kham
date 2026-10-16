'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AppointmentQuery,
  CallResultInput,
  CancelAppointmentInput,
  CheckInInput,
  CheckInPreviewQuery,
  CollectInput,
  ConfirmAppointmentInput,
  CreateAppointmentInput,
  CreateDayOffInput,
  DayOffQuery,
  DiagnosisQuery,
  DuplicateQuery,
  FollowUpQuery,
  InvoiceQuery,
  MedicineQuery,
  PatientQuery,
  PlanNoteInput,
  PublicBookingInput,
  PublicLookupInput,
  PublicSlotsQuery,
  ReasonInput,
  ReceiptQuery,
  ReportQuery,
  RescheduleInput,
  SaveDiagnosisInput,
  SaveDoctorInput,
  SaveMedicineInput,
  SavePatientInput,
  SaveScheduleInput,
  SaveServiceInput,
  SaveTreatmentPlanInput,
  SaveVisitInput,
  ServiceGroup,
  ServiceQuery,
  TreatmentPlanQuery,
  VisitQuery,
} from '@/types/clinic'
import {
  appointmentService,
  catalogService,
  doctorService,
  followUpService,
  invoiceService,
  patientService,
  planService,
  publicBookingService,
  queueService,
  reportService,
  visitService,
} from '../services/clinic.service'

/**
 * Hook TanStack Query cho nghiệp vụ Phòng khám. Mọi query nghiệp vụ dùng khóa bắt đầu bằng 'clinic'; sau mỗi lần ghi làm mới
 * cả nhóm vì một thao tác (tiếp đón, kết thúc khám, thu tiền) chạm nhiều màn hình (hàng chờ, phiếu khám, thu phí, tổng quan).
 */

export const clinicKeys = {
  all: ['clinic'] as const,
  specialties: ['clinic', 'specialties'] as const,
  services: (q: object = {}) => ['clinic', 'services', q] as const,
  serviceOptions: ['clinic', 'service-options'] as const,
  medicines: (q: object) => ['clinic', 'medicines', q] as const,
  medicineOptions: ['clinic', 'medicine-options'] as const,
  diagnoses: (q: object = {}) => ['clinic', 'diagnoses', q] as const,
  diagnosisOptions: ['clinic', 'diagnosis-options'] as const,
  profile: ['clinic', 'profile'] as const,
  doctors: ['clinic', 'doctors'] as const,
  doctorOptions: ['clinic', 'doctor-options'] as const,
  accounts: ['clinic', 'account-candidates'] as const,
  daysOff: (q: object = {}) => ['clinic', 'days-off', q] as const,
  board: (date: string, specialtyId?: string) => ['clinic', 'board', date, specialtyId ?? ''] as const,
  week: (start: string) => ['clinic', 'week', start] as const,
  appointments: (q: AppointmentQuery) => ['clinic', 'appointments', q] as const,
  pendingCount: ['clinic', 'pending-count'] as const,
  appointment: (id: string) => ['clinic', 'appointment', id] as const,
  slots: (doctorId: string, date: string) => ['clinic', 'slots', doctorId, date] as const,
  queue: ['clinic', 'queue-today'] as const,
  preview: (q: CheckInPreviewQuery) => ['clinic', 'check-in-preview', q] as const,
  ticket: (id: string) => ['clinic', 'ticket', id] as const,
  visit: (id: string) => ['clinic', 'visit', id] as const,
  visits: (q: VisitQuery) => ['clinic', 'visits', q] as const,
  prescription: (id: string) => ['clinic', 'prescription', id] as const,
  phrases: ['clinic', 'usage-phrases'] as const,
  patients: (q: PatientQuery) => ['clinic', 'patients', q] as const,
  patient: (id: string) => ['clinic', 'patient', id] as const,
  duplicates: (q: DuplicateQuery) => ['clinic', 'duplicates', q] as const,
  plans: (q: TreatmentPlanQuery) => ['clinic', 'plans', q] as const,
  plan: (id: string) => ['clinic', 'plan', id] as const,
  invoices: (q: InvoiceQuery) => ['clinic', 'invoices', q] as const,
  invoice: (id: string) => ['clinic', 'invoice', id] as const,
  receipts: (q: ReceiptQuery) => ['clinic', 'receipts', q] as const,
  receipt: (id: string) => ['clinic', 'receipt', id] as const,
  followUps: (q: FollowUpQuery) => ['clinic', 'follow-ups', q] as const,
  dashboard: ['clinic', 'dashboard-today'] as const,
  report: (kind: string, q: ReportQuery) => ['clinic', 'report', kind, q] as const,
}

function useInvalidateClinic() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: clinicKeys.all })
    void queryClient.invalidateQueries({ queryKey: ['public', 'clinic'] })
    void queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
  }
}

function useClinicMutation<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const invalidate = useInvalidateClinic()
  return useMutation({ mutationFn: fn, onSuccess: invalidate })
}

// ───────────────────────────── Danh mục

export const useSpecialties = () => useQuery({ queryKey: clinicKeys.specialties, queryFn: catalogService.getSpecialties, staleTime: 5 * 60_000 })
export const useServices = (q: ServiceQuery = {}) => useQuery({ queryKey: clinicKeys.services(q), queryFn: () => catalogService.getServices(q) })
export const useServiceOptions = (enabled = true) =>
  useQuery({ queryKey: clinicKeys.serviceOptions, queryFn: catalogService.getServiceOptions, enabled, staleTime: 60_000 })
export const useMedicines = (q: MedicineQuery) =>
  useQuery({ queryKey: clinicKeys.medicines(q), queryFn: () => catalogService.getMedicines(q), placeholderData: keepPreviousData })
export const useMedicineOptions = (enabled = true) =>
  useQuery({ queryKey: clinicKeys.medicineOptions, queryFn: catalogService.getMedicineOptions, enabled, staleTime: 60_000 })
export const useDiagnoses = (q: DiagnosisQuery = {}) => useQuery({ queryKey: clinicKeys.diagnoses(q), queryFn: () => catalogService.getDiagnoses(q) })
export const useDiagnosisOptions = (enabled = true) =>
  useQuery({ queryKey: clinicKeys.diagnosisOptions, queryFn: catalogService.getDiagnosisOptions, enabled, staleTime: 60_000 })
export const useClinicProfile = () => useQuery({ queryKey: clinicKeys.profile, queryFn: catalogService.getProfile, staleTime: 5 * 60_000 })

export const useNextServiceCode = () => useMutation({ mutationFn: (group: ServiceGroup) => catalogService.nextServiceCode(group) })
export const useCreateService = () => useClinicMutation((input: SaveServiceInput) => catalogService.createService(input))
export const useUpdateService = () =>
  useClinicMutation(({ id, input }: { id: string; input: SaveServiceInput }) => catalogService.updateService(id, input))
export const useSetServiceActive = () =>
  useClinicMutation(({ id, isActive }: { id: string; isActive: boolean }) => catalogService.setServiceActive(id, isActive))
export const useDeleteService = () => useClinicMutation((id: string) => catalogService.deleteService(id))
export const useNextMedicineCode = () => useMutation({ mutationFn: () => catalogService.nextMedicineCode() })
export const useCreateMedicine = () => useClinicMutation((input: SaveMedicineInput) => catalogService.createMedicine(input))
export const useUpdateMedicine = () =>
  useClinicMutation(({ id, input }: { id: string; input: SaveMedicineInput }) => catalogService.updateMedicine(id, input))
export const useSetMedicineActive = () =>
  useClinicMutation(({ id, isActive }: { id: string; isActive: boolean }) => catalogService.setMedicineActive(id, isActive))
export const useDeleteMedicine = () => useClinicMutation((id: string) => catalogService.deleteMedicine(id))
export const useCreateDiagnosis = () => useClinicMutation((input: SaveDiagnosisInput) => catalogService.createDiagnosis(input))
export const useUpdateDiagnosis = () =>
  useClinicMutation(({ id, input }: { id: string; input: SaveDiagnosisInput }) => catalogService.updateDiagnosis(id, input))
export const useSetDiagnosisActive = () =>
  useClinicMutation(({ id, isActive }: { id: string; isActive: boolean }) => catalogService.setDiagnosisActive(id, isActive))
export const useDeleteDiagnosis = () => useClinicMutation((id: string) => catalogService.deleteDiagnosis(id))

// ───────────────────────────── Bác sĩ

export const useDoctors = () => useQuery({ queryKey: clinicKeys.doctors, queryFn: doctorService.getAll })
export const useDoctorOptions = () => useQuery({ queryKey: clinicKeys.doctorOptions, queryFn: doctorService.getOptions, staleTime: 60_000 })
export const useAccountCandidates = (enabled = true) =>
  useQuery({ queryKey: clinicKeys.accounts, queryFn: doctorService.getAccountCandidates, enabled })
export const useDaysOff = (q: DayOffQuery = {}) => useQuery({ queryKey: clinicKeys.daysOff(q), queryFn: () => doctorService.getDaysOff(q) })
export const useNextDoctorCode = () => useMutation({ mutationFn: () => doctorService.nextCode() })
export const useCreateDoctor = () => useClinicMutation((input: SaveDoctorInput) => doctorService.create(input))
export const useUpdateDoctor = () => useClinicMutation(({ id, input }: { id: string; input: SaveDoctorInput }) => doctorService.update(id, input))
export const useSaveSchedule = () =>
  useClinicMutation(({ id, input }: { id: string; input: SaveScheduleInput }) => doctorService.saveSchedule(id, input))
export const useSetDoctorActive = () =>
  useClinicMutation(({ id, isActive }: { id: string; isActive: boolean }) => doctorService.setActive(id, isActive))
export const useDeleteDoctor = () => useClinicMutation((id: string) => doctorService.remove(id))
export const useCreateDayOff = () => useClinicMutation((input: CreateDayOffInput) => doctorService.createDayOff(input))
export const useDeleteDayOff = () => useClinicMutation((id: string) => doctorService.deleteDayOff(id))

// ───────────────────────────── Lịch hẹn

export const useBoard = (date: string, specialtyId?: string) =>
  useQuery({
    queryKey: clinicKeys.board(date, specialtyId),
    queryFn: () => appointmentService.getBoard(date, specialtyId),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  })
export const useWeek = (start: string, enabled = true) =>
  useQuery({ queryKey: clinicKeys.week(start), queryFn: () => appointmentService.getWeek(start), placeholderData: keepPreviousData, enabled })
export const useAppointments = (q: AppointmentQuery, enabled = true) =>
  useQuery({ queryKey: clinicKeys.appointments(q), queryFn: () => appointmentService.getList(q), placeholderData: keepPreviousData, enabled })
export const usePendingCount = (enabled = true) =>
  useQuery({ queryKey: clinicKeys.pendingCount, queryFn: appointmentService.getPendingCount, enabled, refetchInterval: 60_000 })
export const useAppointment = (id: string | null) =>
  useQuery({ queryKey: clinicKeys.appointment(id ?? ''), queryFn: () => appointmentService.get(id!), enabled: !!id })
export const useDoctorSlots = (doctorId: string | null, date: string) =>
  useQuery({ queryKey: clinicKeys.slots(doctorId ?? '', date), queryFn: () => appointmentService.getSlots(doctorId!, date), enabled: !!doctorId && !!date })

export const useCreateAppointment = () => useClinicMutation((input: CreateAppointmentInput) => appointmentService.create(input))
export const useRescheduleAppointment = () =>
  useClinicMutation(({ id, input }: { id: string; input: RescheduleInput }) => appointmentService.reschedule(id, input))
export const useConfirmAppointment = () =>
  useClinicMutation(({ id, input }: { id: string; input: ConfirmAppointmentInput }) => appointmentService.confirm(id, input))
export const useCancelAppointment = () =>
  useClinicMutation(({ id, input }: { id: string; input: CancelAppointmentInput }) => appointmentService.cancel(id, input))

// ───────────────────────────── Hàng chờ

export const useQueueToday = (refetchMs = 3000) =>
  useQuery({ queryKey: clinicKeys.queue, queryFn: queueService.getToday, refetchInterval: refetchMs, placeholderData: keepPreviousData })
export const useCheckInPreview = (q: CheckInPreviewQuery, enabled = true) =>
  useQuery({ queryKey: clinicKeys.preview(q), queryFn: () => queueService.previewCheckIn(q), enabled, staleTime: 0 })
export const useTicket = (id: string) => useQuery({ queryKey: clinicKeys.ticket(id), queryFn: () => queueService.getTicket(id) })
export const useCheckIn = () => useClinicMutation((input: CheckInInput) => queueService.checkIn(input))
export const useCallNext = () => useClinicMutation((doctorId: string | null) => queueService.callNext(doctorId))
export const useCallVisit = () => useClinicMutation(({ id, reason }: { id: string; reason: string }) => queueService.call(id, reason))
export const useRecall = () => useClinicMutation((id: string) => queueService.recall(id))
export const useSkip = () => useClinicMutation((id: string) => queueService.skip(id))
export const useAwaitResults = () => useClinicMutation((id: string) => queueService.awaitResults(id))
export const useReturned = () => useClinicMutation((id: string) => queueService.returned(id))
export const useTransfer = () => useClinicMutation(({ id, doctorId }: { id: string; doctorId: string }) => queueService.transfer(id, doctorId))
export const useCancelVisit = () => useClinicMutation(({ id, input }: { id: string; input: ReasonInput }) => queueService.cancel(id, input))
export const useQueueDisplay = (code: string) =>
  useQuery({
    queryKey: ['public', 'clinic', 'display', code],
    queryFn: () => queueService.getDisplay(code),
    refetchInterval: 2000,
    retry: false,
    enabled: !!code,
  })

// ───────────────────────────── Phiếu khám

export const useVisit = (id: string | null) => useQuery({ queryKey: clinicKeys.visit(id ?? ''), queryFn: () => visitService.get(id!), enabled: !!id })
export const useVisits = (q: VisitQuery, enabled = true) =>
  useQuery({ queryKey: clinicKeys.visits(q), queryFn: () => visitService.getList(q), placeholderData: keepPreviousData, enabled })
export const usePrescription = (id: string) => useQuery({ queryKey: clinicKeys.prescription(id), queryFn: () => visitService.getPrescription(id) })
export const usePhrases = (enabled = true) => useQuery({ queryKey: clinicKeys.phrases, queryFn: visitService.getPhrases, enabled })
export const useSaveVisit = () => useClinicMutation(({ id, input }: { id: string; input: SaveVisitInput }) => visitService.save(id, input))
export const useFinishVisit = () => useClinicMutation((id: string) => visitService.finish(id))
export const useReopenVisit = () => useClinicMutation((id: string) => visitService.reopen(id))
export const useAddPhrase = () => useClinicMutation((text: string) => visitService.addPhrase(text))
export const useDeletePhrase = () => useClinicMutation((id: string) => visitService.deletePhrase(id))

// ───────────────────────────── Bệnh nhân

export const usePatients = (q: PatientQuery, enabled = true) =>
  useQuery({ queryKey: clinicKeys.patients(q), queryFn: () => patientService.getList(q), placeholderData: keepPreviousData, enabled })
export const usePatient = (id: string | null) =>
  useQuery({ queryKey: clinicKeys.patient(id ?? ''), queryFn: () => patientService.get(id!), enabled: !!id })
export const useDuplicates = (q: DuplicateQuery, enabled = true) =>
  useQuery({ queryKey: clinicKeys.duplicates(q), queryFn: () => patientService.findDuplicates(q), enabled })
export const useCreatePatient = () => useClinicMutation((input: SavePatientInput) => patientService.create(input))
export const useUpdatePatient = () => useClinicMutation(({ id, input }: { id: string; input: SavePatientInput }) => patientService.update(id, input))
export const useDeletePatient = () => useClinicMutation((id: string) => patientService.remove(id))

// ───────────────────────────── Kế hoạch điều trị

export const usePlans = (q: TreatmentPlanQuery, enabled = true) =>
  useQuery({ queryKey: clinicKeys.plans(q), queryFn: () => planService.getList(q), placeholderData: keepPreviousData, enabled })
export const usePlan = (id: string | null) => useQuery({ queryKey: clinicKeys.plan(id ?? ''), queryFn: () => planService.get(id!), enabled: !!id })
export const useCreatePlan = () => useClinicMutation((input: SaveTreatmentPlanInput) => planService.create(input))
export const useUpdatePlan = () => useClinicMutation(({ id, input }: { id: string; input: SaveTreatmentPlanInput }) => planService.update(id, input))
export const usePlanAction = () =>
  useClinicMutation(({ id, action, input }: { id: string; action: 'quote' | 'approve' | 'reject' | 'accept' | 'decline' | 'stop'; input?: PlanNoteInput }) => {
    switch (action) {
      case 'quote':
        return planService.quote(id)
      case 'approve':
        return planService.approve(id, input ?? {})
      case 'reject':
        return planService.reject(id, input ?? {})
      case 'accept':
        return planService.accept(id)
      case 'decline':
        return planService.decline(id, input ?? {})
      default:
        return planService.stop(id, input ?? {})
    }
  })

// ───────────────────────────── Thu phí

export const useInvoices = (q: InvoiceQuery, enabled = true) =>
  useQuery({ queryKey: clinicKeys.invoices(q), queryFn: () => invoiceService.getList(q), placeholderData: keepPreviousData, enabled })
export const useInvoice = (id: string | null) =>
  useQuery({ queryKey: clinicKeys.invoice(id ?? ''), queryFn: () => invoiceService.get(id!), enabled: !!id })
export const useReceipts = (q: ReceiptQuery, enabled = true) =>
  useQuery({ queryKey: clinicKeys.receipts(q), queryFn: () => invoiceService.getReceipts(q), placeholderData: keepPreviousData, enabled })
export const useReceipt = (id: string | null) =>
  useQuery({ queryKey: clinicKeys.receipt(id ?? ''), queryFn: () => invoiceService.getReceipt(id!), enabled: !!id })
export const useCollect = () => useClinicMutation(({ id, input }: { id: string; input: CollectInput }) => invoiceService.collect(id, input))
export const useCancelReceipt = () => useClinicMutation(({ id, input }: { id: string; input: ReasonInput }) => invoiceService.cancelReceipt(id, input))

// ───────────────────────────── Nhắc tái khám

export const useFollowUps = (q: FollowUpQuery) =>
  useQuery({ queryKey: clinicKeys.followUps(q), queryFn: () => followUpService.getList(q), placeholderData: keepPreviousData })
export const useSendFollowUps = () => useClinicMutation((ids: string[]) => followUpService.send(ids))
export const useRecordCall = () => useClinicMutation(({ id, input }: { id: string; input: CallResultInput }) => followUpService.recordCall(id, input))

// ───────────────────────────── Tổng quan, báo cáo

export const useDashboardToday = () => useQuery({ queryKey: clinicKeys.dashboard, queryFn: reportService.getDashboard, refetchInterval: 30_000 })
export const useRevenueReport = (q: ReportQuery) =>
  useQuery({ queryKey: clinicKeys.report('revenue', q), queryFn: () => reportService.getRevenue(q), placeholderData: keepPreviousData })
export const useDoctorReport = (q: ReportQuery, enabled = true) =>
  useQuery({ queryKey: clinicKeys.report('doctors', q), queryFn: () => reportService.getDoctors(q), placeholderData: keepPreviousData, enabled })
export const useVisitReport = (q: ReportQuery, enabled = true) =>
  useQuery({ queryKey: clinicKeys.report('visits', q), queryFn: () => reportService.getVisits(q), placeholderData: keepPreviousData, enabled })
export const useFollowUpReport = (q: ReportQuery, enabled = true) =>
  useQuery({ queryKey: clinicKeys.report('follow-ups', q), queryFn: () => reportService.getFollowUps(q), placeholderData: keepPreviousData, enabled })
export const useDebtReport = (q: ReportQuery, enabled = true) =>
  useQuery({ queryKey: clinicKeys.report('debts', q), queryFn: () => reportService.getDebts(q), placeholderData: keepPreviousData, enabled })
export const useCancelledReceiptReport = (q: ReportQuery, enabled = true) =>
  useQuery({
    queryKey: clinicKeys.report('cancelled-receipts', q),
    queryFn: () => reportService.getCancelledReceipts(q),
    placeholderData: keepPreviousData,
    enabled,
  })

// ───────────────────────────── Trang công khai

export const usePublicCatalog = () =>
  useQuery({ queryKey: ['public', 'clinic', 'catalog'], queryFn: publicBookingService.getCatalog, staleTime: 5 * 60_000 })
export const usePublicSlots = (q: PublicSlotsQuery, enabled = true) =>
  useQuery({ queryKey: ['public', 'clinic', 'slots', q], queryFn: () => publicBookingService.getSlots(q), enabled, placeholderData: keepPreviousData })
export const usePublicBook = () => useClinicMutation((input: PublicBookingInput) => publicBookingService.book(input))
export const usePublicLookup = () => useMutation({ mutationFn: (input: PublicLookupInput) => publicBookingService.lookup(input) })
export const usePublicCancel = () => useClinicMutation((input: PublicLookupInput) => publicBookingService.cancel(input))
