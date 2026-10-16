using Application.Common.Exceptions;
using Application.Common.Time;
using Application.DTOs.Booking;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Clinic;
using Application.Validators.Clinic;
using Domain.Entities.Booking.Appointments;
using Domain.Entities.Booking.Doctors;
using Domain.Entities.Clinic;
using Domain.Entities.Clinic.Specialties;
using Domain.Enums.Booking;
using Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Infrastructure.Implementations.Services.Clinic;

/// <summary>Đặt lịch online công khai (UC-03, UC-16, BR-02 đến BR-05, 07 §3.2, §3.3, §4.4).</summary>
public sealed class PublicBookingService(
    IClinicContext context,
    IGenericRepository<Appointment> appointments,
    IGenericRepository<Doctor> doctors,
    IGenericRepository<Specialty> specialties,
    IMemoryCache cache,
    IUnitOfWork unitOfWork) : IPublicBookingService
{
    private const int LookupMaxFailures = 5;
    private static readonly TimeSpan LookupWindow = TimeSpan.FromMinutes(10);

    public async Task<PublicCatalogDto> GetCatalogAsync(CancellationToken ct = default)
    {
        var profile = await context.GetProfileAsync(ct);
        var list = await doctors.QueryNoTracking().Where(d => d.IsActive && d.ShowOnline).OrderBy(d => d.SortOrder).ThenBy(d => d.Code).ToListAsync(ct);
        var specIds = list.Select(d => d.SpecialtyId).ToHashSet();
        var specs = await specialties.QueryNoTracking().Where(s => specIds.Contains(s.Id)).OrderBy(s => s.SortOrder).ThenBy(s => s.Code).ToListAsync(ct);
        return new PublicCatalogDto
        {
            Clinic = new PublicClinicDto(profile.Name, profile.Address, profile.Hotline, profile.WorkingHours, profile.LogoUrl),
            Specialties = specs.Select(s => new PublicSpecialtyDto(s.Id, s.Name)).ToList(),
            Doctors = list.Select(d => new PublicDoctorDto(d.Id, d.Code, ClinicRules.DoctorTitled(d.Title, d.FullName), d.FullName, d.SpecialtyId, d.Room, d.PhotoUrl, d.Bio)).ToList()
        };
    }

    public async Task<PublicSlotsDto> GetSlotsAsync(PublicSlotsQuery query, CancellationToken ct = default)
    {
        var today = context.Today;
        var date = VietnamDates.TryParse(query.Date, out var d) ? d : today;
        if (date < today)
            date = today;
        var slots = await OnlineSlotsAsync(query.SpecialtyId, query.DoctorId, date, ct);
        string? closed = null;
        string? next = null;
        if (slots.Times.Count == 0 || slots.Times.All(t => !t.Available))
        {
            closed = date > today.AddDays(ClinicRules.OnlineMaxDaysAhead)
                ? $"Chỉ nhận đặt lịch trong {ClinicRules.OnlineMaxDaysAhead} ngày tới"
                : slots.Reason ?? (slots.Times.Count == 0 ? "Không còn khung giờ nhận đặt online trong ngày này" : "Các khung giờ trong ngày đã kín lịch");
            for (var n = 1; n <= ClinicRules.OnlineMaxDaysAhead; n++)
            {
                var candidate = date.AddDays(n);
                if (candidate > today.AddDays(ClinicRules.OnlineMaxDaysAhead))
                    break;
                var other = await OnlineSlotsAsync(query.SpecialtyId, query.DoctorId, candidate, ct);
                if (other.Times.Any(t => t.Available))
                {
                    next = ClinicMappings.Iso(candidate);
                    break;
                }
            }
        }

        return new PublicSlotsDto
        {
            Date = ClinicMappings.Iso(date),
            Slots = slots.Times.Select(t => new PublicSlotDto(context.ToUtc(date, t.Minute), ClinicRules.Hhmm(t.Minute), t.Available)).ToList(),
            ClosedReason = closed,
            NextAvailableDate = next
        };
    }

    public Task<PublicAppointmentDto> BookAsync(PublicBookingRequest request, CancellationToken ct = default) =>
        ClinicGate.RunAsync(async () =>
        {
            var today = context.Today;
            if (request.BirthYear > today.Year)
                throw FieldErrors.Single("birthYear", "Năm sinh không được sau năm nay");
            var phone = ClinicValidationRules.Digits(request.Phone);
            var activeOnline = await appointments.QueryNoTracking().CountAsync(a =>
                a.Source == AppointmentSource.Online && a.GuestPhone == phone
                && (a.Status == AppointmentStatus.ChoXacNhan || a.Status == AppointmentStatus.DaXacNhan), ct);
            if (activeOnline >= ClinicRules.OnlineMaxActivePerPhone)
            {
                var profile0 = await context.GetProfileAsync(ct);
                throw ClinicProblems.Domain(ClinicErrorCodes.QuaSoLichOnline,
                    $"Số điện thoại này đã có {ClinicRules.OnlineMaxActivePerPhone} lịch hẹn sắp tới. Vui lòng gọi {profile0.Hotline} để được hỗ trợ");
            }

            var start = DateTime.SpecifyKind(request.StartAt.Kind == DateTimeKind.Unspecified ? VietnamTime.ToUtc(request.StartAt) : request.StartAt.ToUniversalTime(), DateTimeKind.Utc);
            var (date, minute) = context.ToLocal(start);
            if (date > today.AddDays(ClinicRules.OnlineMaxDaysAhead) || start < context.UtcNow.AddMinutes(ClinicRules.OnlineMinLeadMinutes))
                throw ClinicProblems.InvalidSlot($"Chỉ đặt khung bắt đầu sau ít nhất 2 giờ và trong {ClinicRules.OnlineMaxDaysAhead} ngày tới");

            var day = (await context.LoadDayAsync(date, ct))
                .Where(x => x.IsActive && x.ShowOnline && x.SpecialtyId == request.SpecialtyId && (request.DoctorId is null || x.DoctorId == request.DoctorId))
                .ToList();
            if (request.DoctorId is not null && day.Count == 0)
                throw ClinicProblems.InvalidSlot("Bác sĩ không nhận đặt online");
            var withSlot = day.Where(x => x.HasSlot(minute)).ToList();
            if (withSlot.Count == 0)
                throw ClinicProblems.InvalidSlot("Giờ đã chọn không phải khung làm việc của bác sĩ");
            // BR-04: bác sĩ bất kỳ còn trống khung, ít lịch nhất trong ngày, bằng nhau thì mã nhỏ hơn
            var chosen = withSlot
                .Where(x => x.TakenAt(minute) < x.MaxPerSlot)
                .OrderBy(x => x.DayCount).ThenBy(x => x.Code, StringComparer.Ordinal)
                .FirstOrDefault() ?? throw ClinicProblems.SlotFull("Khung giờ vừa hết chỗ, vui lòng chọn khung khác");

            var appointment = new Appointment
            {
                Code = await context.NextCodeAsync(ClinicRules.AppointmentPrefix, today, ct),
                DoctorId = chosen.DoctorId,
                GuestName = ClinicPatients.NormalizeName(request.FullName),
                GuestPhone = phone,
                GuestBirthYear = request.BirthYear,
                GuestGender = request.Gender,
                Date = date,
                StartAt = context.ToUtc(date, minute),
                EndAt = context.ToUtc(date, minute + chosen.SlotMinutes),
                Source = AppointmentSource.Online,
                Reason = ClinicPatients.Trim(request.Reason),
                Status = AppointmentStatus.ChoXacNhan,
                CreatedByName = ClinicRules.OnlineCreatorName
            };
            await appointments.AddAsync(appointment, ct);
            await unitOfWork.SaveChangesAsync(ct);
            return await ToPublicAsync(appointment.Id, ct);
        }, ct);

    public async Task<PublicAppointmentDto> LookupAsync(PublicLookupRequest request, string clientKey, CancellationToken ct = default)
    {
        var appointment = await FindAsync(request.Code, request.Phone, clientKey, ct);
        return await ToPublicAsync(appointment.Id, ct);
    }

    public async Task<PublicAppointmentDto> CancelAsync(PublicLookupRequest request, string clientKey, CancellationToken ct = default)
    {
        var found = await FindAsync(request.Code, request.Phone, clientKey, ct);
        var appointment = await appointments.GetByIdAsync(found.Id, ct) ?? throw new NotFoundException("Không tìm thấy lịch hẹn.");
        if (!CanSelfCancel(appointment))
        {
            var profile = await context.GetProfileAsync(ct);
            throw ClinicProblems.InvalidState($"Chỉ hủy được lịch chưa tiếp đón, trước giờ hẹn ít nhất 2 giờ. Vui lòng gọi {profile.Hotline}");
        }

        appointment.Status = AppointmentStatus.DaHuy;
        appointment.CancelReason = AppointmentCancelReason.BenhNhanBan;
        appointment.CancelNote = "Bệnh nhân tự hủy trên trang tra cứu";
        appointment.CancelledAt = context.UtcNow;
        appointment.CancelledByName = found.PatientNameOf();
        await unitOfWork.SaveChangesAsync(ct);
        return await ToPublicAsync(appointment.Id, ct);
    }

    private sealed record OnlineDay(List<(int Minute, bool Available)> Times, string? Reason);

    /// <summary>Khung nhận đặt online của một chuyên khoa (hoặc một bác sĩ) trong ngày: gộp theo giờ, còn trống khi ít nhất một bác sĩ còn chỗ.</summary>
    private async Task<OnlineDay> OnlineSlotsAsync(Guid specialtyId, Guid? doctorId, DateOnly date, CancellationToken ct)
    {
        var today = context.Today;
        if (date > today.AddDays(ClinicRules.OnlineMaxDaysAhead))
            return new OnlineDay([], null);
        var earliest = context.UtcNow.AddMinutes(ClinicRules.OnlineMinLeadMinutes);
        var day = (await context.LoadDayAsync(date, ct))
            .Where(x => x.IsActive && x.ShowOnline && x.SpecialtyId == specialtyId && (doctorId is null || x.DoctorId == doctorId))
            .ToList();
        if (day.Count == 0)
            return new OnlineDay([], "Không có bác sĩ nhận đặt online");
        var working = day.Where(x => x.Slots.Count > 0).ToList();
        if (working.Count == 0)
        {
            var off = day.Select(x => x.OffReason).FirstOrDefault(r => r is not null);
            return new OnlineDay([], doctorId is not null && off is not null ? $"Bác sĩ nghỉ ngày này ({off})" : "Bác sĩ không làm việc ngày này");
        }

        var times = working
            .SelectMany(x => x.Slots.Select(m => (Minute: m, Free: x.TakenAt(m) < x.MaxPerSlot)))
            .Where(t => context.ToUtc(date, t.Minute) >= earliest)
            .GroupBy(t => t.Minute)
            .OrderBy(g => g.Key)
            .Select(g => (g.Key, g.Any(t => t.Free)))
            .ToList();
        return new OnlineDay(times, times.Count == 0 ? "Đã hết giờ nhận đặt online trong ngày" : null);
    }

    private bool CanSelfCancel(Appointment a) =>
        a.Status.IsActive() && a.StartAt - context.UtcNow >= TimeSpan.FromMinutes(ClinicRules.SelfCancelMinLeadMinutes);

    /// <summary>Tìm lịch theo mã và số điện thoại; sai 5 lần trong 10 phút thì khóa 10 phút theo thiết bị.</summary>
    private async Task<Appointment> FindAsync(string? code, string? phone, string clientKey, CancellationToken ct)
    {
        var key = $"clinic:lookup:{clientKey}";
        var now = context.UtcNow;
        var state = cache.Get<LookupState>(key) ?? new LookupState();
        if (state.LockedUntil is { } until && until > now)
            throw new TooManyRequestsException("Bạn đã nhập sai 5 lần, vui lòng thử lại sau 10 phút", ClinicErrorCodes.TamKhoaTraCuu,
                (int)Math.Ceiling((until - now).TotalSeconds));

        var normalizedCode = (code ?? string.Empty).Trim().ToUpperInvariant();
        var digits = ClinicValidationRules.Digits(phone ?? string.Empty);
        var appointment = await appointments.QueryNoTracking().Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Code == normalizedCode && (a.GuestPhone == digits || a.Patient!.Phone == digits), ct);
        if (appointment is not null)
        {
            cache.Remove(key);
            return appointment;
        }

        state.Failures.RemoveAll(f => now - f > LookupWindow);
        state.Failures.Add(now);
        if (state.Failures.Count >= LookupMaxFailures)
        {
            state.LockedUntil = now + LookupWindow;
            state.Failures.Clear();
        }

        cache.Set(key, state, LookupWindow + TimeSpan.FromMinutes(1));
        throw new CodedNotFoundException("Không tìm thấy lịch hẹn với mã và số điện thoại này", "KhongTimThay");
    }

    private async Task<PublicAppointmentDto> ToPublicAsync(Guid id, CancellationToken ct)
    {
        var a = await appointments.QueryNoTracking().Include(x => x.Patient).Include(x => x.Doctor!).ThenInclude(d => d.Specialty).FirstAsync(x => x.Id == id, ct);
        var profile = await context.GetProfileAsync(ct);
        return new PublicAppointmentDto
        {
            Code = a.Code,
            Status = a.Status,
            Date = ClinicMappings.Iso(a.Date),
            StartAt = a.StartAt,
            EndAt = a.EndAt,
            DoctorName = ClinicRules.DoctorTitled(a.Doctor!.Title, a.Doctor.FullName),
            SpecialtyName = a.Doctor.Specialty?.Name ?? string.Empty,
            Room = a.Doctor.Room,
            PatientName = a.PatientNameOf(),
            PhoneMasked = ClinicRules.MaskPhone(a.PatientPhoneOf()),
            ClinicName = profile.Name,
            ClinicAddress = profile.Address,
            Hotline = profile.Hotline,
            CanCancel = CanSelfCancel(a)
        };
    }

    private sealed class LookupState
    {
        public List<DateTime> Failures { get; } = [];
        public DateTime? LockedUntil { get; set; }
    }
}
