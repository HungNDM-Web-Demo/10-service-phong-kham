using System.Text.Json;
using Application.Common.Models;
using Application.Common.Time;
using Application.DTOs.Clinic;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Clinic;
using Application.Interfaces.Services.Common;
using Application.Interfaces.Services.Roles;
using Domain.Entities.Booking.Appointments;
using Domain.Entities.Booking.DaysOff;
using Domain.Entities.Booking.Doctors;
using Domain.Entities.Clinic;
using Domain.Entities.Clinic.Patients;
using Domain.Entities.Clinic.TreatmentPlans;
using Domain.Entities.Clinic.Visits;
using Domain.Entities.Finance.Invoices;
using Domain.Entities.Finance.Receipts;
using Domain.Entities.System.AuditLogs;
using Domain.Entities.System.Settings;
using Domain.Entities.System.Users;
using Domain.Enums.Booking;
using Domain.Enums.System.AuditLogs;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Clinic;

/// <summary>Hỗ trợ chung của nghiệp vụ Phòng khám trong một request (xem <see cref="IClinicContext"/>).</summary>
public sealed class ClinicContext(
    TimeProvider timeProvider,
    ICurrentUserService currentUser,
    IPermissionService permissions,
    IGenericRepository<User> users,
    IGenericRepository<Setting> settings,
    IGenericRepository<Doctor> doctors,
    IGenericRepository<DayOff> daysOff,
    IGenericRepository<Appointment> appointments,
    IGenericRepository<Visit> visits,
    IGenericRepository<Invoice> invoices,
    IGenericRepository<Receipt> receipts,
    IGenericRepository<TreatmentPlan> plans,
    IGenericRepository<Patient> patients,
    IGenericRepository<AuditLog> auditLogs) : IClinicContext
{
    private readonly Dictionary<string, int> _reserved = new(StringComparer.Ordinal);
    private int? _lastPatientNumber;
    private DateTime? _now;
    private ClinicActor? _actor;
    private Dictionary<string, string>? _settings;

    public DateTime UtcNow
    {
        get
        {
            if (_now is null)
            {
                var now = timeProvider.GetUtcNow().UtcDateTime;
                _now = DateTime.SpecifyKind(new DateTime(now.Ticks - now.Ticks % TimeSpan.TicksPerSecond), DateTimeKind.Utc);
            }

            return _now.Value;
        }
    }

    public DateOnly Today => VietnamDates.DateOf(UtcNow);

    public int NowMinute => ToLocal(UtcNow).Minute;

    public DateTime ToUtc(DateOnly date, int minute) => VietnamDates.StartOfDayUtc(date).AddMinutes(minute);

    public (DateOnly Date, int Minute) ToLocal(DateTime utc)
    {
        var date = VietnamDates.DateOf(utc);
        return (date, (int)Math.Floor((DateTime.SpecifyKind(utc, DateTimeKind.Utc) - VietnamDates.StartOfDayUtc(date)).TotalMinutes));
    }

    public async Task<ClinicActor> GetActorAsync(CancellationToken ct = default)
    {
        if (_actor is not null)
            return _actor;

        if (currentUser.UserId is not { } userId)
            return _actor = new ClinicActor(null, null, ClinicRules.SystemActorName, UserAccess.None, null);

        var user = await users.QueryNoTracking().Where(u => u.Id == userId).Select(u => new { u.FullName, u.Username }).FirstOrDefaultAsync(ct);
        var access = await permissions.GetUserAccessAsync(userId, ct);
        var doctorId = await doctors.QueryNoTracking().Where(d => d.UserId == userId).Select(d => (Guid?)d.Id).FirstOrDefaultAsync(ct);
        return _actor = new ClinicActor(userId, user?.Username ?? currentUser.Username, user?.FullName ?? currentUser.Username ?? ClinicRules.SystemActorName, access, doctorId);
    }

    private async Task<Dictionary<string, string>> LoadSettingsAsync(CancellationToken ct)
    {
        return _settings ??= await settings.QueryNoTracking()
            .Where(s => s.Key.StartsWith("Clinic.") || s.Key.StartsWith("Brand.") || s.Key.StartsWith("Company."))
            .ToDictionaryAsync(s => s.Key, s => s.Value, ct);
    }

    public async Task<ClinicProfileDto> GetProfileAsync(CancellationToken ct = default)
    {
        var map = await LoadSettingsAsync(ct);
        string Get(string key, string fallback = "") => map.TryGetValue(key, out var v) && !string.IsNullOrWhiteSpace(v) ? v.Trim() : fallback;
        var remind = int.TryParse(Get("Clinic.FollowUpRemindDays"), out var n) && n is >= 1 and <= 3 ? n : ClinicRules.DefaultRemindDays;
        var reasons = Get("Clinic.PriorityReasons")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        return new ClinicProfileDto(
            Get("Clinic.Name", Get("Brand.AppName", "Phòng khám")),
            Get("Clinic.Address"),
            Get("Clinic.Hotline", Get("Company.Hotline")),
            Get("Clinic.WorkingHours"),
            map.TryGetValue("Brand.LogoUrl", out var logo) && !string.IsNullOrWhiteSpace(logo) ? logo : null,
            Get("Clinic.BankBin"),
            Get("Clinic.BankAccount"),
            Get("Clinic.BankAccountName"),
            reasons,
            remind);
    }

    public async Task<string> GetDisplayCodeAsync(CancellationToken ct = default)
    {
        var map = await LoadSettingsAsync(ct);
        return map.TryGetValue("Clinic.DisplayCode", out var code) ? code.Trim() : string.Empty;
    }

    public async Task<IReadOnlyList<DoctorDay>> LoadDayAsync(DateOnly date, CancellationToken ct = default)
    {
        var isoDay = ClinicRules.IsoDayOfWeek(date);
        var list = await doctors.QueryNoTracking()
            .Include(d => d.Hours)
            .Include(d => d.Specialty)
            .ToListAsync(ct);
        var offs = await daysOff.QueryNoTracking().Where(o => o.Date == date).ToListAsync(ct);
        var taken = await appointments.QueryNoTracking()
            .Where(a => a.Date == date && a.Status != AppointmentStatus.DaHuy)
            .Select(a => new { a.DoctorId, a.StartAt })
            .ToListAsync(ct);
        var dayStart = VietnamDates.StartOfDayUtc(date);

        return list
            .Select(d =>
            {
                var off = offs.FirstOrDefault(o => o.DoctorId == d.Id);
                var mine = taken.Where(t => t.DoctorId == d.Id).ToList();
                return new DoctorDay
                {
                    DoctorId = d.Id,
                    Code = d.Code,
                    FullName = d.FullName,
                    Title = d.Title,
                    SpecialtyId = d.SpecialtyId,
                    SpecialtyName = d.Specialty?.Name ?? string.Empty,
                    Room = d.Room,
                    SlotMinutes = d.SlotMinutes,
                    MaxPerSlot = d.MaxPerSlot,
                    ShowOnline = d.ShowOnline,
                    IsActive = d.IsActive,
                    SortOrder = d.SortOrder,
                    OffPart = off?.Part,
                    OffReason = off?.Reason,
                    Slots = ClinicRules.Slots(d.Hours.Where(h => h.DayOfWeek == isoDay).Select(h => (h.StartMinute, h.EndMinute)), d.SlotMinutes, off?.Part),
                    Taken = mine
                        .GroupBy(t => (int)Math.Round((DateTime.SpecifyKind(t.StartAt, DateTimeKind.Utc) - dayStart).TotalMinutes))
                        .ToDictionary(g => g.Key, g => g.Count()),
                    DayCount = mine.Count
                };
            })
            .OrderBy(d => d.SortOrder).ThenBy(d => d.Code, StringComparer.Ordinal)
            .ToList();
    }

    public async Task<string> NextCodeAsync(string prefix, DateOnly date, CancellationToken ct = default)
    {
        var stem = ClinicRules.DocStem(prefix, date);
        if (!_reserved.TryGetValue(stem, out var last))
        {
            IQueryable<string> codes = prefix switch
            {
                ClinicRules.AppointmentPrefix => appointments.QueryNoTracking().Select(a => a.Code),
                ClinicRules.VisitPrefix => visits.QueryNoTracking().Select(v => v.Code),
                ClinicRules.InvoicePrefix => invoices.QueryNoTracking().Select(i => i.Code),
                ClinicRules.ReceiptPrefix => receipts.QueryNoTracking().Select(r => r.Code),
                ClinicRules.PlanPrefix => plans.QueryNoTracking().Select(p => p.Code),
                _ => throw new ArgumentOutOfRangeException(nameof(prefix), prefix, "Tiền tố mã chứng từ không hợp lệ.")
            };
            var existing = await codes.Where(c => c.StartsWith(stem)).ToListAsync(ct);
            last = existing.Select(c => int.TryParse(c.AsSpan(stem.Length), out var n) ? n : 0).DefaultIfEmpty(0).Max();
        }

        _reserved[stem] = last + 1;
        return ClinicRules.DocCode(prefix, date, last + 1);
    }

    public async Task<string> NextPatientCodeAsync(CancellationToken ct = default)
    {
        if (_lastPatientNumber is null)
        {
            var codes = await patients.QueryNoTracking().Where(p => p.Code.StartsWith(ClinicRules.PatientPrefix)).Select(p => p.Code).ToListAsync(ct);
            _lastPatientNumber = codes
                .Select(c => int.TryParse(c.AsSpan(ClinicRules.PatientPrefix.Length), out var n) ? n : 0)
                .DefaultIfEmpty(0)
                .Max();
        }

        _lastPatientNumber++;
        return ClinicRules.PatientCode(_lastPatientNumber.Value);
    }

    public async Task LogMedicalViewAsync(Guid patientId, string patientCode, string patientName, string place, CancellationToken ct = default)
    {
        var actor = await GetActorAsync(ct);
        var values = JsonSerializer.Serialize(new { code = patientCode, fullName = patientName, place });
        await auditLogs.AddAsync(
            AuditLog.Create(AuditAction.View, ClinicNames.PatientEntity, patientCode, actor.UserId, actor.Username, currentUser.IpAddress, null, values),
            ct);
    }
}

/// <summary>Tên dùng chung (nhật ký, bản ghi).</summary>
internal static class ClinicNames
{
    public const string PatientEntity = "Patient";
}
