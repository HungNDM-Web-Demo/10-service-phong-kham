using Application.Common.Exceptions;
using Application.Common.Models;
using Application.Common.Time;
using Application.DTOs.Clinic;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Clinic;
using Domain.Entities.Booking.Appointments;
using Domain.Entities.Booking.Doctors;
using Domain.Entities.Clinic;
using Domain.Entities.Clinic.FollowUps;
using Domain.Entities.Clinic.Messages;
using Domain.Entities.Clinic.Visits;
using Domain.Enums.Clinic;
using Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Clinic;

/// <summary>Nhắc tái khám (UC-13, BR-29, BR-30, 07 §3.12, §4.10).</summary>
public sealed class FollowUpService(
    IClinicContext context,
    IGenericRepository<FollowUp> followUps,
    IGenericRepository<Doctor> doctors,
    IGenericRepository<Visit> visits,
    IGenericRepository<Appointment> appointments,
    IGenericRepository<Message> messages,
    IUnitOfWork unitOfWork) : IFollowUpService
{
    public async Task<FollowUpPageDto> GetPagedAsync(FollowUpQuery query, CancellationToken ct = default)
    {
        var today = context.Today;
        var profile = await context.GetProfileAsync(ct);
        var dueTo = today.AddDays(profile.FollowUpRemindDays);
        var dueFrom = today.AddDays(-ClinicRules.FollowUpWindowAfter);

        var baseQuery = followUps.QueryNoTracking().Include(f => f.Patient).AsQueryable();
        if (query.DoctorId is { } doctorId)
            baseQuery = baseQuery.Where(f => f.DoctorId == doctorId);
        if (VietnamDates.TryParse(query.From, out var from))
            baseQuery = baseQuery.Where(f => f.DueDate >= from);
        if (VietnamDates.TryParse(query.To, out var to))
            baseQuery = baseQuery.Where(f => f.DueDate <= to);

        IQueryable<FollowUp> Due(IQueryable<FollowUp> q) => q.Where(f => f.Status == FollowUpStatus.ChoNhac && f.DueDate <= dueTo && f.DueDate >= dueFrom);
        IQueryable<FollowUp> Reminded(IQueryable<FollowUp> q) => q.Where(f => f.Status == FollowUpStatus.DaNhac || f.Status == FollowUpStatus.DaDatLich);
        IQueryable<FollowUp> Overdue(IQueryable<FollowUp> q) => q.Where(f => f.Status == FollowUpStatus.QuaHan);
        IQueryable<FollowUp> Returned(IQueryable<FollowUp> q) => q.Where(f => f.Status == FollowUpStatus.DaQuayLai);

        var counts = new FollowUpCountsDto
        {
            Due = await Due(baseQuery).CountAsync(ct),
            Reminded = await Reminded(baseQuery).CountAsync(ct),
            Overdue = await Overdue(baseQuery).CountAsync(ct),
            Returned = await Returned(baseQuery).CountAsync(ct)
        };

        var group = query.Group?.Trim().ToLowerInvariant() ?? FollowUpGroups.Due;
        var source = group switch
        {
            FollowUpGroups.Reminded => Reminded(baseQuery),
            FollowUpGroups.Overdue => Overdue(baseQuery),
            FollowUpGroups.Returned => Returned(baseQuery),
            _ => Due(baseQuery)
        };
        if (query.GetSearchTerm() is { } term)
        {
            var pattern = LikePattern.Contains(term);
            source = source.Where(f => AppDbFunctions.Matches(f.Patient!.FullName, pattern) || AppDbFunctions.Matches(f.Patient!.Phone, pattern) || AppDbFunctions.Matches(f.Patient!.Code, pattern));
        }

        if (string.IsNullOrWhiteSpace(query.SortBy))
        {
            query.SortBy = "dueDate";
            query.SortDir ??= group is FollowUpGroups.Overdue or FollowUpGroups.Returned ? "desc" : "asc";
        }

        var page = await source.ApplySorting(query).ToPaginatedResultAsync(query, ct);
        var dtos = await ToDtosAsync(page.Items, ct);
        return new FollowUpPageDto { Page = page.Map(_ => dtos), Counts = counts };
    }

    public async Task<SendFollowUpsResult> SendAsync(SendFollowUpsRequest request, CancellationToken ct = default)
    {
        var ids = request.Ids.Distinct().ToList();
        var list = await followUps.Query().Include(f => f.Patient).Where(f => ids.Contains(f.Id)).ToListAsync(ct);
        var doctorNames = await doctors.QueryNoTracking().ToDictionaryAsync(d => d.Id, d => d.FullName, ct);
        var profile = await context.GetProfileAsync(ct);
        var now = context.UtcNow;
        var results = new List<SendFollowUpResultItem>();
        foreach (var id in ids)
        {
            var f = list.FirstOrDefault(x => x.Id == id);
            if (f is null)
            {
                results.Add(new SendFollowUpResultItem { Id = id, Sent = false, Error = "Không tìm thấy dòng nhắc" });
                continue;
            }

            var blocked = SendBlockedReason(f, now);
            if (blocked is not null)
            {
                if (ids.Count == 1)
                    throw ClinicProblems.Conflict(ClinicErrorCodes.GuiNhacQuaSom, blocked);
                results.Add(new SendFollowUpResultItem { Id = id, Sent = false, Error = blocked });
                continue;
            }

            var message = new Message
            {
                Kind = MessageKind.NhacTaiKham,
                Channel = MessageChannel.Zalo,
                Phone = f.Patient!.Phone,
                Content = ClinicRules.FollowUpMessage(profile.Name, f.Patient.FullName, f.DueDate, doctorNames.GetValueOrDefault(f.DoctorId) ?? string.Empty, profile.Hotline),
                SentAt = now,
                FollowUpId = f.Id
            };
            await messages.AddAsync(message, ct);
            f.SendCount++;
            f.LastSentAt = now;
            if (f.Status == FollowUpStatus.ChoNhac)
                f.Status = FollowUpStatus.DaNhac;
            results.Add(new SendFollowUpResultItem { Id = id, Sent = true, Message = message.ToDto() });
        }

        await unitOfWork.SaveChangesAsync(ct);
        return new SendFollowUpsResult { SentCount = results.Count(r => r.Sent), Items = results };
    }

    public async Task<FollowUpDto> RecordCallAsync(Guid id, CallResultRequest request, CancellationToken ct = default)
    {
        var f = await followUps.GetByIdAsync(id, ct) ?? throw new NotFoundException("Không tìm thấy dòng nhắc.");
        if (f.Status == FollowUpStatus.DaQuayLai)
            throw ClinicProblems.InvalidState("Bệnh nhân đã quay lại tái khám.");
        f.CallResult = request.Result;
        f.CallNote = ClinicPatients.Trim(request.Note);
        f.CalledAt = context.UtcNow;
        if (f.Status == FollowUpStatus.ChoNhac)
            f.Status = FollowUpStatus.DaNhac;
        await unitOfWork.SaveChangesAsync(ct);
        var row = await followUps.QueryNoTracking().Include(x => x.Patient).FirstAsync(x => x.Id == id, ct);
        return (await ToDtosAsync([row], ct))[0];
    }

    /// <summary>BR-30: tối đa 3 lần, cách nhau ít nhất 24 giờ.</summary>
    private static string? SendBlockedReason(FollowUp f, DateTime now)
    {
        if (f.Status == FollowUpStatus.DaQuayLai)
            return "Bệnh nhân đã quay lại tái khám";
        if (f.SendCount >= ClinicRules.MaxReminderSends)
            return $"Đã gửi đủ {ClinicRules.MaxReminderSends} lần";
        if (f.LastSentAt is { } last && now - last < TimeSpan.FromHours(ClinicRules.ReminderGapHours))
            return "Gửi lại sau 24 giờ";
        return null;
    }

    private async Task<List<FollowUpDto>> ToDtosAsync(IReadOnlyList<FollowUp> list, CancellationToken ct)
    {
        var today = context.Today;
        var now = context.UtcNow;
        var doctorNames = await doctors.QueryNoTracking().ToDictionaryAsync(d => d.Id, d => d.FullName, ct);
        var visitIds = list.Select(f => f.VisitId).Concat(list.Where(f => f.ReturnedVisitId != null).Select(f => f.ReturnedVisitId!.Value)).Distinct().ToList();
        var visitRows = await visits.QueryNoTracking().Where(v => visitIds.Contains(v.Id)).Select(v => new { v.Id, v.Code, v.Date }).ToDictionaryAsync(v => v.Id, ct);
        var apptIds = list.Where(f => f.AppointmentId != null).Select(f => f.AppointmentId!.Value).ToList();
        var apptCodes = await appointments.QueryNoTracking().Where(a => apptIds.Contains(a.Id)).ToDictionaryAsync(a => a.Id, a => a.Code, ct);
        return list.Select(f =>
        {
            var blocked = SendBlockedReason(f, now);
            var visit = visitRows.GetValueOrDefault(f.VisitId);
            return new FollowUpDto
            {
                Id = f.Id,
                PatientId = f.PatientId,
                PatientCode = f.Patient!.Code,
                PatientName = f.Patient.FullName,
                PatientPhone = f.Patient.Phone,
                DoctorId = f.DoctorId,
                DoctorName = ClinicRules.DoctorShort(doctorNames.GetValueOrDefault(f.DoctorId) ?? string.Empty),
                VisitId = f.VisitId,
                VisitCode = visit?.Code ?? string.Empty,
                VisitDate = visit is null ? string.Empty : ClinicMappings.Iso(visit.Date),
                DueDate = ClinicMappings.Iso(f.DueDate),
                DaysToDue = f.DueDate.DayNumber - today.DayNumber,
                Note = f.Note,
                SendCount = f.SendCount,
                LastSentAt = f.LastSentAt,
                CanSend = blocked is null,
                SendBlockedReason = blocked,
                CallResult = f.CallResult,
                CallNote = f.CallNote,
                CalledAt = f.CalledAt,
                Status = f.Status,
                AppointmentId = f.AppointmentId,
                AppointmentCode = f.AppointmentId is { } aid ? apptCodes.GetValueOrDefault(aid) : null,
                ReturnedVisitId = f.ReturnedVisitId,
                ReturnedVisitCode = f.ReturnedVisitId is { } rid ? visitRows.GetValueOrDefault(rid)?.Code : null
            };
        }).ToList();
    }
}
