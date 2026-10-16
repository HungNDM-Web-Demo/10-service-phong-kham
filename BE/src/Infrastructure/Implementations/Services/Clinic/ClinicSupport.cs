using Application.Common.Exceptions;
using Application.Common.Time;
using Application.DTOs.Booking;
using Application.DTOs.Clinic;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Clinic;
using Application.Validators.Clinic;
using Domain.Entities.Booking.Appointments;
using Domain.Entities.Booking.Doctors;
using Domain.Entities.Clinic;
using Domain.Entities.Clinic.Messages;
using Domain.Entities.Clinic.Patients;
using Domain.Enums.Clinic;
using Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Clinic;

/// <summary>Tạo hồ sơ bệnh nhân dùng chung (thêm nhanh khi tạo lịch, xác nhận lịch online, tiếp đón, màn Bệnh nhân).</summary>
internal static class ClinicPatients
{
    /// <summary>BR-14, BR-15, UC-07 E2, E3: trùng số điện thoại và ngày sinh thì 409 <c>TrungHoSo</c> trừ khi <paramref name="force"/>.</summary>
    public static async Task<Patient> CreateAsync(
        IClinicContext context,
        IGenericRepository<Patient> patients,
        PatientFields fields,
        bool force,
        string fieldPrefix,
        CancellationToken ct)
    {
        if (!VietnamDates.TryParse(fields.BirthDate, out var birth))
            throw FieldErrors.Single(fieldPrefix + "birthDate", "Ngày sinh không hợp lệ");
        if (birth > context.Today)
            throw FieldErrors.Single(fieldPrefix + "birthDate", "Ngày sinh không được sau hôm nay");
        var phone = ClinicValidationRules.Digits(fields.Phone);
        if (!force)
        {
            var exact = await patients.QueryNoTracking().Where(p => p.Phone == phone && p.BirthDate == birth).OrderBy(p => p.Code).ToListAsync(ct);
            if (exact.Count > 0)
            {
                throw ClinicProblems.Conflict(ClinicErrorCodes.TrungHoSo, "Có thể trùng hồ sơ", null, new Dictionary<string, object?>
                {
                    ["candidates"] = exact.Select(p => p.ToBrief(context.Today)).ToList()
                });
            }
        }

        var patient = new Patient
        {
            Code = await context.NextPatientCodeAsync(ct),
            FullName = NormalizeName(fields.FullName),
            BirthDate = birth,
            Gender = fields.Gender,
            Phone = phone,
            Address = Trim(fields.Address),
            ContactPerson = Trim(fields.ContactPerson),
            Allergies = Trim(fields.Allergies),
            MedicalHistory = Trim(fields.MedicalHistory),
            Note = Trim(fields.Note)
        };
        await patients.AddAsync(patient, ct);
        return patient;
    }

    public static PatientFields From(NewPatientInput input) => new(input.FullName, input.BirthDate, input.Gender, input.Phone, null, null, null, null, null);

    public static PatientFields From(SavePatientRequest r) => new(r.FullName, r.BirthDate, r.Gender, r.Phone, r.Address, r.ContactPerson, r.Allergies, r.MedicalHistory, r.Note);

    public static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    /// <summary>Gộp khoảng trắng thừa trong họ tên.</summary>
    public static string NormalizeName(string value) => string.Join(' ', value.Split(' ', StringSplitOptions.RemoveEmptyEntries));
}

internal sealed record PatientFields(
    string FullName,
    string BirthDate,
    Gender Gender,
    string Phone,
    string? Address,
    string? ContactPerson,
    string? Allergies,
    string? MedicalHistory,
    string? Note);

/// <summary>Tin nhắn giả lập (FR-12, BR-30, 07 §3.13). Không gửi ra ngoài, chỉ lưu để xem.</summary>
internal static class ClinicMessages
{
    public static Message Confirm(Appointment a, Doctor doctor, string clinicName, string phone, (DateOnly Date, int Minute) local, DateTime sentAt) => new()
    {
        Kind = MessageKind.XacNhanLich,
        Channel = MessageChannel.Zalo,
        Phone = phone,
        Content = ClinicRules.ConfirmMessage(clinicName, a.Code, local.Date, local.Minute, doctor.FullName, doctor.Room),
        SentAt = sentAt,
        AppointmentId = a.Id
    };

    public static Message Reminder(Appointment a, Doctor doctor, string clinicName, string hotline, string phone, (DateOnly Date, int Minute) local, DateTime sentAt) => new()
    {
        Kind = MessageKind.NhacLich,
        Channel = MessageChannel.Sms,
        Phone = phone,
        Content = ClinicRules.ReminderMessage(clinicName, a.Code, local.Date, local.Minute, doctor.FullName, hotline),
        SentAt = sentAt,
        AppointmentId = a.Id
    };

    public static MessageDto ToDto(this Message m) => new()
    {
        Id = m.Id,
        Kind = m.Kind,
        Channel = m.Channel,
        Phone = m.Phone,
        Content = m.Content,
        SentAt = m.SentAt
    };
}
