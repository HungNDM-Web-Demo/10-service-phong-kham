using Application.Common.Exceptions;
using Application.DTOs.Booking;
using Application.DTOs.Clinic;
using Application.DTOs.Finance;
using Application.Interfaces.Services.Clinic;
using Application.Validators.Clinic;
using Domain.Common;
using Domain.Entities.Clinic.Medicines;
using Domain.Entities.Clinic.Patients;
using Domain.Entities.Clinic.Services;
using Domain.Entities.Clinic.Specialties;
using Domain.Entities.System.AuditLogs;
using Domain.Enums.Booking;
using Domain.Enums.Clinic;
using Domain.Enums.Finance;
using Domain.Enums.System.AuditLogs;
using Microsoft.EntityFrameworkCore;
using UnitTests.TestSupport;

namespace UnitTests.Clinic;

/// <summary>
/// Kịch bản kiểm thử nghiệm thu (05-KICH-BAN-KIEM-THU §2) trên service thật, chế độ api. Lúc nạp 10:00 Thứ Năm 22/10/2026.
/// </summary>
public sealed class AcceptanceScenarioTests
{
    private static string Code(Exception e) => e switch
    {
        ConflictException c => c.Extensions.TryGetValue("code", out var v) ? v?.ToString() ?? string.Empty : string.Empty,
        DomainException d => d.Extensions.TryGetValue("code", out var v) ? v?.ToString() ?? string.Empty : string.Empty,
        _ => string.Empty
    };

    [Fact]
    public async Task Tiep_don_kham_ket_thuc_thu_tien()
    {
        await using var host = await ClinicTestHost.StartAsync();
        var services = await host.QueryAsync<Service, Dictionary<string, Guid>>(q => q.ToDictionaryAsync(s => s.Code, s => s.Id));
        var medicines = await host.QueryAsync<Medicine, Dictionary<string, Guid>>(q => q.ToDictionaryAsync(m => m.Code, m => m.Id));

        // TC-18: tiếp đón An theo lịch hẹn, đến sớm xếp theo giờ hẹn
        await host.SignInAsync("letan");
        var queue = await host.CallAsync<IQueueService, QueueTodayDto>(s => s.GetTodayAsync());
        var an = queue.PendingAppointments.Single(a => a.PatientName == "Nguyễn Văn An");
        var preview = await host.CallAsync<IQueueService, CheckInPreviewDto>(s => s.PreviewCheckInAsync(new CheckInPreviewQuery { AppointmentId = an.Id }));
        Assert.Null(preview.OpenVisit);
        Assert.False(preview.AutoPriority);
        var checkIn = await host.CallAsync<IQueueService, CheckInResultDto>(s => s.CheckInAsync(new CheckInRequest { AppointmentId = an.Id, DoctorId = an.DoctorId }));
        Assert.Equal(an.StartAt, checkIn.Visit.QueueAt);
        Assert.Matches(@"^P1 - \d{3}$", checkIn.Visit.Ticket);
        var visitId = checkIn.Visit.Id;

        // BR-07: bệnh nhân đã có lượt đang chờ
        var dup = await Assert.ThrowsAsync<ConflictException>(() => host.CallAsync<IQueueService, CheckInResultDto>(s =>
            s.CheckInAsync(new CheckInRequest { PatientId = checkIn.Visit.PatientId, DoctorId = an.DoctorId })));
        Assert.Equal(ClinicErrorCodes.BenhNhanDangKham, Code(dup));

        // TC-21: ưu tiên tự động với trẻ 4 tuổi
        var huy = await host.QueryAsync<Patient, Guid>(q => q.Where(p => p.Code == "BN000127").Select(p => p.Id).SingleAsync());
        var huyPreview = await host.CallAsync<IQueueService, CheckInPreviewDto>(s => s.PreviewCheckInAsync(new CheckInPreviewQuery { PatientId = huy }));
        Assert.Equal(Domain.Entities.Clinic.ClinicRules.ChildPriority, huyPreview.AutoPriorityReason);

        // BR-12: bác sĩ chỉ một lượt đang khám
        await host.SignInAsync("bacsi");
        var mine = await host.CallAsync<IQueueService, QueueTodayDto>(s => s.GetTodayAsync());
        Assert.Single(mine.Doctors);
        var first = await host.CallAsync<IQueueService, CallNextResultDto>(s => s.CallNextAsync(new CallNextRequest()));
        Assert.NotNull(first.Visit);
        var busy = await Assert.ThrowsAsync<ConflictException>(() => host.CallAsync<IQueueService, QueueVisitDto>(s => s.CallAsync(visitId, new CallVisitRequest { Reason = "Có hẹn" })));
        Assert.Equal(ClinicErrorCodes.BacSiDangKham, Code(busy));
        await host.CallAsync<IQueueService, QueueVisitDto>(s => s.AwaitResultsAsync(first.Visit!.Id));
        var called = await host.CallAsync<IQueueService, QueueVisitDto>(s => s.CallAsync(visitId, new CallVisitRequest { Reason = "Có hẹn" }));
        Assert.Equal(VisitStatus.DangKham, called.Status);

        // TC-30: mở phiếu khám ghi nhật ký xem
        var detail = await host.CallAsync<IVisitService, VisitDetailDto>(s => s.GetByIdAsync(visitId));
        Assert.True(detail.CanEdit);
        Assert.NotNull(detail.Medical);
        Assert.True(await host.QueryAsync<AuditLog, bool>(q => q.AnyAsync(l => l.Action == AuditAction.View && l.EntityId == "BN000125")));

        // BR-19: cảnh báo dị ứng Amoxicillin
        var request = new SaveVisitRequest
        {
            Diagnoses = [new SaveDiagnosisInput { Kind = DiagnosisKind.Chinh, IcdCode = "K02.1", Name = "Sâu ngà răng" }],
            Orders =
            [
                new SaveOrderInput { ServiceId = services["CLS01"], Status = OrderStatus.ChoThucHien },
                new SaveOrderInput { ServiceId = services["NK02"], Teeth = [16, 26] }
            ],
            Prescription = [new SavePrescriptionInput { MedicineId = medicines["T002"], Quantity = 15, Days = 5, Usage = "Uống 1 viên x 3 lần/ngày" }]
        };
        var allergy = await Assert.ThrowsAsync<ConflictException>(() => host.CallAsync<IVisitService, VisitDetailDto>(s => s.SaveAsync(visitId, request)));
        Assert.Equal(ClinicErrorCodes.TrungDiUng, Code(allergy));
        Assert.Equal("Bệnh nhân có ghi nhận dị ứng: Amoxicillin", allergy.Message);

        request = new SaveVisitRequest
        {
            Diagnoses = request.Diagnoses,
            Orders = request.Orders,
            Prescription =
            [
                new SavePrescriptionInput { MedicineId = medicines["T001"], Quantity = 10, Days = 5, Usage = "Uống 1 viên khi đau" },
                new SavePrescriptionInput { MedicineId = medicines["T003"], Quantity = 1, Days = 7, Usage = "Súc miệng 15 ml x 2 lần/ngày" }
            ]
        };
        var saved = await host.CallAsync<IVisitService, VisitDetailDto>(s => s.SaveAsync(visitId, request));

        // BR-17: thiếu kết quả cận lâm sàng
        var missing = await Assert.ThrowsAsync<DomainException>(() => host.CallAsync<IVisitService, VisitDetailDto>(s => s.FinishAsync(visitId)));
        Assert.Equal(ClinicErrorCodes.ThieuThongTinKham, Code(missing));
        var cls = saved.Medical!.Orders.Single(o => o.ServiceCode == "CLS01");
        request.Orders[0] = new SaveOrderInput { Id = cls.Id, ServiceId = services["CLS01"], Status = OrderStatus.CoKetQua, Result = "Sâu ngà, chưa tổn thương tủy" };
        await host.CallAsync<IVisitService, VisitDetailDto>(s => s.SaveAsync(visitId, request));

        // TC-31: tổng phải thu 1.055.000 ₫, tiền thuốc 75.000 ₫
        var finished = await host.CallAsync<IVisitService, VisitDetailDto>(s => s.FinishAsync(visitId));
        Assert.Equal(VisitStatus.ChoThanhToan, finished.Status);
        Assert.Equal(1055000m, finished.Invoice!.Total);

        // BR-17: mở lại khi chưa thu, kết thúc lại
        var reopened = await host.CallAsync<IVisitService, VisitDetailDto>(s => s.ReopenAsync(visitId));
        Assert.Equal(VisitStatus.DangKham, reopened.Status);
        finished = await host.CallAsync<IVisitService, VisitDetailDto>(s => s.FinishAsync(visitId));
        var invoiceId = finished.Invoice!.Id;

        // TC-46, TC-42: thu tiền
        await host.SignInAsync("letan");
        var invoice = await host.CallAsync<IInvoiceService, InvoiceDto>(s => s.GetByIdAsync(invoiceId));
        Assert.Equal(75000m, invoice.MedicineTotal);
        var low = await Assert.ThrowsAsync<DomainException>(() => host.CallAsync<IInvoiceService, CreateResult<ReceiptDto>>(s => s.CollectAsync(invoiceId,
            new CollectRequest { ClientRequestId = Guid.NewGuid().ToString(), Amount = 50000, Method = PaymentMethod.TienMat, CashReceived = 50000, PartialReason = "Thu trước", ExpectedTotal = 1055000 })));
        Assert.Equal(ClinicErrorCodes.ThuThieuTienThuoc, Code(low));
        Assert.Equal("Số tiền thu tối thiểu 75.000 ₫ (tiền thuốc)", low.Message);
        var requestId = Guid.NewGuid().ToString();
        var receipt = await host.CallAsync<IInvoiceService, CreateResult<ReceiptDto>>(s => s.CollectAsync(invoiceId,
            new CollectRequest { ClientRequestId = requestId, Amount = 1055000, Method = PaymentMethod.TienMat, CashReceived = 1100000, ExpectedTotal = 1055000 }));
        Assert.True(receipt.Created);
        Assert.Equal(45000m, receipt.Value.ChangeAmount);
        var again = await host.CallAsync<IInvoiceService, CreateResult<ReceiptDto>>(s => s.CollectAsync(invoiceId,
            new CollectRequest { ClientRequestId = requestId, Amount = 1055000, Method = PaymentMethod.TienMat, CashReceived = 1100000, ExpectedTotal = 1055000 }));
        Assert.False(again.Created);
        Assert.Equal(receipt.Value.Id, again.Value.Id);

        // BR-17: không mở lại khi đã thu
        await host.SignInAsync("bacsi");
        var noReopen = await Assert.ThrowsAsync<ConflictException>(() => host.CallAsync<IVisitService, VisitDetailDto>(s => s.ReopenAsync(visitId)));
        Assert.Equal(ClinicErrorCodes.KhongMoLaiDuoc, Code(noReopen));

        // BR-27: quản lý hủy phiếu thu trong ngày; TC-44: đánh dấu mua ngoài
        await host.SignInAsync("quanly");
        var cancelled = await host.CallAsync<IInvoiceService, ReceiptDto>(s => s.CancelReceiptAsync(receipt.Value.Id, new ReasonRequest { Reason = "Thu nhầm phương thức" }));
        Assert.Equal(ReceiptStatus.DaHuy, cancelled.Status);
        await host.SignInAsync("letan");
        invoice = await host.CallAsync<IInvoiceService, InvoiceDto>(s => s.GetByIdAsync(invoiceId));
        Assert.Equal(InvoiceStatus.ChoThu, invoice.Status);
        var outside = invoice.Lines.Where(l => l.Kind == InvoiceLineKind.Thuoc).Select(l => l.Id).ToList();
        var changed = await Assert.ThrowsAsync<ConflictException>(() => host.CallAsync<IInvoiceService, CreateResult<ReceiptDto>>(s => s.CollectAsync(invoiceId,
            new CollectRequest { ClientRequestId = Guid.NewGuid().ToString(), OutsideLineIds = outside, Amount = 980000, Method = PaymentMethod.ChuyenKhoan, ExpectedTotal = 1055000 })));
        Assert.Equal(ClinicErrorCodes.TongTienDaDoi, Code(changed));
        Assert.Equal(980000m, changed.Extensions["serverTotal"]);
        var paid = await host.CallAsync<IInvoiceService, CreateResult<ReceiptDto>>(s => s.CollectAsync(invoiceId,
            new CollectRequest { ClientRequestId = Guid.NewGuid().ToString(), OutsideLineIds = outside, Amount = 980000, Method = PaymentMethod.ChuyenKhoan, ExpectedTotal = 980000 }));
        Assert.Equal(0m, paid.Value.DebtAfter);

        // BR-32: lễ tân không thấy nội dung chuyên môn
        var asReceptionist = await host.CallAsync<IVisitService, VisitDetailDto>(s => s.GetByIdAsync(visitId));
        Assert.Null(asReceptionist.Medical);
        Assert.Equal(VisitStatus.HoanTat, asReceptionist.Status);
    }

    [Fact]
    public async Task Dat_lich_online_ke_hoach_nhac_tai_kham()
    {
        await using var host = await ClinicTestHost.StartAsync();
        var services = await host.QueryAsync<Service, Dictionary<string, Guid>>(q => q.ToDictionaryAsync(s => s.Code, s => s.Id));
        var rhm = await host.QueryAsync<Specialty, Guid>(q => q.Where(s => s.Code == "RHM").Select(s => s.Id).SingleAsync());

        // TC-12: bác sĩ bất kỳ khung 09:00 ngày kế tiếp xếp cho BS02 (ít lịch hơn BS03)
        var slot = ClinicTestHost.At(ClinicTestHost.NextDay, "09:00");
        var booked = await host.CallAsync<IPublicBookingService, PublicAppointmentDto>(s => s.BookAsync(new PublicBookingRequest
        {
            SpecialtyId = rhm, StartAt = slot, FullName = "Hoàng Thị Mai", Phone = "0978123456", BirthYear = 1992, Gender = Gender.Nu
        }));
        Assert.Equal(AppointmentStatus.ChoXacNhan, booked.Status);
        Assert.Contains("Trần Thu Hà", booked.DoctorName);
        Assert.Equal("0978***456", booked.PhoneMasked);

        // TC-11: số điện thoại đã có 2 lịch online
        var limit = await Assert.ThrowsAsync<DomainException>(() => host.CallAsync<IPublicBookingService, PublicAppointmentDto>(s => s.BookAsync(new PublicBookingRequest
        {
            SpecialtyId = rhm, StartAt = ClinicTestHost.At(ClinicTestHost.NextDay, "10:00"), FullName = "Lê Thị Thu", Phone = "0933000111", BirthYear = 1994, Gender = Gender.Nu
        })));
        Assert.Equal(ClinicErrorCodes.QuaSoLichOnline, Code(limit));

        // TC-14: xác nhận lịch online, tạo hồ sơ mới từ thông tin khách
        await host.SignInAsync("letan");
        var pending = await host.CallAsync<IAppointmentService, Application.Common.Models.PaginatedResult<AppointmentCardDto>>(s =>
            s.GetPagedAsync(new AppointmentQuery { Status = AppointmentStatus.ChoXacNhan, Search = booked.Code }));
        var card = Assert.Single(pending.Items);
        var confirmed = await host.CallAsync<IAppointmentService, AppointmentDetailDto>(s => s.ConfirmAsync(card.Id, new ConfirmAppointmentRequest
        {
            NewPatient = new NewPatientInput { FullName = "Hoàng Thị Mai", Phone = "0978123456", BirthDate = "1992-05-12", Gender = Gender.Nu }
        }));
        Assert.Equal(AppointmentStatus.DaXacNhan, confirmed.Status);
        Assert.Matches(@"^BN\d{6}$", confirmed.Patient!.Code);
        Assert.Contains(confirmed.Messages, m => m.Kind == MessageKind.XacNhanLich);

        // TC-39, TC-40: kế hoạch điều trị
        await host.SignInAsync("bacsi");
        var binh = await host.QueryAsync<Patient, Guid>(q => q.Where(p => p.Code == "BN000126").Select(p => p.Id).SingleAsync());
        List<SavePlanItemInput> Items(int percent) =>
        [
            new() { ServiceId = services["NK04"], Teeth = [36] },
            new() { ServiceId = services["NK06"], Teeth = [36], DiscountType = DiscountType.PhanTram, DiscountValue = percent },
            new() { ServiceId = services["NK01"] }
        ];
        var plan = await host.CallAsync<ITreatmentPlanService, TreatmentPlanDto>(s => s.CreateAsync(new SaveTreatmentPlanRequest { PatientId = binh, PlannedSessions = 3, Items = Items(10) }));
        Assert.Equal(6300000m, plan.SubTotal);
        Assert.Equal(450000m, plan.DiscountTotal);
        Assert.Equal(5850000m, plan.Total);
        Assert.Equal(7.1m, plan.DiscountRate);
        Assert.Equal(PlanStatus.DaBaoGia, (await host.CallAsync<ITreatmentPlanService, TreatmentPlanDto>(s => s.QuoteAsync(plan.Id))).Status);
        var plan2 = await host.CallAsync<ITreatmentPlanService, TreatmentPlanDto>(s => s.CreateAsync(new SaveTreatmentPlanRequest { PatientId = binh, PlannedSessions = 3, Items = Items(20) }));
        Assert.Equal(900000m, plan2.DiscountTotal);
        Assert.Equal(14.3m, plan2.DiscountRate);
        Assert.Equal(PlanStatus.ChoDuyet, (await host.CallAsync<ITreatmentPlanService, TreatmentPlanDto>(s => s.QuoteAsync(plan2.Id))).Status);
        await host.SignInAsync("quanly");
        Assert.Equal(PlanStatus.DaBaoGia, (await host.CallAsync<ITreatmentPlanService, TreatmentPlanDto>(s => s.ApproveAsync(plan2.Id, new PlanNoteRequest()))).Status);

        // TC-38, TC-49, BR-30: nhắc tái khám
        await host.SignInAsync("letan");
        var due = await host.CallAsync<IFollowUpService, FollowUpPageDto>(s => s.GetPagedAsync(new FollowUpQuery { Group = FollowUpGroups.Due, PageSize = 100 }));
        var yen = due.Page.Items.Single(f => f.PatientCode == "BN000137");
        var sent = await host.CallAsync<IFollowUpService, SendFollowUpsResult>(s => s.SendAsync(new SendFollowUpsRequest { Ids = [yen.Id] }));
        Assert.Equal(1, sent.SentCount);
        Assert.Contains("Mạc Thị Yến có lịch tái khám ngày 23/10/2026 với BS. Trần Thu Hà", sent.Items[0].Message!.Content);
        var early = await Assert.ThrowsAsync<ConflictException>(() => host.CallAsync<IFollowUpService, SendFollowUpsResult>(s => s.SendAsync(new SendFollowUpsRequest { Ids = [yen.Id] })));
        Assert.Equal(ClinicErrorCodes.GuiNhacQuaSom, Code(early));
        var reminded = await host.CallAsync<IFollowUpService, FollowUpPageDto>(s => s.GetPagedAsync(new FollowUpQuery { Group = FollowUpGroups.Reminded, PageSize = 100 }));
        Assert.Contains(reminded.Page.Items, f => f.PatientCode == "BN000129");
        var overdue = await host.CallAsync<IFollowUpService, FollowUpPageDto>(s => s.GetPagedAsync(new FollowUpQuery { Group = FollowUpGroups.Overdue, PageSize = 100 }));
        Assert.Contains(overdue.Page.Items, f => f.PatientCode == "BN000130");
    }

    [Theory]
    [InlineData(45.0, "temperature")]
    [InlineData(33.9, "temperature")]
    public void Sinh_hieu_ngoai_khoang_bao_loi_tai_o(double temperature, string field)
    {
        var result = new SaveVisitRequestValidator().Validate(new SaveVisitRequest { Temperature = (decimal)temperature });
        Assert.Contains(result.Errors, e => e.PropertyName == field && e.ErrorMessage == "Nhiệt độ từ 34,0 đến 42,0 °C");
        var bp = new SaveVisitRequestValidator().Validate(new SaveVisitRequest { BpSystolic = 90, BpDiastolic = 95 });
        Assert.Contains(bp.Errors, e => e.PropertyName == "bpDiastolic" && e.ErrorMessage == "Huyết áp tâm trương phải nhỏ hơn tâm thu");
    }
}
