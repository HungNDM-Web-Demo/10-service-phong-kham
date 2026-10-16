using Application.Common.Time;
using Domain.Entities.Booking.Appointments;
using Domain.Entities.Booking.Doctors;
using Domain.Entities.Clinic;
using Domain.Entities.Clinic.FollowUps;
using Domain.Entities.Clinic.Patients;
using Domain.Entities.Clinic.Visits;
using Domain.Enums.Booking;
using Domain.Enums.Clinic;
using Microsoft.EntityFrameworkCore;
using UnitTests.TestSupport;

namespace UnitTests.Clinic;

/// <summary>Dữ liệu mẫu nạp qua DemoDataSeeder bảo đảm ràng buộc của kịch bản kiểm thử (06 §5.6, 05 §1). Lúc nạp 10:00 Thứ Năm.</summary>
public sealed class SeedTests
{
    [Fact]
    public async Task Seed_bao_dam_ban_dau_cua_kich_ban_kiem_thu()
    {
        await using var host = await ClinicTestHost.StartAsync();
        var today = ClinicTestHost.Today;
        var next = ClinicTestHost.NextDay;
        var now = ClinicTestHost.Start.UtcDateTime;

        var patients = await host.QueryAsync<Patient, Dictionary<string, Patient>>(q => q.ToDictionaryAsync(p => p.Code));
        var doctors = await host.QueryAsync<Doctor, Dictionary<string, Doctor>>(q => q.Include(d => d.Hours).ToDictionaryAsync(d => d.Code));
        var appointments = await host.QueryAsync<Appointment, List<Appointment>>(q => q.ToListAsync());
        var visits = await host.QueryAsync<Visit, List<Visit>>(q => q.Where(v => v.Date == today).ToListAsync());
        var followUps = await host.QueryAsync<FollowUp, List<FollowUp>>(q => q.ToListAsync());

        // TC-18: An có lịch đã xác nhận hôm nay với BS01 sau giờ hiện tại, không có lịch online
        var an = patients["BN000125"];
        Assert.Equal("Amoxicillin, tôm cua", an.Allergies);
        var anToday = Assert.Single(appointments, a => a.PatientId == an.Id && a.Date == today);
        Assert.Equal(AppointmentStatus.DaXacNhan, anToday.Status);
        Assert.Equal(doctors["BS01"].Id, anToday.DoctorId);
        Assert.True(anToday.StartAt > now);
        Assert.DoesNotContain(appointments, a => a.PatientId == an.Id && a.Source == AppointmentSource.Online);

        // TC-19, TC-20: BS01 không có lượt đang khám, ít nhất 2 lượt đang chờ; BS03 có lịch khoảng 30 phút sau bây giờ
        var bs01 = visits.Where(v => v.DoctorId == doctors["BS01"].Id).ToList();
        Assert.DoesNotContain(bs01, v => v.Status == VisitStatus.DangKham);
        Assert.True(bs01.Count(v => v.Status == VisitStatus.ChoKham) >= 2);
        Assert.Contains(appointments, a => a.DoctorId == doctors["BS03"].Id && a.Date == today && a.Status == AppointmentStatus.DaXacNhan
                                           && a.StartAt >= now.AddMinutes(15) && a.StartAt <= now.AddMinutes(60));

        // TC-21: Huy 4 tuổi, Đức từ 75 tuổi, chưa có lịch hôm nay
        Assert.Equal(4, ClinicRules.AgeOn(patients["BN000127"].BirthDate, today));
        Assert.True(ClinicRules.AgeOn(patients["BN000128"].BirthDate, today) >= 75);
        Assert.DoesNotContain(appointments, a => (a.PatientId == patients["BN000127"].Id || a.PatientId == patients["BN000128"].Id) && a.Date == today);

        // TC-11: số 0933000111 có 2 lịch online chờ xác nhận
        Assert.Equal(2, appointments.Count(a => a.GuestPhone == "0933000111" && a.Status == AppointmentStatus.ChoXacNhan && a.Source == AppointmentSource.Online));

        // TC-12, TC-13: ngày kế tiếp
        bool Taken(string doc, string hhmm) => appointments.Any(a => a.DoctorId == doctors[doc].Id && a.Date == next && a.Status != AppointmentStatus.DaHuy && a.StartAt == ClinicTestHost.At(next, hhmm));
        Assert.True(Taken("BS01", "09:00"));
        Assert.False(Taken("BS02", "09:00"));
        Assert.False(Taken("BS03", "09:00"));
        Assert.False(Taken("BS04", "14:00"));
        int Count(string doc) => appointments.Count(a => a.DoctorId == doctors[doc].Id && a.Date == next && a.Status != AppointmentStatus.DaHuy);
        Assert.True(Count("BS02") < Count("BS03"));
        Assert.True(Count("BS01") >= 3);

        // TC-38, TC-49: dòng nhắc
        var hanh = Assert.Single(followUps, f => f.PatientId == patients["BN000129"].Id);
        Assert.Equal(FollowUpStatus.DaNhac, hanh.Status);
        Assert.Equal(today.AddDays(-5), hanh.DueDate);
        var viet = Assert.Single(followUps, f => f.PatientId == patients["BN000130"].Id);
        Assert.Equal(FollowUpStatus.QuaHan, viet.Status);
        var yen = Assert.Single(followUps, f => f.PatientId == patients["BN000137"].Id);
        Assert.Equal(FollowUpStatus.ChoNhac, yen.Status);
        Assert.Equal(today.AddDays(1), yen.DueDate);

        // TC-05: Chủ nhật BS04 không làm việc; TC-17: hôm qua không còn lịch chờ
        Assert.DoesNotContain(doctors["BS04"].Hours, h => h.DayOfWeek == 7);
        Assert.DoesNotContain(appointments, a => a.Date < today && (a.Status == AppointmentStatus.ChoXacNhan || a.Status == AppointmentStatus.DaXacNhan));
        Assert.Equal(today, VietnamDates.DateOf(now));
    }
}
