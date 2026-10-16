namespace Domain.Enums.Clinic;

/// <summary>Kết quả gọi điện nhắc tái khám (FR-37).</summary>
public enum CallResult
{
    /// <summary>Đồng ý đến</summary>
    DongYDen = 0,

    /// <summary>Hẹn ngày khác</summary>
    HenNgayKhac = 1,

    /// <summary>Không liên lạc được</summary>
    KhongLienLacDuoc = 2
}
