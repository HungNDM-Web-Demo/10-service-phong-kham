using Domain.Base;
using Domain.Entities.Booking.Doctors;
using Domain.Entities.Clinic.Patients;
using Domain.Enums.Booking;
using Domain.Enums.Clinic;

namespace Domain.Entities.Booking.Appointments;

/// <summary>Lịch hẹn (06 §4 <c>Booking_Appointments</c>). Lịch online chưa ghép hồ sơ có <see cref="PatientId"/> null và thông tin <c>Guest…</c>.</summary>
public class Appointment : BaseEntity, ICreationTracked, IModificationTracked, IAuditLogExempt
{
    public const int CodeMaxLength = 20;
    public const int NameMaxLength = 100;
    public const int PhoneMaxLength = 10;
    public const int ReasonMaxLength = 300;
    public const int NoteMaxLength = 500;
    public const int CancelNoteMaxLength = 300;

    public string Code { get; set; } = string.Empty;
    public Guid DoctorId { get; set; }
    public Doctor? Doctor { get; set; }
    public Guid? PatientId { get; set; }
    public Patient? Patient { get; set; }
    public string? GuestName { get; set; }
    public string? GuestPhone { get; set; }
    public int? GuestBirthYear { get; set; }
    public Gender? GuestGender { get; set; }
    public DateOnly Date { get; set; }
    public DateTime StartAt { get; set; }
    public DateTime EndAt { get; set; }
    public AppointmentSource Source { get; set; }
    public Guid? ServiceId { get; set; }
    public string? Reason { get; set; }
    public string? Note { get; set; }
    public AppointmentStatus Status { get; set; }
    public AppointmentCancelReason? CancelReason { get; set; }
    public string? CancelNote { get; set; }
    public Guid? FollowUpId { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public string? ConfirmedByName { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancelledByName { get; set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    public void SetCreatedAt(DateTime value) => CreatedAt = value;
}
