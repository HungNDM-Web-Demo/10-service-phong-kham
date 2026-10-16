namespace Domain.Enums.Clinic;

/// <summary>Trạng thái dòng nhắc tái khám (02-SRS §5.2).</summary>
public enum FollowUpStatus
{
    /// <summary>Chờ nhắc</summary>
    ChoNhac = 0,

    /// <summary>Đã nhắc</summary>
    DaNhac = 1,

    /// <summary>Đã đặt lịch</summary>
    DaDatLich = 2,

    /// <summary>Đã quay lại</summary>
    DaQuayLai = 3,

    /// <summary>Quá hạn</summary>
    QuaHan = 4
}
