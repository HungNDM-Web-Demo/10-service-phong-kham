using Application.Common.Exceptions;
using Application.Common.Models;
using Application.Common.Time;
using Application.DTOs.Booking;
using Application.DTOs.Clinic;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Clinic;
using Domain.Entities.Booking.Appointments;
using Domain.Entities.Booking.Doctors;
using Domain.Entities.Clinic;
using Domain.Entities.Clinic.FollowUps;
using Domain.Entities.Clinic.Messages;
using Domain.Entities.Clinic.Patients;
using Domain.Entities.Clinic.Services;
using Domain.Entities.Clinic.Visits;
using Domain.Enums.Booking;
using Domain.Enums.Clinic;
using Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Clinic;

/// <summary>Lịch hẹn (UC-04, 07 §3.1, §4.3).</summary>
public sealed class AppointmentService(
    IClinicContext context,
    IGenericRepository<Appointment> appointments,
    IGenericRepository<Doctor> doctors,
    IGenericRepository<Patient> patients,
    IGenericRepository<Service> services,
    IGenericRepository<Visit> visits,
    IGenericRepository<FollowUp> followUps,
    IGenericRepository<Message> messages,
    IUnitOfWork unitOfWork) : IAppointmentService
{
    public async Task<BoardDto> GetBoardAsync(string? date, Guid? specialtyId, CancellationToken ct = default)
    {
        var day = VietnamDates.TryParse(date, out var d) ? d : context.Today;
        var actor = await context.GetActorAsync(ct);
        var list = await appointments.QueryNoTracking().Include(a => a.Patient).Where(a => a.Date == day).ToListAsync(ct);
        var withAppointments = list.Select(a => a.DoctorId).ToHashSet();
        var doctorDays = (await context.LoadDayAsync(day, ct))
            .Where(x => x.IsActive || withAppointments.Contains(x.DoctorId))
            .Where(x => specialtyId is null || x.SpecialtyId == specialtyId)
            .Where(x => actor.OwnDoctorFilter is null || x.DoctorId == actor.OwnDoctorFilter)
            .ToList();
        var ids = doctorDays.Select(x => x.DoctorId).ToHashSet();
        var serviceNames = await ServiceNamesAsync(ct);
        return new BoardDto
        {
            Date = ClinicMappings.Iso(day),
            Doctors = doctorDays.Select(x => new BoardDoctorDto
            {
                Id = x.DoctorId,
                Code = x.Code,
                DisplayName = ClinicRules.DoctorShort(x.FullName),
                Room = x.Room,
                SpecialtyId = x.SpecialtyId,
                SpecialtyName = x.SpecialtyName,
                SlotMinutes = x.SlotMinutes,
                MaxPerSlot = x.MaxPerSlot,
                OffReason = x.OffPart == DayOffPart.CaNgay || (x.Slots.Count == 0 && x.OffReason is not null) ? x.OffReason : x.OffReason is null ? null : $"{x.OffReason} ({PartLabel(x.OffPart)})",
                Slots = x.Slots.Select(m => new BoardSlotDto
                {
                    StartAt = context.ToUtc(day, m),
                    EndAt = context.ToUtc(day, m + x.SlotMinutes),
                    Taken = x.TakenAt(m),
                    Max = x.MaxPerSlot
                }).ToList()
            }).ToList(),
            Appointments = list
                .Where(a => ids.Contains(a.DoctorId))
                .OrderBy(a => a.StartAt).ThenBy(a => a.CreatedAt)
                .Select(a => a.ToCard(ClinicRules.DoctorShort(doctorDays.First(x => x.DoctorId == a.DoctorId).FullName), ServiceName(serviceNames, a.ServiceId)))
                .ToList()
        };
    }

    public async Task<WeekDto> GetWeekAsync(string? start, CancellationToken ct = default)
    {
        var anchor = VietnamDates.TryParse(start, out var s) ? s : context.Today;
        var monday = anchor.AddDays(1 - ClinicRules.IsoDayOfWeek(anchor));
        var actor = await context.GetActorAsync(ct);
        var counts = await appointments.QueryNoTracking()
            .Where(a => a.Date >= monday && a.Date <= monday.AddDays(6) && a.Status != AppointmentStatus.DaHuy)
            .Select(a => new { a.DoctorId, a.Date, a.Status })
            .ToListAsync(ct);
        var days = new List<IReadOnlyList<DoctorDay>>();
        for (var n = 0; n < 7; n++)
            days.Add(await context.LoadDayAsync(monday.AddDays(n), ct));
        var doctorsList = days[0]
            .Where(x => x.IsActive && (actor.OwnDoctorFilter is null || x.DoctorId == actor.OwnDoctorFilter))
            .ToList();
        return new WeekDto
        {
            Start = ClinicMappings.Iso(monday),
            Doctors = doctorsList.Select(x => new WeekDoctorDto
            {
                Id = x.DoctorId,
                DisplayName = ClinicRules.DoctorShort(x.FullName),
                SpecialtyName = x.SpecialtyName,
                Days = Enumerable.Range(0, 7).Select(n =>
                {
                    var date = monday.AddDays(n);
                    var dd = days[n].First(y => y.DoctorId == x.DoctorId);
                    var mine = counts.Where(c => c.DoctorId == x.DoctorId && c.Date == date).ToList();
                    return new WeekCellDto
                    {
                        Date = ClinicMappings.Iso(date),
                        Total = mine.Count,
                        Pending = mine.Count(c => c.Status == AppointmentStatus.ChoXacNhan),
                        Capacity = dd.Slots.Count * dd.MaxPerSlot
                    };
                }).ToList()
            }).ToList()
        };
    }

    public async Task<PaginatedResult<AppointmentCardDto>> GetPagedAsync(AppointmentQuery query, CancellationToken ct = default)
    {
        var actor = await context.GetActorAsync(ct);
        var source = appointments.QueryNoTracking().Include(a => a.Patient).AsQueryable();
        if (actor.OwnDoctorFilter is { } own)
            source = source.Where(a => a.DoctorId == own);
        if (query.Status is { } status)
            source = source.Where(a => a.Status == status);
        if (VietnamDates.TryParse(query.From, out var from))
            source = source.Where(a => a.Date >= from);
        if (VietnamDates.TryParse(query.To, out var to))
            source = source.Where(a => a.Date <= to);
        if (query.DoctorId is { } doctorId)
            source = source.Where(a => a.DoctorId == doctorId);
        if (query.PatientId is { } patientId)
            source = source.Where(a => a.PatientId == patientId);
        if (query.GetSearchTerm() is { } term)
        {
            var pattern = LikePattern.Contains(term);
            source = source.Where(a => AppDbFunctions.Matches(a.Code, pattern)
                                       || AppDbFunctions.Matches(a.GuestName, pattern) || AppDbFunctions.Matches(a.GuestPhone, pattern)
                                       || AppDbFunctions.Matches(a.Patient!.FullName, pattern) || AppDbFunctions.Matches(a.Patient!.Phone, pattern)
                                       || AppDbFunctions.Matches(a.Patient!.Code, pattern));
        }

        if (string.IsNullOrWhiteSpace(query.SortBy))
        {
            query.SortBy = "startAt";
            query.SortDir ??= query.PatientId is null ? "asc" : "desc";
        }

        var page = await source.ApplySorting(query).ToPaginatedResultAsync(query, ct);
        var names = await doctors.QueryNoTracking().ToDictionaryAsync(x => x.Id, x => x.FullName, ct);
        var serviceNames = await ServiceNamesAsync(ct);
        return page.Map(items => items.Select(a => a.ToCard(ClinicRules.DoctorShort(names.GetValueOrDefault(a.DoctorId) ?? string.Empty), ServiceName(serviceNames, a.ServiceId))).ToList());
    }

    public async Task<PendingCountDto> GetPendingCountAsync(CancellationToken ct = default)
    {
        var actor = await context.GetActorAsync(ct);
        var today = context.Today;
        var source = appointments.QueryNoTracking().Where(a => a.Status == AppointmentStatus.ChoXacNhan && a.Date >= today);
        if (actor.OwnDoctorFilter is { } own)
            source = source.Where(a => a.DoctorId == own);
        return new PendingCountDto { Count = await source.CountAsync(ct) };
    }

    public async Task<AppointmentDetailDto> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var a = await appointments.QueryNoTracking().Include(x => x.Patient).Include(x => x.Doctor).FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new NotFoundException("Không tìm thấy lịch hẹn.");
        var actor = await context.GetActorAsync(ct);
        if (actor.OwnDoctorFilter is { } own && a.DoctorId != own)
            throw new NotFoundException("Không tìm thấy lịch hẹn.");
        return await ToDetailAsync(a, ct);
    }

    public async Task<DoctorSlotsDto> GetSlotsAsync(Guid doctorId, string? date, CancellationToken ct = default)
    {
        var day = VietnamDates.TryParse(date, out var d) ? d : context.Today;
        var dd = (await context.LoadDayAsync(day, ct)).FirstOrDefault(x => x.DoctorId == doctorId) ?? throw new NotFoundException("Không tìm thấy bác sĩ.");
        var now = context.UtcNow;
        return new DoctorSlotsDto
        {
            Date = ClinicMappings.Iso(day),
            OffReason = dd.Slots.Count == 0 ? dd.OffReason ?? (dd.IsActive ? "Bác sĩ không làm việc ngày này" : "Bác sĩ đã ngừng") : dd.OffReason,
            Slots = dd.Slots.Select(m =>
            {
                var at = context.ToUtc(day, m);
                var taken = dd.TakenAt(m);
                return new SlotDto
                {
                    StartAt = at,
                    Time = ClinicRules.Hhmm(m),
                    Taken = taken,
                    Max = dd.MaxPerSlot,
                    Started = at <= now,
                    Available = dd.IsActive && at > now && taken < dd.MaxPerSlot
                };
            }).ToList()
        };
    }

    public Task<AppointmentDetailDto> CreateAsync(CreateAppointmentRequest request, CancellationToken ct = default) =>
        ClinicGate.RunAsync(async () =>
        {
            var actor = await context.GetActorAsync(ct);
            var doctor = await doctors.GetByIdAsync(request.DoctorId, ct) ?? throw FieldErrors.Single("doctorId", "Bác sĩ không tồn tại");
            var (date, minute) = await CheckSlotAsync(doctor, request.StartAt, null, ct);
            var patient = request.PatientId is { } patientId
                ? await patients.GetByIdAsync(patientId, ct) ?? throw FieldErrors.Single("patientId", "Bệnh nhân không tồn tại")
                : await ClinicPatients.CreateAsync(context, patients, ClinicPatients.From(request.NewPatient!), request.NewPatient!.Force, "newPatient.", ct);
            if (request.ServiceId is { } serviceId && !await services.AnyAsync(s => s.Id == serviceId && s.IsActive, ct))
                throw FieldErrors.Single("serviceId", "Dịch vụ không còn dùng");

            var now = context.UtcNow;
            var appointment = new Appointment
            {
                Code = await context.NextCodeAsync(ClinicRules.AppointmentPrefix, context.Today, ct),
                DoctorId = doctor.Id,
                PatientId = patient.Id,
                Date = date,
                StartAt = context.ToUtc(date, minute),
                EndAt = context.ToUtc(date, minute + doctor.SlotMinutes),
                Source = AppointmentSource.LeTan,
                ServiceId = request.ServiceId,
                Reason = ClinicPatients.Trim(request.Reason),
                Note = ClinicPatients.Trim(request.Note),
                Status = AppointmentStatus.DaXacNhan,
                CreatedByName = actor.FullName,
                ConfirmedAt = now,
                ConfirmedByName = actor.FullName
            };

            if (request.FollowUpId is { } followUpId)
            {
                var followUp = await followUps.GetByIdAsync(followUpId, ct) ?? throw FieldErrors.Single("followUpId", "Không tìm thấy dòng nhắc");
                if (followUp.Status == FollowUpStatus.DaQuayLai)
                    throw ClinicProblems.InvalidState("Bệnh nhân đã quay lại tái khám.");
                followUp.Status = FollowUpStatus.DaDatLich;
                followUp.AppointmentId = appointment.Id;
                appointment.FollowUpId = followUp.Id;
            }

            await appointments.AddAsync(appointment, ct);
            var profile = await context.GetProfileAsync(ct);
            await messages.AddAsync(ClinicMessages.Confirm(appointment, doctor, profile.Name, patient.Phone, (date, minute), now), ct);
            await unitOfWork.SaveChangesAsync(ct);
            return await GetByIdAsync(appointment.Id, ct);
        }, ct);

    public Task<AppointmentDetailDto> RescheduleAsync(Guid id, RescheduleRequest request, CancellationToken ct = default) =>
        ClinicGate.RunAsync(async () =>
        {
            var appointment = await appointments.Query().Include(a => a.Patient).FirstOrDefaultAsync(a => a.Id == id, ct)
                              ?? throw new NotFoundException("Không tìm thấy lịch hẹn.");
            if (!appointment.Status.IsActive())
                throw ClinicProblems.InvalidState("Chỉ đổi giờ lịch hẹn chưa tiếp đón (BR-06).");
            var doctor = await doctors.GetByIdAsync(request.DoctorId, ct) ?? throw FieldErrors.Single("doctorId", "Bác sĩ không tồn tại");
            var (date, minute) = await CheckSlotAsync(doctor, request.StartAt, appointment, ct);
            appointment.DoctorId = doctor.Id;
            appointment.Date = date;
            appointment.StartAt = context.ToUtc(date, minute);
            appointment.EndAt = context.ToUtc(date, minute + doctor.SlotMinutes);
            if (appointment.Status == AppointmentStatus.DaXacNhan)
            {
                var profile = await context.GetProfileAsync(ct);
                await messages.AddAsync(ClinicMessages.Confirm(appointment, doctor, profile.Name, appointment.PatientPhoneOf(), (date, minute), context.UtcNow), ct);
            }

            await unitOfWork.SaveChangesAsync(ct);
            return await GetByIdAsync(id, ct);
        }, ct);

    public Task<AppointmentDetailDto> ConfirmAsync(Guid id, ConfirmAppointmentRequest request, CancellationToken ct = default) =>
        ClinicGate.RunAsync(async () =>
        {
            var appointment = await appointments.Query().Include(a => a.Patient).Include(a => a.Doctor).FirstOrDefaultAsync(a => a.Id == id, ct)
                              ?? throw new NotFoundException("Không tìm thấy lịch hẹn.");
            if (appointment.Status != AppointmentStatus.ChoXacNhan)
                throw ClinicProblems.InvalidState("Lịch hẹn không ở trạng thái chờ xác nhận.");
            var actor = await context.GetActorAsync(ct);
            var patient = await ResolvePatientAsync(appointment, request.PatientId, request.NewPatient, ct);
            appointment.PatientId = patient.Id;
            appointment.Patient = patient;
            appointment.Status = AppointmentStatus.DaXacNhan;
            appointment.ConfirmedAt = context.UtcNow;
            appointment.ConfirmedByName = actor.FullName;
            var profile = await context.GetProfileAsync(ct);
            await messages.AddAsync(ClinicMessages.Confirm(appointment, appointment.Doctor!, profile.Name, patient.Phone, context.ToLocal(appointment.StartAt), context.UtcNow), ct);
            await unitOfWork.SaveChangesAsync(ct);
            return await GetByIdAsync(id, ct);
        }, ct);

    public async Task<AppointmentDetailDto> CancelAsync(Guid id, CancelAppointmentRequest request, CancellationToken ct = default)
    {
        var appointment = await appointments.GetByIdAsync(id, ct) ?? throw new NotFoundException("Không tìm thấy lịch hẹn.");
        if (!appointment.Status.IsActive())
            throw ClinicProblems.InvalidState("Chỉ hủy lịch hẹn chưa tiếp đón (BR-06).");
        var actor = await context.GetActorAsync(ct);
        appointment.Status = AppointmentStatus.DaHuy;
        appointment.CancelReason = request.Reason;
        appointment.CancelNote = ClinicPatients.Trim(request.Note);
        appointment.CancelledAt = context.UtcNow;
        appointment.CancelledByName = actor.FullName;
        if (appointment.FollowUpId is { } followUpId && await followUps.GetByIdAsync(followUpId, ct) is { Status: FollowUpStatus.DaDatLich } followUp)
        {
            followUp.Status = FollowUpStatus.DaNhac;
            followUp.AppointmentId = null;
        }

        await unitOfWork.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    /// <summary>Hồ sơ cho lịch online chưa ghép (UC-04 1a, TC-14): hồ sơ có sẵn, tạo mới, hoặc hồ sơ đã gắn.</summary>
    internal async Task<Patient> ResolvePatientAsync(Appointment appointment, Guid? patientId, NewPatientInput? newPatient, CancellationToken ct)
    {
        if (patientId is { } pid)
            return await patients.GetByIdAsync(pid, ct) ?? throw FieldErrors.Single("patientId", "Bệnh nhân không tồn tại");
        if (newPatient is not null)
            return await ClinicPatients.CreateAsync(context, patients, ClinicPatients.From(newPatient), newPatient.Force, "newPatient.", ct);
        if (appointment.PatientId is { } existing)
            return appointment.Patient ?? await patients.GetByIdAsync(existing, ct) ?? throw new NotFoundException("Không tìm thấy bệnh nhân.");
        throw FieldErrors.Single("patientId", "Chọn hồ sơ có sẵn hoặc tạo hồ sơ mới cho lịch đặt online");
    }

    /// <summary>07 §3.1: khung của bác sĩ ở ngày đó, chưa bắt đầu, còn trống (không tính chính lịch đang đổi).</summary>
    private async Task<(DateOnly Date, int Minute)> CheckSlotAsync(Doctor doctor, DateTime startAt, Appointment? self, CancellationToken ct)
    {
        if (!doctor.IsActive)
            throw ClinicProblems.InvalidSlot("Bác sĩ đã ngừng nhận lịch.");
        var start = DateTime.SpecifyKind(startAt.Kind == DateTimeKind.Unspecified ? VietnamTime.ToUtc(startAt) : startAt.ToUniversalTime(), DateTimeKind.Utc);
        var (date, minute) = context.ToLocal(start);
        var dd = (await context.LoadDayAsync(date, ct)).First(x => x.DoctorId == doctor.Id);
        if (!dd.HasSlot(minute))
            throw ClinicProblems.InvalidSlot(dd.OffReason is not null && dd.Slots.Count == 0 ? $"Bác sĩ nghỉ ngày {date:dd/MM/yyyy}: {dd.OffReason}" : "Giờ đã chọn không phải khung làm việc của bác sĩ");
        if (start <= context.UtcNow)
            throw ClinicProblems.InvalidSlot("Khung giờ đã bắt đầu");
        var taken = dd.TakenAt(minute);
        if (self is not null && self.DoctorId == doctor.Id && self.StartAt == start)
            taken--;
        if (taken >= dd.MaxPerSlot)
            throw ClinicProblems.SlotFull("Khung đã đủ lịch hẹn");
        return (date, minute);
    }

    private async Task<AppointmentDetailDto> ToDetailAsync(Appointment a, CancellationToken ct)
    {
        var doctor = a.Doctor ?? await doctors.QueryNoTracking().FirstAsync(d => d.Id == a.DoctorId, ct);
        var serviceName = a.ServiceId is { } sid ? await services.QueryNoTracking().Where(s => s.Id == sid).Select(s => s.Name).FirstOrDefaultAsync(ct) : null;
        var visitId = await visits.QueryNoTracking().Where(v => v.AppointmentId == a.Id).Select(v => (Guid?)v.Id).FirstOrDefaultAsync(ct);
        var msgs = await messages.QueryNoTracking().Where(m => m.AppointmentId == a.Id).OrderBy(m => m.SentAt).ToListAsync(ct);
        var today = context.Today;
        var suggestions = new List<PatientBrief>();
        if (a.PatientId is null && !string.IsNullOrWhiteSpace(a.GuestPhone))
        {
            var same = await patients.QueryNoTracking().Where(p => p.Phone == a.GuestPhone).OrderBy(p => p.Code).ToListAsync(ct);
            suggestions = same.Select(p => p.ToBrief(today)).ToList();
        }

        var active = a.Status.IsActive();
        return new AppointmentDetailDto
        {
            Id = a.Id,
            Code = a.Code,
            DoctorId = a.DoctorId,
            DoctorName = doctor.DoctorName(),
            Room = doctor.Room,
            Date = ClinicMappings.Iso(a.Date),
            StartAt = a.StartAt,
            EndAt = a.EndAt,
            Source = a.Source,
            Status = a.Status,
            Patient = a.Patient?.ToBrief(today),
            GuestName = a.GuestName,
            GuestPhone = a.GuestPhone,
            GuestBirthYear = a.GuestBirthYear,
            GuestGender = a.GuestGender,
            ServiceId = a.ServiceId,
            ServiceName = serviceName,
            Reason = a.Reason,
            Note = a.Note,
            CancelReason = a.CancelReason,
            CancelNote = a.CancelNote,
            CreatedAt = a.CreatedAt,
            CreatedByName = a.CreatedByName,
            ConfirmedAt = a.ConfirmedAt,
            ConfirmedByName = a.ConfirmedByName,
            CancelledAt = a.CancelledAt,
            CancelledByName = a.CancelledByName,
            VisitId = visitId,
            Messages = msgs.Select(m => m.ToDto()).ToList(),
            Suggestions = suggestions,
            CanConfirm = a.Status == AppointmentStatus.ChoXacNhan,
            CanReschedule = active,
            CanCancel = active,
            CanCheckIn = active && a.Date == today
        };
    }

    private async Task<Dictionary<Guid, string>> ServiceNamesAsync(CancellationToken ct) =>
        await services.QueryNoTracking().ToDictionaryAsync(s => s.Id, s => s.Name, ct);

    private static string? ServiceName(Dictionary<Guid, string> names, Guid? id) => id is { } x ? names.GetValueOrDefault(x) : null;

    private static string PartLabel(DayOffPart? part) => part switch
    {
        DayOffPart.Sang => "nghỉ sáng",
        DayOffPart.Chieu => "nghỉ chiều",
        _ => "nghỉ cả ngày"
    };
}
