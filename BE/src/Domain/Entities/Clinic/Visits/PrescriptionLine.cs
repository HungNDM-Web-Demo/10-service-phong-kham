using Domain.Base;

namespace Domain.Entities.Clinic.Visits;

/// <summary>Dòng đơn thuốc (06 §4 <c>Clinic_PrescriptionLines</c>, BR-18), chụp tên, giá lúc kê.</summary>
public class PrescriptionLine : BaseEntity, ICreationTracked, IAuditLogExempt
{
    public const int CodeMaxLength = 10;
    public const int NameMaxLength = 150;
    public const int ShortTextMaxLength = 50;
    public const int UsageMaxLength = 200;
    public const int NameByMaxLength = 100;

    public Guid VisitId { get; set; }
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Strength { get; set; }
    public string Unit { get; set; } = string.Empty;
    public string ActiveIngredient { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public int Days { get; set; }
    public string Usage { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public string? AllergyConfirmedByName { get; set; }
    public DateTime? AllergyConfirmedAt { get; set; }
    public int SortOrder { get; set; }

    public Guid? CreatedBy { get; set; }
}
