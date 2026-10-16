using Domain.Entities.Clinic;
using Domain.Entities.Clinic.Services;
using Domain.Entities.Clinic.Visits;
using Domain.Entities.Finance.Invoices;
using Domain.Enums.Clinic;
using Domain.Enums.Finance;

namespace Infrastructure.Implementations.Services.Clinic;

/// <summary>
/// Lập dòng phiếu thanh toán khi kết thúc khám (07 §3.7 bước 3, BR-20, BR-21). Dùng chung cho service và dữ liệu mẫu.
/// </summary>
internal static class InvoiceBuilder
{
    /// <param name="examService">Dịch vụ khám của chuyên khoa bác sĩ (null thì không có dòng phí khám).</param>
    /// <param name="outsideMedicineIds">Dòng thuốc mua ngoài (dữ liệu mẫu), theo MedicineId.</param>
    public static List<InvoiceLine> BuildLines(
        bool isFollowUp,
        Service? examService,
        IEnumerable<VisitOrder> orders,
        IEnumerable<PrescriptionLine> prescription,
        IReadOnlyCollection<Guid>? outsideMedicineIds = null)
    {
        var lines = new List<InvoiceLine>();
        var order = 0;
        if (examService is not null)
        {
            var price = isFollowUp ? 0 : examService.Price;
            lines.Add(Line(InvoiceLineKind.PhiKham, RevenueGroup.Kham, examService.Id, examService.Name,
                isFollowUp ? ClinicRules.FollowUpFreeNote : null, price, 1, 0, false, order++));
        }

        foreach (var o in orders.Where(o => o.Status != OrderStatus.KhongThucHien).OrderBy(o => o.SortOrder))
        {
            var teeth = ClinicRules.TeethLabel(o.Teeth);
            var description = teeth.Length > 0 ? $"{o.ServiceName} ({teeth})" : o.ServiceName;
            lines.Add(Line(InvoiceLineKind.DichVu, GroupOf(o.Group), o.Id, description, null, o.UnitPrice, o.Quantity, o.Discount, false, order++));
        }

        foreach (var p in prescription.OrderBy(p => p.SortOrder))
        {
            var name = string.IsNullOrWhiteSpace(p.Strength) || p.Name.Contains(p.Strength.Trim(), StringComparison.OrdinalIgnoreCase) ? p.Name : $"{p.Name} {p.Strength}";
            var outside = outsideMedicineIds?.Contains(p.MedicineId) == true;
            lines.Add(Line(InvoiceLineKind.Thuoc, RevenueGroup.Thuoc, p.Id, name, null, p.UnitPrice, p.Quantity, 0, outside, order++));
        }

        return lines;
    }

    /// <summary>Tổng phải thu và tổng tiền thuốc, không gồm dòng mua ngoài (BR-21).</summary>
    public static (decimal Total, decimal MedicineTotal) Totals(IEnumerable<InvoiceLine> lines)
    {
        var counted = lines.Where(l => !l.IsOutside).ToList();
        return (counted.Sum(l => l.Amount), counted.Where(l => l.Kind == InvoiceLineKind.Thuoc).Sum(l => l.Amount));
    }

    public static RevenueGroup GroupOf(ServiceGroup group) => group switch
    {
        ServiceGroup.Kham => RevenueGroup.Kham,
        ServiceGroup.ThuThuat => RevenueGroup.ThuThuat,
        _ => RevenueGroup.CanLamSang
    };

    private static InvoiceLine Line(InvoiceLineKind kind, RevenueGroup group, Guid? refId, string description, string? note,
        decimal unitPrice, int quantity, decimal discount, bool outside, int sortOrder) => new()
    {
        Kind = kind,
        ReportGroup = group,
        RefId = refId,
        Description = description.Length > InvoiceLine.DescriptionMaxLength ? description[..InvoiceLine.DescriptionMaxLength] : description,
        Note = note,
        UnitPrice = unitPrice,
        Quantity = quantity,
        Discount = discount,
        Amount = unitPrice * quantity - discount,
        IsOutside = outside,
        SortOrder = sortOrder
    };
}
