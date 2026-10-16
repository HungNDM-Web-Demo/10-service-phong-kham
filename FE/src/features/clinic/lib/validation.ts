import type {
  CancelAppointmentInput,
  NewPatientInput,
  SaveDoctorInput,
  SaveMedicineInput,
  SavePatientInput,
  SaveScheduleInput,
  SaveServiceInput,
  SaveTreatmentPlanInput,
  SaveVisitInput,
} from '@/types/clinic'
import { clinicRules, digitsOnly, isValidTooth, phonePattern } from './rules'
import { parseHhmm } from './vn-time'

/**
 * Kiểm tra dữ liệu nhập, cùng quy tắc và câu chữ với BE `Application/Validators/Clinic/ClinicValidators.cs`.
 * Dùng cho mock (trả lỗi theo trường như BE) và form (báo lỗi trước khi gửi).
 */

export type Errors = Record<string, string>

const codeRe = /^[A-Z0-9]{2,10}$/
const icdRe = /^[A-Z][0-9]{2}(\.[0-9A-Z]{1,2})?$/
const dateRe = /^\d{4}-\d{2}-\d{2}$/
const hhmmRe = /^([01]\d|2[0-3]):[0-5]\d$/

export const phoneError = (value: string | null | undefined): string | null =>
  !value?.trim() ? 'Nhập số điện thoại' : phonePattern.test(digitsOnly(value)) ? null : 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09'

const catalogCode = (value: string, label: string): string | null =>
  !value?.trim() ? `Nhập ${label}` : codeRe.test(value.trim()) ? null : `${label[0].toUpperCase()}${label.slice(1)} gồm 2–10 chữ in hoa không dấu hoặc số`

const isDate = (value: string | null | undefined) => !!value && dateRe.test(value) && !Number.isNaN(Date.parse(value))

function put(e: Errors, key: string, message: string | null | undefined | false) {
  if (message && !e[key]) e[key] = message
}

export function validateService(input: SaveServiceInput): Errors {
  const e: Errors = {}
  put(e, 'code', catalogCode(input.code, 'mã dịch vụ'))
  put(e, 'name', !input.name?.trim() ? 'Nhập tên dịch vụ' : input.name.length > 150 && 'Tên dịch vụ tối đa 150 ký tự')
  put(e, 'specialtyId', input.group === 'Kham' && !input.specialtyId && 'Chọn chuyên khoa')
  put(e, 'price', input.price < 0 ? 'Giá không được âm' : input.price % 1000 !== 0 && 'Giá là bội số 1.000 ₫')
  return e
}

export function validateMedicine(input: SaveMedicineInput): Errors {
  const e: Errors = {}
  put(e, 'code', catalogCode(input.code, 'mã thuốc'))
  put(e, 'name', !input.name?.trim() ? 'Nhập tên thuốc' : input.name.length > 150 && 'Tên thuốc tối đa 150 ký tự')
  put(e, 'activeIngredient', !input.activeIngredient?.trim() ? 'Nhập hoạt chất' : input.activeIngredient.length > 150 && 'Hoạt chất tối đa 150 ký tự')
  put(e, 'unit', !input.unit?.trim() ? 'Nhập đơn vị tính' : input.unit.length > 20 && 'Đơn vị tính tối đa 20 ký tự')
  put(e, 'price', !(input.price > 0) ? 'Nhập giá lớn hơn 0' : input.price % 100 !== 0 && 'Giá thuốc là bội số 100 ₫')
  return e
}

export function validateDiagnosis(input: { icdCode: string; name: string }): Errors {
  const e: Errors = {}
  put(e, 'icdCode', !input.icdCode?.trim() ? 'Nhập mã ICD-10' : !icdRe.test(input.icdCode.trim().toUpperCase()) && 'Mã ICD-10 dạng K02.1')
  put(e, 'name', !input.name?.trim() ? 'Nhập tên chẩn đoán' : input.name.length > 200 && 'Tên chẩn đoán tối đa 200 ký tự')
  return e
}

export function validateDoctor(input: SaveDoctorInput): Errors {
  const e: Errors = {}
  put(e, 'code', catalogCode(input.code, 'mã bác sĩ'))
  put(e, 'fullName', !input.fullName?.trim() ? 'Nhập họ tên' : input.fullName.length > 100 && 'Họ tên tối đa 100 ký tự')
  put(e, 'specialtyId', !input.specialtyId && 'Chọn chuyên khoa')
  put(e, 'room', !input.room?.trim() ? 'Nhập phòng khám' : input.room.length > 20 && 'Phòng tối đa 20 ký tự')
  put(e, 'bio', (input.bio ?? '').length > 500 && 'Giới thiệu tối đa 500 ký tự')
  return e
}

export function validateSchedule(input: SaveScheduleInput): Errors {
  const e: Errors = {}
  put(e, 'slotMinutes', !(clinicRules.slotLengths as readonly number[]).includes(input.slotMinutes) && 'Độ dài khung là 15, 20 hoặc 30 phút')
  put(e, 'maxPerSlot', !(input.maxPerSlot >= 1 && input.maxPerSlot <= 10) && 'Số lịch tối đa mỗi khung từ 1 đến 10')
  const parsed: { day: number; s: number; e: number; index: number }[] = []
  input.hours.forEach((h, index) => {
    const okStart = hhmmRe.test(h.startTime)
    const okEnd = hhmmRe.test(h.endTime)
    put(e, `hours[${index}].startTime`, !okStart && 'Giờ bắt đầu dạng HH:mm')
    put(e, `hours[${index}].endTime`, !okEnd ? 'Giờ kết thúc dạng HH:mm' : okStart && parseHhmm(h.endTime) <= parseHhmm(h.startTime) && 'Giờ kết thúc phải sau giờ bắt đầu')
    if (okStart && okEnd && parseHhmm(h.endTime) > parseHhmm(h.startTime)) parsed.push({ day: h.dayOfWeek, s: parseHhmm(h.startTime), e: parseHhmm(h.endTime), index })
  })
  for (const day of new Set(parsed.map((p) => p.day))) {
    const list = parsed.filter((p) => p.day === day).sort((a, b) => a.s - b.s)
    for (let n = 1; n < list.length; n++)
      if (list[n].s < list[n - 1].e) put(e, `hours[${list[n].index}].startTime`, 'Hai khoảng làm việc trong cùng thứ bị chồng nhau')
  }
  return e
}

export function validatePatient(input: SavePatientInput | NewPatientInput, prefix = ''): Errors {
  const e: Errors = {}
  put(e, prefix + 'fullName', !input.fullName?.trim() ? 'Nhập họ tên' : input.fullName.length > 100 && 'Họ tên tối đa 100 ký tự')
  put(e, prefix + 'birthDate', !input.birthDate ? 'Chọn ngày sinh' : !isDate(input.birthDate) && 'Ngày sinh không hợp lệ')
  put(e, prefix + 'phone', phoneError(input.phone))
  const full = input as SavePatientInput
  put(e, prefix + 'address', (full.address ?? '').length > 250 && 'Địa chỉ tối đa 250 ký tự')
  put(e, prefix + 'allergies', (full.allergies ?? '').length > 500 && 'Tiền sử dị ứng tối đa 500 ký tự')
  put(e, prefix + 'medicalHistory', (full.medicalHistory ?? '').length > 1000 && 'Tiền sử bệnh tối đa 1000 ký tự')
  put(e, prefix + 'note', (full.note ?? '').length > 500 && 'Ghi chú tối đa 500 ký tự')
  return e
}

export function validateCancel(input: CancelAppointmentInput): Errors {
  const e: Errors = {}
  put(e, 'reason', !input.reason && 'Chọn lý do hủy')
  put(e, 'note', input.reason === 'Khac' && !input.note?.trim() ? 'Nhập ghi chú cho lý do khác' : (input.note ?? '').length > 300 && 'Ghi chú tối đa 300 ký tự')
  return e
}

/** BR-16, BR-18, 07 §3.6. */
export function validateVisit(input: SaveVisitInput): Errors {
  const e: Errors = {}
  const range = (key: keyof SaveVisitInput, min: number, max: number, message: string) => {
    const v = input[key] as number | null
    if (v !== null && v !== undefined && (Number.isNaN(v) || v < min || v > max)) put(e, key, message)
  }
  range('temperature', 34, 42, 'Nhiệt độ từ 34,0 đến 42,0 °C')
  range('pulse', 30, 220, 'Mạch từ 30 đến 220 lần/phút')
  range('bpSystolic', 60, 260, 'Huyết áp tâm thu từ 60 đến 260 mmHg')
  range('bpDiastolic', 30, 160, 'Huyết áp tâm trương từ 30 đến 160 mmHg')
  if (input.bpDiastolic !== null && input.bpSystolic !== null && input.bpDiastolic >= input.bpSystolic)
    put(e, 'bpDiastolic', 'Huyết áp tâm trương phải nhỏ hơn tâm thu')
  if (input.bpDiastolic !== null && input.bpSystolic === null) put(e, 'bpSystolic', 'Nhập cả huyết áp tâm thu')
  if (input.bpSystolic !== null && input.bpDiastolic === null) put(e, 'bpDiastolic', 'Nhập cả huyết áp tâm trương')
  range('weight', 1, 250, 'Cân nặng từ 1 đến 250 kg')
  range('height', 30, 250, 'Chiều cao từ 30 đến 250 cm')
  put(e, 'symptoms', (input.symptoms ?? '').length > 2000 && 'Triệu chứng tối đa 2000 ký tự')
  put(e, 'examination', (input.examination ?? '').length > 2000 && 'Khám lâm sàng tối đa 2000 ký tự')
  put(e, 'advice', (input.advice ?? '').length > 1000 && 'Lời dặn tối đa 1000 ký tự')
  put(e, 'followUpNote', (input.followUpNote ?? '').length > 300 && 'Ghi chú hẹn tối đa 300 ký tự')
  if (input.followUpDate) put(e, 'followUpDate', !isDate(input.followUpDate) && 'Ngày hẹn tái khám không hợp lệ')
  if (input.diagnoses.filter((d) => d.kind === 'Chinh').length > 1) put(e, 'diagnoses', 'Chỉ có một chẩn đoán chính')
  if (input.diagnoses.filter((d) => d.kind === 'Phu').length > clinicRules.maxSecondaryDiagnoses)
    put(e, 'diagnoses', `Tối đa ${clinicRules.maxSecondaryDiagnoses} chẩn đoán phụ`)
  input.diagnoses.forEach((d, n) => put(e, `diagnoses[${n}].name`, !d.name?.trim() ? 'Nhập tên chẩn đoán' : d.name.length > 200 && 'Tên chẩn đoán tối đa 200 ký tự'))
  input.orders.forEach((o, n) => {
    put(e, `orders[${n}].serviceId`, !o.serviceId && 'Chọn dịch vụ')
    put(e, `orders[${n}].quantity`, !(o.quantity >= 1 && o.quantity <= clinicRules.maxOrderQuantity) && `Số lượng từ 1 đến ${clinicRules.maxOrderQuantity}`)
    put(e, `orders[${n}].result`, (o.result ?? '').length > 2000 && 'Kết quả tối đa 2000 ký tự')
    put(e, `orders[${n}].imageUrls`, (o.imageUrls?.length ?? 0) > clinicRules.maxImages && `Tối đa ${clinicRules.maxImages} ảnh`)
    if (o.teeth) {
      put(e, `orders[${n}].teeth`, !o.teeth.every(isValidTooth) ? 'Số răng không hợp lệ (11–48, 51–85)' : new Set(o.teeth).size !== o.teeth.length && 'Số răng bị trùng')
    }
  })
  if (new Set(input.prescription.map((l) => l.medicineId)).size !== input.prescription.length) put(e, 'prescription', 'Mỗi thuốc chỉ kê một dòng')
  input.prescription.forEach((l, n) => {
    put(e, `prescription[${n}].medicineId`, !l.medicineId && 'Chọn thuốc')
    put(e, `prescription[${n}].quantity`, !(Number.isInteger(l.quantity) && l.quantity >= 1 && l.quantity <= clinicRules.maxMedicineQuantity) && `Số lượng từ 1 đến ${clinicRules.maxMedicineQuantity}`)
    put(e, `prescription[${n}].days`, !(Number.isInteger(l.days) && l.days >= 1 && l.days <= clinicRules.maxMedicineDays) && `Số ngày dùng từ 1 đến ${clinicRules.maxMedicineDays}`)
    put(e, `prescription[${n}].usage`, !l.usage?.trim() ? 'Nhập cách dùng' : l.usage.length > 200 && 'Cách dùng tối đa 200 ký tự')
  })
  return e
}

/** UC-10, BR-22. */
export function validatePlan(input: SaveTreatmentPlanInput): Errors {
  const e: Errors = {}
  put(e, 'patientId', !input.patientId && 'Chọn bệnh nhân')
  put(e, 'plannedSessions', !(input.plannedSessions >= 1 && input.plannedSessions <= 50) && 'Số buổi dự kiến từ 1 đến 50')
  put(e, 'note', (input.note ?? '').length > 500 && 'Ghi chú tối đa 500 ký tự')
  put(e, 'items', input.items.length === 0 && 'Thêm ít nhất một hạng mục')
  input.items.forEach((i, n) => {
    put(e, `items[${n}].serviceId`, !i.serviceId && 'Chọn dịch vụ')
    put(e, `items[${n}].quantity`, !(i.quantity >= 1 && i.quantity <= clinicRules.maxOrderQuantity) && `Số lượng từ 1 đến ${clinicRules.maxOrderQuantity}`)
    if (i.teeth) put(e, `items[${n}].teeth`, !i.teeth.every(isValidTooth) ? 'Số răng không hợp lệ (11–48, 51–85)' : new Set(i.teeth).size !== i.teeth.length && 'Số răng bị trùng')
    if (i.discountType === 'PhanTram')
      put(e, `items[${n}].discountValue`, !(Number.isInteger(i.discountValue) && i.discountValue >= 0 && i.discountValue <= clinicRules.maxItemDiscountPercent) && `Giảm phần trăm là số nguyên từ 0 đến ${clinicRules.maxItemDiscountPercent}`)
    if (i.discountType === 'SoTien')
      put(e, `items[${n}].discountValue`, i.discountValue < 0 ? 'Giảm giá không được âm' : i.discountValue % 1000 !== 0 && 'Giảm giá là bội số 1.000 ₫')
  })
  return e
}

export const hasErrors = (e: Errors) => Object.keys(e).length > 0
