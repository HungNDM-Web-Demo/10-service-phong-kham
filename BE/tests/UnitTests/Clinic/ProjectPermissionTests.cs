using System.Reflection;
using System.Text.RegularExpressions;
using Application.Constants;
using Infrastructure.Persistence.Seeders;

namespace UnitTests.Clinic;

/// <summary>
/// Mã quyền nghiệp vụ (07 §1) khai báo đủ ba nơi: <see cref="ProjectPermissions"/>, FE/src/mock/seed/project.json (qua
/// <see cref="SystemSeedData"/>) và FE src/config/permissions.ts; vai trò mặc định đúng bảng phân quyền 07 §1.
/// </summary>
public sealed partial class ProjectPermissionTests
{
    private static readonly IReadOnlyList<string> Codes = typeof(ProjectPermissions)
        .GetNestedTypes(BindingFlags.Public | BindingFlags.Static)
        .SelectMany(t => t.GetFields(BindingFlags.Public | BindingFlags.Static))
        .Where(f => f is { IsLiteral: true } && f.FieldType == typeof(string))
        .Select(f => (string)f.GetRawConstantValue()!)
        .ToList();

    [Fact]
    public void Ma_quyen_co_trong_seed()
    {
        var seeded = SystemSeedData.Embedded.Permissions.Select(p => p.Code).ToHashSet();
        Assert.All(Codes, c => Assert.Contains(c, seeded));
        Assert.Equal(36, Codes.Count);
        Assert.Equal(Codes.Order(), ProjectPermissions.All.Order());
    }

    [Fact]
    public void Ma_quyen_co_trong_permissions_ts()
    {
        var file = Path.Combine(FindRepoRoot(), "FE", "src", "config", "permissions.ts");
        var text = File.ReadAllText(file);
        var declared = QuotedCode().Matches(text).Select(m => m.Groups[1].Value).ToHashSet();
        Assert.All(Codes, c => Assert.Contains(c, declared));
    }

    [Fact]
    public void Le_tan_khong_xem_noi_dung_chuyen_mon_khong_huy_phieu_thu()
    {
        var receptionist = Permissions(ProjectRoleCodes.Receptionist);
        Assert.Contains(ProjectPermissions.QueueTickets.Create, receptionist);
        Assert.Contains(ProjectPermissions.Invoices.Collect, receptionist);
        Assert.DoesNotContain(ProjectPermissions.MedicalRecords.View, receptionist);
        Assert.DoesNotContain(ProjectPermissions.Invoices.Cancel, receptionist);
        Assert.DoesNotContain(ProjectPermissions.Reports.View, receptionist);
        Assert.DoesNotContain(ProjectPermissions.QueueTickets.Call, receptionist);
        Assert.DoesNotContain("dashboard.view", receptionist);
    }

    [Fact]
    public void Bac_si_kham_ke_don_khong_thu_tien()
    {
        var doctor = Permissions(ProjectRoleCodes.Doctor);
        Assert.Contains(ProjectPermissions.Visits.Examine, doctor);
        Assert.Contains(ProjectPermissions.MedicalRecords.View, doctor);
        Assert.Contains(ProjectPermissions.QueueTickets.Call, doctor);
        Assert.Contains(ProjectPermissions.TreatmentPlans.Create, doctor);
        Assert.DoesNotContain(ProjectPermissions.TreatmentPlans.Approve, doctor);
        Assert.DoesNotContain(ProjectPermissions.Invoices.View, doctor);
        Assert.DoesNotContain(ProjectPermissions.Appointments.Create, doctor);
    }

    [Fact]
    public void Quan_ly_duyet_giam_gia_khong_kham()
    {
        var manager = Permissions(RoleCodes.Manager);
        Assert.Contains(ProjectPermissions.TreatmentPlans.Approve, manager);
        Assert.Contains(ProjectPermissions.Invoices.Cancel, manager);
        Assert.Contains(ProjectPermissions.Reports.View, manager);
        Assert.DoesNotContain(ProjectPermissions.Visits.Examine, manager);
        Assert.DoesNotContain(ProjectPermissions.MedicalRecords.View, manager);
    }

    private static IReadOnlyList<string> Permissions(string role) =>
        SystemSeedData.Embedded.Roles.Single(r => r.Code == role).Permissions;

    private static string FindRepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !Directory.Exists(Path.Combine(dir.FullName, "FE", "src")))
            dir = dir.Parent;
        return dir?.FullName ?? throw new DirectoryNotFoundException("Không tìm thấy thư mục dự án chứa FE/src.");
    }

    [GeneratedRegex(@"'([a-z\-]+\.[a-z\-]+)'")]
    private static partial Regex QuotedCode();
}
