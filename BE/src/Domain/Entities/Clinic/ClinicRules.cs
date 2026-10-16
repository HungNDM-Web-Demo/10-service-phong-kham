using System.Globalization;
using System.Text;
using Domain.Enums.Booking;
using Domain.Enums.Clinic;

namespace Domain.Entities.Clinic;

/// <summary>
/// Hằng số và phép tính thuần của nghiệp vụ Phòng khám (06 §3, 07 §3). FE <c>features/clinic/lib/rules.ts</c> cùng giá trị,
/// cùng câu báo. Giờ trong ngày tính bằng phút từ 00:00 giờ Việt Nam.
/// </summary>
public static class ClinicRules
{
    public static readonly int[] SlotLengths = [15, 20, 30];
    public const int OnlineMinLeadMinutes = 120;
    public const int OnlineMaxDaysAhead = 30;
    public const int OnlineMaxActivePerPhone = 2;
    public const int SelfCancelMinLeadMinutes = 120;
    public const int LateToleranceMinutes = 15;
    public const int PriorityChildAge = 6;
    public const int PriorityElderAge = 75;
    public const int WaitWarnMinutes = 30;
    public const int WaitAlertMinutes = 60;
    public const int MaxSkips = 3;
    public const int MaxSecondaryDiagnoses = 3;
    public const int MaxImages = 5;
    public const int MaxMedicineQuantity = 999;
    public const int MaxMedicineDays = 90;
    public const int MaxOrderQuantity = 99;
    public const int MaxItemDiscountPercent = 50;
    public const int SelfApproveDiscountPercent = 10;
    public const int FollowUpWindowBefore = 3;
    public const int FollowUpWindowAfter = 7;
    public const int DefaultRemindDays = 1;
    public const int MaxReminderSends = 3;
    public const int ReminderGapHours = 24;
    public const int ReminderHour = 18;
    public const int MaxReportDays = 366;
    public const int MaxFollowUpDays = 365;
    public const int NoonMinute = 720;

    public const string AppointmentPrefix = "LH";
    public const string VisitPrefix = "LK";
    public const string InvoicePrefix = "TT";
    public const string ReceiptPrefix = "PT";
    public const string PlanPrefix = "KH";
    public const string PatientPrefix = "BN";

    public const string SystemActorName = "Hệ thống";
    public const string OnlineCreatorName = "Bệnh nhân đặt online";
    public const string FollowUpFreeNote = "Tái khám theo hẹn";
    public const string ChildPriority = "Trẻ dưới 6 tuổi";
    public const string ElderPriority = "Người từ 75 tuổi";
    public const string EndOfDayCancel = "Hết ngày";
    public const string SkipCancel = "Bỏ qua 3 lần";

    public static int IsoDayOfWeek(DateOnly date) => date.DayOfWeek == DayOfWeek.Sunday ? 7 : (int)date.DayOfWeek;

    public static string DocStem(string prefix, DateOnly date) => prefix + date.ToString("yyMMdd", CultureInfo.InvariantCulture);

    /// <summary>Số chữ số cuối mã chứng từ: kế hoạch 3, còn lại 4 (SRS §5.3).</summary>
    public static int DocDigits(string prefix) => prefix == PlanPrefix ? 3 : 4;

    public static string DocCode(string prefix, DateOnly date, int sequence) =>
        DocStem(prefix, date) + sequence.ToString(new string('0', DocDigits(prefix)), CultureInfo.InvariantCulture);

    public static string PatientCode(int number) => PatientPrefix + number.ToString("000000", CultureInfo.InvariantCulture);

    public static string Hhmm(int minute) =>
        $"{((minute % 1440) + 1440) % 1440 / 60:00}:{((minute % 1440) + 1440) % 1440 % 60:00}";

    public static bool TryParseHhmm(string? value, out int minute)
    {
        minute = 0;
        if (value is null || value.Length != 5 || value[2] != ':')
            return false;
        if (!int.TryParse(value.AsSpan(0, 2), out var h) || !int.TryParse(value.AsSpan(3, 2), out var m) || h > 23 || m > 59)
            return false;
        minute = h * 60 + m;
        return true;
    }

    /// <summary>Khung giờ (phút bắt đầu) của các khoảng làm việc trong ngày, bỏ phần nghỉ (BR-01).</summary>
    public static List<int> Slots(IEnumerable<(int Start, int End)> ranges, int slotMinutes, DayOffPart? off)
    {
        if (off == DayOffPart.CaNgay || slotMinutes <= 0)
            return [];
        var list = new List<int>();
        foreach (var (start, end) in ranges)
        {
            for (var t = start; t + slotMinutes <= end; t += slotMinutes)
            {
                if (off == DayOffPart.Sang && t < NoonMinute)
                    continue;
                if (off == DayOffPart.Chieu && t >= NoonMinute)
                    continue;
                list.Add(t);
            }
        }

        list.Sort();
        return list.Distinct().ToList();
    }

    /// <summary>Tuổi tròn năm tính tới ngày <paramref name="on"/>.</summary>
    public static int AgeOn(DateOnly birth, DateOnly on)
    {
        var age = on.Year - birth.Year;
        if (on < birth.AddYears(age))
            age--;
        return Math.Max(0, age);
    }

    /// <summary>Ưu tiên tự động theo tuổi (BR-10).</summary>
    public static string? AutoPriorityReason(DateOnly birth, DateOnly on)
    {
        var age = AgeOn(birth, on);
        return age < PriorityChildAge ? ChildPriority : age >= PriorityElderAge ? ElderPriority : null;
    }

    /// <summary>Nhóm trong thứ tự gọi (BR-09): quay lại từ chờ kết quả, ưu tiên, còn lại.</summary>
    public static int QueueGroup(bool isReturned, bool isPriority) => isReturned ? 0 : isPriority ? 1 : 2;

    public static bool IsValidTooth(int n)
    {
        var quadrant = n / 10;
        var tooth = n % 10;
        return quadrant switch
        {
            >= 1 and <= 4 => tooth is >= 1 and <= 8,
            >= 5 and <= 8 => tooth is >= 1 and <= 5,
            _ => false
        };
    }

    /// <summary>Đọc danh sách số răng FDI "16, 26" (07 §3.6); trả lỗi tiếng Việt khi sai.</summary>
    public static bool TryParseTeeth(string? text, out List<int> teeth, out string? error)
    {
        teeth = [];
        error = null;
        if (string.IsNullOrWhiteSpace(text))
        {
            error = "Chọn vị trí răng";
            return false;
        }

        foreach (var part in text.Split([',', ';', ' '], StringSplitOptions.RemoveEmptyEntries))
        {
            if (!int.TryParse(part, out var n) || !IsValidTooth(n))
            {
                error = $"Số răng {part} không hợp lệ (11–48, răng sữa 51–85)";
                return false;
            }

            if (teeth.Contains(n))
            {
                error = $"Răng {n} bị lặp";
                return false;
            }

            teeth.Add(n);
        }

        teeth.Sort();
        return true;
    }

    public static string FormatTeeth(IEnumerable<int> teeth) => string.Join(",", teeth.OrderBy(t => t));

    /// <summary>"R16, R26" để ghi vào dòng phiếu thanh toán, bản in.</summary>
    public static string TeethLabel(string? teeth) =>
        string.IsNullOrWhiteSpace(teeth) ? string.Empty : string.Join(", ", teeth.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(t => "R" + t.Trim()));

    /// <summary>Bỏ dấu tiếng Việt, chữ thường (so khớp dị ứng, tìm kiếm).</summary>
    public static string Unaccent(string value)
    {
        var normalized = value.Replace('đ', 'd').Replace('Đ', 'D').Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(normalized.Length);
        foreach (var ch in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                sb.Append(ch);
        }

        return sb.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant();
    }

    /// <summary>
    /// Từ khóa dị ứng trùng hoạt chất (BR-19): tách theo dấu phẩy, so khớp không dấu, không phân biệt hoa thường; từ khóa nằm
    /// trong hoạt chất hoặc hoạt chất nằm trong từ khóa. Trả từ khóa gốc.
    /// </summary>
    public static List<string> AllergyMatches(string? allergies, string ingredient)
    {
        if (string.IsNullOrWhiteSpace(allergies) || string.IsNullOrWhiteSpace(ingredient))
            return [];
        var ing = Unaccent(ingredient);
        var parts = ing.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return allergies.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(k =>
            {
                var key = Unaccent(k);
                return key.Length > 0 && (ing.Contains(key, StringComparison.Ordinal) || parts.Any(p => key.Contains(p, StringComparison.Ordinal)));
            })
            .ToList();
    }

    public static decimal Floor1000(decimal value) => Math.Floor(value / 1000m) * 1000m;

    /// <summary>Tiền giảm của hạng mục (BR-22); không kiểm hạn mức.</summary>
    public static decimal ItemDiscount(decimal unitPrice, int quantity, DiscountType? type, decimal value) => type switch
    {
        DiscountType.PhanTram => Floor1000(unitPrice * quantity * value / 100m),
        DiscountType.SoTien => value,
        _ => 0m
    };

    /// <summary>Tỉ lệ giảm (%) làm tròn 1 chữ số.</summary>
    public static decimal DiscountRate(decimal subTotal, decimal discountTotal) =>
        subTotal <= 0 ? 0 : Math.Round(discountTotal * 100m / subTotal, 1, MidpointRounding.AwayFromZero);

    /// <summary>Kế hoạch cần quản lý duyệt khi tổng giảm vượt 10% tổng trước giảm (BR-22).</summary>
    public static bool NeedsApproval(decimal subTotal, decimal discountTotal) => discountTotal * 100m > subTotal * SelfApproveDiscountPercent;

    /// <summary>Tên bác sĩ trong tin nhắn, phiếu: "BS. Nguyễn Minh Khoa".</summary>
    public static string DoctorShort(string fullName) => $"BS. {fullName}";

    /// <summary>Tên kèm học vị trên trang đặt lịch: "ThS. BS. Nguyễn Minh Khoa".</summary>
    public static string DoctorTitled(string? title, string fullName) =>
        string.IsNullOrWhiteSpace(title) ? DoctorShort(fullName) : $"{title.Trim()} {fullName}";

    /// <summary>"Phòng 1" → "P1".</summary>
    public static string RoomShort(string room)
    {
        var digits = new string(room.Where(char.IsDigit).ToArray());
        return digits.Length > 0 ? "P" + digits : room;
    }

    /// <summary>Số thứ tự hiển thị kèm phòng: "P1 - 005" (SRS §5.3).</summary>
    public static string Ticket(string room, int number) => $"{RoomShort(room)} - {number:000}";

    /// <summary>Tên viết tắt cho màn hình sảnh: "Nguyễn V. A" (NFR-03).</summary>
    public static string ShortName(string fullName)
    {
        var parts = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length <= 1)
            return fullName;
        var middle = parts.Skip(1).Take(parts.Length - 2).Select(p => p[..1].ToUpperInvariant() + ".");
        return string.Join(' ', new[] { parts[0] }.Concat(middle).Append(parts[^1][..1].ToUpperInvariant()));
    }

    /// <summary>Che giữa số điện thoại trên trang công khai: "0912***678" (NFR-04).</summary>
    public static string MaskPhone(string phone) => phone.Length < 7 ? phone : $"{phone[..4]}***{phone[^3..]}";

    public static string GenderLabel(Gender gender) => gender == Gender.Nu ? "Nữ" : "Nam";

    public static string ConfirmMessage(string clinic, string code, DateOnly date, int minute, string doctorName, string room) =>
        $"{clinic}: Xác nhận lịch khám {code} lúc {Hhmm(minute)} ngày {date:dd/MM/yyyy} với {DoctorShort(doctorName)}, {room}. Vui lòng đến trước 10 phút.";

    public static string ReminderMessage(string clinic, string code, DateOnly date, int minute, string doctorName, string hotline) =>
        $"{clinic}: Nhắc lịch khám {code} lúc {Hhmm(minute)} ngày mai {date:dd/MM/yyyy} với {DoctorShort(doctorName)}. Gọi {hotline} nếu cần đổi lịch.";

    public static string FollowUpMessage(string clinic, string patientName, DateOnly dueDate, string doctorName, string hotline) =>
        $"{clinic}: {patientName} có lịch tái khám ngày {dueDate:dd/MM/yyyy} với {DoctorShort(doctorName)}. Gọi {hotline} nếu cần đổi lịch.";

    public static string CancelReasonLabel(AppointmentCancelReason reason) => reason switch
    {
        AppointmentCancelReason.BenhNhanBan => "Bệnh nhân bận",
        AppointmentCancelReason.BacSiNghi => "Bác sĩ nghỉ",
        AppointmentCancelReason.DatTrung => "Đặt trùng",
        _ => "Khác"
    };

    public static string VisitStatusLabel(VisitStatus status) => status switch
    {
        VisitStatus.ChoKham => "đang chờ khám",
        VisitStatus.DangKham => "đang khám",
        VisitStatus.ChoKetQua => "đang chờ kết quả",
        VisitStatus.ChoThanhToan => "chờ thanh toán",
        VisitStatus.HoanTat => "đã hoàn tất",
        _ => "đã bỏ về"
    };

    public static string UnitLabel(ServiceUnit unit) => unit switch
    {
        ServiceUnit.Rang => "răng",
        ServiceUnit.Phim => "phim",
        ServiceUnit.Ca => "ca",
        _ => "lần"
    };
}
