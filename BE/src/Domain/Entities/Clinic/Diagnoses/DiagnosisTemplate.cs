using Domain.Base;

namespace Domain.Entities.Clinic.Diagnoses;

/// <summary>Chẩn đoán mẫu có mã ICD-10 để bác sĩ chọn nhanh (06 §4 <c>Clinic_DiagnosisTemplates</c>, FR-05).</summary>
public class DiagnosisTemplate : BaseEntity, ICreationTracked, IModificationTracked
{
    public const int IcdMaxLength = 10;
    public const int NameMaxLength = 200;

    public string IcdCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Guid? SpecialtyId { get; set; }
    public bool IsActive { get; set; } = true;

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
}
