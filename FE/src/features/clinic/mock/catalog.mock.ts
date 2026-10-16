import { permissions } from '@/config/permissions'
import { mockDelay } from '@/lib/data-source'
import { normalizeVi } from '@/lib/normalize'
import { auditCreate, auditDelete, auditUpdate } from '@/mock/mock-audit'
import { requirePermission, requireSession } from '@/mock/mock-auth'
import { listQuery, newId } from '@/mock/mock-helpers'
import type { PaginatedResult } from '@/types/api'
import type {
  ClinicProfileDto,
  DiagnosisQuery,
  DiagnosisTemplateDto,
  MedicineDto,
  MedicineQuery,
  NextCodeDto,
  SaveDiagnosisInput,
  SaveMedicineInput,
  SaveServiceInput,
  ServiceDto,
  ServiceGroup,
  ServiceQuery,
  SpecialtyDto,
} from '@/types/clinic'
import { hasErrors, validateDiagnosis, validateMedicine, validateService } from '../lib/validation'
import { conflictError, fieldErrors, inUse, invalidState, notFoundError } from './errors'
import type { DiagnosisRecord, MedicineRecord, ServiceRecord } from './records'
import {
  appointmentsDb,
  diagnosesDb,
  ensureFresh,
  medicinesDb,
  nextCatalogCode,
  plansDb,
  profile,
  servicesDb,
  specialtiesDb,
  visitsDb,
} from './store'

/** Handler mock danh mục: chuyên khoa, dịch vụ, thuốc, chẩn đoán mẫu (07 §4.1). */

const matches = (text: string, term: string | undefined) => !term?.trim() || normalizeVi(text).includes(normalizeVi(term))

function serviceDtos(list: ServiceRecord[]): ServiceDto[] {
  const used = new Set<string>()
  for (const v of visitsDb.all()) for (const o of v.orders) used.add(o.serviceId)
  for (const p of plansDb.all()) for (const i of p.items) used.add(i.serviceId)
  for (const a of appointmentsDb.all()) if (a.serviceId) used.add(a.serviceId)
  const specs = specialtiesDb.all()
  for (const s of specs) if (s.examServiceId) used.add(s.examServiceId)
  const groupOrder: Record<ServiceGroup, number> = { Kham: 0, ThuThuat: 1, CanLamSang: 2 }
  return [...list]
    .sort((a, b) => groupOrder[a.group] - groupOrder[b.group] || (a.code < b.code ? -1 : 1))
    .map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      group: s.group,
      specialtyId: s.specialtyId,
      specialtyName: specs.find((x) => x.id === s.specialtyId)?.name ?? null,
      unit: s.unit,
      price: s.price,
      requiresTooth: s.requiresTooth,
      isActive: s.isActive,
      isUsed: used.has(s.id),
    }))
}

const medicineDto = (m: MedicineRecord, used: boolean): MedicineDto => ({
  id: m.id,
  code: m.code,
  name: m.name,
  activeIngredient: m.activeIngredient,
  strength: m.strength,
  dosageForm: m.dosageForm,
  unit: m.unit,
  price: m.price,
  isActive: m.isActive,
  isUsed: used,
})

function usedMedicines(): Set<string> {
  const used = new Set<string>()
  for (const v of visitsDb.all()) for (const l of v.prescription) used.add(l.medicineId)
  return used
}

function diagnosisDtos(list: DiagnosisRecord[]): DiagnosisTemplateDto[] {
  const used = new Set<string>()
  for (const v of visitsDb.all()) for (const d of v.diagnoses) if (d.icdCode) used.add(d.icdCode)
  const specs = specialtiesDb.all()
  return [...list]
    .sort((a, b) => (a.icdCode < b.icdCode ? -1 : 1))
    .map((t) => ({
      id: t.id,
      icdCode: t.icdCode,
      name: t.name,
      specialtyId: t.specialtyId,
      specialtyName: specs.find((s) => s.id === t.specialtyId)?.name ?? null,
      isActive: t.isActive,
      isUsed: used.has(t.icdCode),
    }))
}

const servicePrefix = (group: ServiceGroup) => (group === 'Kham' ? 'KB' : group === 'ThuThuat' ? 'NK' : 'CLS')

export const catalogMock = {
  async getSpecialties(): Promise<SpecialtyDto[]> {
    await mockDelay(60, 120)
    requireSession()
    ensureFresh()
    const services = servicesDb.all()
    return specialtiesDb
      .all()
      .sort((a, b) => a.sortOrder - b.sortOrder || (a.code < b.code ? -1 : 1))
      .map((s) => {
        const exam = services.find((x) => x.id === s.examServiceId)
        return {
          id: s.id,
          code: s.code,
          name: s.name,
          examServiceId: s.examServiceId,
          examServiceName: exam?.name ?? null,
          examFee: exam?.price ?? 0,
          defaultMaxPerSlot: s.defaultMaxPerSlot,
        }
      })
  },

  async getServices(query: ServiceQuery): Promise<ServiceDto[]> {
    await mockDelay()
    requirePermission(permissions.services.view)
    ensureFresh()
    const list = servicesDb.filter(
      (s) =>
        (!query.group || s.group === query.group) &&
        (!query.specialtyId || s.specialtyId === query.specialtyId) &&
        (query.active === undefined || s.isActive === query.active) &&
        (matches(s.code, query.search) || matches(s.name, query.search))
    )
    return serviceDtos(list)
  },

  async getServiceOptions(): Promise<ServiceDto[]> {
    await mockDelay(60, 120)
    requireSession()
    ensureFresh()
    return serviceDtos(servicesDb.filter((s) => s.isActive))
  },

  async nextServiceCode(group: ServiceGroup): Promise<NextCodeDto> {
    await mockDelay(60, 120)
    requirePermission(permissions.services.create)
    const prefix = servicePrefix(group)
    return { code: nextCatalogCode(servicesDb.all().map((s) => s.code), prefix, 2) }
  },

  async createService(input: SaveServiceInput): Promise<ServiceDto> {
    await mockDelay()
    requirePermission(permissions.services.create)
    ensureFresh()
    const e = validateService(input)
    if (hasErrors(e)) throw fieldErrors(e)
    const code = input.code.trim().toUpperCase()
    if (servicesDb.some((s) => s.code === code)) throw conflictError(null, `Mã ${code} đã có.`, 'code')
    const record: ServiceRecord = {
      id: newId(),
      code,
      name: input.name.trim(),
      group: input.group,
      specialtyId: input.specialtyId,
      unit: input.unit,
      price: input.price,
      requiresTooth: input.group === 'ThuThuat' && input.requiresTooth,
      isActive: input.isActive,
    }
    servicesDb.insert(record)
    auditCreate('Service', record)
    return serviceDtos([record])[0]
  },

  async updateService(id: string, input: SaveServiceInput): Promise<ServiceDto> {
    await mockDelay()
    requirePermission(permissions.services.update)
    ensureFresh()
    const before = servicesDb.get(id)
    if (!before) throw notFoundError('Không tìm thấy dịch vụ.')
    const e = validateService(input)
    if (hasErrors(e)) throw fieldErrors(e)
    const code = input.code.trim().toUpperCase()
    if (servicesDb.some((s) => s.code === code && s.id !== id)) throw conflictError(null, `Mã ${code} đã có.`, 'code')
    const after = servicesDb.update(id, {
      code,
      name: input.name.trim(),
      group: input.group,
      specialtyId: input.specialtyId,
      unit: input.unit,
      price: input.price,
      requiresTooth: input.group === 'ThuThuat' && input.requiresTooth,
      isActive: input.isActive,
    })!
    auditUpdate('Service', before, after)
    return serviceDtos([after])[0]
  },

  async setServiceActive(id: string, isActive: boolean): Promise<ServiceDto> {
    await mockDelay()
    requirePermission(permissions.services.update)
    const before = servicesDb.get(id)
    if (!before) throw notFoundError('Không tìm thấy dịch vụ.')
    if (!isActive && specialtiesDb.some((s) => s.examServiceId === id)) throw invalidState('Dịch vụ đang là phí khám của chuyên khoa, không ngừng được.')
    const after = servicesDb.update(id, { isActive })!
    auditUpdate('Service', before, after)
    return serviceDtos([after])[0]
  },

  async deleteService(id: string): Promise<void> {
    await mockDelay()
    requirePermission(permissions.services.delete)
    const record = servicesDb.get(id)
    if (!record) throw notFoundError('Không tìm thấy dịch vụ.')
    if (serviceDtos([record])[0].isUsed) throw inUse('Dịch vụ đã dùng trong lượt khám, kế hoạch hoặc lịch hẹn. Hãy chọn "Ngừng" (BR-33).')
    servicesDb.remove(id)
    auditDelete('Service', record)
  },

  async getMedicines(query: MedicineQuery): Promise<PaginatedResult<MedicineDto>> {
    await mockDelay()
    requirePermission(permissions.medicines.view)
    ensureFresh()
    const used = usedMedicines()
    const list = medicinesDb.filter((m) => query.active === undefined || m.isActive === query.active)
    const page = listQuery<MedicineRecord>(list, query, {
      searchFields: ['code', 'name', 'activeIngredient'],
      defaultSortBy: 'code',
      defaultSortDir: 'asc',
    })
    return { ...page, items: page.items.map((m) => medicineDto(m, used.has(m.id))) }
  },

  async getMedicineOptions(): Promise<MedicineDto[]> {
    await mockDelay(60, 120)
    requireSession()
    ensureFresh()
    return medicinesDb
      .filter((m) => m.isActive)
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
      .map((m) => medicineDto(m, false))
  },

  async nextMedicineCode(): Promise<NextCodeDto> {
    await mockDelay(60, 120)
    requirePermission(permissions.medicines.create)
    return { code: nextCatalogCode(medicinesDb.all().map((m) => m.code), 'T', 3) }
  },

  async createMedicine(input: SaveMedicineInput): Promise<MedicineDto> {
    await mockDelay()
    requirePermission(permissions.medicines.create)
    const e = validateMedicine(input)
    if (hasErrors(e)) throw fieldErrors(e)
    const code = input.code.trim().toUpperCase()
    if (medicinesDb.some((m) => m.code === code)) throw conflictError(null, `Mã ${code} đã có.`, 'code')
    const record: MedicineRecord = {
      id: newId(),
      code,
      name: input.name.trim(),
      activeIngredient: input.activeIngredient.trim(),
      strength: input.strength?.trim() || null,
      dosageForm: input.dosageForm?.trim() || null,
      unit: input.unit.trim(),
      price: input.price,
      isActive: input.isActive,
    }
    medicinesDb.insert(record)
    auditCreate('Medicine', record)
    return medicineDto(record, false)
  },

  async updateMedicine(id: string, input: SaveMedicineInput): Promise<MedicineDto> {
    await mockDelay()
    requirePermission(permissions.medicines.update)
    const before = medicinesDb.get(id)
    if (!before) throw notFoundError('Không tìm thấy thuốc.')
    const e = validateMedicine(input)
    if (hasErrors(e)) throw fieldErrors(e)
    const code = input.code.trim().toUpperCase()
    if (medicinesDb.some((m) => m.code === code && m.id !== id)) throw conflictError(null, `Mã ${code} đã có.`, 'code')
    const after = medicinesDb.update(id, {
      code,
      name: input.name.trim(),
      activeIngredient: input.activeIngredient.trim(),
      strength: input.strength?.trim() || null,
      dosageForm: input.dosageForm?.trim() || null,
      unit: input.unit.trim(),
      price: input.price,
      isActive: input.isActive,
    })!
    auditUpdate('Medicine', before, after)
    return medicineDto(after, usedMedicines().has(id))
  },

  async setMedicineActive(id: string, isActive: boolean): Promise<MedicineDto> {
    await mockDelay()
    requirePermission(permissions.medicines.update)
    const before = medicinesDb.get(id)
    if (!before) throw notFoundError('Không tìm thấy thuốc.')
    const after = medicinesDb.update(id, { isActive })!
    auditUpdate('Medicine', before, after)
    return medicineDto(after, usedMedicines().has(id))
  },

  async deleteMedicine(id: string): Promise<void> {
    await mockDelay()
    requirePermission(permissions.medicines.delete)
    const record = medicinesDb.get(id)
    if (!record) throw notFoundError('Không tìm thấy thuốc.')
    if (usedMedicines().has(id)) throw inUse('Thuốc đã kê trong đơn. Hãy chọn "Ngừng" (BR-33).')
    medicinesDb.remove(id)
    auditDelete('Medicine', record)
  },

  async getDiagnoses(query: DiagnosisQuery): Promise<DiagnosisTemplateDto[]> {
    await mockDelay()
    requirePermission(permissions.services.view)
    ensureFresh()
    return diagnosisDtos(
      diagnosesDb.filter(
        (t) =>
          (!query.specialtyId || t.specialtyId === query.specialtyId) &&
          (query.active === undefined || t.isActive === query.active) &&
          (matches(t.icdCode, query.search) || matches(t.name, query.search))
      )
    )
  },

  async getDiagnosisOptions(): Promise<DiagnosisTemplateDto[]> {
    await mockDelay(60, 120)
    requireSession()
    ensureFresh()
    return diagnosisDtos(diagnosesDb.filter((t) => t.isActive))
  },

  async createDiagnosis(input: SaveDiagnosisInput): Promise<DiagnosisTemplateDto> {
    await mockDelay()
    requirePermission(permissions.services.create)
    const e = validateDiagnosis(input)
    if (hasErrors(e)) throw fieldErrors(e)
    const icd = input.icdCode.trim().toUpperCase()
    if (diagnosesDb.some((t) => t.icdCode === icd)) throw conflictError(null, `Mã ${icd} đã có.`, 'icdCode')
    const record: DiagnosisRecord = { id: newId(), icdCode: icd, name: input.name.trim(), specialtyId: input.specialtyId, isActive: input.isActive }
    diagnosesDb.insert(record)
    auditCreate('DiagnosisTemplate', record)
    return diagnosisDtos([record])[0]
  },

  async updateDiagnosis(id: string, input: SaveDiagnosisInput): Promise<DiagnosisTemplateDto> {
    await mockDelay()
    requirePermission(permissions.services.update)
    const before = diagnosesDb.get(id)
    if (!before) throw notFoundError('Không tìm thấy chẩn đoán mẫu.')
    const e = validateDiagnosis(input)
    if (hasErrors(e)) throw fieldErrors(e)
    const icd = input.icdCode.trim().toUpperCase()
    if (diagnosesDb.some((t) => t.icdCode === icd && t.id !== id)) throw conflictError(null, `Mã ${icd} đã có.`, 'icdCode')
    const after = diagnosesDb.update(id, { icdCode: icd, name: input.name.trim(), specialtyId: input.specialtyId, isActive: input.isActive })!
    auditUpdate('DiagnosisTemplate', before, after)
    return diagnosisDtos([after])[0]
  },

  async setDiagnosisActive(id: string, isActive: boolean): Promise<DiagnosisTemplateDto> {
    await mockDelay()
    requirePermission(permissions.services.update)
    const before = diagnosesDb.get(id)
    if (!before) throw notFoundError('Không tìm thấy chẩn đoán mẫu.')
    const after = diagnosesDb.update(id, { isActive })!
    auditUpdate('DiagnosisTemplate', before, after)
    return diagnosisDtos([after])[0]
  },

  async deleteDiagnosis(id: string): Promise<void> {
    await mockDelay()
    requirePermission(permissions.services.delete)
    const record = diagnosesDb.get(id)
    if (!record) throw notFoundError('Không tìm thấy chẩn đoán mẫu.')
    if (visitsDb.some((v) => v.diagnoses.some((d) => d.icdCode === record.icdCode)))
      throw inUse('Chẩn đoán đã dùng trong lượt khám. Hãy chọn "Ngừng" (BR-33).')
    diagnosesDb.remove(id)
    auditDelete('DiagnosisTemplate', record)
  },

  async getProfile(): Promise<ClinicProfileDto> {
    await mockDelay(40, 80)
    requireSession()
    return profile()
  },
}
