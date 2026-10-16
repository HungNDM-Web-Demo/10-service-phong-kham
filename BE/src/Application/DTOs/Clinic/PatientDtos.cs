using Application.Common.Models;
using Application.DTOs.Booking;
using Domain.Enums.Clinic;

namespace Application.DTOs.Clinic;

/// <summary>Bệnh nhân rút gọn (gợi ý trùng hồ sơ, thẻ lịch, phiếu).</summary>
public sealed class PatientBrief
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string BirthDate { get; init; } = string.Empty;
    public int Age { get; init; }
    public Gender Gender { get; init; }
    public string Phone { get; init; } = string.Empty;
    public string? Allergies { get; init; }
}

public sealed class PatientDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string BirthDate { get; init; } = string.Empty;
    public int Age { get; init; }
    public Gender Gender { get; init; }
    public string Phone { get; init; } = string.Empty;
    public string? Address { get; init; }
    public string? ContactPerson { get; init; }
    public string? Allergies { get; init; }
    public string? MedicalHistory { get; init; }
    public string? Note { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? LastVisitAt { get; init; }
    public int VisitCount { get; init; }
    public decimal Debt { get; init; }
    public bool CanDelete { get; init; }
}

public sealed class PatientDetailDto
{
    public PatientDto Patient { get; init; } = new();
    public IReadOnlyList<AppointmentBrief> UpcomingAppointments { get; init; } = [];
    public int ActivePlanCount { get; init; }
    public int DebtInvoiceCount { get; init; }
}

public sealed class PatientQuery : PaginationQuery
{
    public bool? HasDebt { get; set; }
}

public sealed class DuplicateQuery
{
    public string? Phone { get; set; }
    public string? BirthDate { get; set; }
    public Guid? ExcludeId { get; set; }
}

/// <summary>Trùng hồ sơ (BR-14): cùng số điện thoại và ngày sinh, hoặc chỉ cùng số điện thoại.</summary>
public sealed class DuplicateResultDto
{
    public IReadOnlyList<PatientBrief> Exact { get; init; } = [];
    public IReadOnlyList<PatientBrief> SamePhone { get; init; } = [];
}

public sealed class SavePatientRequest
{
    public string FullName { get; init; } = string.Empty;
    public string BirthDate { get; init; } = string.Empty;
    public Gender Gender { get; init; }
    public string Phone { get; init; } = string.Empty;
    public string? Address { get; init; }
    public string? ContactPerson { get; init; }
    public string? Allergies { get; init; }
    public string? MedicalHistory { get; init; }
    public string? Note { get; init; }

    /// <summary>Vẫn tạo khi trùng số điện thoại và ngày sinh (BR-14, UC-07 E2).</summary>
    public bool Force { get; init; }
}
