using Application.Common.Models;
using Application.DTOs.Booking;
using Domain.Enums.Clinic;

namespace Application.DTOs.Clinic;

public sealed class FollowUpDto
{
    public Guid Id { get; init; }
    public Guid PatientId { get; init; }
    public string PatientCode { get; init; } = string.Empty;
    public string PatientName { get; init; } = string.Empty;
    public string PatientPhone { get; init; } = string.Empty;
    public Guid DoctorId { get; init; }
    public string DoctorName { get; init; } = string.Empty;
    public Guid VisitId { get; init; }
    public string VisitCode { get; init; } = string.Empty;
    public string VisitDate { get; init; } = string.Empty;
    public string DueDate { get; init; } = string.Empty;

    /// <summary>Số ngày tới hạn, âm khi đã qua hạn.</summary>
    public int DaysToDue { get; init; }

    public string? Note { get; init; }
    public int SendCount { get; init; }
    public DateTime? LastSentAt { get; init; }
    public bool CanSend { get; init; }
    public string? SendBlockedReason { get; init; }
    public CallResult? CallResult { get; init; }
    public string? CallNote { get; init; }
    public DateTime? CalledAt { get; init; }
    public FollowUpStatus Status { get; init; }
    public Guid? AppointmentId { get; init; }
    public string? AppointmentCode { get; init; }
    public Guid? ReturnedVisitId { get; init; }
    public string? ReturnedVisitCode { get; init; }
}

public static class FollowUpGroups
{
    public const string Due = "due";
    public const string Reminded = "reminded";
    public const string Overdue = "overdue";
    public const string Returned = "returned";
}

public sealed class FollowUpQuery : PaginationQuery
{
    /// <summary><c>due</c> (mặc định), <c>reminded</c>, <c>overdue</c>, <c>returned</c>.</summary>
    public string? Group { get; set; }

    public Guid? DoctorId { get; set; }
    public string? From { get; set; }
    public string? To { get; set; }
}

public sealed class FollowUpCountsDto
{
    public int Due { get; init; }
    public int Reminded { get; init; }
    public int Overdue { get; init; }
    public int Returned { get; init; }
}

public sealed class FollowUpPageDto
{
    public PaginatedResult<FollowUpDto> Page { get; init; } = new();
    public FollowUpCountsDto Counts { get; init; } = new();
}

public sealed class SendFollowUpsRequest
{
    public List<Guid> Ids { get; init; } = [];
}

public sealed class SendFollowUpResultItem
{
    public Guid Id { get; init; }
    public bool Sent { get; init; }
    public string? Error { get; init; }
    public MessageDto? Message { get; init; }
}

public sealed class SendFollowUpsResult
{
    public int SentCount { get; init; }
    public IReadOnlyList<SendFollowUpResultItem> Items { get; init; } = [];
}

public sealed class CallResultRequest
{
    public CallResult Result { get; init; }
    public string? Note { get; init; }
}
