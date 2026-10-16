using API.Filters;
using Application.Common.Models;
using Application.DTOs.Booking;
using Application.DTOs.Clinic;
using Application.DTOs.Finance;
using Application.Interfaces.Services.Clinic;
using Application.Interfaces.Services.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using P = Application.Constants.ProjectPermissions;

namespace API.Controllers.Clinic;

/// <summary>Lịch hẹn (07 §4.3).</summary>
[Route("api/appointments")]
public sealed class AppointmentsController(IAppointmentService service) : ClinicControllerBase
{
    [HttpGet("board")]
    [AuthorizePermission(P.Appointments.View)]
    public Task<BoardDto> GetBoard([FromQuery] string? date, [FromQuery] Guid? specialtyId, CancellationToken ct) => service.GetBoardAsync(date, specialtyId, ct);

    [HttpGet("week")]
    [AuthorizePermission(P.Appointments.View)]
    public Task<WeekDto> GetWeek([FromQuery] string? start, CancellationToken ct) => service.GetWeekAsync(start, ct);

    [HttpGet]
    [AuthorizePermission(P.Appointments.View)]
    public Task<PaginatedResult<AppointmentCardDto>> GetPaged([FromQuery] AppointmentQuery query, CancellationToken ct) => service.GetPagedAsync(query, ct);

    [HttpGet("pending-count")]
    [AuthorizePermission(P.Appointments.View)]
    public Task<PendingCountDto> GetPendingCount(CancellationToken ct) => service.GetPendingCountAsync(ct);

    [HttpGet("slots")]
    [AuthorizePermission(P.Appointments.View)]
    public Task<DoctorSlotsDto> GetSlots([FromQuery] Guid doctorId, [FromQuery] string? date, CancellationToken ct) => service.GetSlotsAsync(doctorId, date, ct);

    [HttpGet("{id:guid}")]
    [AuthorizePermission(P.Appointments.View)]
    public Task<AppointmentDetailDto> GetById(Guid id, CancellationToken ct) => service.GetByIdAsync(id, ct);

    [HttpPost]
    [AuthorizePermission(P.Appointments.Create)]
    public async Task<IActionResult> Create(CreateAppointmentRequest request, CancellationToken ct) => Created201(await service.CreateAsync(request, ct));

    [HttpPut("{id:guid}/time")]
    [AuthorizePermission(P.Appointments.Update)]
    public Task<AppointmentDetailDto> Reschedule(Guid id, RescheduleRequest request, CancellationToken ct) => service.RescheduleAsync(id, request, ct);

    [HttpPost("{id:guid}/confirm")]
    [AuthorizePermission(P.Appointments.Update)]
    public Task<AppointmentDetailDto> Confirm(Guid id, ConfirmAppointmentRequest request, CancellationToken ct) => service.ConfirmAsync(id, request, ct);

    [HttpPost("{id:guid}/cancel")]
    [AuthorizePermission(P.Appointments.Cancel)]
    public Task<AppointmentDetailDto> Cancel(Guid id, CancelAppointmentRequest request, CancellationToken ct) => service.CancelAsync(id, request, ct);
}

/// <summary>Đặt lịch online, tra cứu, tự hủy (07 §4.4).</summary>
[Route("api/public/booking")]
[AllowAnonymous]
public sealed class PublicBookingController(IPublicBookingService service, ICurrentUserService currentUser) : ClinicControllerBase
{
    [HttpGet("catalog")]
    public Task<PublicCatalogDto> GetCatalog(CancellationToken ct) => service.GetCatalogAsync(ct);

    [HttpGet("slots")]
    public Task<PublicSlotsDto> GetSlots([FromQuery] PublicSlotsQuery query, CancellationToken ct) => service.GetSlotsAsync(query, ct);

    [HttpPost]
    public async Task<IActionResult> Book(PublicBookingRequest request, CancellationToken ct) => Created201(await service.BookAsync(request, ct));

    [HttpPost("lookup")]
    public Task<PublicAppointmentDto> Lookup(PublicLookupRequest request, CancellationToken ct) =>
        service.LookupAsync(request, currentUser.IpAddress ?? "unknown", ct);

    [HttpPost("cancel")]
    public Task<PublicAppointmentDto> Cancel(PublicLookupRequest request, CancellationToken ct) =>
        service.CancelAsync(request, currentUser.IpAddress ?? "unknown", ct);
}

/// <summary>Màn hình sảnh (07 §4.5): công khai, cần mã truy cập.</summary>
[Route("api/public/queue-display")]
[AllowAnonymous]
public sealed class QueueDisplayController(IQueueService service) : ClinicControllerBase
{
    [HttpGet]
    public Task<QueueDisplayDto> Get([FromQuery] QueueDisplayQuery query, CancellationToken ct) => service.GetDisplayAsync(query.Code, ct);
}

/// <summary>Hàng chờ hôm nay, gọi kế tiếp (07 §4.5).</summary>
[Route("api/queue")]
public sealed class QueueController(IQueueService service) : ClinicControllerBase
{
    [HttpGet("today")]
    [AuthorizePermission(P.QueueTickets.View)]
    public Task<QueueTodayDto> GetToday(CancellationToken ct) => service.GetTodayAsync(ct);

    [HttpPost("call-next")]
    [AuthorizePermission(P.QueueTickets.Call)]
    public Task<CallNextResultDto> CallNext(CallNextRequest request, CancellationToken ct) => service.CallNextAsync(request, ct);
}

/// <summary>Lượt khám: tiếp đón, thao tác hàng chờ, phiếu khám (07 §4.5, §4.6).</summary>
[Route("api/visits")]
public sealed class VisitsController(IQueueService queue, IVisitService service) : ClinicControllerBase
{
    [HttpGet("check-in-preview")]
    [AuthorizePermission(P.QueueTickets.Create)]
    public Task<CheckInPreviewDto> Preview([FromQuery] CheckInPreviewQuery query, CancellationToken ct) => queue.PreviewCheckInAsync(query, ct);

    [HttpPost]
    [AuthorizePermission(P.QueueTickets.Create)]
    public async Task<IActionResult> CheckIn(CheckInRequest request, CancellationToken ct) => Created201(await queue.CheckInAsync(request, ct));

    [HttpPost("{id:guid}/call")]
    [AuthorizePermission(P.QueueTickets.Call)]
    public Task<QueueVisitDto> Call(Guid id, CallVisitRequest request, CancellationToken ct) => queue.CallAsync(id, request, ct);

    [HttpPost("{id:guid}/recall")]
    [AuthorizePermission(P.QueueTickets.Call)]
    public Task<QueueVisitDto> Recall(Guid id, CancellationToken ct) => queue.RecallAsync(id, ct);

    [HttpPost("{id:guid}/skip")]
    [AuthorizePermission(P.QueueTickets.Call)]
    public Task<QueueVisitDto> Skip(Guid id, CancellationToken ct) => queue.SkipAsync(id, ct);

    [HttpPost("{id:guid}/await-results")]
    [AuthorizePermission(P.QueueTickets.Call)]
    public Task<QueueVisitDto> AwaitResults(Guid id, CancellationToken ct) => queue.AwaitResultsAsync(id, ct);

    [HttpPost("{id:guid}/returned")]
    [AuthorizePermission(P.QueueTickets.Update)]
    public Task<QueueVisitDto> Returned(Guid id, CancellationToken ct) => queue.ReturnedAsync(id, ct);

    [HttpPost("{id:guid}/transfer")]
    [AuthorizePermission(P.QueueTickets.Update)]
    public Task<QueueVisitDto> Transfer(Guid id, TransferVisitRequest request, CancellationToken ct) => queue.TransferAsync(id, request, ct);

    [HttpPost("{id:guid}/cancel")]
    [AuthorizePermission(P.QueueTickets.Update)]
    public Task<QueueVisitDto> Cancel(Guid id, ReasonRequest request, CancellationToken ct) => queue.CancelAsync(id, request, ct);

    [HttpGet("{id:guid}/ticket")]
    [AuthorizePermission(P.QueueTickets.View)]
    public Task<QueueTicketDto> GetTicket(Guid id, CancellationToken ct) => queue.GetTicketAsync(id, ct);

    [HttpGet("{id:guid}")]
    [AuthorizePermission(P.QueueTickets.View, P.Patients.View)]
    public Task<VisitDetailDto> GetById(Guid id, CancellationToken ct) => service.GetByIdAsync(id, ct);

    [HttpGet]
    [AuthorizePermission(P.Patients.View)]
    public Task<PaginatedResult<VisitSummaryDto>> GetPaged([FromQuery] VisitQuery query, CancellationToken ct) => service.GetPagedAsync(query, ct);

    [HttpPut("{id:guid}")]
    [AuthorizePermission(P.Visits.Examine)]
    public Task<VisitDetailDto> Save(Guid id, SaveVisitRequest request, CancellationToken ct) => service.SaveAsync(id, request, ct);

    [HttpPost("{id:guid}/finish")]
    [AuthorizePermission(P.Visits.Examine)]
    public Task<VisitDetailDto> Finish(Guid id, CancellationToken ct) => service.FinishAsync(id, ct);

    [HttpPost("{id:guid}/reopen")]
    [AuthorizePermission(P.Visits.Reopen)]
    public Task<VisitDetailDto> Reopen(Guid id, CancellationToken ct) => service.ReopenAsync(id, ct);

    [HttpGet("{id:guid}/prescription")]
    [AuthorizePermission(P.MedicalRecords.View)]
    public Task<PrescriptionPrintDto> GetPrescription(Guid id, CancellationToken ct) => service.GetPrescriptionAsync(id, ct);
}

/// <summary>Câu mẫu cách dùng của tài khoản đang đăng nhập (07 §4.6).</summary>
[Route("api/usage-phrases")]
public sealed class UsagePhrasesController(IVisitService service) : ClinicControllerBase
{
    [HttpGet]
    [AuthorizePermission(P.Visits.Examine)]
    public Task<IReadOnlyList<UsagePhraseDto>> GetAll(CancellationToken ct) => service.GetPhrasesAsync(ct);

    [HttpPost]
    [AuthorizePermission(P.Visits.Examine)]
    public async Task<IActionResult> Add(SaveUsagePhraseRequest request, CancellationToken ct) => Created201(await service.AddPhraseAsync(request, ct));

    [HttpDelete("{id:guid}")]
    [AuthorizePermission(P.Visits.Examine)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await service.DeletePhraseAsync(id, ct);
        return NoContent();
    }
}

/// <summary>Bệnh nhân (07 §4.7).</summary>
[Route("api/patients")]
public sealed class PatientsController(IPatientService service) : ClinicControllerBase
{
    [HttpGet]
    [AuthorizePermission(P.Patients.View)]
    public Task<PaginatedResult<PatientDto>> GetPaged([FromQuery] PatientQuery query, CancellationToken ct) => service.GetPagedAsync(query, ct);

    [HttpGet("duplicates")]
    [AuthorizePermission(P.Patients.View, P.Patients.Create)]
    public Task<DuplicateResultDto> FindDuplicates([FromQuery] DuplicateQuery query, CancellationToken ct) => service.FindDuplicatesAsync(query, ct);

    [HttpGet("{id:guid}")]
    [AuthorizePermission(P.Patients.View)]
    public Task<PatientDetailDto> GetById(Guid id, CancellationToken ct) => service.GetByIdAsync(id, ct);

    [HttpPost]
    [AuthorizePermission(P.Patients.Create)]
    public async Task<IActionResult> Create(SavePatientRequest request, CancellationToken ct) => Created201(await service.CreateAsync(request, ct));

    [HttpPut("{id:guid}")]
    [AuthorizePermission(P.Patients.Update)]
    public Task<PatientDto> Update(Guid id, SavePatientRequest request, CancellationToken ct) => service.UpdateAsync(id, request, ct);

    [HttpDelete("{id:guid}")]
    [AuthorizePermission(P.Patients.Update)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await service.DeleteAsync(id, ct);
        return NoContent();
    }
}

/// <summary>Kế hoạch điều trị (07 §4.8).</summary>
[Route("api/treatment-plans")]
public sealed class TreatmentPlansController(ITreatmentPlanService service) : ClinicControllerBase
{
    [HttpGet]
    [AuthorizePermission(P.TreatmentPlans.View)]
    public Task<PaginatedResult<TreatmentPlanListItem>> GetPaged([FromQuery] TreatmentPlanQuery query, CancellationToken ct) => service.GetPagedAsync(query, ct);

    [HttpGet("{id:guid}")]
    [AuthorizePermission(P.TreatmentPlans.View)]
    public Task<TreatmentPlanDto> GetById(Guid id, CancellationToken ct) => service.GetByIdAsync(id, ct);

    [HttpPost]
    [AuthorizePermission(P.TreatmentPlans.Create)]
    public async Task<IActionResult> Create(SaveTreatmentPlanRequest request, CancellationToken ct) => Created201(await service.CreateAsync(request, ct));

    [HttpPut("{id:guid}")]
    [AuthorizePermission(P.TreatmentPlans.Update)]
    public Task<TreatmentPlanDto> Update(Guid id, SaveTreatmentPlanRequest request, CancellationToken ct) => service.UpdateAsync(id, request, ct);

    [HttpPost("{id:guid}/quote")]
    [AuthorizePermission(P.TreatmentPlans.Update)]
    public Task<TreatmentPlanDto> Quote(Guid id, CancellationToken ct) => service.QuoteAsync(id, ct);

    [HttpPost("{id:guid}/accept")]
    [AuthorizePermission(P.TreatmentPlans.Update)]
    public Task<TreatmentPlanDto> Accept(Guid id, CancellationToken ct) => service.AcceptAsync(id, ct);

    [HttpPost("{id:guid}/decline")]
    [AuthorizePermission(P.TreatmentPlans.Update)]
    public Task<TreatmentPlanDto> Decline(Guid id, PlanNoteRequest request, CancellationToken ct) => service.DeclineAsync(id, request, ct);

    [HttpPost("{id:guid}/stop")]
    [AuthorizePermission(P.TreatmentPlans.Update)]
    public Task<TreatmentPlanDto> Stop(Guid id, PlanNoteRequest request, CancellationToken ct) => service.StopAsync(id, request, ct);

    [HttpPost("{id:guid}/approve")]
    [AuthorizePermission(P.TreatmentPlans.Approve)]
    public Task<TreatmentPlanDto> Approve(Guid id, PlanNoteRequest request, CancellationToken ct) => service.ApproveAsync(id, request, ct);

    [HttpPost("{id:guid}/reject")]
    [AuthorizePermission(P.TreatmentPlans.Approve)]
    public Task<TreatmentPlanDto> Reject(Guid id, PlanNoteRequest request, CancellationToken ct) => service.RejectAsync(id, request, ct);
}

/// <summary>Phiếu thanh toán, thu tiền (07 §4.9).</summary>
[Route("api/invoices")]
public sealed class InvoicesController(IInvoiceService service) : ClinicControllerBase
{
    [HttpGet]
    [AuthorizePermission(P.Invoices.View)]
    public Task<PaginatedResult<InvoiceListItem>> GetPaged([FromQuery] InvoiceQuery query, CancellationToken ct) => service.GetPagedAsync(query, ct);

    [HttpGet("{id:guid}")]
    [AuthorizePermission(P.Invoices.View)]
    public Task<InvoiceDto> GetById(Guid id, CancellationToken ct) => service.GetByIdAsync(id, ct);

    [HttpPost("{id:guid}/receipts")]
    [AuthorizePermission(P.Invoices.Collect)]
    public async Task<IActionResult> Collect(Guid id, CollectRequest request, CancellationToken ct) => CreatedOrOk(await service.CollectAsync(id, request, ct));
}

/// <summary>Phiếu thu (07 §4.9).</summary>
[Route("api/receipts")]
public sealed class ReceiptsController(IInvoiceService service) : ClinicControllerBase
{
    [HttpGet]
    [AuthorizePermission(P.Invoices.View)]
    public Task<PaginatedResult<ReceiptListItem>> GetPaged([FromQuery] ReceiptQuery query, CancellationToken ct) => service.GetReceiptsAsync(query, ct);

    [HttpGet("{id:guid}")]
    [AuthorizePermission(P.Invoices.View)]
    public Task<ReceiptDto> GetById(Guid id, CancellationToken ct) => service.GetReceiptAsync(id, ct);

    [HttpPost("{id:guid}/cancel")]
    [AuthorizePermission(P.Invoices.Cancel)]
    public Task<ReceiptDto> Cancel(Guid id, ReasonRequest request, CancellationToken ct) => service.CancelReceiptAsync(id, request, ct);
}

/// <summary>Nhắc tái khám (07 §4.10).</summary>
[Route("api/follow-ups")]
public sealed class FollowUpsController(IFollowUpService service) : ClinicControllerBase
{
    [HttpGet]
    [AuthorizePermission(P.FollowUps.View)]
    public Task<FollowUpPageDto> GetPaged([FromQuery] FollowUpQuery query, CancellationToken ct) => service.GetPagedAsync(query, ct);

    [HttpPost("send")]
    [AuthorizePermission(P.FollowUps.Update)]
    public Task<SendFollowUpsResult> Send(SendFollowUpsRequest request, CancellationToken ct) => service.SendAsync(request, ct);

    [HttpPost("{id:guid}/call-result")]
    [AuthorizePermission(P.FollowUps.Update)]
    public Task<FollowUpDto> RecordCall(Guid id, CallResultRequest request, CancellationToken ct) => service.RecordCallAsync(id, request, ct);
}

/// <summary>Tổng quan hôm nay (07 §4.11).</summary>
[Route("api/dashboard")]
public sealed class DashboardController(IClinicReportService service) : ClinicControllerBase
{
    [HttpGet("today")]
    [AuthorizePermission(P.Reports.View)]
    public Task<DashboardTodayDto> GetToday(CancellationToken ct) => service.GetDashboardAsync(ct);
}

/// <summary>Báo cáo (07 §4.11).</summary>
[Route("api/reports")]
[AuthorizePermission(P.Reports.View)]
public sealed class ReportsController(IClinicReportService service) : ClinicControllerBase
{
    [HttpGet("revenue")]
    public Task<RevenueReportDto> Revenue([FromQuery] ReportQuery query, CancellationToken ct) => service.GetRevenueAsync(query, ct);

    [HttpGet("doctors")]
    public Task<DoctorReportDto> Doctors([FromQuery] ReportQuery query, CancellationToken ct) => service.GetDoctorsAsync(query, ct);

    [HttpGet("visits")]
    public Task<VisitReportDto> Visits([FromQuery] ReportQuery query, CancellationToken ct) => service.GetVisitsAsync(query, ct);

    [HttpGet("follow-ups")]
    public Task<FollowUpReportDto> FollowUps([FromQuery] ReportQuery query, CancellationToken ct) => service.GetFollowUpsAsync(query, ct);

    [HttpGet("debts")]
    public Task<DebtReportDto> Debts([FromQuery] ReportQuery query, CancellationToken ct) => service.GetDebtsAsync(query, ct);

    [HttpGet("cancelled-receipts")]
    public Task<CancelledReceiptReportDto> CancelledReceipts([FromQuery] ReportQuery query, CancellationToken ct) => service.GetCancelledReceiptsAsync(query, ct);
}
