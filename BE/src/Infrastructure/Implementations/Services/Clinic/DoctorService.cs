using System.Globalization;
using Application.Common.Exceptions;
using Application.Common.Time;
using Application.Constants;
using Application.DTOs.Booking;
using Application.DTOs.Clinic;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Clinic;
using Infrastructure.Extensions;
using Domain.Entities.Booking.Appointments;
using Domain.Entities.Booking.DaysOff;
using Domain.Entities.Booking.Doctors;
using Domain.Entities.Clinic;
using Domain.Entities.Clinic.FollowUps;
using Domain.Entities.Clinic.Specialties;
using Domain.Entities.Clinic.TreatmentPlans;
using Domain.Entities.Clinic.Visits;
using Domain.Entities.System.Users;
using Domain.Enums.Booking;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Clinic;

/// <summary>Bác sĩ, lịch làm việc, ngày nghỉ (UC-02, 07 §4.2).</summary>
public sealed class DoctorService(
    IClinicContext context,
    IGenericRepository<Doctor> doctors,
    IGenericRepository<WorkingHour> hours,
    IGenericRepository<DayOff> daysOff,
    IGenericRepository<Specialty> specialties,
    IGenericRepository<User> users,
    IGenericRepository<Appointment> appointments,
    IGenericRepository<Visit> visits,
    IGenericRepository<TreatmentPlan> plans,
    IGenericRepository<FollowUp> followUps,
    IUnitOfWork unitOfWork) : IDoctorService
{
    public async Task<IReadOnlyList<DoctorDto>> GetAllAsync(CancellationToken ct = default)
    {
        var list = await doctors.QueryNoTracking().Include(d => d.Hours).Include(d => d.Specialty).ToListAsync(ct);
        var userIds = list.Where(d => d.UserId != null).Select(d => d.UserId!.Value).ToList();
        var names = await users.QueryNoTracking().Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.Username, ct);
        return list
            .OrderBy(d => d.SortOrder).ThenBy(d => d.Code, StringComparer.Ordinal)
            .Select(d => d.ToDto(d.UserId is { } id ? names.GetValueOrDefault(id) : null))
            .ToList();
    }

    public async Task<IReadOnlyList<DoctorOption>> GetOptionsAsync(CancellationToken ct = default)
    {
        var list = await doctors.QueryNoTracking().Include(d => d.Specialty).Where(d => d.IsActive).ToListAsync(ct);
        return list.OrderBy(d => d.SortOrder).ThenBy(d => d.Code, StringComparer.Ordinal).Select(d => d.ToOption()).ToList();
    }

    public async Task<IReadOnlyList<AccountCandidate>> GetAccountCandidatesAsync(CancellationToken ct = default)
    {
        var accounts = await users.QueryNoTracking()
            .Where(u => u.IsActive && u.UserRoles.Any(r => r.Role.Code == ProjectRoleCodes.Doctor))
            .Select(u => new { u.Id, u.Username, u.FullName })
            .ToListAsync(ct);
        var linked = await doctors.QueryNoTracking().Where(d => d.UserId != null).Select(d => new { d.UserId, d.Id, d.FullName }).ToListAsync(ct);
        return accounts
            .OrderBy(a => a.Username, StringComparer.Ordinal)
            .Select(a =>
            {
                var link = linked.FirstOrDefault(l => l.UserId == a.Id);
                return new AccountCandidate
                {
                    Id = a.Id,
                    Username = a.Username,
                    FullName = a.FullName,
                    LinkedDoctorId = link?.Id,
                    LinkedDoctorName = link is null ? null : ClinicRules.DoctorShort(link.FullName)
                };
            })
            .ToList();
    }

    public async Task<NextCodeDto> NextCodeAsync(CancellationToken ct = default)
    {
        var codes = await doctors.QueryNoTracking().Where(d => d.Code.StartsWith("BS")).Select(d => d.Code).ToListAsync(ct);
        var max = codes.Select(c => int.TryParse(c.AsSpan(2), out var n) ? n : 0).DefaultIfEmpty(0).Max();
        return new NextCodeDto { Code = "BS" + (max + 1).ToString("00", CultureInfo.InvariantCulture) };
    }

    public async Task<DoctorDto> CreateAsync(SaveDoctorRequest request, CancellationToken ct = default)
    {
        var code = request.Code.Trim().ToUpperInvariant();
        if (await doctors.AnyAsync(d => d.Code == code, ct))
            throw new ConflictException($"Mã {code} đã có.", "code");
        var specialty = await specialties.GetByIdAsync(request.SpecialtyId, ct) ?? throw new ConflictException("Chuyên khoa không tồn tại.", "specialtyId");
        await EnsureAccountAsync(request.UserId, null, ct);
        var maxOrder = await doctors.QueryNoTracking().Select(d => (int?)d.SortOrder).MaxAsync(ct) ?? 0;
        var doctor = new Doctor
        {
            SlotMinutes = request.SlotMinutes ?? 30,
            MaxPerSlot = request.MaxPerSlot ?? Math.Max(1, specialty.DefaultMaxPerSlot),
            SortOrder = maxOrder + 10,
            IsActive = true
        };
        Apply(doctor, request, code);
        await doctors.AddAsync(doctor, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return await GetDtoAsync(doctor.Id, ct);
    }

    public async Task<DoctorDto> UpdateAsync(Guid id, SaveDoctorRequest request, CancellationToken ct = default)
    {
        var doctor = await doctors.GetByIdAsync(id, ct) ?? throw new NotFoundException("Không tìm thấy bác sĩ.");
        var code = request.Code.Trim().ToUpperInvariant();
        if (await doctors.AnyAsync(d => d.Code == code && d.Id != id, ct))
            throw new ConflictException($"Mã {code} đã có.", "code");
        if (!await specialties.AnyAsync(s => s.Id == request.SpecialtyId, ct))
            throw new ConflictException("Chuyên khoa không tồn tại.", "specialtyId");
        await EnsureAccountAsync(request.UserId, id, ct);
        Apply(doctor, request, code);
        if (request.SlotMinutes is { } slot)
            doctor.SlotMinutes = slot;
        if (request.MaxPerSlot is { } max)
            doctor.MaxPerSlot = max;
        await unitOfWork.SaveChangesAsync(ct);
        return await GetDtoAsync(id, ct);
    }

    public async Task<DoctorDto> SaveScheduleAsync(Guid id, SaveScheduleRequest request, CancellationToken ct = default)
    {
        var doctor = await doctors.GetByIdAsync(id, ct) ?? throw new NotFoundException("Không tìm thấy bác sĩ.");
        doctor.SlotMinutes = request.SlotMinutes;
        doctor.MaxPerSlot = request.MaxPerSlot;
        var old = await hours.Query().Where(h => h.DoctorId == id).ToListAsync(ct);
        hours.DeleteRange(old);
        var fresh = request.Hours
            .Select(h => new WorkingHour
            {
                DoctorId = id,
                DayOfWeek = h.DayOfWeek,
                StartMinute = ClinicRules.TryParseHhmm(h.StartTime, out var s) ? s : 0,
                EndMinute = ClinicRules.TryParseHhmm(h.EndTime, out var e) ? e : 0
            })
            .OrderBy(h => h.DayOfWeek).ThenBy(h => h.StartMinute)
            .ToList();
        await hours.AddRangeAsync(fresh, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return await GetDtoAsync(id, ct);
    }

    public async Task<DoctorDto> SetActiveAsync(Guid id, bool isActive, CancellationToken ct = default)
    {
        var doctor = await doctors.GetByIdAsync(id, ct) ?? throw new NotFoundException("Không tìm thấy bác sĩ.");
        doctor.IsActive = isActive;
        await unitOfWork.SaveChangesAsync(ct);
        return await GetDtoAsync(id, ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var doctor = await doctors.GetByIdAsync(id, ct) ?? throw new NotFoundException("Không tìm thấy bác sĩ.");
        if (await appointments.AnyAsync(a => a.DoctorId == id, ct) || await visits.AnyAsync(v => v.DoctorId == id, ct)
            || await plans.AnyAsync(p => p.DoctorId == id, ct) || await followUps.AnyAsync(f => f.DoctorId == id, ct))
            throw ClinicProblems.InUse("Bác sĩ đã có lịch hẹn hoặc lượt khám. Hãy chọn \"Ngừng\".");
        hours.DeleteRange(await hours.Query().Where(h => h.DoctorId == id).ToListAsync(ct));
        daysOff.DeleteRange(await daysOff.Query().Where(o => o.DoctorId == id).ToListAsync(ct));
        doctors.Delete(doctor);
        await unitOfWork.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<DayOffDto>> GetDaysOffAsync(DayOffQuery query, CancellationToken ct = default)
    {
        var from = VietnamDates.TryParse(query.From, out var f) ? f : context.Today.AddDays(-30);
        var source = daysOff.QueryNoTracking().Where(o => o.Date >= from);
        if (VietnamDates.TryParse(query.To, out var to))
            source = source.Where(o => o.Date <= to);
        if (query.DoctorId is { } doctorId)
            source = source.Where(o => o.DoctorId == doctorId);
        var list = await source.OrderBy(o => o.Date).ToListAsync(ct);
        var names = await doctors.QueryNoTracking().ToDictionaryAsync(d => d.Id, d => d.FullName, ct);
        return list.Select(o => ToDto(o, names.GetValueOrDefault(o.DoctorId) ?? string.Empty)).ToList();
    }

    public async Task<DayOffResult> CreateDayOffAsync(CreateDayOffRequest request, CancellationToken ct = default)
    {
        var doctor = await doctors.GetByIdAsync(request.DoctorId, ct) ?? throw new NotFoundException("Không tìm thấy bác sĩ.");
        VietnamDates.TryParse(request.Date, out var date);
        if (date < context.Today)
            throw FieldErrors.Single("date", "Ngày nghỉ phải từ hôm nay trở đi");
        var existing = await daysOff.Query().FirstOrDefaultAsync(o => o.DoctorId == doctor.Id && o.Date == date, ct);
        if (existing is not null)
            throw new ConflictException($"Bác sĩ đã có ngày nghỉ {date:dd/MM/yyyy}.", "date");

        var dayOff = new DayOff { DoctorId = doctor.Id, Date = date, Part = request.Part, Reason = request.Reason.Trim() };
        await daysOff.AddAsync(dayOff, ct);
        await unitOfWork.SaveChangesAsync(ct);

        var noon = context.ToUtc(date, ClinicRules.NoonMinute);
        var affected = await appointments.QueryNoTracking()
            .Include(a => a.Patient)
            .Where(a => a.DoctorId == doctor.Id && a.Date == date
                        && (a.Status == AppointmentStatus.ChoXacNhan || a.Status == AppointmentStatus.DaXacNhan))
            .OrderBy(a => a.StartAt)
            .ToListAsync(ct);
        affected = request.Part switch
        {
            DayOffPart.Sang => affected.Where(a => a.StartAt < noon).ToList(),
            DayOffPart.Chieu => affected.Where(a => a.StartAt >= noon).ToList(),
            _ => affected
        };
        return new DayOffResult
        {
            DayOff = ToDto(dayOff, doctor.FullName),
            Affected = affected.Select(a => a.ToBrief(doctor.DoctorName())).ToList()
        };
    }

    public async Task DeleteDayOffAsync(Guid id, CancellationToken ct = default)
    {
        var dayOff = await daysOff.GetByIdAsync(id, ct) ?? throw new NotFoundException("Không tìm thấy ngày nghỉ.");
        daysOff.Delete(dayOff);
        await unitOfWork.SaveChangesAsync(ct);
    }

    private static void Apply(Doctor doctor, SaveDoctorRequest request, string code)
    {
        doctor.Code = code;
        doctor.FullName = request.FullName.Trim();
        doctor.Title = string.IsNullOrWhiteSpace(request.Title) ? null : request.Title.Trim();
        doctor.SpecialtyId = request.SpecialtyId;
        doctor.Room = request.Room.Trim();
        doctor.PhotoUrl = string.IsNullOrWhiteSpace(request.PhotoUrl) ? null : request.PhotoUrl.Trim();
        doctor.Bio = string.IsNullOrWhiteSpace(request.Bio) ? null : request.Bio.Trim();
        doctor.UserId = request.UserId;
        doctor.ShowOnline = request.ShowOnline;
    }

    /// <summary>UC-02 E3: tài khoản đã gắn bác sĩ khác.</summary>
    private async Task EnsureAccountAsync(Guid? userId, Guid? doctorId, CancellationToken ct)
    {
        if (userId is not { } id)
            return;
        if (!await users.AnyAsync(u => u.Id == id, ct))
            throw new ConflictException("Tài khoản không tồn tại.", "userId");
        var other = await doctors.QueryNoTracking().Where(d => d.UserId == id && d.Id != doctorId).Select(d => d.FullName).FirstOrDefaultAsync(ct);
        if (other is not null)
            throw new ConflictException($"Tài khoản đã gắn với {ClinicRules.DoctorShort(other)}.", "userId");
    }

    private async Task<DoctorDto> GetDtoAsync(Guid id, CancellationToken ct)
    {
        var doctor = await doctors.QueryNoTracking().Include(d => d.Hours).Include(d => d.Specialty).FirstAsync(d => d.Id == id, ct);
        var username = doctor.UserId is { } userId ? await users.QueryNoTracking().Where(u => u.Id == userId).Select(u => u.Username).FirstOrDefaultAsync(ct) : null;
        return doctor.ToDto(username);
    }

    private static DayOffDto ToDto(DayOff o, string doctorName) => new()
    {
        Id = o.Id,
        DoctorId = o.DoctorId,
        DoctorName = ClinicRules.DoctorShort(doctorName),
        Date = ClinicMappings.Iso(o.Date),
        Part = o.Part,
        Reason = o.Reason
    };
}
