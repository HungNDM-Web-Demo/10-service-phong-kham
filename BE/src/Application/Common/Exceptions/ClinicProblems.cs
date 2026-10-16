using Domain.Common;

namespace Application.Common.Exceptions;

/// <summary>Mã lỗi nghiệp vụ (07 §2.2); FE dựa vào trường <c>code</c> của ProblemDetails.</summary>
public static class ClinicErrorCodes
{
    public const string KhungKhongHopLe = "KhungKhongHopLe";
    public const string KhungHetCho = "KhungHetCho";
    public const string QuaSoLichOnline = "QuaSoLichOnline";
    public const string KhongTiepDonHomNay = "KhongTiepDonHomNay";
    public const string BenhNhanDangKham = "BenhNhanDangKham";
    public const string BacSiDangKham = "BacSiDangKham";
    public const string ThieuThongTinKham = "ThieuThongTinKham";
    public const string TrungDiUng = "TrungDiUng";
    public const string TrungHoSo = "TrungHoSo";
    public const string KhongMoLaiDuoc = "KhongMoLaiDuoc";
    public const string ThuThieuTienThuoc = "ThuThieuTienThuoc";
    public const string TongTienDaDoi = "TongTienDaDoi";
    public const string GuiNhacQuaSom = "GuiNhacQuaSom";
    public const string TrangThaiKhongHopLe = "TrangThaiKhongHopLe";
    public const string DaPhatSinh = "DaPhatSinh";
    public const string TamKhoaTraCuu = "TamKhoaTraCuu";
    public const string SaiMaManHinh = "SaiMaManHinh";
}

/// <summary>Tạo exception có <c>code</c> cho ExceptionMiddleware của nền (400 DomainException, 409 ConflictException).</summary>
public static class ClinicProblems
{
    public static ConflictException Conflict(string code, string message, string? field = null, IReadOnlyDictionary<string, object?>? extra = null)
    {
        var extensions = new Dictionary<string, object?> { ["code"] = code };
        if (extra is not null)
        {
            foreach (var (key, value) in extra)
                extensions[key] = value;
        }

        return new ConflictException(message, field, extensions);
    }

    public static DomainException Domain(string code, string message, IReadOnlyDictionary<string, object?>? extra = null)
    {
        var extensions = new Dictionary<string, object?> { ["code"] = code };
        if (extra is not null)
        {
            foreach (var (key, value) in extra)
                extensions[key] = value;
        }

        return new DomainException(message, extensions);
    }

    public static ConflictException InvalidState(string message) => Conflict(ClinicErrorCodes.TrangThaiKhongHopLe, message);

    public static ConflictException InUse(string message) => Conflict(ClinicErrorCodes.DaPhatSinh, message);

    public static DomainException InvalidSlot(string message) => Domain(ClinicErrorCodes.KhungKhongHopLe, message);

    public static ConflictException SlotFull(string message) => Conflict(ClinicErrorCodes.KhungHetCho, message);
}

/// <summary>429 kèm <c>code</c>, <c>retryAfterSeconds</c>. Bộ lọc <c>ClinicProblemAttribute</c> của API trả ProblemDetails.</summary>
public sealed class TooManyRequestsException(string message, string code, int retryAfterSeconds) : Exception(message)
{
    public string Code { get; } = code;
    public int RetryAfterSeconds { get; } = retryAfterSeconds;
}

/// <summary>404 kèm <c>code</c>.</summary>
public sealed class CodedNotFoundException(string message, string code) : NotFoundException(message)
{
    public string Code { get; } = code;
}
