using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Clinic;
using Domain.Entities.Booking.Appointments;
using Domain.Entities.Clinic;
using Domain.Entities.Clinic.FollowUps;
using Domain.Entities.Clinic.Messages;
using Domain.Entities.Clinic.Visits;
using Domain.Enums.Booking;
using Domain.Enums.Clinic;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Clinic;

/// <summary>Việc nền (06 §3). FE mock chạy cùng các bước này khi đọc dữ liệu.</summary>
public sealed class ClinicMaintenanceService(
    IClinicContext context,
    IGenericRepository<Appointment> appointments,
    IGenericRepository<Visit> visits,
    IGenericRepository<FollowUp> followUps,
    IGenericRepository<Message> messages,
    IUnitOfWork unitOfWork) : IClinicMaintenanceService
{
    public async Task<int> RunAsync(CancellationToken ct = default)
    {
        var today = context.Today;
        var changes = 0;

        // 1. BR-05: lịch chưa tiếp đón của ngày đã qua
        foreach (var a in await appointments.Query()
                     .Where(a => a.Date < today && (a.Status == AppointmentStatus.ChoXacNhan || a.Status == AppointmentStatus.DaXacNhan))
                     .ToListAsync(ct))
        {
            a.Status = AppointmentStatus.KhongDen;
            changes++;
        }

        // 2. Lượt còn chờ của ngày đã qua
        foreach (var v in await visits.Query()
                     .Where(v => v.Date < today && (v.Status == VisitStatus.ChoKham || v.Status == VisitStatus.ChoKetQua))
                     .ToListAsync(ct))
        {
            v.Status = VisitStatus.BoVe;
            v.CancelReason = ClinicRules.EndOfDayCancel;
            changes++;
        }

        // 3. BR-29: quá 7 ngày sau ngày hẹn chưa quay lại
        var overdueBefore = today.AddDays(-ClinicRules.FollowUpWindowAfter);
        foreach (var f in await followUps.Query()
                     .Where(f => f.DueDate < overdueBefore && f.Status != FollowUpStatus.DaQuayLai && f.Status != FollowUpStatus.QuaHan)
                     .ToListAsync(ct))
        {
            f.Status = FollowUpStatus.QuaHan;
            changes++;
        }

        // 4. FR-12: từ 18:00, tin nhắc cho lịch đã xác nhận của ngày mai
        if (context.NowMinute >= ClinicRules.ReminderHour * 60)
        {
            var tomorrow = today.AddDays(1);
            var reminded = messages.QueryNoTracking().Where(m => m.Kind == MessageKind.NhacLich && m.AppointmentId != null).Select(m => m.AppointmentId!.Value);
            var due = await appointments.QueryNoTracking().Include(a => a.Patient).Include(a => a.Doctor)
                .Where(a => a.Date == tomorrow && a.Status == AppointmentStatus.DaXacNhan && !reminded.Contains(a.Id))
                .ToListAsync(ct);
            if (due.Count > 0)
            {
                var profile = await context.GetProfileAsync(ct);
                foreach (var a in due)
                {
                    await messages.AddAsync(ClinicMessages.Reminder(a, a.Doctor!, profile.Name, profile.Hotline, a.PatientPhoneOf(), context.ToLocal(a.StartAt), context.UtcNow), ct);
                    changes++;
                }
            }
        }

        if (changes > 0)
            await unitOfWork.SaveChangesAsync(ct);
        return changes;
    }
}
