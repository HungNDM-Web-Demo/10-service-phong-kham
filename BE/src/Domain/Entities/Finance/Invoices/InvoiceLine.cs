using Domain.Base;
using Domain.Enums.Finance;

namespace Domain.Entities.Finance.Invoices;

/// <summary>Dòng phiếu thanh toán (06 §4 <c>Finance_InvoiceLines</c>, BR-21).</summary>
public class InvoiceLine : BaseEntity, ICreationTracked, IAuditLogExempt
{
    public const int DescriptionMaxLength = 250;
    public const int NoteMaxLength = 100;

    public Guid InvoiceId { get; set; }
    public InvoiceLineKind Kind { get; set; }
    public RevenueGroup ReportGroup { get; set; }
    public Guid? RefId { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? Note { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal Discount { get; set; }
    public decimal Amount { get; set; }
    public bool IsOutside { get; set; }
    public int SortOrder { get; set; }

    public Guid? CreatedBy { get; set; }
}
