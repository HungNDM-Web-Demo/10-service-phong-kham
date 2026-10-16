namespace Domain.Enums.Clinic;

/// <summary>Trạng thái chỉ định (02-SRS §5.1).</summary>
public enum OrderStatus
{
    /// <summary>Chờ thực hiện</summary>
    ChoThucHien = 0,

    /// <summary>Có kết quả</summary>
    CoKetQua = 1,

    /// <summary>Không thực hiện</summary>
    KhongThucHien = 2,

    /// <summary>Đã làm</summary>
    DaLam = 3
}
