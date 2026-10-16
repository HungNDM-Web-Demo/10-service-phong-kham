using System.Text.RegularExpressions;
using Application.Common.Time;
using Application.DTOs.Booking;
using Application.DTOs.Clinic;
using Application.DTOs.Finance;
using Application.Validators.Common;
using Domain.Entities.Booking.Appointments;
using Domain.Entities.Booking.DaysOff;
using Domain.Entities.Booking.Doctors;
using Domain.Entities.Clinic;
using Domain.Entities.Clinic.Diagnoses;
using Domain.Entities.Clinic.FollowUps;
using Domain.Entities.Clinic.Medicines;
using Domain.Entities.Clinic.Patients;
using Domain.Entities.Clinic.Services;
using Domain.Entities.Clinic.TreatmentPlans;
using Domain.Entities.Clinic.Visits;
using Domain.Entities.Finance.Receipts;
using Domain.Enums.Booking;
using Domain.Enums.Clinic;
using FluentValidation;

namespace Application.Validators.Clinic;

/// <summary>Quy tắc dùng chung của dự án Phòng khám.</summary>
public static partial class ClinicValidationRules
{
    /// <summary>Mã danh mục: 2–10 ký tự in hoa không dấu hoặc số, vd NK13, T081, BS06.</summary>
    public static IRuleBuilderOptions<T, string?> CatalogCode<T>(this IRuleBuilder<T, string?> rule, string label) =>
        rule.NotEmpty().WithMessage($"Nhập {label}")
            .Must(v => v is not null && CodeRegex().IsMatch(v.Trim())).WithMessage($"{char.ToUpper(label[0])}{label[1..]} gồm 2–10 chữ in hoa không dấu hoặc số");

    /// <summary>BR-03: 10 chữ số, đầu số di động Việt Nam.</summary>
    public static IRuleBuilderOptions<T, string?> VnPhone<T>(this IRuleBuilder<T, string?> rule) =>
        rule.NotEmpty().WithMessage("Nhập số điện thoại")
            .Must(v => v is not null && IsPhone(v)).WithMessage("Số điện thoại gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09");

    public static IRuleBuilderOptions<T, string?> IsoDate<T>(this IRuleBuilder<T, string?> rule, string label) =>
        rule.NotEmpty().WithMessage($"Chọn {label}")
            .Must(v => VietnamDates.TryParse(v, out _)).WithMessage($"{char.ToUpper(label[0])}{label[1..]} không hợp lệ");

    public static IRuleBuilderOptions<T, string?> PersonName<T>(this IRuleBuilder<T, string?> rule) =>
        rule.NotEmpty().WithMessage("Nhập họ tên")
            .MaximumLength(Patient.NameMaxLength).WithMessage($"Họ tên tối đa {Patient.NameMaxLength} ký tự");

    public static bool IsPhone(string value) => PhoneRegex().IsMatch(Digits(value));

    /// <summary>Bỏ khoảng trắng, dấu chấm, gạch ngang của số điện thoại người dùng gõ.</summary>
    public static string Digits(string value) => NonDigitRegex().Replace(value, string.Empty);

    [GeneratedRegex("^[A-Z0-9]{2,10}$")]
    private static partial Regex CodeRegex();

    [GeneratedRegex("^0(3|5|7|8|9)[0-9]{8}$")]
    private static partial Regex PhoneRegex();

    [GeneratedRegex(@"[\s.\-]")]
    private static partial Regex NonDigitRegex();

    [GeneratedRegex(@"^[A-Z][0-9]{2}(\.[0-9A-Z]{1,2})?$")]
    public static partial Regex IcdRegex();
}

/// <summary>UC-01, E2.</summary>
public sealed class SaveServiceRequestValidator : AppValidator<SaveServiceRequest>
{
    public SaveServiceRequestValidator()
    {
        RuleFor(x => x.Code).CatalogCode("mã dịch vụ");
        RuleFor(x => x.Name).NotEmpty().WithMessage("Nhập tên dịch vụ")
            .MaximumLength(Service.NameMaxLength).WithMessage($"Tên dịch vụ tối đa {Service.NameMaxLength} ký tự");
        RuleFor(x => x.Group).IsInEnum().WithMessage("Chọn nhóm dịch vụ");
        RuleFor(x => x.Unit).IsInEnum().WithMessage("Chọn đơn vị tính");
        RuleFor(x => x.SpecialtyId).NotEmpty().WithMessage("Chọn chuyên khoa").When(x => x.Group == ServiceGroup.Kham);
        RuleFor(x => x.Price)
            .GreaterThanOrEqualTo(0).WithMessage("Giá không được âm")
            .Must(v => v % 1000 == 0).WithMessage("Giá là bội số 1.000 ₫");
    }
}

public sealed class SaveMedicineRequestValidator : AppValidator<SaveMedicineRequest>
{
    public SaveMedicineRequestValidator()
    {
        RuleFor(x => x.Code).CatalogCode("mã thuốc");
        RuleFor(x => x.Name).NotEmpty().WithMessage("Nhập tên thuốc")
            .MaximumLength(Medicine.NameMaxLength).WithMessage($"Tên thuốc tối đa {Medicine.NameMaxLength} ký tự");
        RuleFor(x => x.ActiveIngredient).NotEmpty().WithMessage("Nhập hoạt chất")
            .MaximumLength(Medicine.IngredientMaxLength).WithMessage($"Hoạt chất tối đa {Medicine.IngredientMaxLength} ký tự");
        RuleFor(x => x.Strength).MaximumLength(Medicine.ShortTextMaxLength).WithMessage($"Hàm lượng tối đa {Medicine.ShortTextMaxLength} ký tự");
        RuleFor(x => x.DosageForm).MaximumLength(Medicine.ShortTextMaxLength).WithMessage($"Dạng bào chế tối đa {Medicine.ShortTextMaxLength} ký tự");
        RuleFor(x => x.Unit).NotEmpty().WithMessage("Nhập đơn vị tính")
            .MaximumLength(Medicine.UnitMaxLength).WithMessage($"Đơn vị tính tối đa {Medicine.UnitMaxLength} ký tự");
        RuleFor(x => x.Price)
            .GreaterThan(0).WithMessage("Nhập giá lớn hơn 0")
            .Must(v => v % 100 == 0).WithMessage("Giá thuốc là bội số 100 ₫");
    }
}

public sealed class SaveDiagnosisTemplateRequestValidator : AppValidator<SaveDiagnosisTemplateRequest>
{
    public SaveDiagnosisTemplateRequestValidator()
    {
        RuleFor(x => x.IcdCode).NotEmpty().WithMessage("Nhập mã ICD-10")
            .Must(v => ClinicValidationRules.IcdRegex().IsMatch(v.Trim().ToUpperInvariant())).WithMessage("Mã ICD-10 dạng K02.1");
        RuleFor(x => x.Name).NotEmpty().WithMessage("Nhập tên chẩn đoán")
            .MaximumLength(DiagnosisTemplate.NameMaxLength).WithMessage($"Tên chẩn đoán tối đa {DiagnosisTemplate.NameMaxLength} ký tự");
    }
}

/// <summary>UC-02.</summary>
public sealed class SaveDoctorRequestValidator : AppValidator<SaveDoctorRequest>
{
    public SaveDoctorRequestValidator()
    {
        RuleFor(x => x.Code).CatalogCode("mã bác sĩ");
        RuleFor(x => x.FullName).NotEmpty().WithMessage("Nhập họ tên")
            .MaximumLength(Doctor.NameMaxLength).WithMessage($"Họ tên tối đa {Doctor.NameMaxLength} ký tự");
        RuleFor(x => x.Title).MaximumLength(Doctor.TitleMaxLength).WithMessage($"Học hàm, học vị tối đa {Doctor.TitleMaxLength} ký tự");
        RuleFor(x => x.SpecialtyId).NotEmpty().WithMessage("Chọn chuyên khoa");
        RuleFor(x => x.Room).NotEmpty().WithMessage("Nhập phòng khám")
            .MaximumLength(Doctor.RoomMaxLength).WithMessage($"Phòng tối đa {Doctor.RoomMaxLength} ký tự");
        RuleFor(x => x.PhotoUrl).MaximumLength(Doctor.PhotoUrlMaxLength);
        RuleFor(x => x.Bio).MaximumLength(Doctor.BioMaxLength).WithMessage($"Giới thiệu tối đa {Doctor.BioMaxLength} ký tự");
        RuleFor(x => x.SlotMinutes!.Value).Must(v => ClinicRules.SlotLengths.Contains(v)).WithMessage("Độ dài khung là 15, 20 hoặc 30 phút")
            .OverridePropertyName("slotMinutes").When(x => x.SlotMinutes.HasValue);
        RuleFor(x => x.MaxPerSlot!.Value).InclusiveBetween(1, 10).WithMessage("Số lịch tối đa mỗi khung từ 1 đến 10")
            .OverridePropertyName("maxPerSlot").When(x => x.MaxPerSlot.HasValue);
    }
}

/// <summary>UC-02 bước 3–5, E1.</summary>
public sealed class SaveScheduleRequestValidator : AppValidator<SaveScheduleRequest>
{
    public SaveScheduleRequestValidator()
    {
        RuleFor(x => x.SlotMinutes).Must(v => ClinicRules.SlotLengths.Contains(v)).WithMessage("Độ dài khung là 15, 20 hoặc 30 phút");
        RuleFor(x => x.MaxPerSlot).InclusiveBetween(1, 10).WithMessage("Số lịch tối đa mỗi khung từ 1 đến 10");
        RuleForEach(x => x.Hours).ChildRules(h =>
        {
            h.RuleFor(x => x.DayOfWeek).InclusiveBetween(1, 7).WithMessage("Thứ không hợp lệ");
            h.RuleFor(x => x.StartTime).Must(v => ClinicRules.TryParseHhmm(v, out _)).WithMessage("Giờ bắt đầu dạng HH:mm");
            h.RuleFor(x => x.EndTime).Must(v => ClinicRules.TryParseHhmm(v, out _)).WithMessage("Giờ kết thúc dạng HH:mm")
                .Must((x, v) => ClinicRules.TryParseHhmm(x.StartTime, out var s) && ClinicRules.TryParseHhmm(v, out var e) && e > s)
                .WithMessage("Giờ kết thúc phải sau giờ bắt đầu");
        });
        RuleFor(x => x.Hours).Custom((hours, context) =>
        {
            var parsed = hours
                .Select((h, index) => (h, index, ok: ClinicRules.TryParseHhmm(h.StartTime, out var s) & ClinicRules.TryParseHhmm(h.EndTime, out var e), s, e))
                .Where(x => x.ok && x.e > x.s)
                .ToList();
            foreach (var day in parsed.GroupBy(x => x.h.DayOfWeek))
            {
                var ordered = day.OrderBy(x => x.s).ToList();
                for (var n = 1; n < ordered.Count; n++)
                {
                    if (ordered[n].s < ordered[n - 1].e)
                        context.AddFailure($"hours[{ordered[n].index}].startTime", "Hai khoảng làm việc trong cùng thứ bị chồng nhau");
                }
            }
        });
    }
}

public sealed class CreateDayOffRequestValidator : AppValidator<CreateDayOffRequest>
{
    public CreateDayOffRequestValidator()
    {
        RuleFor(x => x.DoctorId).NotEmpty().WithMessage("Chọn bác sĩ");
        RuleFor(x => x.Date).IsoDate("ngày nghỉ");
        RuleFor(x => x.Part).IsInEnum().WithMessage("Chọn buổi nghỉ");
        RuleFor(x => x.Reason).NotEmpty().WithMessage("Nhập lý do nghỉ")
            .MaximumLength(DayOff.ReasonMaxLength).WithMessage($"Lý do tối đa {DayOff.ReasonMaxLength} ký tự");
    }
}

/// <summary>UC-07, BR-03.</summary>
public sealed class SavePatientRequestValidator : AppValidator<SavePatientRequest>
{
    public SavePatientRequestValidator()
    {
        RuleFor(x => x.FullName).PersonName();
        RuleFor(x => x.BirthDate).IsoDate("ngày sinh");
        RuleFor(x => x.Gender).IsInEnum().WithMessage("Chọn giới tính");
        RuleFor(x => x.Phone).VnPhone();
        RuleFor(x => x.Address).MaximumLength(Patient.AddressMaxLength).WithMessage($"Địa chỉ tối đa {Patient.AddressMaxLength} ký tự");
        RuleFor(x => x.ContactPerson).MaximumLength(Patient.ContactMaxLength).WithMessage($"Người liên hệ tối đa {Patient.ContactMaxLength} ký tự");
        RuleFor(x => x.Allergies).MaximumLength(Patient.AllergiesMaxLength).WithMessage($"Tiền sử dị ứng tối đa {Patient.AllergiesMaxLength} ký tự");
        RuleFor(x => x.MedicalHistory).MaximumLength(Patient.HistoryMaxLength).WithMessage($"Tiền sử bệnh tối đa {Patient.HistoryMaxLength} ký tự");
        RuleFor(x => x.Note).MaximumLength(Patient.NoteMaxLength).WithMessage($"Ghi chú tối đa {Patient.NoteMaxLength} ký tự");
    }
}

public sealed class NewPatientInputValidator : AppValidator<NewPatientInput>
{
    public NewPatientInputValidator()
    {
        RuleFor(x => x.FullName).PersonName();
        RuleFor(x => x.BirthDate).IsoDate("ngày sinh");
        RuleFor(x => x.Gender).IsInEnum().WithMessage("Chọn giới tính");
        RuleFor(x => x.Phone).VnPhone();
    }
}

/// <summary>UC-04.</summary>
public sealed class CreateAppointmentRequestValidator : AppValidator<CreateAppointmentRequest>
{
    public CreateAppointmentRequestValidator()
    {
        RuleFor(x => x.PatientId).NotEmpty().WithMessage("Chọn bệnh nhân").When(x => x.NewPatient is null);
        RuleFor(x => x.NewPatient!).SetValidator(new NewPatientInputValidator()).When(x => x.PatientId is null && x.NewPatient is not null);
        RuleFor(x => x.DoctorId).NotEmpty().WithMessage("Chọn bác sĩ");
        RuleFor(x => x.StartAt).NotEmpty().WithMessage("Chọn khung giờ");
        RuleFor(x => x.Reason).MaximumLength(Appointment.ReasonMaxLength).WithMessage($"Lý do khám tối đa {Appointment.ReasonMaxLength} ký tự");
        RuleFor(x => x.Note).MaximumLength(Appointment.NoteMaxLength).WithMessage($"Ghi chú tối đa {Appointment.NoteMaxLength} ký tự");
    }
}

public sealed class RescheduleRequestValidator : AppValidator<RescheduleRequest>
{
    public RescheduleRequestValidator()
    {
        RuleFor(x => x.DoctorId).NotEmpty().WithMessage("Chọn bác sĩ");
        RuleFor(x => x.StartAt).NotEmpty().WithMessage("Chọn khung giờ");
    }
}

public sealed class ConfirmAppointmentRequestValidator : AppValidator<ConfirmAppointmentRequest>
{
    public ConfirmAppointmentRequestValidator()
    {
        RuleFor(x => x.NewPatient!).SetValidator(new NewPatientInputValidator()).When(x => x.PatientId is null && x.NewPatient is not null);
    }
}

/// <summary>BR-06: hủy bắt buộc lý do, "Khác" kèm ghi chú.</summary>
public sealed class CancelAppointmentRequestValidator : AppValidator<CancelAppointmentRequest>
{
    public CancelAppointmentRequestValidator()
    {
        RuleFor(x => x.Reason).IsInEnum().WithMessage("Chọn lý do hủy");
        RuleFor(x => x.Note).NotEmpty().WithMessage("Nhập ghi chú cho lý do khác").When(x => x.Reason == AppointmentCancelReason.Khac);
        RuleFor(x => x.Note).MaximumLength(Appointment.CancelNoteMaxLength).WithMessage($"Ghi chú tối đa {Appointment.CancelNoteMaxLength} ký tự");
    }
}

/// <summary>UC-03, BR-03.</summary>
public sealed class PublicBookingRequestValidator : AppValidator<PublicBookingRequest>
{
    public PublicBookingRequestValidator()
    {
        RuleFor(x => x.SpecialtyId).NotEmpty().WithMessage("Chọn chuyên khoa");
        RuleFor(x => x.StartAt).NotEmpty().WithMessage("Chọn khung giờ");
        RuleFor(x => x.FullName).PersonName();
        RuleFor(x => x.Phone).VnPhone();
        RuleFor(x => x.BirthYear).InclusiveBetween(1900, 2100).WithMessage("Năm sinh không hợp lệ");
        RuleFor(x => x.Gender).IsInEnum().WithMessage("Chọn giới tính");
        RuleFor(x => x.Reason).MaximumLength(Appointment.ReasonMaxLength).WithMessage($"Lý do khám tối đa {Appointment.ReasonMaxLength} ký tự");
    }
}

public sealed class PublicLookupRequestValidator : AppValidator<PublicLookupRequest>
{
    public PublicLookupRequestValidator()
    {
        RuleFor(x => x.Code).NotEmpty().WithMessage("Nhập mã lịch hẹn").MaximumLength(Appointment.CodeMaxLength);
        RuleFor(x => x.Phone).NotEmpty().WithMessage("Nhập số điện thoại").MaximumLength(20);
    }
}

/// <summary>UC-05.</summary>
public sealed class CheckInRequestValidator : AppValidator<CheckInRequest>
{
    public CheckInRequestValidator()
    {
        RuleFor(x => x.PatientId).NotEmpty().WithMessage("Chọn bệnh nhân")
            .When(x => x.NewPatient is null && x.AppointmentId is null);
        RuleFor(x => x.NewPatient!).SetValidator(new NewPatientInputValidator()).When(x => x.PatientId is null && x.NewPatient is not null);
        RuleFor(x => x.DoctorId).NotEmpty().WithMessage("Chọn bác sĩ");
        RuleFor(x => x.Reason).MaximumLength(Visit.ReasonMaxLength).WithMessage($"Lý do khám tối đa {Visit.ReasonMaxLength} ký tự");
        RuleFor(x => x.PriorityReason).MaximumLength(Visit.PriorityReasonMaxLength);
    }
}

public sealed class CallVisitRequestValidator : AppValidator<CallVisitRequest>
{
    public CallVisitRequestValidator()
    {
        RuleFor(x => x.Reason).NotEmpty().WithMessage("Chọn lý do gọi trước")
            .MaximumLength(Visit.CallReasonMaxLength).WithMessage($"Lý do tối đa {Visit.CallReasonMaxLength} ký tự");
    }
}

public sealed class TransferVisitRequestValidator : AppValidator<TransferVisitRequest>
{
    public TransferVisitRequestValidator()
    {
        RuleFor(x => x.DoctorId).NotEmpty().WithMessage("Chọn bác sĩ");
    }
}

public sealed class ReasonRequestValidator : AppValidator<ReasonRequest>
{
    public ReasonRequestValidator()
    {
        RuleFor(x => x.Reason).NotEmpty().WithMessage("Nhập lý do")
            .MaximumLength(Receipt.ReasonMaxLength).WithMessage($"Lý do tối đa {Receipt.ReasonMaxLength} ký tự");
    }
}

/// <summary>07 §3.6, BR-16, BR-18.</summary>
public sealed class SaveVisitRequestValidator : AppValidator<SaveVisitRequest>
{
    public SaveVisitRequestValidator()
    {
        RuleFor(x => x.Temperature!.Value).InclusiveBetween(34.0m, 42.0m).WithMessage("Nhiệt độ từ 34,0 đến 42,0 °C")
            .OverridePropertyName("temperature").When(x => x.Temperature.HasValue);
        RuleFor(x => x.Pulse!.Value).InclusiveBetween(30, 220).WithMessage("Mạch từ 30 đến 220 lần/phút")
            .OverridePropertyName("pulse").When(x => x.Pulse.HasValue);
        RuleFor(x => x.BpSystolic!.Value).InclusiveBetween(60, 260).WithMessage("Huyết áp tâm thu từ 60 đến 260 mmHg")
            .OverridePropertyName("bpSystolic").When(x => x.BpSystolic.HasValue);
        RuleFor(x => x.BpDiastolic!.Value).InclusiveBetween(30, 160).WithMessage("Huyết áp tâm trương từ 30 đến 160 mmHg")
            .Must((x, v) => x.BpSystolic is null || v < x.BpSystolic).WithMessage("Huyết áp tâm trương phải nhỏ hơn tâm thu")
            .OverridePropertyName("bpDiastolic").When(x => x.BpDiastolic.HasValue);
        RuleFor(x => x.BpSystolic).NotNull().WithMessage("Nhập cả huyết áp tâm thu").When(x => x.BpDiastolic.HasValue);
        RuleFor(x => x.BpDiastolic).NotNull().WithMessage("Nhập cả huyết áp tâm trương").When(x => x.BpSystolic.HasValue);
        RuleFor(x => x.Weight!.Value).InclusiveBetween(1m, 250m).WithMessage("Cân nặng từ 1 đến 250 kg")
            .OverridePropertyName("weight").When(x => x.Weight.HasValue);
        RuleFor(x => x.Height!.Value).InclusiveBetween(30, 250).WithMessage("Chiều cao từ 30 đến 250 cm")
            .OverridePropertyName("height").When(x => x.Height.HasValue);
        RuleFor(x => x.Symptoms).MaximumLength(Visit.LongTextMaxLength).WithMessage($"Triệu chứng tối đa {Visit.LongTextMaxLength} ký tự");
        RuleFor(x => x.Examination).MaximumLength(Visit.LongTextMaxLength).WithMessage($"Khám lâm sàng tối đa {Visit.LongTextMaxLength} ký tự");
        RuleFor(x => x.Advice).MaximumLength(Visit.AdviceMaxLength).WithMessage($"Lời dặn tối đa {Visit.AdviceMaxLength} ký tự");
        RuleFor(x => x.FollowUpNote).MaximumLength(FollowUp.NoteMaxLength).WithMessage($"Ghi chú hẹn tối đa {FollowUp.NoteMaxLength} ký tự");
        RuleFor(x => x.FollowUpDate).Must(v => VietnamDates.TryParse(v, out _)).WithMessage("Ngày hẹn tái khám không hợp lệ")
            .When(x => !string.IsNullOrWhiteSpace(x.FollowUpDate));

        RuleFor(x => x.Diagnoses)
            .Must(d => d.Count(x => x.Kind == DiagnosisKind.Chinh) <= 1).WithMessage("Chỉ có một chẩn đoán chính")
            .Must(d => d.Count(x => x.Kind == DiagnosisKind.Phu) <= ClinicRules.MaxSecondaryDiagnoses).WithMessage($"Tối đa {ClinicRules.MaxSecondaryDiagnoses} chẩn đoán phụ");
        RuleForEach(x => x.Diagnoses).ChildRules(d =>
        {
            d.RuleFor(x => x.Kind).IsInEnum();
            d.RuleFor(x => x.Name).NotEmpty().WithMessage("Nhập tên chẩn đoán")
                .MaximumLength(VisitDiagnosis.NameMaxLength).WithMessage($"Tên chẩn đoán tối đa {VisitDiagnosis.NameMaxLength} ký tự");
            d.RuleFor(x => x.IcdCode).MaximumLength(VisitDiagnosis.IcdMaxLength);
        });

        RuleForEach(x => x.Orders).ChildRules(o =>
        {
            o.RuleFor(x => x.ServiceId).NotEmpty().WithMessage("Chọn dịch vụ");
            o.RuleFor(x => x.Quantity).InclusiveBetween(1, ClinicRules.MaxOrderQuantity).WithMessage($"Số lượng từ 1 đến {ClinicRules.MaxOrderQuantity}");
            o.RuleFor(x => x.Result).MaximumLength(VisitOrder.ResultMaxLength).WithMessage($"Kết quả tối đa {VisitOrder.ResultMaxLength} ký tự");
            o.RuleFor(x => x.ImageUrls).Must(v => v is null || v.Count <= ClinicRules.MaxImages).WithMessage($"Tối đa {ClinicRules.MaxImages} ảnh");
            o.RuleFor(x => x.Teeth).Must(t => t is null || t.All(ClinicRules.IsValidTooth)).WithMessage("Số răng không hợp lệ (11–48, 51–85)")
                .Must(t => t is null || t.Distinct().Count() == t.Count).WithMessage("Số răng bị trùng");
        });

        RuleFor(x => x.Prescription)
            .Must(lines => lines.Select(l => l.MedicineId).Distinct().Count() == lines.Count).WithMessage("Mỗi thuốc chỉ kê một dòng");
        RuleForEach(x => x.Prescription).ChildRules(l =>
        {
            l.RuleFor(x => x.MedicineId).NotEmpty().WithMessage("Chọn thuốc");
            l.RuleFor(x => x.Quantity).InclusiveBetween(1, ClinicRules.MaxMedicineQuantity).WithMessage($"Số lượng từ 1 đến {ClinicRules.MaxMedicineQuantity}");
            l.RuleFor(x => x.Days).InclusiveBetween(1, ClinicRules.MaxMedicineDays).WithMessage($"Số ngày dùng từ 1 đến {ClinicRules.MaxMedicineDays}");
            l.RuleFor(x => x.Usage).NotEmpty().WithMessage("Nhập cách dùng")
                .MaximumLength(PrescriptionLine.UsageMaxLength).WithMessage($"Cách dùng tối đa {PrescriptionLine.UsageMaxLength} ký tự");
        });
    }
}

public sealed class SaveUsagePhraseRequestValidator : AppValidator<SaveUsagePhraseRequest>
{
    public SaveUsagePhraseRequestValidator()
    {
        RuleFor(x => x.Text).NotEmpty().WithMessage("Nhập câu mẫu")
            .MaximumLength(UsagePhrase.TextMaxLength).WithMessage($"Câu mẫu tối đa {UsagePhrase.TextMaxLength} ký tự");
    }
}

/// <summary>UC-10, BR-22.</summary>
public sealed class SaveTreatmentPlanRequestValidator : AppValidator<SaveTreatmentPlanRequest>
{
    public SaveTreatmentPlanRequestValidator()
    {
        RuleFor(x => x.PatientId).NotEmpty().WithMessage("Chọn bệnh nhân");
        RuleFor(x => x.PlannedSessions).InclusiveBetween(1, 50).WithMessage("Số buổi dự kiến từ 1 đến 50");
        RuleFor(x => x.Note).MaximumLength(TreatmentPlan.NoteMaxLength).WithMessage($"Ghi chú tối đa {TreatmentPlan.NoteMaxLength} ký tự");
        RuleFor(x => x.Items).NotEmpty().WithMessage("Thêm ít nhất một hạng mục");
        RuleForEach(x => x.Items).ChildRules(i =>
        {
            i.RuleFor(x => x.ServiceId).NotEmpty().WithMessage("Chọn dịch vụ");
            i.RuleFor(x => x.Quantity).InclusiveBetween(1, ClinicRules.MaxOrderQuantity).WithMessage($"Số lượng từ 1 đến {ClinicRules.MaxOrderQuantity}");
            i.RuleFor(x => x.Teeth).Must(t => t is null || t.All(ClinicRules.IsValidTooth)).WithMessage("Số răng không hợp lệ (11–48, 51–85)")
                .Must(t => t is null || t.Distinct().Count() == t.Count).WithMessage("Số răng bị trùng");
            i.RuleFor(x => x.DiscountValue)
                .Must(v => v == Math.Floor(v) && v >= 0 && v <= ClinicRules.MaxItemDiscountPercent).WithMessage($"Giảm phần trăm là số nguyên từ 0 đến {ClinicRules.MaxItemDiscountPercent}")
                .When(x => x.DiscountType == DiscountType.PhanTram);
            i.RuleFor(x => x.DiscountValue)
                .GreaterThanOrEqualTo(0).WithMessage("Giảm giá không được âm")
                .Must(v => v % 1000 == 0).WithMessage("Giảm giá là bội số 1.000 ₫")
                .When(x => x.DiscountType == DiscountType.SoTien);
        });
    }
}

public sealed class PlanNoteRequestValidator : AppValidator<PlanNoteRequest>
{
    public PlanNoteRequestValidator()
    {
        RuleFor(x => x.Note).MaximumLength(TreatmentPlan.ReviewNoteMaxLength).WithMessage($"Ghi chú tối đa {TreatmentPlan.ReviewNoteMaxLength} ký tự");
    }
}

/// <summary>07 §3.9.</summary>
public sealed class CollectRequestValidator : AppValidator<CollectRequest>
{
    public CollectRequestValidator()
    {
        RuleFor(x => x.ClientRequestId).MaximumLength(Receipt.ClientRequestIdMaxLength);
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Nhập số tiền thu");
        RuleFor(x => x.Method).IsInEnum().WithMessage("Chọn phương thức");
        RuleFor(x => x.PartialReason).MaximumLength(Receipt.ReasonMaxLength).WithMessage($"Lý do tối đa {Receipt.ReasonMaxLength} ký tự");
        RuleFor(x => x.CashReceived).GreaterThanOrEqualTo(0).WithMessage("Tiền khách đưa không được âm");
    }
}

public sealed class SendFollowUpsRequestValidator : AppValidator<SendFollowUpsRequest>
{
    public SendFollowUpsRequestValidator()
    {
        RuleFor(x => x.Ids).NotEmpty().WithMessage("Chọn dòng nhắc").Must(v => v.Count <= 100).WithMessage("Gửi tối đa 100 dòng mỗi lần");
    }
}

public sealed class CallResultRequestValidator : AppValidator<CallResultRequest>
{
    public CallResultRequestValidator()
    {
        RuleFor(x => x.Result).IsInEnum().WithMessage("Chọn kết quả gọi");
        RuleFor(x => x.Note).MaximumLength(FollowUp.NoteMaxLength).WithMessage($"Ghi chú tối đa {FollowUp.NoteMaxLength} ký tự");
    }
}
