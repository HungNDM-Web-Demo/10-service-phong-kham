namespace Domain.Enums.System.AuditLogs;

/// <summary>Loại thao tác ghi vào nhật ký. Lưu dạng chuỗi trong cột <c>System_AuditLogs.Action</c>.</summary>
public enum AuditAction
{
    Create,
    Update,
    Delete,
    Login,

    /// <summary>Mở xem nội dung chuyên môn của bệnh nhân (dự án Phòng khám, BR-32)</summary>
    View
}
