using Domain.Entities.Clinic.Visits;
using Domain.Entities.Finance.Invoices;
using Domain.Entities.Finance.Receipts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations.Finance;

public sealed class InvoiceConfiguration : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> builder)
    {
        builder.ToTable("Finance_Invoices");
        builder.Ignore(x => x.Debt);
        builder.Property(x => x.Code).HasMaxLength(Invoice.CodeMaxLength).IsRequired();
        builder.Property(x => x.Total).HasPrecision(18, 2);
        builder.Property(x => x.MedicineTotal).HasPrecision(18, 2);
        builder.Property(x => x.Paid).HasPrecision(18, 2);
        builder.HasIndex(x => x.Code).IsUnique();
        builder.HasIndex(x => x.VisitId);
        builder.HasIndex(x => x.PatientId);
        builder.HasOne<Visit>().WithMany().HasForeignKey(x => x.VisitId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Patient).WithMany().HasForeignKey(x => x.PatientId).OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(x => x.Lines).WithOne().HasForeignKey(x => x.InvoiceId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(x => x.Receipts).WithOne(x => x.Invoice).HasForeignKey(x => x.InvoiceId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class InvoiceLineConfiguration : IEntityTypeConfiguration<InvoiceLine>
{
    public void Configure(EntityTypeBuilder<InvoiceLine> builder)
    {
        builder.ToTable("Finance_InvoiceLines");
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Description).HasMaxLength(InvoiceLine.DescriptionMaxLength).IsRequired();
        builder.Property(x => x.Note).HasMaxLength(InvoiceLine.NoteMaxLength);
        builder.Property(x => x.UnitPrice).HasPrecision(18, 2);
        builder.Property(x => x.Discount).HasPrecision(18, 2);
        builder.Property(x => x.Amount).HasPrecision(18, 2);
    }
}

public sealed class ReceiptConfiguration : IEntityTypeConfiguration<Receipt>
{
    public void Configure(EntityTypeBuilder<Receipt> builder)
    {
        builder.ToTable("Finance_Receipts");
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Code).HasMaxLength(Receipt.CodeMaxLength).IsRequired();
        builder.Property(x => x.Amount).HasPrecision(18, 2);
        builder.Property(x => x.CashReceived).HasPrecision(18, 2);
        builder.Property(x => x.ChangeAmount).HasPrecision(18, 2);
        builder.Property(x => x.PartialReason).HasMaxLength(Receipt.ReasonMaxLength);
        builder.Property(x => x.CancelReason).HasMaxLength(Receipt.ReasonMaxLength);
        builder.Property(x => x.CollectedByName).HasMaxLength(Receipt.NameMaxLength).IsRequired();
        builder.Property(x => x.CancelledByName).HasMaxLength(Receipt.NameMaxLength);
        builder.Property(x => x.ClientRequestId).HasMaxLength(Receipt.ClientRequestIdMaxLength);
        builder.HasIndex(x => x.Code).IsUnique();
        builder.HasIndex(x => x.ClientRequestId).IsUnique();
        builder.HasIndex(x => x.CollectedAt);
    }
}
