using Application.Common.Models;
using Application.DTOs.Clinic;
using Domain.Enums.Booking;
using Domain.Enums.Clinic;

namespace Application.DTOs.Booking;

/// <summary>Lịch hẹn rút gọn (danh sách bị ảnh hưởng, lịch sắp tới của bệnh nhân).</summary>
public sealed class AppointmentBrief
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Date { get; init; } = string.Empty;
    public DateTime StartAt { get; init; }
    public string PatientName { get; init; } = string.Empty;
    public string? PatientPhone { get; init; }
    public string DoctorName { get; init; } = string.Empty;
    public AppointmentStatus Status { get; init; }
}

/// <summary>Thẻ lịch hẹn trên lưới, hàng chờ (07 §5).</summary>
public sealed class AppointmentCardDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public Guid DoctorId { get; init; }
    public string DoctorName { get; init; } = string.Empty;
    public string Date { get; init; } = string.Empty;
    public DateTime StartAt { get; init; }
    public DateTime EndAt { get; init; }
    public AppointmentStatus Status { get; init; }
    public AppointmentSource Source { get; init; }
    public Guid? PatientId { get; init; }
    public string? PatientCode { get; init; }
    public string PatientName { get; init; } = string.Empty;
    public string PatientPhone { get; init; } = string.Empty;
    public bool IsGuest { get; init; }
    public string? ServiceName { get; init; }
    public string? Reason { get; init; }
    public DateTime CreatedAt { get; init; }
}

public sealed class BoardSlotDto
{
    public DateTime StartAt { get; init; }
    public DateTime EndAt { get; init; }
    public int Taken { get; init; }
    public int Max { get; init; }
}

public sealed class BoardDoctorDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string Room { get; init; } = string.Empty;
    public Guid SpecialtyId { get; init; }
    public string SpecialtyName { get; init; } = string.Empty;
    public int SlotMinutes { get; init; }
    public int MaxPerSlot { get; init; }
    public string? OffReason { get; init; }
    public IReadOnlyList<BoardSlotDto> Slots { get; init; } = [];
}

public sealed class BoardDto
{
    public string Date { get; init; } = string.Empty;
    public IReadOnlyList<BoardDoctorDto> Doctors { get; init; } = [];
    public IReadOnlyList<AppointmentCardDto> Appointments { get; init; } = [];
}

public sealed class WeekCellDto
{
    public string Date { get; init; } = string.Empty;
    public int Total { get; init; }
    public int Pending { get; init; }
    public int Capacity { get; init; }
}

public sealed class WeekDoctorDto
{
    public Guid Id { get; init; }
    public string DisplayName { get; init; } = string.Empty;
    public string SpecialtyName { get; init; } = string.Empty;
    public IReadOnlyList<WeekCellDto> Days { get; init; } = [];
}

public sealed class WeekDto
{
    public string Start { get; init; } = string.Empty;
    public IReadOnlyList<WeekDoctorDto> Doctors { get; init; } = [];
}

public sealed class SlotDto
{
    public DateTime StartAt { get; init; }
    public string Time { get; init; } = string.Empty;
    public int Taken { get; init; }
    public int Max { get; init; }
    public bool Available { get; init; }
    public bool Started { get; init; }
}

public sealed class DoctorSlotsDto
{
    public string Date { get; init; } = string.Empty;
    public string? OffReason { get; init; }
    public IReadOnlyList<SlotDto> Slots { get; init; } = [];
}

public sealed class MessageDto
{
    public Guid Id { get; init; }
    public MessageKind Kind { get; init; }
    public MessageChannel Channel { get; init; }
    public string Phone { get; init; } = string.Empty;
    public string Content { get; init; } = string.Empty;
    public DateTime SentAt { get; init; }
}

public sealed class AppointmentDetailDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public Guid DoctorId { get; init; }
    public string DoctorName { get; init; } = string.Empty;
    public string Room { get; init; } = string.Empty;
    public string Date { get; init; } = string.Empty;
    public DateTime StartAt { get; init; }
    public DateTime EndAt { get; init; }
    public AppointmentSource Source { get; init; }
    public AppointmentStatus Status { get; init; }
    public PatientBrief? Patient { get; init; }
    public string? GuestName { get; init; }
    public string? GuestPhone { get; init; }
    public int? GuestBirthYear { get; init; }
    public Gender? GuestGender { get; init; }
    public Guid? ServiceId { get; init; }
    public string? ServiceName { get; init; }
    public string? Reason { get; init; }
    public string? Note { get; init; }
    public AppointmentCancelReason? CancelReason { get; init; }
    public string? CancelNote { get; init; }
    public DateTime CreatedAt { get; init; }
    public string? CreatedByName { get; init; }
    public DateTime? ConfirmedAt { get; init; }
    public string? ConfirmedByName { get; init; }
    public DateTime? CancelledAt { get; init; }
    public string? CancelledByName { get; init; }
    public Guid? VisitId { get; init; }
    public IReadOnlyList<MessageDto> Messages { get; init; } = [];

    /// <summary>Hồ sơ có cùng số điện thoại với lịch online chưa ghép (BR-14, TC-14).</summary>
    public IReadOnlyList<PatientBrief> Suggestions { get; init; } = [];

    public bool CanConfirm { get; init; }
    public bool CanReschedule { get; init; }
    public bool CanCancel { get; init; }
    public bool CanCheckIn { get; init; }
}

public sealed class AppointmentQuery : PaginationQuery
{
    public AppointmentStatus? Status { get; set; }
    public string? From { get; set; }
    public string? To { get; set; }
    public Guid? DoctorId { get; set; }
    public Guid? PatientId { get; set; }
}

/// <summary>Thêm nhanh bệnh nhân khi tạo lịch, xác nhận lịch online, tiếp đón (UC-04 bước 3, UC-05 2a).</summary>
public sealed class NewPatientInput
{
    public string FullName { get; init; } = string.Empty;
    public string Phone { get; init; } = string.Empty;
    public string BirthDate { get; init; } = string.Empty;
    public Gender Gender { get; init; }

    /// <summary>Vẫn tạo khi trùng số điện thoại và ngày sinh (BR-14).</summary>
    public bool Force { get; init; }
}

public sealed class CreateAppointmentRequest
{
    public Guid? PatientId { get; init; }
    public NewPatientInput? NewPatient { get; init; }
    public Guid DoctorId { get; init; }
    public DateTime StartAt { get; init; }
    public Guid? ServiceId { get; init; }
    public string? Reason { get; init; }
    public string? Note { get; init; }
    public Guid? FollowUpId { get; init; }
}

public sealed class RescheduleRequest
{
    public Guid DoctorId { get; init; }
    public DateTime StartAt { get; init; }
}

public sealed class ConfirmAppointmentRequest
{
    public Guid? PatientId { get; init; }
    public NewPatientInput? NewPatient { get; init; }
}

public sealed class CancelAppointmentRequest
{
    public AppointmentCancelReason Reason { get; init; }
    public string? Note { get; init; }
}

public sealed class PendingCountDto
{
    public int Count { get; init; }
}
