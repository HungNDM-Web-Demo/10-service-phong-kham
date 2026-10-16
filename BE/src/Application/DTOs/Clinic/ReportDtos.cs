using Domain.Enums.Finance;

namespace Application.DTOs.Clinic;

public sealed record HourCountDto(int Hour, int Count);

public sealed class DashboardDoctorDto
{
    public Guid Id { get; init; }
    public string DisplayName { get; init; } = string.Empty;
    public string Room { get; init; } = string.Empty;
    public bool Working { get; init; }
    public string? CurrentTicket { get; init; }
    public int Waiting { get; init; }
    public int Done { get; init; }
    public int? AvgWaitMinutes { get; init; }
}

public sealed class LongWaitDto
{
    public Guid VisitId { get; init; }
    public string Ticket { get; init; } = string.Empty;
    public string PatientName { get; init; } = string.Empty;
    public string DoctorName { get; init; } = string.Empty;
    public int WaitMinutes { get; init; }
}

/// <summary>Tổng quan hôm nay (07 §3.14, SCR-01).</summary>
public sealed class DashboardTodayDto
{
    public string Date { get; init; } = string.Empty;
    public int Appointments { get; init; }
    public int CheckedIn { get; init; }
    public int Waiting { get; init; }
    public int Done { get; init; }
    public int NoShow { get; init; }
    public decimal Revenue { get; init; }
    public int? AvgWaitMinutes { get; init; }
    public IReadOnlyList<HourCountDto> Hourly { get; init; } = [];
    public IReadOnlyList<DashboardDoctorDto> Doctors { get; init; } = [];
    public IReadOnlyList<LongWaitDto> LongWaits { get; init; } = [];
    public int PendingOnline { get; init; }
    public int PendingApprovals { get; init; }
}

public sealed class ReportQuery
{
    public string? From { get; set; }
    public string? To { get; set; }
    public Guid? DoctorId { get; set; }
    public Guid? SpecialtyId { get; set; }

    /// <summary>Công nợ: số ngày nợ tối thiểu.</summary>
    public int? MinDays { get; set; }
}

public sealed record DayAmountDto(string Date, decimal Amount);

public sealed record GroupAmountDto(RevenueGroup Group, decimal Amount);

public sealed record MethodAmountDto(PaymentMethod Method, decimal Amount, int Count);

public sealed class RevenueReportDto
{
    public string From { get; init; } = string.Empty;
    public string To { get; init; } = string.Empty;
    public decimal Total { get; init; }
    public int ReceiptCount { get; init; }
    public decimal PreviousTotal { get; init; }

    /// <summary>% so kỳ trước, null khi kỳ trước bằng 0.</summary>
    public decimal? ChangePercent { get; init; }

    public IReadOnlyList<DayAmountDto> ByDay { get; init; } = [];
    public IReadOnlyList<GroupAmountDto> ByGroup { get; init; } = [];
    public IReadOnlyList<MethodAmountDto> ByMethod { get; init; } = [];
}

public sealed class DoctorReportRow
{
    public Guid DoctorId { get; init; }
    public string DisplayName { get; init; } = string.Empty;
    public string SpecialtyName { get; init; } = string.Empty;
    public int Visits { get; init; }
    public int NewPatients { get; init; }
    public decimal Revenue { get; init; }
    public int? AvgWaitMinutes { get; init; }
}

public sealed class DoctorReportDto
{
    public string From { get; init; } = string.Empty;
    public string To { get; init; } = string.Empty;
    public IReadOnlyList<DoctorReportRow> Rows { get; init; } = [];
}

public sealed class VisitDayRow
{
    public string Date { get; init; } = string.Empty;
    public int Total { get; init; }
    public int NewPatients { get; init; }
    public int Returning { get; init; }
}

public sealed class VisitReportDto
{
    public string From { get; init; } = string.Empty;
    public string To { get; init; } = string.Empty;
    public int Total { get; init; }
    public int NewPatients { get; init; }
    public int Returning { get; init; }
    public int AppointmentTotal { get; init; }
    public int Cancelled { get; init; }
    public int NoShow { get; init; }
    public decimal NoShowRate { get; init; }
    public int FromOnline { get; init; }
    public int FromReception { get; init; }
    public int WalkIn { get; init; }
    public IReadOnlyList<VisitDayRow> ByDay { get; init; } = [];
}

public sealed class FollowUpDoctorRow
{
    public Guid DoctorId { get; init; }
    public string DisplayName { get; init; } = string.Empty;
    public int Total { get; init; }
    public int Returned { get; init; }
    public int Overdue { get; init; }
}

public sealed class FollowUpReportDto
{
    public string From { get; init; } = string.Empty;
    public string To { get; init; } = string.Empty;
    public int Total { get; init; }
    public int Reminded { get; init; }
    public int Returned { get; init; }
    public int Overdue { get; init; }

    /// <summary>Số dòng đã hết hạn quay lại (<c>DueDate + 7 &lt; hôm nay</c>).</summary>
    public int Closed { get; init; }

    public decimal? ReturnRate { get; init; }
    public IReadOnlyList<FollowUpDoctorRow> ByDoctor { get; init; } = [];
}

public sealed class DebtReportRow
{
    public Guid PatientId { get; init; }
    public string PatientCode { get; init; } = string.Empty;
    public string PatientName { get; init; } = string.Empty;
    public string PatientPhone { get; init; } = string.Empty;
    public int InvoiceCount { get; init; }
    public decimal Debt { get; init; }
    public string OldestDate { get; init; } = string.Empty;
    public int Days { get; init; }
    public string DoctorNames { get; init; } = string.Empty;
}

public sealed class DebtReportDto
{
    public decimal Total { get; init; }
    public int PatientCount { get; init; }
    public IReadOnlyList<DebtReportRow> Rows { get; init; } = [];
}

public sealed class CancelledReceiptRow
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string InvoiceCode { get; init; } = string.Empty;
    public string PatientName { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public PaymentMethod Method { get; init; }
    public DateTime CollectedAt { get; init; }
    public string CollectedByName { get; init; } = string.Empty;
    public DateTime CancelledAt { get; init; }
    public string CancelledByName { get; init; } = string.Empty;
    public string CancelReason { get; init; } = string.Empty;
}

public sealed class CancelledReceiptReportDto
{
    public decimal Total { get; init; }
    public IReadOnlyList<CancelledReceiptRow> Rows { get; init; } = [];
}
