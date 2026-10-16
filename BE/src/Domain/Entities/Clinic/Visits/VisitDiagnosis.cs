using Domain.Base;
using Domain.Enums.Clinic;

namespace Domain.Entities.Clinic.Visits;

/// <summary>Chẩn đoán của lượt khám (06 §4 <c>Clinic_VisitDiagnoses</c>).</summary>
public class VisitDiagnosis : BaseEntity, ICreationTracked, IAuditLogExempt
{
    public const int IcdMaxLength = 10;
    public const int NameMaxLength = 200;

    public Guid VisitId { get; set; }
    public DiagnosisKind Kind { get; set; }
    public string? IcdCode { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    public Guid? CreatedBy { get; set; }
}
