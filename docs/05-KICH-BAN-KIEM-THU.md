# Kịch bản kiểm thử nghiệm thu — Quản lý Phòng khám

> Test case theo use case trong `03-USE-CASE.md`. Phần nền (đăng nhập, phân quyền, đặt lại dữ liệu) dùng TC-SYS-01 đến TC-SYS-10 trong `ZDOCS/03-KIEN-TRUC/USE-CASE-NEN.md` §8.

---

## 1. Cách chạy

| Mục | Nội dung |
| :--- | :--- |
| Môi trường | Chạy cả hai chế độ: dữ liệu mẫu (`mock`) và BE thật (`api`) |
| Dữ liệu | Đặt lại dữ liệu demo trước mỗi lượt test; chạy vào ngày thứ 2 tới thứ 7, trong giờ làm việc 08:00–17:00 để có khung giờ và lịch hẹn hôm nay |
| Tài khoản | Theo cột "Vai trò" của từng test case, dùng "Đăng nhập nhanh": `quanly`, `letan`, `bacsi`; trang đặt lịch mở ở cửa sổ ẩn danh, không đăng nhập |
| Thiết bị | Trang đặt lịch chạy ở cửa sổ rộng 390 px; màn hình sảnh ở tab riêng 1920×1080 |
| Test liên quan giờ | TC-19, TC-20 cần thao tác theo đồng hồ thật; ghi giờ thực tế vào biên bản |
| "Ngày mai" | Ngày làm việc kế tiếp: chạy vào thứ 7 thì là thứ 2 tuần sau (dữ liệu mẫu dựng theo quy ước này, `06` §5.3) |
| Đạt | Kết quả thực tế khớp toàn bộ cột "Kết quả mong đợi" |

Dữ liệu mẫu dùng trong test (dữ liệu giả):

| Loại | Giá trị |
| :--- | :--- |
| Bác sĩ | `BS01` Nguyễn Minh Khoa, Răng hàm mặt, Phòng 1, thứ 2–thứ 7 08:00–12:00 và 13:30–17:30, khung 30 phút, tối đa 1 lịch/khung, gắn tài khoản `bacsi`. `BS02` Trần Thu Hà và `BS03` Lê Quốc Bảo, Răng hàm mặt. `BS04` Phạm Thị Lan, Nội tổng quát, Phòng 4, tối đa 2 lịch/khung |
| Phí khám | `KB01` Khám răng hàm mặt 100.000 ₫; `KB02` Khám nội tổng quát 150.000 ₫ |
| Dịch vụ | `CLS01` Chụp phim răng quanh chóp 80.000 ₫/phim; `NK01` Cạo vôi răng 300.000 ₫/lần; `NK02` Trám răng composite 400.000 ₫/răng; `NK04` Điều trị tủy răng hàm 1.500.000 ₫/răng; `NK06` Răng sứ Zirconia 4.500.000 ₫/răng |
| Thuốc | `T001` Paracetamol 500 mg 1.000 ₫/viên; `T002` Amoxicillin 500 mg 2.000 ₫/viên (hoạt chất Amoxicillin); `T003` Nước súc miệng Chlorhexidine 0,12% 65.000 ₫/chai; `T050` Vitamin C 500 mg (đã ngừng) |
| Chẩn đoán mẫu | `K02.1` Sâu ngà răng |
| Bệnh nhân | `BN000125` Nguyễn Văn An, sinh 15/03/1985, 0912345678, dị ứng "Amoxicillin, tôm cua", có lịch hẹn hôm nay với BS01. `BN000126` Trần Thị Bình, sinh 02/09/1990, 0987654321. `BN000127` Lê Gia Huy, 4 tuổi. `BN000128` Phạm Văn Đức, sinh 10/05/1945. `BN000129` Võ Thị Hạnh, hẹn tái khám với BS01 vào ngày hôm nay − 5 ngày. `BN000130` Đặng Quốc Việt, hẹn tái khám với BS01 vào ngày hôm nay − 8 ngày. `BN000131` Bùi Thanh Tâm, sinh 08/08/1995. `BN000132` Đinh Văn Long, sinh 21/01/1979 |
| Lịch hẹn | Số 0933000111 đã có 2 lịch đặt online sắp tới. Hôm nay mỗi bác sĩ có lịch hẹn rải đều các khung |

---

## 2. Test case

### 2.1. Danh mục, bác sĩ

| Mã | UC | Tình huống | Vai trò | Các bước | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-01 | UC-01 | Thêm dịch vụ theo răng | Quản lý | 1. Danh mục → Dịch vụ → Thêm 2. Mã `NK09`, tên "Nhổ răng khôn hàm dưới", nhóm Thủ thuật, Răng hàm mặt, đơn vị răng, giá 2.000.000 ₫, bật "Cần vị trí răng" 3. Lưu 4. Đổi sang Bác sĩ, chỉ định `NK09` trong một phiếu khám | Dịch vụ có trong nhóm Thủ thuật; khi chỉ định, hệ thống bắt chọn vị trí răng |
| TC-02 | UC-01 | Thêm dịch vụ trùng mã | Quản lý | 1. Thêm dịch vụ mã `NK02` 2. Lưu | Báo lỗi tại ô mã, không lưu |
| TC-03 | UC-01 | Giá sai bội số | Quản lý | 1. Thêm dịch vụ giá 350.500 ₫ 2. Thêm thuốc giá 1.550 ₫ | Cả hai báo lỗi tại ô giá; thuốc giá 1.500 ₫ thì lưu được |
| TC-04 | UC-01 | Xóa dịch vụ đã dùng | Quản lý | 1. Chọn `NK02` 2. Bấm Xóa | Hệ thống từ chối, gợi ý dùng "Ngừng" |
| TC-05 | UC-02 | Thêm khoảng làm việc | Quản lý | 1. Bác sĩ → `BS04` → Lịch làm việc 2. Thêm chủ nhật 08:00–11:00, khung 30 phút 3. Lưu 4. Mở Lịch hẹn ngày chủ nhật tới | Xem trước báo 6 khung; lịch hẹn chủ nhật có cột BS04 với 6 khung từ 08:00 tới 10:30 |
| TC-06 | UC-02 | Hai khoảng chồng nhau | Quản lý | 1. Thêm thứ 2 11:00–13:00 cho `BS01` (đã có 08:00–12:00) 2. Lưu | Báo lỗi khoảng chồng nhau, không lưu |
| TC-07 | UC-02 | Ngày nghỉ đột xuất có lịch hẹn | Quản lý | 1. Thêm ngày nghỉ cả ngày cho `BS01` vào ngày mai (đã có lịch hẹn) 2. Lưu 3. Mở trang đặt lịch, chọn BS01, ngày mai | Bước 2 liệt kê các lịch hẹn ngày mai của BS01 cần xử lý; bước 3 hiện "Bác sĩ không khám ngày này" và gợi ý ngày gần nhất còn trống |

### 2.2. Lịch hẹn

| Mã | UC | Tình huống | Vai trò | Các bước | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-08 | UC-03 | Đặt lịch online thành công | Bệnh nhân | 1. Mở `/dat-lich` 2. Chọn Răng hàm mặt, BS01, ngày làm việc kế tiếp, khung 09:30 3. Nhập "Hoàng Thị Mai", 0978123456, 1992, Nữ 4. Đặt lịch | Trang thành công có mã `LH{yyMMdd}{nnnn}`, BS01, ngày giờ; lễ tân thấy lịch "Chờ xác nhận"; mở lại trang đặt lịch thì khung 09:30 đó của BS01 hiện mờ |
| TC-09 | UC-03 | Không hiện khung trong 2 giờ tới | Bệnh nhân | 1. Chọn BS01, ngày hôm nay | Chỉ hiện khung bắt đầu sau giờ hiện tại ít nhất 2 giờ |
| TC-10 | UC-03 | Số điện thoại sai | Bệnh nhân | 1. Nhập số điện thoại "091234567" (9 số) 2. Đặt lịch | Báo lỗi tại ô số điện thoại, không tạo lịch |
| TC-11 | UC-03 | Vượt 2 lịch sắp tới | Bệnh nhân | 1. Đặt lịch với số 0933000111 | Báo "Số điện thoại này đã có 2 lịch hẹn sắp tới…", không tạo lịch |
| TC-12 | UC-03 | Bác sĩ bất kỳ | Bệnh nhân | 1. Xem lịch hẹn ngày mai: chọn một khung BS01 đã đủ, BS02 và BS03 còn trống; ghi số lịch trong ngày của BS02, BS03 2. Trên trang đặt lịch chọn "Bác sĩ bất kỳ", khung đó, đặt lịch | Lịch được xếp cho bác sĩ có ít lịch trong ngày hơn trong hai người BS02, BS03; bằng nhau thì BS02 |
| TC-13 | UC-04 | Tạo lịch khi bệnh nhân gọi điện | Lễ tân | 1. Lịch hẹn → ngày mai → khung 14:00 cột BS04 2. Chọn Trần Thị Bình, dịch vụ Khám nội tổng quát 3. Lưu | Lịch "Đã xác nhận"; tin xác nhận giả lập hiện tên Trần Thị Bình, BS04, ngày mai 14:00; khung 14:00 của BS04 vẫn nhận thêm 1 lịch |
| TC-14 | UC-04 | Xác nhận lịch online, ghép hồ sơ | Lễ tân | 1. Trên trang đặt lịch, đặt với số 0912345678, tên "Nguyễn Văn An" 2. Lễ tân lọc "Chờ xác nhận", mở lịch | Hệ thống gợi ý hồ sơ `BN000125`; chọn và xác nhận thì lịch "Đã xác nhận", gắn với BN000125, không tạo hồ sơ mới |
| TC-15 | UC-04 | Đổi giờ vào khung đã đủ | Lễ tân | 1. Kéo một lịch của BS01 sang khung khác của BS01 đã có lịch | Không thả được, báo "Khung đã đủ lịch hẹn"; lịch giữ giờ cũ |
| TC-16 | UC-04 | Bác sĩ xem lịch hẹn | Bác sĩ | 1. Mở Lịch hẹn | Chỉ có cột BS01; không có nút tạo, đổi giờ, hủy |
| TC-17 | UC-04 | Lịch quá ngày tự chuyển không đến | Lễ tân | 1. Mở Lịch hẹn ngày hôm qua | Không còn lịch "Chờ xác nhận" hoặc "Đã xác nhận"; lịch chưa tiếp đón đều là "Không đến" |

### 2.3. Tiếp đón và hàng chờ

| Mã | UC | Tình huống | Vai trò | Các bước | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-18 | UC-05 | Tiếp đón bệnh nhân có hẹn | Lễ tân | 1. Tiếp đón → tìm "0912345678" 2. Chọn lịch của Nguyễn Văn An, Tiếp đón, Xác nhận | Lượt "Chờ khám" với STT 3 số kế tiếp của BS01; lịch hẹn "Đã đến"; phiếu in 80 mm có STT, Phòng 1, BS. Nguyễn Minh Khoa, giờ tiếp đón, số người chờ trước |
| TC-19 | UC-05 | Có hẹn đến sớm không chen trước | Lễ tân | 1. Chọn bệnh nhân X có lịch với BS03 ở khung bắt đầu sau giờ hiện tại khoảng 30 phút 2. Lúc T: tiếp đón Đinh Văn Long đến trực tiếp, chọn BS03 3. Lúc T+1 phút: tiếp đón X 4. Lúc T+2 phút: tiếp đón Bùi Thanh Tâm đến trực tiếp, chọn BS03 | Thứ tự tương đối trong hàng chờ BS03: Đinh Văn Long, Bùi Thanh Tâm, X; X có nhãn "Có hẹn", giờ xếp hàng bằng giờ hẹn |
| TC-20 | UC-05 | Có hẹn đến muộn trong và quá 15 phút | Lễ tân | 1. Chọn lịch hẹn Y có giờ hẹn H trước giờ hiện tại 5–15 phút; tiếp đón một bệnh nhân đến trực tiếp, rồi tiếp đón Y (cùng bác sĩ) 2. Chọn lịch hẹn Z có giờ hẹn trước giờ hiện tại hơn 15 phút, tiếp đón Z | Y đứng trước bệnh nhân đến trực tiếp vừa tiếp đón (giờ xếp hàng = H); Z xếp theo giờ tiếp đón, đứng sau bệnh nhân đó |
| TC-21 | UC-05 | Ưu tiên tự động theo tuổi | Lễ tân | 1. Tiếp đón Lê Gia Huy (4 tuổi) đến trực tiếp, BS01 2. Tiếp đón Phạm Văn Đức (81 tuổi), BS04 | Cả hai tự bật "Ưu tiên"; Lê Gia Huy đứng đầu hàng chờ BS01 (trừ lượt quay lại từ "Chờ kết quả") |
| TC-22 | UC-05 | Tiếp đón khi đang có lượt chưa khám xong | Lễ tân | 1. Sau TC-18, tiếp đón lại Nguyễn Văn An đến trực tiếp | Báo "Bệnh nhân đang chờ khám với BS. Nguyễn Minh Khoa, STT …", không tạo lượt mới |
| TC-23 | UC-05 | Tiếp đón lịch hẹn ngày khác | Lễ tân | 1. Tìm theo mã lịch hẹn của TC-13 (ngày mai) | Báo "Lịch hẹn ngày dd/MM/yyyy, không tiếp đón hôm nay" |
| TC-24 | UC-06 | Gọi kế tiếp | Bác sĩ | 1. Hàng chờ của tôi → Gọi kế tiếp 2. Xem tab màn hình sảnh | Lượt đầu hàng chuyển "Đang khám", có giờ bắt đầu khám; màn hình sảnh phát chuông, hiện "STT … – Phòng 1 – Nguyễn V. A" (tên viết tắt) |
| TC-25 | UC-06 | Gọi khi đang có người khám | Bác sĩ | 1. Sau TC-24, bấm Gọi kế tiếp | Nút bị khóa, chú thích "Kết thúc khám hoặc chuyển Chờ kết quả trước" |
| TC-26 | UC-06 | Bỏ qua 3 lần | Bác sĩ | 1. Gọi một lượt, bấm Bỏ qua 2. Gọi lại lượt đó lần 2, Bỏ qua 3. Lần 3, Bỏ qua | Sau lần 1, 2: lượt về "Chờ khám", xuống cuối nhóm; sau lần 3: lượt "Bỏ về", rời hàng chờ |
| TC-27 | UC-06 | Quay lại từ Chờ kết quả | Bác sĩ, Lễ tân | 1. Đang khám Nguyễn Văn An, chỉ định `CLS01`, bấm "Chờ kết quả" 2. Gọi kế tiếp người khác rồi kết thúc 3. Lễ tân bấm "Đã quay lại" cho anh An | Bước 1: lượt anh An "Chờ kết quả", nút Gọi kế tiếp mở; bước 3: anh An đứng đầu hàng chờ, trước cả lượt ưu tiên |

### 2.4. Hồ sơ bệnh nhân

| Mã | UC | Tình huống | Vai trò | Các bước | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-28 | UC-07 | Thêm bệnh nhân mới | Lễ tân | 1. Bệnh nhân → Thêm 2. Nhập "Đỗ Minh Tuấn", 20/11/1988, Nam, 0977888999, dị ứng để trống 3. Lưu | Hồ sơ có mã `BN` + 6 số kế tiếp; mở hồ sơ chi tiết |
| TC-29 | UC-07 | Trùng số điện thoại và ngày sinh | Lễ tân | 1. Thêm bệnh nhân "Nguyễn An", 15/03/1985, 0912345678 2. Lưu | Hộp "Có thể trùng hồ sơ" liệt kê `BN000125`; chọn "Dùng hồ sơ này" thì không tạo mới |
| TC-30 | UC-07 | Lễ tân không xem nội dung chuyên môn | Lễ tân, Bác sĩ | 1. Lễ tân mở hồ sơ `BN000125`, tab Lượt khám 2. Đổi sang Bác sĩ, mở cùng tab 3. Quản trị viên mở Nhật ký | Bước 1: chỉ có ngày, bác sĩ, dịch vụ, số tiền, không có chẩn đoán, đơn thuốc; bước 2: thấy chẩn đoán, kết quả, đơn thuốc; bước 3: có dòng ghi tài khoản `bacsi` xem nội dung chuyên môn của BN000125 |

### 2.5. Khám bệnh và đơn thuốc

| Mã | UC | Tình huống | Vai trò | Các bước | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-31 | UC-08 | Khám và kết thúc đủ thông tin | Bác sĩ | 1. Sau TC-27, gọi anh An, nhập kết quả phim `CLS01` 2. Sinh hiệu 36,8 °C, mạch 78, huyết áp 120/80 3. Chẩn đoán chính `K02.1` 4. Chỉ định `NK02` răng 16 và 26 5. Kê `T001` 10 viên, `T003` 1 chai 6. Hẹn tái khám sau 7 ngày 7. Kết thúc khám | Lượt "Chờ thanh toán"; phiếu thanh toán gồm KB01 100.000 + CLS01 80.000 + NK02 2 × 400.000 = 800.000 + T001 10.000 + T003 65.000, tổng 1.055.000 ₫; có dòng nhắc tái khám đúng ngày hẹn; phiếu khám bị khóa |
| TC-32 | UC-08 | Sinh hiệu ngoài khoảng | Bác sĩ | 1. Nhập nhiệt độ 45 2. Nhập huyết áp 80/90 3. Nhập mạch 25 | Cả ba báo lỗi tại ô, giá trị không được lưu |
| TC-33 | UC-08 | Kết thúc khi còn thiếu | Bác sĩ | 1. Đang khám, chỉ định `CLS01` chưa nhập kết quả, chưa chọn chẩn đoán 2. Bấm Kết thúc khám | Không kết thúc; hệ thống chỉ rõ "Thiếu chẩn đoán chính" và "Chụp phim răng quanh chóp chưa có kết quả" |
| TC-34 | UC-08 | Mở lại phiếu khám | Bác sĩ, Lễ tân | 1. Với một lượt đã kết thúc giống TC-31, chưa thu, bấm "Mở lại phiếu", thêm `NK02` cho răng 36, kết thúc lại 2. Lễ tân thu một phần phiếu mới 3. Bác sĩ mở lại phiếu khám | Bước 1: phiếu thanh toán cũ "Đã hủy", phiếu mới 1.455.000 ₫; bước 3: nút "Mở lại phiếu" bị ẩn, có chú thích |
| TC-35 | UC-09 | Kê đơn và in | Bác sĩ | 1. Kê `T001` 10 viên, 3 ngày; `T003` 1 chai, 7 ngày, cách dùng nhập tự do 2. In đơn thuốc | Tổng tiền thuốc tạm tính 75.000 ₫; bản in A5 có thông tin phòng khám, bệnh nhân, chẩn đoán, 2 thuốc, cách dùng, ngày tái khám, bác sĩ, dòng chân "Bản demo – dữ liệu minh họa, không có giá trị y khoa" |
| TC-36 | UC-09 | Cảnh báo trùng dị ứng | Bác sĩ | 1. Phiếu khám của anh An, thêm `T002` Amoxicillin 2. Chọn "Bỏ" 3. Thêm lại, chọn "Vẫn kê" | Bước 1 hiện cảnh báo "Bệnh nhân có ghi nhận dị ứng: Amoxicillin"; bước 2 không thêm dòng; bước 3 thêm dòng, lưu tên bác sĩ và thời điểm xác nhận |
| TC-37 | UC-09 | Đơn thuốc sai | Bác sĩ | 1. Nhập số lượng 0 2. Nhập số ngày 120 3. Thêm `T001` lần thứ hai 4. Gõ tìm "Vitamin C" | Bước 1, 2 báo lỗi tại ô; bước 3 báo "Thuốc đã có trong đơn", chuyển tới dòng cũ; bước 4 không có `T050` |
| TC-38 | UC-08 | Miễn phí khám khi tái khám đúng hẹn | Lễ tân, Bác sĩ | 1. Tiếp đón Võ Thị Hạnh và Đặng Quốc Việt với BS01 2. Bác sĩ khám, chọn chẩn đoán chính, không chỉ định, không kê đơn, kết thúc cả hai | Võ Thị Hạnh có nhãn "Tái khám"; phiếu 0 ₫, dòng phí khám ghi "Tái khám theo hẹn", tự "Đã thu đủ", lượt "Hoàn tất", dòng nhắc "Đã quay lại". Đặng Quốc Việt: phiếu 100.000 ₫ |

### 2.6. Kế hoạch điều trị

| Mã | UC | Tình huống | Vai trò | Các bước | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-39 | UC-10 | Giảm giá trong hạn mức | Bác sĩ | 1. Hồ sơ Trần Thị Bình → Lập kế hoạch 2. Thêm `NK04` răng 36, `NK06` răng 36 giảm 10%, `NK01` 3. Chốt báo giá | Tổng trước giảm 6.300.000 ₫, giảm 450.000 ₫ (7,1%), sau giảm 5.850.000 ₫; trạng thái "Đã báo giá" |
| TC-40 | UC-10 | Giảm giá vượt hạn mức | Bác sĩ, Quản lý | 1. Như TC-39 nhưng `NK06` giảm 20% 2. Chốt báo giá 3. Quản lý mở Tổng quan → Kế hoạch chờ duyệt → Duyệt | Bước 2: giảm 900.000 ₫ (14,3%), trạng thái "Chờ duyệt giảm giá"; bước 3: "Đã báo giá", tổng sau giảm 5.400.000 ₫, ghi tên người duyệt |
| TC-41 | UC-10 | Thực hiện hạng mục | Bác sĩ | 1. Sau TC-40, bấm "Bệnh nhân đồng ý" 2. Tiếp đón chị Bình với BS01, gọi khám, tick hạng mục `NK04` 3. Nhập chẩn đoán, kết thúc khám | Kế hoạch "Đang điều trị"; phiếu thanh toán 100.000 + 1.500.000 = 1.600.000 ₫; hạng mục `NK04` "Đã làm"; tiến độ 1/3 |

### 2.7. Thu phí

| Mã | UC | Tình huống | Vai trò | Các bước | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-42 | UC-11 | Thu đủ bằng tiền mặt | Lễ tân | 1. Thu phí → phiếu 1.055.000 ₫ của TC-31 2. Thu tiền → Tiền mặt → nhập 1.100.000 ₫ 3. Hoàn tất | Tiền thối 45.000 ₫; phiếu thu mã `PT{yyMMdd}{nnnn}`; phiếu thanh toán "Đã thu đủ"; lượt "Hoàn tất"; bản in A5 có đủ dòng, tiền khách đưa, tiền thối |
| TC-43 | UC-11 | Tiền khách đưa không đủ | Lễ tân | 1. Phiếu 1.055.000 ₫ 2. Nhập tiền khách đưa 1.000.000 ₫ | Nút Hoàn tất khóa, hiện "Còn thiếu 55.000 ₫" |
| TC-44 | UC-11 | Thuốc mua ngoài, chuyển khoản | Lễ tân | 1. Một phiếu 1.055.000 ₫ như TC-31, chưa thu 2. Tick "Mua ngoài" hai dòng thuốc 3. Chuyển khoản → Đã nhận tiền | Tổng còn 980.000 ₫; QR hiện 980.000 ₫, nội dung là mã phiếu thanh toán; phiếu thu phương thức Chuyển khoản |
| TC-45 | UC-11 | Thu một phần rồi thu nợ | Lễ tân | 1. Phiếu 1.055.000 ₫ chưa thu 2. Sửa số thu 500.000 ₫, lý do "Trả đợt 1", Hoàn tất 3. Mở hồ sơ bệnh nhân 4. Thu tiếp 555.000 ₫ | Bước 2: "Thu một phần", còn nợ 555.000 ₫, lượt "Hoàn tất"; bước 3: tab Thanh toán hiện công nợ 555.000 ₫, ô "Mua ngoài" bị khóa; bước 4: "Đã thu đủ", công nợ 0 ₫ |
| TC-46 | UC-11 | Thu một phần dưới tiền thuốc | Lễ tân | 1. Phiếu 1.055.000 ₫ chưa thu 2. Sửa số thu 50.000 ₫ | Báo "Số tiền thu tối thiểu 75.000 ₫ (tiền thuốc)", không tạo phiếu thu |
| TC-47 | UC-11 | Bấm Hoàn tất hai lần (chế độ `api`) | Lễ tân | 1. Bấm Hoàn tất hai lần thật nhanh | Chỉ một phiếu thu được tạo |
| TC-48 | UC-12 | Hủy phiếu thu, in lại | Quản lý, Lễ tân | 1. Lễ tân mở phiếu thu 555.000 ₫ của TC-45 2. In lại 3. Đổi sang Quản lý, hủy phiếu thu đó, lý do "Thu nhầm" | Bước 1: không có nút Hủy; bước 2: bản in có dòng "IN LẠI"; bước 3: phiếu thu "Đã hủy", phiếu thanh toán về "Thu một phần", còn nợ 555.000 ₫ |

### 2.8. Nhắc tái khám

| Mã | UC | Tình huống | Vai trò | Các bước | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-49 | UC-13 | Gửi tin nhắc | Lễ tân | 1. Nhắc tái khám → nhóm "Đến hạn nhắc", chọn một dòng hẹn ngày mai 2. Gửi tin nhắc 3. Bấm gửi lại ngay | Tin giả lập đúng mẫu BR-30 (tên phòng khám, họ tên, ngày dd/MM/yyyy, bác sĩ, số điện thoại phòng khám); dòng "Đã nhắc", số lần gửi 1; bước 3 nút gửi bị khóa, chú thích "Gửi lại sau 24 giờ" |
| TC-50 | UC-13 | Tạo lịch hẹn từ dòng nhắc | Lễ tân | 1. Dòng của TC-49 → Ghi kết quả "Đồng ý đến" → Tạo lịch hẹn 2. Lưu | Hộp tạo lịch điền sẵn bệnh nhân, bác sĩ, ngày hẹn; lưu xong dòng "Đã đặt lịch", lịch hẹn "Đã xác nhận" |

### 2.9. Tổng quan và báo cáo

| Mã | UC | Tình huống | Vai trò | Các bước | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-51 | UC-14 | Tổng quan cập nhật theo thao tác | Quản lý | 1. Ghi lại các thẻ số 2. Lễ tân tiếp đón một lịch hẹn 3. Lễ tân thu đủ một phiếu 1.055.000 ₫ 4. Quay lại Tổng quan | "Đã đến" và "Đang chờ" tăng 1 sau bước 2; "Thực thu" tăng đúng 1.055.000 ₫ sau bước 3 |
| TC-52 | UC-14 | Lễ tân, bác sĩ không thấy Tổng quan | Lễ tân, Bác sĩ | 1. Đăng nhập nhanh Lễ tân 2. Đăng nhập nhanh Bác sĩ | Không có thẻ số; cả hai vào thẳng Tiếp đón và hàng chờ |
| TC-53 | UC-15 | Tỉ lệ không đến | Quản lý | 1. Báo cáo → Lượt khám → 7 ngày 2. Đối chiếu với danh sách lịch hẹn 7 ngày | Tỉ lệ = số "Không đến" / (tổng lịch − số "Đã hủy"); vd 13 không đến, 140 lịch, 8 hủy thì 13 / 132 = 9,8% |
| TC-54 | UC-15 | Phiếu thu hủy không tính thực thu | Quản lý | 1. Sau TC-48, xem Thực thu hôm nay và tab Phiếu thu đã hủy | Thực thu hôm nay không gồm phiếu 555.000 ₫ đã hủy; phiếu đó có trong tab Phiếu thu đã hủy kèm người hủy, lý do |
| TC-55 | UC-15 | Khoảng ngày quá dài | Quản lý | 1. Chọn Tùy chọn từ 01/01/2025 tới hôm nay | Báo lỗi khoảng tối đa 366 ngày |

---

## 3. Biên bản chạy thử

| Ngày | Người test | Chế độ | Số TC đạt / tổng | Lỗi ghi nhận |
| :--- | :--- | :--- | :---: | :--- |
| | | | | |
