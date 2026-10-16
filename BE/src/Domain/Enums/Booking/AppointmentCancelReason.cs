namespace Domain.Enums.Booking;

/// <summary>Lý do hủy lịch hẹn (BR-06).</summary>
public enum AppointmentCancelReason
{
    /// <summary>Bệnh nhân bận</summary>
    BenhNhanBan = 0,

    /// <summary>Bác sĩ nghỉ</summary>
    BacSiNghi = 1,

    /// <summary>Đặt trùng</summary>
    DatTrung = 2,

    /// <summary>Khác</summary>
    Khac = 3
}
