namespace Domain.Enums.Clinic;

/// <summary>Trạng thái lượt khám (02-SRS §5.2).</summary>
public enum VisitStatus
{
    /// <summary>Chờ khám</summary>
    ChoKham = 0,

    /// <summary>Đang khám</summary>
    DangKham = 1,

    /// <summary>Chờ kết quả cận lâm sàng</summary>
    ChoKetQua = 2,

    /// <summary>Chờ thanh toán: đã kết thúc khám</summary>
    ChoThanhToan = 3,

    /// <summary>Hoàn tất: có phiếu thu đầu tiên hoặc phải thu 0 ₫</summary>
    HoanTat = 4,

    /// <summary>Bỏ về</summary>
    BoVe = 5
}
