using System.Globalization;
using System.Text.Json;
using Application.Common.Time;
using Domain.Entities.Booking.Appointments;
using Domain.Entities.Booking.DaysOff;
using Domain.Entities.Booking.Doctors;
using Domain.Entities.Clinic;
using Domain.Entities.Clinic.Diagnoses;
using Domain.Entities.Clinic.FollowUps;
using Domain.Entities.Clinic.Medicines;
using Domain.Entities.Clinic.Messages;
using Domain.Entities.Clinic.Patients;
using Domain.Entities.Clinic.Services;
using Domain.Entities.Clinic.Specialties;
using Domain.Entities.Clinic.TreatmentPlans;
using Domain.Entities.Clinic.Visits;
using Domain.Entities.Finance.Invoices;
using Domain.Entities.Finance.Receipts;
using Domain.Enums.Booking;
using Domain.Enums.Clinic;
using Domain.Enums.Finance;
using Infrastructure.Implementations.Services.Clinic;

namespace Infrastructure.Persistence.Seeders;

/// <summary>Tên người thao tác, thông tin phòng khám dùng khi dựng dữ liệu mẫu.</summary>
public sealed record ClinicSeedContext(
    DateTime NowUtc,
    string ReceptionistName,
    string ManagerName,
    string ClinicName,
    string Hotline,
    IReadOnlyDictionary<string, Guid> UserIds);

/// <summary>Kết quả dựng dữ liệu mẫu, sẵn để lưu.</summary>
public sealed class ClinicSeedResult
{
    public List<Specialty> Specialties { get; } = [];
    public List<Service> Services { get; } = [];
    public List<Medicine> Medicines { get; } = [];
    public List<DiagnosisTemplate> Diagnoses { get; } = [];
    public List<Doctor> Doctors { get; } = [];
    public List<DayOff> DaysOff { get; } = [];
    public List<Patient> Patients { get; } = [];
    public List<UsagePhrase> Phrases { get; } = [];
    public List<TreatmentPlan> Plans { get; } = [];
    public List<Appointment> Appointments { get; } = [];
    public List<Visit> Visits { get; } = [];
    public List<Invoice> Invoices { get; } = [];
    public List<Receipt> Receipts { get; } = [];
    public List<FollowUp> FollowUps { get; } = [];
    public List<Message> Messages { get; } = [];
}

/// <summary>
/// Dựng dữ liệu mẫu từ <c>demo-data.json</c> theo giờ hiện tại (06 §5.3–§5.7). Ngày ghi theo chỉ số ngày tính từ Thứ Hai tuần này
/// hoặc lệch ngày so với hôm nay; trạng thái suy ra bằng cách so mốc thời gian với bây giờ. FE <c>features/clinic/mock/seed-loader.ts</c>
/// làm giống hệt từng bước để hai chế độ ra cùng số liệu.
/// </summary>
public static class ClinicSeedBuilder
{
    private const string PregnantReason = "Phụ nữ có thai";
    private const string PartialReason = "Bệnh nhân hẹn thanh toán phần còn lại";
    private const int MessageWindowDays = 14;

    public static ClinicSeedResult Build(ClinicSeedFile seed, ClinicSeedContext ctx)
    {
        var now = DateTime.SpecifyKind(new DateTime(ctx.NowUtc.Ticks - ctx.NowUtc.Ticks % TimeSpan.TicksPerSecond), DateTimeKind.Utc);
        var today = VietnamDates.DateOf(now);
        var monday = today.AddDays(1 - ClinicRules.IsoDayOfWeek(today));
        DateTime Utc(DateOnly date, int minute) => VietnamDates.StartOfDayUtc(date).AddMinutes(minute);
        DateOnly Day(int i) => monday.AddDays(i);
        var result = new ClinicSeedResult();

        // 1) Danh mục
        var specialties = new Dictionary<string, Specialty>();
        for (var n = 0; n < seed.Specialties.Count; n++)
        {
            var s = seed.Specialties[n];
            specialties[s.Code] = new Specialty { Code = s.Code, Name = s.Name, DefaultMaxPerSlot = s.Max, SortOrder = (n + 1) * 10 };
        }

        var services = seed.Services.ToDictionary(s => s.Code, s => new Service
        {
            Code = s.Code,
            Name = s.Name,
            Group = s.Group,
            SpecialtyId = s.Spec is null ? null : specialties[s.Spec].Id,
            Unit = s.Unit,
            Price = s.Price,
            RequiresTooth = s.Tooth == true,
            IsActive = true
        });
        foreach (var s in seed.Specialties)
            specialties[s.Code].ExamServiceId = services[s.Exam].Id;
        var medicines = seed.Medicines.ToDictionary(m => m.Code, m => new Medicine
        {
            Code = m.Code,
            Name = m.Name,
            ActiveIngredient = m.Ing,
            Strength = m.Str,
            DosageForm = m.Form,
            Unit = m.Unit,
            Price = m.Price,
            IsActive = m.Active != false
        });
        var diagnoses = seed.Diagnoses.ToDictionary(d => d.Icd, d => new DiagnosisTemplate
        {
            IcdCode = d.Icd,
            Name = d.Name,
            SpecialtyId = d.Spec is null ? null : specialties[d.Spec].Id,
            IsActive = true
        });
        var doctors = new Dictionary<string, Doctor>();
        for (var n = 0; n < seed.Doctors.Count; n++)
        {
            var d = seed.Doctors[n];
            var doctor = new Doctor
            {
                Code = d.Code,
                FullName = d.Name,
                Title = d.Title,
                SpecialtyId = specialties[d.Spec].Id,
                Room = d.Room,
                Bio = d.Bio,
                UserId = d.User is not null && ctx.UserIds.TryGetValue(d.User, out var uid) ? uid : null,
                SlotMinutes = d.Slot,
                MaxPerSlot = d.Max,
                ShowOnline = true,
                IsActive = true,
                SortOrder = (n + 1) * 10
            };
            doctor.Hours = d.Hours.Select(h => new WorkingHour { DoctorId = doctor.Id, DayOfWeek = h[0], StartMinute = h[1], EndMinute = h[2] }).ToList();
            doctors[d.Code] = doctor;
        }

        var daysOff = seed.DaysOff.Select(o => new DayOff { DoctorId = doctors[o.Doc].Id, Date = Day(o.I), Part = o.Part, Reason = o.Reason }).ToList();
        var offByDoc = seed.DaysOff.ToDictionary(o => (o.Doc, Day(o.I)), o => o.Part);
        List<int> SlotsOf(string doc, DateOnly date)
        {
            var iso = ClinicRules.IsoDayOfWeek(date);
            var d = seed.Doctors.First(x => x.Code == doc);
            DayOffPart? off = offByDoc.TryGetValue((doc, date), out var part) ? part : null;
            return ClinicRules.Slots(d.Hours.Where(h => h[0] == iso).Select(h => (h[1], h[2])), d.Slot, off);
        }

        var patients = new Dictionary<string, Patient>();
        foreach (var p in seed.Patients)
        {
            var number = int.Parse(p.Code.AsSpan(2), CultureInfo.InvariantCulture);
            var created = Utc(p.C is { } c ? Day(c) : today.AddDays(p.Cdd ?? 0), 480 + number * 37 % 600);
            if (created > now)
                created = now.AddMinutes(-60);
            var patient = new Patient
            {
                Code = p.Code,
                FullName = p.Name,
                BirthDate = p.Birth is not null ? DateOnly.ParseExact(p.Birth, "yyyy-MM-dd", CultureInfo.InvariantCulture) : today.AddDays(p.Bdo ?? 0),
                Gender = p.G,
                Phone = p.Phone,
                Address = p.Addr,
                ContactPerson = p.Contact,
                Allergies = p.Allergy,
                MedicalHistory = p.History
            };
            patient.SetCreatedAt(created);
            patients[p.Code] = patient;
        }

        if (ctx.UserIds.TryGetValue("bacsi", out var bacsi))
            result.Phrases.AddRange(seed.Phrases.Select(t => new UsagePhrase { UserId = bacsi, Text = t }));

        // 2) Kế hoạch điều trị (trạng thái hạng mục chốt sau khi có lượt khám)
        var plans = new Dictionary<string, (SeedPlan Seed, TreatmentPlan Entity)>();
        foreach (var sp in seed.Plans)
        {
            var doctor = doctors[sp.Doc];
            var plan = new TreatmentPlan
            {
                PatientId = patients[sp.P].Id,
                DoctorId = doctor.Id,
                PlannedSessions = sp.N,
                Note = sp.Note,
                CreatedByName = doctor.FullName
            };
            plan.SetCreatedAt(Utc(Day(sp.I), sp.M));
            plan.Items = sp.Items.Select((it, n) =>
            {
                var svc = services[it.Code];
                var discount = ClinicRules.ItemDiscount(svc.Price, it.Qty, it.Dt, it.Dv ?? 0);
                return new TreatmentPlanItem
                {
                    PlanId = plan.Id,
                    ServiceId = svc.Id,
                    ServiceCode = svc.Code,
                    ServiceName = svc.Name,
                    Unit = svc.Unit,
                    Teeth = it.Teeth,
                    Quantity = it.Qty,
                    UnitPrice = svc.Price,
                    DiscountType = it.Dt,
                    DiscountValue = it.Dv ?? 0,
                    DiscountAmount = discount,
                    Amount = svc.Price * it.Qty - discount,
                    Status = PlanItemStatus.ChuaLam,
                    SortOrder = n
                };
            }).ToList();
            plans[sp.K] = (sp, plan);
        }

        // 3) Chọn bản ghi giữ lại (06 §5.3, §5.6)
        var nextWork = today.AddDays(1);
        if (nextWork.DayOfWeek == DayOfWeek.Sunday)
            nextWork = nextWork.AddDays(1);
        var hasTc12 = seed.Records.Any(r => r.Fx == "tc12");
        var hasBs01W = seed.Records.Any(r => r.Fx == "bs01w");
        var kept = new List<Resolved>();
        foreach (var rec in seed.Records)
        {
            if (rec.Fx is not null)
                continue;
            var date = rec.I is { } i ? Day(i) : today.AddDays(rec.D ?? 0);
            // Lượt cũ của kịch bản kiểm thử ghi lệch ngày: rơi vào ngày bác sĩ nghỉ thì lùi về ngày làm việc gần nhất
            for (var n = 0; rec.I is null && rec.Src != "W" && n < 7 && !SlotsOf(rec.Doc, date).Contains(rec.M ?? 0); n++)
                date = date.AddDays(-1);
            if (rec.X == 1 && date < today)
                continue;
            if (rec.Src == "W" && (date > today || (date == today && Utc(date, rec.Cim ?? 0) > now)))
                continue;
            if (hasTc12 && date == nextWork && rec.Src != "W"
                && (((rec.Doc == "BS02" || rec.Doc == "BS03") && rec.M == 540) || (rec.Doc == "BS04" && rec.M == 840)))
                continue;
            kept.Add(new Resolved(rec, date, rec.M ?? 0, KeyNum(rec.K)));
        }

        bool CancelledNow(Resolved r) => r.Rec.O == "cancel" && CreatedAt(r).AddMinutes(r.Rec.Ca ?? 0) <= now;
        DateTime CreatedAt(Resolved r)
        {
            var start = Utc(r.Date, r.Minute);
            var created = Utc(r.Date.AddDays(-(r.Rec.Cd ?? 0)), r.Rec.Cm ?? 480);
            var gap = 30 + r.KeyNum * 7 % 600;
            if (created > now)
                created = now.AddMinutes(-gap);
            if (created >= start)
                created = start.AddMinutes(-gap);
            return created;
        }

        if (hasTc12)
        {
            // TC-12: ngày kế tiếp BS02 phải ít lịch hơn BS03
            List<Resolved> Active(string doc) => kept.Where(r => r.Date == nextWork && r.Rec.Doc == doc && r.Rec.Src != "W" && !CancelledNow(r)).ToList();
            while (true)
            {
                var bs02 = Active("BS02");
                if (bs02.Count == 0 || bs02.Count < Active("BS03").Count)
                    break;
                kept.Remove(bs02.OrderByDescending(r => r.Minute).ThenByDescending(r => r.KeyNum).First());
            }
        }

        // 4) Dữ liệu kịch bản kiểm thử xếp khung lúc nạp
        var taken = new Dictionary<(string Doc, DateOnly Date, int Minute), int>();
        foreach (var r in kept.Where(r => r.Rec.Src != "W" && !CancelledNow(r)))
            taken[(r.Rec.Doc, r.Date, r.Minute)] = taken.GetValueOrDefault((r.Rec.Doc, r.Date, r.Minute)) + 1;
        bool Free(string doc, DateOnly date, int minute) => taken.GetValueOrDefault((doc, date, minute)) < doctors[doc].MaxPerSlot;
        void Take(string doc, DateOnly date, int minute) => taken[(doc, date, minute)] = taken.GetValueOrDefault((doc, date, minute)) + 1;

        foreach (var rec in seed.Records.Where(r => r.Fx is not null))
        {
            switch (rec.Fx)
            {
                case "an":
                {
                    var date = today;
                    for (var n = 0; n < 7 && SlotsOf(rec.Doc, date).Count == 0; n++)
                        date = date.AddDays(1);
                    var slots = SlotsOf(rec.Doc, date);
                    if (slots.Count == 0)
                        break;
                    var minute = slots.Where(s => (date != today || Utc(date, s) > now) && Free(rec.Doc, date, s)).Select(s => (int?)s).FirstOrDefault()
                                 ?? slots.Where(s => Free(rec.Doc, date, s)).Select(s => (int?)s).LastOrDefault()
                                 ?? slots[0];
                    Take(rec.Doc, date, minute);
                    kept.Add(new Resolved(rec, date, minute, KeyNum(rec.K)));
                    break;
                }
                case "bs01w":
                    if (SlotsOf(rec.Doc, today).Count > 0)
                        kept.Add(new Resolved(rec, today, 0, KeyNum(rec.K)));
                    break;
                case "bs03":
                {
                    var slot = SlotsOf(rec.Doc, today).Where(s => Utc(today, s) >= now.AddMinutes(15) && Free(rec.Doc, today, s)).Select(s => (int?)s).FirstOrDefault();
                    if (slot is { } minute)
                    {
                        Take(rec.Doc, today, minute);
                        kept.Add(new Resolved(rec, today, minute, KeyNum(rec.K)));
                    }

                    break;
                }
                case "tc12":
                    if (SlotsOf(rec.Doc, nextWork).Contains(540) && Free(rec.Doc, nextWork, 540))
                    {
                        Take(rec.Doc, nextWork, 540);
                        kept.Add(new Resolved(rec, nextWork, 540, KeyNum(rec.K)));
                    }

                    break;
                case "tc11":
                {
                    var date = today.AddDays(rec.D ?? 0);
                    for (var n = 0; n < 7 && SlotsOf(rec.Doc, date).Count == 0; n++)
                        date = date.AddDays(1);
                    var slots = SlotsOf(rec.Doc, date);
                    var want = rec.M ?? 0;
                    int? minute = slots.Contains(want) && Free(rec.Doc, date, want)
                        ? want
                        : slots.Where(s => s >= want && Free(rec.Doc, date, s)).Select(s => (int?)s).FirstOrDefault()
                          ?? slots.Where(s => Free(rec.Doc, date, s)).Select(s => (int?)s).FirstOrDefault();
                    if (minute is { } m)
                    {
                        Take(rec.Doc, date, m);
                        kept.Add(new Resolved(rec, date, m, KeyNum(rec.K)));
                    }

                    break;
                }
            }
        }

        // 5) Lịch hẹn, lượt khám, phiếu thanh toán, phiếu thu
        var appointmentOf = new Dictionary<string, Appointment>();
        var visitOf = new Dictionary<string, Visit>();
        var planItemVisits = new Dictionary<Guid, Visit>();
        var autoConfirmed = new HashSet<Appointment>(ReferenceEqualityComparer.Instance);
        var receptionist = ctx.ReceptionistName;
        foreach (var r in kept)
        {
            var rec = r.Rec;
            var doctor = doctors[rec.Doc];
            var patient = rec.P is null ? null : patients[rec.P];
            var walkIn = rec.Src == "W";
            DateTime? checkin = null;
            if (rec.Ago is { } ago)
                checkin = now.AddMinutes(-ago);
            else if (rec.O == "done" && rec.Cim is { } cim && (walkIn || r.Date < today || (r.Date == today && Utc(r.Date, cim) <= now)))
                checkin = Utc(r.Date, cim);

            Appointment? appointment = null;
            if (!walkIn)
            {
                var start = Utc(r.Date, r.Minute);
                var created = CreatedAt(r);
                var online = rec.Src == "O";
                appointment = new Appointment
                {
                    DoctorId = doctor.Id,
                    PatientId = patient?.Id,
                    Date = r.Date,
                    StartAt = start,
                    EndAt = start.AddMinutes(doctor.SlotMinutes),
                    Source = online ? AppointmentSource.Online : AppointmentSource.LeTan,
                    ServiceId = rec.Svc is null ? null : services[rec.Svc].Id,
                    Reason = rec.Rs,
                    CreatedByName = online ? ClinicRules.OnlineCreatorName : receptionist
                };
                appointment.SetCreatedAt(created);
                if (rec.Guest is { Count: 4 } g)
                {
                    appointment.GuestName = g[0].GetString();
                    appointment.GuestPhone = g[1].GetString();
                    appointment.GuestBirthYear = g[2].GetInt32();
                    appointment.GuestGender = Enum.Parse<Gender>(g[3].GetString()!);
                }
                else if (online && patient is not null)
                {
                    appointment.GuestName = patient.FullName;
                    appointment.GuestPhone = patient.Phone;
                    appointment.GuestBirthYear = patient.BirthDate.Year;
                    appointment.GuestGender = patient.Gender;
                }

                DateTime? confirmed = online ? (rec.Conf is { } conf ? created.AddMinutes(conf) : null) : created;
                if (confirmed > now)
                    confirmed = null;
                var cancelAt = rec.O == "cancel" ? created.AddMinutes(rec.Ca ?? 0) : (DateTime?)null;
                if (cancelAt is { } ca && ca <= now)
                {
                    if (confirmed > ca)
                        confirmed = null;
                    appointment.Status = AppointmentStatus.DaHuy;
                    appointment.CancelReason = rec.Cr ?? AppointmentCancelReason.Khac;
                    appointment.CancelNote = rec.Cn;
                    appointment.CancelledAt = ca;
                    appointment.CancelledByName = receptionist;
                }
                else if (rec.O == "noshow" && r.Date < today)
                    appointment.Status = AppointmentStatus.KhongDen;
                else if (checkin is not null)
                {
                    appointment.Status = AppointmentStatus.DaDen;
                    if (confirmed is null)
                    {
                        confirmed = checkin;
                        autoConfirmed.Add(appointment);
                    }
                }
                else
                    appointment.Status = confirmed is not null ? AppointmentStatus.DaXacNhan : AppointmentStatus.ChoXacNhan;

                if (confirmed is not null)
                {
                    appointment.ConfirmedAt = confirmed;
                    appointment.ConfirmedByName = receptionist;
                }

                appointmentOf[rec.K] = appointment;
                result.Appointments.Add(appointment);
            }

            if (checkin is not { } checkedIn || patient is null)
                continue;

            // Lượt khám
            var queueAt = !walkIn && rec.Ago is null && rec.Cim <= r.Minute + ClinicRules.LateToleranceMinutes ? Utc(r.Date, r.Minute) : checkedIn;
            var priority = ClinicRules.AutoPriorityReason(patient.BirthDate, r.Date) ?? (rec.Prm == 1 ? PregnantReason : null);
            var template = rec.V is null ? null : seed.Templates[rec.V.T];
            var visit = new Visit
            {
                PatientId = patient.Id,
                DoctorId = doctor.Id,
                AppointmentId = appointment?.Id,
                Date = r.Date,
                CheckedInAt = checkedIn,
                InitialQueueAt = queueAt,
                QueueAt = queueAt,
                IsPriority = priority is not null,
                PriorityReason = priority,
                IsFollowUp = rec.Free == 1,
                Reason = rec.Rs ?? template?.Reason,
                CheckedInByName = receptionist,
                Status = VisitStatus.ChoKham
            };
            visit.SetCreatedAt(checkedIn);
            visitOf[rec.K] = visit;
            result.Visits.Add(visit);
            if (rec.V is null || template is null)
                continue;

            var sm = Utc(r.Date, rec.Sm ?? 0);
            var fm = Utc(r.Date, rec.Fm ?? 0);
            if (sm > now)
                continue;
            if (fm > now)
            {
                if (hasBs01W && rec.Doc == "BS01" && r.Date == today)
                    continue;
                visit.Status = VisitStatus.DangKham;
                visit.StartedAt = sm;
                visit.CalledAt = sm;
                ApplyVitals(visit, rec.V.Vit);
                visit.Symptoms = template.Sym;
                visit.Examination = template.Ex;
                continue;
            }

            // Đã khám xong
            visit.StartedAt = sm;
            visit.CalledAt = sm;
            visit.FinishedAt = fm;
            visit.Status = VisitStatus.ChoThanhToan;
            ApplyVitals(visit, rec.V.Vit);
            visit.Symptoms = template.Sym;
            visit.Examination = template.Ex;
            visit.Advice = rec.V.Adv >= 0 && rec.V.Adv < seed.Advice.Count ? seed.Advice[rec.V.Adv] : null;
            if (rec.V.Fu is { Count: >= 2 } fu)
            {
                visit.FollowUpDate = r.Date.AddDays(fu[0].GetInt32());
                visit.FollowUpNote = fu[1].GetString();
            }

            var dxCodes = new List<string> { rec.V.Dxo ?? template.Dx[0] };
            dxCodes.AddRange(template.Dx.Skip(1));
            if (rec.V.Dx2 is not null)
                dxCodes.Add(rec.V.Dx2);
            visit.Diagnoses = dxCodes.Distinct().Select((icd, n) => new VisitDiagnosis
            {
                VisitId = visit.Id,
                Kind = n == 0 ? DiagnosisKind.Chinh : DiagnosisKind.Phu,
                IcdCode = icd,
                Name = diagnoses.TryGetValue(icd, out var dt) ? dt.Name : icd,
                SortOrder = n
            }).ToList();

            var orderList = new List<VisitOrder>();
            foreach (var (o, n) in (rec.V.Ord ?? []).Select((o, n) => (o, n)))
            {
                var svc = services[o[0].GetString()!];
                var teeth = o.Count > 1 && o[1].ValueKind == JsonValueKind.String ? o[1].GetString() : null;
                var qty = o.Count > 2 ? o[2].GetInt32() : 1;
                var resultIdx = o.Count > 3 ? o[3].GetInt32() : -1;
                var order = new VisitOrder
                {
                    VisitId = visit.Id,
                    ServiceId = svc.Id,
                    ServiceCode = svc.Code,
                    ServiceName = svc.Name,
                    Group = svc.Group,
                    Unit = svc.Unit,
                    Teeth = teeth,
                    Quantity = qty,
                    UnitPrice = svc.Price,
                    SortOrder = n
                };
                if (o.Count > 4 && o[4].GetString() is { } planRef)
                {
                    var parts = planRef.Split('#');
                    if (plans.TryGetValue(parts[0], out var pl))
                    {
                        var item = pl.Entity.Items[int.Parse(parts[1], CultureInfo.InvariantCulture)];
                        order.UnitPrice = item.UnitPrice;
                        order.Discount = item.DiscountAmount;
                        order.TreatmentPlanItemId = item.Id;
                        planItemVisits[item.Id] = visit;
                    }
                }

                if (svc.Group == ServiceGroup.CanLamSang)
                {
                    order.Status = OrderStatus.CoKetQua;
                    order.Result = resultIdx >= 0 && resultIdx < seed.Results.Count ? seed.Results[resultIdx] : null;
                    if (order.Result is null)
                        order.Status = OrderStatus.KhongThucHien;
                }
                else
                    order.Status = OrderStatus.DaLam;

                orderList.Add(order);
            }

            visit.Orders = orderList;
            var outside = new HashSet<Guid>();
            visit.Prescription = (rec.V.Rx ?? []).Select((x, n) =>
            {
                var med = medicines[x[0].GetString()!];
                if (x.Count > 4 && x[4].GetInt32() == 1)
                    outside.Add(med.Id);
                var usageIdx = x[3].GetInt32();
                return new PrescriptionLine
                {
                    VisitId = visit.Id,
                    MedicineId = med.Id,
                    MedicineCode = med.Code,
                    Name = med.Name,
                    Strength = med.Strength,
                    Unit = med.Unit,
                    ActiveIngredient = med.ActiveIngredient,
                    Quantity = x[1].GetInt32(),
                    Days = x[2].GetInt32(),
                    Usage = usageIdx >= 0 && usageIdx < seed.Usages.Count ? seed.Usages[usageIdx] : "Dùng theo hướng dẫn",
                    UnitPrice = med.Price,
                    SortOrder = n
                };
            }).ToList();

            // Phiếu thanh toán (07 §3.7), phiếu thu (06 §5.4)
            var specialty = specialties.Values.First(s => s.Id == doctor.SpecialtyId);
            var exam = services.Values.FirstOrDefault(s => s.Id == specialty.ExamServiceId);
            var lines = InvoiceBuilder.BuildLines(visit.IsFollowUp, exam, visit.Orders, visit.Prescription, outside);
            var (total, medicineTotal) = InvoiceBuilder.Totals(lines);
            var invoice = new Invoice
            {
                VisitId = visit.Id,
                PatientId = patient.Id,
                DoctorId = doctor.Id,
                Total = total,
                MedicineTotal = medicineTotal,
                Lines = lines
            };
            invoice.SetCreatedAt(fm);
            result.Invoices.Add(invoice);
            if (total == 0)
            {
                invoice.Status = InvoiceStatus.DaThuDu;
                visit.Status = VisitStatus.HoanTat;
                continue;
            }

            var paidAt = fm.AddMinutes(rec.Pd ?? 5);
            if (paidAt > now)
            {
                invoice.Status = InvoiceStatus.ChoThu;
                continue;
            }

            var amount = total;
            string? partial = null;
            if (rec.Part == 1)
            {
                var half = Math.Max(medicineTotal, ClinicRules.Floor1000(total / 2));
                if (half < total)
                {
                    amount = half;
                    partial = PartialReason;
                }
            }

            var method = rec.Pm ?? PaymentMethod.TienMat;
            decimal? cash = method == PaymentMethod.TienMat ? Math.Ceiling(amount / 50000m) * 50000m : null;
            var receipt = new Receipt
            {
                InvoiceId = invoice.Id,
                PatientId = patient.Id,
                Amount = amount,
                Method = method,
                CashReceived = cash,
                ChangeAmount = cash - amount,
                PartialReason = partial,
                CollectedAt = paidAt,
                CollectedByName = receptionist,
                Status = ReceiptStatus.HopLe
            };
            receipt.SetCreatedAt(paidAt);
            result.Receipts.Add(receipt);
            invoice.Paid = amount;
            invoice.Status = ClinicMappings.StatusFor(total, amount);
            visit.Status = VisitStatus.HoanTat;
        }

        // 6) Trạng thái kế hoạch theo hạng mục đã làm (07 §3.11)
        foreach (var (sp, plan) in plans.Values)
        {
            var created = plan.CreatedAt;
            foreach (var item in plan.Items)
            {
                if (planItemVisits.TryGetValue(item.Id, out var v) && v.FinishedAt is { } done)
                {
                    item.Status = PlanItemStatus.DaLam;
                    item.DoneAt = done;
                }
            }

            DateTime CancelAt()
            {
                var days = sp.Cancel is { Count: >= 2 } c ? c[1].GetInt32() : 1;
                var at = Utc(Day(sp.I).AddDays(days), 600);
                return at > now ? now.AddMinutes(-60) : at;
            }

            string CancelReason() => sp.Cancel is { Count: >= 1 } c ? c[0].GetString() ?? string.Empty : string.Empty;
            switch (sp.St)
            {
                case "DangDieuTri":
                case "HoanThanh":
                    plan.QuotedAt = created.AddMinutes(20);
                    plan.AcceptedAt = created.AddMinutes(40);
                    if (plan.Items.All(i => i.Status == PlanItemStatus.DaLam))
                    {
                        plan.Status = PlanStatus.HoanThanh;
                        plan.CompletedAt = plan.Items.Max(i => i.DoneAt);
                    }
                    else
                        plan.Status = PlanStatus.DangDieuTri;

                    break;
                case "DungDieuTri":
                    plan.QuotedAt = created.AddMinutes(20);
                    plan.AcceptedAt = created.AddMinutes(40);
                    foreach (var item in plan.Items.Where(i => i.Status == PlanItemStatus.ChuaLam))
                        item.Status = PlanItemStatus.DaHuy;
                    plan.Status = PlanStatus.DaHuy;
                    plan.CancelledAt = CancelAt();
                    plan.CancelReason = CancelReason();
                    break;
                case "DaBaoGia":
                    plan.QuotedAt = created.AddMinutes(20);
                    plan.Status = PlanStatus.DaBaoGia;
                    break;
                case "ChoDuyet":
                    plan.QuotedAt = created.AddMinutes(20);
                    plan.Status = PlanStatus.ChoDuyet;
                    break;
                case "TuChoi":
                    plan.QuotedAt = created.AddMinutes(20);
                    plan.Status = PlanStatus.DaHuy;
                    plan.CancelledAt = CancelAt();
                    plan.CancelReason = CancelReason();
                    break;
                default:
                    plan.Status = PlanStatus.Nhap;
                    if (sp.Review is not null)
                    {
                        plan.ReviewNote = sp.Review;
                        plan.ReviewedByName = ctx.ManagerName;
                        plan.ReviewedAt = created.AddMinutes(120) > now ? now.AddMinutes(-30) : created.AddMinutes(120);
                    }

                    break;
            }

            var live = plan.Items.Where(i => i.Status != PlanItemStatus.DaHuy).ToList();
            plan.SubTotal = live.Sum(i => i.UnitPrice * i.Quantity);
            plan.DiscountTotal = live.Sum(i => i.DiscountAmount);
            plan.Total = plan.SubTotal - plan.DiscountTotal;
            result.Plans.Add(plan);
        }

        // 7) Dòng nhắc tái khám (BR-29), tin nhắc (BR-30)
        foreach (var sf in seed.FollowUps)
        {
            if (!visitOf.TryGetValue(sf.V, out var source) || source.FinishedAt is not { } finishedAt)
                continue;
            var doctor = doctors[sf.Doc];
            var patient = patients[sf.P];
            var due = sf.Due is { } d ? Day(d) : today.AddDays(sf.Dd ?? 0);
            source.FollowUpDate = due;
            var followUp = new FollowUp
            {
                PatientId = patient.Id,
                DoctorId = doctor.Id,
                VisitId = source.Id,
                DueDate = due,
                Note = sf.Note
            };
            followUp.SetCreatedAt(finishedAt);
            var sendDates = (sf.Sends ?? []).Select(Day).Concat((sf.SendsD ?? []).Select(x => today.AddDays(x)));
            foreach (var sendAt in sendDates.Select(x => Utc(x, 540)).Where(x => x <= now && x > finishedAt).OrderBy(x => x))
            {
                followUp.SendCount++;
                followUp.LastSentAt = sendAt;
                result.Messages.Add(new Message
                {
                    Kind = MessageKind.NhacTaiKham,
                    Channel = MessageChannel.Zalo,
                    Phone = patient.Phone,
                    Content = ClinicRules.FollowUpMessage(ctx.ClinicName, patient.FullName, due, doctor.FullName, ctx.Hotline),
                    SentAt = sendAt,
                    FollowUpId = followUp.Id
                });
            }

            if (sf.Call is { Count: >= 2 } call)
            {
                var calledAt = Utc(Day(call[1].GetInt32()), 600);
                if (calledAt <= now && calledAt > finishedAt)
                {
                    followUp.CallResult = Enum.Parse<CallResult>(call[0].GetString()!);
                    followUp.CalledAt = calledAt;
                }
            }

            if (sf.Ret is not null && visitOf.TryGetValue(sf.Ret, out var back))
            {
                followUp.ReturnedVisitId = back.Id;
                followUp.Status = FollowUpStatus.DaQuayLai;
                if (back.IsFollowUp)
                    back.FollowUpId = followUp.Id;
                if (sf.Appt == 1 && appointmentOf.TryGetValue(sf.Ret, out var appt))
                {
                    followUp.AppointmentId = appt.Id;
                    appt.FollowUpId = followUp.Id;
                }
            }
            else if (due.AddDays(ClinicRules.FollowUpWindowAfter) < today)
                followUp.Status = FollowUpStatus.QuaHan;
            else if (followUp.SendCount > 0 || followUp.CalledAt is not null)
                followUp.Status = FollowUpStatus.DaNhac;
            else
                followUp.Status = FollowUpStatus.ChoNhac;

            result.FollowUps.Add(followUp);
        }

        // 8) Mã chứng từ theo ngày, số thứ tự theo bác sĩ trong ngày (BR-08, BR-28)
        var keyOf = new Dictionary<object, int>(ReferenceEqualityComparer.Instance);
        foreach (var r in kept)
        {
            if (appointmentOf.TryGetValue(r.Rec.K, out var a))
                keyOf[a] = r.KeyNum;
            if (visitOf.TryGetValue(r.Rec.K, out var v))
                keyOf[v] = r.KeyNum;
        }

        AssignCodes(result.Appointments, a => a.CreatedAt, a => keyOf[a], ClinicRules.AppointmentPrefix, (a, code) => a.Code = code);
        AssignCodes(result.Visits, v => v.CheckedInAt, v => keyOf[v], ClinicRules.VisitPrefix, (v, code) => v.Code = code);
        var invoiceKey = result.Invoices.ToDictionary<Invoice, Invoice, int>(i => i, i => keyOf[result.Visits.First(v => v.Id == i.VisitId)], ReferenceEqualityComparer.Instance);
        AssignCodes(result.Invoices, i => i.CreatedAt, i => invoiceKey[i], ClinicRules.InvoicePrefix, (i, code) => i.Code = code);
        var receiptKey = result.Receipts.ToDictionary<Receipt, Receipt, int>(x => x, x => invoiceKey[result.Invoices.First(i => i.Id == x.InvoiceId)], ReferenceEqualityComparer.Instance);
        AssignCodes(result.Receipts, x => x.CollectedAt, x => receiptKey[x], ClinicRules.ReceiptPrefix, (x, code) => x.Code = code);
        var planKey = plans.Values.ToDictionary<(SeedPlan Seed, TreatmentPlan Entity), TreatmentPlan, int>(p => p.Entity, p => KeyNum(p.Seed.K), ReferenceEqualityComparer.Instance);
        AssignCodes(result.Plans, p => p.CreatedAt, p => planKey[p], ClinicRules.PlanPrefix, (p, code) => p.Code = code);
        foreach (var group in result.Visits.GroupBy(v => (v.DoctorId, v.Date)))
        {
            var n = 0;
            foreach (var v in group.OrderBy(v => v.CheckedInAt).ThenBy(v => keyOf[v]))
                v.QueueNumber = ++n;
        }

        // 9) Tin xác nhận, nhắc lịch của lịch hẹn gần đây (FR-12)
        var phoneOf = patients.Values.ToDictionary(p => p.Id, p => p.Phone);
        foreach (var a in result.Appointments.Where(a => a.Date >= today.AddDays(-MessageWindowDays)))
        {
            var doctor = doctors.Values.First(d => d.Id == a.DoctorId);
            var phone = a.PatientId is { } pid ? phoneOf[pid] : a.GuestPhone ?? string.Empty;
            var local = (a.Date, (int)Math.Round((a.StartAt - VietnamDates.StartOfDayUtc(a.Date)).TotalMinutes));
            var confirmAt = a.Source == AppointmentSource.LeTan ? a.CreatedAt : a.ConfirmedAt;
            if (autoConfirmed.Contains(a))
                confirmAt = null;
            if (confirmAt is { } ca && ca <= now && (a.CancelledAt is null || ca < a.CancelledAt))
                result.Messages.Add(ClinicMessages.Confirm(a, doctor, ctx.ClinicName, phone, local, ca));
            var remindAt = Utc(a.Date.AddDays(-1), ClinicRules.ReminderHour * 60);
            if (confirmAt is { } c2 && c2 <= remindAt && remindAt <= now && (a.CancelledAt is null || a.CancelledAt > remindAt))
                result.Messages.Add(ClinicMessages.Reminder(a, doctor, ctx.ClinicName, ctx.Hotline, phone, local, remindAt));
        }

        result.Specialties.AddRange(specialties.Values);
        result.Services.AddRange(services.Values);
        result.Medicines.AddRange(medicines.Values);
        result.Diagnoses.AddRange(diagnoses.Values);
        result.Doctors.AddRange(doctors.Values);
        result.DaysOff.AddRange(daysOff);
        result.Patients.AddRange(patients.Values);
        return result;
    }

    private static void ApplyVitals(Visit visit, List<decimal?>? vit)
    {
        if (vit is not { Count: 6 })
            return;
        visit.Temperature = vit[0];
        visit.Pulse = vit[1] is { } pulse ? (int)pulse : null;
        visit.BpSystolic = vit[2] is { } sys ? (int)sys : null;
        visit.BpDiastolic = vit[3] is { } dia ? (int)dia : null;
        visit.Weight = vit[4];
        visit.Height = vit[5] is { } h ? (int)h : null;
    }

    private static void AssignCodes<T>(List<T> list, Func<T, DateTime> at, Func<T, int> key, string prefix, Action<T, string> set)
    {
        foreach (var group in list.GroupBy(x => VietnamDates.DateOf(at(x))))
        {
            var n = 0;
            foreach (var x in group.OrderBy(at).ThenBy(key))
                set(x, ClinicRules.DocCode(prefix, group.Key, ++n));
        }
    }

    private static int KeyNum(string key) => int.Parse(key.AsSpan(1), CultureInfo.InvariantCulture);

    private sealed record Resolved(SeedRecord Rec, DateOnly Date, int Minute, int KeyNum);
}
