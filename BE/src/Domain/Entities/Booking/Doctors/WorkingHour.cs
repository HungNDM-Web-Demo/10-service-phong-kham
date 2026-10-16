using Domain.Base;

namespace Domain.Entities.Booking.Doctors;

/// <summary>Khoảng làm việc lặp theo tuần (06 §4 <c>Booking_WorkingHours</c>, FR-07). 1 = Thứ Hai … 7 = Chủ nhật.</summary>
public class WorkingHour : BaseEntity, ICreationTracked, IModificationTracked
{
    public Guid DoctorId { get; set; }
    public int DayOfWeek { get; set; }
    public int StartMinute { get; set; }
    public int EndMinute { get; set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
}
