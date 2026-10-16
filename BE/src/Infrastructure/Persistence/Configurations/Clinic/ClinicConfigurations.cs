using Domain.Entities.Clinic.Diagnoses;
using Domain.Entities.Clinic.FollowUps;
using Domain.Entities.Clinic.Medicines;
using Domain.Entities.Clinic.Messages;
using Domain.Entities.Clinic.Patients;
using Domain.Entities.Clinic.Services;
using Domain.Entities.Clinic.Specialties;
using Domain.Entities.Clinic.TreatmentPlans;
using Domain.Entities.Clinic.Visits;
using Domain.Entities.System.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations.Clinic;

public sealed class SpecialtyConfiguration : IEntityTypeConfiguration<Specialty>
{
    public void Configure(EntityTypeBuilder<Specialty> builder)
    {
        builder.ToTable("Clinic_Specialties");
        builder.Property(x => x.Code).HasMaxLength(Specialty.CodeMaxLength).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(Specialty.NameMaxLength).IsRequired();
        builder.HasIndex(x => x.Code).IsUnique();
        builder.HasOne(x => x.ExamService).WithMany().HasForeignKey(x => x.ExamServiceId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ServiceConfiguration : IEntityTypeConfiguration<Service>
{
    public void Configure(EntityTypeBuilder<Service> builder)
    {
        builder.ToTable("Clinic_Services");
        builder.Property(x => x.Code).HasMaxLength(Service.CodeMaxLength).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(Service.NameMaxLength).IsRequired();
        builder.Property(x => x.Price).HasPrecision(18, 2);
        builder.HasIndex(x => x.Code).IsUnique();
        builder.HasOne<Specialty>().WithMany().HasForeignKey(x => x.SpecialtyId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class MedicineConfiguration : IEntityTypeConfiguration<Medicine>
{
    public void Configure(EntityTypeBuilder<Medicine> builder)
    {
        builder.ToTable("Clinic_Medicines");
        builder.Property(x => x.Code).HasMaxLength(Medicine.CodeMaxLength).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(Medicine.NameMaxLength).IsRequired();
        builder.Property(x => x.ActiveIngredient).HasMaxLength(Medicine.IngredientMaxLength).IsRequired();
        builder.Property(x => x.Strength).HasMaxLength(Medicine.ShortTextMaxLength);
        builder.Property(x => x.DosageForm).HasMaxLength(Medicine.ShortTextMaxLength);
        builder.Property(x => x.Unit).HasMaxLength(Medicine.UnitMaxLength).IsRequired();
        builder.Property(x => x.Price).HasPrecision(18, 2);
        builder.HasIndex(x => x.Code).IsUnique();
    }
}

public sealed class DiagnosisTemplateConfiguration : IEntityTypeConfiguration<DiagnosisTemplate>
{
    public void Configure(EntityTypeBuilder<DiagnosisTemplate> builder)
    {
        builder.ToTable("Clinic_DiagnosisTemplates");
        builder.Property(x => x.IcdCode).HasMaxLength(DiagnosisTemplate.IcdMaxLength).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(DiagnosisTemplate.NameMaxLength).IsRequired();
        builder.HasIndex(x => x.IcdCode).IsUnique();
        builder.HasOne<Specialty>().WithMany().HasForeignKey(x => x.SpecialtyId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class PatientConfiguration : IEntityTypeConfiguration<Patient>
{
    public void Configure(EntityTypeBuilder<Patient> builder)
    {
        builder.ToTable("Clinic_Patients");
        builder.Property(x => x.Code).HasMaxLength(Patient.CodeMaxLength).IsRequired();
        builder.Property(x => x.FullName).HasMaxLength(Patient.NameMaxLength).IsRequired();
        builder.Property(x => x.Phone).HasMaxLength(Patient.PhoneMaxLength).IsRequired();
        builder.Property(x => x.Address).HasMaxLength(Patient.AddressMaxLength);
        builder.Property(x => x.ContactPerson).HasMaxLength(Patient.ContactMaxLength);
        builder.Property(x => x.Allergies).HasMaxLength(Patient.AllergiesMaxLength);
        builder.Property(x => x.MedicalHistory).HasMaxLength(Patient.HistoryMaxLength);
        builder.Property(x => x.Note).HasMaxLength(Patient.NoteMaxLength);
        builder.HasIndex(x => x.Code).IsUnique();
        builder.HasIndex(x => x.Phone);
    }
}

public sealed class VisitConfiguration : IEntityTypeConfiguration<Visit>
{
    public void Configure(EntityTypeBuilder<Visit> builder)
    {
        builder.ToTable("Clinic_Visits");
        builder.Property(x => x.Code).HasMaxLength(Visit.CodeMaxLength).IsRequired();
        builder.Property(x => x.Reason).HasMaxLength(Visit.ReasonMaxLength);
        builder.Property(x => x.PriorityReason).HasMaxLength(Visit.PriorityReasonMaxLength);
        builder.Property(x => x.CallReason).HasMaxLength(Visit.CallReasonMaxLength);
        builder.Property(x => x.CancelReason).HasMaxLength(Visit.CancelReasonMaxLength);
        builder.Property(x => x.CheckedInByName).HasMaxLength(100);
        builder.Property(x => x.Symptoms).HasMaxLength(Visit.LongTextMaxLength);
        builder.Property(x => x.Examination).HasMaxLength(Visit.LongTextMaxLength);
        builder.Property(x => x.Advice).HasMaxLength(Visit.AdviceMaxLength);
        builder.Property(x => x.FollowUpNote).HasMaxLength(Visit.FollowUpNoteMaxLength);
        builder.Property(x => x.Temperature).HasPrecision(4, 1);
        builder.Property(x => x.Weight).HasPrecision(5, 1);
        builder.HasIndex(x => x.Code).IsUnique();
        builder.HasIndex(x => new { x.DoctorId, x.Date });
        builder.HasIndex(x => x.PatientId);
        builder.HasIndex(x => x.AppointmentId).IsUnique();
        builder.HasOne(x => x.Patient).WithMany().HasForeignKey(x => x.PatientId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Doctor).WithMany().HasForeignKey(x => x.DoctorId).OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(x => x.Diagnoses).WithOne().HasForeignKey(x => x.VisitId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(x => x.Orders).WithOne().HasForeignKey(x => x.VisitId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(x => x.Prescription).WithOne().HasForeignKey(x => x.VisitId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class VisitDiagnosisConfiguration : IEntityTypeConfiguration<VisitDiagnosis>
{
    public void Configure(EntityTypeBuilder<VisitDiagnosis> builder)
    {
        builder.ToTable("Clinic_VisitDiagnoses");
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.IcdCode).HasMaxLength(VisitDiagnosis.IcdMaxLength);
        builder.Property(x => x.Name).HasMaxLength(VisitDiagnosis.NameMaxLength).IsRequired();
    }
}

public sealed class VisitOrderConfiguration : IEntityTypeConfiguration<VisitOrder>
{
    public void Configure(EntityTypeBuilder<VisitOrder> builder)
    {
        builder.ToTable("Clinic_VisitOrders");
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.ServiceCode).HasMaxLength(VisitOrder.CodeMaxLength).IsRequired();
        builder.Property(x => x.ServiceName).HasMaxLength(VisitOrder.NameMaxLength).IsRequired();
        builder.Property(x => x.Teeth).HasMaxLength(VisitOrder.TeethMaxLength);
        builder.Property(x => x.Result).HasMaxLength(VisitOrder.ResultMaxLength);
        builder.Property(x => x.UnitPrice).HasPrecision(18, 2);
        builder.Property(x => x.Discount).HasPrecision(18, 2);
        builder.HasIndex(x => x.TreatmentPlanItemId);
        builder.HasOne<Service>().WithMany().HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class PrescriptionLineConfiguration : IEntityTypeConfiguration<PrescriptionLine>
{
    public void Configure(EntityTypeBuilder<PrescriptionLine> builder)
    {
        builder.ToTable("Clinic_PrescriptionLines");
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.MedicineCode).HasMaxLength(PrescriptionLine.CodeMaxLength).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(PrescriptionLine.NameMaxLength).IsRequired();
        builder.Property(x => x.Strength).HasMaxLength(PrescriptionLine.ShortTextMaxLength);
        builder.Property(x => x.Unit).HasMaxLength(PrescriptionLine.ShortTextMaxLength).IsRequired();
        builder.Property(x => x.ActiveIngredient).HasMaxLength(Medicine.IngredientMaxLength).IsRequired();
        builder.Property(x => x.Usage).HasMaxLength(PrescriptionLine.UsageMaxLength).IsRequired();
        builder.Property(x => x.AllergyConfirmedByName).HasMaxLength(PrescriptionLine.NameByMaxLength);
        builder.Property(x => x.UnitPrice).HasPrecision(18, 2);
        builder.HasIndex(x => new { x.VisitId, x.MedicineId }).IsUnique();
        builder.HasOne<Medicine>().WithMany().HasForeignKey(x => x.MedicineId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class UsagePhraseConfiguration : IEntityTypeConfiguration<UsagePhrase>
{
    public void Configure(EntityTypeBuilder<UsagePhrase> builder)
    {
        builder.ToTable("Clinic_UsagePhrases");
        builder.Property(x => x.Text).HasMaxLength(UsagePhrase.TextMaxLength).IsRequired();
        builder.HasIndex(x => new { x.UserId, x.Text }).IsUnique();
        builder.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class TreatmentPlanConfiguration : IEntityTypeConfiguration<TreatmentPlan>
{
    public void Configure(EntityTypeBuilder<TreatmentPlan> builder)
    {
        builder.ToTable("Clinic_TreatmentPlans");
        builder.Property(x => x.Code).HasMaxLength(TreatmentPlan.CodeMaxLength).IsRequired();
        builder.Property(x => x.Note).HasMaxLength(TreatmentPlan.NoteMaxLength);
        builder.Property(x => x.CancelReason).HasMaxLength(TreatmentPlan.ReviewNoteMaxLength);
        builder.Property(x => x.ReviewNote).HasMaxLength(TreatmentPlan.ReviewNoteMaxLength);
        builder.Property(x => x.ReviewedByName).HasMaxLength(TreatmentPlan.NameMaxLength);
        builder.Property(x => x.CreatedByName).HasMaxLength(TreatmentPlan.NameMaxLength);
        builder.Property(x => x.SubTotal).HasPrecision(18, 2);
        builder.Property(x => x.DiscountTotal).HasPrecision(18, 2);
        builder.Property(x => x.Total).HasPrecision(18, 2);
        builder.HasIndex(x => x.Code).IsUnique();
        builder.HasIndex(x => x.PatientId);
        builder.HasOne(x => x.Patient).WithMany().HasForeignKey(x => x.PatientId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Doctor).WithMany().HasForeignKey(x => x.DoctorId).OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(x => x.Items).WithOne().HasForeignKey(x => x.PlanId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class TreatmentPlanItemConfiguration : IEntityTypeConfiguration<TreatmentPlanItem>
{
    public void Configure(EntityTypeBuilder<TreatmentPlanItem> builder)
    {
        builder.ToTable("Clinic_TreatmentPlanItems");
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.ServiceCode).HasMaxLength(TreatmentPlanItem.CodeMaxLength).IsRequired();
        builder.Property(x => x.ServiceName).HasMaxLength(TreatmentPlanItem.NameMaxLength).IsRequired();
        builder.Property(x => x.Teeth).HasMaxLength(TreatmentPlanItem.TeethMaxLength);
        builder.Property(x => x.UnitPrice).HasPrecision(18, 2);
        builder.Property(x => x.DiscountValue).HasPrecision(18, 2);
        builder.Property(x => x.DiscountAmount).HasPrecision(18, 2);
        builder.Property(x => x.Amount).HasPrecision(18, 2);
        builder.HasOne<Service>().WithMany().HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class FollowUpConfiguration : IEntityTypeConfiguration<FollowUp>
{
    public void Configure(EntityTypeBuilder<FollowUp> builder)
    {
        builder.ToTable("Clinic_FollowUps");
        builder.Property(x => x.Note).HasMaxLength(FollowUp.NoteMaxLength);
        builder.Property(x => x.CallNote).HasMaxLength(FollowUp.NoteMaxLength);
        builder.HasIndex(x => x.DueDate);
        builder.HasIndex(x => x.PatientId);
        builder.HasOne(x => x.Patient).WithMany().HasForeignKey(x => x.PatientId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Doctor).WithMany().HasForeignKey(x => x.DoctorId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Visit>().WithMany().HasForeignKey(x => x.VisitId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class MessageConfiguration : IEntityTypeConfiguration<Message>
{
    public void Configure(EntityTypeBuilder<Message> builder)
    {
        builder.ToTable("Clinic_Messages");
        builder.Property(x => x.Phone).HasMaxLength(Message.PhoneMaxLength).IsRequired();
        builder.Property(x => x.Content).HasMaxLength(Message.ContentMaxLength).IsRequired();
        builder.HasIndex(x => x.AppointmentId);
        builder.HasIndex(x => x.FollowUpId);
    }
}
