using Application.Common.Exceptions;
using Application.Common.Models;
using Application.Common.Time;
using Application.DTOs.Clinic;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Clinic;
using Application.Validators.Clinic;
using Domain.Entities.Booking.Appointments;
using Domain.Entities.Booking.Doctors;
using Domain.Entities.Clinic.Patients;
using Domain.Entities.Clinic.TreatmentPlans;
using Domain.Entities.Clinic.Visits;
using Domain.Entities.Finance.Invoices;
using Domain.Enums.Booking;
using Domain.Enums.Clinic;
using Domain.Enums.Finance;
using Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Clinic;

/// <summary>Hồ sơ bệnh nhân (UC-07, BR-14, BR-15, 07 §4.7).</summary>
public sealed class PatientService(
    IClinicContext context,
    IGenericRepository<Patient> patients,
    IGenericRepository<Visit> visits,
    IGenericRepository<Appointment> appointments,
    IGenericRepository<Invoice> invoices,
    IGenericRepository<TreatmentPlan> plans,
    IGenericRepository<Doctor> doctors,
    IUnitOfWork unitOfWork) : IPatientService
{
    public async Task<PaginatedResult<PatientDto>> GetPagedAsync(PatientQuery query, CancellationToken ct = default)
    {
        var source = patients.QueryNoTracking();
        if (query.GetSearchTerm() is { } term)
        {
            var digits = ClinicValidationRules.Digits(term);
            var pattern = LikePattern.Contains(term);
            var phonePattern = LikePattern.Contains(digits.Length > 0 ? digits : term);
            source = source.Where(p => AppDbFunctions.Matches(p.Code, pattern) || AppDbFunctions.Matches(p.FullName, pattern) || AppDbFunctions.Matches(p.Phone, phonePattern));
        }

        if (query.HasDebt is true)
        {
            var debtors = invoices.QueryNoTracking().Where(i => i.Status == InvoiceStatus.ChoThu || i.Status == InvoiceStatus.ThuMotPhan).Select(i => i.PatientId);
            source = source.Where(p => debtors.Contains(p.Id));
        }

        if (string.IsNullOrWhiteSpace(query.SortBy))
        {
            query.SortBy = "code";
            query.SortDir ??= "desc";
        }

        var page = await source.ApplySorting(query).ToPaginatedResultAsync(query, ct);
        var stats = await StatsAsync(page.Items.Select(p => p.Id).ToList(), ct);
        var today = context.Today;
        return page.Map(items => items.Select(p => p.ToDto(today, stats.GetValueOrDefault(p.Id))).ToList());
    }

    public async Task<PatientDetailDto> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var patient = await patients.QueryNoTracking().FirstOrDefaultAsync(p => p.Id == id, ct) ?? throw new NotFoundException("Không tìm thấy bệnh nhân.");
        var today = context.Today;
        var stats = await StatsAsync([id], ct);
        var upcoming = await appointments.QueryNoTracking().Include(a => a.Patient)
            .Where(a => a.PatientId == id && a.Date >= today && (a.Status == AppointmentStatus.ChoXacNhan || a.Status == AppointmentStatus.DaXacNhan))
            .OrderBy(a => a.StartAt)
            .ToListAsync(ct);
        var names = await doctors.QueryNoTracking().ToDictionaryAsync(d => d.Id, d => d.FullName, ct);
        return new PatientDetailDto
        {
            Patient = patient.ToDto(today, stats.GetValueOrDefault(id)),
            UpcomingAppointments = upcoming.Select(a => a.ToBrief(Domain.Entities.Clinic.ClinicRules.DoctorShort(names.GetValueOrDefault(a.DoctorId) ?? string.Empty))).ToList(),
            ActivePlanCount = await plans.QueryNoTracking().CountAsync(p => p.PatientId == id && (p.Status == PlanStatus.DangDieuTri || p.Status == PlanStatus.DaBaoGia || p.Status == PlanStatus.ChoDuyet), ct),
            DebtInvoiceCount = await invoices.QueryNoTracking().CountAsync(i => i.PatientId == id && (i.Status == InvoiceStatus.ChoThu || i.Status == InvoiceStatus.ThuMotPhan), ct)
        };
    }

    public async Task<DuplicateResultDto> FindDuplicatesAsync(DuplicateQuery query, CancellationToken ct = default)
    {
        var phone = ClinicValidationRules.Digits(query.Phone ?? string.Empty);
        if (!ClinicValidationRules.IsPhone(phone))
            return new DuplicateResultDto();
        var today = context.Today;
        var same = await patients.QueryNoTracking().Where(p => p.Phone == phone && p.Id != query.ExcludeId).OrderBy(p => p.Code).ToListAsync(ct);
        var hasBirth = VietnamDates.TryParse(query.BirthDate, out var birth);
        return new DuplicateResultDto
        {
            Exact = hasBirth ? same.Where(p => p.BirthDate == birth).Select(p => p.ToBrief(today)).ToList() : [],
            SamePhone = same.Where(p => !hasBirth || p.BirthDate != birth).Select(p => p.ToBrief(today)).ToList()
        };
    }

    public async Task<PatientDto> CreateAsync(SavePatientRequest request, CancellationToken ct = default)
    {
        var patient = await ClinicPatients.CreateAsync(context, patients, ClinicPatients.From(request), request.Force, string.Empty, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return patient.ToDto(context.Today, new PatientStats(null, 0, 0, false));
    }

    public async Task<PatientDto> UpdateAsync(Guid id, SavePatientRequest request, CancellationToken ct = default)
    {
        var patient = await patients.GetByIdAsync(id, ct) ?? throw new NotFoundException("Không tìm thấy bệnh nhân.");
        VietnamDates.TryParse(request.BirthDate, out var birth);
        if (birth > context.Today)
            throw FieldErrors.Single("birthDate", "Ngày sinh không được sau hôm nay");
        patient.FullName = ClinicPatients.NormalizeName(request.FullName);
        patient.BirthDate = birth;
        patient.Gender = request.Gender;
        patient.Phone = ClinicValidationRules.Digits(request.Phone);
        patient.Address = ClinicPatients.Trim(request.Address);
        patient.ContactPerson = ClinicPatients.Trim(request.ContactPerson);
        patient.Allergies = ClinicPatients.Trim(request.Allergies);
        patient.MedicalHistory = ClinicPatients.Trim(request.MedicalHistory);
        patient.Note = ClinicPatients.Trim(request.Note);
        await unitOfWork.SaveChangesAsync(ct);
        var stats = await StatsAsync([id], ct);
        return patient.ToDto(context.Today, stats.GetValueOrDefault(id));
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var patient = await patients.GetByIdAsync(id, ct) ?? throw new NotFoundException("Không tìm thấy bệnh nhân.");
        if (await visits.AnyAsync(v => v.PatientId == id, ct) || await appointments.AnyAsync(a => a.PatientId == id, ct) || await plans.AnyAsync(p => p.PatientId == id, ct))
            throw ClinicProblems.InUse("Bệnh nhân đã có lượt khám hoặc lịch hẹn, không xóa được (BR-15).");
        patients.Delete(patient);
        await unitOfWork.SaveChangesAsync(ct);
    }

    private async Task<Dictionary<Guid, PatientStats>> StatsAsync(List<Guid> ids, CancellationToken ct)
    {
        if (ids.Count == 0)
            return [];
        var visitRows = await visits.QueryNoTracking()
            .Where(v => ids.Contains(v.PatientId) && v.Status != VisitStatus.BoVe)
            .GroupBy(v => v.PatientId)
            .Select(g => new { g.Key, Count = g.Count(), Last = g.Max(v => v.CheckedInAt) })
            .ToListAsync(ct);
        var debtRows = await invoices.QueryNoTracking()
            .Where(i => ids.Contains(i.PatientId) && (i.Status == InvoiceStatus.ChoThu || i.Status == InvoiceStatus.ThuMotPhan))
            .Select(i => new { i.PatientId, i.Total, i.Paid })
            .ToListAsync(ct);
        var withAppointments = await appointments.QueryNoTracking().Where(a => a.PatientId != null && ids.Contains(a.PatientId.Value)).Select(a => a.PatientId!.Value).Distinct().ToListAsync(ct);
        var anyVisit = await visits.QueryNoTracking().Where(v => ids.Contains(v.PatientId)).Select(v => v.PatientId).Distinct().ToListAsync(ct);
        return ids.ToDictionary(id => id, id =>
        {
            var v = visitRows.FirstOrDefault(x => x.Key == id);
            return new PatientStats(
                v?.Last,
                v?.Count ?? 0,
                debtRows.Where(d => d.PatientId == id).Sum(d => d.Total - d.Paid),
                withAppointments.Contains(id) || anyVisit.Contains(id));
        });
    }
}
