import type { DiagnosisKind, OrderStatus, SaveVisitInput, ServiceGroup, ServiceUnit, VisitMedicalDto } from '@/types/clinic'

/** Trạng thái form phiếu khám (SCR-11), đổi qua lại với DTO `VisitMedicalDto` và `SaveVisitInput` (07 §3.6). */

export type DiagnosisRow = { key: string; kind: DiagnosisKind; icdCode: string | null; name: string }

export type OrderRow = {
  key: string
  id: string | null
  serviceId: string
  serviceCode: string
  serviceName: string
  group: ServiceGroup
  unit: ServiceUnit
  requiresTooth: boolean
  teeth: number[]
  quantity: number
  unitPrice: number
  discount: number
  status: OrderStatus
  result: string
  imageUrls: string[]
  treatmentPlanItemId: string | null
  planCode: string | null
}

export type RxRow = {
  key: string
  id: string | null
  medicineId: string
  medicineCode: string
  name: string
  strength: string | null
  unit: string
  activeIngredient: string
  quantity: number
  days: number
  usage: string
  unitPrice: number
  allergyConfirmed: boolean
}

export type VisitForm = {
  temperature: string
  pulse: string
  bpSystolic: string
  bpDiastolic: string
  weight: string
  height: string
  symptoms: string
  examination: string
  diagnoses: DiagnosisRow[]
  orders: OrderRow[]
  prescription: RxRow[]
  advice: string
  followUpDate: string
  followUpNote: string
}

let seq = 0
export const rowKey = () => `row-${++seq}`

const str = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v))
const num = (v: string): number | null => {
  const t = v.trim().replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : NaN
}

export function toForm(m: VisitMedicalDto | null, requiresTooth: (serviceId: string) => boolean): VisitForm {
  return {
    temperature: str(m?.temperature),
    pulse: str(m?.pulse),
    bpSystolic: str(m?.bpSystolic),
    bpDiastolic: str(m?.bpDiastolic),
    weight: str(m?.weight),
    height: str(m?.height),
    symptoms: m?.symptoms ?? '',
    examination: m?.examination ?? '',
    diagnoses: (m?.diagnoses ?? []).map((d) => ({ key: rowKey(), kind: d.kind, icdCode: d.icdCode, name: d.name })),
    orders: (m?.orders ?? []).map((o) => ({
      key: rowKey(),
      id: o.id,
      serviceId: o.serviceId,
      serviceCode: o.serviceCode,
      serviceName: o.serviceName,
      group: o.group,
      unit: o.unit,
      requiresTooth: requiresTooth(o.serviceId) || o.teeth.length > 0,
      teeth: o.teeth,
      quantity: o.quantity,
      unitPrice: o.unitPrice,
      discount: o.discount,
      status: o.status,
      result: o.result ?? '',
      imageUrls: o.imageUrls,
      treatmentPlanItemId: o.treatmentPlanItemId,
      planCode: o.planCode,
    })),
    prescription: (m?.prescription ?? []).map((p) => ({
      key: rowKey(),
      id: p.id,
      medicineId: p.medicineId,
      medicineCode: p.medicineCode,
      name: p.name,
      strength: p.strength,
      unit: p.unit,
      activeIngredient: p.activeIngredient,
      quantity: p.quantity,
      days: p.days,
      usage: p.usage,
      unitPrice: p.unitPrice,
      allergyConfirmed: p.allergyConfirmed,
    })),
    advice: m?.advice ?? '',
    followUpDate: m?.followUpDate ?? '',
    followUpNote: m?.followUpNote ?? '',
  }
}

export function toInput(f: VisitForm): SaveVisitInput {
  const intOrNull = (v: string) => {
    const n = num(v)
    return n === null ? null : Number.isNaN(n) ? NaN : Math.round(n)
  }
  return {
    temperature: num(f.temperature),
    pulse: intOrNull(f.pulse),
    bpSystolic: intOrNull(f.bpSystolic),
    bpDiastolic: intOrNull(f.bpDiastolic),
    weight: num(f.weight),
    height: intOrNull(f.height),
    symptoms: f.symptoms.trim() || null,
    examination: f.examination.trim() || null,
    diagnoses: f.diagnoses.filter((d) => d.name.trim()).map((d) => ({ kind: d.kind, icdCode: d.icdCode, name: d.name.trim() })),
    orders: f.orders.map((o) => ({
      id: o.id,
      serviceId: o.serviceId,
      teeth: o.requiresTooth ? o.teeth : null,
      quantity: o.requiresTooth ? o.teeth.length : o.quantity,
      status: o.group === 'CanLamSang' ? o.status : null,
      result: o.group === 'CanLamSang' && o.status === 'CoKetQua' ? o.result.trim() || null : null,
      imageUrls: o.imageUrls.length ? o.imageUrls : null,
      treatmentPlanItemId: o.treatmentPlanItemId,
    })),
    prescription: f.prescription.map((p) => ({
      id: p.id,
      medicineId: p.medicineId,
      quantity: p.quantity,
      days: p.days,
      usage: p.usage,
      allergyConfirmed: p.allergyConfirmed,
    })),
    advice: f.advice.trim() || null,
    followUpDate: f.followUpDate || null,
    followUpNote: f.followUpNote.trim() || null,
  }
}

/** BMI hiển thị (không lưu): cân nặng / chiều cao² (m). */
export function bmiOf(weight: string, height: string): string | null {
  const w = num(weight)
  const h = num(height)
  if (!w || !h || Number.isNaN(w) || Number.isNaN(h) || h < 30) return null
  return (w / (h / 100) ** 2).toFixed(1).replace('.', ',')
}
