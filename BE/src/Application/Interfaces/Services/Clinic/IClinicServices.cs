using Application.Common.Models;
using Application.DTOs.Booking;
using Application.DTOs.Clinic;
using Application.DTOs.Finance;
using Domain.Enums.Clinic;

namespace Application.Interfaces.Services.Clinic;

/// <summary>Chuyên khoa, dịch vụ (UC-01, 07 §4.1).</summary>
public interface IServiceCatalogService
{
    Task<IReadOnlyList<SpecialtyDto>> GetSpecialtiesAsync(CancellationToken ct = default);

    Task<IReadOnlyList<ServiceDto>> GetServicesAsync(ServiceQuery query, CancellationToken ct = default);

    Task<IReadOnlyList<ServiceDto>> GetOptionsAsync(CancellationToken ct = default);

    Task<NextCodeDto> NextCodeAsync(ServiceGroup group, CancellationToken ct = default);

    Task<ServiceDto> CreateAsync(SaveServiceRequest request, CancellationToken ct = default);

    Task<ServiceDto> UpdateAsync(Guid id, SaveServiceRequest request, CancellationToken ct = default);

    Task<ServiceDto> SetActiveAsync(Guid id, bool isActive, CancellationToken ct = default);

    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface IMedicineService
{
    Task<PaginatedResult<MedicineDto>> GetPagedAsync(MedicineQuery query, CancellationToken ct = default);

    Task<IReadOnlyList<MedicineDto>> GetOptionsAsync(CancellationToken ct = default);

    Task<NextCodeDto> NextCodeAsync(CancellationToken ct = default);

    Task<MedicineDto> CreateAsync(SaveMedicineRequest request, CancellationToken ct = default);

    Task<MedicineDto> UpdateAsync(Guid id, SaveMedicineRequest request, CancellationToken ct = default);

    Task<MedicineDto> SetActiveAsync(Guid id, bool isActive, CancellationToken ct = default);

    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface IDiagnosisTemplateService
{
    Task<IReadOnlyList<DiagnosisTemplateDto>> GetAllAsync(DiagnosisQuery query, CancellationToken ct = default);

    Task<IReadOnlyList<DiagnosisTemplateDto>> GetOptionsAsync(CancellationToken ct = default);

    Task<DiagnosisTemplateDto> CreateAsync(SaveDiagnosisTemplateRequest request, CancellationToken ct = default);

    Task<DiagnosisTemplateDto> UpdateAsync(Guid id, SaveDiagnosisTemplateRequest request, CancellationToken ct = default);

    Task<DiagnosisTemplateDto> SetActiveAsync(Guid id, bool isActive, CancellationToken ct = default);

    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

/// <summary>Bác sĩ, lịch làm việc, ngày nghỉ (UC-02, 07 §4.2).</summary>
public interface IDoctorService
{
    Task<IReadOnlyList<DoctorDto>> GetAllAsync(CancellationToken ct = default);

    Task<IReadOnlyList<DoctorOption>> GetOptionsAsync(CancellationToken ct = default);

    Task<IReadOnlyList<AccountCandidate>> GetAccountCandidatesAsync(CancellationToken ct = default);

    Task<NextCodeDto> NextCodeAsync(CancellationToken ct = default);

    Task<DoctorDto> CreateAsync(SaveDoctorRequest request, CancellationToken ct = default);

    Task<DoctorDto> UpdateAsync(Guid id, SaveDoctorRequest request, CancellationToken ct = default);

    Task<DoctorDto> SaveScheduleAsync(Guid id, SaveScheduleRequest request, CancellationToken ct = default);

    Task<DoctorDto> SetActiveAsync(Guid id, bool isActive, CancellationToken ct = default);

    Task DeleteAsync(Guid id, CancellationToken ct = default);

    Task<IReadOnlyList<DayOffDto>> GetDaysOffAsync(DayOffQuery query, CancellationToken ct = default);

    Task<DayOffResult> CreateDayOffAsync(CreateDayOffRequest request, CancellationToken ct = default);

    Task DeleteDayOffAsync(Guid id, CancellationToken ct = default);
}

/// <summary>Lịch hẹn (UC-03, UC-04, 07 §4.3).</summary>
public interface IAppointmentService
{
    Task<BoardDto> GetBoardAsync(string? date, Guid? specialtyId, CancellationToken ct = default);

    Task<WeekDto> GetWeekAsync(string? start, CancellationToken ct = default);

    Task<PaginatedResult<AppointmentCardDto>> GetPagedAsync(AppointmentQuery query, CancellationToken ct = default);

    Task<PendingCountDto> GetPendingCountAsync(CancellationToken ct = default);

    Task<AppointmentDetailDto> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<DoctorSlotsDto> GetSlotsAsync(Guid doctorId, string? date, CancellationToken ct = default);

    Task<AppointmentDetailDto> CreateAsync(CreateAppointmentRequest request, CancellationToken ct = default);

    Task<AppointmentDetailDto> RescheduleAsync(Guid id, RescheduleRequest request, CancellationToken ct = default);

    Task<AppointmentDetailDto> ConfirmAsync(Guid id, ConfirmAppointmentRequest request, CancellationToken ct = default);

    Task<AppointmentDetailDto> CancelAsync(Guid id, CancelAppointmentRequest request, CancellationToken ct = default);
}

/// <summary>Đặt lịch online công khai (UC-03, FR-13, 07 §4.4).</summary>
public interface IPublicBookingService
{
    Task<PublicCatalogDto> GetCatalogAsync(CancellationToken ct = default);

    Task<PublicSlotsDto> GetSlotsAsync(PublicSlotsQuery query, CancellationToken ct = default);

    Task<PublicAppointmentDto> BookAsync(PublicBookingRequest request, CancellationToken ct = default);

    Task<PublicAppointmentDto> LookupAsync(PublicLookupRequest request, string clientKey, CancellationToken ct = default);

    Task<PublicAppointmentDto> CancelAsync(PublicLookupRequest request, string clientKey, CancellationToken ct = default);
}

/// <summary>Tiếp đón, hàng chờ, màn hình sảnh (UC-05, UC-06, 07 §4.5).</summary>
public interface IQueueService
{
    Task<QueueTodayDto> GetTodayAsync(CancellationToken ct = default);

    Task<CheckInPreviewDto> PreviewCheckInAsync(CheckInPreviewQuery query, CancellationToken ct = default);

    Task<CheckInResultDto> CheckInAsync(CheckInRequest request, CancellationToken ct = default);

    Task<CallNextResultDto> CallNextAsync(CallNextRequest request, CancellationToken ct = default);

    Task<QueueVisitDto> CallAsync(Guid visitId, CallVisitRequest request, CancellationToken ct = default);

    Task<QueueVisitDto> RecallAsync(Guid visitId, CancellationToken ct = default);

    Task<QueueVisitDto> SkipAsync(Guid visitId, CancellationToken ct = default);

    Task<QueueVisitDto> AwaitResultsAsync(Guid visitId, CancellationToken ct = default);

    Task<QueueVisitDto> ReturnedAsync(Guid visitId, CancellationToken ct = default);

    Task<QueueVisitDto> TransferAsync(Guid visitId, TransferVisitRequest request, CancellationToken ct = default);

    Task<QueueVisitDto> CancelAsync(Guid visitId, ReasonRequest request, CancellationToken ct = default);

    Task<QueueTicketDto> GetTicketAsync(Guid visitId, CancellationToken ct = default);

    Task<QueueDisplayDto> GetDisplayAsync(string? code, CancellationToken ct = default);
}

/// <summary>Phiếu khám (UC-07 đến UC-09, 07 §4.6).</summary>
public interface IVisitService
{
    Task<VisitDetailDto> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<PaginatedResult<VisitSummaryDto>> GetPagedAsync(VisitQuery query, CancellationToken ct = default);

    Task<VisitDetailDto> SaveAsync(Guid id, SaveVisitRequest request, CancellationToken ct = default);

    Task<VisitDetailDto> FinishAsync(Guid id, CancellationToken ct = default);

    Task<VisitDetailDto> ReopenAsync(Guid id, CancellationToken ct = default);

    Task<PrescriptionPrintDto> GetPrescriptionAsync(Guid id, CancellationToken ct = default);

    Task<IReadOnlyList<UsagePhraseDto>> GetPhrasesAsync(CancellationToken ct = default);

    Task<UsagePhraseDto> AddPhraseAsync(SaveUsagePhraseRequest request, CancellationToken ct = default);

    Task DeletePhraseAsync(Guid id, CancellationToken ct = default);
}

/// <summary>Hồ sơ bệnh nhân (UC-07 phần hồ sơ, BR-14, BR-15, 07 §4.7).</summary>
public interface IPatientService
{
    Task<PaginatedResult<PatientDto>> GetPagedAsync(PatientQuery query, CancellationToken ct = default);

    Task<PatientDetailDto> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<DuplicateResultDto> FindDuplicatesAsync(DuplicateQuery query, CancellationToken ct = default);

    Task<PatientDto> CreateAsync(SavePatientRequest request, CancellationToken ct = default);

    Task<PatientDto> UpdateAsync(Guid id, SavePatientRequest request, CancellationToken ct = default);

    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

/// <summary>Kế hoạch điều trị (UC-10, 07 §4.8).</summary>
public interface ITreatmentPlanService
{
    Task<PaginatedResult<TreatmentPlanListItem>> GetPagedAsync(TreatmentPlanQuery query, CancellationToken ct = default);

    Task<TreatmentPlanDto> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<TreatmentPlanDto> CreateAsync(SaveTreatmentPlanRequest request, CancellationToken ct = default);

    Task<TreatmentPlanDto> UpdateAsync(Guid id, SaveTreatmentPlanRequest request, CancellationToken ct = default);

    Task<TreatmentPlanDto> QuoteAsync(Guid id, CancellationToken ct = default);

    Task<TreatmentPlanDto> ApproveAsync(Guid id, PlanNoteRequest request, CancellationToken ct = default);

    Task<TreatmentPlanDto> RejectAsync(Guid id, PlanNoteRequest request, CancellationToken ct = default);

    Task<TreatmentPlanDto> AcceptAsync(Guid id, CancellationToken ct = default);

    Task<TreatmentPlanDto> DeclineAsync(Guid id, PlanNoteRequest request, CancellationToken ct = default);

    Task<TreatmentPlanDto> StopAsync(Guid id, PlanNoteRequest request, CancellationToken ct = default);
}

/// <summary>Thu phí, phiếu thu (UC-11, UC-12, 07 §4.9).</summary>
public interface IInvoiceService
{
    Task<PaginatedResult<InvoiceListItem>> GetPagedAsync(InvoiceQuery query, CancellationToken ct = default);

    Task<InvoiceDto> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<CreateResult<ReceiptDto>> CollectAsync(Guid invoiceId, CollectRequest request, CancellationToken ct = default);

    Task<PaginatedResult<ReceiptListItem>> GetReceiptsAsync(ReceiptQuery query, CancellationToken ct = default);

    Task<ReceiptDto> GetReceiptAsync(Guid id, CancellationToken ct = default);

    Task<ReceiptDto> CancelReceiptAsync(Guid id, ReasonRequest request, CancellationToken ct = default);
}

/// <summary>Nhắc tái khám (UC-13, 07 §4.10).</summary>
public interface IFollowUpService
{
    Task<FollowUpPageDto> GetPagedAsync(FollowUpQuery query, CancellationToken ct = default);

    Task<SendFollowUpsResult> SendAsync(SendFollowUpsRequest request, CancellationToken ct = default);

    Task<FollowUpDto> RecordCallAsync(Guid id, CallResultRequest request, CancellationToken ct = default);
}

/// <summary>Tổng quan, báo cáo (UC-14, 07 §4.11).</summary>
public interface IClinicReportService
{
    Task<DashboardTodayDto> GetDashboardAsync(CancellationToken ct = default);

    Task<RevenueReportDto> GetRevenueAsync(ReportQuery query, CancellationToken ct = default);

    Task<DoctorReportDto> GetDoctorsAsync(ReportQuery query, CancellationToken ct = default);

    Task<VisitReportDto> GetVisitsAsync(ReportQuery query, CancellationToken ct = default);

    Task<FollowUpReportDto> GetFollowUpsAsync(ReportQuery query, CancellationToken ct = default);

    Task<DebtReportDto> GetDebtsAsync(ReportQuery query, CancellationToken ct = default);

    Task<CancelledReceiptReportDto> GetCancelledReceiptsAsync(ReportQuery query, CancellationToken ct = default);
}

public interface IClinicProfileService
{
    Task<ClinicProfileDto> GetAsync(CancellationToken ct = default);
}

/// <summary>Việc nền (06 §3): lịch không đến, lượt bỏ về cuối ngày, dòng nhắc quá hạn, tin nhắc lịch 18:00.</summary>
public interface IClinicMaintenanceService
{
    Task<int> RunAsync(CancellationToken ct = default);
}
