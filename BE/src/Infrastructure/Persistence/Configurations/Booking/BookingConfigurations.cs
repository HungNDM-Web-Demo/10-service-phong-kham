using Domain.Entities.Booking.Appointments;
using Domain.Entities.Booking.DaysOff;
using Domain.Entities.Booking.Doctors;
using Domain.Entities.Clinic.Services;
using Domain.Entities.System.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations.Booking;

public sealed class DoctorConfiguration : IEntityTypeConfiguration<Doctor>
{
    public void Configure(EntityTypeBuilder<Doctor> builder)
    {
        builder.ToTable("Booking_Doctors");
        builder.Property(x => x.Code).HasMaxLength(Doctor.CodeMaxLength).IsRequired();
        builder.Property(x => x.FullName).HasMaxLength(Doctor.NameMaxLength).IsRequired();
        builder.Property(x => x.Title).HasMaxLength(Doctor.TitleMaxLength);
        builder.Property(x => x.Room).HasMaxLength(Doctor.RoomMaxLength).IsRequired();
        builder.Property(x => x.PhotoUrl).HasMaxLength(Doctor.PhotoUrlMaxLength);
        builder.Property(x => x.Bio).HasMaxLength(Doctor.BioMaxLength);
        builder.HasIndex(x => x.Code).IsUnique();
        builder.HasIndex(x => x.UserId).IsUnique();
        builder.HasOne(x => x.Specialty).WithMany().HasForeignKey(x => x.SpecialtyId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.SetNull);
        builder.HasMany(x => x.Hours).WithOne().HasForeignKey(x => x.DoctorId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class WorkingHourConfiguration : IEntityTypeConfiguration<WorkingHour>
{
    public void Configure(EntityTypeBuilder<WorkingHour> builder)
    {
        builder.ToTable("Booking_WorkingHours");
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.HasIndex(x => new { x.DoctorId, x.DayOfWeek });
    }
}

public sealed class DayOffConfiguration : IEntityTypeConfiguration<DayOff>
{
    public void Configure(EntityTypeBuilder<DayOff> builder)
    {
        builder.ToTable("Booking_DaysOff");
        builder.Property(x => x.Reason).HasMaxLength(DayOff.ReasonMaxLength).IsRequired();
        builder.HasIndex(x => new { x.DoctorId, x.Date }).IsUnique();
        builder.HasOne<Doctor>().WithMany().HasForeignKey(x => x.DoctorId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class AppointmentConfiguration : IEntityTypeConfiguration<Appointment>
{
    public void Configure(EntityTypeBuilder<Appointment> builder)
    {
        builder.ToTable("Booking_Appointments");
        builder.Property(x => x.Code).HasMaxLength(Appointment.CodeMaxLength).IsRequired();
        builder.Property(x => x.GuestName).HasMaxLength(Appointment.NameMaxLength);
        builder.Property(x => x.GuestPhone).HasMaxLength(Appointment.PhoneMaxLength);
        builder.Property(x => x.Reason).HasMaxLength(Appointment.ReasonMaxLength);
        builder.Property(x => x.Note).HasMaxLength(Appointment.NoteMaxLength);
        builder.Property(x => x.CancelNote).HasMaxLength(Appointment.CancelNoteMaxLength);
        builder.Property(x => x.CreatedByName).HasMaxLength(Appointment.NameMaxLength);
        builder.Property(x => x.ConfirmedByName).HasMaxLength(Appointment.NameMaxLength);
        builder.Property(x => x.CancelledByName).HasMaxLength(Appointment.NameMaxLength);
        builder.HasIndex(x => x.Code).IsUnique();
        builder.HasIndex(x => new { x.DoctorId, x.Date });
        builder.HasIndex(x => x.PatientId);
        builder.HasIndex(x => x.GuestPhone);
        builder.HasOne(x => x.Doctor).WithMany().HasForeignKey(x => x.DoctorId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Patient).WithMany().HasForeignKey(x => x.PatientId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Service>().WithMany().HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Restrict);
    }
}
