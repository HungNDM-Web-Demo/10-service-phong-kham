using Domain.Base;
using Domain.Entities.Finance.Invoices;
using Domain.Enums.Finance;

namespace Domain.Entities.Finance.Receipts;

/// <summary>Phiếu thu (06 §4 <c>Finance_Receipts</c>, FR-32, BR-24, BR-25, BR-27).</summary>
public class Receipt : BaseEntity, ICreationTracked, IModificationTracked, IAuditLogExempt
{
    public const int CodeMaxLength = 20;
    public const int ReasonMaxLength = 200;
    public const int NameMaxLength = 100;
    public const int ClientRequestIdMaxLength = 64;

    public string Code { get; set; } = string.Empty;
    public Guid InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }
    public Guid PatientId { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod Method { get; set; }
    public decimal? CashReceived { get; set; }
    public decimal? ChangeAmount { get; set; }
    public string? PartialReason { get; set; }
    public DateTime CollectedAt { get; set; }
    public string CollectedByName { get; set; } = string.Empty;
    public ReceiptStatus Status { get; set; }
    public string? CancelReason { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancelledByName { get; set; }
    public string? ClientRequestId { get; set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    public void SetCreatedAt(DateTime value) => CreatedAt = value;
}
