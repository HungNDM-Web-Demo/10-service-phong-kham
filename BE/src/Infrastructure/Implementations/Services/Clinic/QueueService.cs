using Application.Common.Exceptions;
using Application.DTOs.Booking;
using Application.DTOs.Clinic;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Clinic;
using Domain.Entities.Booking.Appointments;
using Domain.Entities.Booking.Doctors;
using Domain.Entities.Clinic;
using Domain.Entities.Clinic.FollowUps;
using Domain.Entities.Clinic.Patients;
using Domain.Entities.Clinic.Services;
using Domain.Entities.Clinic.Visits;
using Domain.Enums.Booking;
using Domain.Enums.Clinic;
using Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Clinic;

/// <summary>Tiếp đón, hàng chờ, màn hình sảnh (UC-05, UC-06, 07 §3.4, §3.5, §4.5).</summary>
public sealed class QueueService(
    IClinicContext context,
    IGenericRepository<Visit> visits,
    IGenericRepository<Appointment> appointments,
    IGenericRepository<Doctor> doctors,
    IGenericRepository<Patient> patients,
    IGenericRepository<Service> services,
    IGenericRepository<FollowUp> followUps,
    IUnitOfWork unitOfWork) : IQueueService
{
    public async Task<QueueTodayDto> GetTodayAsync(CancellationToken ct = default)
    {
        var today = context.Today;
        var now = context.UtcNow;
        var actor = await context.GetActorAsync(ct);
        var own = actor.OwnDoctorFilter;
        var day = await context.LoadDayAsync(today, ct);
        var todayVisits = await visits.QueryNoTracking().Include(v => v.Patient).Where(v => v.Date == today).ToListAsync(ct);
        var appts = await appointments.QueryNoTracking().Include(a => a.Patient).Where(a => a.Date == today).ToListAsync(ct);
        var checkedIn = todayVisits.Where(v => v.AppointmentId != null).Select(v => v.AppointmentId!.Value).ToHashSet();
        var startMap = appts.ToDictionary(a => a.Id, a => a.StartAt);
        var doctorMap = await doctors.QueryNoTracking().ToDictionaryAsync(d => d.Id, ct);
        var serviceNames = await services.QueryNoTracking().ToDictionaryAsync(s => s.Id, s => s.Name, ct);
        var visitDoctors = todayVisits.Select(v => v.DoctorId).ToHashSet();

        QueueVisitDto Map(Visit v) => v.ToQueueDto(v.Patient!, doctorMap[v.DoctorId], v.AppointmentId is { } aid ? startMap.GetValueOrDefault(aid) : null, now, today);

        return new QueueTodayDto
        {
            Date = ClinicMappings.Iso(today),
            MyDoctorId = actor.DoctorId,
            PendingAppointments = appts
                .Where(a => a.Status.IsActive() && !checkedIn.Contains(a.Id) && (own is null || a.DoctorId == own))
                .OrderBy(a => a.StartAt).ThenBy(a => a.CreatedAt)
                .Select(a => a.ToCard(doctorMap[a.DoctorId].DoctorName(), a.ServiceId is { } sid ? serviceNames.GetValueOrDefault(sid) : null))
                .ToList(),
            Doctors = day
                .Where(x => (x.IsActive && x.Slots.Count > 0) || visitDoctors.Contains(x.DoctorId))
                .Where(x => own is null || x.DoctorId == own)
                .Select(x =>
                {
                    var mine = todayVisits.Where(v => v.DoctorId == x.DoctorId).ToList();
                    var started = mine.Where(v => v.StartedAt != null).ToList();
                    return new QueueDoctorDto
                    {
                        Id = x.DoctorId,
                        Code = x.Code,
                        DisplayName = ClinicRules.DoctorShort(x.FullName),
                        Room = x.Room,
                        RoomShort = ClinicRules.RoomShort(x.Room),
                        SpecialtyName = x.SpecialtyName,
                        Working = x.Working,
                        OffReason = x.OffReason,
                        Current = mine.Where(v => v.Status == VisitStatus.DangKham).Select(Map).FirstOrDefault(),
                        Waiting = mine.Where(v => v.Status == VisitStatus.ChoKham).InCallOrder().Select(Map).ToList(),
                        Awaiting = mine.Where(v => v.Status == VisitStatus.ChoKetQua).OrderBy(v => v.QueueNumber).Select(Map).ToList(),
                        DoneCount = mine.Count(v => v.Status is VisitStatus.ChoThanhToan or VisitStatus.HoanTat),
                        AvgWaitMinutes = started.Count == 0 ? null : (int)Math.Round(started.Average(v => v.WaitMinutes(now)))
                    };
                })
                .ToList()
        };
    }

    public async Task<CheckInPreviewDto> PreviewCheckInAsync(CheckInPreviewQuery query, CancellationToken ct = default)
    {
        var today = context.Today;
        var now = context.UtcNow;
        Appointment? appointment = null;
        if (query.AppointmentId is { } aid)
            appointment = await appointments.QueryNoTracking().Include(a => a.Patient).FirstOrDefaultAsync(a => a.Id == aid, ct) ?? throw new NotFoundException("Không tìm thấy lịch hẹn.");
        var patientId = query.PatientId ?? appointment?.PatientId;
        var patient = patientId is { } pid ? await patients.QueryNoTracking().FirstOrDefaultAsync(p => p.Id == pid, ct) : null;
        var doctorId = query.DoctorId ?? appointment?.DoctorId;
        var day = await context.LoadDayAsync(today, ct);
        var dd = doctorId is { } did ? day.FirstOrDefault(x => x.DoctorId == did) : null;

        OpenVisitBrief? open = null;
        FollowUpBrief? followUp = null;
        if (patient is not null)
        {
            var openVisit = await visits.QueryNoTracking().Include(v => v.Doctor)
                .Where(v => v.PatientId == patient.Id && (v.Status == VisitStatus.ChoKham || v.Status == VisitStatus.DangKham || v.Status == VisitStatus.ChoKetQua))
                .FirstOrDefaultAsync(ct);
            if (openVisit is not null)
            {
                open = new OpenVisitBrief
                {
                    Id = openVisit.Id,
                    Code = openVisit.Code,
                    Ticket = ClinicRules.Ticket(openVisit.Doctor!.Room, openVisit.QueueNumber),
                    DoctorName = openVisit.Doctor.DoctorName(),
                    Status = openVisit.Status
                };
            }

            if (doctorId is { } fdid && await FindFollowUpAsync(patient.Id, fdid, today, false, ct) is { } fu)
                followUp = new FollowUpBrief { Id = fu.Id, DueDate = ClinicMappings.Iso(fu.DueDate), DoctorName = dd is null ? string.Empty : ClinicRules.DoctorShort(dd.FullName), Note = fu.Note };
        }

        var autoReason = patient is null ? null : ClinicRules.AutoPriorityReason(patient.BirthDate, today);
        var waitingAhead = 0;
        if (doctorId is { } wdid)
        {
            var queueAt = appointment is not null && now <= appointment.StartAt.AddMinutes(ClinicRules.LateToleranceMinutes) ? appointment.StartAt : now;
            waitingAhead = await CountAheadAsync(wdid, today, ClinicRules.QueueGroup(false, autoReason is not null), queueAt, int.MaxValue, ct);
        }

        return new CheckInPreviewDto
        {
            Patient = patient?.ToBrief(today),
            AutoPriority = autoReason is not null,
            AutoPriorityReason = autoReason,
            FollowUp = followUp,
            OpenVisit = open,
            DoctorWorking = dd?.Working ?? false,
            WaitingAhead = waitingAhead,
            LateForAppointment = appointment is not null && now > appointment.StartAt.AddMinutes(ClinicRules.LateToleranceMinutes)
        };
    }

    public Task<CheckInResultDto> CheckInAsync(CheckInRequest request, CancellationToken ct = default) =>
        ClinicGate.RunAsync(async () =>
        {
            var today = context.Today;
            var now = context.UtcNow;
            var actor = await context.GetActorAsync(ct);

            // 1. Lịch hẹn: còn hiệu lực, đúng hôm nay (BR-07)
            Appointment? appointment = null;
            if (request.AppointmentId is { } aid)
            {
                appointment = await appointments.Query().Include(a => a.Patient).FirstOrDefaultAsync(a => a.Id == aid, ct) ?? throw new NotFoundException("Không tìm thấy lịch hẹn.");
                if (!appointment.Status.IsActive())
                    throw ClinicProblems.InvalidState("Lịch hẹn đã tiếp đón, đã hủy hoặc không đến.");
                if (appointment.Date != today)
                    throw ClinicProblems.Domain(ClinicErrorCodes.KhongTiepDonHomNay, $"Lịch hẹn ngày {appointment.Date:dd/MM/yyyy}, không tiếp đón hôm nay");
            }

            Patient patient;
            if (request.PatientId is { } pid)
                patient = await patients.GetByIdAsync(pid, ct) ?? throw FieldErrors.Single("patientId", "Bệnh nhân không tồn tại");
            else if (request.NewPatient is not null)
                patient = await ClinicPatients.CreateAsync(context, patients, ClinicPatients.From(request.NewPatient), request.NewPatient.Force, "newPatient.", ct);
            else if (appointment?.PatientId is { } apid)
                patient = appointment.Patient ?? await patients.GetByIdAsync(apid, ct) ?? throw new NotFoundException("Không tìm thấy bệnh nhân.");
            else
                throw FieldErrors.Single("patientId", "Chọn hồ sơ có sẵn hoặc tạo hồ sơ mới cho lịch đặt online");

            // 2. Bác sĩ làm việc hôm nay
            var doctor = await doctors.GetByIdAsync(request.DoctorId, ct) ?? throw FieldErrors.Single("doctorId", "Bác sĩ không tồn tại");
            var dd = (await context.LoadDayAsync(today, ct)).First(x => x.DoctorId == doctor.Id);
            if (!dd.Working)
                throw FieldErrors.Single("doctorId", $"{doctor.DoctorName()} không làm việc hôm nay");

            // 3. Một lượt chưa kết thúc mỗi bệnh nhân (BR-07)
            var openVisit = await visits.QueryNoTracking().Include(v => v.Doctor)
                .Where(v => v.PatientId == patient.Id && (v.Status == VisitStatus.ChoKham || v.Status == VisitStatus.DangKham || v.Status == VisitStatus.ChoKetQua))
                .FirstOrDefaultAsync(ct);
            if (openVisit is not null)
            {
                throw ClinicProblems.Conflict(ClinicErrorCodes.BenhNhanDangKham,
                    $"Bệnh nhân {ClinicRules.VisitStatusLabel(openVisit.Status)} với {openVisit.Doctor!.DoctorName()}, STT {openVisit.QueueNumber:000}",
                    null, new Dictionary<string, object?> { ["visitId"] = openVisit.Id });
            }

            // 4. Ưu tiên (BR-10)
            var autoReason = ClinicRules.AutoPriorityReason(patient.BirthDate, today);
            var manualReason = request.IsPriority ? ClinicPatients.Trim(request.PriorityReason) : null;
            if (request.IsPriority && autoReason is null && manualReason is null)
                throw FieldErrors.Single("priorityReason", "Chọn đối tượng ưu tiên");
            var priorityReason = autoReason ?? manualReason;

            // 5. Tái khám theo hẹn (BR-20, BR-29)
            var followUp = await FindFollowUpAsync(patient.Id, doctor.Id, today, true, ct);

            // 6. Số thứ tự, giờ xếp hàng (BR-08, BR-09)
            var queueNumber = (await visits.QueryNoTracking().Where(v => v.DoctorId == doctor.Id && v.Date == today).Select(v => (int?)v.QueueNumber).MaxAsync(ct) ?? 0) + 1;
            var queueAt = appointment is not null && now <= appointment.StartAt.AddMinutes(ClinicRules.LateToleranceMinutes) ? appointment.StartAt : now;
            var visit = new Visit
            {
                Code = await context.NextCodeAsync(ClinicRules.VisitPrefix, today, ct),
                PatientId = patient.Id,
                DoctorId = doctor.Id,
                AppointmentId = appointment?.Id,
                Date = today,
                QueueNumber = queueNumber,
                CheckedInAt = now,
                InitialQueueAt = queueAt,
                QueueAt = queueAt,
                IsPriority = priorityReason is not null,
                PriorityReason = priorityReason,
                IsFollowUp = followUp is not null,
                FollowUpId = followUp?.Id,
                Status = VisitStatus.ChoKham,
                Reason = ClinicPatients.Trim(request.Reason) ?? appointment?.Reason,
                CheckedInByName = actor.FullName
            };
            await visits.AddAsync(visit, ct);

            if (appointment is not null)
            {
                if (appointment.Status == AppointmentStatus.ChoXacNhan)
                {
                    appointment.ConfirmedAt = now;
                    appointment.ConfirmedByName = actor.FullName;
                }

                appointment.Status = AppointmentStatus.DaDen;
                appointment.PatientId = patient.Id;
            }

            if (followUp is not null)
            {
                followUp.Status = FollowUpStatus.DaQuayLai;
                followUp.ReturnedVisitId = visit.Id;
            }

            var ahead = await CountAheadAsync(doctor.Id, today, ClinicRules.QueueGroup(false, visit.IsPriority), queueAt, queueNumber, ct);
            await unitOfWork.SaveChangesAsync(ct);
            return new CheckInResultDto
            {
                Visit = visit.ToQueueDto(patient, doctor, appointment?.StartAt, now, today),
                WaitingAhead = ahead,
                Room = doctor.Room
            };
        }, ct);

    public Task<CallNextResultDto> CallNextAsync(CallNextRequest request, CancellationToken ct = default) =>
        ClinicGate.RunAsync(async () =>
        {
            var actor = await context.GetActorAsync(ct);
            var doctorId = actor.DoctorId ?? request.DoctorId ?? throw FieldErrors.Single("doctorId", "Chọn bác sĩ");
            var today = context.Today;
            await EnsureDoctorFreeAsync(doctorId, today, null, ct);
            var waiting = await visits.Query().Where(v => v.DoctorId == doctorId && v.Date == today && v.Status == VisitStatus.ChoKham).ToListAsync(ct);
            var next = waiting.InCallOrder().FirstOrDefault();
            if (next is null)
                return new CallNextResultDto();
            Start(next, null);
            await unitOfWork.SaveChangesAsync(ct);
            return new CallNextResultDto { Visit = await MapAsync(next.Id, ct) };
        }, ct);

    public Task<QueueVisitDto> CallAsync(Guid visitId, CallVisitRequest request, CancellationToken ct = default) =>
        ClinicGate.RunAsync(async () =>
        {
            var visit = await LoadOwnAsync(visitId, ct);
            if (visit.Status != VisitStatus.ChoKham)
                throw ClinicProblems.InvalidState("Chỉ gọi lượt đang chờ khám.");
            await EnsureDoctorFreeAsync(visit.DoctorId, visit.Date, visit.Id, ct);
            Start(visit, request.Reason.Trim());
            await unitOfWork.SaveChangesAsync(ct);
            return await MapAsync(visit.Id, ct);
        }, ct);

    public async Task<QueueVisitDto> RecallAsync(Guid visitId, CancellationToken ct = default)
    {
        var visit = await LoadOwnAsync(visitId, ct);
        if (visit.Status != VisitStatus.DangKham)
            throw ClinicProblems.InvalidState("Chỉ gọi lại lượt đang khám.");
        visit.CalledAt = context.UtcNow;
        await unitOfWork.SaveChangesAsync(ct);
        return await MapAsync(visit.Id, ct);
    }

    /// <summary>BR-11: về cuối nhóm; lần thứ 3 thì bỏ về.</summary>
    public async Task<QueueVisitDto> SkipAsync(Guid visitId, CancellationToken ct = default)
    {
        var visit = await LoadOwnAsync(visitId, ct);
        if (visit.Status != VisitStatus.DangKham)
            throw ClinicProblems.InvalidState("Chỉ bỏ qua lượt đang khám.");
        visit.SkipCount++;
        if (visit.SkipCount >= ClinicRules.MaxSkips)
        {
            visit.Status = VisitStatus.BoVe;
            visit.CancelReason = ClinicRules.SkipCancel;
        }
        else
        {
            visit.Status = VisitStatus.ChoKham;
            visit.QueueAt = context.UtcNow;
            visit.StartedAt = null;
            visit.CalledAt = null;
            visit.CallReason = null;
        }

        await unitOfWork.SaveChangesAsync(ct);
        return await MapAsync(visit.Id, ct);
    }

    public async Task<QueueVisitDto> AwaitResultsAsync(Guid visitId, CancellationToken ct = default)
    {
        var visit = await LoadOwnAsync(visitId, ct);
        if (visit.Status != VisitStatus.DangKham)
            throw ClinicProblems.InvalidState("Chỉ chuyển chờ kết quả với lượt đang khám.");
        visit.Status = VisitStatus.ChoKetQua;
        await unitOfWork.SaveChangesAsync(ct);
        return await MapAsync(visit.Id, ct);
    }

    public async Task<QueueVisitDto> ReturnedAsync(Guid visitId, CancellationToken ct = default)
    {
        var visit = await visits.GetByIdAsync(visitId, ct) ?? throw new NotFoundException("Không tìm thấy lượt khám.");
        if (visit.Status != VisitStatus.ChoKetQua)
            throw ClinicProblems.InvalidState("Lượt không ở trạng thái chờ kết quả.");
        visit.Status = VisitStatus.ChoKham;
        visit.IsReturned = true;
        visit.QueueAt = context.UtcNow;
        await unitOfWork.SaveChangesAsync(ct);
        return await MapAsync(visit.Id, ct);
    }

    public Task<QueueVisitDto> TransferAsync(Guid visitId, TransferVisitRequest request, CancellationToken ct = default) =>
        ClinicGate.RunAsync(async () =>
        {
            var visit = await visits.GetByIdAsync(visitId, ct) ?? throw new NotFoundException("Không tìm thấy lượt khám.");
            if (visit.Status != VisitStatus.ChoKham)
                throw ClinicProblems.InvalidState("Chỉ chuyển bác sĩ cho lượt đang chờ khám.");
            if (visit.DoctorId == request.DoctorId)
                throw FieldErrors.Single("doctorId", "Chọn bác sĩ khác");
            var today = context.Today;
            var doctor = await doctors.GetByIdAsync(request.DoctorId, ct) ?? throw FieldErrors.Single("doctorId", "Bác sĩ không tồn tại");
            var dd = (await context.LoadDayAsync(today, ct)).First(x => x.DoctorId == doctor.Id);
            if (!dd.Working)
                throw FieldErrors.Single("doctorId", $"{doctor.DoctorName()} không làm việc hôm nay");
            visit.DoctorId = doctor.Id;
            visit.QueueNumber = (await visits.QueryNoTracking().Where(v => v.DoctorId == doctor.Id && v.Date == today).Select(v => (int?)v.QueueNumber).MaxAsync(ct) ?? 0) + 1;
            visit.QueueAt = context.UtcNow;
            await unitOfWork.SaveChangesAsync(ct);
            return await MapAsync(visit.Id, ct);
        }, ct);

    public async Task<QueueVisitDto> CancelAsync(Guid visitId, ReasonRequest request, CancellationToken ct = default)
    {
        var visit = await visits.GetByIdAsync(visitId, ct) ?? throw new NotFoundException("Không tìm thấy lượt khám.");
        if (visit.Status is not (VisitStatus.ChoKham or VisitStatus.ChoKetQua))
            throw ClinicProblems.InvalidState("Chỉ hủy lượt đang chờ khám hoặc chờ kết quả.");
        visit.Status = VisitStatus.BoVe;
        visit.CancelReason = request.Reason.Trim();
        await unitOfWork.SaveChangesAsync(ct);
        return await MapAsync(visit.Id, ct);
    }

    public async Task<QueueTicketDto> GetTicketAsync(Guid visitId, CancellationToken ct = default)
    {
        var visit = await visits.QueryNoTracking().Include(v => v.Patient).Include(v => v.Doctor).FirstOrDefaultAsync(v => v.Id == visitId, ct)
                    ?? throw new NotFoundException("Không tìm thấy lượt khám.");
        var profile = await context.GetProfileAsync(ct);
        var ahead = visit.Status == VisitStatus.ChoKham
            ? await CountAheadAsync(visit.DoctorId, visit.Date, ClinicRules.QueueGroup(visit.IsReturned, visit.IsPriority), visit.QueueAt, visit.QueueNumber, ct)
            : 0;
        return new QueueTicketDto
        {
            ClinicName = profile.Name,
            ClinicAddress = profile.Address,
            Hotline = profile.Hotline,
            LogoUrl = profile.LogoUrl,
            VisitId = visit.Id,
            Code = visit.Code,
            Ticket = ClinicRules.Ticket(visit.Doctor!.Room, visit.QueueNumber),
            QueueNumber = visit.QueueNumber,
            Room = visit.Doctor.Room,
            DoctorName = visit.Doctor.DoctorName(),
            PatientName = visit.Patient!.FullName,
            PatientCode = visit.Patient.Code,
            IsPriority = visit.IsPriority,
            PriorityReason = visit.PriorityReason,
            CheckedInAt = visit.CheckedInAt,
            WaitingAhead = ahead
        };
    }

    public async Task<QueueDisplayDto> GetDisplayAsync(string? code, CancellationToken ct = default)
    {
        var expected = await context.GetDisplayCodeAsync(ct);
        if (string.IsNullOrEmpty(expected) || !string.Equals(code?.Trim(), expected, StringComparison.Ordinal))
            throw new CodedNotFoundException("Mã màn hình không đúng", ClinicErrorCodes.SaiMaManHinh);
        var today = context.Today;
        var profile = await context.GetProfileAsync(ct);
        var day = await context.LoadDayAsync(today, ct);
        var todayVisits = await visits.QueryNoTracking().Include(v => v.Patient).Where(v => v.Date == today).ToListAsync(ct);
        var visitDoctors = todayVisits.Select(v => v.DoctorId).ToHashSet();
        var rooms = day.Where(x => (x.IsActive && x.Slots.Count > 0) || visitDoctors.Contains(x.DoctorId)).ToList();

        DisplayTicketDto Ticket(Visit v, string room) => new()
        {
            Ticket = ClinicRules.Ticket(room, v.QueueNumber),
            PatientName = ClinicRules.ShortName(v.Patient!.FullName),
            IsPriority = v.IsPriority
        };

        var last = todayVisits.Where(v => v.CalledAt != null && v.Status == VisitStatus.DangKham).OrderByDescending(v => v.CalledAt).FirstOrDefault();
        var lastRoom = last is null ? null : rooms.FirstOrDefault(r => r.DoctorId == last.DoctorId);
        return new QueueDisplayDto
        {
            ClinicName = profile.Name,
            LogoUrl = profile.LogoUrl,
            Now = context.UtcNow,
            Rooms = rooms.Select(r =>
            {
                var mine = todayVisits.Where(v => v.DoctorId == r.DoctorId).ToList();
                return new DisplayRoomDto
                {
                    DoctorId = r.DoctorId,
                    Room = r.Room,
                    RoomShort = ClinicRules.RoomShort(r.Room),
                    DoctorName = ClinicRules.DoctorShort(r.FullName),
                    Current = mine.Where(v => v.Status == VisitStatus.DangKham).Select(v => Ticket(v, r.Room)).FirstOrDefault(),
                    Next = mine.Where(v => v.Status == VisitStatus.ChoKham).InCallOrder().Take(5).Select(v => Ticket(v, r.Room)).ToList()
                };
            }).ToList(),
            LastCall = last is null || lastRoom is null
                ? null
                : new DisplayCallDto
                {
                    Ticket = ClinicRules.Ticket(lastRoom.Room, last.QueueNumber),
                    PatientName = ClinicRules.ShortName(last.Patient!.FullName),
                    Room = lastRoom.Room,
                    CalledAt = last.CalledAt!.Value
                }
        };
    }

    /// <summary>07 §3.5 bước 5: dòng nhắc chưa quay lại, cùng bác sĩ, hôm nay trong khoảng từ 3 ngày trước tới 7 ngày sau ngày hẹn.</summary>
    private async Task<FollowUp?> FindFollowUpAsync(Guid patientId, Guid doctorId, DateOnly today, bool tracking, CancellationToken ct)
    {
        var from = today.AddDays(-ClinicRules.FollowUpWindowAfter);
        var to = today.AddDays(ClinicRules.FollowUpWindowBefore);
        var source = tracking ? followUps.Query() : followUps.QueryNoTracking();
        var list = await source
            .Where(f => f.PatientId == patientId && f.DoctorId == doctorId && f.Status != FollowUpStatus.DaQuayLai && f.DueDate >= from && f.DueDate <= to)
            .ToListAsync(ct);
        return list.OrderBy(f => Math.Abs(f.DueDate.DayNumber - today.DayNumber)).ThenBy(f => f.DueDate).FirstOrDefault();
    }

    /// <summary>Số lượt chờ đứng trước một lượt (nhóm, giờ xếp hàng, STT) trong hàng của bác sĩ.</summary>
    private async Task<int> CountAheadAsync(Guid doctorId, DateOnly date, int group, DateTime queueAt, int queueNumber, CancellationToken ct)
    {
        var waiting = await visits.QueryNoTracking()
            .Where(v => v.DoctorId == doctorId && v.Date == date && v.Status == VisitStatus.ChoKham)
            .Select(v => new { v.IsReturned, v.IsPriority, v.QueueAt, v.QueueNumber })
            .ToListAsync(ct);
        return waiting.Count(v =>
        {
            var g = ClinicRules.QueueGroup(v.IsReturned, v.IsPriority);
            return g < group || (g == group && (v.QueueAt < queueAt || (v.QueueAt == queueAt && v.QueueNumber < queueNumber)));
        });
    }

    private void Start(Visit visit, string? reason)
    {
        var now = context.UtcNow;
        visit.Status = VisitStatus.DangKham;
        visit.StartedAt ??= now;
        visit.CalledAt = now;
        visit.CallReason = reason;
    }

    /// <summary>BR-12: một lượt đang khám mỗi bác sĩ.</summary>
    private async Task EnsureDoctorFreeAsync(Guid doctorId, DateOnly date, Guid? exceptVisitId, CancellationToken ct)
    {
        if (await visits.AnyAsync(v => v.DoctorId == doctorId && v.Date == date && v.Status == VisitStatus.DangKham && v.Id != exceptVisitId, ct))
            throw ClinicProblems.Conflict(ClinicErrorCodes.BacSiDangKham, "Kết thúc khám hoặc chuyển Chờ kết quả trước");
    }

    /// <summary>Bác sĩ gắn tài khoản chỉ thao tác hàng chờ của mình.</summary>
    private async Task<Visit> LoadOwnAsync(Guid visitId, CancellationToken ct)
    {
        var visit = await visits.GetByIdAsync(visitId, ct) ?? throw new NotFoundException("Không tìm thấy lượt khám.");
        var actor = await context.GetActorAsync(ct);
        if (actor.OwnDoctorFilter is { } own && visit.DoctorId != own)
            throw new ForbiddenException("Lượt khám thuộc hàng chờ của bác sĩ khác.");
        return visit;
    }

    private async Task<QueueVisitDto> MapAsync(Guid visitId, CancellationToken ct)
    {
        var visit = await visits.QueryNoTracking().Include(v => v.Patient).Include(v => v.Doctor).FirstAsync(v => v.Id == visitId, ct);
        var startAt = visit.AppointmentId is { } aid ? await appointments.QueryNoTracking().Where(a => a.Id == aid).Select(a => (DateTime?)a.StartAt).FirstOrDefaultAsync(ct) : null;
        return visit.ToQueueDto(visit.Patient!, visit.Doctor!, startAt, context.UtcNow, context.Today);
    }
}
