# Danh sách API — Quản lý Phòng khám

> Base URL dev: `https://localhost:7110` · Swagger: `https://localhost:7110/swagger`
> Quy ước chung (đường dẫn, phân trang, lỗi) và API nền (auth, users, roles, settings, audit-logs, demo): xem `ZDOCS/03-KIEN-TRUC/QUY-UOC-API.md`.
> File này chỉ liệt kê **API nghiệp vụ riêng của dự án**. Bảng và cột: `06-THIET-KE-CSDL.md`. Mã FR, BR, UC, TC: `02-SRS.md`, `03-USE-CASE.md`, `05-KICH-BAN-KIEM-THU.md`.

---

## 1. Mã quyền nghiệp vụ

Khai báo ở BE `Application/Constants/ProjectPermissions.cs`, seed qua `FE/src/mock/seed/project.json`, FE `config/permissions.ts`. Vai trò `STAFF` của nền không dùng; tài khoản `nhanvien` bị bỏ.

| Nhóm | Mã quyền | MANAGER | RECEPTIONIST | DOCTOR |
| :--- | :--- | :---: | :---: | :---: |
| Danh mục | `services.view` | ✓ | ✓ | ✓ |
| | `services.create`, `services.update`, `services.delete` | ✓ | | |
| | `medicines.view` | ✓ | ✓ | ✓ |
| | `medicines.create`, `medicines.update`, `medicines.delete` | ✓ | | |
| Bác sĩ | `doctors.view` | ✓ | ✓ | ✓ |
| | `doctors.create`, `doctors.update`, `doctors.delete` | ✓ | | |
| Lịch hẹn | `appointments.view` | ✓ | ✓ | ✓ |
| | `appointments.create`, `appointments.update`, `appointments.cancel` | ✓ | ✓ | |
| Hàng chờ | `queue-tickets.view` | ✓ | ✓ | ✓ |
| | `queue-tickets.create`, `queue-tickets.update` | ✓ | ✓ | |
| | `queue-tickets.call` | | | ✓ |
| Bệnh nhân | `patients.view`, `patients.create`, `patients.update` | ✓ | ✓ | ✓ |
| | `medical-records.view` | | | ✓ |
| Khám | `visits.examine`, `visits.reopen` | | | ✓ |
| Kế hoạch | `treatment-plans.view` | ✓ | ✓ | ✓ |
| | `treatment-plans.create`, `treatment-plans.update` | | | ✓ |
| | `treatment-plans.approve` | ✓ | | |
| Thu phí | `invoices.view`, `invoices.collect` | ✓ | ✓ | |
| | `invoices.cancel` | ✓ | | |
| Tái khám | `follow-ups.view`, `follow-ups.update` | ✓ | ✓ | |
| Báo cáo | `reports.view` | ✓ | | |

`dashboard.view` của nền chỉ cấp cho `MANAGER`; Lễ tân, Bác sĩ đăng nhập vào thẳng `/queue` (UC-14 E2). `ADMIN` có mọi quyền.

---

## 2. Enum và mã lỗi

### 2.1. Enum (API trả chuỗi)

| Enum | Giá trị |
| :--- | :--- |
| `ServiceGroup` | `Kham`, `ThuThuat`, `CanLamSang` |
| `ServiceUnit` | `Lan`, `Rang`, `Phim`, `Ca` |
| `Gender` | `Nam`, `Nu` |
| `DayOffPart` | `CaNgay`, `Sang`, `Chieu` |
| `AppointmentSource` | `Online`, `LeTan` |
| `AppointmentStatus` | `ChoXacNhan`, `DaXacNhan`, `DaDen`, `KhongDen`, `DaHuy` |
| `AppointmentCancelReason` | `BenhNhanBan`, `BacSiNghi`, `DatTrung`, `Khac` |
| `VisitStatus` | `ChoKham`, `DangKham`, `ChoKetQua`, `ChoThanhToan`, `HoanTat`, `BoVe` |
| `DiagnosisKind` | `Chinh`, `Phu` |
| `OrderStatus` | `ChoThucHien`, `CoKetQua`, `KhongThucHien`, `DaLam` |
| `PlanStatus` | `Nhap`, `ChoDuyet`, `DaBaoGia`, `DangDieuTri`, `HoanThanh`, `DaHuy` |
| `PlanItemStatus` | `ChuaLam`, `DaLam`, `DaHuy` |
| `DiscountType` | `PhanTram`, `SoTien` |
| `InvoiceStatus` | `ChoThu`, `ThuMotPhan`, `DaThuDu`, `DaHuy` |
| `InvoiceLineKind` | `PhiKham`, `DichVu`, `Thuoc` |
| `RevenueGroup` | `Kham`, `ThuThuat`, `CanLamSang`, `Thuoc` |
| `PaymentMethod` | `TienMat`, `ChuyenKhoan`, `The` |
| `ReceiptStatus` | `HopLe`, `DaHuy` |
| `FollowUpStatus` | `ChoNhac`, `DaNhac`, `DaDatLich`, `DaQuayLai`, `QuaHan` |
| `CallResult` | `DongYDen`, `HenNgayKhac`, `KhongLienLacDuoc` |
| `MessageKind` | `XacNhanLich`, `NhacLich`, `NhacTaiKham` |
| `MessageChannel` | `Zalo`, `Sms` |

### 2.2. Mã lỗi nghiệp vụ

ProblemDetails có thêm `code` (và trường mở rộng ghi trong cột cuối).

| HTTP | `code` | Khi nào | Mở rộng |
| :---: | :--- | :--- | :--- |
| 400 | `KhungKhongHopLe` | Giờ không phải đầu khung của bác sĩ, khung đã bắt đầu, ngày nghỉ, ngoài 30 ngày hoặc trong 2 giờ tới (online) | |
| 409 | `KhungHetCho` | Khung đủ số lịch tối đa: "Khung đã đủ lịch hẹn" (lễ tân), "Khung giờ vừa hết chỗ" (online) | |
| 400 | `QuaSoLichOnline` | BR-03: số điện thoại đã có 2 lịch online đang chờ | |
| 400 | `KhongTiepDonHomNay` | Lịch hẹn không phải hôm nay: "Lịch hẹn ngày dd/MM/yyyy, không tiếp đón hôm nay" | |
| 409 | `BenhNhanDangKham` | BR-07: "Bệnh nhân đang chờ khám với BS. …, STT 005" | `visitId` |
| 409 | `BacSiDangKham` | BR-12: "Kết thúc khám hoặc chuyển Chờ kết quả trước" | |
| 400 | `ThieuThongTinKham` | BR-17 khi kết thúc khám | `missing: string[]` |
| 409 | `TrungDiUng` | BR-19: thuốc trùng dị ứng chưa xác nhận | `medicineId`, `keywords: string[]` |
| 409 | `TrungHoSo` | BR-14: cùng số điện thoại và ngày sinh, chưa chọn "Vẫn tạo mới" | `candidates: PatientBrief[]` |
| 409 | `KhongMoLaiDuoc` | BR-17: quá ngày khám hoặc đã có phiếu thu | |
| 400 | `ThuThieuTienThuoc` | BR-25: "Số tiền thu tối thiểu 75.000 ₫ (tiền thuốc)" | `minAmount` |
| 409 | `TongTienDaDoi` | Tổng phải thu ở máy chủ khác số FE gửi | `serverTotal` |
| 409 | `GuiNhacQuaSom` | BR-30: chưa đủ 24 giờ hoặc đã gửi 3 lần | |
| 409 | `TrangThaiKhongHopLe` | Thao tác không hợp với trạng thái hiện tại | |
| 409 | `DaPhatSinh` | Xóa danh mục, bác sĩ, bệnh nhân đã có dữ liệu (BR-33, BR-15) | |
| 429 | `TamKhoaTraCuu` | Trang tra cứu công khai nhập sai mã, số điện thoại 5 lần trong 10 phút | `retryAfterSeconds` |
| 400 | (lỗi theo trường) | Validate: sinh hiệu ngoài khoảng (BR-16), số lượng thuốc (BR-18), giá sai bội số (UC-01 E2), hai khoảng làm việc chồng nhau (UC-02 E1)… | `errors` |

---

## 3. Quy tắc tính

### 3.1. Khung giờ (BR-01, BR-02)

- Khung của bác sĩ ngày `D`: với mỗi khoảng làm việc thứ `isoWeekday(D)`, khung bắt đầu tại `Start + k × SlotMinutes` khi `bắt đầu + SlotMinutes ≤ End`. Ngày nghỉ `CaNgay` không có khung; `Sang` bỏ khung bắt đầu trước 12:00; `Chieu` bỏ khung từ 12:00.
- Đã đặt của khung = số lịch hẹn không `DaHuy` của bác sĩ có `StartAt` = đầu khung. Còn trống khi đã đặt < `MaxPerSlot`.
- Lễ tân tạo, đổi giờ: khung phải là khung của bác sĩ ở ngày đó, chưa bắt đầu (`đầu khung > now`), còn trống. Online: thêm `đầu khung ≥ now + 120 phút`, ngày ≤ hôm nay + 30, bác sĩ `ShowOnline`.
- Đổi lịch làm việc, thêm ngày nghỉ không đổi lịch hẹn đã có; thêm ngày nghỉ trả về danh sách lịch hẹn rơi vào phần nghỉ để lễ tân xử lý (UC-02 1a, TC-07).
- Xem trước số khung (UC-02 bước 5, E2): mỗi khoảng `floor((End − Start) / SlotMinutes)` khung, phần lẻ báo "Phần lẻ cuối khoảng không thành khung".

### 3.2. Bác sĩ bất kỳ (BR-04)

Trong các bác sĩ `IsActive`, `ShowOnline` của chuyên khoa còn trống khung đó: chọn người có ít lịch hẹn không `DaHuy` trong ngày nhất, bằng nhau thì mã nhỏ hơn. Trang đặt lịch hiện một khung khi ít nhất một bác sĩ còn trống.

### 3.3. Đặt online (BR-03, BR-05)

- Số điện thoại `^0(3|5|7|8|9)\d{8}$`. Đếm lịch `Source = Online`, `GuestPhone` = số đó, trạng thái `ChoXacNhan` hoặc `DaXacNhan`: đã có 2 → 400 `QuaSoLichOnline` "Số điện thoại này đã có 2 lịch hẹn sắp tới. Vui lòng gọi {Clinic.Hotline} để được hỗ trợ".
- Lịch online `ChoXacNhan`, `PatientId = null`, lưu `Guest…`. Xác nhận hoặc tiếp đón phải chọn hồ sơ có sẵn hoặc tạo hồ sơ mới từ `Guest…` (UC-04 1a, TC-14); gợi ý hồ sơ cùng số điện thoại (BR-14).

### 3.4. Hàng chờ (BR-08 đến BR-13)

- Thứ tự gọi: nhóm `IsReturned` trước, rồi `IsPriority`, rồi còn lại; trong nhóm `QueueAt` tăng dần, rồi `QueueNumber`.
- Tiếp đón: có lịch hẹn và `CheckedInAt ≤ StartAt + 15 phút` thì `QueueAt = StartAt` (đến sớm cũng xếp theo giờ hẹn, TC-19); còn lại `QueueAt = CheckedInAt`. `InitialQueueAt = QueueAt`.
- Gọi kế tiếp, gọi người này (lượt `ChoKham`): bác sĩ không có lượt `DangKham` (không thì 409 `BacSiDangKham`); lượt → `DangKham`, `StartedAt` (nếu trống) và `CalledAt` = `now`.
- Gọi lại: lượt `DangKham`, `CalledAt = now`.
- Bỏ qua: lượt `DangKham`, `SkipCount + 1`; tới 3 thì `BoVe` (lý do "Bỏ qua 3 lần"), không thì `ChoKham`, `QueueAt = now`, `StartedAt = null`.
- Chờ kết quả: `DangKham` → `ChoKetQua`. Đã quay lại (lễ tân): `ChoKetQua` → `ChoKham`, `IsReturned = true`, `QueueAt = now`.
- Chuyển bác sĩ: lượt `ChoKham`, bác sĩ mới làm việc hôm nay; `QueueNumber` mới của bác sĩ đó, `QueueAt = now`. Hủy lượt: `ChoKham` → `BoVe` kèm lý do.
- Số phút đã chờ hiển thị = `max(0, now − InitialQueueAt)`; tô vàng từ 30, đỏ từ 60. Thời gian chờ của lượt = `max(0, StartedAt − InitialQueueAt)`; trung bình chỉ tính lượt có `StartedAt`.

### 3.5. Tiếp đón (BR-07, BR-10, BR-20)

1. Có lịch hẹn: lịch phải `ChoXacNhan` hoặc `DaXacNhan` và `Date` = hôm nay (không thì 400 `KhongTiepDonHomNay`); lịch → `DaDen` (lịch chờ coi như xác nhận). Bác sĩ của lượt mặc định theo lịch.
2. Bác sĩ phải đang hoạt động và làm việc hôm nay (có khung, không nghỉ cả ngày).
3. Bệnh nhân không có lượt `ChoKham`, `DangKham`, `ChoKetQua` (không thì 409 `BenhNhanDangKham` "Bệnh nhân đang chờ khám với BS. Nguyễn Minh Khoa, STT 005"; đang khám, chờ kết quả đổi chữ tương ứng).
4. Ưu tiên tự bật khi tuổi (năm tròn theo ngày sinh tới hôm nay) < 6 ("Trẻ dưới 6 tuổi") hoặc ≥ 75 ("Người từ 75 tuổi"); lễ tân bật tay với một lý do trong `Clinic.PriorityReasons`.
5. Tái khám theo hẹn: dòng nhắc chưa `DaQuayLai` của bệnh nhân, cùng bác sĩ, có `DueDate − 3 ≤ hôm nay ≤ DueDate + 7` → `IsFollowUp`, `FollowUpId`, dòng nhắc → `DaQuayLai`, `ReturnedVisitId`.
6. `QueueNumber`, `Code`, `QueueAt` theo §3.4; trả kèm số người đang chờ trước (lượt `ChoKham` đứng trước theo thứ tự gọi).

### 3.6. Ghi phiếu khám (`PUT /api/visits/{id}`)

- Lượt `DangKham` hoặc `ChoKetQua` của bác sĩ đang đăng nhập (quản trị viên sửa được mọi lượt); không thì 409 `TrangThaiKhongHopLe`.
- Sinh hiệu (BR-16) sai khoảng → lỗi theo trường (`temperature`, `pulse`, `bpSystolic`, `bpDiastolic`, `weight`, `height`): "Nhiệt độ từ 34,0 đến 42,0 °C", "Huyết áp tâm trương phải nhỏ hơn tâm thu"…
- Chẩn đoán: tối đa 1 chính, 3 phụ, tên bắt buộc.
- Chỉ định: dịch vụ đang dùng (dòng cũ giữ được dù dịch vụ đã ngừng); `RequiresTooth` thì `teeth` bắt buộc, mỗi số răng thuộc 11–18, 21–28, 31–38, 41–48, 51–55, 61–65, 71–75, 81–85, không trùng, `Quantity` = số răng; không theo răng thì `Quantity` 1–99. Cận lâm sàng có `Status` `ChoThucHien`, `CoKetQua` (cần `Result`), `KhongThucHien`; nhóm khác luôn `ChoThucHien` tới khi kết thúc. Tối đa 5 ảnh.
- Hạng mục kế hoạch: thuộc kế hoạch `DangDieuTri` của bệnh nhân, `ChuaLam`, chưa nằm ở lượt khác; chỉ định lấy `UnitPrice`, `Discount` = `DiscountAmount` của hạng mục, số răng, số lượng của hạng mục (BR-23).
- Đơn thuốc (BR-18): thuốc đang dùng, mỗi thuốc một dòng, số lượng 1–999, số ngày 1–90, cách dùng bắt buộc; giá chụp lúc thêm dòng.
- Dị ứng (BR-19): tách `Allergies` theo dấu phẩy, bỏ khoảng trắng, so khớp không dấu, không phân biệt hoa thường: từ khóa nằm trong hoạt chất hoặc hoạt chất nằm trong từ khóa. Dòng trùng mà `allergyConfirmed` khác `true` → 409 `TrungDiUng` "Bệnh nhân có ghi nhận dị ứng: Amoxicillin". Xác nhận thì lưu người và thời điểm (lần đầu).
- Hẹn tái khám: `FollowUpDate` trong 1 tới 365 ngày sau hôm nay.

### 3.7. Kết thúc khám (BR-17, BR-20, BR-21, BR-23, BR-29)

1. Kiểm tra: có chẩn đoán chính ("Thiếu chẩn đoán chính"); mọi chỉ định cận lâm sàng `CoKetQua` hoặc `KhongThucHien` ("{tên dịch vụ} chưa có kết quả"). Thiếu → 400 `ThieuThongTinKham` kèm `missing`.
2. Lượt → `ChoThanhToan`, `FinishedAt = now`; chỉ định không phải cận lâm sàng → `DaLam`; hạng mục kế hoạch của chỉ định → `DaLam`, `DoneAt`; kế hoạch có mọi hạng mục chưa hủy đã làm → `HoanThanh`.
3. Phiếu thanh toán: dòng `PhiKham` = dịch vụ khám của chuyên khoa bác sĩ (`IsFollowUp` thì đơn giá 0, ghi chú "Tái khám theo hẹn"); mỗi chỉ định trừ `KhongThucHien` một dòng `DichVu` (`ReportGroup` theo nhóm dịch vụ); mỗi dòng đơn thuốc một dòng `Thuoc`. `Amount = UnitPrice × Quantity − Discount`, `Total = Σ Amount`, `MedicineTotal = Σ Amount` dòng thuốc. Mô tả dòng dịch vụ theo răng: "Trám răng composite (R16, R26)".
4. `Total = 0` → phiếu `DaThuDu`, lượt `HoanTat` (BR-21).
5. Có `FollowUpDate` → dòng nhắc `ChoNhac`.

Ví dụ TC-31: KB01 100.000 + CLS01 80.000 + NK02 2 × 400.000 + T001 10 × 1.000 + T003 65.000 = 1.055.000 ₫, `MedicineTotal` 75.000 ₫.

### 3.8. Mở lại phiếu khám (BR-17)

Điều kiện: lượt `ChoThanhToan`, `FinishedAt` là hôm nay, phiếu thanh toán chưa có phiếu thu hợp lệ, bác sĩ không có lượt `DangKham` khác. Kết quả: phiếu thanh toán → `DaHuy`; chỉ định `DaLam` → `ChoThucHien`; hạng mục kế hoạch làm ở lượt này → `ChuaLam` (kế hoạch `HoanThanh` về `DangDieuTri`); dòng nhắc tạo từ lượt này mà chưa gửi lần nào thì xóa; lượt → `DangKham`, `FinishedAt = null`. Không đủ điều kiện → 409 `KhongMoLaiDuoc` kèm lý do.

### 3.9. Thu tiền (BR-21, BR-24, BR-25, BR-26)

1. Phiếu `ChoThu` hoặc `ThuMotPhan`.
2. `outsideLineIds` (dòng thuốc mua ngoài) chỉ đổi được khi chưa có phiếu thu hợp lệ; tính lại `Total`, `MedicineTotal`. `expectedTotal` khác `Total` → 409 `TongTienDaDoi`.
3. Còn phải thu `R = Total − Paid`; số thu `1 ≤ amount ≤ R`. `amount < R` → bắt buộc `partialReason`. `Paid + amount < MedicineTotal` → 400 `ThuThieuTienThuoc` "Số tiền thu tối thiểu {MedicineTotal − Paid} (tiền thuốc)".
4. Tiền mặt: `cashReceived ≥ amount`, `ChangeAmount = cashReceived − amount`. Chuyển khoản: QR có số tiền `amount`, nội dung = mã phiếu thanh toán. Thẻ: chỉ ghi phương thức.
5. `Paid += amount`; trạng thái `ThuMotPhan` hoặc `DaThuDu`; lượt → `HoanTat` nếu đang `ChoThanhToan`. `ClientRequestId` đã có → trả phiếu thu cũ.

Ví dụ: TC-42 thu 1.055.000 ₫, khách đưa 1.100.000 ₫, thối 45.000 ₫; TC-44 mua ngoài hai dòng thuốc còn 980.000 ₫; TC-46 thu 50.000 ₫ báo tối thiểu 75.000 ₫.

### 3.10. Hủy phiếu thu (BR-27)

Phiếu thu `HopLe`, `CollectedAt` là hôm nay, lý do bắt buộc. Phiếu thu → `DaHuy`; `Paid` của phiếu thanh toán trừ đi; trạng thái tính lại (`DaThuDu` → `ThuMotPhan` hoặc `ChoThu`); hết phiếu thu hợp lệ thì lượt về `ChoThanhToan`.

### 3.11. Kế hoạch điều trị (BR-22, BR-23)

- Hạng mục: dịch vụ đang dùng nhóm `ThuThuat` hoặc `CanLamSang`; răng, số lượng như §3.6; `UnitPrice` = giá dịch vụ lúc lập. Giảm `PhanTram` (số nguyên 0–50): `DiscountAmount = floor1000(UnitPrice × Quantity × v / 100)`; `SoTien`: bội số 1.000, ≤ 50% thành tiền trước giảm. `Amount = UnitPrice × Quantity − DiscountAmount`.
- `SubTotal = Σ UnitPrice × Quantity`, `DiscountTotal = Σ DiscountAmount`, `Total = SubTotal − DiscountTotal` (tính trên hạng mục chưa hủy); tỉ lệ giảm = `DiscountTotal / SubTotal × 100`, làm tròn 1 chữ số để hiển thị.
- Chốt báo giá (`Nhap`): tỉ lệ ≤ 10% → `DaBaoGia`, > 10% → `ChoDuyet`. Duyệt: `ChoDuyet` → `DaBaoGia`; từ chối: → `Nhap`, ghi chú bắt buộc. Bệnh nhân đồng ý: `DaBaoGia` → `DangDieuTri`; từ chối: → `DaHuy`. Dừng: `DangDieuTri` → `DaHuy`, hạng mục `ChuaLam` → `DaHuy`. Chỉ sửa hạng mục khi `Nhap`.
- Tiến độ: số hạng mục `DaLam` / số hạng mục chưa hủy; đã làm = Σ `Amount` hạng mục `DaLam`; đã thu = Σ theo từng phiếu thanh toán chứa hạng mục (không hủy) của `floor1000(Paid × tiền hạng mục trong phiếu / Total)`; còn lại = `Total − đã thu`.

Ví dụ TC-39: NK04 1.500.000 + NK06 4.500.000 giảm 10% (450.000) + NK01 300.000 → trước giảm 6.300.000 ₫, giảm 450.000 ₫ (7,1%), sau giảm 5.850.000 ₫, `DaBaoGia`. TC-40: NK06 giảm 20% → 900.000 ₫ (14,3%), `ChoDuyet`.

### 3.12. Nhắc tái khám (BR-29, BR-30)

- Nhóm "Đến hạn nhắc": `ChoNhac` và `DueDate − N ≤ hôm nay ≤ DueDate + 7` (N = `Clinic.FollowUpRemindDays`). "Đã nhắc": `DaNhac`, `DaDatLich`. "Quá hạn": `QuaHan`. Thêm nhóm "Đã quay lại" để tra cứu.
- Gửi tin: `SendCount < 3` và (chưa gửi hoặc `now − LastSentAt ≥ 24 giờ`), không thì 409 `GuiNhacQuaSom` "Gửi lại sau 24 giờ" / "Đã gửi đủ 3 lần"; ghi tin `NhacTaiKham` kênh Zalo; `SendCount + 1`, `LastSentAt`; `ChoNhac` → `DaNhac`.
- Ghi kết quả gọi: `ChoNhac` → `DaNhac`. Tạo lịch hẹn từ dòng nhắc (`followUpId` trong `POST /api/appointments`) → `DaDatLich`, `AppointmentId`.

### 3.13. Tin nhắn giả lập (FR-12, BR-30)

| Loại | Khi | Nội dung |
| :--- | :--- | :--- |
| `XacNhanLich` | Lễ tân tạo lịch, xác nhận lịch online, đổi giờ | "{Clinic.Name}: Xác nhận lịch khám {mã} lúc {HH:mm} ngày {dd/MM/yyyy} với {BS. học vị họ tên}, {phòng}. Vui lòng đến trước 10 phút." |
| `NhacLich` | Việc nền từ 18:00 ngày trước ngày hẹn | "{Clinic.Name}: Nhắc lịch khám {mã} lúc {HH:mm} ngày mai {dd/MM/yyyy} với {BS. …}. Gọi {Clinic.Hotline} nếu cần đổi lịch." |
| `NhacTaiKham` | Lễ tân gửi tin nhắc | "{Clinic.Name}: {Họ tên} có lịch tái khám ngày {dd/MM/yyyy} với {BS. …}. Gọi {Clinic.Hotline} nếu cần đổi lịch." |

Tên bác sĩ trong tin: `BS.` + họ tên (học vị đầy đủ chỉ hiện trên trang đặt lịch).

### 3.14. Tổng quan, báo cáo (BR-13, BR-31)

- Tổng quan hôm nay: lịch hẹn (không `DaHuy`), đã đến (lượt tiếp đón hôm nay), đang chờ (`ChoKham` + `ChoKetQua`), đã khám xong (`ChoThanhToan` + `HoanTat`), không đến (lịch hôm nay `KhongDen`, tới cuối ngày mới có), thực thu (phiếu thu hợp lệ lập hôm nay), thời gian chờ trung bình (§3.4). Lượt tiếp đón theo giờ; bảng theo bác sĩ (đang chờ, đã khám, chờ trung bình); lượt đã chờ từ 30 phút; "Cần xử lý": số lịch online `ChoXacNhan`, số kế hoạch `ChoDuyet`.
- Thực thu: phiếu thu hợp lệ theo ngày `CollectedAt`; so kỳ trước (khoảng liền trước cùng số ngày); theo nhóm: phân bổ số thu của mỗi phiếu thu cho các nhóm dòng theo tỉ lệ tiền dòng không mua ngoài, phần lẻ dồn vào nhóm có tiền lớn nhất; theo phương thức.
- Theo bác sĩ: số lượt khám xong (`ChoThanhToan`, `HoanTat`), số bệnh nhân mới (lượt đầu tiên của bệnh nhân), doanh thu dịch vụ do bác sĩ chỉ định (Σ `Amount` dòng `PhiKham`, `DichVu` của phiếu không hủy), thời gian chờ trung bình.
- Lượt khám: số lượt theo ngày, bệnh nhân mới và cũ, tỉ lệ không đến = `KhongDen / (tổng lịch − DaHuy) × 100` (1 chữ số), nguồn: Online, Lễ tân, Đến trực tiếp (lượt không có lịch hẹn).
- Tái khám: dòng nhắc có `DueDate` trong khoảng: tổng, đã nhắc (đã gửi tin hoặc đã gọi), đã quay lại, quá hạn; tỉ lệ quay lại = `DaQuayLai` / số dòng có `DueDate + 7 < hôm nay` × 100.
- Công nợ: bệnh nhân có phiếu `ChoThu`, `ThuMotPhan` từ trước hôm nay hoặc hôm nay: số phiếu, tổng nợ, ngày phát sinh cũ nhất; lọc bác sĩ, số ngày nợ tối thiểu.
- Phiếu thu đã hủy: theo ngày hủy.
- Khoảng ngày tối đa 366 ngày (400 nếu vượt). Xuất Excel làm ở FE (`write-excel-file`).

---

## 4. API nghiệp vụ

Mọi API cần đăng nhập trừ nhóm `/api/public/*`. Bác sĩ (tài khoản gắn bác sĩ) chỉ nhận dữ liệu lịch hẹn, hàng chờ của mình.

### 4.1. Danh mục — `/api/specialties`, `/api/services`, `/api/medicines`, `/api/diagnosis-templates`

| Method | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/specialties` | đăng nhập | Chuyên khoa kèm dịch vụ phí khám |
| GET | `/api/services` | `services.view` | `?group&specialtyId&search&active`, sắp theo nhóm, mã |
| GET | `/api/services/options` | đăng nhập | Dịch vụ đang dùng (chỉ định, kế hoạch, lịch hẹn) |
| GET | `/api/services/next-code?group=` | `services.create` | Mã gợi ý `NK13` |
| POST, PUT, DELETE | `/api/services`, `/api/services/{id}` | `services.create` / `update` / `delete` | Trùng mã 409; xóa đã dùng 409 `DaPhatSinh` |
| PATCH | `/api/services/{id}/status` | `services.update` | `{ isActive }` |
| GET | `/api/medicines` | `medicines.view` | Phân trang `?search&active` (mã, tên, hoạt chất) |
| GET | `/api/medicines/options` | đăng nhập | Thuốc đang dùng (kê đơn) |
| POST, PUT, DELETE, PATCH status | `/api/medicines…` | `medicines.*` | Giá bội số 100 ₫ |
| GET | `/api/diagnosis-templates` | `services.view` | `?search&specialtyId&active` |
| GET | `/api/diagnosis-templates/options` | đăng nhập | Đang dùng |
| POST, PUT, DELETE, PATCH status | `/api/diagnosis-templates…` | `services.*` | |

### 4.2. Bác sĩ, lịch làm việc — `/api/doctors`, `/api/days-off`

| Method | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/doctors` | `doctors.view` | Kèm khoảng làm việc, số giờ mỗi tuần, số khung mỗi ngày |
| GET | `/api/doctors/options` | đăng nhập | Bác sĩ đang hoạt động |
| GET | `/api/doctors/account-candidates` | `doctors.update` | Tài khoản vai trò Bác sĩ, kèm bác sĩ đã gắn |
| GET | `/api/doctors/next-code` | `doctors.create` | |
| POST, PUT | `/api/doctors`, `/api/doctors/{id}` | `doctors.create` / `update` | Tài khoản đã gắn bác sĩ khác → lỗi tại `userId` |
| PUT | `/api/doctors/{id}/schedule` | `doctors.update` | `{ slotMinutes, maxPerSlot, hours: [{ dayOfWeek, startTime, endTime }] }`; chồng nhau → lỗi theo trường |
| PATCH | `/api/doctors/{id}/status` | `doctors.update` | `{ isActive }` |
| DELETE | `/api/doctors/{id}` | `doctors.delete` | Đã có lịch hẹn, lượt khám → 409 |
| GET | `/api/days-off` | `doctors.view` | `?doctorId&from&to` |
| POST | `/api/days-off` | `doctors.update` | `{ doctorId, date, part, reason }` → `{ dayOff, affected: AppointmentBrief[] }` |
| DELETE | `/api/days-off/{id}` | `doctors.update` | |

### 4.3. Lịch hẹn — `/api/appointments`

| Method | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/appointments/board?date&specialtyId` | `appointments.view` | Dạng ngày: bác sĩ, khung (đã đặt / tối đa), thẻ lịch hẹn |
| GET | `/api/appointments/week?start` | `appointments.view` | Dạng tuần: số lịch, số chờ xác nhận theo bác sĩ và ngày |
| GET | `/api/appointments` | `appointments.view` | Phân trang `?status&from&to&doctorId&patientId&search` |
| GET | `/api/appointments/pending-count` | `appointments.view` | Badge số lịch chờ xác nhận |
| GET | `/api/appointments/{id}` | `appointments.view` | Chi tiết, tin nhắn, hồ sơ gợi ý cùng số điện thoại |
| GET | `/api/appointments/slots?doctorId&date` | `appointments.view` | Khung của bác sĩ trong ngày, đã đặt, còn trống |
| POST | `/api/appointments` | `appointments.create` | `{ patientId \| newPatient, doctorId, startAt, serviceId?, reason?, note?, followUpId? }` → `DaXacNhan`, tin xác nhận |
| PUT | `/api/appointments/{id}/time` | `appointments.update` | `{ doctorId, startAt }` đổi giờ, bác sĩ (BR-06) |
| POST | `/api/appointments/{id}/confirm` | `appointments.update` | `{ patientId \| newPatient }` (lịch online chưa ghép hồ sơ) |
| POST | `/api/appointments/{id}/cancel` | `appointments.cancel` | `{ reason, note? }` |

### 4.4. Đặt lịch online (công khai) — `/api/public/booking`

| Method | Đường dẫn | Mô tả |
| :--- | :--- | :--- |
| GET | `/api/public/booking/catalog` | Phòng khám (tên, logo, địa chỉ, giờ làm việc, hotline), chuyên khoa, bác sĩ `ShowOnline` |
| GET | `/api/public/booking/slots?specialtyId&doctorId&date` | `{ date, slots: [{ time, available }], closedReason, nextAvailableDate }`; `doctorId` trống là bác sĩ bất kỳ |
| POST | `/api/public/booking` | `{ specialtyId, doctorId?, startAt, fullName, phone, birthYear, gender, reason? }` → `PublicAppointmentDto` |
| POST | `/api/public/booking/lookup` | `{ code, phone }` (FR-13, P3) |
| POST | `/api/public/booking/cancel` | `{ code, phone }`: lịch chưa tiếp đón, bắt đầu sau ít nhất 2 giờ |

### 4.5. Tiếp đón, hàng chờ — `/api/queue`, `/api/visits`

| Method | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/queue/today` | `queue-tickets.view` | Lịch hẹn hôm nay chưa tiếp đón; theo bác sĩ: đang khám, hàng chờ (đã sắp), chờ kết quả, số đã khám |
| GET | `/api/visits/check-in-preview` | `queue-tickets.create` | `?appointmentId&patientId&doctorId` → ưu tiên tự động, tái khám theo hẹn, lượt đang mở |
| POST | `/api/visits` | `queue-tickets.create` | Tiếp đón `{ appointmentId?, patientId?, newPatient?, doctorId, reason?, isPriority, priorityReason? }` |
| POST | `/api/queue/call-next` | `queue-tickets.call` | `{ doctorId? }` (bác sĩ đăng nhập dùng bác sĩ của mình) |
| POST | `/api/visits/{id}/call` | `queue-tickets.call` | Gọi người này `{ reason }` |
| POST | `/api/visits/{id}/recall`, `/skip`, `/await-results` | `queue-tickets.call` | |
| POST | `/api/visits/{id}/returned` | `queue-tickets.update` | Đã quay lại từ "Chờ kết quả" |
| POST | `/api/visits/{id}/transfer` | `queue-tickets.update` | `{ doctorId }` |
| POST | `/api/visits/{id}/cancel` | `queue-tickets.update` | `{ reason }` |
| GET | `/api/visits/{id}/ticket` | `queue-tickets.view` | Dữ liệu phiếu số thứ tự |
| GET | `/api/public/queue-display?code=` | công khai | Màn hình sảnh: mỗi phòng số đang khám, 5 số kế tiếp, lượt gọi gần nhất; sai mã → 404 |

### 4.6. Phiếu khám — `/api/visits`

| Method | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/visits/{id}` | `queue-tickets.view` hoặc `patients.view` | Phiếu khám; nội dung chuyên môn chỉ khi có `medical-records.view` (ghi nhật ký xem) |
| GET | `/api/visits` | `patients.view` | Phân trang `?patientId&doctorId&from&to&status`: tóm tắt (ngày, bác sĩ, dịch vụ, số tiền); `?withMedical=true` thêm chẩn đoán, đơn, kết quả cho người có `medical-records.view` |
| PUT | `/api/visits/{id}` | `visits.examine` | Ghi phiếu (§3.6) |
| POST | `/api/visits/{id}/finish` | `visits.examine` | §3.7 |
| POST | `/api/visits/{id}/reopen` | `visits.reopen` | §3.8 |
| GET | `/api/visits/{id}/prescription` | `medical-records.view` | Dữ liệu bản in đơn thuốc |
| GET, POST, DELETE | `/api/usage-phrases` | `visits.examine` | Câu mẫu cách dùng của tài khoản đang đăng nhập |

### 4.7. Bệnh nhân — `/api/patients`

| Method | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/patients` | `patients.view` | Phân trang `?search` (mã, tên, số điện thoại), lần khám gần nhất, công nợ |
| GET | `/api/patients/{id}` | `patients.view` | Hồ sơ, tuổi, công nợ, lịch hẹn sắp tới |
| GET | `/api/patients/duplicates?phone&birthDate` | `patients.view` | `{ exact: [...], samePhone: [...] }` (BR-14) |
| POST | `/api/patients` | `patients.create` | `force: true` để vẫn tạo khi trùng; không thì 409 `TrungHoSo` |
| PUT | `/api/patients/{id}` | `patients.update` | |
| DELETE | `/api/patients/{id}` | `patients.update` | Đã có dữ liệu → 409 `DaPhatSinh` |

### 4.8. Kế hoạch điều trị — `/api/treatment-plans`

| Method | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/treatment-plans` | `treatment-plans.view` | Phân trang `?status&patientId&doctorId&search` |
| GET | `/api/treatment-plans/{id}` | `treatment-plans.view` | Hạng mục, tiến độ, đã thu |
| POST, PUT | `/api/treatment-plans`, `/{id}` | `treatment-plans.create` / `update` | `{ patientId, plannedSessions, note, items: [...] }`; sửa khi `Nhap` |
| POST | `/{id}/quote`, `/{id}/accept`, `/{id}/decline`, `/{id}/stop` | `treatment-plans.update` | §3.11 |
| POST | `/{id}/approve`, `/{id}/reject` | `treatment-plans.approve` | `{ note }` |

### 4.9. Thu phí — `/api/invoices`, `/api/receipts`

| Method | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/invoices` | `invoices.view` | Phân trang `?status&patientId&from&to&search`; `status=ChoThu` sắp theo giờ kết thúc khám |
| GET | `/api/invoices/{id}` | `invoices.view` | Dòng, phiếu thu, công nợ cũ của bệnh nhân |
| POST | `/api/invoices/{id}/receipts` | `invoices.collect` | `{ clientRequestId, outsideLineIds, amount, method, cashReceived?, partialReason?, expectedTotal }` (§3.9) |
| GET | `/api/receipts` | `invoices.view` | Phân trang `?from&to&method&status&search` |
| GET | `/api/receipts/{id}` | `invoices.view` | Bản in phiếu thu |
| POST | `/api/receipts/{id}/cancel` | `invoices.cancel` | `{ reason }` (§3.10) |
| GET | `/api/clinic-profile` | đăng nhập | Tên, địa chỉ, hotline, logo, tài khoản QR |

### 4.10. Nhắc tái khám — `/api/follow-ups`

| Method | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/follow-ups` | `follow-ups.view` | Phân trang `?group=due\|reminded\|overdue\|returned&doctorId&from&to&search`, kèm số dòng mỗi nhóm |
| POST | `/api/follow-ups/send` | `follow-ups.update` | `{ ids }` → kết quả từng dòng, tin đã tạo |
| POST | `/api/follow-ups/{id}/call-result` | `follow-ups.update` | `{ result, note? }` |

### 4.11. Tổng quan, báo cáo — `/api/dashboard`, `/api/reports`

| Method | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/dashboard/today` | `reports.view` | §3.14 |
| GET | `/api/reports/revenue`, `/doctors`, `/visits`, `/follow-ups`, `/debts`, `/cancelled-receipts` | `reports.view` | `?from&to&doctorId&specialtyId` |

---

## 5. DTO

Tên trường camelCase như BE, đủ chi tiết ở `BE/src/Application/DTOs/Clinic/*.cs` và FE `src/types/clinic.ts`. Các DTO chính:

| DTO | Trường chính |
| :--- | :--- |
| `DoctorDto` | `id, code, fullName, title, specialtyId, specialtyName, room, roomShort, photoUrl, bio, userId, username, slotMinutes, maxPerSlot, showOnline, isActive, hours[], weeklyHours, slotsPerDay[7]` |
| `BoardDto` | `date, doctors: [{ id, code, displayName, room, specialtyName, slotMinutes, maxPerSlot, offReason, slots: [{ startAt, endAt, taken, max }] }], appointments: AppointmentCardDto[]` |
| `AppointmentCardDto` | `id, code, doctorId, startAt, endAt, status, source, patientId, patientName, patientPhone, isGuest, serviceName, reason` |
| `QueueTodayDto` | `date, pendingAppointments: AppointmentCardDto[], doctors: [{ id, displayName, room, working, current: QueueVisitDto?, waiting: QueueVisitDto[], awaiting: QueueVisitDto[], doneCount }]` |
| `QueueVisitDto` | `id, code, queueNumber, ticket ("P1 - 005"), patientId, patientName, age, isPriority, priorityReason, hasAppointment, isFollowUp, isReturned, status, queueAt, waitMinutes, skipCount` |
| `VisitDetailDto` | Thông tin lượt, bệnh nhân (tuổi, dị ứng), hàng chờ; `canEdit, canFinish, canReopen, reopenBlockedReason, canMedical`; nội dung chuyên môn (sinh hiệu, triệu chứng, chẩn đoán, chỉ định, đơn thuốc, lời dặn, hẹn tái khám) hoặc null; `activePlanItems`; `invoice` (tóm tắt) |
| `InvoiceListItem` | `id, code, visitId, visitCode, ticket, patientId, patientCode, patientName, patientPhone, doctorName, total, paid, debt, status, createdAt`; `ticket` là số thứ tự của lượt ("P1 - 005") để gọi ra thu phí |
| `InvoiceDto` | `id, code, visitId, visitCode, patient, doctorName, total, medicineTotal, paid, debt, status, createdAt, lines[], receipts[], canEditOutside, patientOtherDebt` |
| `ReceiptDto` | `id, code, invoiceId, invoiceCode, patient, amount, method, cashReceived, changeAmount, partialReason, collectedAt, collectedByName, status, cancelReason, cancelledAt, cancelledByName, canCancel, invoice (dòng, tổng, đã thu, còn nợ)` |
| `TreatmentPlanDto` | `id, code, patient, doctorName, plannedSessions, note, subTotal, discountTotal, total, discountRate, status, items[], doneCount, itemCount, doneAmount, paidAmount, remaining, reviewedByName, reviewNote, actions` |
| `FollowUpDto` | `id, patient (mã, tên, số điện thoại), doctorName, dueDate, note, sendCount, lastSentAt, canSend, sendBlockedReason, callResult, callNote, status, appointmentCode` |

---

## 6. Màn hình FE

| Route | Màn hình | Quyền vào | Ghi chú |
| :--- | :--- | :--- | :--- |
| `/dashboard` | Tổng quan (SCR-01) | `dashboard.view` | Thay trang Tổng quan nền |
| `/queue` | Tiếp đón và hàng chờ (SCR-06) | `queue-tickets.view` | Lễ tân: lịch hôm nay + hàng chờ mọi bác sĩ; bác sĩ: "Hàng chờ của tôi"; tự làm mới mỗi 3 giây |
| `/appointments` | Lịch hẹn (SCR-04) | `appointments.view` | `?date=`, `?view=week`, `?status=ChoXacNhan` |
| `/patients`, `/patients/[id]` | Bệnh nhân (SCR-09, SCR-10) | `patients.view` | Hồ sơ: tab Thông tin, Lượt khám, Kế hoạch điều trị, Lịch hẹn, Thanh toán |
| `/visits/[id]` | Phiếu khám (SCR-11) | `queue-tickets.view` | Tablet ngang 1280 px |
| `/treatment-plans`, `/treatment-plans/[id]` | Kế hoạch điều trị (SCR-13) | `treatment-plans.view` | `?status=ChoDuyet` |
| `/invoices` | Thu phí (SCR-14) | `invoices.view` | Tab Chờ thu, Còn nợ, Phiếu thanh toán, Phiếu thu |
| `/follow-ups` | Nhắc tái khám (SCR-16) | `follow-ups.view` | |
| `/services` | Danh mục (SCR-02) | `services.view` | Tab Dịch vụ, Thuốc, Chẩn đoán mẫu |
| `/doctors` | Bác sĩ (SCR-03) | `doctors.view` | Ngăn kéo: Thông tin, Lịch làm việc, Ngày nghỉ |
| `/reports` | Báo cáo (SCR-17) | `reports.view` | Tab Thực thu, Theo bác sĩ, Lượt khám, Tái khám, Công nợ, Phiếu thu đã hủy |
| `/queue/ticket/[id]` | Phiếu số thứ tự 80 mm (SCR-07) | `queue-tickets.create` | Nhóm `(print)` |
| `/visits/[id]/prescription` | Đơn thuốc A5 (SCR-12) | `medical-records.view` | Nhóm `(print)` |
| `/treatment-plans/[id]/quote` | Báo giá A5 | `treatment-plans.view` | Nhóm `(print)` |
| `/invoices/receipts/[id]` | Phiếu thu A5 (SCR-15) | `invoices.view` | Nhóm `(print)`, `?reprint=1` in dòng "IN LẠI" |
| `/dat-lich`, `/dat-lich/tra-cuu` | Đặt lịch, tra cứu (SCR-05) | công khai | Nhóm `(public)`, tối ưu 360–414 px |
| `/queue/display` | Màn hình sảnh (SCR-08) | công khai, `?code=` | 1920×1080, chuông bằng Web Audio, làm mới mỗi 2 giây |
