using Domain.Enums.Booking;

namespace Application.DTOs.Booking;

/// <summary>Một khoảng làm việc theo thứ (07 §4.2). Giờ dạng <c>HH:mm</c>.</summary>
public sealed class WorkingHourDto
{
    public int DayOfWeek { get; init; }
    public string StartTime { get; init; } = string.Empty;
    public string EndTime { get; init; } = string.Empty;
}

public sealed class DoctorDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string? Title { get; init; }
    public string DisplayName { get; init; } = string.Empty;
    public Guid SpecialtyId { get; init; }
    public string SpecialtyName { get; init; } = string.Empty;
    public string Room { get; init; } = string.Empty;
    public string RoomShort { get; init; } = string.Empty;
    public string? PhotoUrl { get; init; }
    public string? Bio { get; init; }
    public Guid? UserId { get; init; }
    public string? Username { get; init; }
    public int SlotMinutes { get; init; }
    public int MaxPerSlot { get; init; }
    public bool ShowOnline { get; init; }
    public bool IsActive { get; init; }
    public int SortOrder { get; init; }
    public IReadOnlyList<WorkingHourDto> Hours { get; init; } = [];

    /// <summary>Tổng giờ làm mỗi tuần.</summary>
    public decimal WeeklyHours { get; init; }

    /// <summary>Số khung mỗi thứ, Thứ Hai → Chủ nhật.</summary>
    public IReadOnlyList<int> SlotsPerDay { get; init; } = [];
}

public sealed class DoctorOption
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public Guid SpecialtyId { get; init; }
    public string SpecialtyName { get; init; } = string.Empty;
    public string Room { get; init; } = string.Empty;
    public string RoomShort { get; init; } = string.Empty;
    public int SlotMinutes { get; init; }
    public int MaxPerSlot { get; init; }
}

public sealed class SaveDoctorRequest
{
    public string Code { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string? Title { get; init; }
    public Guid SpecialtyId { get; init; }
    public string Room { get; init; } = string.Empty;
    public string? PhotoUrl { get; init; }
    public string? Bio { get; init; }
    public Guid? UserId { get; init; }
    public bool ShowOnline { get; init; } = true;
    public int? SlotMinutes { get; init; }
    public int? MaxPerSlot { get; init; }
}

public sealed class SaveScheduleRequest
{
    public int SlotMinutes { get; init; }
    public int MaxPerSlot { get; init; }
    public List<WorkingHourDto> Hours { get; init; } = [];
}

public sealed class AccountCandidate
{
    public Guid Id { get; init; }
    public string Username { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public Guid? LinkedDoctorId { get; init; }
    public string? LinkedDoctorName { get; init; }
}

public sealed class DayOffDto
{
    public Guid Id { get; init; }
    public Guid DoctorId { get; init; }
    public string DoctorName { get; init; } = string.Empty;
    public string Date { get; init; } = string.Empty;
    public DayOffPart Part { get; init; }
    public string Reason { get; init; } = string.Empty;
}

public sealed class DayOffQuery
{
    public Guid? DoctorId { get; set; }
    public string? From { get; set; }
    public string? To { get; set; }
}

public sealed class CreateDayOffRequest
{
    public Guid DoctorId { get; init; }
    public string Date { get; init; } = string.Empty;
    public DayOffPart Part { get; init; }
    public string Reason { get; init; } = string.Empty;
}

/// <summary>Kết quả thêm ngày nghỉ: lịch hẹn rơi vào phần nghỉ để lễ tân xử lý (UC-02 1a, TC-07).</summary>
public sealed class DayOffResult
{
    public DayOffDto DayOff { get; init; } = new();
    public IReadOnlyList<AppointmentBrief> Affected { get; init; } = [];
}
