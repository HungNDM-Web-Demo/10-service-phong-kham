using Domain.Base;
using Domain.Entities.Booking.Doctors;
using Domain.Entities.Clinic.Patients;
using Domain.Enums.Clinic;

namespace Domain.Entities.Clinic.Visits;

/// <summary>Lượt khám kèm nội dung phiếu khám (06 §4 <c>Clinic_Visits</c>): hàng chờ (BR-08 đến BR-13), sinh hiệu (BR-16), hẹn tái khám.</summary>
public class Visit : BaseEntity, ICreationTracked, IModificationTracked, IAuditLogExempt
{
    public const int CodeMaxLength = 20;
    public const int ReasonMaxLength = 300;
    public const int PriorityReasonMaxLength = 100;
    public const int CallReasonMaxLength = 100;
    public const int CancelReasonMaxLength = 200;
    public const int LongTextMaxLength = 2000;
    public const int AdviceMaxLength = 1000;
    public const int FollowUpNoteMaxLength = 300;

    public string Code { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public Patient? Patient { get; set; }
    public Guid DoctorId { get; set; }
    public Doctor? Doctor { get; set; }
    public Guid? AppointmentId { get; set; }
    public DateOnly Date { get; set; }
    public int QueueNumber { get; set; }
    public DateTime CheckedInAt { get; set; }
    public DateTime InitialQueueAt { get; set; }
    public DateTime QueueAt { get; set; }
    public bool IsPriority { get; set; }
    public string? PriorityReason { get; set; }
    public bool IsReturned { get; set; }
    public bool IsFollowUp { get; set; }
    public Guid? FollowUpId { get; set; }
    public int SkipCount { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CalledAt { get; set; }
    public string? CallReason { get; set; }
    public DateTime? FinishedAt { get; set; }
    public VisitStatus Status { get; set; }
    public string? Reason { get; set; }
    public string? CancelReason { get; set; }
    public string? CheckedInByName { get; set; }
    public decimal? Temperature { get; set; }
    public int? Pulse { get; set; }
    public int? BpSystolic { get; set; }
    public int? BpDiastolic { get; set; }
    public decimal? Weight { get; set; }
    public int? Height { get; set; }
    public string? Symptoms { get; set; }
    public string? Examination { get; set; }
    public string? Advice { get; set; }
    public DateOnly? FollowUpDate { get; set; }
    public string? FollowUpNote { get; set; }
    public List<VisitDiagnosis> Diagnoses { get; set; } = [];
    public List<VisitOrder> Orders { get; set; } = [];
    public List<PrescriptionLine> Prescription { get; set; } = [];

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    public void SetCreatedAt(DateTime value) => CreatedAt = value;
}
