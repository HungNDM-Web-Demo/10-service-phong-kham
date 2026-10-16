using Domain.Base;

namespace Domain.Entities.Clinic.Medicines;

/// <summary>Thuốc bán tại quầy (06 §4 <c>Clinic_Medicines</c>, FR-04). Không quản lý tồn kho.</summary>
public class Medicine : BaseEntity, ICreationTracked, IModificationTracked
{
    public const int CodeMaxLength = 10;
    public const int NameMaxLength = 150;
    public const int IngredientMaxLength = 150;
    public const int ShortTextMaxLength = 50;
    public const int UnitMaxLength = 20;

    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ActiveIngredient { get; set; } = string.Empty;
    public string? Strength { get; set; }
    public string? DosageForm { get; set; }
    public string Unit { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public bool IsActive { get; set; } = true;

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
}
