using Domain.Base;
using Domain.Entities.Clinic.Specialties;

namespace Domain.Entities.Booking.Doctors;

/// <summary>Bác sĩ (06 §4 <c>Booking_Doctors</c>, FR-06): chuyên khoa, phòng, độ dài khung, số lịch tối đa mỗi khung (BR-01).</summary>
public class Doctor : BaseEntity, ICreationTracked, IModificationTracked
{
    public const int CodeMaxLength = 10;
    public const int NameMaxLength = 100;
    public const int TitleMaxLength = 50;
    public const int RoomMaxLength = 20;
    public const int PhotoUrlMaxLength = 500;
    public const int BioMaxLength = 500;

    public string Code { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Title { get; set; }
    public Guid SpecialtyId { get; set; }
    public Specialty? Specialty { get; set; }
    public string Room { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public string? Bio { get; set; }
    public Guid? UserId { get; set; }
    public int SlotMinutes { get; set; } = 30;
    public int MaxPerSlot { get; set; } = 1;
    public bool ShowOnline { get; set; } = true;
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public List<WorkingHour> Hours { get; set; } = [];

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
}
