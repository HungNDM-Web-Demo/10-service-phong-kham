using Domain.Base;
using Domain.Entities.Booking.Doctors;
using Domain.Entities.Clinic.Patients;
using Domain.Enums.Clinic;

namespace Domain.Entities.Clinic.FollowUps;

/// <summary>Dòng nhắc tái khám (06 §4 <c>Clinic_FollowUps</c>, BR-29, BR-30).</summary>
public class FollowUp : BaseEntity, ICreationTracked, IModificationTracked, IAuditLogExempt
{
    public const int NoteMaxLength = 300;

    public Guid PatientId { get; set; }
    public Patient? Patient { get; set; }
    public Guid DoctorId { get; set; }
    public Doctor? Doctor { get; set; }
    public Guid VisitId { get; set; }
    public DateOnly DueDate { get; set; }
    public string? Note { get; set; }
    public int SendCount { get; set; }
    public DateTime? LastSentAt { get; set; }
    public CallResult? CallResult { get; set; }
    public string? CallNote { get; set; }
    public DateTime? CalledAt { get; set; }
    public Guid? AppointmentId { get; set; }
    public Guid? ReturnedVisitId { get; set; }
    public FollowUpStatus Status { get; set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    public void SetCreatedAt(DateTime value) => CreatedAt = value;
}
