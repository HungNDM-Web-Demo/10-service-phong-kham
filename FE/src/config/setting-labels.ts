/**
 * Nhãn, gợi ý và quy tắc kiểm tra cho khóa cài đặt riêng của dự án (project.json → settings;
 * docs/06-THIET-KE-CSDL.md §3). Nhóm "Phòng khám" (Clinic.*) in ở đầu đơn thuốc, phiếu thu, trang đặt lịch, tin nhắn
 * và mã QR chuyển khoản. Mock gọi `validateProjectSettings` khi lưu, BE `UpdateSettingsRequestValidator` kiểm cùng quy tắc.
 */
export const settingExtraLabels: Record<string, { label: string; hint?: string }> = {
  'Clinic.Name': { label: 'Tên phòng khám', hint: 'In đầu bản in, trang đặt lịch, tin nhắn' },
  'Clinic.Address': { label: 'Địa chỉ', hint: 'In dưới tên phòng khám' },
  'Clinic.Hotline': { label: 'Hotline', hint: 'Ghi trong tin nhắc tái khám và trang đặt lịch' },
  'Clinic.WorkingHours': { label: 'Giờ làm việc', hint: 'Chữ hiển thị trên trang đặt lịch' },
  'Clinic.BankBin': { label: 'Mã ngân hàng (BIN)', hint: '6 chữ số theo VietQR, vd 970418 là BIDV' },
  'Clinic.BankAccount': { label: 'Số tài khoản nhận', hint: 'Dùng tạo mã QR khi thu tiền (bản demo để số giả)' },
  'Clinic.BankAccountName': { label: 'Tên chủ tài khoản', hint: 'Chữ in hoa không dấu' },
  'Clinic.DisplayCode': { label: 'Mã màn hình sảnh', hint: 'Mở /queue/display?code=… trên TV ngoài sảnh; 4–32 chữ cái hoặc số' },
  'Clinic.FollowUpRemindDays': { label: 'Nhắc tái khám trước (ngày)', hint: '1, 2 hoặc 3 ngày trước ngày hẹn' },
  'Clinic.PriorityReasons': { label: 'Đối tượng ưu tiên', hint: 'Lễ tân bật ưu tiên tay, cách nhau dấu phẩy' },
}

/** Kiểm tra giá trị cài đặt riêng của dự án; trả về { [chỉ số trong items]: thông báo lỗi }. */
export function validateProjectSettings(
  items: { key: string; value?: string | null }[],
  current: Record<string, string>
): Record<number, string> {
  void current
  const errors: Record<number, string> = {}
  items.forEach(({ key, value }, i) => {
    const v = (value ?? '').trim()
    switch (key) {
      case 'Clinic.Name':
        if (!v) errors[i] = 'Nhập tên phòng khám'
        break
      case 'Clinic.BankBin':
        if (v && !/^\d{6}$/.test(v)) errors[i] = 'Mã ngân hàng gồm 6 chữ số'
        break
      case 'Clinic.BankAccount':
        if (v && !/^\d{6,19}$/.test(v)) errors[i] = 'Số tài khoản gồm 6 đến 19 chữ số'
        break
      case 'Clinic.DisplayCode':
        if (!/^[A-Za-z0-9]{4,32}$/.test(v)) errors[i] = 'Mã màn hình sảnh gồm 4 đến 32 chữ cái hoặc số'
        break
      case 'Clinic.FollowUpRemindDays':
        if (!['1', '2', '3'].includes(v)) errors[i] = 'Số ngày nhắc trước là 1, 2 hoặc 3'
        break
    }
  })
  return errors
}
