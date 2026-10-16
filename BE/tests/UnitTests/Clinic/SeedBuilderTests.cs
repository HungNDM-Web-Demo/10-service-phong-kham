using Application.Common.Time;
using Domain.Entities.Clinic;
using Domain.Enums.Booking;
using Domain.Enums.Clinic;
using Domain.Enums.Finance;
using Infrastructure.Persistence.Seeders;

namespace UnitTests.Clinic;

/// <summary>
/// Dữ liệu mẫu dựng đúng ở mọi thời điểm nạp (06 §5.3): mã không trùng, tiền khớp dòng, trạng thái hợp lệ với giờ hiện tại.
/// </summary>
public sealed class SeedBuilderTests
{
    public static TheoryData<string> Moments => new()
    {
        "2026-10-19T03:00:00Z", // Thứ Hai 10:00
        "2026-10-16T21:15:00Z", // Thứ Bảy 04:15
        "2026-10-18T08:00:00Z", // Chủ nhật 15:00
        "2026-10-22T12:30:00Z", // Thứ Năm 19:30
        "2026-10-23T00:55:00Z" // Thứ Sáu 07:55
    };

    [Theory]
    [MemberData(nameof(Moments))]
    public void Du_lieu_mau_hop_le_theo_gio_nap(string utc)
    {
        var now = DateTime.Parse(utc, null, System.Globalization.DateTimeStyles.AdjustToUniversal);
        var data = Build(now);
        var today = VietnamDates.DateOf(now);

        Assert.True(data.Appointments.Count > 1000);
        Assert.True(data.Visits.Count > 1000);
        Assert.Equal(data.Appointments.Count, data.Appointments.Select(a => a.Code).Distinct().Count());
        Assert.Equal(data.Visits.Count, data.Visits.Select(v => v.Code).Distinct().Count());
        Assert.Equal(data.Invoices.Count, data.Invoices.Select(i => i.Code).Distinct().Count());
        Assert.Equal(data.Receipts.Count, data.Receipts.Select(r => r.Code).Distinct().Count());
        Assert.Equal(data.Plans.Count, data.Plans.Select(p => p.Code).Distinct().Count());

        // Không có gì xảy ra sau bây giờ
        Assert.All(data.Appointments, a => Assert.True(a.CreatedAt <= now));
        Assert.All(data.Visits, v => Assert.True(v.CheckedInAt <= now && (v.FinishedAt ?? now) <= now));
        Assert.All(data.Receipts, r => Assert.True(r.CollectedAt <= now));
        Assert.All(data.Messages, m => Assert.True(m.SentAt <= now));

        // Phiếu thanh toán khớp dòng, đã thu khớp phiếu thu (BR-21, BR-25)
        foreach (var invoice in data.Invoices)
        {
            Assert.Equal(invoice.Lines.Where(l => !l.IsOutside).Sum(l => l.Amount), invoice.Total);
            Assert.Equal(invoice.Lines.Where(l => !l.IsOutside && l.Kind == InvoiceLineKind.Thuoc).Sum(l => l.Amount), invoice.MedicineTotal);
            var paid = data.Receipts.Where(r => r.InvoiceId == invoice.Id && r.Status == ReceiptStatus.HopLe).Sum(r => r.Amount);
            Assert.Equal(paid, invoice.Paid);
            Assert.True(paid >= Math.Min(invoice.MedicineTotal, invoice.Total) || paid == 0);
        }

        // Lượt khám: một lượt đang khám mỗi bác sĩ, một lượt mở mỗi bệnh nhân, số thứ tự không trùng (BR-07, BR-08, BR-12)
        var todayVisits = data.Visits.Where(v => v.Date == today).ToList();
        Assert.All(todayVisits.GroupBy(v => v.DoctorId), g => Assert.True(g.Count(v => v.Status == VisitStatus.DangKham) <= 1));
        Assert.All(data.Visits.Where(v => v.Status is VisitStatus.ChoKham or VisitStatus.DangKham or VisitStatus.ChoKetQua).GroupBy(v => v.PatientId), g => Assert.Single(g));
        Assert.All(data.Visits.GroupBy(v => (v.DoctorId, v.Date)), g => Assert.Equal(g.Count(), g.Select(v => v.QueueNumber).Distinct().Count()));
        Assert.DoesNotContain(data.Visits, v => v.Date < today && v.Status is VisitStatus.ChoKham or VisitStatus.DangKham or VisitStatus.ChoKetQua);
        Assert.DoesNotContain(data.Appointments, a => a.Date < today && (a.Status is AppointmentStatus.ChoXacNhan or AppointmentStatus.DaXacNhan));

        // Lịch hẹn nằm trong khung của bác sĩ
        var doctors = data.Doctors.ToDictionary(d => d.Id);
        var offs = data.DaysOff.ToDictionary(o => (o.DoctorId, o.Date), o => o.Part);
        foreach (var a in data.Appointments)
        {
            var d = doctors[a.DoctorId];
            var iso = ClinicRules.IsoDayOfWeek(a.Date);
            var slots = ClinicRules.Slots(d.Hours.Where(h => h.DayOfWeek == iso).Select(h => (h.StartMinute, h.EndMinute)), d.SlotMinutes,
                offs.TryGetValue((d.Id, a.Date), out var part) ? part : null);
            var minute = (int)Math.Round((a.StartAt - VietnamDates.StartOfDayUtc(a.Date)).TotalMinutes);
            Assert.Contains(minute, slots);
        }

        // Dòng nhắc: đã quay lại có lượt, quá hạn đúng mốc (BR-29)
        Assert.All(data.FollowUps.Where(f => f.Status == FollowUpStatus.DaQuayLai), f => Assert.NotNull(f.ReturnedVisitId));
        Assert.All(data.FollowUps.Where(f => f.Status == FollowUpStatus.QuaHan), f => Assert.True(f.DueDate.AddDays(7) < today));
        Assert.All(data.FollowUps, f => Assert.True(f.SendCount <= ClinicRules.MaxReminderSends));
    }

    [Fact]
    public void Ke_hoach_du_cac_trang_thai()
    {
        var data = Build(new DateTime(2026, 10, 22, 3, 0, 0, DateTimeKind.Utc));
        var statuses = data.Plans.Select(p => p.Status).ToHashSet();
        Assert.Contains(PlanStatus.DangDieuTri, statuses);
        Assert.Contains(PlanStatus.HoanThanh, statuses);
        Assert.Contains(PlanStatus.DaBaoGia, statuses);
        Assert.Contains(PlanStatus.ChoDuyet, statuses);
        Assert.Contains(PlanStatus.Nhap, statuses);
        Assert.Contains(PlanStatus.DaHuy, statuses);
        Assert.All(data.Plans.Where(p => p.Status == PlanStatus.ChoDuyet), p => Assert.True(ClinicRules.NeedsApproval(p.SubTotal, p.DiscountTotal)));
        Assert.All(data.Plans.Where(p => p.Status == PlanStatus.DaBaoGia), p => Assert.False(ClinicRules.NeedsApproval(p.SubTotal, p.DiscountTotal)));
        Assert.All(data.Plans, p => Assert.Equal(p.SubTotal - p.DiscountTotal, p.Total));
    }

    private static ClinicSeedResult Build(DateTime now)
    {
        var seed = SeedJson.Read<ClinicSeedFile>(DemoDataSeeder.FileName);
        var users = new Dictionary<string, Guid> { ["bacsi"] = Guid.NewGuid(), ["letan"] = Guid.NewGuid(), ["quanly"] = Guid.NewGuid() };
        return ClinicSeedBuilder.Build(seed, new ClinicSeedContext(now, "Phan Thị Ngọc Mai", "Ngô Thị Thanh Hương", "Phòng khám Nha khoa An Tâm", "0236 3 789 115", users));
    }
}
