using Application.Common.Exceptions;
using Application.Common.Models;
using Application.Constants;
using Application.DTOs.Clinic;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Clinic;
using Domain.Entities.Booking.Doctors;
using Domain.Entities.Clinic;
using Domain.Entities.Clinic.Patients;
using Domain.Entities.Clinic.Services;
using Domain.Entities.Clinic.TreatmentPlans;
using Domain.Entities.Clinic.Visits;
using Domain.Entities.Finance.Invoices;
using Domain.Enums.Clinic;
using Domain.Enums.Finance;
using Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Clinic;

/// <summary>Kế hoạch điều trị (UC-10, BR-22, BR-23, 07 §3.11, §4.8).</summary>
public sealed class TreatmentPlanService(
    IClinicContext context,
    IGenericRepository<TreatmentPlan> plans,
    IGenericRepository<TreatmentPlanItem> items,
    IGenericRepository<Patient> patients,
    IGenericRepository<Service> services,
    IGenericRepository<VisitOrder> orders,
    IGenericRepository<Visit> visits,
    IGenericRepository<InvoiceLine> invoiceLines,
    IGenericRepository<Invoice> invoices,
    IUnitOfWork unitOfWork) : ITreatmentPlanService
{
    public async Task<PaginatedResult<TreatmentPlanListItem>> GetPagedAsync(TreatmentPlanQuery query, CancellationToken ct = default)
    {
        var source = plans.QueryNoTracking().Include(p => p.Patient).Include(p => p.Doctor).AsQueryable();
        if (query.Status is { } status)
            source = source.Where(p => p.Status == status);
        if (query.PatientId is { } patientId)
            source = source.Where(p => p.PatientId == patientId);
        if (query.DoctorId is { } doctorId)
            source = source.Where(p => p.DoctorId == doctorId);
        if (query.GetSearchTerm() is { } term)
        {
            var pattern = LikePattern.Contains(term);
            source = source.Where(p => AppDbFunctions.Matches(p.Code, pattern) || AppDbFunctions.Matches(p.Patient!.FullName, pattern)
                                       || AppDbFunctions.Matches(p.Patient!.Phone, pattern) || AppDbFunctions.Matches(p.Patient!.Code, pattern));
        }

        var page = await source.ApplySorting(query).ToPaginatedResultAsync(query, ct);
        var ids = page.Items.Select(p => p.Id).ToList();
        var itemRows = await items.QueryNoTracking().Where(i => ids.Contains(i.PlanId)).ToListAsync(ct);
        var paid = await PaidAsync(ids, ct);
        return page.Map(list => list.Select(p =>
        {
            var mine = itemRows.Where(i => i.PlanId == p.Id && i.Status != PlanItemStatus.DaHuy).ToList();
            var paidAmount = paid.GetValueOrDefault(p.Id);
            return new TreatmentPlanListItem
            {
                Id = p.Id,
                Code = p.Code,
                PatientId = p.PatientId,
                PatientCode = p.Patient!.Code,
                PatientName = p.Patient.FullName,
                PatientPhone = p.Patient.Phone,
                DoctorId = p.DoctorId,
                DoctorName = p.Doctor!.DoctorName(),
                Total = p.Total,
                DiscountRate = ClinicRules.DiscountRate(p.SubTotal, p.DiscountTotal),
                Status = p.Status,
                DoneCount = mine.Count(i => i.Status == PlanItemStatus.DaLam),
                ItemCount = mine.Count,
                PaidAmount = paidAmount,
                Remaining = Math.Max(0, p.Total - paidAmount),
                CreatedAt = p.CreatedAt
            };
        }).ToList());
    }

    public async Task<TreatmentPlanDto> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var plan = await plans.QueryNoTracking().Include(p => p.Patient).Include(p => p.Doctor).Include(p => p.Items)
                       .FirstOrDefaultAsync(p => p.Id == id, ct) ?? throw new NotFoundException("Không tìm thấy kế hoạch điều trị.");
        var actor = await context.GetActorAsync(ct);
        var itemIds = plan.Items.Select(i => i.Id).ToList();
        var visitOf = await orders.QueryNoTracking()
            .Where(o => o.TreatmentPlanItemId != null && itemIds.Contains(o.TreatmentPlanItemId.Value))
            .Join(visits.QueryNoTracking(), o => o.VisitId, v => v.Id, (o, v) => new { ItemId = o.TreatmentPlanItemId!.Value, v.Id, v.Code, v.Status })
            .ToListAsync(ct);
        var paid = (await PaidAsync([id], ct)).GetValueOrDefault(id);
        var live = plan.Items.Where(i => i.Status != PlanItemStatus.DaHuy).ToList();
        var canUpdate = actor.Has(ProjectPermissions.TreatmentPlans.Update);
        return new TreatmentPlanDto
        {
            Id = plan.Id,
            Code = plan.Code,
            Patient = plan.Patient!.ToBrief(context.Today),
            DoctorId = plan.DoctorId,
            DoctorName = plan.Doctor!.DoctorName(),
            PlannedSessions = plan.PlannedSessions,
            Note = plan.Note,
            SubTotal = plan.SubTotal,
            DiscountTotal = plan.DiscountTotal,
            Total = plan.Total,
            DiscountRate = ClinicRules.DiscountRate(plan.SubTotal, plan.DiscountTotal),
            Status = plan.Status,
            Items = plan.Items.OrderBy(i => i.SortOrder).Select(i =>
            {
                var v = visitOf.Where(x => x.ItemId == i.Id && x.Status != VisitStatus.BoVe).OrderByDescending(x => x.Status == VisitStatus.HoanTat || x.Status == VisitStatus.ChoThanhToan).FirstOrDefault();
                return new TreatmentPlanItemDto
                {
                    Id = i.Id,
                    ServiceId = i.ServiceId,
                    ServiceCode = i.ServiceCode,
                    ServiceName = i.ServiceName,
                    Unit = i.Unit,
                    Teeth = ClinicMappings.TeethList(i.Teeth),
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    DiscountType = i.DiscountType,
                    DiscountValue = i.DiscountValue,
                    DiscountAmount = i.DiscountAmount,
                    Amount = i.Amount,
                    Status = i.Status,
                    DoneAt = i.DoneAt,
                    VisitId = v?.Id,
                    VisitCode = v?.Code
                };
            }).ToList(),
            DoneCount = live.Count(i => i.Status == PlanItemStatus.DaLam),
            ItemCount = live.Count,
            DoneAmount = live.Where(i => i.Status == PlanItemStatus.DaLam).Sum(i => i.Amount),
            PaidAmount = paid,
            Remaining = Math.Max(0, plan.Total - paid),
            CreatedAt = plan.CreatedAt,
            CreatedByName = plan.CreatedByName,
            QuotedAt = plan.QuotedAt,
            AcceptedAt = plan.AcceptedAt,
            CompletedAt = plan.CompletedAt,
            CancelledAt = plan.CancelledAt,
            CancelReason = plan.CancelReason,
            ReviewedByName = plan.ReviewedByName,
            ReviewedAt = plan.ReviewedAt,
            ReviewNote = plan.ReviewNote,
            Actions = new PlanActionsDto
            {
                CanEdit = plan.Status == PlanStatus.Nhap && canUpdate,
                CanQuote = plan.Status == PlanStatus.Nhap && canUpdate && live.Count > 0,
                CanApprove = plan.Status == PlanStatus.ChoDuyet && actor.Has(ProjectPermissions.TreatmentPlans.Approve),
                CanAccept = plan.Status == PlanStatus.DaBaoGia && canUpdate,
                CanStop = plan.Status == PlanStatus.DangDieuTri && canUpdate
            }
        };
    }

    public async Task<TreatmentPlanDto> CreateAsync(SaveTreatmentPlanRequest request, CancellationToken ct = default)
    {
        var actor = await context.GetActorAsync(ct);
        var doctorId = actor.DoctorId ?? throw ClinicProblems.InvalidState("Tài khoản chưa gắn với bác sĩ nên không lập được kế hoạch.");
        if (!await patients.AnyAsync(p => p.Id == request.PatientId, ct))
            throw FieldErrors.Single("patientId", "Bệnh nhân không tồn tại");
        var plan = new TreatmentPlan
        {
            Code = await context.NextCodeAsync(ClinicRules.PlanPrefix, context.Today, ct),
            PatientId = request.PatientId,
            DoctorId = doctorId,
            PlannedSessions = request.PlannedSessions,
            Note = ClinicPatients.Trim(request.Note),
            Status = PlanStatus.Nhap,
            CreatedByName = actor.FullName
        };
        plan.Items = await BuildItemsAsync(plan.Id, request.Items, ct);
        Recalculate(plan, plan.Items);
        await plans.AddAsync(plan, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return await GetByIdAsync(plan.Id, ct);
    }

    public async Task<TreatmentPlanDto> UpdateAsync(Guid id, SaveTreatmentPlanRequest request, CancellationToken ct = default)
    {
        var plan = await plans.GetByIdAsync(id, ct) ?? throw new NotFoundException("Không tìm thấy kế hoạch điều trị.");
        if (plan.Status != PlanStatus.Nhap)
            throw ClinicProblems.InvalidState("Chỉ sửa kế hoạch ở trạng thái nháp.");
        if (plan.PatientId != request.PatientId)
            throw FieldErrors.Single("patientId", "Không đổi bệnh nhân của kế hoạch");
        plan.PlannedSessions = request.PlannedSessions;
        plan.Note = ClinicPatients.Trim(request.Note);
        items.DeleteRange(await items.Query().Where(i => i.PlanId == id).ToListAsync(ct));
        var fresh = await BuildItemsAsync(id, request.Items, ct);
        await items.AddRangeAsync(fresh, ct);
        Recalculate(plan, fresh);
        await unitOfWork.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    /// <summary>Chốt báo giá: tỉ lệ giảm ≤ 10% thì đã báo giá, vượt thì chờ quản lý duyệt (BR-22).</summary>
    public async Task<TreatmentPlanDto> QuoteAsync(Guid id, CancellationToken ct = default)
    {
        var plan = await LoadAsync(id, PlanStatus.Nhap, "Chỉ chốt báo giá kế hoạch nháp.", ct);
        if (!await items.AnyAsync(i => i.PlanId == id && i.Status != PlanItemStatus.DaHuy, ct))
            throw ClinicProblems.InvalidState("Kế hoạch chưa có hạng mục.");
        plan.Status = ClinicRules.NeedsApproval(plan.SubTotal, plan.DiscountTotal) ? PlanStatus.ChoDuyet : PlanStatus.DaBaoGia;
        plan.QuotedAt = context.UtcNow;
        await unitOfWork.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task<TreatmentPlanDto> ApproveAsync(Guid id, PlanNoteRequest request, CancellationToken ct = default)
    {
        var plan = await LoadAsync(id, PlanStatus.ChoDuyet, "Kế hoạch không chờ duyệt.", ct);
        var actor = await context.GetActorAsync(ct);
        plan.Status = PlanStatus.DaBaoGia;
        plan.ReviewedByName = actor.FullName;
        plan.ReviewedAt = context.UtcNow;
        plan.ReviewNote = ClinicPatients.Trim(request.Note);
        await unitOfWork.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task<TreatmentPlanDto> RejectAsync(Guid id, PlanNoteRequest request, CancellationToken ct = default)
    {
        var note = ClinicPatients.Trim(request.Note) ?? throw FieldErrors.Single("note", "Nhập lý do từ chối");
        var plan = await LoadAsync(id, PlanStatus.ChoDuyet, "Kế hoạch không chờ duyệt.", ct);
        var actor = await context.GetActorAsync(ct);
        plan.Status = PlanStatus.Nhap;
        plan.ReviewedByName = actor.FullName;
        plan.ReviewedAt = context.UtcNow;
        plan.ReviewNote = note;
        await unitOfWork.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task<TreatmentPlanDto> AcceptAsync(Guid id, CancellationToken ct = default)
    {
        var plan = await LoadAsync(id, PlanStatus.DaBaoGia, "Chỉ ghi nhận đồng ý với kế hoạch đã báo giá.", ct);
        plan.Status = PlanStatus.DangDieuTri;
        plan.AcceptedAt = context.UtcNow;
        await unitOfWork.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task<TreatmentPlanDto> DeclineAsync(Guid id, PlanNoteRequest request, CancellationToken ct = default)
    {
        var plan = await LoadAsync(id, PlanStatus.DaBaoGia, "Chỉ ghi nhận từ chối với kế hoạch đã báo giá.", ct);
        plan.Status = PlanStatus.DaHuy;
        plan.CancelledAt = context.UtcNow;
        plan.CancelReason = ClinicPatients.Trim(request.Note) ?? "Bệnh nhân từ chối kế hoạch";
        await unitOfWork.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task<TreatmentPlanDto> StopAsync(Guid id, PlanNoteRequest request, CancellationToken ct = default)
    {
        var note = ClinicPatients.Trim(request.Note) ?? throw FieldErrors.Single("note", "Nhập lý do dừng điều trị");
        var plan = await LoadAsync(id, PlanStatus.DangDieuTri, "Chỉ dừng kế hoạch đang điều trị.", ct);
        var list = await items.Query().Where(i => i.PlanId == id).ToListAsync(ct);
        foreach (var item in list.Where(i => i.Status == PlanItemStatus.ChuaLam))
            item.Status = PlanItemStatus.DaHuy;
        plan.Status = PlanStatus.DaHuy;
        plan.CancelledAt = context.UtcNow;
        plan.CancelReason = note;
        Recalculate(plan, list);
        await unitOfWork.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    private async Task<TreatmentPlan> LoadAsync(Guid id, PlanStatus expected, string message, CancellationToken ct)
    {
        var plan = await plans.GetByIdAsync(id, ct) ?? throw new NotFoundException("Không tìm thấy kế hoạch điều trị.");
        if (plan.Status != expected)
            throw ClinicProblems.InvalidState(message);
        return plan;
    }

    /// <summary>07 §3.11: dịch vụ thủ thuật hoặc cận lâm sàng đang dùng, răng như chỉ định, giảm giá theo hạng mục.</summary>
    private async Task<List<TreatmentPlanItem>> BuildItemsAsync(Guid planId, IReadOnlyList<SavePlanItemInput> inputs, CancellationToken ct)
    {
        var ids = inputs.Select(i => i.ServiceId).Distinct().ToList();
        var map = await services.QueryNoTracking().Where(s => ids.Contains(s.Id)).ToDictionaryAsync(s => s.Id, ct);
        var list = new List<TreatmentPlanItem>();
        for (var n = 0; n < inputs.Count; n++)
        {
            var input = inputs[n];
            var prefix = $"items[{n}].";
            if (!map.TryGetValue(input.ServiceId, out var svc) || !svc.IsActive || svc.Group == ServiceGroup.Kham)
                throw FieldErrors.Single(prefix + "serviceId", "Chọn dịch vụ thủ thuật hoặc cận lâm sàng đang dùng");
            string? teeth = null;
            var quantity = input.Quantity;
            if (svc.RequiresTooth)
            {
                if (input.Teeth is not { Count: > 0 })
                    throw FieldErrors.Single(prefix + "teeth", "Chọn vị trí răng");
                teeth = ClinicRules.FormatTeeth(input.Teeth);
                quantity = input.Teeth.Count;
            }

            var gross = svc.Price * quantity;
            var type = input.DiscountType;
            var value = type is null ? 0 : input.DiscountValue;
            if (type == DiscountType.SoTien && value * 100 > gross * ClinicRules.MaxItemDiscountPercent)
                throw FieldErrors.Single(prefix + "discountValue", $"Giảm tối đa {ClinicRules.MaxItemDiscountPercent}% thành tiền ({ClinicMappings.Money(gross / 2)})");
            var discount = ClinicRules.ItemDiscount(svc.Price, quantity, type, value);
            list.Add(new TreatmentPlanItem
            {
                PlanId = planId,
                ServiceId = svc.Id,
                ServiceCode = svc.Code,
                ServiceName = svc.Name,
                Unit = svc.Unit,
                Teeth = teeth,
                Quantity = quantity,
                UnitPrice = svc.Price,
                DiscountType = value > 0 ? type : null,
                DiscountValue = value,
                DiscountAmount = discount,
                Amount = gross - discount,
                Status = PlanItemStatus.ChuaLam,
                SortOrder = n
            });
        }

        return list;
    }

    private static void Recalculate(TreatmentPlan plan, IEnumerable<TreatmentPlanItem> list)
    {
        var live = list.Where(i => i.Status != PlanItemStatus.DaHuy).ToList();
        plan.SubTotal = live.Sum(i => i.UnitPrice * i.Quantity);
        plan.DiscountTotal = live.Sum(i => i.DiscountAmount);
        plan.Total = plan.SubTotal - plan.DiscountTotal;
    }

    /// <summary>
    /// Đã thu theo kế hoạch (07 §3.11): mỗi phiếu thanh toán (không hủy) chứa hạng mục góp
    /// <c>floor1000(Paid × tiền hạng mục trong phiếu / Total)</c>.
    /// </summary>
    private async Task<Dictionary<Guid, decimal>> PaidAsync(List<Guid> planIds, CancellationToken ct)
    {
        var result = new Dictionary<Guid, decimal>();
        if (planIds.Count == 0)
            return result;
        var itemPlan = await items.QueryNoTracking().Where(i => planIds.Contains(i.PlanId)).Select(i => new { i.Id, i.PlanId }).ToListAsync(ct);
        var itemIds = itemPlan.Select(i => i.Id).ToList();
        var orderItem = await orders.QueryNoTracking()
            .Where(o => o.TreatmentPlanItemId != null && itemIds.Contains(o.TreatmentPlanItemId.Value))
            .Select(o => new { o.Id, ItemId = o.TreatmentPlanItemId!.Value })
            .ToListAsync(ct);
        var orderIds = orderItem.Select(o => o.Id).ToList();
        var lines = await invoiceLines.QueryNoTracking()
            .Where(l => l.RefId != null && orderIds.Contains(l.RefId.Value) && !l.IsOutside)
            .Select(l => new { l.InvoiceId, RefId = l.RefId!.Value, l.Amount })
            .ToListAsync(ct);
        var invoiceIds = lines.Select(l => l.InvoiceId).Distinct().ToList();
        var invoiceRows = await invoices.QueryNoTracking()
            .Where(i => invoiceIds.Contains(i.Id) && i.Status != InvoiceStatus.DaHuy)
            .Select(i => new { i.Id, i.Total, i.Paid })
            .ToListAsync(ct);
        foreach (var inv in invoiceRows.Where(i => i.Total > 0))
        {
            foreach (var group in lines.Where(l => l.InvoiceId == inv.Id)
                         .GroupBy(l => itemPlan.First(ip => ip.Id == orderItem.First(oi => oi.Id == l.RefId).ItemId).PlanId))
            {
                var share = ClinicRules.Floor1000(inv.Paid * group.Sum(l => l.Amount) / inv.Total);
                result[group.Key] = result.GetValueOrDefault(group.Key) + share;
            }
        }

        return result;
    }
}
