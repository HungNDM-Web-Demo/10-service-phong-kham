using Application.Common.Exceptions;
using Application.Common.Models;
using Application.Common.Time;
using Application.Constants;
using Application.DTOs.Clinic;
using Application.DTOs.Finance;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Clinic;
using Domain.Entities.Booking.Doctors;
using Domain.Entities.Clinic;
using Domain.Entities.Clinic.Patients;
using Domain.Entities.Clinic.Visits;
using Domain.Entities.Finance.Invoices;
using Domain.Entities.Finance.Receipts;
using Domain.Enums.Clinic;
using Domain.Enums.Finance;
using Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Clinic;

/// <summary>Thu phí, phiếu thu (UC-11, UC-12, BR-21, BR-24 đến BR-27, 07 §3.9, §3.10, §4.9).</summary>
public sealed class InvoiceService(
    IClinicContext context,
    IGenericRepository<Invoice> invoices,
    IGenericRepository<Receipt> receipts,
    IGenericRepository<Visit> visits,
    IGenericRepository<Patient> patients,
    IGenericRepository<Doctor> doctors,
    IUnitOfWork unitOfWork) : IInvoiceService
{
    public async Task<PaginatedResult<InvoiceListItem>> GetPagedAsync(InvoiceQuery query, CancellationToken ct = default)
    {
        var source = invoices.QueryNoTracking().Include(i => i.Patient).AsQueryable();
        if (query.Status is { } status)
            source = source.Where(i => i.Status == status);
        if (query.HasDebt is true)
            source = source.Where(i => i.Status == InvoiceStatus.ChoThu || i.Status == InvoiceStatus.ThuMotPhan);
        if (query.PatientId is { } patientId)
            source = source.Where(i => i.PatientId == patientId);
        if (VietnamDates.TryParse(query.From, out var from))
        {
            var start = VietnamDates.StartOfDayUtc(from);
            source = source.Where(i => i.CreatedAt >= start);
        }

        if (VietnamDates.TryParse(query.To, out var to))
        {
            var end = VietnamDates.EndOfDayExclusiveUtc(to);
            source = source.Where(i => i.CreatedAt < end);
        }

        if (query.GetSearchTerm() is { } term)
        {
            var pattern = LikePattern.Contains(term);
            source = source.Where(i => AppDbFunctions.Matches(i.Code, pattern) || AppDbFunctions.Matches(i.Patient!.FullName, pattern)
                                       || AppDbFunctions.Matches(i.Patient!.Phone, pattern) || AppDbFunctions.Matches(i.Patient!.Code, pattern));
        }

        if (string.IsNullOrWhiteSpace(query.SortBy))
        {
            query.SortBy = "createdAt";
            query.SortDir ??= query.Status == InvoiceStatus.ChoThu ? "asc" : "desc";
        }

        var page = await source.ApplySorting(query).ToPaginatedResultAsync(query, ct);
        var visitIds = page.Items.Select(i => i.VisitId).ToList();
        var visitInfo = await visits.QueryNoTracking().Where(v => visitIds.Contains(v.Id))
                            .Select(v => new { v.Id, v.Code, v.QueueNumber })
                            .ToDictionaryAsync(v => v.Id, ct);
        var doctorInfo = await doctors.QueryNoTracking().Select(d => new { d.Id, d.FullName, d.Room }).ToDictionaryAsync(d => d.Id, ct);
        return page.Map(items => items.Select(i =>
        {
            var visit = visitInfo.GetValueOrDefault(i.VisitId);
            var doctor = doctorInfo.GetValueOrDefault(i.DoctorId);
            return new InvoiceListItem
            {
                Id = i.Id,
                Code = i.Code,
                VisitId = i.VisitId,
                VisitCode = visit?.Code ?? string.Empty,
                Ticket = visit is not null && doctor is not null ? ClinicRules.Ticket(doctor.Room, visit.QueueNumber) : null,
                PatientId = i.PatientId,
                PatientCode = i.Patient!.Code,
                PatientName = i.Patient.FullName,
                PatientPhone = i.Patient.Phone,
                DoctorName = ClinicRules.DoctorShort(doctor?.FullName ?? string.Empty),
                Total = i.Total,
                Paid = i.Paid,
                Debt = i.Debt,
                Status = i.Status,
                CreatedAt = i.CreatedAt
            };
        }).ToList());
    }

    public async Task<InvoiceDto> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var invoice = await invoices.QueryNoTracking().Include(i => i.Patient).Include(i => i.Lines).Include(i => i.Receipts)
                          .AsSplitQuery()
                          .FirstOrDefaultAsync(i => i.Id == id, ct) ?? throw new NotFoundException("Không tìm thấy phiếu thanh toán.");
        var visitCode = await visits.QueryNoTracking().Where(v => v.Id == invoice.VisitId).Select(v => v.Code).FirstOrDefaultAsync(ct) ?? string.Empty;
        var doctorName = await doctors.QueryNoTracking().Where(d => d.Id == invoice.DoctorId).Select(d => d.FullName).FirstOrDefaultAsync(ct) ?? string.Empty;
        var otherRows = await invoices.QueryNoTracking()
            .Where(i => i.PatientId == invoice.PatientId && i.Id != id && (i.Status == InvoiceStatus.ChoThu || i.Status == InvoiceStatus.ThuMotPhan))
            .Select(i => new { i.Total, i.Paid })
            .ToListAsync(ct);
        var otherDebt = otherRows.Sum(i => i.Total - i.Paid);
        var open = invoice.Status is InvoiceStatus.ChoThu or InvoiceStatus.ThuMotPhan;
        return new InvoiceDto
        {
            Id = invoice.Id,
            Code = invoice.Code,
            VisitId = invoice.VisitId,
            VisitCode = visitCode,
            Patient = invoice.Patient!.ToBrief(context.Today),
            DoctorId = invoice.DoctorId,
            DoctorName = ClinicRules.DoctorShort(doctorName),
            Total = invoice.Total,
            MedicineTotal = invoice.MedicineTotal,
            Paid = invoice.Paid,
            Debt = invoice.Debt,
            Status = invoice.Status,
            CreatedAt = invoice.CreatedAt,
            CancelledAt = invoice.CancelledAt,
            Lines = invoice.Lines.OrderBy(l => l.SortOrder).Select(ToDto).ToList(),
            Receipts = invoice.Receipts.OrderBy(r => r.CollectedAt).Select(r => new ReceiptBrief
            {
                Id = r.Id,
                Code = r.Code,
                Amount = r.Amount,
                Method = r.Method,
                CollectedAt = r.CollectedAt,
                CollectedByName = r.CollectedByName,
                Status = r.Status,
                CancelReason = r.CancelReason
            }).ToList(),
            CanCollect = open,
            CanEditOutside = open && !invoice.Receipts.Any(r => r.ValidReceipt()),
            PatientOtherDebt = otherDebt
        };
    }

    public Task<CreateResult<ReceiptDto>> CollectAsync(Guid invoiceId, CollectRequest request, CancellationToken ct = default) =>
        ClinicGate.RunAsync(async () =>
        {
            var requestId = ClinicPatients.Trim(request.ClientRequestId);
            if (requestId is not null && await receipts.QueryNoTracking().FirstOrDefaultAsync(r => r.ClientRequestId == requestId, ct) is { } done)
                return new CreateResult<ReceiptDto>(await GetReceiptAsync(done.Id, ct), false);

            var invoice = await invoices.Query().Include(i => i.Lines).Include(i => i.Receipts).AsSplitQuery()
                              .FirstOrDefaultAsync(i => i.Id == invoiceId, ct) ?? throw new NotFoundException("Không tìm thấy phiếu thanh toán.");
            if (invoice.Status is not (InvoiceStatus.ChoThu or InvoiceStatus.ThuMotPhan))
                throw ClinicProblems.InvalidState("Phiếu thanh toán đã thu đủ hoặc đã hủy.");

            // BR-26: thuốc mua ngoài chỉ đổi khi chưa có phiếu thu
            var wanted = request.OutsideLineIds.ToHashSet();
            var current = invoice.Lines.Where(l => l.IsOutside).Select(l => l.Id).ToHashSet();
            if (!wanted.SetEquals(current))
            {
                if (invoice.Receipts.Any(r => r.ValidReceipt()))
                    throw ClinicProblems.InvalidState("Đã có phiếu thu, không đổi thuốc mua ngoài được (BR-26).");
                foreach (var line in invoice.Lines)
                    line.IsOutside = line.Kind == InvoiceLineKind.Thuoc && wanted.Contains(line.Id);
                (invoice.Total, invoice.MedicineTotal) = InvoiceBuilder.Totals(invoice.Lines);
            }

            if (request.ExpectedTotal != invoice.Total)
            {
                throw ClinicProblems.Conflict(ClinicErrorCodes.TongTienDaDoi, $"Tổng phải thu đã đổi thành {ClinicMappings.Money(invoice.Total)}, kiểm tra lại", null,
                    new Dictionary<string, object?> { ["serverTotal"] = invoice.Total });
            }

            var remaining = invoice.Total - invoice.Paid;
            if (remaining <= 0)
            {
                invoice.Status = InvoiceStatus.DaThuDu;
                await unitOfWork.SaveChangesAsync(ct);
                throw ClinicProblems.InvalidState("Phiếu thanh toán không còn số phải thu.");
            }

            if (request.Amount < 1 || request.Amount > remaining)
                throw FieldErrors.Single("amount", $"Số tiền thu từ 1 ₫ đến {ClinicMappings.Money(remaining)}");
            var partialReason = ClinicPatients.Trim(request.PartialReason);
            if (request.Amount < remaining && partialReason is null)
                throw FieldErrors.Single("partialReason", "Nhập lý do thu một phần");
            if (invoice.Paid + request.Amount < invoice.MedicineTotal)
            {
                var min = invoice.MedicineTotal - invoice.Paid;
                throw ClinicProblems.Domain(ClinicErrorCodes.ThuThieuTienThuoc, $"Số tiền thu tối thiểu {ClinicMappings.Money(min)} (tiền thuốc)",
                    new Dictionary<string, object?> { ["minAmount"] = min });
            }

            decimal? cash = null;
            decimal? change = null;
            if (request.Method == PaymentMethod.TienMat)
            {
                cash = request.CashReceived ?? request.Amount;
                if (cash < request.Amount)
                    throw FieldErrors.Single("cashReceived", $"Tiền khách đưa phải từ {ClinicMappings.Money(request.Amount)}");
                change = cash - request.Amount;
            }

            var actor = await context.GetActorAsync(ct);
            var receipt = new Receipt
            {
                Code = await context.NextCodeAsync(ClinicRules.ReceiptPrefix, context.Today, ct),
                InvoiceId = invoice.Id,
                PatientId = invoice.PatientId,
                Amount = request.Amount,
                Method = request.Method,
                CashReceived = cash,
                ChangeAmount = change,
                PartialReason = request.Amount < remaining ? partialReason : null,
                CollectedAt = context.UtcNow,
                CollectedByName = actor.FullName,
                Status = ReceiptStatus.HopLe,
                ClientRequestId = requestId
            };
            await receipts.AddAsync(receipt, ct);
            invoice.Paid += request.Amount;
            invoice.Status = ClinicMappings.StatusFor(invoice.Total, invoice.Paid);
            var visit = await visits.GetByIdAsync(invoice.VisitId, ct);
            if (visit is { Status: VisitStatus.ChoThanhToan })
                visit.Status = VisitStatus.HoanTat;
            await unitOfWork.SaveChangesAsync(ct);
            return new CreateResult<ReceiptDto>(await GetReceiptAsync(receipt.Id, ct), true);
        }, ct);

    public async Task<PaginatedResult<ReceiptListItem>> GetReceiptsAsync(ReceiptQuery query, CancellationToken ct = default)
    {
        var source = receipts.QueryNoTracking().Include(r => r.Invoice).AsQueryable();
        if (VietnamDates.TryParse(query.From, out var from))
        {
            var start = VietnamDates.StartOfDayUtc(from);
            source = source.Where(r => r.CollectedAt >= start);
        }

        if (VietnamDates.TryParse(query.To, out var to))
        {
            var end = VietnamDates.EndOfDayExclusiveUtc(to);
            source = source.Where(r => r.CollectedAt < end);
        }

        if (query.Method is { } method)
            source = source.Where(r => r.Method == method);
        if (query.Status is { } status)
            source = source.Where(r => r.Status == status);
        if (query.PatientId is { } patientId)
            source = source.Where(r => r.PatientId == patientId);
        var patientQuery = patients.QueryNoTracking();
        if (query.GetSearchTerm() is { } term)
        {
            var pattern = LikePattern.Contains(term);
            var matched = patientQuery.Where(p => AppDbFunctions.Matches(p.FullName, pattern) || AppDbFunctions.Matches(p.Code, pattern) || AppDbFunctions.Matches(p.Phone, pattern)).Select(p => p.Id);
            source = source.Where(r => AppDbFunctions.Matches(r.Code, pattern) || AppDbFunctions.Matches(r.Invoice!.Code, pattern) || matched.Contains(r.PatientId));
        }

        if (string.IsNullOrWhiteSpace(query.SortBy))
        {
            query.SortBy = "collectedAt";
            query.SortDir ??= "desc";
        }

        var page = await source.ApplySorting(query).ToPaginatedResultAsync(query, ct);
        var ids = page.Items.Select(r => r.PatientId).Distinct().ToList();
        var people = await patients.QueryNoTracking().Where(p => ids.Contains(p.Id)).ToDictionaryAsync(p => p.Id, ct);
        return page.Map(items => items.Select(r => new ReceiptListItem
        {
            Id = r.Id,
            Code = r.Code,
            InvoiceId = r.InvoiceId,
            InvoiceCode = r.Invoice!.Code,
            PatientId = r.PatientId,
            PatientCode = people.GetValueOrDefault(r.PatientId)?.Code ?? string.Empty,
            PatientName = people.GetValueOrDefault(r.PatientId)?.FullName ?? string.Empty,
            Amount = r.Amount,
            Method = r.Method,
            CollectedAt = r.CollectedAt,
            CollectedByName = r.CollectedByName,
            Status = r.Status,
            CancelReason = r.CancelReason,
            CancelledAt = r.CancelledAt
        }).ToList());
    }

    public async Task<ReceiptDto> GetReceiptAsync(Guid id, CancellationToken ct = default)
    {
        var receipt = await receipts.QueryNoTracking().FirstOrDefaultAsync(r => r.Id == id, ct) ?? throw new NotFoundException("Không tìm thấy phiếu thu.");
        var invoice = await invoices.QueryNoTracking().Include(i => i.Lines).Include(i => i.Receipts).Include(i => i.Patient).AsSplitQuery()
            .FirstAsync(i => i.Id == receipt.InvoiceId, ct);
        var visitCode = await visits.QueryNoTracking().Where(v => v.Id == invoice.VisitId).Select(v => v.Code).FirstOrDefaultAsync(ct) ?? string.Empty;
        var doctorName = await doctors.QueryNoTracking().Where(d => d.Id == invoice.DoctorId).Select(d => d.FullName).FirstOrDefaultAsync(ct) ?? string.Empty;
        var actor = await context.GetActorAsync(ct);
        var paidToDate = invoice.Receipts
            .Where(r => r.ValidReceipt() && (r.CollectedAt < receipt.CollectedAt || r.Id == receipt.Id))
            .Sum(r => r.Amount);
        return new ReceiptDto
        {
            Id = receipt.Id,
            Code = receipt.Code,
            InvoiceId = invoice.Id,
            InvoiceCode = invoice.Code,
            VisitCode = visitCode,
            Patient = invoice.Patient!.ToBrief(context.Today),
            DoctorName = ClinicRules.DoctorShort(doctorName),
            Amount = receipt.Amount,
            Method = receipt.Method,
            CashReceived = receipt.CashReceived,
            ChangeAmount = receipt.ChangeAmount,
            PartialReason = receipt.PartialReason,
            CollectedAt = receipt.CollectedAt,
            CollectedByName = receipt.CollectedByName,
            Status = receipt.Status,
            CancelReason = receipt.CancelReason,
            CancelledAt = receipt.CancelledAt,
            CancelledByName = receipt.CancelledByName,
            CanCancel = receipt.ValidReceipt() && context.ToLocal(receipt.CollectedAt).Date == context.Today && actor.Has(ProjectPermissions.Invoices.Cancel),
            Lines = invoice.Lines.OrderBy(l => l.SortOrder).Select(ToDto).ToList(),
            InvoiceTotal = invoice.Total,
            PaidToDate = paidToDate,
            DebtAfter = Math.Max(0, invoice.Total - paidToDate)
        };
    }

    public Task<ReceiptDto> CancelReceiptAsync(Guid id, ReasonRequest request, CancellationToken ct = default) =>
        ClinicGate.RunAsync(async () =>
        {
            var receipt = await receipts.GetByIdAsync(id, ct) ?? throw new NotFoundException("Không tìm thấy phiếu thu.");
            if (!receipt.ValidReceipt())
                throw ClinicProblems.InvalidState("Phiếu thu đã hủy.");
            if (context.ToLocal(receipt.CollectedAt).Date != context.Today)
                throw ClinicProblems.InvalidState("Chỉ hủy phiếu thu lập trong hôm nay (BR-27).");
            var actor = await context.GetActorAsync(ct);
            receipt.Status = ReceiptStatus.DaHuy;
            receipt.CancelReason = request.Reason.Trim();
            receipt.CancelledAt = context.UtcNow;
            receipt.CancelledByName = actor.FullName;

            var invoice = await invoices.Query().Include(i => i.Receipts).FirstAsync(i => i.Id == receipt.InvoiceId, ct);
            invoice.Paid = invoice.Receipts.Where(r => r.ValidReceipt()).Sum(r => r.Amount);
            invoice.Status = ClinicMappings.StatusFor(invoice.Total, invoice.Paid);
            if (invoice.Paid <= 0 && invoice.Total > 0 && await visits.GetByIdAsync(invoice.VisitId, ct) is { Status: VisitStatus.HoanTat } visit)
                visit.Status = VisitStatus.ChoThanhToan;
            await unitOfWork.SaveChangesAsync(ct);
            return await GetReceiptAsync(id, ct);
        }, ct);

    private static InvoiceLineDto ToDto(InvoiceLine l) => new()
    {
        Id = l.Id,
        Kind = l.Kind,
        ReportGroup = l.ReportGroup,
        Description = l.Description,
        Note = l.Note,
        UnitPrice = l.UnitPrice,
        Quantity = l.Quantity,
        Discount = l.Discount,
        Amount = l.Amount,
        IsOutside = l.IsOutside
    };
}
