using Domain.Base;
using Domain.Enums.Clinic;

namespace Domain.Entities.Clinic.Visits;

/// <summary>Chỉ định dịch vụ trong lượt khám (06 §4 <c>Clinic_VisitOrders</c>, FR-23), chụp mã, tên, giá lúc chỉ định.</summary>
public class VisitOrder : BaseEntity, ICreationTracked, IAuditLogExempt
{
    public const int CodeMaxLength = 10;
    public const int NameMaxLength = 150;
    public const int TeethMaxLength = 100;
    public const int ResultMaxLength = 2000;

    public Guid VisitId { get; set; }
    public Guid ServiceId { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public ServiceGroup Group { get; set; }
    public ServiceUnit Unit { get; set; }
    public string? Teeth { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal Discount { get; set; }
    public string? Result { get; set; }
    public string? ImageUrls { get; set; }
    public OrderStatus Status { get; set; }
    public Guid? TreatmentPlanItemId { get; set; }
    public int SortOrder { get; set; }

    public Guid? CreatedBy { get; set; }
}
