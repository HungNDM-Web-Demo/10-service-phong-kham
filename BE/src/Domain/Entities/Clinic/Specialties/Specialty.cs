using Domain.Base;
using Domain.Entities.Clinic.Services;

namespace Domain.Entities.Clinic.Specialties;

/// <summary>Chuyên khoa (06 §4 <c>Clinic_Specialties</c>): dịch vụ phí khám, số lịch tối đa mỗi khung mặc định (BR-01, BR-20).</summary>
public class Specialty : BaseEntity, ICreationTracked, IModificationTracked
{
    public const int CodeMaxLength = 10;
    public const int NameMaxLength = 100;

    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Guid? ExamServiceId { get; set; }
    public Service? ExamService { get; set; }
    public int DefaultMaxPerSlot { get; set; }
    public int SortOrder { get; set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
}
