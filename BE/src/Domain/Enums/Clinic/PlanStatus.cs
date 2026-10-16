namespace Domain.Enums.Clinic;

/// <summary>Trạng thái kế hoạch điều trị (02-SRS §5.2).</summary>
public enum PlanStatus
{
    /// <summary>Nháp</summary>
    Nhap = 0,

    /// <summary>Chờ duyệt giảm giá</summary>
    ChoDuyet = 1,

    /// <summary>Đã báo giá</summary>
    DaBaoGia = 2,

    /// <summary>Đang điều trị</summary>
    DangDieuTri = 3,

    /// <summary>Hoàn thành</summary>
    HoanThanh = 4,

    /// <summary>Đã hủy</summary>
    DaHuy = 5
}
