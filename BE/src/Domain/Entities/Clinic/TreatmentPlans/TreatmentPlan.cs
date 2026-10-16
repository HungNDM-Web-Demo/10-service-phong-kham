using Domain.Base;
using Domain.Entities.Booking.Doctors;
using Domain.Entities.Clinic.Patients;
using Domain.Enums.Clinic;

namespace Domain.Entities.Clinic.TreatmentPlans;

/// <summary>Kế hoạch điều trị nhiều buổi (06 §4 <c>Clinic_TreatmentPlans</c>, FR-28 đến FR-30).</summary>
public class TreatmentPlan : BaseEntity, ICreationTracked, IModificationTracked
{
    public const int CodeMaxLength = 20;
    public const int NoteMaxLength = 500;
    public const int ReviewNoteMaxLength = 300;
    public const int NameMaxLength = 100;

    public string Code { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public Patient? Patient { get; set; }
    public Guid DoctorId { get; set; }
    public Doctor? Doctor { get; set; }
    public int PlannedSessions { get; set; } = 1;
    public string? Note { get; set; }
    public decimal SubTotal { get; set; }
    public decimal DiscountTotal { get; set; }
    public decimal Total { get; set; }
    public PlanStatus Status { get; set; }
    public DateTime? QuotedAt { get; set; }
    public DateTime? AcceptedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancelReason { get; set; }
    public string? ReviewedByName { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewNote { get; set; }
    public string? CreatedByName { get; set; }
    public List<TreatmentPlanItem> Items { get; set; } = [];

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    public void SetCreatedAt(DateTime value) => CreatedAt = value;
}
