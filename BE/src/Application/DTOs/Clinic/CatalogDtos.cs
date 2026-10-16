using Application.Common.Models;
using Domain.Enums.Clinic;

namespace Application.DTOs.Clinic;

/// <summary>Chuyên khoa kèm dịch vụ phí khám (07 §4.1).</summary>
public sealed class SpecialtyDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public Guid? ExamServiceId { get; init; }
    public string? ExamServiceName { get; init; }
    public decimal ExamFee { get; init; }
    public int DefaultMaxPerSlot { get; init; }
}

public sealed class ServiceDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public ServiceGroup Group { get; init; }
    public Guid? SpecialtyId { get; init; }
    public string? SpecialtyName { get; init; }
    public ServiceUnit Unit { get; init; }
    public decimal Price { get; init; }
    public bool RequiresTooth { get; init; }
    public bool IsActive { get; init; }
    public bool IsUsed { get; init; }
}

public sealed class ServiceQuery
{
    public ServiceGroup? Group { get; set; }
    public Guid? SpecialtyId { get; set; }
    public string? Search { get; set; }
    public bool? Active { get; set; }
}

public sealed class SaveServiceRequest
{
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public ServiceGroup Group { get; init; }
    public Guid? SpecialtyId { get; init; }
    public ServiceUnit Unit { get; init; }
    public decimal Price { get; init; }
    public bool RequiresTooth { get; init; }
    public bool IsActive { get; init; } = true;
}

public sealed class SetActiveRequest
{
    public bool IsActive { get; init; }
}

public sealed class NextCodeDto
{
    public string Code { get; init; } = string.Empty;
}

public sealed class MedicineDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string ActiveIngredient { get; init; } = string.Empty;
    public string? Strength { get; init; }
    public string? DosageForm { get; init; }
    public string Unit { get; init; } = string.Empty;
    public decimal Price { get; init; }
    public bool IsActive { get; init; }
    public bool IsUsed { get; init; }
}

public sealed class MedicineQuery : PaginationQuery
{
    public bool? Active { get; set; }
}

public sealed class SaveMedicineRequest
{
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string ActiveIngredient { get; init; } = string.Empty;
    public string? Strength { get; init; }
    public string? DosageForm { get; init; }
    public string Unit { get; init; } = string.Empty;
    public decimal Price { get; init; }
    public bool IsActive { get; init; } = true;
}

public sealed class DiagnosisTemplateDto
{
    public Guid Id { get; init; }
    public string IcdCode { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public Guid? SpecialtyId { get; init; }
    public string? SpecialtyName { get; init; }
    public bool IsActive { get; init; }
    public bool IsUsed { get; init; }
}

public sealed class DiagnosisQuery
{
    public string? Search { get; set; }
    public Guid? SpecialtyId { get; set; }
    public bool? Active { get; set; }
}

public sealed class SaveDiagnosisTemplateRequest
{
    public string IcdCode { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public Guid? SpecialtyId { get; init; }
    public bool IsActive { get; init; } = true;
}

/// <summary>Thông tin phòng khám (<c>Clinic.*</c>) cho bản in, QR, trang đặt lịch (07 §4.9).</summary>
public sealed record ClinicProfileDto(
    string Name,
    string Address,
    string Hotline,
    string WorkingHours,
    string? LogoUrl,
    string BankBin,
    string BankAccount,
    string BankAccountName,
    IReadOnlyList<string> PriorityReasons,
    int FollowUpRemindDays);
