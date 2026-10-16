using Application.Common.Models;
using Application.DTOs.Clinic;
using Domain.Enums.Finance;

namespace Application.DTOs.Finance;

public sealed class InvoiceLineDto
{
    public Guid Id { get; init; }
    public InvoiceLineKind Kind { get; init; }
    public RevenueGroup ReportGroup { get; init; }
    public string Description { get; init; } = string.Empty;
    public string? Note { get; init; }
    public decimal UnitPrice { get; init; }
    public int Quantity { get; init; }
    public decimal Discount { get; init; }
    public decimal Amount { get; init; }
    public bool IsOutside { get; init; }
}

public sealed class ReceiptBrief
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public PaymentMethod Method { get; init; }
    public DateTime CollectedAt { get; init; }
    public string CollectedByName { get; init; } = string.Empty;
    public ReceiptStatus Status { get; init; }
    public string? CancelReason { get; init; }
}

public sealed class InvoiceDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public Guid VisitId { get; init; }
    public string VisitCode { get; init; } = string.Empty;
    public PatientBrief Patient { get; init; } = new();
    public Guid DoctorId { get; init; }
    public string DoctorName { get; init; } = string.Empty;
    public decimal Total { get; init; }
    public decimal MedicineTotal { get; init; }
    public decimal Paid { get; init; }
    public decimal Debt { get; init; }
    public InvoiceStatus Status { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? CancelledAt { get; init; }
    public IReadOnlyList<InvoiceLineDto> Lines { get; init; } = [];
    public IReadOnlyList<ReceiptBrief> Receipts { get; init; } = [];
    public bool CanCollect { get; init; }
    public bool CanEditOutside { get; init; }

    /// <summary>Nợ của bệnh nhân ở các phiếu thanh toán khác (UC-11 bước 2).</summary>
    public decimal PatientOtherDebt { get; init; }
}

public sealed class InvoiceListItem
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public Guid VisitId { get; init; }
    public string VisitCode { get; init; } = string.Empty;

    /// <summary>Số thứ tự của lượt khám ("P1 - 005"), để lễ tân gọi bệnh nhân ra thu phí (UC-11 bước 1).</summary>
    public string? Ticket { get; init; }

    public Guid PatientId { get; init; }
    public string PatientCode { get; init; } = string.Empty;
    public string PatientName { get; init; } = string.Empty;
    public string PatientPhone { get; init; } = string.Empty;
    public string DoctorName { get; init; } = string.Empty;
    public decimal Total { get; init; }
    public decimal Paid { get; init; }
    public decimal Debt { get; init; }
    public InvoiceStatus Status { get; init; }
    public DateTime CreatedAt { get; init; }
}

public sealed class InvoiceQuery : PaginationQuery
{
    public InvoiceStatus? Status { get; set; }

    /// <summary>Chỉ phiếu còn nợ (<c>ChoThu</c>, <c>ThuMotPhan</c>) từ trước hôm nay hoặc đã thu một phần.</summary>
    public bool? HasDebt { get; set; }

    public Guid? PatientId { get; set; }
    public string? From { get; set; }
    public string? To { get; set; }
}

/// <summary>Thu tiền (07 §3.9).</summary>
public sealed class CollectRequest
{
    public string? ClientRequestId { get; init; }
    public List<Guid> OutsideLineIds { get; init; } = [];
    public decimal Amount { get; init; }
    public PaymentMethod Method { get; init; }
    public decimal? CashReceived { get; init; }
    public string? PartialReason { get; init; }
    public decimal ExpectedTotal { get; init; }
}

public sealed class ReceiptDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public Guid InvoiceId { get; init; }
    public string InvoiceCode { get; init; } = string.Empty;
    public string VisitCode { get; init; } = string.Empty;
    public PatientBrief Patient { get; init; } = new();
    public string DoctorName { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public PaymentMethod Method { get; init; }
    public decimal? CashReceived { get; init; }
    public decimal? ChangeAmount { get; init; }
    public string? PartialReason { get; init; }
    public DateTime CollectedAt { get; init; }
    public string CollectedByName { get; init; } = string.Empty;
    public ReceiptStatus Status { get; init; }
    public string? CancelReason { get; init; }
    public DateTime? CancelledAt { get; init; }
    public string? CancelledByName { get; init; }
    public bool CanCancel { get; init; }
    public IReadOnlyList<InvoiceLineDto> Lines { get; init; } = [];
    public decimal InvoiceTotal { get; init; }

    /// <summary>Tổng đã thu hợp lệ tính tới phiếu thu này.</summary>
    public decimal PaidToDate { get; init; }

    public decimal DebtAfter { get; init; }
}

public sealed class ReceiptListItem
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public Guid InvoiceId { get; init; }
    public string InvoiceCode { get; init; } = string.Empty;
    public Guid PatientId { get; init; }
    public string PatientCode { get; init; } = string.Empty;
    public string PatientName { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public PaymentMethod Method { get; init; }
    public DateTime CollectedAt { get; init; }
    public string CollectedByName { get; init; } = string.Empty;
    public ReceiptStatus Status { get; init; }
    public string? CancelReason { get; init; }
    public DateTime? CancelledAt { get; init; }
}

public sealed class ReceiptQuery : PaginationQuery
{
    public string? From { get; set; }
    public string? To { get; set; }
    public PaymentMethod? Method { get; set; }
    public ReceiptStatus? Status { get; set; }
    public Guid? PatientId { get; set; }
}

/// <summary>Kết quả tạo có chống bấm trùng: <c>Created = false</c> khi trả bản ghi cũ theo <c>ClientRequestId</c>.</summary>
public sealed record CreateResult<T>(T Value, bool Created);
