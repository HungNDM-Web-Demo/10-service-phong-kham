using Domain.Base;
using Domain.Entities.Clinic.Patients;
using Domain.Entities.Finance.Receipts;
using Domain.Enums.Finance;

namespace Domain.Entities.Finance.Invoices;

/// <summary>Phiếu thanh toán của lượt khám (06 §4 <c>Finance_Invoices</c>, FR-31). Còn nợ = <see cref="Total"/> − <see cref="Paid"/>.</summary>
public class Invoice : BaseEntity, ICreationTracked, IModificationTracked, IAuditLogExempt
{
    public const int CodeMaxLength = 20;

    public string Code { get; set; } = string.Empty;
    public Guid VisitId { get; set; }
    public Guid PatientId { get; set; }
    public Patient? Patient { get; set; }
    public Guid DoctorId { get; set; }
    public decimal Total { get; set; }
    public decimal MedicineTotal { get; set; }
    public decimal Paid { get; set; }
    public InvoiceStatus Status { get; set; }
    public DateTime? CancelledAt { get; set; }
    public List<InvoiceLine> Lines { get; set; } = [];
    public List<Receipt> Receipts { get; set; } = [];

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    public decimal Debt => Status is InvoiceStatus.ChoThu or InvoiceStatus.ThuMotPhan ? Total - Paid : 0;

    public void SetCreatedAt(DateTime value) => CreatedAt = value;
}
