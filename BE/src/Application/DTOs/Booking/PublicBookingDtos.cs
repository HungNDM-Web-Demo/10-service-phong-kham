using Domain.Enums.Booking;
using Domain.Enums.Clinic;

namespace Application.DTOs.Booking;

public sealed record PublicClinicDto(string Name, string Address, string Hotline, string WorkingHours, string? LogoUrl);

public sealed record PublicSpecialtyDto(Guid Id, string Name);

public sealed record PublicDoctorDto(Guid Id, string Code, string DisplayName, string FullName, Guid SpecialtyId, string Room, string? PhotoUrl, string? Bio);

/// <summary>Trang đặt lịch công khai (07 §4.4).</summary>
public sealed class PublicCatalogDto
{
    public PublicClinicDto Clinic { get; init; } = new(string.Empty, string.Empty, string.Empty, string.Empty, null);
    public IReadOnlyList<PublicSpecialtyDto> Specialties { get; init; } = [];
    public IReadOnlyList<PublicDoctorDto> Doctors { get; init; } = [];
}

public sealed class PublicSlotsQuery
{
    public Guid SpecialtyId { get; set; }
    public Guid? DoctorId { get; set; }
    public string? Date { get; set; }
}

public sealed record PublicSlotDto(DateTime StartAt, string Time, bool Available);

public sealed class PublicSlotsDto
{
    public string Date { get; init; } = string.Empty;
    public IReadOnlyList<PublicSlotDto> Slots { get; init; } = [];
    public string? ClosedReason { get; init; }
    public string? NextAvailableDate { get; init; }
}

public sealed class PublicBookingRequest
{
    public Guid SpecialtyId { get; init; }
    public Guid? DoctorId { get; init; }
    public DateTime StartAt { get; init; }
    public string FullName { get; init; } = string.Empty;
    public string Phone { get; init; } = string.Empty;
    public int BirthYear { get; init; }
    public Gender Gender { get; init; }
    public string? Reason { get; init; }
}

public sealed class PublicLookupRequest
{
    public string Code { get; init; } = string.Empty;
    public string Phone { get; init; } = string.Empty;
}

public sealed class PublicAppointmentDto
{
    public string Code { get; init; } = string.Empty;
    public AppointmentStatus Status { get; init; }
    public string Date { get; init; } = string.Empty;
    public DateTime StartAt { get; init; }
    public DateTime EndAt { get; init; }
    public string DoctorName { get; init; } = string.Empty;
    public string SpecialtyName { get; init; } = string.Empty;
    public string Room { get; init; } = string.Empty;
    public string PatientName { get; init; } = string.Empty;
    public string PhoneMasked { get; init; } = string.Empty;
    public string ClinicName { get; init; } = string.Empty;
    public string ClinicAddress { get; init; } = string.Empty;
    public string Hotline { get; init; } = string.Empty;
    public bool CanCancel { get; init; }
}
