namespace Domain.Enums.Finance;

/// <summary>Phương thức thu tiền (FR-32).</summary>
public enum PaymentMethod
{
    /// <summary>Tiền mặt</summary>
    TienMat = 0,

    /// <summary>Chuyển khoản (QR giả lập)</summary>
    ChuyenKhoan = 1,

    /// <summary>Thẻ</summary>
    The = 2
}
