using Application.Common.Models;
using Application.DTOs.Booking;
using Domain.Enums.Clinic;
using Domain.Enums.Finance;

namespace Application.DTOs.Clinic;

/// <summary>Một lượt trong hàng chờ (07 §5, BR-08 đến BR-13).</summary>
public sealed class QueueVisitDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public Guid DoctorId { get; init; }
    public string DoctorName { get; init; } = string.Empty;
    public int QueueNumber { get; init; }
    public string Ticket { get; init; } = string.Empty;
    public Guid PatientId { get; init; }
    public string PatientCode { get; init; } = string.Empty;
    public string PatientName { get; init; } = string.Empty;
    public string PatientPhone { get; init; } = string.Empty;
    public int Age { get; init; }
    public Gender Gender { get; init; }
    public bool IsPriority { get; init; }
    public string? PriorityReason { get; init; }
    public bool HasAppointment { get; init; }
    public DateTime? AppointmentStartAt { get; init; }
    public bool IsFollowUp { get; init; }
    public bool IsReturned { get; init; }
    public VisitStatus Status { get; init; }
    public DateTime CheckedInAt { get; init; }
    public DateTime QueueAt { get; init; }
    public DateTime InitialQueueAt { get; init; }
    public DateTime? StartedAt { get; init; }
    public DateTime? CalledAt { get; init; }
    public int WaitMinutes { get; init; }
    public int SkipCount { get; init; }
    public string? Reason { get; init; }
}

public sealed class QueueDoctorDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string Room { get; init; } = string.Empty;
    public string RoomShort { get; init; } = string.Empty;
    public string SpecialtyName { get; init; } = string.Empty;

    /// <summary>Có khung làm việc hôm nay và không nghỉ cả ngày.</summary>
    public bool Working { get; init; }

    public string? OffReason { get; init; }
    public QueueVisitDto? Current { get; init; }
    public IReadOnlyList<QueueVisitDto> Waiting { get; init; } = [];
    public IReadOnlyList<QueueVisitDto> Awaiting { get; init; } = [];
    public int DoneCount { get; init; }
    public int? AvgWaitMinutes { get; init; }
}

public sealed class QueueTodayDto
{
    public string Date { get; init; } = string.Empty;

    /// <summary>Bác sĩ gắn với tài khoản đang đăng nhập; null với lễ tân, quản lý.</summary>
    public Guid? MyDoctorId { get; init; }

    public IReadOnlyList<AppointmentCardDto> PendingAppointments { get; init; } = [];
    public IReadOnlyList<QueueDoctorDto> Doctors { get; init; } = [];
}

public sealed class CheckInPreviewQuery
{
    public Guid? AppointmentId { get; set; }
    public Guid? PatientId { get; set; }
    public Guid? DoctorId { get; set; }
}

public sealed class OpenVisitBrief
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Ticket { get; init; } = string.Empty;
    public string DoctorName { get; init; } = string.Empty;
    public VisitStatus Status { get; init; }
}

public sealed class FollowUpBrief
{
    public Guid Id { get; init; }
    public string DueDate { get; init; } = string.Empty;
    public string DoctorName { get; init; } = string.Empty;
    public string? Note { get; init; }
}

/// <summary>Xem trước khi tiếp đón: ưu tiên tự động, tái khám theo hẹn, lượt đang mở (UC-05).</summary>
public sealed class CheckInPreviewDto
{
    public PatientBrief? Patient { get; init; }
    public bool AutoPriority { get; init; }
    public string? AutoPriorityReason { get; init; }
    public FollowUpBrief? FollowUp { get; init; }
    public OpenVisitBrief? OpenVisit { get; init; }
    public bool DoctorWorking { get; init; }
    public int WaitingAhead { get; init; }
    public bool LateForAppointment { get; init; }
}

public sealed class CheckInRequest
{
    public Guid? AppointmentId { get; init; }
    public Guid? PatientId { get; init; }
    public NewPatientInput? NewPatient { get; init; }
    public Guid DoctorId { get; init; }
    public string? Reason { get; init; }
    public bool IsPriority { get; init; }
    public string? PriorityReason { get; init; }
}

public sealed class CheckInResultDto
{
    public QueueVisitDto Visit { get; init; } = new();
    public int WaitingAhead { get; init; }
    public string Room { get; init; } = string.Empty;
}

public sealed class CallNextRequest
{
    public Guid? DoctorId { get; init; }
}

public sealed class CallNextResultDto
{
    public QueueVisitDto? Visit { get; init; }
}

public sealed class CallVisitRequest
{
    public string Reason { get; init; } = string.Empty;
}

public sealed class TransferVisitRequest
{
    public Guid DoctorId { get; init; }
}

public sealed class ReasonRequest
{
    public string Reason { get; init; } = string.Empty;
}

/// <summary>Phiếu số thứ tự 80 mm (SCR-07).</summary>
public sealed class QueueTicketDto
{
    public string ClinicName { get; init; } = string.Empty;
    public string ClinicAddress { get; init; } = string.Empty;
    public string Hotline { get; init; } = string.Empty;
    public string? LogoUrl { get; init; }
    public Guid VisitId { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Ticket { get; init; } = string.Empty;
    public int QueueNumber { get; init; }
    public string Room { get; init; } = string.Empty;
    public string DoctorName { get; init; } = string.Empty;
    public string PatientName { get; init; } = string.Empty;
    public string PatientCode { get; init; } = string.Empty;
    public bool IsPriority { get; init; }
    public string? PriorityReason { get; init; }
    public DateTime CheckedInAt { get; init; }
    public int WaitingAhead { get; init; }
}

public sealed class DisplayTicketDto
{
    public string Ticket { get; init; } = string.Empty;
    public string PatientName { get; init; } = string.Empty;
    public bool IsPriority { get; init; }
}

public sealed class DisplayRoomDto
{
    public Guid DoctorId { get; init; }
    public string Room { get; init; } = string.Empty;
    public string RoomShort { get; init; } = string.Empty;
    public string DoctorName { get; init; } = string.Empty;
    public DisplayTicketDto? Current { get; init; }
    public IReadOnlyList<DisplayTicketDto> Next { get; init; } = [];
}

public sealed class DisplayCallDto
{
    public string Ticket { get; init; } = string.Empty;
    public string PatientName { get; init; } = string.Empty;
    public string Room { get; init; } = string.Empty;
    public DateTime CalledAt { get; init; }
}

/// <summary>Màn hình sảnh (SCR-08): không lộ số điện thoại, tên rút gọn.</summary>
public sealed class QueueDisplayDto
{
    public string ClinicName { get; init; } = string.Empty;
    public string? LogoUrl { get; init; }
    public DateTime Now { get; init; }
    public IReadOnlyList<DisplayRoomDto> Rooms { get; init; } = [];
    public DisplayCallDto? LastCall { get; init; }
}

public sealed class QueueDisplayQuery
{
    public string? Code { get; set; }
}

public sealed class VisitDiagnosisDto
{
    public DiagnosisKind Kind { get; init; }
    public string? IcdCode { get; init; }
    public string Name { get; init; } = string.Empty;
}

public sealed class VisitOrderDto
{
    public Guid Id { get; init; }
    public Guid ServiceId { get; init; }
    public string ServiceCode { get; init; } = string.Empty;
    public string ServiceName { get; init; } = string.Empty;
    public ServiceGroup Group { get; init; }
    public ServiceUnit Unit { get; init; }
    public IReadOnlyList<int> Teeth { get; init; } = [];
    public int Quantity { get; init; }
    public decimal UnitPrice { get; init; }
    public decimal Discount { get; init; }
    public decimal Amount { get; init; }
    public string? Result { get; init; }
    public IReadOnlyList<string> ImageUrls { get; init; } = [];
    public OrderStatus Status { get; init; }
    public Guid? TreatmentPlanItemId { get; init; }
    public string? PlanCode { get; init; }
}

public sealed class PrescriptionLineDto
{
    public Guid Id { get; init; }
    public Guid MedicineId { get; init; }
    public string MedicineCode { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Strength { get; init; }
    public string Unit { get; init; } = string.Empty;
    public string ActiveIngredient { get; init; } = string.Empty;
    public int Quantity { get; init; }
    public int Days { get; init; }
    public string Usage { get; init; } = string.Empty;
    public decimal UnitPrice { get; init; }
    public decimal Amount { get; init; }
    public bool AllergyConfirmed { get; init; }
    public string? AllergyConfirmedByName { get; init; }
    public DateTime? AllergyConfirmedAt { get; init; }

    /// <summary>Từ khóa dị ứng trùng hoạt chất (BR-19), rỗng khi không trùng.</summary>
    public IReadOnlyList<string> AllergyMatches { get; init; } = [];
}

/// <summary>Nội dung chuyên môn của phiếu khám, chỉ trả khi có <c>medical-records.view</c>.</summary>
public sealed class VisitMedicalDto
{
    public decimal? Temperature { get; init; }
    public int? Pulse { get; init; }
    public int? BpSystolic { get; init; }
    public int? BpDiastolic { get; init; }
    public decimal? Weight { get; init; }
    public int? Height { get; init; }
    public string? Symptoms { get; init; }
    public string? Examination { get; init; }
    public IReadOnlyList<VisitDiagnosisDto> Diagnoses { get; init; } = [];
    public IReadOnlyList<VisitOrderDto> Orders { get; init; } = [];
    public IReadOnlyList<PrescriptionLineDto> Prescription { get; init; } = [];
    public string? Advice { get; init; }
    public string? FollowUpDate { get; init; }
    public string? FollowUpNote { get; init; }
}

/// <summary>Hạng mục kế hoạch đang điều trị có thể làm ở lượt này (BR-23).</summary>
public sealed class PlanItemOption
{
    public Guid Id { get; init; }
    public Guid PlanId { get; init; }
    public string PlanCode { get; init; } = string.Empty;
    public Guid ServiceId { get; init; }
    public string ServiceCode { get; init; } = string.Empty;
    public string ServiceName { get; init; } = string.Empty;
    public ServiceUnit Unit { get; init; }
    public IReadOnlyList<int> Teeth { get; init; } = [];
    public int Quantity { get; init; }
    public decimal UnitPrice { get; init; }
    public decimal DiscountAmount { get; init; }
    public decimal Amount { get; init; }

    /// <summary>Đã gắn vào lượt khác đang mở.</summary>
    public bool InOtherVisit { get; init; }
}

public sealed class InvoiceBrief
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public decimal Total { get; init; }
    public decimal Paid { get; init; }
    public decimal Debt { get; init; }
    public InvoiceStatus Status { get; init; }
}

public sealed class VisitDetailDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Date { get; init; } = string.Empty;
    public VisitStatus Status { get; init; }
    public int QueueNumber { get; init; }
    public string Ticket { get; init; } = string.Empty;
    public Guid DoctorId { get; init; }
    public string DoctorName { get; init; } = string.Empty;
    public string Room { get; init; } = string.Empty;
    public Guid SpecialtyId { get; init; }
    public string SpecialtyName { get; init; } = string.Empty;
    public PatientDto Patient { get; init; } = new();
    public Guid? AppointmentId { get; init; }
    public string? AppointmentCode { get; init; }
    public bool IsPriority { get; init; }
    public string? PriorityReason { get; init; }
    public bool IsFollowUp { get; init; }
    public bool IsReturned { get; init; }
    public string? Reason { get; init; }
    public DateTime CheckedInAt { get; init; }
    public string? CheckedInByName { get; init; }
    public DateTime? StartedAt { get; init; }
    public DateTime? FinishedAt { get; init; }
    public int SkipCount { get; init; }
    public string? CancelReason { get; init; }
    public bool CanEdit { get; init; }
    public bool CanFinish { get; init; }
    public bool CanReopen { get; init; }
    public string? ReopenBlockedReason { get; init; }
    public bool CanMedical { get; init; }
    public VisitMedicalDto? Medical { get; init; }
    public IReadOnlyList<PlanItemOption> ActivePlanItems { get; init; } = [];
    public InvoiceBrief? Invoice { get; init; }
}

/// <summary>Dòng lịch sử khám (tab Lượt khám của hồ sơ, cột lịch sử ở phiếu khám).</summary>
public sealed class VisitSummaryDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Date { get; init; } = string.Empty;
    public DateTime CheckedInAt { get; init; }
    public DateTime? FinishedAt { get; init; }
    public Guid PatientId { get; init; }
    public string PatientCode { get; init; } = string.Empty;
    public string PatientName { get; init; } = string.Empty;
    public Guid DoctorId { get; init; }
    public string DoctorName { get; init; } = string.Empty;
    public string SpecialtyName { get; init; } = string.Empty;
    public VisitStatus Status { get; init; }
    public string Services { get; init; } = string.Empty;
    public decimal? Total { get; init; }
    public InvoiceStatus? InvoiceStatus { get; init; }

    /// <summary>Chỉ có khi <c>withMedical=true</c> và có quyền xem nội dung chuyên môn.</summary>
    public string? Diagnoses { get; init; }

    public string? Prescription { get; init; }
    public string? Results { get; init; }
    public string? Advice { get; init; }
}

public sealed class VisitQuery : PaginationQuery
{
    public Guid? PatientId { get; set; }
    public Guid? DoctorId { get; set; }
    public string? From { get; set; }
    public string? To { get; set; }
    public VisitStatus? Status { get; set; }
    public bool WithMedical { get; set; }
}

public sealed class SaveDiagnosisInput
{
    public DiagnosisKind Kind { get; init; }
    public string? IcdCode { get; init; }
    public string Name { get; init; } = string.Empty;
}

public sealed class SaveOrderInput
{
    public Guid? Id { get; init; }
    public Guid ServiceId { get; init; }
    public List<int>? Teeth { get; init; }
    public int Quantity { get; init; } = 1;
    public OrderStatus? Status { get; init; }
    public string? Result { get; init; }
    public List<string>? ImageUrls { get; init; }
    public Guid? TreatmentPlanItemId { get; init; }
}

public sealed class SavePrescriptionInput
{
    public Guid? Id { get; init; }
    public Guid MedicineId { get; init; }
    public int Quantity { get; init; }
    public int Days { get; init; }
    public string Usage { get; init; } = string.Empty;
    public bool AllergyConfirmed { get; init; }
}

/// <summary>Ghi phiếu khám (07 §3.6).</summary>
public sealed class SaveVisitRequest
{
    public decimal? Temperature { get; init; }
    public int? Pulse { get; init; }
    public int? BpSystolic { get; init; }
    public int? BpDiastolic { get; init; }
    public decimal? Weight { get; init; }
    public int? Height { get; init; }
    public string? Symptoms { get; init; }
    public string? Examination { get; init; }
    public List<SaveDiagnosisInput> Diagnoses { get; init; } = [];
    public List<SaveOrderInput> Orders { get; init; } = [];
    public List<SavePrescriptionInput> Prescription { get; init; } = [];
    public string? Advice { get; init; }
    public string? FollowUpDate { get; init; }
    public string? FollowUpNote { get; init; }
}

public sealed class PrescriptionPrintLine
{
    public string Name { get; init; } = string.Empty;
    public string? Strength { get; init; }
    public string ActiveIngredient { get; init; } = string.Empty;
    public string Unit { get; init; } = string.Empty;
    public int Quantity { get; init; }
    public int Days { get; init; }
    public string Usage { get; init; } = string.Empty;
}

/// <summary>Đơn thuốc A5 (SCR-12).</summary>
public sealed class PrescriptionPrintDto
{
    public ClinicProfileDto Clinic { get; init; } = new(string.Empty, string.Empty, string.Empty, string.Empty, null, string.Empty, string.Empty, string.Empty, [], 1);
    public string VisitCode { get; init; } = string.Empty;
    public string Date { get; init; } = string.Empty;
    public string PatientCode { get; init; } = string.Empty;
    public string PatientName { get; init; } = string.Empty;
    public string BirthDate { get; init; } = string.Empty;
    public int Age { get; init; }
    public Gender Gender { get; init; }
    public string Phone { get; init; } = string.Empty;
    public string? Address { get; init; }
    public string? Allergies { get; init; }
    public string DoctorName { get; init; } = string.Empty;
    public string Diagnoses { get; init; } = string.Empty;
    public IReadOnlyList<PrescriptionPrintLine> Lines { get; init; } = [];
    public string? Advice { get; init; }
    public string? FollowUpDate { get; init; }
    public string? FollowUpNote { get; init; }
}

public sealed class UsagePhraseDto
{
    public Guid Id { get; init; }
    public string Text { get; init; } = string.Empty;
}

public sealed class SaveUsagePhraseRequest
{
    public string Text { get; init; } = string.Empty;
}
