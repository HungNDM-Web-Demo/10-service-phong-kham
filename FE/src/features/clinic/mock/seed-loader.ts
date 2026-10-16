import type { AppointmentCancelReason, CallResult, DayOffPart, DiscountType, Gender, PaymentMethod, ServiceGroup, ServiceUnit } from '@/types/clinic'
import {
  autoPriorityReason,
  clinicRules,
  confirmMessage,
  docCode,
  floor1000,
  followUpMessage,
  itemDiscount,
  reminderMessage,
  slotsOf,
} from '../lib/rules'
import { addDaysKey, isoWeekdayOf, vnDateKey, vnStartOfDay } from '../lib/vn-time'
import { buildLines, statusFor, totals } from './invoice-builder'
import type {
  AppointmentRecord,
  DayOffRecord,
  DiagnosisRecord,
  DoctorRecord,
  FollowUpRecord,
  InvoiceRecord,
  MedicineRecord,
  MessageRecord,
  PatientRecord,
  PhraseRecord,
  PlanItemRecord,
  PlanRecord,
  ReceiptRecord,
  ServiceRecord,
  SpecialtyRecord,
  VisitOrderRecord,
  VisitRecord,
} from './records'

/**
 * Dựng dữ liệu mẫu từ `demo-data.json` theo giờ hiện tại (06 §5.3–§5.7), từng bước giống hệt BE `ClinicSeedBuilder`.
 * Ngày ghi theo chỉ số ngày từ Thứ Hai tuần này (`i`) hoặc lệch ngày so với hôm nay (`d`); trạng thái suy ra bằng cách so
 * mốc thời gian với bây giờ.
 */

// ───────────────────────────── Cấu trúc file (06 §5.2)

type SeedRecord = {
  k: string
  i?: number
  d?: number
  m?: number
  doc: string
  p?: string
  src: 'O' | 'L' | 'W'
  cd?: number
  cm?: number
  conf?: number
  svc?: string
  rs?: string
  o?: 'done' | 'noshow' | 'cancel'
  cr?: AppointmentCancelReason
  cn?: string
  ca?: number
  x?: number
  v?: SeedVisit
  cim?: number
  sm?: number
  fm?: number
  pd?: number
  pm?: PaymentMethod
  part?: number
  prm?: number
  fuRet?: string
  free?: number
  planVisit?: string
  guest?: [string, string, number, Gender]
  fx?: string
  ago?: number
}

type SeedVisit = {
  t: string
  dxo?: string
  vit?: (number | null)[]
  dx2?: string
  ord?: (string | number | null)[][]
  rx?: (string | number)[][]
  adv: number
  fu?: [number, string]
}

export type ClinicSeedFile = {
  specialties: { code: string; name: string; exam: string; max: number }[]
  services: { code: string; name: string; group: ServiceGroup; spec: string | null; unit: ServiceUnit; price: number; tooth?: boolean }[]
  medicines: { code: string; name: string; ing: string; str: string | null; form: string | null; unit: string; price: number; active?: boolean }[]
  diagnoses: { icd: string; name: string; spec: string | null }[]
  doctors: { code: string; name: string; title?: string; spec: string; room: string; bio?: string; user?: string; slot: number; max: number; hours: number[][] }[]
  daysOff: { doc: string; i: number; part: DayOffPart; reason: string }[]
  patients: {
    code: string
    name: string
    birth?: string
    bdo?: number
    g: Gender
    phone: string
    addr?: string
    contact?: string
    allergy?: string
    history?: string
    c?: number
    cdd?: number
  }[]
  templates: Record<string, { reason: string; sym: string; ex: string; dx: string[] }>
  advice: string[]
  usages: string[]
  results: string[]
  phrases: string[]
  records: SeedRecord[]
  followUps: {
    k: string
    v: string
    p: string
    doc: string
    due?: number
    dd?: number
    note?: string
    sends?: number[]
    sendsD?: number[]
    ret?: string
    appt?: number
    call?: [CallResult, number]
  }[]
  plans: {
    k: string
    p: string
    doc: string
    i: number
    m: number
    src: string
    st: string
    n: number
    note?: string
    items: { code: string; teeth: string | null; qty: number; dt?: DiscountType; dv?: number }[]
    review?: string
    cancel?: [string, number]
  }[]
}

export type ClinicSeedContext = {
  now: number
  receptionistName: string
  managerName: string
  clinicName: string
  hotline: string
  userIds: Record<string, string>
  /** Tạo id cố định theo khóa (mock) để lần nạp lại cùng mốc ra cùng id. */
  makeId: (...parts: (string | number)[]) => string
}

export type ClinicSeed = {
  specialties: SpecialtyRecord[]
  services: ServiceRecord[]
  medicines: MedicineRecord[]
  diagnoses: DiagnosisRecord[]
  doctors: DoctorRecord[]
  daysOff: DayOffRecord[]
  patients: PatientRecord[]
  phrases: PhraseRecord[]
  plans: PlanRecord[]
  appointments: AppointmentRecord[]
  visits: VisitRecord[]
  invoices: InvoiceRecord[]
  receipts: ReceiptRecord[]
  followUps: FollowUpRecord[]
  messages: MessageRecord[]
}

const PREGNANT_REASON = 'Phụ nữ có thai'
const PARTIAL_REASON = 'Bệnh nhân hẹn thanh toán phần còn lại'
const MESSAGE_WINDOW_DAYS = 14
const MIN = 60_000

type Resolved = { rec: SeedRecord; date: string; minute: number; keyNum: number }

const keyNum = (k: string) => Number(k.slice(1))

export function loadClinicSeed(seed: ClinicSeedFile, ctx: ClinicSeedContext): ClinicSeed {
  const now = Math.floor(ctx.now / 1000) * 1000
  const iso = (ms: number) => new Date(ms).toISOString()
  const today = vnDateKey(now)
  const monday = addDaysKey(today, 1 - isoWeekdayOf(today))
  const utc = (date: string, minute: number) => vnStartOfDay(date) + minute * MIN
  const day = (i: number) => addDaysKey(monday, i)
  const id = ctx.makeId
  let lineSeq = 0
  const lineId = () => id('line', ++lineSeq)

  // 1) Danh mục
  const specialties = new Map<string, SpecialtyRecord>()
  seed.specialties.forEach((s, n) =>
    specialties.set(s.code, { id: id('spec', s.code), code: s.code, name: s.name, examServiceId: null, defaultMaxPerSlot: s.max, sortOrder: (n + 1) * 10 })
  )
  const services = new Map<string, ServiceRecord>()
  for (const s of seed.services)
    services.set(s.code, {
      id: id('svc', s.code),
      code: s.code,
      name: s.name,
      group: s.group,
      specialtyId: s.spec ? specialties.get(s.spec)!.id : null,
      unit: s.unit,
      price: s.price,
      requiresTooth: s.tooth === true,
      isActive: true,
    })
  for (const s of seed.specialties) specialties.get(s.code)!.examServiceId = services.get(s.exam)!.id
  const medicines = new Map<string, MedicineRecord>()
  for (const m of seed.medicines)
    medicines.set(m.code, {
      id: id('med', m.code),
      code: m.code,
      name: m.name,
      activeIngredient: m.ing,
      strength: m.str ?? null,
      dosageForm: m.form ?? null,
      unit: m.unit,
      price: m.price,
      isActive: m.active !== false,
    })
  const diagnoses = new Map<string, DiagnosisRecord>()
  for (const d of seed.diagnoses)
    diagnoses.set(d.icd, { id: id('dx', d.icd), icdCode: d.icd, name: d.name, specialtyId: d.spec ? specialties.get(d.spec)!.id : null, isActive: true })
  const doctors = new Map<string, DoctorRecord>()
  seed.doctors.forEach((d, n) =>
    doctors.set(d.code, {
      id: id('doc', d.code),
      code: d.code,
      fullName: d.name,
      title: d.title ?? null,
      specialtyId: specialties.get(d.spec)!.id,
      room: d.room,
      photoUrl: null,
      bio: d.bio ?? null,
      userId: d.user ? (ctx.userIds[d.user] ?? null) : null,
      slotMinutes: d.slot,
      maxPerSlot: d.max,
      showOnline: true,
      isActive: true,
      sortOrder: (n + 1) * 10,
      hours: d.hours.map((h) => ({ dayOfWeek: h[0], startMinute: h[1], endMinute: h[2] })),
    })
  )
  const daysOff: DayOffRecord[] = seed.daysOff.map((o) => ({
    id: id('off', o.doc, o.i),
    doctorId: doctors.get(o.doc)!.id,
    date: day(o.i),
    part: o.part,
    reason: o.reason,
  }))
  const offByDoc = new Map(seed.daysOff.map((o) => [`${o.doc}|${day(o.i)}`, o.part]))
  const slotCache = new Map<string, number[]>()
  const slotsFor = (doc: string, date: string): number[] => {
    const cacheKey = `${doc}|${date}`
    let slots = slotCache.get(cacheKey)
    if (!slots) {
      const d = seed.doctors.find((x) => x.code === doc)!
      const weekday = isoWeekdayOf(date)
      slots = slotsOf(d.hours.filter((h) => h[0] === weekday).map((h) => [h[1], h[2]] as [number, number]), d.slot, offByDoc.get(cacheKey) ?? null)
      slotCache.set(cacheKey, slots)
    }
    return slots
  }

  const patients = new Map<string, PatientRecord>()
  for (const p of seed.patients) {
    const number = Number(p.code.slice(2))
    let created = utc(p.c !== undefined ? day(p.c) : addDaysKey(today, p.cdd ?? 0), 480 + ((number * 37) % 600))
    if (created > now) created = now - 60 * MIN
    patients.set(p.code, {
      id: id('pat', p.code),
      code: p.code,
      fullName: p.name,
      birthDate: p.birth ?? addDaysKey(today, p.bdo ?? 0),
      gender: p.g,
      phone: p.phone,
      address: p.addr ?? null,
      contactPerson: p.contact ?? null,
      allergies: p.allergy ?? null,
      medicalHistory: p.history ?? null,
      note: null,
      createdAt: iso(created),
    })
  }

  const phrases: PhraseRecord[] = ctx.userIds.bacsi
    ? seed.phrases.map((text, n) => ({ id: id('phrase', n), userId: ctx.userIds.bacsi, text, createdAt: iso(now - (seed.phrases.length - n) * MIN) }))
    : []

  // 2) Kế hoạch điều trị (trạng thái hạng mục chốt sau khi có lượt khám)
  const plans = new Map<string, { seed: ClinicSeedFile['plans'][number]; entity: PlanRecord }>()
  for (const sp of seed.plans) {
    const doctor = doctors.get(sp.doc)!
    const items: PlanItemRecord[] = sp.items.map((it, n) => {
      const svc = services.get(it.code)!
      const discount = itemDiscount(svc.price, it.qty, it.dt ?? null, it.dv ?? 0)
      return {
        id: id('item', sp.k, n),
        serviceId: svc.id,
        serviceCode: svc.code,
        serviceName: svc.name,
        unit: svc.unit,
        teeth: it.teeth,
        quantity: it.qty,
        unitPrice: svc.price,
        discountType: it.dt ?? null,
        discountValue: it.dv ?? 0,
        discountAmount: discount,
        amount: svc.price * it.qty - discount,
        status: 'ChuaLam',
        doneAt: null,
        sortOrder: n,
      }
    })
    plans.set(sp.k, {
      seed: sp,
      entity: {
        id: id('plan', sp.k),
        code: '',
        patientId: patients.get(sp.p)!.id,
        doctorId: doctor.id,
        plannedSessions: sp.n,
        note: sp.note ?? null,
        subTotal: 0,
        discountTotal: 0,
        total: 0,
        status: 'Nhap',
        quotedAt: null,
        acceptedAt: null,
        completedAt: null,
        cancelledAt: null,
        cancelReason: null,
        reviewedByName: null,
        reviewedAt: null,
        reviewNote: null,
        createdByName: doctor.fullName,
        createdAt: iso(utc(day(sp.i), sp.m)),
        items,
      },
    })
  }

  // 3) Chọn bản ghi giữ lại (06 §5.3, §5.6)
  let nextWork = addDaysKey(today, 1)
  if (isoWeekdayOf(nextWork) === 7) nextWork = addDaysKey(nextWork, 1)
  const hasTc12 = seed.records.some((r) => r.fx === 'tc12')
  const hasBs01W = seed.records.some((r) => r.fx === 'bs01w')
  let kept: Resolved[] = []
  for (const rec of seed.records) {
    if (rec.fx) continue
    let date = rec.i !== undefined ? day(rec.i) : addDaysKey(today, rec.d ?? 0)
    // Lượt cũ của kịch bản kiểm thử ghi lệch ngày: rơi vào ngày bác sĩ nghỉ thì lùi về ngày làm việc gần nhất
    for (let n = 0; rec.i === undefined && rec.src !== 'W' && n < 7 && !slotsFor(rec.doc, date).includes(rec.m ?? 0); n++) date = addDaysKey(date, -1)
    if (rec.x === 1 && date < today) continue
    if (rec.src === 'W' && (date > today || (date === today && utc(date, rec.cim ?? 0) > now))) continue
    if (
      hasTc12 &&
      date === nextWork &&
      rec.src !== 'W' &&
      (((rec.doc === 'BS02' || rec.doc === 'BS03') && rec.m === 540) || (rec.doc === 'BS04' && rec.m === 840))
    )
      continue
    kept.push({ rec, date, minute: rec.m ?? 0, keyNum: keyNum(rec.k) })
  }

  const createdAt = (r: Resolved): number => {
    const start = utc(r.date, r.minute)
    let created = utc(addDaysKey(r.date, -(r.rec.cd ?? 0)), r.rec.cm ?? 480)
    const gap = 30 + ((r.keyNum * 7) % 600)
    if (created > now) created = now - gap * MIN
    if (created >= start) created = start - gap * MIN
    return created
  }
  const cancelledNow = (r: Resolved) => r.rec.o === 'cancel' && createdAt(r) + (r.rec.ca ?? 0) * MIN <= now

  if (hasTc12) {
    // TC-12: ngày kế tiếp BS02 phải ít lịch hơn BS03
    const active = (doc: string) => kept.filter((r) => r.date === nextWork && r.rec.doc === doc && r.rec.src !== 'W' && !cancelledNow(r))
    for (;;) {
      const bs02 = active('BS02')
      if (bs02.length === 0 || bs02.length < active('BS03').length) break
      const drop = [...bs02].sort((a, b) => b.minute - a.minute || b.keyNum - a.keyNum)[0]
      kept = kept.filter((r) => r !== drop)
    }
  }

  // 4) Dữ liệu kịch bản kiểm thử xếp khung lúc nạp
  const taken = new Map<string, number>()
  const tk = (doc: string, date: string, minute: number) => `${doc}|${date}|${minute}`
  for (const r of kept.filter((x) => x.rec.src !== 'W' && !cancelledNow(x))) taken.set(tk(r.rec.doc, r.date, r.minute), (taken.get(tk(r.rec.doc, r.date, r.minute)) ?? 0) + 1)
  const free = (doc: string, date: string, minute: number) => (taken.get(tk(doc, date, minute)) ?? 0) < doctors.get(doc)!.maxPerSlot
  const take = (doc: string, date: string, minute: number) => taken.set(tk(doc, date, minute), (taken.get(tk(doc, date, minute)) ?? 0) + 1)

  for (const rec of seed.records.filter((r) => r.fx)) {
    switch (rec.fx) {
      case 'an': {
        let date = today
        for (let n = 0; n < 7 && slotsFor(rec.doc, date).length === 0; n++) date = addDaysKey(date, 1)
        const slots = slotsFor(rec.doc, date)
        if (slots.length === 0) break
        const freeSlots = slots.filter((s) => free(rec.doc, date, s))
        const minute = slots.find((s) => (date !== today || utc(date, s) > now) && free(rec.doc, date, s)) ?? freeSlots[freeSlots.length - 1] ?? slots[0]
        take(rec.doc, date, minute)
        kept.push({ rec, date, minute, keyNum: keyNum(rec.k) })
        break
      }
      case 'bs01w':
        if (slotsFor(rec.doc, today).length > 0) kept.push({ rec, date: today, minute: 0, keyNum: keyNum(rec.k) })
        break
      case 'bs03': {
        const minute = slotsFor(rec.doc, today).find((s) => utc(today, s) >= now + 15 * MIN && free(rec.doc, today, s))
        if (minute !== undefined) {
          take(rec.doc, today, minute)
          kept.push({ rec, date: today, minute, keyNum: keyNum(rec.k) })
        }
        break
      }
      case 'tc12':
        if (slotsFor(rec.doc, nextWork).includes(540) && free(rec.doc, nextWork, 540)) {
          take(rec.doc, nextWork, 540)
          kept.push({ rec, date: nextWork, minute: 540, keyNum: keyNum(rec.k) })
        }
        break
      case 'tc11': {
        let date = addDaysKey(today, rec.d ?? 0)
        for (let n = 0; n < 7 && slotsFor(rec.doc, date).length === 0; n++) date = addDaysKey(date, 1)
        const slots = slotsFor(rec.doc, date)
        const want = rec.m ?? 0
        const minute =
          slots.includes(want) && free(rec.doc, date, want)
            ? want
            : (slots.find((s) => s >= want && free(rec.doc, date, s)) ?? slots.find((s) => free(rec.doc, date, s)))
        if (minute !== undefined) {
          take(rec.doc, date, minute)
          kept.push({ rec, date, minute, keyNum: keyNum(rec.k) })
        }
        break
      }
    }
  }

  // 5) Lịch hẹn, lượt khám, phiếu thanh toán, phiếu thu
  const appointments: AppointmentRecord[] = []
  const visits: VisitRecord[] = []
  const invoices: InvoiceRecord[] = []
  const receipts: ReceiptRecord[] = []
  const appointmentOf = new Map<string, AppointmentRecord>()
  const visitOf = new Map<string, VisitRecord>()
  const planItemVisits = new Map<string, VisitRecord>()
  const autoConfirmed = new Set<AppointmentRecord>()
  const keyOf = new Map<object, number>()
  const receptionist = ctx.receptionistName
  for (const r of kept) {
    const rec = r.rec
    const doctor = doctors.get(rec.doc)!
    const patient = rec.p ? patients.get(rec.p)! : null
    const walkIn = rec.src === 'W'
    let checkin: number | null = null
    if (rec.ago !== undefined) checkin = now - rec.ago * MIN
    else if (rec.o === 'done' && rec.cim !== undefined && (walkIn || r.date < today || (r.date === today && utc(r.date, rec.cim) <= now)))
      checkin = utc(r.date, rec.cim)

    let appointment: AppointmentRecord | null = null
    if (!walkIn) {
      const start = utc(r.date, r.minute)
      const created = createdAt(r)
      const online = rec.src === 'O'
      appointment = {
        id: id('appt', rec.k),
        code: '',
        doctorId: doctor.id,
        patientId: patient?.id ?? null,
        guestName: null,
        guestPhone: null,
        guestBirthYear: null,
        guestGender: null,
        date: r.date,
        startAt: iso(start),
        endAt: iso(start + doctor.slotMinutes * MIN),
        source: online ? 'Online' : 'LeTan',
        serviceId: rec.svc ? services.get(rec.svc)!.id : null,
        reason: rec.rs ?? null,
        note: null,
        status: 'ChoXacNhan',
        cancelReason: null,
        cancelNote: null,
        followUpId: null,
        createdByName: online ? clinicRules.onlineCreatorName : receptionist,
        confirmedAt: null,
        confirmedByName: null,
        cancelledAt: null,
        cancelledByName: null,
        createdAt: iso(created),
      }
      if (rec.guest && rec.guest.length === 4) {
        appointment.guestName = rec.guest[0]
        appointment.guestPhone = rec.guest[1]
        appointment.guestBirthYear = rec.guest[2]
        appointment.guestGender = rec.guest[3]
      } else if (online && patient) {
        appointment.guestName = patient.fullName
        appointment.guestPhone = patient.phone
        appointment.guestBirthYear = Number(patient.birthDate.slice(0, 4))
        appointment.guestGender = patient.gender
      }

      let confirmed: number | null = online ? (rec.conf !== undefined ? created + rec.conf * MIN : null) : created
      if (confirmed !== null && confirmed > now) confirmed = null
      const cancelAt = rec.o === 'cancel' ? created + (rec.ca ?? 0) * MIN : null
      if (cancelAt !== null && cancelAt <= now) {
        if (confirmed !== null && confirmed > cancelAt) confirmed = null
        appointment.status = 'DaHuy'
        appointment.cancelReason = rec.cr ?? 'Khac'
        appointment.cancelNote = rec.cn ?? null
        appointment.cancelledAt = iso(cancelAt)
        appointment.cancelledByName = receptionist
      } else if (rec.o === 'noshow' && r.date < today) appointment.status = 'KhongDen'
      else if (checkin !== null) {
        appointment.status = 'DaDen'
        if (confirmed === null) {
          confirmed = checkin
          autoConfirmed.add(appointment)
        }
      } else appointment.status = confirmed !== null ? 'DaXacNhan' : 'ChoXacNhan'
      if (confirmed !== null) {
        appointment.confirmedAt = iso(confirmed)
        appointment.confirmedByName = receptionist
      }
      appointmentOf.set(rec.k, appointment)
      appointments.push(appointment)
      keyOf.set(appointment, r.keyNum)
    }

    if (checkin === null || !patient) continue

    // Lượt khám
    const queueAt =
      !walkIn && rec.ago === undefined && (rec.cim ?? 0) <= r.minute + clinicRules.lateToleranceMinutes ? utc(r.date, r.minute) : checkin
    const priority = autoPriorityReason(patient.birthDate, r.date) ?? (rec.prm === 1 ? PREGNANT_REASON : null)
    const template = rec.v ? seed.templates[rec.v.t] : null
    const visit: VisitRecord = {
      id: id('visit', rec.k),
      code: '',
      patientId: patient.id,
      doctorId: doctor.id,
      appointmentId: appointment?.id ?? null,
      date: r.date,
      queueNumber: 0,
      checkedInAt: iso(checkin),
      initialQueueAt: iso(queueAt),
      queueAt: iso(queueAt),
      isPriority: priority !== null,
      priorityReason: priority,
      isReturned: false,
      isFollowUp: rec.free === 1,
      followUpId: null,
      skipCount: 0,
      startedAt: null,
      calledAt: null,
      callReason: null,
      finishedAt: null,
      status: 'ChoKham',
      reason: rec.rs ?? template?.reason ?? null,
      cancelReason: null,
      checkedInByName: receptionist,
      temperature: null,
      pulse: null,
      bpSystolic: null,
      bpDiastolic: null,
      weight: null,
      height: null,
      symptoms: null,
      examination: null,
      advice: null,
      followUpDate: null,
      followUpNote: null,
      diagnoses: [],
      orders: [],
      prescription: [],
      createdAt: iso(checkin),
    }
    visitOf.set(rec.k, visit)
    visits.push(visit)
    keyOf.set(visit, r.keyNum)
    if (!rec.v || !template) continue

    const sm = utc(r.date, rec.sm ?? 0)
    const fm = utc(r.date, rec.fm ?? 0)
    if (sm > now) continue
    const applyVitals = () => {
      const vit = rec.v!.vit
      if (!vit || vit.length !== 6) return
      visit.temperature = vit[0]
      visit.pulse = vit[1]
      visit.bpSystolic = vit[2]
      visit.bpDiastolic = vit[3]
      visit.weight = vit[4]
      visit.height = vit[5]
    }
    if (fm > now) {
      if (hasBs01W && rec.doc === 'BS01' && r.date === today) continue
      visit.status = 'DangKham'
      visit.startedAt = iso(sm)
      visit.calledAt = iso(sm)
      applyVitals()
      visit.symptoms = template.sym
      visit.examination = template.ex
      continue
    }

    // Đã khám xong
    visit.startedAt = iso(sm)
    visit.calledAt = iso(sm)
    visit.finishedAt = iso(fm)
    visit.status = 'ChoThanhToan'
    applyVitals()
    visit.symptoms = template.sym
    visit.examination = template.ex
    visit.advice = rec.v.adv >= 0 && rec.v.adv < seed.advice.length ? seed.advice[rec.v.adv] : null
    if (rec.v.fu && rec.v.fu.length >= 2) {
      visit.followUpDate = addDaysKey(r.date, rec.v.fu[0])
      visit.followUpNote = rec.v.fu[1]
    }

    const dxCodes = [rec.v.dxo ?? template.dx[0], ...template.dx.slice(1)]
    if (rec.v.dx2) dxCodes.push(rec.v.dx2)
    visit.diagnoses = [...new Set(dxCodes)].map((icd, n) => ({
      id: id('vdx', rec.k, n),
      kind: n === 0 ? 'Chinh' : 'Phu',
      icdCode: icd,
      name: diagnoses.get(icd)?.name ?? icd,
      sortOrder: n,
    }))

    visit.orders = (rec.v.ord ?? []).map((o, n): VisitOrderRecord => {
      const svc = services.get(o[0] as string)!
      const teeth = typeof o[1] === 'string' ? o[1] : null
      const qty = o.length > 2 ? Number(o[2]) : 1
      const resultIdx = o.length > 3 ? Number(o[3]) : -1
      const order: VisitOrderRecord = {
        id: id('ord', rec.k, n),
        serviceId: svc.id,
        serviceCode: svc.code,
        serviceName: svc.name,
        group: svc.group,
        unit: svc.unit,
        teeth,
        quantity: qty,
        unitPrice: svc.price,
        discount: 0,
        result: null,
        imageUrls: null,
        status: 'DaLam',
        treatmentPlanItemId: null,
        sortOrder: n,
      }
      if (o.length > 4 && typeof o[4] === 'string') {
        const [planKey, idx] = o[4].split('#')
        const pl = plans.get(planKey)
        if (pl) {
          const item = pl.entity.items[Number(idx)]
          order.unitPrice = item.unitPrice
          order.discount = item.discountAmount
          order.treatmentPlanItemId = item.id
          planItemVisits.set(item.id, visit)
        }
      }
      if (svc.group === 'CanLamSang') {
        order.result = resultIdx >= 0 && resultIdx < seed.results.length ? seed.results[resultIdx] : null
        order.status = order.result === null ? 'KhongThucHien' : 'CoKetQua'
      }
      return order
    })

    const outside = new Set<string>()
    visit.prescription = (rec.v.rx ?? []).map((x, n) => {
      const med = medicines.get(x[0] as string)!
      if (x.length > 4 && Number(x[4]) === 1) outside.add(med.id)
      const usageIdx = Number(x[3])
      return {
        id: id('rx', rec.k, n),
        medicineId: med.id,
        medicineCode: med.code,
        name: med.name,
        strength: med.strength,
        unit: med.unit,
        activeIngredient: med.activeIngredient,
        quantity: Number(x[1]),
        days: Number(x[2]),
        usage: usageIdx >= 0 && usageIdx < seed.usages.length ? seed.usages[usageIdx] : 'Dùng theo hướng dẫn',
        unitPrice: med.price,
        allergyConfirmedByName: null,
        allergyConfirmedAt: null,
        sortOrder: n,
      }
    })

    // Phiếu thanh toán (07 §3.7), phiếu thu (06 §5.4)
    const specialty = [...specialties.values()].find((s) => s.id === doctor.specialtyId)!
    const exam = [...services.values()].find((s) => s.id === specialty.examServiceId) ?? null
    const lines = buildLines(visit.isFollowUp, exam, visit.orders, visit.prescription, lineId, outside)
    const { total, medicineTotal } = totals(lines)
    const invoice: InvoiceRecord = {
      id: id('inv', rec.k),
      code: '',
      visitId: visit.id,
      patientId: patient.id,
      doctorId: doctor.id,
      total,
      medicineTotal,
      paid: 0,
      status: 'ChoThu',
      cancelledAt: null,
      createdAt: iso(fm),
      lines,
    }
    invoices.push(invoice)
    keyOf.set(invoice, r.keyNum)
    if (total === 0) {
      invoice.status = 'DaThuDu'
      visit.status = 'HoanTat'
      continue
    }
    const paidAt = fm + (rec.pd ?? 5) * MIN
    if (paidAt > now) {
      invoice.status = 'ChoThu'
      continue
    }
    let amount = total
    let partial: string | null = null
    if (rec.part === 1) {
      const half = Math.max(medicineTotal, floor1000(total / 2))
      if (half < total) {
        amount = half
        partial = PARTIAL_REASON
      }
    }
    const method = rec.pm ?? 'TienMat'
    const cash = method === 'TienMat' ? Math.ceil(amount / 50000) * 50000 : null
    const receipt: ReceiptRecord = {
      id: id('rcp', rec.k),
      code: '',
      invoiceId: invoice.id,
      patientId: patient.id,
      amount,
      method,
      cashReceived: cash,
      changeAmount: cash === null ? null : cash - amount,
      partialReason: partial,
      collectedAt: iso(paidAt),
      collectedByName: receptionist,
      status: 'HopLe',
      cancelReason: null,
      cancelledAt: null,
      cancelledByName: null,
      clientRequestId: null,
    }
    receipts.push(receipt)
    keyOf.set(receipt, r.keyNum)
    invoice.paid = amount
    invoice.status = statusFor(total, amount)
    visit.status = 'HoanTat'
  }

  // 6) Trạng thái kế hoạch theo hạng mục đã làm (07 §3.11)
  const planList: PlanRecord[] = []
  for (const { seed: sp, entity: plan } of plans.values()) {
    const created = Date.parse(plan.createdAt)
    for (const item of plan.items) {
      const v = planItemVisits.get(item.id)
      if (v?.finishedAt) {
        item.status = 'DaLam'
        item.doneAt = v.finishedAt
      }
    }
    const cancelAt = () => {
      const days = sp.cancel && sp.cancel.length >= 2 ? sp.cancel[1] : 1
      const at = utc(addDaysKey(day(sp.i), days), 600)
      return iso(at > now ? now - 60 * MIN : at)
    }
    const cancelReason = () => (sp.cancel && sp.cancel.length >= 1 ? sp.cancel[0] : '')
    switch (sp.st) {
      case 'DangDieuTri':
      case 'HoanThanh':
        plan.quotedAt = iso(created + 20 * MIN)
        plan.acceptedAt = iso(created + 40 * MIN)
        if (plan.items.every((i) => i.status === 'DaLam')) {
          plan.status = 'HoanThanh'
          plan.completedAt = plan.items.reduce<string | null>((m, i) => (i.doneAt && (!m || i.doneAt > m) ? i.doneAt : m), null)
        } else plan.status = 'DangDieuTri'
        break
      case 'DungDieuTri':
        plan.quotedAt = iso(created + 20 * MIN)
        plan.acceptedAt = iso(created + 40 * MIN)
        for (const item of plan.items) if (item.status === 'ChuaLam') item.status = 'DaHuy'
        plan.status = 'DaHuy'
        plan.cancelledAt = cancelAt()
        plan.cancelReason = cancelReason()
        break
      case 'DaBaoGia':
        plan.quotedAt = iso(created + 20 * MIN)
        plan.status = 'DaBaoGia'
        break
      case 'ChoDuyet':
        plan.quotedAt = iso(created + 20 * MIN)
        plan.status = 'ChoDuyet'
        break
      case 'TuChoi':
        plan.quotedAt = iso(created + 20 * MIN)
        plan.status = 'DaHuy'
        plan.cancelledAt = cancelAt()
        plan.cancelReason = cancelReason()
        break
      default:
        plan.status = 'Nhap'
        if (sp.review) {
          plan.reviewNote = sp.review
          plan.reviewedByName = ctx.managerName
          plan.reviewedAt = iso(created + 120 * MIN > now ? now - 30 * MIN : created + 120 * MIN)
        }
    }
    const live = plan.items.filter((i) => i.status !== 'DaHuy')
    plan.subTotal = live.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
    plan.discountTotal = live.reduce((s, i) => s + i.discountAmount, 0)
    plan.total = plan.subTotal - plan.discountTotal
    planList.push(plan)
    keyOf.set(plan, keyNum(sp.k))
  }

  // 7) Dòng nhắc tái khám (BR-29), tin nhắc (BR-30)
  const followUps: FollowUpRecord[] = []
  const messages: MessageRecord[] = []
  for (const sf of seed.followUps) {
    const source = visitOf.get(sf.v)
    if (!source?.finishedAt) continue
    const finishedAt = Date.parse(source.finishedAt)
    const doctor = doctors.get(sf.doc)!
    const patient = patients.get(sf.p)!
    const due = sf.due !== undefined ? day(sf.due) : addDaysKey(today, sf.dd ?? 0)
    source.followUpDate = due
    const followUp: FollowUpRecord = {
      id: id('fu', sf.k),
      patientId: patient.id,
      doctorId: doctor.id,
      visitId: source.id,
      dueDate: due,
      note: sf.note ?? null,
      sendCount: 0,
      lastSentAt: null,
      callResult: null,
      callNote: null,
      calledAt: null,
      appointmentId: null,
      returnedVisitId: null,
      status: 'ChoNhac',
      createdAt: iso(finishedAt),
    }
    const sendTimes = [...(sf.sends ?? []).map(day), ...(sf.sendsD ?? []).map((x) => addDaysKey(today, x))]
      .map((d) => utc(d, 540))
      .filter((x) => x <= now && x > finishedAt)
      .sort((a, b) => a - b)
    for (const sendAt of sendTimes) {
      followUp.sendCount++
      followUp.lastSentAt = iso(sendAt)
      messages.push({
        id: id('msg', sf.k, followUp.sendCount),
        kind: 'NhacTaiKham',
        channel: 'Zalo',
        phone: patient.phone,
        content: followUpMessage(ctx.clinicName, patient.fullName, due, doctor.fullName, ctx.hotline),
        sentAt: iso(sendAt),
        appointmentId: null,
        followUpId: followUp.id,
      })
    }
    if (sf.call && sf.call.length >= 2) {
      const calledAt = utc(day(sf.call[1]), 600)
      if (calledAt <= now && calledAt > finishedAt) {
        followUp.callResult = sf.call[0]
        followUp.calledAt = iso(calledAt)
      }
    }
    const back = sf.ret ? visitOf.get(sf.ret) : undefined
    if (back) {
      followUp.returnedVisitId = back.id
      followUp.status = 'DaQuayLai'
      if (back.isFollowUp) back.followUpId = followUp.id
      const appt = sf.appt === 1 && sf.ret ? appointmentOf.get(sf.ret) : undefined
      if (appt) {
        followUp.appointmentId = appt.id
        appt.followUpId = followUp.id
      }
    } else if (addDaysKey(due, clinicRules.followUpWindowAfter) < today) followUp.status = 'QuaHan'
    else if (followUp.sendCount > 0 || followUp.calledAt !== null) followUp.status = 'DaNhac'
    else followUp.status = 'ChoNhac'
    followUps.push(followUp)
  }

  // 8) Tin xác nhận, nhắc lịch của lịch hẹn gần đây (FR-12)
  const phoneOf = new Map([...patients.values()].map((p) => [p.id, p.phone]))
  const doctorById = new Map([...doctors.values()].map((d) => [d.id, d]))
  for (const a of appointments.filter((x) => x.date >= addDaysKey(today, -MESSAGE_WINDOW_DAYS))) {
    const doctor = doctorById.get(a.doctorId)!
    const phone = a.patientId ? phoneOf.get(a.patientId)! : (a.guestPhone ?? '')
    const minute = Math.round((Date.parse(a.startAt) - vnStartOfDay(a.date)) / MIN)
    let confirmAt: number | null = a.source === 'LeTan' ? Date.parse(a.createdAt) : a.confirmedAt ? Date.parse(a.confirmedAt) : null
    if (autoConfirmed.has(a)) confirmAt = null
    const cancelledAt = a.cancelledAt ? Date.parse(a.cancelledAt) : null
    if (confirmAt !== null && confirmAt <= now && (cancelledAt === null || confirmAt < cancelledAt))
      messages.push({
        id: id('msg', a.id, 'c'),
        kind: 'XacNhanLich',
        channel: 'Zalo',
        phone,
        content: confirmMessage(ctx.clinicName, '', a.date, minute, doctor.fullName, doctor.room),
        sentAt: iso(confirmAt),
        appointmentId: a.id,
        followUpId: null,
      })
    const remindAt = utc(addDaysKey(a.date, -1), clinicRules.reminderHour * 60)
    if (confirmAt !== null && confirmAt <= remindAt && remindAt <= now && (cancelledAt === null || cancelledAt > remindAt))
      messages.push({
        id: id('msg', a.id, 'r'),
        kind: 'NhacLich',
        channel: 'Sms',
        phone,
        content: reminderMessage(ctx.clinicName, '', a.date, minute, doctor.fullName, ctx.hotline),
        sentAt: iso(remindAt),
        appointmentId: a.id,
        followUpId: null,
      })
  }

  // 9) Mã chứng từ theo ngày, số thứ tự theo bác sĩ trong ngày (BR-08, BR-28)
  const assign = <T extends { code: string }>(list: T[], at: (x: T) => string, prefix: string) => {
    const groups = new Map<string, T[]>()
    for (const x of list) {
      const date = vnDateKey(at(x))
      if (!groups.has(date)) groups.set(date, [])
      groups.get(date)!.push(x)
    }
    for (const [date, group] of groups) {
      group.sort((a, b) => (at(a) < at(b) ? -1 : at(a) > at(b) ? 1 : keyOf.get(a)! - keyOf.get(b)!))
      group.forEach((x, n) => (x.code = docCode(prefix, date, n + 1)))
    }
  }
  assign(appointments, (a) => a.createdAt, clinicRules.appointmentPrefix)
  assign(visits, (v) => v.checkedInAt, clinicRules.visitPrefix)
  assign(invoices, (i) => i.createdAt, clinicRules.invoicePrefix)
  assign(receipts, (r) => r.collectedAt, clinicRules.receiptPrefix)
  assign(planList, (p) => p.createdAt, clinicRules.planPrefix)
  const byDoctorDay = new Map<string, VisitRecord[]>()
  for (const v of visits) {
    const k = `${v.doctorId}|${v.date}`
    if (!byDoctorDay.has(k)) byDoctorDay.set(k, [])
    byDoctorDay.get(k)!.push(v)
  }
  for (const group of byDoctorDay.values()) {
    group.sort((a, b) => (a.checkedInAt < b.checkedInAt ? -1 : a.checkedInAt > b.checkedInAt ? 1 : keyOf.get(a)! - keyOf.get(b)!))
    group.forEach((v, n) => (v.queueNumber = n + 1))
  }
  // Tin nhắn ghi mã lịch hẹn sau khi đã cấp mã
  const apptById = new Map(appointments.map((a) => [a.id, a]))
  for (const m of messages) {
    if (!m.appointmentId) continue
    const a = apptById.get(m.appointmentId)!
    const doctor = doctorById.get(a.doctorId)!
    const minute = Math.round((Date.parse(a.startAt) - vnStartOfDay(a.date)) / MIN)
    m.content =
      m.kind === 'XacNhanLich'
        ? confirmMessage(ctx.clinicName, a.code, a.date, minute, doctor.fullName, doctor.room)
        : reminderMessage(ctx.clinicName, a.code, a.date, minute, doctor.fullName, ctx.hotline)
  }

  return {
    specialties: [...specialties.values()],
    services: [...services.values()],
    medicines: [...medicines.values()],
    diagnoses: [...diagnoses.values()],
    doctors: [...doctors.values()],
    daysOff,
    patients: [...patients.values()],
    phrases,
    plans: planList,
    appointments,
    visits,
    invoices,
    receipts,
    followUps,
    messages,
  }
}
