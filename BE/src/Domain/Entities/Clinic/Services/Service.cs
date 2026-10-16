using Domain.Base;
using Domain.Enums.Clinic;

namespace Domain.Entities.Clinic.Services;

/// <summary>Dịch vụ khám, thủ thuật, cận lâm sàng (06 §4 <c>Clinic_Services</c>, FR-03).</summary>
public class Service : BaseEntity, ICreationTracked, IModificationTracked
{
    public const int CodeMaxLength = 10;
    public const int NameMaxLength = 150;

    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public ServiceGroup Group { get; set; }
    public Guid? SpecialtyId { get; set; }
    public ServiceUnit Unit { get; set; }
    public decimal Price { get; set; }
    public bool RequiresTooth { get; set; }
    public bool IsActive { get; set; } = true;

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
}
