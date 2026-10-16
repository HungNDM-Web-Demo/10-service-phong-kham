using Domain.Entities.Booking.Appointments;
using Domain.Entities.Booking.DaysOff;
using Domain.Entities.Booking.Doctors;
using Domain.Entities.Clinic.Diagnoses;
using Domain.Entities.Clinic.FollowUps;
using Domain.Entities.Clinic.Medicines;
using Domain.Entities.Clinic.Messages;
using Domain.Entities.Clinic.Patients;
using Domain.Entities.Clinic.Services;
using Domain.Entities.Clinic.Specialties;
using Domain.Entities.Clinic.TreatmentPlans;
using Domain.Entities.Clinic.Visits;
using Domain.Entities.Finance.Invoices;
using Domain.Entities.Finance.Receipts;
using Domain.Entities.System.Settings;
using Domain.Entities.System.Users;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence.Seeders;

/// <summary>
/// Dữ liệu nghiệp vụ mẫu Phòng khám từ <c>FE/src/mock/seed/demo-data.json</c> (06 §5), dựng bằng <see cref="ClinicSeedBuilder"/>
/// theo giờ hiện tại. FE <c>features/clinic/mock/seed-loader.ts</c> làm giống hệt.
/// </summary>
public sealed class DemoDataSeeder(AppDbContext db, TimeProvider timeProvider) : IDemoDataSeeder
{
    public const string FileName = "demo-data.json";

    public Task<bool> HasDataAsync(CancellationToken ct = default) => db.Set<Specialty>().AnyAsync(ct);

    public async Task SeedAsync(CancellationToken ct = default)
    {
        var seed = SeedJson.Read<ClinicSeedFile>(FileName, timeProvider);
        var users = await db.Set<User>().IgnoreQueryFilters().ToListAsync(ct);
        string NameOf(string username) => users.FirstOrDefault(u => string.Equals(u.Username, username, StringComparison.OrdinalIgnoreCase))?.FullName ?? username;
        var settings = await db.Set<Setting>().Where(s => s.Key.StartsWith("Clinic.")).ToDictionaryAsync(s => s.Key, s => s.Value, ct);
        var ctx = new ClinicSeedContext(
            timeProvider.GetUtcNow().UtcDateTime,
            NameOf("letan"),
            NameOf("quanly"),
            settings.GetValueOrDefault("Clinic.Name") ?? "Phòng khám",
            settings.GetValueOrDefault("Clinic.Hotline") ?? string.Empty,
            users.ToDictionary(u => u.Username, u => u.Id, StringComparer.OrdinalIgnoreCase));
        var data = ClinicSeedBuilder.Build(seed, ctx);

        // Chuyên khoa và dịch vụ trỏ vào nhau: lưu trước không có dịch vụ phí khám, gắn sau.
        var examServices = data.Specialties.ToDictionary(s => s.Id, s => s.ExamServiceId);
        foreach (var s in data.Specialties)
            s.ExamServiceId = null;

        var autoDetect = db.ChangeTracker.AutoDetectChangesEnabled;
        db.ChangeTracker.AutoDetectChangesEnabled = false;
        try
        {
            db.AddRange(data.Specialties);
            db.AddRange(data.Services);
            db.AddRange(data.Medicines);
            db.AddRange(data.Diagnoses);
            db.AddRange(data.Doctors);
            db.AddRange(data.DaysOff);
            db.AddRange(data.Patients);
            db.AddRange(data.Phrases);
            db.AddRange(data.Plans);
            db.AddRange(data.Appointments);
            db.AddRange(data.Visits);
            db.AddRange(data.Invoices);
            db.AddRange(data.Receipts);
            db.AddRange(data.FollowUps);
            db.AddRange(data.Messages);
            await db.SaveChangesAsync(ct);
        }
        finally
        {
            db.ChangeTracker.AutoDetectChangesEnabled = autoDetect;
        }

        foreach (var s in data.Specialties)
            s.ExamServiceId = examServices[s.Id];
        await db.SaveChangesAsync(ct);
        db.ChangeTracker.Clear();
    }

    public async Task ClearAsync(CancellationToken ct = default)
    {
        // Bảng con trước, bảng cha sau (06 §3).
        await db.Set<Message>().ExecuteDeleteAsync(ct);
        await db.Set<FollowUp>().ExecuteDeleteAsync(ct);
        await db.Set<Receipt>().ExecuteDeleteAsync(ct);
        await db.Set<InvoiceLine>().ExecuteDeleteAsync(ct);
        await db.Set<Invoice>().ExecuteDeleteAsync(ct);
        await db.Set<PrescriptionLine>().ExecuteDeleteAsync(ct);
        await db.Set<VisitOrder>().ExecuteDeleteAsync(ct);
        await db.Set<VisitDiagnosis>().ExecuteDeleteAsync(ct);
        await db.Set<Visit>().ExecuteDeleteAsync(ct);
        await db.Set<Appointment>().ExecuteDeleteAsync(ct);
        await db.Set<TreatmentPlanItem>().ExecuteDeleteAsync(ct);
        await db.Set<TreatmentPlan>().ExecuteDeleteAsync(ct);
        await db.Set<UsagePhrase>().ExecuteDeleteAsync(ct);
        await db.Set<Patient>().ExecuteDeleteAsync(ct);
        await db.Set<DayOff>().ExecuteDeleteAsync(ct);
        await db.Set<WorkingHour>().ExecuteDeleteAsync(ct);
        await db.Set<Doctor>().ExecuteDeleteAsync(ct);
        await db.Set<DiagnosisTemplate>().ExecuteDeleteAsync(ct);
        await db.Set<Medicine>().ExecuteDeleteAsync(ct);
        await db.Set<Specialty>().ExecuteUpdateAsync(s => s.SetProperty(x => x.ExamServiceId, (Guid?)null), ct);
        await db.Set<Service>().ExecuteDeleteAsync(ct);
        await db.Set<Specialty>().ExecuteDeleteAsync(ct);
    }
}
