using Application.Common.Exceptions;
using Application.Common.Models;
using Application.Common.Time;
using Application.Constants;
using Application.DTOs.Clinic;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Clinic;
using Domain.Entities.Booking.Appointments;
using Domain.Entities.Booking.Doctors;
using Domain.Entities.Clinic;
using Domain.Entities.Clinic.FollowUps;
using Domain.Entities.Clinic.Medicines;
using Domain.Entities.Clinic.Patients;
using Domain.Entities.Clinic.Services;
using Domain.Entities.Clinic.Specialties;
using Domain.Entities.Clinic.TreatmentPlans;
using Domain.Entities.Clinic.Visits;
using Domain.Entities.Finance.Invoices;
using Domain.Entities.Finance.Receipts;
using Domain.Enums.Clinic;
using Domain.Enums.Finance;
using Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Clinic;

/// <summary>Phiếu khám: xem, ghi, kết thúc, mở lại, bản in đơn thuốc (UC-08, UC-09, 07 §3.6–§3.8, §4.6).</summary>
public sealed class VisitService(
    IClinicContext context,
    IGenericRepository<Visit> visits,
    IGenericRepository<VisitDiagnosis> diagnoses,
    IGenericRepository<VisitOrder> orders,
    IGenericRepository<PrescriptionLine> prescriptions,
    IGenericRepository<UsagePhrase> phrases,
    IGenericRepository<Patient> patients,
    IGenericRepository<Doctor> doctors,
    IGenericRepository<Specialty> specialties,
    IGenericRepository<Service> services,
    IGenericRepository<Medicine> medicines,
    IGenericRepository<TreatmentPlan> plans,
    IGenericRepository<TreatmentPlanItem> planItems,
    IGenericRepository<Invoice> invoices,
    IGenericRepository<Receipt> receipts,
    IGenericRepository<FollowUp> followUps,
    IGenericRepository<Appointment> appointments,
    IUnitOfWork unitOfWork) : IVisitService
{
    public Task<VisitDetailDto> GetByIdAsync(Guid id, CancellationToken ct = default) => BuildDetailAsync(id, true, ct);

    public async Task<PaginatedResult<VisitSummaryDto>> GetPagedAsync(VisitQuery query, CancellationToken ct = default)
    {
        var actor = await context.GetActorAsync(ct);
        var medical = query.WithMedical && actor.Has(ProjectPermissions.MedicalRecords.View);
        var source = visits.QueryNoTracking().Include(v => v.Patient).Include(v => v.Doctor!).ThenInclude(d => d.Specialty).AsQueryable();
        if (query.PatientId is { } patientId)
            source = source.Where(v => v.PatientId == patientId);
        if (query.DoctorId is { } doctorId)
            source = source.Where(v => v.DoctorId == doctorId);
        if (VietnamDates.TryParse(query.From, out var from))
            source = source.Where(v => v.Date >= from);
        if (VietnamDates.TryParse(query.To, out var to))
            source = source.Where(v => v.Date <= to);
        if (query.Status is { } status)
            source = source.Where(v => v.Status == status);
        if (query.GetSearchTerm() is { } term)
        {
            var pattern = LikePattern.Contains(term);
            source = source.Where(v => AppDbFunctions.Matches(v.Code, pattern) || AppDbFunctions.Matches(v.Patient!.FullName, pattern) || AppDbFunctions.Matches(v.Patient!.Code, pattern));
        }

        if (string.IsNullOrWhiteSpace(query.SortBy))
        {
            query.SortBy = "checkedInAt";
            query.SortDir ??= "desc";
        }

        var page = await source.ApplySorting(query).ToPaginatedResultAsync(query, ct);
        var ids = page.Items.Select(v => v.Id).ToList();
        var orderRows = await orders.QueryNoTracking().Where(o => ids.Contains(o.VisitId)).OrderBy(o => o.SortOrder).ToListAsync(ct);
        var invoiceRows = await invoices.QueryNoTracking().Where(i => ids.Contains(i.VisitId) && i.Status != InvoiceStatus.DaHuy).ToListAsync(ct);
        var diagnosisRows = medical ? await diagnoses.QueryNoTracking().Where(d => ids.Contains(d.VisitId)).OrderBy(d => d.Kind).ThenBy(d => d.SortOrder).ToListAsync(ct) : [];
        var rxRows = medical ? await prescriptions.QueryNoTracking().Where(p => ids.Contains(p.VisitId)).OrderBy(p => p.SortOrder).ToListAsync(ct) : [];

        if (medical && query.PatientId is { } logPatient && page.Items.Count > 0)
        {
            var p = page.Items[0].Patient!;
            await context.LogMedicalViewAsync(logPatient, p.Code, p.FullName, "Lịch sử khám", ct);
            await unitOfWork.SaveChangesAsync(ct);
        }

        return page.Map(items => items.Select(v =>
        {
            var mineOrders = orderRows.Where(o => o.VisitId == v.Id).ToList();
            var invoice = invoiceRows.Where(i => i.VisitId == v.Id).OrderByDescending(i => i.CreatedAt).FirstOrDefault();
            return new VisitSummaryDto
            {
                Id = v.Id,
                Code = v.Code,
                Date = ClinicMappings.Iso(v.Date),
                CheckedInAt = v.CheckedInAt,
                FinishedAt = v.FinishedAt,
                PatientId = v.PatientId,
                PatientCode = v.Patient!.Code,
                PatientName = v.Patient.FullName,
                DoctorId = v.DoctorId,
                DoctorName = v.Doctor!.DoctorName(),
                SpecialtyName = v.Doctor!.Specialty?.Name ?? string.Empty,
                Status = v.Status,
                Services = string.Join(", ", mineOrders.Where(o => o.Status != OrderStatus.KhongThucHien).Select(o => o.ServiceName)),
                Total = invoice?.Total,
                InvoiceStatus = invoice?.Status,
                Diagnoses = medical ? string.Join("; ", diagnosisRows.Where(d => d.VisitId == v.Id).Select(d => d.IcdCode is null ? d.Name : $"{d.IcdCode} {d.Name}")) : null,
                Prescription = medical ? string.Join("; ", rxRows.Where(r => r.VisitId == v.Id).Select(r => $"{r.Name} x {r.Quantity} {r.Unit}")) : null,
                Results = medical ? string.Join("; ", mineOrders.Where(o => o.Result != null).Select(o => $"{o.ServiceName}: {o.Result}")) : null,
                Advice = medical ? v.Advice : null
            };
        }).ToList());
    }

    public async Task<VisitDetailDto> SaveAsync(Guid id, SaveVisitRequest request, CancellationToken ct = default)
    {
        var visit = await visits.GetByIdAsync(id, ct) ?? throw new NotFoundException("Không tìm thấy lượt khám.");
        await EnsureCanEditAsync(visit, ct);
        var actor = await context.GetActorAsync(ct);
        var patient = await patients.QueryNoTracking().FirstAsync(p => p.Id == visit.PatientId, ct);
        var today = context.Today;

        visit.Temperature = request.Temperature;
        visit.Pulse = request.Pulse;
        visit.BpSystolic = request.BpSystolic;
        visit.BpDiastolic = request.BpDiastolic;
        visit.Weight = request.Weight;
        visit.Height = request.Height;
        visit.Symptoms = ClinicPatients.Trim(request.Symptoms);
        visit.Examination = ClinicPatients.Trim(request.Examination);
        visit.Advice = ClinicPatients.Trim(request.Advice);

        // Chẩn đoán: chính trước, phụ sau
        diagnoses.DeleteRange(await diagnoses.Query().Where(d => d.VisitId == id).ToListAsync(ct));
        var sort = 0;
        await diagnoses.AddRangeAsync(request.Diagnoses
            .OrderBy(d => d.Kind)
            .Select(d => new VisitDiagnosis
            {
                VisitId = id,
                Kind = d.Kind,
                IcdCode = string.IsNullOrWhiteSpace(d.IcdCode) ? null : d.IcdCode.Trim().ToUpperInvariant(),
                Name = d.Name.Trim(),
                SortOrder = sort++
            }), ct);

        await SaveOrdersAsync(visit, request.Orders, ct);
        await SavePrescriptionAsync(visit, patient, request.Prescription, actor.FullName, ct);

        if (string.IsNullOrWhiteSpace(request.FollowUpDate))
        {
            visit.FollowUpDate = null;
            visit.FollowUpNote = null;
        }
        else
        {
            VietnamDates.TryParse(request.FollowUpDate, out var due);
            if (due <= today || due > today.AddDays(ClinicRules.MaxFollowUpDays))
                throw FieldErrors.Single("followUpDate", $"Ngày hẹn tái khám từ ngày mai tới {ClinicRules.MaxFollowUpDays} ngày sau");
            visit.FollowUpDate = due;
            visit.FollowUpNote = ClinicPatients.Trim(request.FollowUpNote);
        }

        await unitOfWork.SaveChangesAsync(ct);
        return await BuildDetailAsync(id, false, ct);
    }

    public Task<VisitDetailDto> FinishAsync(Guid id, CancellationToken ct = default) =>
        ClinicGate.RunAsync(async () =>
        {
            var visit = await visits.GetByIdAsync(id, ct) ?? throw new NotFoundException("Không tìm thấy lượt khám.");
            await EnsureCanEditAsync(visit, ct);
            var dx = await diagnoses.QueryNoTracking().Where(d => d.VisitId == id).ToListAsync(ct);
            var visitOrders = await orders.Query().Where(o => o.VisitId == id).ToListAsync(ct);
            var rx = await prescriptions.QueryNoTracking().Where(p => p.VisitId == id).ToListAsync(ct);

            // BR-17: chẩn đoán chính, kết quả cận lâm sàng
            var missing = new List<string>();
            if (!dx.Any(d => d.Kind == DiagnosisKind.Chinh))
                missing.Add("Thiếu chẩn đoán chính");
            missing.AddRange(visitOrders
                .Where(o => o.Group == ServiceGroup.CanLamSang && o.Status == OrderStatus.ChoThucHien)
                .OrderBy(o => o.SortOrder)
                .Select(o => $"{o.ServiceName} chưa có kết quả"));
            if (missing.Count > 0)
                throw ClinicProblems.Domain(ClinicErrorCodes.ThieuThongTinKham, missing[0], new Dictionary<string, object?> { ["missing"] = missing });

            var now = context.UtcNow;
            visit.Status = VisitStatus.ChoThanhToan;
            visit.FinishedAt = now;
            foreach (var o in visitOrders.Where(o => o.Group != ServiceGroup.CanLamSang))
                o.Status = OrderStatus.DaLam;

            // BR-23: hạng mục kế hoạch làm ở lượt này
            var itemIds = visitOrders.Where(o => o.TreatmentPlanItemId != null).Select(o => o.TreatmentPlanItemId!.Value).ToList();
            if (itemIds.Count > 0)
            {
                var items = await planItems.Query().Where(i => itemIds.Contains(i.Id)).ToListAsync(ct);
                foreach (var item in items)
                {
                    item.Status = PlanItemStatus.DaLam;
                    item.DoneAt = now;
                }

                var planIds = items.Select(i => i.PlanId).Distinct().ToList();
                var affected = await plans.Query().Include(p => p.Items).Where(p => planIds.Contains(p.Id)).ToListAsync(ct);
                foreach (var plan in affected.Where(p => p.Status == PlanStatus.DangDieuTri))
                {
                    if (plan.Items.Where(i => i.Status != PlanItemStatus.DaHuy).All(i => i.Status == PlanItemStatus.DaLam))
                    {
                        plan.Status = PlanStatus.HoanThanh;
                        plan.CompletedAt = now;
                    }
                }
            }

            // Phiếu thanh toán (07 §3.7 bước 3, 4)
            var doctor = await doctors.QueryNoTracking().FirstAsync(d => d.Id == visit.DoctorId, ct);
            var examServiceId = await specialties.QueryNoTracking().Where(s => s.Id == doctor.SpecialtyId).Select(s => s.ExamServiceId).FirstOrDefaultAsync(ct);
            var examService = examServiceId is { } esid ? await services.QueryNoTracking().FirstOrDefaultAsync(s => s.Id == esid, ct) : null;
            var lines = InvoiceBuilder.BuildLines(visit.IsFollowUp, examService, visitOrders, rx);
            var (total, medicineTotal) = InvoiceBuilder.Totals(lines);
            var invoice = new Invoice
            {
                Code = await context.NextCodeAsync(ClinicRules.InvoicePrefix, context.Today, ct),
                VisitId = visit.Id,
                PatientId = visit.PatientId,
                DoctorId = visit.DoctorId,
                Total = total,
                MedicineTotal = medicineTotal,
                Paid = 0,
                Status = ClinicMappings.StatusFor(total, 0),
                Lines = lines
            };
            await invoices.AddAsync(invoice, ct);
            if (total == 0)
                visit.Status = VisitStatus.HoanTat;

            // BR-29: dòng nhắc tái khám
            if (visit.FollowUpDate is { } due)
            {
                await followUps.AddAsync(new FollowUp
                {
                    PatientId = visit.PatientId,
                    DoctorId = visit.DoctorId,
                    VisitId = visit.Id,
                    DueDate = due,
                    Note = visit.FollowUpNote,
                    Status = FollowUpStatus.ChoNhac
                }, ct);
            }

            await unitOfWork.SaveChangesAsync(ct);
            return await BuildDetailAsync(id, false, ct);
        }, ct);

    public Task<VisitDetailDto> ReopenAsync(Guid id, CancellationToken ct = default) =>
        ClinicGate.RunAsync(async () =>
        {
            var visit = await visits.GetByIdAsync(id, ct) ?? throw new NotFoundException("Không tìm thấy lượt khám.");
            var actor = await context.GetActorAsync(ct);
            if (!actor.IsAdmin && actor.DoctorId != visit.DoctorId)
                throw ClinicProblems.Conflict(ClinicErrorCodes.KhongMoLaiDuoc, "Chỉ bác sĩ khám mở lại được phiếu");
            var blocked = await ReopenBlockedReasonAsync(visit, ct);
            if (blocked is not null)
                throw ClinicProblems.Conflict(ClinicErrorCodes.KhongMoLaiDuoc, blocked);

            var now = context.UtcNow;
            foreach (var invoice in await invoices.Query().Where(i => i.VisitId == id && i.Status != InvoiceStatus.DaHuy).ToListAsync(ct))
            {
                invoice.Status = InvoiceStatus.DaHuy;
                invoice.CancelledAt = now;
            }

            var visitOrders = await orders.Query().Where(o => o.VisitId == id).ToListAsync(ct);
            foreach (var o in visitOrders.Where(o => o.Status == OrderStatus.DaLam))
                o.Status = OrderStatus.ChoThucHien;
            var itemIds = visitOrders.Where(o => o.TreatmentPlanItemId != null).Select(o => o.TreatmentPlanItemId!.Value).ToList();
            if (itemIds.Count > 0)
            {
                var items = await planItems.Query().Where(i => itemIds.Contains(i.Id) && i.Status == PlanItemStatus.DaLam).ToListAsync(ct);
                foreach (var item in items)
                {
                    item.Status = PlanItemStatus.ChuaLam;
                    item.DoneAt = null;
                }

                var planIds = items.Select(i => i.PlanId).Distinct().ToList();
                foreach (var plan in await plans.Query().Where(p => planIds.Contains(p.Id) && p.Status == PlanStatus.HoanThanh).ToListAsync(ct))
                {
                    plan.Status = PlanStatus.DangDieuTri;
                    plan.CompletedAt = null;
                }
            }

            followUps.DeleteRange(await followUps.Query()
                .Where(f => f.VisitId == id && f.SendCount == 0 && f.CallResult == null && f.Status == FollowUpStatus.ChoNhac)
                .ToListAsync(ct));
            visit.Status = VisitStatus.DangKham;
            visit.FinishedAt = null;
            await unitOfWork.SaveChangesAsync(ct);
            return await BuildDetailAsync(id, false, ct);
        }, ct);

    public async Task<PrescriptionPrintDto> GetPrescriptionAsync(Guid id, CancellationToken ct = default)
    {
        var visit = await visits.QueryNoTracking().Include(v => v.Patient).Include(v => v.Doctor).Include(v => v.Diagnoses).Include(v => v.Prescription)
                        .FirstOrDefaultAsync(v => v.Id == id, ct) ?? throw new NotFoundException("Không tìm thấy lượt khám.");
        var patient = visit.Patient!;
        await context.LogMedicalViewAsync(patient.Id, patient.Code, patient.FullName, $"In đơn thuốc {visit.Code}", ct);
        await unitOfWork.SaveChangesAsync(ct);
        return new PrescriptionPrintDto
        {
            Clinic = await context.GetProfileAsync(ct),
            VisitCode = visit.Code,
            Date = ClinicMappings.Iso(visit.Date),
            PatientCode = patient.Code,
            PatientName = patient.FullName,
            BirthDate = ClinicMappings.Iso(patient.BirthDate),
            Age = ClinicRules.AgeOn(patient.BirthDate, visit.Date),
            Gender = patient.Gender,
            Phone = patient.Phone,
            Address = patient.Address,
            Allergies = patient.Allergies,
            DoctorName = visit.Doctor!.DoctorName(),
            Diagnoses = string.Join("; ", visit.Diagnoses.OrderBy(d => d.Kind).ThenBy(d => d.SortOrder).Select(d => d.IcdCode is null ? d.Name : $"{d.Name} ({d.IcdCode})")),
            Lines = visit.Prescription.OrderBy(p => p.SortOrder).Select(p => new PrescriptionPrintLine
            {
                Name = p.Name,
                Strength = p.Strength,
                ActiveIngredient = p.ActiveIngredient,
                Unit = p.Unit,
                Quantity = p.Quantity,
                Days = p.Days,
                Usage = p.Usage
            }).ToList(),
            Advice = visit.Advice,
            FollowUpDate = ClinicMappings.Iso(visit.FollowUpDate),
            FollowUpNote = visit.FollowUpNote
        };
    }

    public async Task<IReadOnlyList<UsagePhraseDto>> GetPhrasesAsync(CancellationToken ct = default)
    {
        var actor = await context.GetActorAsync(ct);
        var list = await phrases.QueryNoTracking().Where(p => p.UserId == actor.UserId).OrderBy(p => p.CreatedAt).ToListAsync(ct);
        return list.Select(p => new UsagePhraseDto { Id = p.Id, Text = p.Text }).ToList();
    }

    public async Task<UsagePhraseDto> AddPhraseAsync(SaveUsagePhraseRequest request, CancellationToken ct = default)
    {
        var actor = await context.GetActorAsync(ct);
        var userId = actor.UserId ?? throw new ForbiddenException("Cần đăng nhập.");
        var text = request.Text.Trim();
        var existing = await phrases.QueryNoTracking().FirstOrDefaultAsync(p => p.UserId == userId && p.Text == text, ct);
        if (existing is not null)
            return new UsagePhraseDto { Id = existing.Id, Text = existing.Text };
        var phrase = new UsagePhrase { UserId = userId, Text = text };
        await phrases.AddAsync(phrase, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return new UsagePhraseDto { Id = phrase.Id, Text = phrase.Text };
    }

    public async Task DeletePhraseAsync(Guid id, CancellationToken ct = default)
    {
        var actor = await context.GetActorAsync(ct);
        var phrase = await phrases.GetByIdAsync(id, ct);
        if (phrase is null || phrase.UserId != actor.UserId)
            throw new NotFoundException("Không tìm thấy câu mẫu.");
        phrases.Delete(phrase);
        await unitOfWork.SaveChangesAsync(ct);
    }

    /// <summary>07 §3.6: chỉ định giữ giá chụp của dòng cũ, dòng mới lấy giá dịch vụ hoặc giá hạng mục kế hoạch.</summary>
    private async Task SaveOrdersAsync(Visit visit, IReadOnlyList<SaveOrderInput> inputs, CancellationToken ct)
    {
        var existing = await orders.Query().Where(o => o.VisitId == visit.Id).ToListAsync(ct);
        var itemIds = inputs.Where(i => i.TreatmentPlanItemId != null).Select(i => i.TreatmentPlanItemId!.Value).ToList();
        var items = itemIds.Count == 0
            ? new Dictionary<Guid, TreatmentPlanItem>()
            : await planItems.QueryNoTracking().Where(i => itemIds.Contains(i.Id)).ToDictionaryAsync(i => i.Id, ct);
        var itemPlans = items.Count == 0
            ? new Dictionary<Guid, TreatmentPlan>()
            : await plans.QueryNoTracking().Where(p => items.Values.Select(i => i.PlanId).Contains(p.Id)).ToDictionaryAsync(p => p.Id, ct);
        var serviceIds = inputs.Select(i => i.ServiceId).Concat(items.Values.Select(i => i.ServiceId)).Distinct().ToList();
        var serviceMap = await services.QueryNoTracking().Where(s => serviceIds.Contains(s.Id)).ToDictionaryAsync(s => s.Id, ct);
        var keep = new HashSet<Guid>();

        for (var n = 0; n < inputs.Count; n++)
        {
            var input = inputs[n];
            var prefix = $"orders[{n}].";
            var order = input.Id is { } oid ? existing.FirstOrDefault(o => o.Id == oid && (o.ServiceId == input.ServiceId || o.TreatmentPlanItemId == input.TreatmentPlanItemId && input.TreatmentPlanItemId != null)) : null;
            if (order is null)
            {
                if (input.TreatmentPlanItemId is { } itemId)
                {
                    if (!items.TryGetValue(itemId, out var item) || !itemPlans.TryGetValue(item.PlanId, out var plan)
                        || plan.PatientId != visit.PatientId || plan.Status != PlanStatus.DangDieuTri || item.Status != PlanItemStatus.ChuaLam)
                        throw FieldErrors.Single(prefix + "treatmentPlanItemId", "Hạng mục không thuộc kế hoạch đang điều trị của bệnh nhân hoặc đã làm");
                    if (await orders.AnyAsync(o => o.TreatmentPlanItemId == itemId && o.VisitId != visit.Id, ct))
                        throw FieldErrors.Single(prefix + "treatmentPlanItemId", "Hạng mục đã đưa vào lượt khám khác");
                    var svc = serviceMap[item.ServiceId];
                    order = new VisitOrder
                    {
                        VisitId = visit.Id,
                        ServiceId = svc.Id,
                        ServiceCode = item.ServiceCode,
                        ServiceName = item.ServiceName,
                        Group = svc.Group,
                        Unit = item.Unit,
                        Teeth = item.Teeth,
                        Quantity = item.Quantity,
                        UnitPrice = item.UnitPrice,
                        Discount = item.DiscountAmount,
                        TreatmentPlanItemId = item.Id
                    };
                }
                else
                {
                    if (!serviceMap.TryGetValue(input.ServiceId, out var svc) || !svc.IsActive)
                        throw FieldErrors.Single(prefix + "serviceId", "Dịch vụ không còn dùng");
                    order = new VisitOrder
                    {
                        VisitId = visit.Id,
                        ServiceId = svc.Id,
                        ServiceCode = svc.Code,
                        ServiceName = svc.Name,
                        Group = svc.Group,
                        Unit = svc.Unit,
                        UnitPrice = svc.Price
                    };
                }

                await orders.AddAsync(order, ct);
            }

            keep.Add(order.Id);
            order.SortOrder = n;
            if (order.TreatmentPlanItemId is null)
            {
                var requiresTooth = serviceMap.TryGetValue(order.ServiceId, out var s) ? s.RequiresTooth : order.Unit == ServiceUnit.Rang;
                if (requiresTooth)
                {
                    if (input.Teeth is not { Count: > 0 })
                        throw FieldErrors.Single(prefix + "teeth", "Chọn vị trí răng");
                    order.Teeth = ClinicRules.FormatTeeth(input.Teeth);
                    order.Quantity = input.Teeth.Count;
                }
                else
                {
                    order.Teeth = null;
                    order.Quantity = input.Quantity;
                }
            }

            if (order.Group == ServiceGroup.CanLamSang)
            {
                var status = input.Status ?? OrderStatus.ChoThucHien;
                if (status is not (OrderStatus.ChoThucHien or OrderStatus.CoKetQua or OrderStatus.KhongThucHien))
                    status = OrderStatus.ChoThucHien;
                var result = ClinicPatients.Trim(input.Result);
                if (status == OrderStatus.CoKetQua && result is null)
                    throw FieldErrors.Single(prefix + "result", "Nhập kết quả");
                order.Status = status;
                order.Result = status == OrderStatus.KhongThucHien ? null : result;
                order.ImageUrls = input.ImageUrls is { Count: > 0 } urls ? string.Join('\n', urls.Take(ClinicRules.MaxImages)) : null;
            }
            else
            {
                order.Status = OrderStatus.ChoThucHien;
                order.Result = null;
                order.ImageUrls = null;
            }
        }

        orders.DeleteRange(existing.Where(o => !keep.Contains(o.Id)));
    }

    /// <summary>BR-18, BR-19: mỗi thuốc một dòng, giá chụp lúc kê, cảnh báo dị ứng phải xác nhận.</summary>
    private async Task SavePrescriptionAsync(Visit visit, Patient patient, IReadOnlyList<SavePrescriptionInput> inputs, string actorName, CancellationToken ct)
    {
        var existing = await prescriptions.Query().Where(p => p.VisitId == visit.Id).ToListAsync(ct);
        var medIds = inputs.Select(i => i.MedicineId).Distinct().ToList();
        var medMap = await medicines.QueryNoTracking().Where(m => medIds.Contains(m.Id)).ToDictionaryAsync(m => m.Id, ct);
        var keep = new HashSet<Guid>();
        var now = context.UtcNow;

        for (var n = 0; n < inputs.Count; n++)
        {
            var input = inputs[n];
            var prefix = $"prescription[{n}].";
            var line = existing.FirstOrDefault(p => p.MedicineId == input.MedicineId);
            if (line is null)
            {
                if (!medMap.TryGetValue(input.MedicineId, out var med) || !med.IsActive)
                    throw FieldErrors.Single(prefix + "medicineId", "Thuốc đã ngừng, không kê được");
                line = new PrescriptionLine
                {
                    VisitId = visit.Id,
                    MedicineId = med.Id,
                    MedicineCode = med.Code,
                    Name = med.Name,
                    Strength = med.Strength,
                    Unit = med.Unit,
                    ActiveIngredient = med.ActiveIngredient,
                    UnitPrice = med.Price
                };
                await prescriptions.AddAsync(line, ct);
            }

            var matches = ClinicRules.AllergyMatches(patient.Allergies, line.ActiveIngredient);
            if (matches.Count > 0)
            {
                if (!input.AllergyConfirmed && line.AllergyConfirmedAt is null)
                {
                    throw ClinicProblems.Conflict(ClinicErrorCodes.TrungDiUng, $"Bệnh nhân có ghi nhận dị ứng: {string.Join(", ", matches)}", null,
                        new Dictionary<string, object?> { ["medicineId"] = line.MedicineId, ["keywords"] = matches });
                }

                if (line.AllergyConfirmedAt is null)
                {
                    line.AllergyConfirmedAt = now;
                    line.AllergyConfirmedByName = actorName;
                }
            }

            keep.Add(line.Id);
            line.Quantity = input.Quantity;
            line.Days = input.Days;
            line.Usage = input.Usage.Trim();
            line.SortOrder = n;
        }

        prescriptions.DeleteRange(existing.Where(p => !keep.Contains(p.Id)));
    }

    /// <summary>07 §3.6: lượt đang khám hoặc chờ kết quả của bác sĩ đang đăng nhập (quản trị viên sửa được mọi lượt).</summary>
    private async Task EnsureCanEditAsync(Visit visit, CancellationToken ct)
    {
        var actor = await context.GetActorAsync(ct);
        if (visit.Status is not (VisitStatus.DangKham or VisitStatus.ChoKetQua))
            throw ClinicProblems.InvalidState("Phiếu khám đã khóa hoặc chưa được gọi vào khám.");
        if (!actor.IsAdmin && actor.DoctorId != visit.DoctorId)
            throw ClinicProblems.InvalidState("Chỉ bác sĩ khám sửa được phiếu khám này (BR-32).");
    }

    /// <summary>07 §3.8: lý do không mở lại được, null khi được.</summary>
    private async Task<string?> ReopenBlockedReasonAsync(Visit visit, CancellationToken ct)
    {
        if (visit.Status != VisitStatus.ChoThanhToan)
            return visit.Status == VisitStatus.HoanTat ? "Phiếu thanh toán đã có phiếu thu" : "Chỉ mở lại phiếu đang chờ thanh toán";
        if (visit.FinishedAt is not { } finished || context.ToLocal(finished).Date != context.Today)
            return "Chỉ mở lại trong ngày khám";
        var invoiceIds = await invoices.QueryNoTracking().Where(i => i.VisitId == visit.Id && i.Status != InvoiceStatus.DaHuy).Select(i => i.Id).ToListAsync(ct);
        if (await receipts.AnyAsync(r => invoiceIds.Contains(r.InvoiceId) && r.Status == ReceiptStatus.HopLe, ct))
            return "Phiếu thanh toán đã có phiếu thu";
        if (await visits.AnyAsync(v => v.DoctorId == visit.DoctorId && v.Date == visit.Date && v.Status == VisitStatus.DangKham && v.Id != visit.Id, ct))
            return "Bác sĩ đang khám lượt khác, kết thúc hoặc chuyển Chờ kết quả trước";
        return null;
    }

    private async Task<VisitDetailDto> BuildDetailAsync(Guid id, bool logView, CancellationToken ct)
    {
        var visit = await visits.QueryNoTracking()
                        .Include(v => v.Patient)
                        .Include(v => v.Doctor!).ThenInclude(d => d.Specialty)
                        .Include(v => v.Diagnoses)
                        .Include(v => v.Orders)
                        .Include(v => v.Prescription)
                        .AsSplitQuery()
                        .FirstOrDefaultAsync(v => v.Id == id, ct) ?? throw new NotFoundException("Không tìm thấy lượt khám.");
        var actor = await context.GetActorAsync(ct);
        if (!actor.Has(ProjectPermissions.QueueTickets.View) && !actor.Has(ProjectPermissions.Patients.View))
            throw new ForbiddenException("Bạn không có quyền xem phiếu khám.");
        var today = context.Today;
        var patient = visit.Patient!;
        var doctor = visit.Doctor!;
        var canMedical = actor.Has(ProjectPermissions.MedicalRecords.View);
        var own = actor.IsAdmin || actor.DoctorId == visit.DoctorId;
        var canEdit = visit.Status is VisitStatus.DangKham or VisitStatus.ChoKetQua && own && actor.Has(ProjectPermissions.Visits.Examine);
        string? reopenBlocked = null;
        var canReopen = false;
        if (visit.Status is VisitStatus.ChoThanhToan or VisitStatus.HoanTat)
        {
            reopenBlocked = await ReopenBlockedReasonAsync(visit, ct);
            canReopen = reopenBlocked is null && own && actor.Has(ProjectPermissions.Visits.Reopen);
        }

        var invoice = await invoices.QueryNoTracking().Where(i => i.VisitId == id && i.Status != InvoiceStatus.DaHuy).OrderByDescending(i => i.CreatedAt).FirstOrDefaultAsync(ct);
        var appointmentCode = visit.AppointmentId is { } aid ? await appointments.QueryNoTracking().Where(a => a.Id == aid).Select(a => a.Code).FirstOrDefaultAsync(ct) : null;

        VisitMedicalDto? medical = null;
        IReadOnlyList<PlanItemOption> planOptions = [];
        if (canMedical)
        {
            var planIds = visit.Orders.Where(o => o.TreatmentPlanItemId != null).Select(o => o.TreatmentPlanItemId!.Value).ToList();
            var planCodes = planIds.Count == 0
                ? new Dictionary<Guid, string>()
                : await planItems.QueryNoTracking().Where(i => planIds.Contains(i.Id))
                    .Join(plans.QueryNoTracking(), i => i.PlanId, p => p.Id, (i, p) => new { i.Id, p.Code })
                    .ToDictionaryAsync(x => x.Id, x => x.Code, ct);
            medical = new VisitMedicalDto
            {
                Temperature = visit.Temperature,
                Pulse = visit.Pulse,
                BpSystolic = visit.BpSystolic,
                BpDiastolic = visit.BpDiastolic,
                Weight = visit.Weight,
                Height = visit.Height,
                Symptoms = visit.Symptoms,
                Examination = visit.Examination,
                Diagnoses = visit.Diagnoses.OrderBy(d => d.Kind).ThenBy(d => d.SortOrder)
                    .Select(d => new VisitDiagnosisDto { Kind = d.Kind, IcdCode = d.IcdCode, Name = d.Name }).ToList(),
                Orders = visit.Orders.OrderBy(o => o.SortOrder).Select(o => new VisitOrderDto
                {
                    Id = o.Id,
                    ServiceId = o.ServiceId,
                    ServiceCode = o.ServiceCode,
                    ServiceName = o.ServiceName,
                    Group = o.Group,
                    Unit = o.Unit,
                    Teeth = ClinicMappings.TeethList(o.Teeth),
                    Quantity = o.Quantity,
                    UnitPrice = o.UnitPrice,
                    Discount = o.Discount,
                    Amount = o.UnitPrice * o.Quantity - o.Discount,
                    Result = o.Result,
                    ImageUrls = ClinicMappings.ImageList(o.ImageUrls),
                    Status = o.Status,
                    TreatmentPlanItemId = o.TreatmentPlanItemId,
                    PlanCode = o.TreatmentPlanItemId is { } pid ? planCodes.GetValueOrDefault(pid) : null
                }).ToList(),
                Prescription = visit.Prescription.OrderBy(p => p.SortOrder).Select(p => new PrescriptionLineDto
                {
                    Id = p.Id,
                    MedicineId = p.MedicineId,
                    MedicineCode = p.MedicineCode,
                    Name = p.Name,
                    Strength = p.Strength,
                    Unit = p.Unit,
                    ActiveIngredient = p.ActiveIngredient,
                    Quantity = p.Quantity,
                    Days = p.Days,
                    Usage = p.Usage,
                    UnitPrice = p.UnitPrice,
                    Amount = p.UnitPrice * p.Quantity,
                    AllergyConfirmed = p.AllergyConfirmedAt is not null,
                    AllergyConfirmedByName = p.AllergyConfirmedByName,
                    AllergyConfirmedAt = p.AllergyConfirmedAt,
                    AllergyMatches = ClinicRules.AllergyMatches(patient.Allergies, p.ActiveIngredient)
                }).ToList(),
                Advice = visit.Advice,
                FollowUpDate = ClinicMappings.Iso(visit.FollowUpDate),
                FollowUpNote = visit.FollowUpNote
            };
            planOptions = await PlanOptionsAsync(visit, ct);
            if (logView)
            {
                await context.LogMedicalViewAsync(patient.Id, patient.Code, patient.FullName, $"Phiếu khám {visit.Code}", ct);
                await unitOfWork.SaveChangesAsync(ct);
            }
        }

        return new VisitDetailDto
        {
            Id = visit.Id,
            Code = visit.Code,
            Date = ClinicMappings.Iso(visit.Date),
            Status = visit.Status,
            QueueNumber = visit.QueueNumber,
            Ticket = ClinicRules.Ticket(doctor.Room, visit.QueueNumber),
            DoctorId = visit.DoctorId,
            DoctorName = doctor.DoctorName(),
            Room = doctor.Room,
            SpecialtyId = doctor.SpecialtyId,
            SpecialtyName = doctor.Specialty?.Name ?? string.Empty,
            Patient = patient.ToDto(today),
            AppointmentId = visit.AppointmentId,
            AppointmentCode = appointmentCode,
            IsPriority = visit.IsPriority,
            PriorityReason = visit.PriorityReason,
            IsFollowUp = visit.IsFollowUp,
            IsReturned = visit.IsReturned,
            Reason = visit.Reason,
            CheckedInAt = visit.CheckedInAt,
            CheckedInByName = visit.CheckedInByName,
            StartedAt = visit.StartedAt,
            FinishedAt = visit.FinishedAt,
            SkipCount = visit.SkipCount,
            CancelReason = visit.CancelReason,
            CanEdit = canEdit,
            CanFinish = canEdit,
            CanReopen = canReopen,
            ReopenBlockedReason = reopenBlocked,
            CanMedical = canMedical,
            Medical = medical,
            ActivePlanItems = planOptions,
            Invoice = invoice?.ToBrief()
        };
    }

    /// <summary>Hạng mục chưa làm của kế hoạch đang điều trị (BR-23), đánh dấu hạng mục đã nằm ở lượt khác còn mở.</summary>
    private async Task<IReadOnlyList<PlanItemOption>> PlanOptionsAsync(Visit visit, CancellationToken ct)
    {
        var active = await plans.QueryNoTracking().Include(p => p.Items)
            .Where(p => p.PatientId == visit.PatientId && p.Status == PlanStatus.DangDieuTri)
            .OrderBy(p => p.CreatedAt)
            .ToListAsync(ct);
        var itemIds = active.SelectMany(p => p.Items).Where(i => i.Status == PlanItemStatus.ChuaLam).Select(i => i.Id).ToList();
        if (itemIds.Count == 0)
            return [];
        var elsewhere = await orders.QueryNoTracking()
            .Where(o => o.TreatmentPlanItemId != null && itemIds.Contains(o.TreatmentPlanItemId.Value) && o.VisitId != visit.Id)
            .Join(visits.QueryNoTracking(), o => o.VisitId, v => v.Id, (o, v) => new { o.TreatmentPlanItemId, v.Status })
            .Where(x => x.Status == VisitStatus.ChoKham || x.Status == VisitStatus.DangKham || x.Status == VisitStatus.ChoKetQua)
            .Select(x => x.TreatmentPlanItemId!.Value)
            .ToListAsync(ct);
        return active
            .SelectMany(p => p.Items.Where(i => i.Status == PlanItemStatus.ChuaLam).OrderBy(i => i.SortOrder).Select(i => new PlanItemOption
            {
                Id = i.Id,
                PlanId = p.Id,
                PlanCode = p.Code,
                ServiceId = i.ServiceId,
                ServiceCode = i.ServiceCode,
                ServiceName = i.ServiceName,
                Unit = i.Unit,
                Teeth = ClinicMappings.TeethList(i.Teeth),
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                DiscountAmount = i.DiscountAmount,
                Amount = i.Amount,
                InOtherVisit = elsewhere.Contains(i.Id)
            }))
            .ToList();
    }
}
