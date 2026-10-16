using Domain.Base;
using Domain.Enums.Booking;

namespace Domain.Entities.Booking.DaysOff;

/// <summary>Ngày nghỉ đột xuất của bác sĩ (06 §4 <c>Booking_DaysOff</c>).</summary>
public class DayOff : BaseEntity, ICreationTracked, IModificationTracked
{
    public const int ReasonMaxLength = 200;

    public Guid DoctorId { get; set; }
    public DateOnly Date { get; set; }
    public DayOffPart Part { get; set; }
    public string Reason { get; set; } = string.Empty;

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
}
