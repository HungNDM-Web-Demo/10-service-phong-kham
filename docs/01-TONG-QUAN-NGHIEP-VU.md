# Tổng quan nghiệp vụ — Quản lý Phòng khám

> Mô tả demo này cho ai, giải quyết vấn đề gì. Cập nhật khi phạm vi thay đổi.

---

## 1. Thông tin chung

| Mục | Nội dung |
| :--- | :--- |
| Tên demo | Quản lý Phòng khám |
| Mã dự án | `service-phong-kham` |
| Ngành / loại khách hàng | Phòng khám tư, nha khoa |
| Loại sản phẩm | Web quản lý + trang đặt lịch khám |
| Ý tưởng gốc | 3.2 · Phòng khám / nha khoa (`ZDOCS/02-KE-HOACH/DANH-SACH-Y-TUONG.md`) |
| Người phụ trách | |
| Trạng thái | Mới tạo từ khuôn mẫu |

## 2. Vấn đề của khách hàng

- Bệnh nhân chờ lâu, xếp số thủ công
- Hồ sơ giấy, khó tra lịch sử khám
- Quên nhắc tái khám nên mất khách
- Kế hoạch điều trị nhiều buổi (nha khoa) khó theo dõi

## 3. Giải pháp demo thể hiện

- Đặt lịch khám online theo bác sĩ
- Tiếp đón, hàng chờ
- Hồ sơ bệnh nhân, lịch sử khám
- Phiếu khám, chẩn đoán, chỉ định, đơn thuốc
- Kế hoạch điều trị nhiều buổi, thu phí, nhắc tái khám

## 4. Vai trò người dùng

| Vai trò | Mã | Dùng trên | Làm được gì |
| :--- | :--- | :--- | :--- |
| Bệnh nhân | — | Điện thoại | Đặt lịch khám |
| Quản trị viên | ADMIN | Desktop | Toàn quyền |
| Quản lý | MANAGER | Desktop | Dịch vụ, bác sĩ, báo cáo |
| Lễ tân | RECEPTIONIST | Desktop | Tiếp đón, hàng chờ, thu phí |
| Bác sĩ | DOCTOR | Desktop, tablet | Khám, kê đơn, kế hoạch điều trị |

## 5. Phân hệ và chức năng

| Area | Chức năng | Màn hình (route FE dự kiến) | Ưu tiên |
| :--- | :--- | :--- | :---: |
| `System` | Đăng nhập, tài khoản, vai trò, cài đặt | Có sẵn | — |
| `Booking` | Lịch khám theo bác sĩ | `/appointments` | P1 |
| `Booking` | Đặt lịch online | `/dat-lich` | P1 |
| `Clinic` | Tiếp đón, hàng chờ | `/queue` | P1 |
| `Clinic` | Hồ sơ bệnh nhân | `/patients` | P1 |
| `Clinic` | Phiếu khám, đơn thuốc | `/visits/[id]` | P1 |
| `Clinic` | Kế hoạch điều trị | `/treatment-plans` | P2 |
| `Finance` | Thu phí | `/invoices` | P1 |
| `Clinic` | Nhắc tái khám | `/follow-ups` | P2 |
| `Clinic` | Báo cáo | `/reports` | P2 |

P1 = bắt buộc có để demo · P2 = nên có · P3 = làm thêm nếu còn thời gian.

## 6. Luồng nghiệp vụ chính

```mermaid
flowchart LR
    S0["Bệnh nhân đặt lịch"] --> S1["Lễ tân tiếp đón"] --> S2["Bác sĩ khám, kê đơn"] --> S3["Thu phí"] --> S4["Hẹn tái khám"]
```

## 7. Phạm vi

**Có trong demo:**

- Lịch khám, hàng chờ, hồ sơ, phiếu khám, thu phí

**Không làm (nói rõ với khách nếu được hỏi):**

- Kết nối bảo hiểm y tế
- Bệnh án điện tử theo chuẩn Bộ Y tế
- Kết nối máy móc chẩn đoán
- Các kết nối bên ngoài khác chỉ giả lập

## 8. Dữ liệu mẫu cần chuẩn bị

| Dữ liệu | Số lượng | Ghi chú |
| :--- | :---: | :--- |
| Bác sĩ | 5 |  |
| Dịch vụ khám | 25 |  |
| Thuốc | 80 |  |
| Bệnh nhân | 300 | Thông tin giả, không dùng dữ liệu thật |
| Lượt khám | ~1.500 | 90 ngày |
