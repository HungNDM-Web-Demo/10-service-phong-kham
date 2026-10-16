namespace Domain.Enums.Booking;

/// <summary>Phần nghỉ trong ngày (06 §4 Booking_DaysOff).</summary>
public enum DayOffPart
{
    /// <summary>Cả ngày</summary>
    CaNgay = 0,

    /// <summary>Buổi sáng: bỏ khung bắt đầu trước 12:00</summary>
    Sang = 1,

    /// <summary>Buổi chiều: bỏ khung từ 12:00</summary>
    Chieu = 2
}
