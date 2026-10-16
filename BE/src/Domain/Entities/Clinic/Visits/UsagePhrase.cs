using Domain.Base;

namespace Domain.Entities.Clinic.Visits;

/// <summary>Câu mẫu cách dùng thuốc của một tài khoản (UC-09 3a).</summary>
public class UsagePhrase : BaseEntity, ICreationTracked, IAuditLogExempt
{
    public const int TextMaxLength = 200;

    public Guid UserId { get; set; }
    public string Text { get; set; } = string.Empty;

    public Guid? CreatedBy { get; set; }
}
