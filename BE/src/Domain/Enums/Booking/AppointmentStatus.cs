namespace Domain.Enums.Booking;

/// <summary>Trạng thái lịch hẹn (02-SRS §5.2).</summary>
public enum AppointmentStatus
{
    /// <summary>Chờ xác nhận</summary>
    ChoXacNhan = 0,

    /// <summary>Đã xác nhận</summary>
    DaXacNhan = 1,

    /// <summary>Đã đến: đã tiếp đón</summary>
    DaDen = 2,

    /// <summary>Không đến</summary>
    KhongDen = 3,

    /// <summary>Đã hủy</summary>
    DaHuy = 4
}
