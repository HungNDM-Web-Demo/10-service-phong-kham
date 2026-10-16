using System.Globalization;
using Application.Common.Time;
using Application.DTOs.Booking;
using Application.DTOs.Clinic;
using Domain.Entities.Booking.Appointments;
using Domain.Entities.Booking.Doctors;
using Domain.Entities.Clinic;
using Domain.Entities.Clinic.Patients;
using Domain.Entities.Clinic.Visits;
using Domain.Entities.Finance.Invoices;
using Domain.Entities.Finance.Receipts;
using Domain.Enums.Booking;
using Domain.Enums.Clinic;
using Domain.Enums.Finance;

namespace Infrastructure.Implementations.Services.Clinic;

/// <summary>Chuyển entity sang DTO dùng chung giữa các service Phòng khám.</summary>
internal static class ClinicMappings
{
    public static string Iso(DateOnly date) => VietnamDates.Format(date);

    public static string? Iso(DateOnly? date) => date is { } d ? VietnamDates.Format(d) : null;

    public static PatientBrief ToBrief(this Patient p, DateOnly today) => new()
    {
        Id = p.Id,
        Code = p.Code,
        FullName = p.FullName,
        BirthDate = Iso(p.BirthDate),
        Age = ClinicRules.AgeOn(p.BirthDate, today),
        Gender = p.Gender,
        Phone = p.Phone,
        Allergies = p.Allergies
    };

    public static PatientDto ToDto(this Patient p, DateOnly today, PatientStats? stats = null) => new()
    {
        Id = p.Id,
        Code = p.Code,
        FullName = p.FullName,
        BirthDate = Iso(p.BirthDate),
        Age = ClinicRules.AgeOn(p.BirthDate, today),
        Gender = p.Gender,
        Phone = p.Phone,
        Address = p.Address,
        ContactPerson = p.ContactPerson,
        Allergies = p.Allergies,
        MedicalHistory = p.MedicalHistory,
        Note = p.Note,
        CreatedAt = p.CreatedAt,
        LastVisitAt = stats?.LastVisitAt,
        VisitCount = stats?.VisitCount ?? 0,
        Debt = stats?.Debt ?? 0,
        CanDelete = stats is { HasData: false }
    };

    public static string DoctorName(this Doctor d) => ClinicRules.DoctorShort(d.FullName);

    public static DoctorDto ToDto(this Doctor d, string? username)
    {
        var hours = d.Hours.OrderBy(h => h.DayOfWeek).ThenBy(h => h.StartMinute).ToList();
        return new DoctorDto
        {
            Id = d.Id,
            Code = d.Code,
            FullName = d.FullName,
            Title = d.Title,
            DisplayName = d.DoctorName(),
            SpecialtyId = d.SpecialtyId,
            SpecialtyName = d.Specialty?.Name ?? string.Empty,
            Room = d.Room,
            RoomShort = ClinicRules.RoomShort(d.Room),
            PhotoUrl = d.PhotoUrl,
            Bio = d.Bio,
            UserId = d.UserId,
            Username = username,
            SlotMinutes = d.SlotMinutes,
            MaxPerSlot = d.MaxPerSlot,
            ShowOnline = d.ShowOnline,
            IsActive = d.IsActive,
            SortOrder = d.SortOrder,
            Hours = hours.Select(h => new WorkingHourDto
            {
                DayOfWeek = h.DayOfWeek,
                StartTime = ClinicRules.Hhmm(h.StartMinute),
                EndTime = ClinicRules.Hhmm(h.EndMinute)
            }).ToList(),
            WeeklyHours = Math.Round(hours.Sum(h => h.EndMinute - h.StartMinute) / 60m, 1),
            SlotsPerDay = Enumerable.Range(1, 7)
                .Select(day => ClinicRules.Slots(hours.Where(h => h.DayOfWeek == day).Select(h => (h.StartMinute, h.EndMinute)), d.SlotMinutes, null).Count)
                .ToList()
        };
    }

    public static DoctorOption ToOption(this Doctor d) => new()
    {
        Id = d.Id,
        Code = d.Code,
        FullName = d.FullName,
        DisplayName = d.DoctorName(),
        SpecialtyId = d.SpecialtyId,
        SpecialtyName = d.Specialty?.Name ?? string.Empty,
        Room = d.Room,
        RoomShort = ClinicRules.RoomShort(d.Room),
        SlotMinutes = d.SlotMinutes,
        MaxPerSlot = d.MaxPerSlot
    };

    public static string PatientNameOf(this Appointment a) => a.Patient?.FullName ?? a.GuestName ?? string.Empty;

    public static string PatientPhoneOf(this Appointment a) => a.Patient?.Phone ?? a.GuestPhone ?? string.Empty;

    public static AppointmentCardDto ToCard(this Appointment a, string doctorName, string? serviceName) => new()
    {
        Id = a.Id,
        Code = a.Code,
        DoctorId = a.DoctorId,
        DoctorName = doctorName,
        Date = Iso(a.Date),
        StartAt = a.StartAt,
        EndAt = a.EndAt,
        Status = a.Status,
        Source = a.Source,
        PatientId = a.PatientId,
        PatientCode = a.Patient?.Code,
        PatientName = a.PatientNameOf(),
        PatientPhone = a.PatientPhoneOf(),
        IsGuest = a.PatientId is null,
        ServiceName = serviceName,
        Reason = a.Reason,
        CreatedAt = a.CreatedAt
    };

    public static AppointmentBrief ToBrief(this Appointment a, string doctorName) => new()
    {
        Id = a.Id,
        Code = a.Code,
        Date = Iso(a.Date),
        StartAt = a.StartAt,
        PatientName = a.PatientNameOf(),
        PatientPhone = a.PatientPhoneOf(),
        DoctorName = doctorName,
        Status = a.Status
    };

    public static bool IsActive(this AppointmentStatus status) => status is AppointmentStatus.ChoXacNhan or AppointmentStatus.DaXacNhan;

    public static bool IsOpen(this VisitStatus status) => status is VisitStatus.ChoKham or VisitStatus.DangKham or VisitStatus.ChoKetQua;

    /// <summary>Số phút đã chờ (07 §3.4): từ giờ xếp hàng ban đầu tới lúc bắt đầu khám, hoặc tới bây giờ khi chưa khám.</summary>
    public static int WaitMinutes(this Visit v, DateTime nowUtc)
    {
        var end = v.StartedAt ?? nowUtc;
        return Math.Max(0, (int)Math.Floor((end - v.InitialQueueAt).TotalMinutes));
    }

    public static QueueVisitDto ToQueueDto(this Visit v, Patient patient, Doctor doctor, DateTime? appointmentStartAt, DateTime nowUtc, DateOnly today) => new()
    {
        Id = v.Id,
        Code = v.Code,
        DoctorId = v.DoctorId,
        DoctorName = doctor.DoctorName(),
        QueueNumber = v.QueueNumber,
        Ticket = ClinicRules.Ticket(doctor.Room, v.QueueNumber),
        PatientId = v.PatientId,
        PatientCode = patient.Code,
        PatientName = patient.FullName,
        PatientPhone = patient.Phone,
        Age = ClinicRules.AgeOn(patient.BirthDate, today),
        Gender = patient.Gender,
        IsPriority = v.IsPriority,
        PriorityReason = v.PriorityReason,
        HasAppointment = v.AppointmentId is not null,
        AppointmentStartAt = appointmentStartAt,
        IsFollowUp = v.IsFollowUp,
        IsReturned = v.IsReturned,
        Status = v.Status,
        CheckedInAt = v.CheckedInAt,
        QueueAt = v.QueueAt,
        InitialQueueAt = v.InitialQueueAt,
        StartedAt = v.StartedAt,
        CalledAt = v.CalledAt,
        WaitMinutes = v.Status == VisitStatus.ChoKham ? v.WaitMinutes(nowUtc) : Math.Max(0, (int)Math.Floor(((v.StartedAt ?? nowUtc) - v.InitialQueueAt).TotalMinutes)),
        SkipCount = v.SkipCount,
        Reason = v.Reason
    };

    /// <summary>Thứ tự gọi (BR-09): quay lại trước, ưu tiên, rồi giờ xếp hàng, STT.</summary>
    public static IOrderedEnumerable<Visit> InCallOrder(this IEnumerable<Visit> list) =>
        list.OrderBy(v => ClinicRules.QueueGroup(v.IsReturned, v.IsPriority)).ThenBy(v => v.QueueAt).ThenBy(v => v.QueueNumber);

    public static InvoiceBrief ToBrief(this Invoice i) => new()
    {
        Id = i.Id,
        Code = i.Code,
        Total = i.Total,
        Paid = i.Paid,
        Debt = i.Debt,
        Status = i.Status
    };

    public static InvoiceStatus StatusFor(decimal total, decimal paid) =>
        paid <= 0 ? (total <= 0 ? InvoiceStatus.DaThuDu : InvoiceStatus.ChoThu) : paid >= total ? InvoiceStatus.DaThuDu : InvoiceStatus.ThuMotPhan;

    public static string Money(decimal amount) => amount.ToString("#,##0", CultureInfo.GetCultureInfo("vi-VN")) + " ₫";

    public static IReadOnlyList<int> TeethList(string? teeth) =>
        string.IsNullOrWhiteSpace(teeth)
            ? []
            : teeth.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(t => int.TryParse(t, out var n) ? n : 0).Where(n => n > 0).ToList();

    public static IReadOnlyList<string> ImageList(string? urls) =>
        string.IsNullOrWhiteSpace(urls) ? [] : urls.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    public static bool ValidReceipt(this Receipt r) => r.Status == ReceiptStatus.HopLe;
}

/// <summary>Chỉ số bệnh nhân tính khi đọc.</summary>
internal sealed record PatientStats(DateTime? LastVisitAt, int VisitCount, decimal Debt, bool HasData);
