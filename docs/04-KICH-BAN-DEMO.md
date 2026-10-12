# Kịch bản demo — Quản lý Phòng khám

> Dùng khi trình bày cho chủ phòng khám tư, nha khoa. Thời lượng 12–15 phút. Đi theo một buổi sáng của phòng khám: bệnh nhân đặt lịch, tiếp đón, gọi số, khám, kê đơn, lập kế hoạch điều trị, thu phí, nhắc tái khám.
> Toàn bộ bệnh nhân, đơn thuốc, chẩn đoán trong demo là dữ liệu giả. Không trình bày phần mềm như bệnh án điện tử theo quy định của Bộ Y tế, không bình luận chuyên môn y khoa.

---

## 1. Chuẩn bị trước buổi demo

- [ ] Mở sẵn link demo, thử "Đăng nhập nhanh" cả 4 vai trò
- [ ] Đặt lại dữ liệu demo (thanh công cụ demo → Đặt lại dữ liệu) để có 90 ngày lượt khám và lịch hẹn hôm nay rải đều các khung giờ
- [ ] Đổi tên phòng khám, logo, màu theo thương hiệu khách (Cài đặt → Thương hiệu) nếu đã biết
- [ ] Mở sẵn 3 tab: Tiếp đón và hàng chờ (lễ tân), Màn hình sảnh (để ở màn hình phụ hoặc tab riêng), Hàng chờ của bác sĩ
- [ ] Chuẩn bị điện thoại mở trang đặt lịch, hoặc thu nhỏ trình duyệt về rộng 390 px
- [ ] Bật loa máy tính để nghe chuông gọi số
- [ ] Ghi nhớ dữ liệu mẫu: bệnh nhân Nguyễn Văn An (`BN000125`, có lịch hẹn hôm nay với BS01 ở khung gần giờ hiện tại, dị ứng "Amoxicillin"), Trần Thị Bình (`BN000126`, cần làm răng sứ)
- [ ] Không nhập dữ liệu bệnh nhân thật trong buổi demo

| Link | Ghi chú |
| :--- | :--- |
| FE | `http://localhost:3110` hoặc link online |
| Trang đặt lịch | `http://localhost:3110/dat-lich` (mở trên điện thoại) |
| Màn hình sảnh | `http://localhost:3110/queue/display` (chiếu lên TV hoặc màn hình phụ) |
| Swagger | `https://localhost:7110/swagger` (khi khách hỏi về tích hợp) |

| Tài khoản | Vai trò | Dùng để cho xem |
| :--- | :--- | :--- |
| `admin` | Quản trị viên | Phân quyền, thương hiệu |
| `quanly` | Quản lý | Tổng quan, duyệt giảm giá, danh mục, báo cáo |
| `letan` | Lễ tân | Lịch hẹn, tiếp đón, hàng chờ, thu phí, nhắc tái khám |
| `bacsi` | Bác sĩ (BS01 Nguyễn Minh Khoa, Răng hàm mặt) | Gọi số, phiếu khám, đơn thuốc, kế hoạch điều trị |

Mật khẩu: giá trị `DEMO_PASSWORD` trong `.env`, hoặc bấm "Đăng nhập nhanh". Bệnh nhân không cần tài khoản.

---

## 2. Câu chuyện demo

> Mở đầu: "Anh/chị hình dung sáng nay phòng khám mình mở cửa. Em đi đúng một buổi sáng, từ lúc bệnh nhân đặt lịch trên điện thoại tới lúc thu tiền và hẹn tái khám."

| # | Vai trò | Thao tác | Điểm cần nhấn mạnh |
| :---: | :--- | :--- | :--- |
| 1 | Bệnh nhân | Trên điện thoại, mở trang đặt lịch, chọn Răng hàm mặt, BS. Nguyễn Minh Khoa, ngày mai, khung còn trống; nhập họ tên, số điện thoại; nhận mã lịch hẹn | Bệnh nhân tự đặt lúc 11 giờ đêm cũng được, chỉ thấy khung còn trống nên không trùng lịch |
| 2 | Lễ tân | Đăng nhập Lễ tân, mở Lịch hẹn: thấy badge "Chờ xác nhận", mở lịch vừa đặt, hệ thống gợi ý hồ sơ cùng số điện thoại, bấm Xác nhận; tin nhắn xác nhận giả lập hiện ra | Không sót lịch online; một màn hình thấy lịch của cả 5 bác sĩ |
| 3 | Lễ tân | Mở Tiếp đón: tiếp đón Nguyễn Văn An đến đúng hẹn, in phiếu số thứ tự. Tiếp đón tiếp bé 4 tuổi đến không hẹn | Ba thao tác là xong; bé dưới 6 tuổi tự gắn "Ưu tiên" và lên đầu hàng chờ, người có hẹn được giữ đúng giờ |
| 4 | Lễ tân | Chuyển sang tab Màn hình sảnh | Bệnh nhân ngồi chờ biết đang tới số nào, còn mấy người, không phải ra quầy hỏi |
| 5 | Bác sĩ | Đổi vai trò sang Bác sĩ trên thanh công cụ demo; mở Hàng chờ của tôi, bấm "Gọi kế tiếp" | Màn hình sảnh kêu chuông, hiện số và phòng; bác sĩ gọi một chạm |
| 6 | Bác sĩ | Mở phiếu khám của anh An: bên trái là các lần khám trước và dòng dị ứng màu đỏ; nhập sinh hiệu, chỉ định chụp phim quanh chóp, bấm "Chờ kết quả", gọi người kế tiếp. Đổi về Lễ tân bấm "Đã quay lại" khi anh An cầm phim về | Bệnh nhân đi chụp phim không bị mất lượt; bác sĩ không phải ngồi chờ |
| 7 | Bác sĩ | Gọi lại anh An, nhập kết quả phim kèm ảnh, chọn chẩn đoán mẫu, chỉ định trám 2 răng (16, 26). Kê đơn: thử thêm thuốc có hoạt chất Amoxicillin để thấy cảnh báo trùng dị ứng; kê thuốc khác, in đơn A5; hẹn tái khám sau 7 ngày, bấm "Kết thúc khám" | Lịch sử và dị ứng luôn trước mắt bác sĩ; đơn in rõ ràng; phần mềm chỉ ghi chép, mọi quyết định chuyên môn là của bác sĩ |
| 8 | Bác sĩ | Mở hồ sơ chị Bình, lập kế hoạch điều trị: điều trị tủy răng 36, răng sứ Zirconia 36, cạo vôi; giảm 20% hạng mục răng sứ; bấm "Chốt báo giá" | Báo giá in ra chuyên nghiệp; giảm quá 10% tổng thì tự chuyển chủ phòng khám duyệt |
| 9 | Quản lý | Đổi sang Quản lý, mở Tổng quan: khu "Cần xử lý" có kế hoạch chờ duyệt, bấm Duyệt; xem thẻ đang chờ, thời gian chờ trung bình, bảng theo bác sĩ | Chủ phòng khám kiểm soát giảm giá và thấy ngay phòng nào đang ùn |
| 10 | Lễ tân | Đổi về Lễ tân, mở Thu phí: phiếu của anh An 1.055.000 ₫ gồm khám, chụp phim, trám 2 răng, thuốc; khách đưa 1.100.000 ₫, hệ thống báo thối 45.000 ₫; in phiếu thu | Dịch vụ bác sĩ chỉ định tự vào phiếu, không sót tiền, không tính nhầm |
| 11 | Lễ tân | Mở Nhắc tái khám: nhóm "Đến hạn nhắc", chọn vài bệnh nhân, bấm "Gửi tin nhắc" (giả lập Zalo), ghi kết quả gọi "Đồng ý đến", tạo lịch hẹn ngay từ dòng nhắc | Phòng khám chủ động kéo bệnh nhân quay lại thay vì chờ họ nhớ |
| 12 | Quản lý, Quản trị viên | Quản lý mở Báo cáo: thực thu theo bác sĩ, tỉ lệ không đến, tỉ lệ quay lại tái khám. Đổi sang Quản trị viên, mở ma trận quyền cho thấy Lễ tân không có quyền xem nội dung chuyên môn; đổi màu thương hiệu | Dữ liệu bệnh nhân được bảo vệ theo vai trò; giao diện mang thương hiệu phòng khám |

> Kết: "Toàn bộ bệnh nhân anh/chị vừa thấy là dữ liệu giả. Bản triển khai thật sẽ nhập danh mục dịch vụ, bảng giá, bác sĩ, lịch làm việc của phòng khám mình."

---

## 3. Câu hỏi khách hay hỏi

| Câu hỏi | Trả lời gợi ý |
| :--- | :--- |
| Đây có phải bệnh án điện tử không? | Không. Demo là phần mềm quản lý vận hành phòng khám, phiếu khám là ghi chép nội bộ. Bệnh án điện tử theo quy định của Bộ Y tế có yêu cầu riêng về chữ ký số, lưu trữ, thẩm định; nếu cần sẽ khảo sát và làm thành hạng mục riêng. |
| Có kết nối bảo hiểm y tế không? | Demo không có. Kết nối cổng giám định BHYT cần đáp ứng chuẩn dữ liệu riêng, sẽ khảo sát khi phòng khám có khám BHYT. |
| Có liên thông đơn thuốc quốc gia không? | Demo chưa kết nối. Bản triển khai có thể bổ sung, cần khảo sát yêu cầu và tài khoản liên thông của phòng khám. |
| Phần mềm có gợi ý chẩn đoán, liều thuốc không? | Không. Danh mục chẩn đoán và thuốc chỉ giúp bác sĩ chọn nhanh; mọi nội dung chuyên môn do bác sĩ quyết định và tự nhập. |
| Tin nhắn nhắc lịch có gửi thật không? | Demo chỉ giả lập và hiển thị nội dung tin. Bản triển khai kết nối Zalo ZNS hoặc SMS thương hiệu; phí tin do nhà cung cấp tính. |
| Có nhận ảnh X-quang từ máy chụp không? | Demo cho bác sĩ đính kèm ảnh. Kết nối trực tiếp máy X-quang, PACS cần khảo sát loại máy và phần mềm đi kèm. |
| Niềng răng trả góp nhiều đợt thì sao? | Có: thu một phần, công nợ theo bệnh nhân, kế hoạch điều trị hiện số đã thu và còn lại. |
| Có quản lý kho thuốc, vật tư nha khoa không? | Demo chưa có. Có sẵn demo Quản lý kho riêng; bản triển khai có thể trừ kho theo đơn thuốc và dịch vụ. |
| Có tính hoa hồng cho bác sĩ không? | Demo có báo cáo doanh thu theo bác sĩ. Tính hoa hồng theo dịch vụ là phần mở rộng khi triển khai. |
| Dữ liệu bệnh nhân bảo mật thế nào? | Lễ tân không xem được chẩn đoán, đơn thuốc; mọi lần xem nội dung chuyên môn đều ghi nhật ký. Bản triển khai cài trên server riêng hoặc cloud, sao lưu định kỳ, tuân thủ quy định bảo vệ dữ liệu cá nhân. |
| Có nhiều chi nhánh không? | Bản triển khai có: mỗi cơ sở hàng chờ, lịch hẹn riêng, chủ phòng khám xem gộp. Demo chạy một cơ sở. |

---

## 4. Sau buổi demo

- [ ] Ghi lại yêu cầu khách nêu thêm vào `01-TONG-QUAN-NGHIEP-VU.md`
- [ ] Ghi lại số bác sĩ, chuyên khoa, có nha khoa hay không, có khám BHYT hay không, phần mềm đang dùng
- [ ] Gửi link demo và tài khoản `letan`, `bacsi`, `quanly` cho khách tự trải nghiệm (nếu đồng ý), nhắc khách không nhập dữ liệu bệnh nhân thật
