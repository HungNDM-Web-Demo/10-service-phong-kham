using Application.DTOs.Settings;
using Application.Validators.Common;
using Domain.Entities.System.Settings;
using FluentValidation;

namespace Application.Validators.Settings;

public sealed class UpdateSettingsRequestValidator : AppValidator<UpdateSettingsRequest>
{
    public UpdateSettingsRequestValidator()
    {
        RuleFor(x => x.Items)
            .NotEmpty().WithMessage("Không có cài đặt nào để lưu.")
            .Must(items => items.Select(i => i.Key?.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).Count() == items.Count)
            .WithMessage("Một khóa cài đặt xuất hiện nhiều lần.");

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.Key)
                .NotEmpty().WithMessage("Khóa cài đặt không được để trống.")
                .MaximumLength(Setting.KeyMaxLength).WithMessage($"Khóa cài đặt tối đa {Setting.KeyMaxLength} ký tự.");

            item.RuleFor(i => i.Value)
                .NotNull().WithMessage("Giá trị không được để trống.")
                .MaximumLength(Setting.ValueMaxLength).WithMessage($"Giá trị tối đa {Setting.ValueMaxLength} ký tự.");

            // Khóa riêng của phòng khám (docs/06 §3), cùng quy tắc với FE config/setting-labels.ts
            item.RuleFor(i => i.Value)
                .Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Nhập tên phòng khám.")
                .When(i => i.Key == "Clinic.Name");
            item.RuleFor(i => i.Value)
                .Matches(@"^\d{6}$").WithMessage("Mã ngân hàng gồm 6 chữ số.")
                .When(i => i.Key == "Clinic.BankBin" && !string.IsNullOrWhiteSpace(i.Value));
            item.RuleFor(i => i.Value)
                .Matches(@"^\d{6,19}$").WithMessage("Số tài khoản gồm 6 đến 19 chữ số.")
                .When(i => i.Key == "Clinic.BankAccount" && !string.IsNullOrWhiteSpace(i.Value));
            item.RuleFor(i => i.Value)
                .Matches("^[A-Za-z0-9]{4,32}$").WithMessage("Mã màn hình sảnh gồm 4 đến 32 chữ cái hoặc số.")
                .When(i => i.Key == "Clinic.DisplayCode");
            item.RuleFor(i => i.Value)
                .Must(v => v is "1" or "2" or "3").WithMessage("Số ngày nhắc trước là 1, 2 hoặc 3.")
                .When(i => i.Key == "Clinic.FollowUpRemindDays");
        });
    }
}
