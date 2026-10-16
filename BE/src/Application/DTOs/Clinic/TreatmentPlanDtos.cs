using Application.Common.Models;
using Domain.Enums.Clinic;

namespace Application.DTOs.Clinic;

public sealed class TreatmentPlanItemDto
{
    public Guid Id { get; init; }
    public Guid ServiceId { get; init; }
    public string ServiceCode { get; init; } = string.Empty;
    public string ServiceName { get; init; } = string.Empty;
    public ServiceUnit Unit { get; init; }
    public IReadOnlyList<int> Teeth { get; init; } = [];
    public int Quantity { get; init; }
    public decimal UnitPrice { get; init; }
    public DiscountType? DiscountType { get; init; }
    public decimal DiscountValue { get; init; }
    public decimal DiscountAmount { get; init; }
    public decimal Amount { get; init; }
    public PlanItemStatus Status { get; init; }
    public DateTime? DoneAt { get; init; }
    public Guid? VisitId { get; init; }
    public string? VisitCode { get; init; }
}

/// <summary>Thao tác được phép theo trạng thái và quyền (07 §3.11).</summary>
public sealed class PlanActionsDto
{
    public bool CanEdit { get; init; }
    public bool CanQuote { get; init; }
    public bool CanApprove { get; init; }
    public bool CanAccept { get; init; }
    public bool CanStop { get; init; }
}

public sealed class TreatmentPlanDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public PatientBrief Patient { get; init; } = new();
    public Guid DoctorId { get; init; }
    public string DoctorName { get; init; } = string.Empty;
    public int PlannedSessions { get; init; }
    public string? Note { get; init; }
    public decimal SubTotal { get; init; }
    public decimal DiscountTotal { get; init; }
    public decimal Total { get; init; }
    public decimal DiscountRate { get; init; }
    public PlanStatus Status { get; init; }
    public IReadOnlyList<TreatmentPlanItemDto> Items { get; init; } = [];
    public int DoneCount { get; init; }
    public int ItemCount { get; init; }
    public decimal DoneAmount { get; init; }
    public decimal PaidAmount { get; init; }
    public decimal Remaining { get; init; }
    public DateTime CreatedAt { get; init; }
    public string? CreatedByName { get; init; }
    public DateTime? QuotedAt { get; init; }
    public DateTime? AcceptedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
    public DateTime? CancelledAt { get; init; }
    public string? CancelReason { get; init; }
    public string? ReviewedByName { get; init; }
    public DateTime? ReviewedAt { get; init; }
    public string? ReviewNote { get; init; }
    public PlanActionsDto Actions { get; init; } = new();
}

public sealed class TreatmentPlanListItem
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public Guid PatientId { get; init; }
    public string PatientCode { get; init; } = string.Empty;
    public string PatientName { get; init; } = string.Empty;
    public string PatientPhone { get; init; } = string.Empty;
    public Guid DoctorId { get; init; }
    public string DoctorName { get; init; } = string.Empty;
    public decimal Total { get; init; }
    public decimal DiscountRate { get; init; }
    public PlanStatus Status { get; init; }
    public int DoneCount { get; init; }
    public int ItemCount { get; init; }
    public decimal PaidAmount { get; init; }
    public decimal Remaining { get; init; }
    public DateTime CreatedAt { get; init; }
}

public sealed class TreatmentPlanQuery : PaginationQuery
{
    public PlanStatus? Status { get; set; }
    public Guid? PatientId { get; set; }
    public Guid? DoctorId { get; set; }
}

public sealed class SavePlanItemInput
{
    public Guid? Id { get; init; }
    public Guid ServiceId { get; init; }
    public List<int>? Teeth { get; init; }
    public int Quantity { get; init; } = 1;
    public DiscountType? DiscountType { get; init; }
    public decimal DiscountValue { get; init; }
}

public sealed class SaveTreatmentPlanRequest
{
    public Guid PatientId { get; init; }
    public int PlannedSessions { get; init; } = 1;
    public string? Note { get; init; }
    public List<SavePlanItemInput> Items { get; init; } = [];
}

public sealed class PlanNoteRequest
{
    public string? Note { get; init; }
}
