import { permissions } from '@/config/permissions'
import { mockDelay } from '@/lib/data-source'
import { auditDelete, auditUpdate } from '@/mock/mock-audit'
import { requirePermission } from '@/mock/mock-auth'
import { listQuery } from '@/mock/mock-helpers'
import type { PaginatedResult } from '@/types/api'
import type { DuplicateQuery, DuplicateResultDto, PatientDetailDto, PatientDto, PatientQuery, SavePatientInput } from '@/types/clinic'
import { digitsOnly, isPhone } from '../lib/rules'
import { hasErrors, validatePatient } from '../lib/validation'
import { fieldError, fieldErrors, inUse, notFoundError } from './errors'
import { appointmentBrief, isActiveAppointment, patientBrief, patientDto } from './mappers'
import { createPatient, normalizeName, patientStats, trimOrNull } from './patient-support'
import type { PatientRecord } from './records'
import { appointmentsDb, doctorsDb, ensureFresh, invoicesDb, patientsDb, plansDb, today, visitsDb } from './store'

/** Handler mock hồ sơ bệnh nhân (07 §4.7), giống BE `PatientService`. */

export const patientMock = {
  async getList(query: PatientQuery): Promise<PaginatedResult<PatientDto>> {
    await mockDelay()
    requirePermission(permissions.patients.view)
    ensureFresh()
    let list = patientsDb.all()
    if (query.hasDebt) {
      const debtors = new Set(invoicesDb.filter((i) => i.status === 'ChoThu' || i.status === 'ThuMotPhan').map((i) => i.patientId))
      list = list.filter((p) => debtors.has(p.id))
    }
    // Số điện thoại gõ kèm khoảng trắng ("0912 345 678") vẫn tìm được
    const digits = digitsOnly(query.search ?? '')
    const search = /^\d{3,}$/.test(digits) ? digits : query.search
    const page = listQuery<PatientRecord>(list, { ...query, search }, { searchFields: ['code', 'fullName', 'phone'], defaultSortBy: 'code', defaultSortDir: 'desc' })
    const stats = patientStats(page.items.map((p) => p.id))
    const day = today()
    return { ...page, items: page.items.map((p) => patientDto(p, day, stats.get(p.id))) }
  },

  async get(id: string): Promise<PatientDetailDto> {
    await mockDelay()
    requirePermission(permissions.patients.view)
    ensureFresh()
    const p = patientsDb.get(id)
    if (!p) throw notFoundError('Không tìm thấy bệnh nhân.')
    const day = today()
    return {
      patient: patientDto(p, day, patientStats([id]).get(id)),
      upcomingAppointments: appointmentsDb
        .filter((a) => a.patientId === id && a.date >= day && isActiveAppointment(a.status))
        .sort((a, b) => (a.startAt < b.startAt ? -1 : 1))
        .map((a) => appointmentBrief(a, p, doctorsDb.get(a.doctorId))),
      activePlanCount: plansDb.count((x) => x.patientId === id && (x.status === 'DangDieuTri' || x.status === 'DaBaoGia' || x.status === 'ChoDuyet')),
      debtInvoiceCount: invoicesDb.count((i) => i.patientId === id && (i.status === 'ChoThu' || i.status === 'ThuMotPhan')),
    }
  },

  async findDuplicates(query: DuplicateQuery): Promise<DuplicateResultDto> {
    await mockDelay(60, 120)
    requirePermission(permissions.patients.view, permissions.patients.create)
    ensureFresh()
    const phone = digitsOnly(query.phone ?? '')
    if (!isPhone(phone)) return { exact: [], samePhone: [] }
    const day = today()
    const same = patientsDb.filter((p) => p.phone === phone && p.id !== query.excludeId).sort((a, b) => (a.code < b.code ? -1 : 1))
    const hasBirth = !!query.birthDate
    return {
      exact: hasBirth ? same.filter((p) => p.birthDate === query.birthDate).map((p) => patientBrief(p, day)) : [],
      samePhone: same.filter((p) => !hasBirth || p.birthDate !== query.birthDate).map((p) => patientBrief(p, day)),
    }
  },

  async create(input: SavePatientInput): Promise<PatientDto> {
    await mockDelay()
    requirePermission(permissions.patients.create)
    ensureFresh()
    const record = createPatient(input)
    return patientDto(record, today(), { lastVisitAt: null, visitCount: 0, debt: 0, hasData: false })
  },

  async update(id: string, input: SavePatientInput): Promise<PatientDto> {
    await mockDelay()
    requirePermission(permissions.patients.update)
    ensureFresh()
    const before = patientsDb.get(id)
    if (!before) throw notFoundError('Không tìm thấy bệnh nhân.')
    const e = validatePatient(input)
    if (hasErrors(e)) throw fieldErrors(e)
    if (input.birthDate > today()) throw fieldError('birthDate', 'Ngày sinh không được sau hôm nay')
    const after = patientsDb.update(id, {
      fullName: normalizeName(input.fullName),
      birthDate: input.birthDate,
      gender: input.gender,
      phone: digitsOnly(input.phone),
      address: trimOrNull(input.address),
      contactPerson: trimOrNull(input.contactPerson),
      allergies: trimOrNull(input.allergies),
      medicalHistory: trimOrNull(input.medicalHistory),
      note: trimOrNull(input.note),
    })!
    auditUpdate('Patient', before, after)
    return patientDto(after, today(), patientStats([id]).get(id))
  },

  async remove(id: string): Promise<void> {
    await mockDelay()
    requirePermission(permissions.patients.update)
    const p = patientsDb.get(id)
    if (!p) throw notFoundError('Không tìm thấy bệnh nhân.')
    if (visitsDb.some((v) => v.patientId === id) || appointmentsDb.some((a) => a.patientId === id) || plansDb.some((x) => x.patientId === id))
      throw inUse('Bệnh nhân đã có lượt khám hoặc lịch hẹn, không xóa được (BR-15).')
    patientsDb.remove(id)
    auditDelete('Patient', p)
  },
}
