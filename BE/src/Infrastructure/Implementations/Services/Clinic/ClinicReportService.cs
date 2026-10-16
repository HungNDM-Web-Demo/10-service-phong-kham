using Application.Common.Time;
using Application.DTOs.Clinic;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Clinic;
using Domain.Entities.Booking.Appointments;
using Domain.Entities.Booking.Doctors;
using Domain.Entities.Clinic;
using Domain.Entities.Clinic.FollowUps;
using Domain.Entities.Clinic.Patients;
using Domain.Entities.Clinic.TreatmentPlans;
using Domain.Entities.Clinic.Visits;
using Domain.Entities.Finance.Invoices;
using Domain.Entities.Finance.Receipts;
using Domain.Enums.Booking;
using Domain.Enums.Clinic;
using Domain.Enums.Finance;
using Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Clinic;

/// <summary>Tổng quan hôm nay, báo cáo (UC-14, UC-15, BR-13, BR-31, 07 §3.14, §4.11).</summary>
public sealed class ClinicReportService(
    IClinicContext context,
    IGenericRepository<Appointment> appointments,
    IGenericRepository<Visit> visits,
    IGenericRepository<Doctor> doctors,
    IGenericRepository<Patient> patients,
    IGenericRepository<Invoice> invoices,
    IGenericRepository<InvoiceLine> lines,
    IGenericRepository<Receipt> receipts,
    IGenericRepository<FollowUp> followUps,
    IGenericRepository<TreatmentPlan> plans) : IClinicReportService
{
    public async Task<DashboardTodayDto> GetDashboardAsync(CancellationToken ct = default)
    {
        var today = context.Today;
        var now = context.UtcNow;
        var start = VietnamDates.StartOfDayUtc(today);
        var end = VietnamDates.EndOfDayExclusiveUtc(today);
        var day = await context.LoadDayAsync(today, ct);
        var appts = await appointments.QueryNoTracking().Where(a => a.Date == today).Select(a => new { a.Status }).ToListAsync(ct);
        var list = await visits.QueryNoTracking().Include(v => v.Patient).Where(v => v.Date == today).ToListAsync(ct);
        var revenue = (await receipts.QueryNoTracking().Where(r => r.Status == ReceiptStatus.HopLe && r.CollectedAt >= start && r.CollectedAt < end).Select(r => r.Amount).ToListAsync(ct)).Sum();
        var started = list.Where(v => v.StartedAt != null).ToList();
        var rooms = day.ToDictionary(d => d.DoctorId, d => d.Room);
        var visitDoctors = list.Select(v => v.DoctorId).ToHashSet();
        return new DashboardTodayDto
        {
            Date = ClinicMappings.Iso(today),
            Appointments = appts.Count(a => a.Status != AppointmentStatus.DaHuy),
            CheckedIn = list.Count,
            Waiting = list.Count(v => v.Status is VisitStatus.ChoKham or VisitStatus.ChoKetQua),
            Done = list.Count(v => v.Status is VisitStatus.ChoThanhToan or VisitStatus.HoanTat),
            NoShow = appts.Count(a => a.Status == AppointmentStatus.KhongDen),
            Revenue = revenue,
            AvgWaitMinutes = started.Count == 0 ? null : (int)Math.Round(started.Average(v => v.WaitMinutes(now))),
            Hourly = HourlyCounts(list.Select(v => context.ToLocal(v.CheckedInAt).Minute / 60).ToList()),
            Doctors = day
                .Where(d => (d.IsActive && d.Slots.Count > 0) || visitDoctors.Contains(d.DoctorId))
                .Select(d =>
                {
                    var mine = list.Where(v => v.DoctorId == d.DoctorId).ToList();
                    var mineStarted = mine.Where(v => v.StartedAt != null).ToList();
                    var current = mine.FirstOrDefault(v => v.Status == VisitStatus.DangKham);
                    return new DashboardDoctorDto
                    {
                        Id = d.DoctorId,
                        DisplayName = ClinicRules.DoctorShort(d.FullName),
                        Room = d.Room,
                        Working = d.Working,
                        CurrentTicket = current is null ? null : ClinicRules.Ticket(d.Room, current.QueueNumber),
                        Waiting = mine.Count(v => v.Status is VisitStatus.ChoKham or VisitStatus.ChoKetQua),
                        Done = mine.Count(v => v.Status is VisitStatus.ChoThanhToan or VisitStatus.HoanTat),
                        AvgWaitMinutes = mineStarted.Count == 0 ? null : (int)Math.Round(mineStarted.Average(v => v.WaitMinutes(now)))
                    };
                })
                .ToList(),
            LongWaits = list
                .Where(v => v.Status == VisitStatus.ChoKham && v.WaitMinutes(now) >= ClinicRules.WaitWarnMinutes)
                .OrderByDescending(v => v.WaitMinutes(now))
                .Select(v => new LongWaitDto
                {
                    VisitId = v.Id,
                    Ticket = ClinicRules.Ticket(rooms.GetValueOrDefault(v.DoctorId) ?? string.Empty, v.QueueNumber),
                    PatientName = v.Patient!.FullName,
                    DoctorName = ClinicRules.DoctorShort(day.FirstOrDefault(d => d.DoctorId == v.DoctorId)?.FullName ?? string.Empty),
                    WaitMinutes = v.WaitMinutes(now)
                })
                .ToList(),
            PendingOnline = await appointments.QueryNoTracking().CountAsync(a => a.Status == AppointmentStatus.ChoXacNhan && a.Date >= today, ct),
            PendingApprovals = await plans.QueryNoTracking().CountAsync(p => p.Status == PlanStatus.ChoDuyet, ct)
        };
    }

    public async Task<RevenueReportDto> GetRevenueAsync(ReportQuery query, CancellationToken ct = default)
    {
        var (from, to) = Range(query);
        var days = to.DayNumber - from.DayNumber + 1;
        var doctorIds = await DoctorFilterAsync(query, ct);
        var rows = await ReceiptsAsync(from, to, doctorIds, ct);
        var previous = await ReceiptsAsync(from.AddDays(-days), from.AddDays(-1), doctorIds, ct);
        var total = rows.Sum(r => r.Amount);
        var prevTotal = previous.Sum(r => r.Amount);

        // Theo nhóm: phân bổ số thu theo tỉ lệ tiền dòng không mua ngoài, phần lẻ dồn vào nhóm lớn nhất
        var invoiceIds = rows.Select(r => r.InvoiceId).Distinct().ToList();
        var lineRows = await lines.QueryNoTracking()
            .Where(l => invoiceIds.Contains(l.InvoiceId) && !l.IsOutside)
            .Select(l => new { l.InvoiceId, l.ReportGroup, l.Amount })
            .ToListAsync(ct);
        lineRows = lineRows.Where(l => l.Amount > 0).ToList();
        var byGroup = Enum.GetValues<RevenueGroup>().ToDictionary(g => g, _ => 0m);
        foreach (var r in rows)
        {
            var groups = lineRows.Where(l => l.InvoiceId == r.InvoiceId).GroupBy(l => l.ReportGroup).Select(g => (g.Key, Amount: g.Sum(x => x.Amount))).ToList();
            var sum = groups.Sum(g => g.Amount);
            if (sum <= 0)
            {
                byGroup[RevenueGroup.Kham] += r.Amount;
                continue;
            }

            var allocated = 0m;
            foreach (var (group, amount) in groups)
            {
                var share = Math.Floor(r.Amount * amount / sum);
                byGroup[group] += share;
                allocated += share;
            }

            byGroup[groups.OrderByDescending(g => g.Amount).First().Key] += r.Amount - allocated;
        }

        return new RevenueReportDto
        {
            From = ClinicMappings.Iso(from),
            To = ClinicMappings.Iso(to),
            Total = total,
            ReceiptCount = rows.Count,
            PreviousTotal = prevTotal,
            ChangePercent = prevTotal == 0 ? null : Math.Round((total - prevTotal) * 100m / prevTotal, 1),
            ByDay = Enumerable.Range(0, days)
                .Select(n => from.AddDays(n))
                .Select(d => new DayAmountDto(ClinicMappings.Iso(d), rows.Where(r => r.Date == d).Sum(r => r.Amount)))
                .ToList(),
            ByGroup = byGroup.Select(kv => new GroupAmountDto(kv.Key, kv.Value)).ToList(),
            ByMethod = Enum.GetValues<PaymentMethod>()
                .Select(m => new MethodAmountDto(m, rows.Where(r => r.Method == m).Sum(r => r.Amount), rows.Count(r => r.Method == m)))
                .ToList()
        };
    }

    public async Task<DoctorReportDto> GetDoctorsAsync(ReportQuery query, CancellationToken ct = default)
    {
        var (from, to) = Range(query);
        var now = context.UtcNow;
        var doctorList = await doctors.QueryNoTracking().Include(d => d.Specialty)
            .Where(d => (query.SpecialtyId == null || d.SpecialtyId == query.SpecialtyId) && (query.DoctorId == null || d.Id == query.DoctorId))
            .OrderBy(d => d.SortOrder).ThenBy(d => d.Code)
            .ToListAsync(ct);
        var ids = doctorList.Select(d => d.Id).ToList();
        var visitRows = await visits.QueryNoTracking()
            .Where(v => ids.Contains(v.DoctorId) && v.Date >= from && v.Date <= to && v.Status != VisitStatus.BoVe)
            .Select(v => new { v.Id, v.DoctorId, v.PatientId, v.Date, v.Status, v.StartedAt, v.InitialQueueAt })
            .ToListAsync(ct);
        var firstVisit = await FirstVisitDatesAsync(visitRows.Select(v => v.PatientId).Distinct().ToList(), ct);
        var visitIds = visitRows.Select(v => v.Id).ToList();
        var invoiceDoctor = await invoices.QueryNoTracking()
            .Where(i => visitIds.Contains(i.VisitId) && i.Status != InvoiceStatus.DaHuy)
            .ToDictionaryAsync(i => i.Id, i => i.DoctorId, ct);
        var invoiceIds = invoiceDoctor.Keys.ToList();
        var revenueRows = (await lines.QueryNoTracking()
                .Where(l => invoiceIds.Contains(l.InvoiceId) && l.Kind != InvoiceLineKind.Thuoc && !l.IsOutside)
                .Select(l => new { l.InvoiceId, l.Amount })
                .ToListAsync(ct))
            .Select(l => new { DoctorId = invoiceDoctor[l.InvoiceId], l.Amount })
            .ToList();
        return new DoctorReportDto
        {
            From = ClinicMappings.Iso(from),
            To = ClinicMappings.Iso(to),
            Rows = doctorList.Select(d =>
            {
                var mine = visitRows.Where(v => v.DoctorId == d.Id).ToList();
                var done = mine.Where(v => v.Status is VisitStatus.ChoThanhToan or VisitStatus.HoanTat).ToList();
                var waited = mine.Where(v => v.StartedAt != null).ToList();
                return new DoctorReportRow
                {
                    DoctorId = d.Id,
                    DisplayName = d.DoctorName(),
                    SpecialtyName = d.Specialty?.Name ?? string.Empty,
                    Visits = done.Count,
                    NewPatients = done.Count(v => firstVisit.GetValueOrDefault(v.PatientId) == v.Date),
                    Revenue = revenueRows.Where(r => r.DoctorId == d.Id).Sum(r => r.Amount),
                    AvgWaitMinutes = waited.Count == 0 ? null : (int)Math.Round(waited.Average(v => Math.Max(0, (v.StartedAt!.Value - v.InitialQueueAt).TotalMinutes)))
                };
            }).ToList()
        };
    }

    public async Task<VisitReportDto> GetVisitsAsync(ReportQuery query, CancellationToken ct = default)
    {
        var (from, to) = Range(query);
        var doctorIds = await DoctorFilterAsync(query, ct);
        var visitRows = await visits.QueryNoTracking()
            .Where(v => v.Date >= from && v.Date <= to && v.Status != VisitStatus.BoVe && (doctorIds == null || doctorIds.Contains(v.DoctorId)))
            .Select(v => new { v.PatientId, v.Date, v.AppointmentId })
            .ToListAsync(ct);
        var apptRows = await appointments.QueryNoTracking()
            .Where(a => a.Date >= from && a.Date <= to && (doctorIds == null || doctorIds.Contains(a.DoctorId)))
            .Select(a => new { a.Id, a.Status, a.Source })
            .ToListAsync(ct);
        var sources = apptRows.ToDictionary(a => a.Id, a => a.Source);
        var firstVisit = await FirstVisitDatesAsync(visitRows.Select(v => v.PatientId).Distinct().ToList(), ct);
        var isNew = visitRows.Select(v => firstVisit.GetValueOrDefault(v.PatientId) == v.Date).ToList();
        var total = apptRows.Count;
        var cancelled = apptRows.Count(a => a.Status == AppointmentStatus.DaHuy);
        var noShow = apptRows.Count(a => a.Status == AppointmentStatus.KhongDen);
        var days = to.DayNumber - from.DayNumber + 1;
        return new VisitReportDto
        {
            From = ClinicMappings.Iso(from),
            To = ClinicMappings.Iso(to),
            Total = visitRows.Count,
            NewPatients = isNew.Count(x => x),
            Returning = isNew.Count(x => !x),
            AppointmentTotal = total,
            Cancelled = cancelled,
            NoShow = noShow,
            NoShowRate = total - cancelled == 0 ? 0 : Math.Round(noShow * 100m / (total - cancelled), 1),
            FromOnline = visitRows.Count(v => v.AppointmentId is { } id && sources.GetValueOrDefault(id) == AppointmentSource.Online),
            FromReception = visitRows.Count(v => v.AppointmentId is { } id && sources.GetValueOrDefault(id) == AppointmentSource.LeTan),
            WalkIn = visitRows.Count(v => v.AppointmentId is null),
            ByDay = Enumerable.Range(0, days).Select(n =>
            {
                var d = from.AddDays(n);
                var mine = visitRows.Where(v => v.Date == d).ToList();
                var fresh = mine.Count(v => firstVisit.GetValueOrDefault(v.PatientId) == v.Date);
                return new VisitDayRow { Date = ClinicMappings.Iso(d), Total = mine.Count, NewPatients = fresh, Returning = mine.Count - fresh };
            }).ToList()
        };
    }

    public async Task<FollowUpReportDto> GetFollowUpsAsync(ReportQuery query, CancellationToken ct = default)
    {
        var (from, to) = Range(query);
        var today = context.Today;
        var doctorIds = await DoctorFilterAsync(query, ct);
        var rows = await followUps.QueryNoTracking()
            .Where(f => f.DueDate >= from && f.DueDate <= to && (doctorIds == null || doctorIds.Contains(f.DoctorId)))
            .Select(f => new { f.DoctorId, f.DueDate, f.Status, f.SendCount, f.CallResult })
            .ToListAsync(ct);
        var closedBefore = today.AddDays(-ClinicRules.FollowUpWindowAfter);
        var closed = rows.Where(r => r.DueDate < closedBefore).ToList();
        var names = await doctors.QueryNoTracking().ToDictionaryAsync(d => d.Id, d => d.FullName, ct);
        return new FollowUpReportDto
        {
            From = ClinicMappings.Iso(from),
            To = ClinicMappings.Iso(to),
            Total = rows.Count,
            Reminded = rows.Count(r => r.SendCount > 0 || r.CallResult != null),
            Returned = rows.Count(r => r.Status == FollowUpStatus.DaQuayLai),
            Overdue = rows.Count(r => r.Status == FollowUpStatus.QuaHan),
            Closed = closed.Count,
            ReturnRate = closed.Count == 0 ? null : Math.Round(closed.Count(r => r.Status == FollowUpStatus.DaQuayLai) * 100m / closed.Count, 1),
            ByDoctor = rows.GroupBy(r => r.DoctorId)
                .Select(g => new FollowUpDoctorRow
                {
                    DoctorId = g.Key,
                    DisplayName = ClinicRules.DoctorShort(names.GetValueOrDefault(g.Key) ?? string.Empty),
                    Total = g.Count(),
                    Returned = g.Count(r => r.Status == FollowUpStatus.DaQuayLai),
                    Overdue = g.Count(r => r.Status == FollowUpStatus.QuaHan)
                })
                .OrderByDescending(r => r.Total)
                .ToList()
        };
    }

    public async Task<DebtReportDto> GetDebtsAsync(ReportQuery query, CancellationToken ct = default)
    {
        var today = context.Today;
        var doctorIds = await DoctorFilterAsync(query, ct);
        var rows = await invoices.QueryNoTracking()
            .Where(i => (i.Status == InvoiceStatus.ChoThu || i.Status == InvoiceStatus.ThuMotPhan) && (doctorIds == null || doctorIds.Contains(i.DoctorId)))
            .Select(i => new { i.PatientId, i.DoctorId, i.Total, i.Paid, i.CreatedAt })
            .ToListAsync(ct);
        var patientIds = rows.Select(r => r.PatientId).Distinct().ToList();
        var people = await patients.QueryNoTracking().Where(p => patientIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, ct);
        var names = await doctors.QueryNoTracking().ToDictionaryAsync(d => d.Id, d => d.FullName, ct);
        var result = rows.GroupBy(r => r.PatientId)
            .Select(g =>
            {
                var oldest = context.ToLocal(g.Min(r => r.CreatedAt)).Date;
                var p = people[g.Key];
                return new DebtReportRow
                {
                    PatientId = g.Key,
                    PatientCode = p.Code,
                    PatientName = p.FullName,
                    PatientPhone = p.Phone,
                    InvoiceCount = g.Count(),
                    Debt = g.Sum(r => r.Total - r.Paid),
                    OldestDate = ClinicMappings.Iso(oldest),
                    Days = today.DayNumber - oldest.DayNumber,
                    DoctorNames = string.Join(", ", g.Select(r => r.DoctorId).Distinct().Select(id => ClinicRules.DoctorShort(names.GetValueOrDefault(id) ?? string.Empty)))
                };
            })
            .Where(r => r.Debt > 0 && (query.MinDays is null || r.Days >= query.MinDays))
            .OrderByDescending(r => r.Days).ThenByDescending(r => r.Debt)
            .ToList();
        return new DebtReportDto { Total = result.Sum(r => r.Debt), PatientCount = result.Count, Rows = result };
    }

    public async Task<CancelledReceiptReportDto> GetCancelledReceiptsAsync(ReportQuery query, CancellationToken ct = default)
    {
        var (from, to) = Range(query);
        var start = VietnamDates.StartOfDayUtc(from);
        var end = VietnamDates.EndOfDayExclusiveUtc(to);
        var rows = await receipts.QueryNoTracking().Include(r => r.Invoice)
            .Where(r => r.Status == ReceiptStatus.DaHuy && r.CancelledAt >= start && r.CancelledAt < end)
            .OrderByDescending(r => r.CancelledAt)
            .ToListAsync(ct);
        var ids = rows.Select(r => r.PatientId).Distinct().ToList();
        var people = await patients.QueryNoTracking().Where(p => ids.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.FullName, ct);
        return new CancelledReceiptReportDto
        {
            Total = rows.Sum(r => r.Amount),
            Rows = rows.Select(r => new CancelledReceiptRow
            {
                Id = r.Id,
                Code = r.Code,
                InvoiceCode = r.Invoice!.Code,
                PatientName = people.GetValueOrDefault(r.PatientId) ?? string.Empty,
                Amount = r.Amount,
                Method = r.Method,
                CollectedAt = r.CollectedAt,
                CollectedByName = r.CollectedByName,
                CancelledAt = r.CancelledAt!.Value,
                CancelledByName = r.CancelledByName ?? string.Empty,
                CancelReason = r.CancelReason ?? string.Empty
            }).ToList()
        };
    }

    /// <summary>Khoảng ngày báo cáo, mặc định 30 ngày tới hôm nay, tối đa 366 ngày.</summary>
    private (DateOnly From, DateOnly To) Range(ReportQuery query)
    {
        var today = context.Today;
        var to = VietnamDates.TryParse(query.To, out var t) ? t : today;
        var from = VietnamDates.TryParse(query.From, out var f) ? f : to.AddDays(-29);
        if (from > to)
            throw FieldErrors.Single("from", "Ngày bắt đầu phải trước ngày kết thúc");
        if (to.DayNumber - from.DayNumber + 1 > ClinicRules.MaxReportDays)
            throw FieldErrors.Single("to", $"Khoảng ngày tối đa {ClinicRules.MaxReportDays} ngày");
        return (from, to);
    }

    /// <summary>Bác sĩ theo bộ lọc bác sĩ, chuyên khoa; null khi không lọc.</summary>
    private async Task<List<Guid>?> DoctorFilterAsync(ReportQuery query, CancellationToken ct)
    {
        if (query.DoctorId is { } id)
            return [id];
        if (query.SpecialtyId is { } specialtyId)
            return await doctors.QueryNoTracking().Where(d => d.SpecialtyId == specialtyId).Select(d => d.Id).ToListAsync(ct);
        return null;
    }

    private sealed record ReceiptRow(Guid InvoiceId, decimal Amount, PaymentMethod Method, DateOnly Date);

    private async Task<List<ReceiptRow>> ReceiptsAsync(DateOnly from, DateOnly to, List<Guid>? doctorIds, CancellationToken ct)
    {
        var start = VietnamDates.StartOfDayUtc(from);
        var end = VietnamDates.EndOfDayExclusiveUtc(to);
        var rows = await receipts.QueryNoTracking()
            .Where(r => r.Status == ReceiptStatus.HopLe && r.CollectedAt >= start && r.CollectedAt < end && (doctorIds == null || doctorIds.Contains(r.Invoice!.DoctorId)))
            .Select(r => new { r.InvoiceId, r.Amount, r.Method, r.CollectedAt })
            .ToListAsync(ct);
        return rows.Select(r => new ReceiptRow(r.InvoiceId, r.Amount, r.Method, VietnamDates.DateOf(r.CollectedAt))).ToList();
    }

    /// <summary>Ngày lượt khám đầu tiên (không bỏ về) của mỗi bệnh nhân.</summary>
    private async Task<Dictionary<Guid, DateOnly>> FirstVisitDatesAsync(List<Guid> patientIds, CancellationToken ct)
    {
        if (patientIds.Count == 0)
            return [];
        var rows = await visits.QueryNoTracking()
            .Where(v => patientIds.Contains(v.PatientId) && v.Status != VisitStatus.BoVe)
            .GroupBy(v => v.PatientId)
            .Select(g => new { g.Key, First = g.Min(v => v.Date) })
            .ToListAsync(ct);
        return rows.ToDictionary(r => r.Key, r => r.First);
    }

    /// <summary>Số lượt tiếp đón theo giờ, từ 7h tới 20h, mở rộng nếu có lượt ngoài khoảng đó.</summary>
    private static List<HourCountDto> HourlyCounts(List<int> hours)
    {
        var first = Math.Min(7, hours.DefaultIfEmpty(7).Min());
        var last = Math.Max(20, hours.DefaultIfEmpty(20).Max());
        return Enumerable.Range(first, last - first + 1).Select(h => new HourCountDto(h, hours.Count(x => x == h))).ToList();
    }
}
