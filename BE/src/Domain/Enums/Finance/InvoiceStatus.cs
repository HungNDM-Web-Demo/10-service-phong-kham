namespace Domain.Enums.Finance;

/// <summary>Trạng thái phiếu thanh toán (02-SRS §5.2).</summary>
public enum InvoiceStatus
{
    /// <summary>Chờ thu</summary>
    ChoThu = 0,

    /// <summary>Thu một phần</summary>
    ThuMotPhan = 1,

    /// <summary>Đã thu đủ</summary>
    DaThuDu = 2,

    /// <summary>Đã hủy: bác sĩ mở lại phiếu khám</summary>
    DaHuy = 3
}
