using API.Base;
using API.Filters;
using Application.Common.Models;
using Application.DTOs.Booking;
using Application.DTOs.Clinic;
using Application.DTOs.Finance;
using Application.Interfaces.Services.Clinic;
using Domain.Enums.Clinic;
using Microsoft.AspNetCore.Mvc;
using P = Application.Constants.ProjectPermissions;

namespace API.Controllers.Clinic;

/// <summary>Gốc của controller nghiệp vụ Phòng khám: đưa <c>code</c> của lỗi 404, 429 vào ProblemDetails.</summary>
[ClinicProblem]
public abstract class ClinicControllerBase : BaseApiController
{
    /// <summary>Tạo mới trả 201; gửi lại cùng <c>clientRequestId</c> trả 200 kèm bản đã tạo.</summary>
    protected IActionResult CreatedOrOk<T>(CreateResult<T> result) =>
        result.Created ? StatusCode(StatusCodes.Status201Created, result.Value) : Ok(result.Value);

    protected IActionResult Created201<T>(T value) => StatusCode(StatusCodes.Status201Created, value);
}

/// <summary>Chuyên khoa (07 §4.1).</summary>
[Route("api/specialties")]
public sealed class SpecialtiesController(IServiceCatalogService service) : ClinicControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<SpecialtyDto>> GetAll(CancellationToken ct) => service.GetSpecialtiesAsync(ct);
}

/// <summary>Dịch vụ (07 §4.1).</summary>
[Route("api/services")]
public sealed class ServicesController(IServiceCatalogService service) : ClinicControllerBase
{
    [HttpGet]
    [AuthorizePermission(P.Services.View)]
    public Task<IReadOnlyList<ServiceDto>> GetAll([FromQuery] ServiceQuery query, CancellationToken ct) => service.GetServicesAsync(query, ct);

    [HttpGet("options")]
    public Task<IReadOnlyList<ServiceDto>> GetOptions(CancellationToken ct) => service.GetOptionsAsync(ct);

    [HttpGet("next-code")]
    [AuthorizePermission(P.Services.Create)]
    public Task<NextCodeDto> NextCode([FromQuery] ServiceGroup group, CancellationToken ct) => service.NextCodeAsync(group, ct);

    [HttpPost]
    [AuthorizePermission(P.Services.Create)]
    public async Task<IActionResult> Create(SaveServiceRequest request, CancellationToken ct) => Created201(await service.CreateAsync(request, ct));

    [HttpPut("{id:guid}")]
    [AuthorizePermission(P.Services.Update)]
    public Task<ServiceDto> Update(Guid id, SaveServiceRequest request, CancellationToken ct) => service.UpdateAsync(id, request, ct);

    [HttpPatch("{id:guid}/status")]
    [AuthorizePermission(P.Services.Update)]
    public Task<ServiceDto> SetStatus(Guid id, SetActiveRequest request, CancellationToken ct) => service.SetActiveAsync(id, request.IsActive, ct);

    [HttpDelete("{id:guid}")]
    [AuthorizePermission(P.Services.Delete)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await service.DeleteAsync(id, ct);
        return NoContent();
    }
}

/// <summary>Thuốc (07 §4.1).</summary>
[Route("api/medicines")]
public sealed class MedicinesController(IMedicineService service) : ClinicControllerBase
{
    [HttpGet]
    [AuthorizePermission(P.Medicines.View)]
    public Task<PaginatedResult<MedicineDto>> GetPaged([FromQuery] MedicineQuery query, CancellationToken ct) => service.GetPagedAsync(query, ct);

    [HttpGet("options")]
    public Task<IReadOnlyList<MedicineDto>> GetOptions(CancellationToken ct) => service.GetOptionsAsync(ct);

    [HttpGet("next-code")]
    [AuthorizePermission(P.Medicines.Create)]
    public Task<NextCodeDto> NextCode(CancellationToken ct) => service.NextCodeAsync(ct);

    [HttpPost]
    [AuthorizePermission(P.Medicines.Create)]
    public async Task<IActionResult> Create(SaveMedicineRequest request, CancellationToken ct) => Created201(await service.CreateAsync(request, ct));

    [HttpPut("{id:guid}")]
    [AuthorizePermission(P.Medicines.Update)]
    public Task<MedicineDto> Update(Guid id, SaveMedicineRequest request, CancellationToken ct) => service.UpdateAsync(id, request, ct);

    [HttpPatch("{id:guid}/status")]
    [AuthorizePermission(P.Medicines.Update)]
    public Task<MedicineDto> SetStatus(Guid id, SetActiveRequest request, CancellationToken ct) => service.SetActiveAsync(id, request.IsActive, ct);

    [HttpDelete("{id:guid}")]
    [AuthorizePermission(P.Medicines.Delete)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await service.DeleteAsync(id, ct);
        return NoContent();
    }
}

/// <summary>Chẩn đoán mẫu (07 §4.1).</summary>
[Route("api/diagnosis-templates")]
public sealed class DiagnosisTemplatesController(IDiagnosisTemplateService service) : ClinicControllerBase
{
    [HttpGet]
    [AuthorizePermission(P.Services.View)]
    public Task<IReadOnlyList<DiagnosisTemplateDto>> GetAll([FromQuery] DiagnosisQuery query, CancellationToken ct) => service.GetAllAsync(query, ct);

    [HttpGet("options")]
    public Task<IReadOnlyList<DiagnosisTemplateDto>> GetOptions(CancellationToken ct) => service.GetOptionsAsync(ct);

    [HttpPost]
    [AuthorizePermission(P.Services.Create)]
    public async Task<IActionResult> Create(SaveDiagnosisTemplateRequest request, CancellationToken ct) => Created201(await service.CreateAsync(request, ct));

    [HttpPut("{id:guid}")]
    [AuthorizePermission(P.Services.Update)]
    public Task<DiagnosisTemplateDto> Update(Guid id, SaveDiagnosisTemplateRequest request, CancellationToken ct) => service.UpdateAsync(id, request, ct);

    [HttpPatch("{id:guid}/status")]
    [AuthorizePermission(P.Services.Update)]
    public Task<DiagnosisTemplateDto> SetStatus(Guid id, SetActiveRequest request, CancellationToken ct) => service.SetActiveAsync(id, request.IsActive, ct);

    [HttpDelete("{id:guid}")]
    [AuthorizePermission(P.Services.Delete)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await service.DeleteAsync(id, ct);
        return NoContent();
    }
}

/// <summary>Bác sĩ, lịch làm việc (07 §4.2).</summary>
[Route("api/doctors")]
public sealed class DoctorsController(IDoctorService service) : ClinicControllerBase
{
    [HttpGet]
    [AuthorizePermission(P.Doctors.View)]
    public Task<IReadOnlyList<DoctorDto>> GetAll(CancellationToken ct) => service.GetAllAsync(ct);

    [HttpGet("options")]
    public Task<IReadOnlyList<DoctorOption>> GetOptions(CancellationToken ct) => service.GetOptionsAsync(ct);

    [HttpGet("account-candidates")]
    [AuthorizePermission(P.Doctors.Update, P.Doctors.Create)]
    public Task<IReadOnlyList<AccountCandidate>> GetAccountCandidates(CancellationToken ct) => service.GetAccountCandidatesAsync(ct);

    [HttpGet("next-code")]
    [AuthorizePermission(P.Doctors.Create)]
    public Task<NextCodeDto> NextCode(CancellationToken ct) => service.NextCodeAsync(ct);

    [HttpPost]
    [AuthorizePermission(P.Doctors.Create)]
    public async Task<IActionResult> Create(SaveDoctorRequest request, CancellationToken ct) => Created201(await service.CreateAsync(request, ct));

    [HttpPut("{id:guid}")]
    [AuthorizePermission(P.Doctors.Update)]
    public Task<DoctorDto> Update(Guid id, SaveDoctorRequest request, CancellationToken ct) => service.UpdateAsync(id, request, ct);

    [HttpPut("{id:guid}/schedule")]
    [AuthorizePermission(P.Doctors.Update)]
    public Task<DoctorDto> SaveSchedule(Guid id, SaveScheduleRequest request, CancellationToken ct) => service.SaveScheduleAsync(id, request, ct);

    [HttpPatch("{id:guid}/status")]
    [AuthorizePermission(P.Doctors.Update)]
    public Task<DoctorDto> SetStatus(Guid id, SetActiveRequest request, CancellationToken ct) => service.SetActiveAsync(id, request.IsActive, ct);

    [HttpDelete("{id:guid}")]
    [AuthorizePermission(P.Doctors.Delete)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await service.DeleteAsync(id, ct);
        return NoContent();
    }
}

/// <summary>Ngày nghỉ đột xuất (07 §4.2).</summary>
[Route("api/days-off")]
public sealed class DaysOffController(IDoctorService service) : ClinicControllerBase
{
    [HttpGet]
    [AuthorizePermission(P.Doctors.View)]
    public Task<IReadOnlyList<DayOffDto>> GetAll([FromQuery] DayOffQuery query, CancellationToken ct) => service.GetDaysOffAsync(query, ct);

    [HttpPost]
    [AuthorizePermission(P.Doctors.Update)]
    public async Task<IActionResult> Create(CreateDayOffRequest request, CancellationToken ct) => Created201(await service.CreateDayOffAsync(request, ct));

    [HttpDelete("{id:guid}")]
    [AuthorizePermission(P.Doctors.Update)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await service.DeleteDayOffAsync(id, ct);
        return NoContent();
    }
}

/// <summary>Thông tin phòng khám cho bản in, QR (07 §4.9).</summary>
[Route("api/clinic-profile")]
public sealed class ClinicProfileController(IClinicProfileService service) : ClinicControllerBase
{
    [HttpGet]
    public Task<ClinicProfileDto> Get(CancellationToken ct) => service.GetAsync(ct);
}
