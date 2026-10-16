using Domain.Base;
using Domain.Enums.Clinic;

namespace Domain.Entities.Clinic.TreatmentPlans;

/// <summary>Hạng mục kế hoạch điều trị (06 §4 <c>Clinic_TreatmentPlanItems</c>, BR-22, BR-23).</summary>
public class TreatmentPlanItem : BaseEntity, ICreationTracked, IModificationTracked
{
    public const int CodeMaxLength = 10;
    public const int NameMaxLength = 150;
    public const int TeethMaxLength = 100;

    public Guid PlanId { get; set; }
    public Guid ServiceId { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public ServiceUnit Unit { get; set; }
    public string? Teeth { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public DiscountType? DiscountType { get; set; }
    public decimal DiscountValue { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal Amount { get; set; }
    public PlanItemStatus Status { get; set; }
    public DateTime? DoneAt { get; set; }
    public int SortOrder { get; set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
}
