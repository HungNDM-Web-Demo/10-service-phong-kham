using Domain.Base;
using Domain.Enums.Clinic;

namespace Domain.Entities.Clinic.Patients;

/// <summary>Hồ sơ bệnh nhân (06 §4 <c>Clinic_Patients</c>, FR-19). Dữ liệu demo là dữ liệu giả.</summary>
public class Patient : BaseEntity, ICreationTracked, IModificationTracked
{
    public const int CodeMaxLength = 10;
    public const int NameMaxLength = 100;
    public const int PhoneMaxLength = 10;
    public const int AddressMaxLength = 250;
    public const int ContactMaxLength = 150;
    public const int AllergiesMaxLength = 500;
    public const int HistoryMaxLength = 1000;
    public const int NoteMaxLength = 500;

    public string Code { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public DateOnly BirthDate { get; set; }
    public Gender Gender { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? ContactPerson { get; set; }
    public string? Allergies { get; set; }
    public string? MedicalHistory { get; set; }
    public string? Note { get; set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    public void SetCreatedAt(DateTime value) => CreatedAt = value;
}
