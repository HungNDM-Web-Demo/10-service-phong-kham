using System.Text.Json;
using Domain.Enums.Booking;
using Domain.Enums.Clinic;
using Domain.Enums.Finance;

namespace Infrastructure.Persistence.Seeders;

/// <summary>Cấu trúc <c>FE/src/mock/seed/demo-data.json</c> (06 §5.2). Khóa gọn để file nhỏ.</summary>
public sealed class ClinicSeedFile
{
    public List<SeedSpecialty> Specialties { get; init; } = [];
    public List<SeedService> Services { get; init; } = [];
    public List<SeedMedicine> Medicines { get; init; } = [];
    public List<SeedDiagnosis> Diagnoses { get; init; } = [];
    public List<SeedDoctor> Doctors { get; init; } = [];
    public List<SeedDayOff> DaysOff { get; init; } = [];
    public List<SeedPatient> Patients { get; init; } = [];
    public Dictionary<string, SeedTemplate> Templates { get; init; } = [];
    public List<string> Advice { get; init; } = [];
    public List<string> Usages { get; init; } = [];
    public List<string> Results { get; init; } = [];
    public List<string> Phrases { get; init; } = [];
    public List<SeedRecord> Records { get; init; } = [];
    public List<SeedFollowUp> FollowUps { get; init; } = [];
    public List<SeedPlan> Plans { get; init; } = [];
}

public sealed class SeedSpecialty
{
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Exam { get; init; } = string.Empty;
    public int Max { get; init; }
}

public sealed class SeedService
{
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public ServiceGroup Group { get; init; }
    public string? Spec { get; init; }
    public ServiceUnit Unit { get; init; }
    public decimal Price { get; init; }
    public bool? Tooth { get; init; }
}

public sealed class SeedMedicine
{
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Ing { get; init; } = string.Empty;
    public string? Str { get; init; }
    public string? Form { get; init; }
    public string Unit { get; init; } = string.Empty;
    public decimal Price { get; init; }
    public bool? Active { get; init; }
}

public sealed class SeedDiagnosis
{
    public string Icd { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Spec { get; init; }
}

public sealed class SeedDoctor
{
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Title { get; init; }
    public string Spec { get; init; } = string.Empty;
    public string Room { get; init; } = string.Empty;
    public string? Bio { get; init; }
    public string? User { get; init; }
    public int Slot { get; init; }
    public int Max { get; init; }

    /// <summary>[thứ 1–7, phút bắt đầu, phút kết thúc].</summary>
    public List<int[]> Hours { get; init; } = [];
}

public sealed class SeedDayOff
{
    public string Doc { get; init; } = string.Empty;

    /// <summary>Chỉ số ngày tính từ Thứ Hai của tuần hiện tại.</summary>
    public int I { get; init; }

    public DayOffPart Part { get; init; }
    public string Reason { get; init; } = string.Empty;
}

public sealed class SeedPatient
{
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Birth { get; init; }

    /// <summary>Ngày sinh lệch so với hôm nay (ngày, âm), dùng cho bệnh nhân cần đúng tuổi (TC-21).</summary>
    public int? Bdo { get; init; }

    public Gender G { get; init; }
    public string Phone { get; init; } = string.Empty;
    public string? Addr { get; init; }
    public string? Contact { get; init; }
    public string? Allergy { get; init; }
    public string? History { get; init; }

    /// <summary>Ngày tạo hồ sơ theo chỉ số ngày (bệnh nhân thường) hoặc lệch ngày (kịch bản kiểm thử).</summary>
    public int? C { get; init; }

    public int? Cdd { get; init; }
}

public sealed class SeedTemplate
{
    public string Reason { get; init; } = string.Empty;
    public string Sym { get; init; } = string.Empty;
    public string Ex { get; init; } = string.Empty;
    public List<string> Dx { get; init; } = [];
}

/// <summary>Một lịch hẹn (<c>src</c> O, L) hoặc lượt đến trực tiếp (W) (06 §5.3).</summary>
public sealed class SeedRecord
{
    public string K { get; init; } = string.Empty;
    public int? I { get; init; }
    public int? D { get; init; }
    public int? M { get; init; }
    public string Doc { get; init; } = string.Empty;
    public string? P { get; init; }
    public string Src { get; init; } = string.Empty;
    public int? Cd { get; init; }
    public int? Cm { get; init; }
    public int? Conf { get; init; }
    public string? Svc { get; init; }
    public string? Rs { get; init; }
    public string? O { get; init; }
    public AppointmentCancelReason? Cr { get; init; }
    public string? Cn { get; init; }
    public int? Ca { get; init; }
    public int? X { get; init; }
    public SeedVisit? V { get; init; }
    public int? Cim { get; init; }
    public int? Sm { get; init; }
    public int? Fm { get; init; }
    public int? Pd { get; init; }
    public PaymentMethod? Pm { get; init; }
    public int? Part { get; init; }
    public int? Prm { get; init; }
    public string? FuRet { get; init; }
    public int? Free { get; init; }
    public string? PlanVisit { get; init; }

    /// <summary>[họ tên, số điện thoại, năm sinh, giới tính] của khách đặt online chưa có hồ sơ.</summary>
    public List<JsonElement>? Guest { get; init; }

    public string? Fx { get; init; }
    public int? Ago { get; init; }
}

public sealed class SeedVisit
{
    public string T { get; init; } = string.Empty;
    public string? Dxo { get; init; }

    /// <summary>[nhiệt độ, mạch, tâm thu, tâm trương, cân nặng, chiều cao].</summary>
    public List<decimal?>? Vit { get; init; }

    public string? Dx2 { get; init; }

    /// <summary>[mã dịch vụ, răng | null, số lượng, chỉ số kết quả | -1, "kế hoạch#hạng mục"?].</summary>
    public List<List<JsonElement>>? Ord { get; init; }

    /// <summary>[mã thuốc, số lượng, số ngày, chỉ số cách dùng, 1 = mua ngoài?].</summary>
    public List<List<JsonElement>>? Rx { get; init; }

    public int Adv { get; init; }

    /// <summary>[số ngày hẹn tái khám, ghi chú].</summary>
    public List<JsonElement>? Fu { get; init; }
}

public sealed class SeedFollowUp
{
    public string K { get; init; } = string.Empty;
    public string V { get; init; } = string.Empty;
    public string P { get; init; } = string.Empty;
    public string Doc { get; init; } = string.Empty;
    public int? Due { get; init; }
    public int? Dd { get; init; }
    public string? Note { get; init; }
    public List<int>? Sends { get; init; }
    public List<int>? SendsD { get; init; }
    public string? Ret { get; init; }
    public int? Appt { get; init; }

    /// <summary>[kết quả gọi, chỉ số ngày gọi].</summary>
    public List<JsonElement>? Call { get; init; }
}

public sealed class SeedPlan
{
    public string K { get; init; } = string.Empty;
    public string P { get; init; } = string.Empty;
    public string Doc { get; init; } = string.Empty;
    public int I { get; init; }
    public int M { get; init; }
    public string Src { get; init; } = string.Empty;
    public string St { get; init; } = string.Empty;
    public int N { get; init; }
    public string? Note { get; init; }
    public List<SeedPlanItem> Items { get; init; } = [];
    public string? Review { get; init; }

    /// <summary>[lý do hủy, số ngày sau ngày lập].</summary>
    public List<JsonElement>? Cancel { get; init; }
}

public sealed class SeedPlanItem
{
    public string Code { get; init; } = string.Empty;
    public string? Teeth { get; init; }
    public int Qty { get; init; }
    public DiscountType? Dt { get; init; }
    public decimal? Dv { get; init; }
}
