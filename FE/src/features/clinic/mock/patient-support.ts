import { auditCreate } from '@/mock/mock-audit'
import { newId } from '@/mock/mock-helpers'
import type { NewPatientInput, SavePatientInput } from '@/types/clinic'
import { digitsOnly } from '../lib/rules'
import { hasErrors, validatePatient } from '../lib/validation'
import { conflictError, errorCodes, fieldError, fieldErrors } from './errors'
import { patientBrief, type PatientStats } from './mappers'
import type { PatientRecord } from './records'
import { appointmentsDb, invoicesDb, nextPatientCode, nowIso, patientsDb, today, visitsDb } from './store'

/** Tạo hồ sơ bệnh nhân dùng chung (thêm nhanh khi tạo lịch, xác nhận lịch online, tiếp đón, màn Bệnh nhân), giống BE `ClinicPatients`. */

export const trimOrNull = (value: string | null | undefined) => (value?.trim() ? value.trim() : null)
export const normalizeName = (value: string) => value.split(' ').filter(Boolean).join(' ')

/** BR-14, BR-15, UC-07 E2, E3: trùng số điện thoại và ngày sinh thì 409 `TrungHoSo` trừ khi `force`. */
export function createPatient(input: SavePatientInput | NewPatientInput, prefix = ''): PatientRecord {
  const e = validatePatient(input, prefix)
  if (hasErrors(e)) throw fieldErrors(e)
  if (input.birthDate > today()) throw fieldError(prefix + 'birthDate', 'Ngày sinh không được sau hôm nay')
  const phone = digitsOnly(input.phone)
  if (!input.force) {
    const exact = patientsDb
      .filter((p) => p.phone === phone && p.birthDate === input.birthDate)
      .sort((a, b) => (a.code < b.code ? -1 : 1))
    if (exact.length > 0)
      throw conflictError(errorCodes.trungHoSo, 'Có thể trùng hồ sơ', undefined, { candidates: exact.map((p) => patientBrief(p, today())) })
  }
  const full = input as SavePatientInput
  const record: PatientRecord = {
    id: newId(),
    code: nextPatientCode(),
    fullName: normalizeName(input.fullName),
    birthDate: input.birthDate,
    gender: input.gender,
    phone,
    address: trimOrNull(full.address),
    contactPerson: trimOrNull(full.contactPerson),
    allergies: trimOrNull(full.allergies),
    medicalHistory: trimOrNull(full.medicalHistory),
    note: trimOrNull(full.note),
    createdAt: nowIso(),
  }
  patientsDb.insert(record)
  auditCreate('Patient', record)
  return record
}

/** Chỉ số bệnh nhân tính khi đọc. */
export function patientStats(ids: string[]): Map<string, PatientStats> {
  const set = new Set(ids)
  const visits = visitsDb.filter((v) => set.has(v.patientId))
  const invoices = invoicesDb.filter((i) => set.has(i.patientId) && (i.status === 'ChoThu' || i.status === 'ThuMotPhan'))
  const withAppointments = new Set(appointmentsDb.filter((a) => a.patientId !== null && set.has(a.patientId)).map((a) => a.patientId))
  const result = new Map<string, PatientStats>()
  for (const id of ids) {
    const mine = visits.filter((v) => v.patientId === id)
    const live = mine.filter((v) => v.status !== 'BoVe')
    result.set(id, {
      lastVisitAt: live.reduce<string | null>((m, v) => (!m || v.checkedInAt > m ? v.checkedInAt : m), null),
      visitCount: live.length,
      debt: invoices.filter((i) => i.patientId === id).reduce((s, i) => s + i.total - i.paid, 0),
      hasData: mine.length > 0 || withAppointments.has(id),
    })
  }
  return result
}
