using Application.Common.Models;
using Application.DTOs.Clinic;
using Domain.Enums.Booking;

namespace Application.Interfaces.Services.Clinic;

/// <summary>Người thao tác của request: họ tên chụp vào bản ghi, quyền hiệu lực, bác sĩ gắn với tài khoản (BR-32).</summary>
public sealed record ClinicActor(Guid? UserId, string? Username, string FullName, UserAccess Access, Guid? DoctorId)
{
    public bool Has(string permission) => Access.HasPermission(permission);

    public bool IsAdmin => Access.IsSuperAdmin;

    /// <summary>Tài khoản gắn bác sĩ chỉ thấy dữ liệu của bác sĩ đó; quản trị viên thấy tất cả.</summary>
    public Guid? OwnDoctorFilter => IsAdmin ? null : DoctorId;
}

/// <summary>Lịch một bác sĩ trong một ngày: khung (phút bắt đầu), phần nghỉ, số lịch đã đặt mỗi khung.</summary>
public sealed class DoctorDay
{
    public Guid DoctorId { get; init; }
    public string Code { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string? Title { get; init; }
    public Guid SpecialtyId { get; init; }
    public string SpecialtyName { get; init; } = string.Empty;
    public string Room { get; init; } = string.Empty;
    public int SlotMinutes { get; init; }
    public int MaxPerSlot { get; init; }
    public bool ShowOnline { get; init; }
    public bool IsActive { get; init; }
    public int SortOrder { get; init; }
    public DayOffPart? OffPart { get; init; }
    public string? OffReason { get; init; }
    public IReadOnlyList<int> Slots { get; init; } = [];

    /// <summary>Phút bắt đầu khung → số lịch không hủy.</summary>
    public IReadOnlyDictionary<int, int> Taken { get; init; } = new Dictionary<int, int>();

    /// <summary>Số lịch không hủy trong ngày (BR-04).</summary>
    public int DayCount { get; init; }

    /// <summary>Làm việc trong ngày: có khung và không nghỉ cả ngày.</summary>
    public bool Working => IsActive && Slots.Count > 0;

    public int TakenAt(int minute) => Taken.TryGetValue(minute, out var n) ? n : 0;

    public bool HasSlot(int minute) => Slots.Contains(minute);
}

/// <summary>
/// Hỗ trợ chung của nghiệp vụ Phòng khám trong một request: đồng hồ giờ Việt Nam, người thao tác, thông tin phòng khám,
/// mã chứng từ, lịch bác sĩ theo ngày. Lưu tạm trong phạm vi request.
/// </summary>
public interface IClinicContext
{
    /// <summary>Thời điểm hiện tại (UTC), làm tròn xuống tới giây.</summary>
    DateTime UtcNow { get; }

    DateOnly Today { get; }

    /// <summary>Phút hiện tại trong ngày theo giờ Việt Nam.</summary>
    int NowMinute { get; }

    DateTime ToUtc(DateOnly date, int minute);

    (DateOnly Date, int Minute) ToLocal(DateTime utc);

    Task<ClinicActor> GetActorAsync(CancellationToken ct = default);

    /// <summary>Cài đặt <c>Clinic.*</c>, <c>Brand.*</c>.</summary>
    Task<ClinicProfileDto> GetProfileAsync(CancellationToken ct = default);

    Task<string> GetDisplayCodeAsync(CancellationToken ct = default);

    /// <summary>Lịch các bác sĩ (cả bác sĩ ngừng) ngày <paramref name="date"/>, sắp theo thứ tự hiển thị.</summary>
    Task<IReadOnlyList<DoctorDay>> LoadDayAsync(DateOnly date, CancellationToken ct = default);

    /// <summary>Mã chứng từ kế tiếp (<c>LH</c>, <c>LK</c>, <c>TT</c>, <c>PT</c>, <c>KH</c> + yyMMdd + số), kể cả mã đã cấp trong request.</summary>
    Task<string> NextCodeAsync(string prefix, DateOnly date, CancellationToken ct = default);

    /// <summary>Mã bệnh nhân kế tiếp <c>BN</c> + 6 số.</summary>
    Task<string> NextPatientCodeAsync(CancellationToken ct = default);

    /// <summary>Ghi một dòng nhật ký xem nội dung chuyên môn (BR-32, TC-30). Lưu cùng lần SaveChanges kế tiếp.</summary>
    Task LogMedicalViewAsync(Guid patientId, string patientCode, string patientName, string place, CancellationToken ct = default);
}
