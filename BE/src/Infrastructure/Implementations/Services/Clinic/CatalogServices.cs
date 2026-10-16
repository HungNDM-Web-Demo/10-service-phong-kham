using System.Globalization;
using Application.Common.Exceptions;
using Application.Common.Models;
using Application.DTOs.Clinic;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Clinic;
using Domain.Entities.Booking.Appointments;
using Domain.Entities.Clinic.Diagnoses;
using Domain.Entities.Clinic.Medicines;
using Domain.Entities.Clinic.Services;
using Domain.Entities.Clinic.Specialties;
using Domain.Entities.Clinic.TreatmentPlans;
using Domain.Entities.Clinic.Visits;
using Domain.Enums.Clinic;
using Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Clinic;

/// <summary>Chuyên khoa, dịch vụ (UC-01, 07 §4.1).</summary>
public sealed class ServiceCatalogService(
    IGenericRepository<Specialty> specialties,
    IGenericRepository<Service> services,
    IGenericRepository<VisitOrder> orders,
    IGenericRepository<TreatmentPlanItem> planItems,
    IGenericRepository<Appointment> appointments,
    IUnitOfWork unitOfWork) : IServiceCatalogService
{
    public async Task<IReadOnlyList<SpecialtyDto>> GetSpecialtiesAsync(CancellationToken ct = default)
    {
        var list = await specialties.QueryNoTracking().Include(s => s.ExamService).OrderBy(s => s.SortOrder).ThenBy(s => s.Code).ToListAsync(ct);
        return list.Select(s => new SpecialtyDto
        {
            Id = s.Id,
            Code = s.Code,
            Name = s.Name,
            ExamServiceId = s.ExamServiceId,
            ExamServiceName = s.ExamService?.Name,
            ExamFee = s.ExamService?.Price ?? 0,
            DefaultMaxPerSlot = s.DefaultMaxPerSlot
        }).ToList();
    }

    public async Task<IReadOnlyList<ServiceDto>> GetServicesAsync(ServiceQuery query, CancellationToken ct = default)
    {
        var source = services.QueryNoTracking();
        if (query.Group is { } group)
            source = source.Where(s => s.Group == group);
        if (query.SpecialtyId is { } specialtyId)
            source = source.Where(s => s.SpecialtyId == specialtyId);
        if (query.Active is { } active)
            source = source.Where(s => s.IsActive == active);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var pattern = LikePattern.Contains(query.Search.Trim());
            source = source.Where(s => AppDbFunctions.Matches(s.Code, pattern) || AppDbFunctions.Matches(s.Name, pattern));
        }

        var list = await source.ToListAsync(ct);
        return await ToDtosAsync(list, ct);
    }

    public async Task<IReadOnlyList<ServiceDto>> GetOptionsAsync(CancellationToken ct = default)
    {
        var list = await services.QueryNoTracking().Where(s => s.IsActive).ToListAsync(ct);
        return await ToDtosAsync(list, ct);
    }

    public async Task<NextCodeDto> NextCodeAsync(ServiceGroup group, CancellationToken ct = default)
    {
        var prefix = PrefixOf(group);
        var codes = await services.QueryNoTracking().Where(s => s.Code.StartsWith(prefix)).Select(s => s.Code).ToListAsync(ct);
        var max = codes.Select(c => int.TryParse(c.AsSpan(prefix.Length), out var n) ? n : 0).DefaultIfEmpty(0).Max();
        return new NextCodeDto { Code = prefix + (max + 1).ToString("00", CultureInfo.InvariantCulture) };
    }

    public async Task<ServiceDto> CreateAsync(SaveServiceRequest request, CancellationToken ct = default)
    {
        var code = request.Code.Trim().ToUpperInvariant();
        if (await services.AnyAsync(s => s.Code == code, ct))
            throw new ConflictException($"Mã {code} đã có.", "code");
        await EnsureSpecialtyAsync(request.SpecialtyId, ct);
        var service = new Service();
        Apply(service, request, code);
        await services.AddAsync(service, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return (await ToDtosAsync([service], ct))[0];
    }

    public async Task<ServiceDto> UpdateAsync(Guid id, SaveServiceRequest request, CancellationToken ct = default)
    {
        var service = await services.GetByIdAsync(id, ct) ?? throw new NotFoundException("Không tìm thấy dịch vụ.");
        var code = request.Code.Trim().ToUpperInvariant();
        if (await services.AnyAsync(s => s.Code == code && s.Id != id, ct))
            throw new ConflictException($"Mã {code} đã có.", "code");
        await EnsureSpecialtyAsync(request.SpecialtyId, ct);
        Apply(service, request, code);
        await unitOfWork.SaveChangesAsync(ct);
        return (await ToDtosAsync([service], ct))[0];
    }

    public async Task<ServiceDto> SetActiveAsync(Guid id, bool isActive, CancellationToken ct = default)
    {
        var service = await services.GetByIdAsync(id, ct) ?? throw new NotFoundException("Không tìm thấy dịch vụ.");
        if (!isActive && await specialties.AnyAsync(s => s.ExamServiceId == id, ct))
            throw ClinicProblems.InvalidState("Dịch vụ đang là phí khám của chuyên khoa, không ngừng được.");
        service.IsActive = isActive;
        await unitOfWork.SaveChangesAsync(ct);
        return (await ToDtosAsync([service], ct))[0];
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var service = await services.GetByIdAsync(id, ct) ?? throw new NotFoundException("Không tìm thấy dịch vụ.");
        if (await IsUsedAsync(id, ct))
            throw ClinicProblems.InUse("Dịch vụ đã dùng trong lượt khám, kế hoạch hoặc lịch hẹn. Hãy chọn \"Ngừng\" (BR-33).");
        services.Delete(service);
        await unitOfWork.SaveChangesAsync(ct);
    }

    private static string PrefixOf(ServiceGroup group) => group switch
    {
        ServiceGroup.Kham => "KB",
        ServiceGroup.ThuThuat => "NK",
        _ => "CLS"
    };

    private static void Apply(Service service, SaveServiceRequest request, string code)
    {
        service.Code = code;
        service.Name = request.Name.Trim();
        service.Group = request.Group;
        service.SpecialtyId = request.SpecialtyId;
        service.Unit = request.Unit;
        service.Price = request.Price;
        service.RequiresTooth = request.Group == ServiceGroup.ThuThuat && request.RequiresTooth;
        service.IsActive = request.IsActive;
    }

    private async Task EnsureSpecialtyAsync(Guid? specialtyId, CancellationToken ct)
    {
        if (specialtyId is { } id && !await specialties.AnyAsync(s => s.Id == id, ct))
            throw new ConflictException("Chuyên khoa không tồn tại.", "specialtyId");
    }

    private async Task<bool> IsUsedAsync(Guid id, CancellationToken ct) =>
        await orders.AnyAsync(o => o.ServiceId == id, ct)
        || await planItems.AnyAsync(i => i.ServiceId == id, ct)
        || await appointments.AnyAsync(a => a.ServiceId == id, ct)
        || await specialties.AnyAsync(s => s.ExamServiceId == id, ct);

    private async Task<List<ServiceDto>> ToDtosAsync(IReadOnlyCollection<Service> list, CancellationToken ct)
    {
        var ids = list.Select(s => s.Id).ToList();
        var used = new HashSet<Guid>(await orders.QueryNoTracking().Where(o => ids.Contains(o.ServiceId)).Select(o => o.ServiceId).Distinct().ToListAsync(ct));
        used.UnionWith(await planItems.QueryNoTracking().Where(i => ids.Contains(i.ServiceId)).Select(i => i.ServiceId).Distinct().ToListAsync(ct));
        used.UnionWith(await appointments.QueryNoTracking().Where(a => a.ServiceId != null && ids.Contains(a.ServiceId.Value)).Select(a => a.ServiceId!.Value).Distinct().ToListAsync(ct));
        var specs = await specialties.QueryNoTracking().ToListAsync(ct);
        used.UnionWith(specs.Where(s => s.ExamServiceId is not null).Select(s => s.ExamServiceId!.Value));
        return list
            .OrderBy(s => s.Group).ThenBy(s => s.Code, StringComparer.Ordinal)
            .Select(s => new ServiceDto
            {
                Id = s.Id,
                Code = s.Code,
                Name = s.Name,
                Group = s.Group,
                SpecialtyId = s.SpecialtyId,
                SpecialtyName = specs.FirstOrDefault(x => x.Id == s.SpecialtyId)?.Name,
                Unit = s.Unit,
                Price = s.Price,
                RequiresTooth = s.RequiresTooth,
                IsActive = s.IsActive,
                IsUsed = used.Contains(s.Id)
            })
            .ToList();
    }
}

/// <summary>Thuốc (UC-01, 07 §4.1).</summary>
public sealed class MedicineService(
    IGenericRepository<Medicine> medicines,
    IGenericRepository<PrescriptionLine> lines,
    IUnitOfWork unitOfWork) : IMedicineService
{
    public async Task<PaginatedResult<MedicineDto>> GetPagedAsync(MedicineQuery query, CancellationToken ct = default)
    {
        var source = medicines.QueryNoTracking();
        if (query.Active is { } active)
            source = source.Where(m => m.IsActive == active);
        if (query.GetSearchTerm() is { } term)
        {
            var pattern = LikePattern.Contains(term);
            source = source.Where(m => AppDbFunctions.Matches(m.Code, pattern) || AppDbFunctions.Matches(m.Name, pattern) || AppDbFunctions.Matches(m.ActiveIngredient, pattern));
        }

        if (string.IsNullOrWhiteSpace(query.SortBy))
        {
            query.SortBy = "code";
            query.SortDir ??= "asc";
        }

        var page = await source.ApplySorting(query).ToPaginatedResultAsync(query, ct);
        var used = await UsedAsync(page.Items.Select(m => m.Id).ToList(), ct);
        return page.Map(items => items.Select(m => ToDto(m, used.Contains(m.Id))).ToList());
    }

    public async Task<IReadOnlyList<MedicineDto>> GetOptionsAsync(CancellationToken ct = default)
    {
        var list = await medicines.QueryNoTracking().Where(m => m.IsActive).OrderBy(m => m.Name).ToListAsync(ct);
        return list.Select(m => ToDto(m, false)).ToList();
    }

    public async Task<NextCodeDto> NextCodeAsync(CancellationToken ct = default)
    {
        var codes = await medicines.QueryNoTracking().Where(m => m.Code.StartsWith("T")).Select(m => m.Code).ToListAsync(ct);
        var max = codes.Select(c => int.TryParse(c.AsSpan(1), out var n) ? n : 0).DefaultIfEmpty(0).Max();
        return new NextCodeDto { Code = "T" + (max + 1).ToString("000", CultureInfo.InvariantCulture) };
    }

    public async Task<MedicineDto> CreateAsync(SaveMedicineRequest request, CancellationToken ct = default)
    {
        var code = request.Code.Trim().ToUpperInvariant();
        if (await medicines.AnyAsync(m => m.Code == code, ct))
            throw new ConflictException($"Mã {code} đã có.", "code");
        var medicine = new Medicine();
        Apply(medicine, request, code);
        await medicines.AddAsync(medicine, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return ToDto(medicine, false);
    }

    public async Task<MedicineDto> UpdateAsync(Guid id, SaveMedicineRequest request, CancellationToken ct = default)
    {
        var medicine = await medicines.GetByIdAsync(id, ct) ?? throw new NotFoundException("Không tìm thấy thuốc.");
        var code = request.Code.Trim().ToUpperInvariant();
        if (await medicines.AnyAsync(m => m.Code == code && m.Id != id, ct))
            throw new ConflictException($"Mã {code} đã có.", "code");
        Apply(medicine, request, code);
        await unitOfWork.SaveChangesAsync(ct);
        return ToDto(medicine, await lines.AnyAsync(l => l.MedicineId == id, ct));
    }

    public async Task<MedicineDto> SetActiveAsync(Guid id, bool isActive, CancellationToken ct = default)
    {
        var medicine = await medicines.GetByIdAsync(id, ct) ?? throw new NotFoundException("Không tìm thấy thuốc.");
        medicine.IsActive = isActive;
        await unitOfWork.SaveChangesAsync(ct);
        return ToDto(medicine, await lines.AnyAsync(l => l.MedicineId == id, ct));
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var medicine = await medicines.GetByIdAsync(id, ct) ?? throw new NotFoundException("Không tìm thấy thuốc.");
        if (await lines.AnyAsync(l => l.MedicineId == id, ct))
            throw ClinicProblems.InUse("Thuốc đã kê trong đơn. Hãy chọn \"Ngừng\" (BR-33).");
        medicines.Delete(medicine);
        await unitOfWork.SaveChangesAsync(ct);
    }

    private static void Apply(Medicine medicine, SaveMedicineRequest request, string code)
    {
        medicine.Code = code;
        medicine.Name = request.Name.Trim();
        medicine.ActiveIngredient = request.ActiveIngredient.Trim();
        medicine.Strength = string.IsNullOrWhiteSpace(request.Strength) ? null : request.Strength.Trim();
        medicine.DosageForm = string.IsNullOrWhiteSpace(request.DosageForm) ? null : request.DosageForm.Trim();
        medicine.Unit = request.Unit.Trim();
        medicine.Price = request.Price;
        medicine.IsActive = request.IsActive;
    }

    private async Task<HashSet<Guid>> UsedAsync(List<Guid> ids, CancellationToken ct) =>
        new(await lines.QueryNoTracking().Where(l => ids.Contains(l.MedicineId)).Select(l => l.MedicineId).Distinct().ToListAsync(ct));

    private static MedicineDto ToDto(Medicine m, bool used) => new()
    {
        Id = m.Id,
        Code = m.Code,
        Name = m.Name,
        ActiveIngredient = m.ActiveIngredient,
        Strength = m.Strength,
        DosageForm = m.DosageForm,
        Unit = m.Unit,
        Price = m.Price,
        IsActive = m.IsActive,
        IsUsed = used
    };
}

/// <summary>Chẩn đoán mẫu (UC-01, 07 §4.1). "Đã dùng" so theo mã ICD trong chẩn đoán của lượt khám.</summary>
public sealed class DiagnosisTemplateService(
    IGenericRepository<DiagnosisTemplate> templates,
    IGenericRepository<Specialty> specialties,
    IGenericRepository<VisitDiagnosis> diagnoses,
    IUnitOfWork unitOfWork) : IDiagnosisTemplateService
{
    public async Task<IReadOnlyList<DiagnosisTemplateDto>> GetAllAsync(DiagnosisQuery query, CancellationToken ct = default)
    {
        var source = templates.QueryNoTracking();
        if (query.SpecialtyId is { } specialtyId)
            source = source.Where(t => t.SpecialtyId == specialtyId);
        if (query.Active is { } active)
            source = source.Where(t => t.IsActive == active);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var pattern = LikePattern.Contains(query.Search.Trim());
            source = source.Where(t => AppDbFunctions.Matches(t.IcdCode, pattern) || AppDbFunctions.Matches(t.Name, pattern));
        }

        return await ToDtosAsync(await source.ToListAsync(ct), ct);
    }

    public async Task<IReadOnlyList<DiagnosisTemplateDto>> GetOptionsAsync(CancellationToken ct = default) =>
        await ToDtosAsync(await templates.QueryNoTracking().Where(t => t.IsActive).ToListAsync(ct), ct);

    public async Task<DiagnosisTemplateDto> CreateAsync(SaveDiagnosisTemplateRequest request, CancellationToken ct = default)
    {
        var icd = request.IcdCode.Trim().ToUpperInvariant();
        if (await templates.AnyAsync(t => t.IcdCode == icd, ct))
            throw new ConflictException($"Mã {icd} đã có.", "icdCode");
        var template = new DiagnosisTemplate { IcdCode = icd, Name = request.Name.Trim(), SpecialtyId = request.SpecialtyId, IsActive = request.IsActive };
        await templates.AddAsync(template, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return (await ToDtosAsync([template], ct))[0];
    }

    public async Task<DiagnosisTemplateDto> UpdateAsync(Guid id, SaveDiagnosisTemplateRequest request, CancellationToken ct = default)
    {
        var template = await templates.GetByIdAsync(id, ct) ?? throw new NotFoundException("Không tìm thấy chẩn đoán mẫu.");
        var icd = request.IcdCode.Trim().ToUpperInvariant();
        if (await templates.AnyAsync(t => t.IcdCode == icd && t.Id != id, ct))
            throw new ConflictException($"Mã {icd} đã có.", "icdCode");
        template.IcdCode = icd;
        template.Name = request.Name.Trim();
        template.SpecialtyId = request.SpecialtyId;
        template.IsActive = request.IsActive;
        await unitOfWork.SaveChangesAsync(ct);
        return (await ToDtosAsync([template], ct))[0];
    }

    public async Task<DiagnosisTemplateDto> SetActiveAsync(Guid id, bool isActive, CancellationToken ct = default)
    {
        var template = await templates.GetByIdAsync(id, ct) ?? throw new NotFoundException("Không tìm thấy chẩn đoán mẫu.");
        template.IsActive = isActive;
        await unitOfWork.SaveChangesAsync(ct);
        return (await ToDtosAsync([template], ct))[0];
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var template = await templates.GetByIdAsync(id, ct) ?? throw new NotFoundException("Không tìm thấy chẩn đoán mẫu.");
        if (await diagnoses.AnyAsync(d => d.IcdCode == template.IcdCode, ct))
            throw ClinicProblems.InUse("Chẩn đoán đã dùng trong lượt khám. Hãy chọn \"Ngừng\" (BR-33).");
        templates.Delete(template);
        await unitOfWork.SaveChangesAsync(ct);
    }

    private async Task<List<DiagnosisTemplateDto>> ToDtosAsync(IReadOnlyCollection<DiagnosisTemplate> list, CancellationToken ct)
    {
        var codes = list.Select(t => t.IcdCode).ToList();
        var used = new HashSet<string>(await diagnoses.QueryNoTracking().Where(d => d.IcdCode != null && codes.Contains(d.IcdCode)).Select(d => d.IcdCode!).Distinct().ToListAsync(ct));
        var specs = await specialties.QueryNoTracking().ToListAsync(ct);
        return list
            .OrderBy(t => t.IcdCode, StringComparer.Ordinal)
            .Select(t => new DiagnosisTemplateDto
            {
                Id = t.Id,
                IcdCode = t.IcdCode,
                Name = t.Name,
                SpecialtyId = t.SpecialtyId,
                SpecialtyName = specs.FirstOrDefault(s => s.Id == t.SpecialtyId)?.Name,
                IsActive = t.IsActive,
                IsUsed = used.Contains(t.IcdCode)
            })
            .ToList();
    }
}

public sealed class ClinicProfileService(IClinicContext context) : IClinicProfileService
{
    public Task<ClinicProfileDto> GetAsync(CancellationToken ct = default) => context.GetProfileAsync(ct);
}
