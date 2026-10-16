using Domain.Base;
using Domain.Enums.Clinic;

namespace Domain.Entities.Clinic.Messages;

/// <summary>Tin nhắn giả lập (06 §4 <c>Clinic_Messages</c>, FR-12, BR-30): chỉ lưu, không gửi ra ngoài.</summary>
public class Message : BaseEntity, ICreationTracked, IAuditLogExempt
{
    public const int PhoneMaxLength = 10;
    public const int ContentMaxLength = 500;

    public MessageKind Kind { get; set; }
    public MessageChannel Channel { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime SentAt { get; set; }
    public Guid? AppointmentId { get; set; }
    public Guid? FollowUpId { get; set; }

    public Guid? CreatedBy { get; set; }
}
