import type { AppointmentDetailDto, NewPatientInput } from '@/types/clinic'
import type { PatientChoice } from '@/features/clinic/components/PatientPicker'
import { validatePatient, type Errors } from '@/features/clinic/lib/validation'

/** Hồ sơ bệnh nhân chọn trong PatientPicker → trường gửi API (`patientId | newPatient`, 07 §4.3). */

export const emptyChoice: PatientChoice = { patient: null, newPatient: null }

export function validateChoice(choice: PatientChoice): Errors {
  if (choice.patient) return {}
  if (choice.newPatient) return validatePatient(choice.newPatient, 'newPatient.')
  return { patientId: 'Chọn hồ sơ có sẵn hoặc thêm hồ sơ mới' }
}

export function choiceInput(choice: PatientChoice): { patientId: string | null; newPatient: NewPatientInput | null } {
  if (choice.patient) return { patientId: choice.patient.id, newPatient: null }
  if (!choice.newPatient) return { patientId: null, newPatient: null }
  const p = choice.newPatient
  return { patientId: null, newPatient: { ...p, fullName: p.fullName.trim(), phone: p.phone.replace(/\D/g, '') } }
}

/** Bật "Vẫn tạo mới" sau khi máy chủ báo trùng hồ sơ (409 TrungHoSo, BR-14) */
export const forceChoice = (choice: PatientChoice): PatientChoice =>
  choice.newPatient ? { patient: null, newPatient: { ...choice.newPatient, force: true } } : choice

/** Thông tin khách đặt online → gợi ý khi tạo hồ sơ mới; khách chỉ khai năm sinh nên ngày sinh tạm là 01/01 */
export function guestDefaults(a: AppointmentDetailDto): Partial<NewPatientInput> {
  return {
    fullName: a.guestName ?? '',
    phone: a.guestPhone ?? '',
    birthDate: a.guestBirthYear ? `${a.guestBirthYear}-01-01` : '',
    gender: a.guestGender ?? 'Nam',
  }
}
