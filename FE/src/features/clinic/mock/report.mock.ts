import { permissions } from '@/config/permissions'
import { mockDelay } from '@/lib/data-source'
import { requirePermission } from '@/mock/mock-auth'
import type {
  CancelledReceiptReportDto,
  DashboardTodayDto,
  DebtReportDto,
  DoctorReportDto,
  FollowUpReportDto,
  PaymentMethod,
  ReportQuery,
  RevenueGroup,
  RevenueReportDto,
  VisitReportDto,
} from '@/types/clinic'
import { clinicRules, doctorShort, ticketOf } from '../lib/rules'
import { diffDaysKey, inVnRange } from '../lib/vn-time'
import { fieldError } from './errors'
import { waitMinutes } from './mappers'
import {
  addDaysKey,
  appointmentsDb,
  doctorsDb,
  ensureFresh,
  followUpsDb,
  invoicesDb,
  loadDay,
  nowMs,
  patientsDb,
  plansDb,
  receiptsDb,
  specialtiesDb,
  today,
  vnDateKey,
  vnLocal,
  visitsDb,
} from './store'

/** Handler mock tổng quan, báo cáo (07 §3.14, §4.11), giống BE `ClinicReportService`. */

/** Khoảng ngày báo cáo, mặc định 30 ngày tới hôm nay, tối đa 366 ngày. */
function range(query: ReportQuery): { from: string; to: string; days: number } {
  const to = query.to || today()
  const from = query.from || addDaysKey(to, -29)
  if (from > to) throw fieldError('from', 'Ngày bắt đầu phải trước ngày kết thúc')
  const days = diffDaysKey(from, to) + 1
  if (days > clinicRules.maxReportDays) throw fieldError('to', `Khoảng ngày tối đa ${clinicRules.maxReportDays} ngày`)
  return { from, to, days }
}

/** Bác sĩ theo bộ lọc bác sĩ, chuyên khoa; null khi không lọc. */
function doctorFilter(query: ReportQuery): Set<string> | null {
  if (query.doctorId) return new Set([query.doctorId])
  if (query.specialtyId) return new Set(doctorsDb.filter((d) => d.specialtyId === query.specialtyId).map((d) => d.id))
  return null
}

/** Ngày lượt khám đầu tiên (không bỏ về) của mỗi bệnh nhân. */
function firstVisitDates(): Map<string, string> {
  const map = new Map<string, string>()
  for (const v of visitsDb.all()) {
    if (v.status === 'BoVe') continue
    const cur = map.get(v.patientId)
    if (!cur || v.date < cur) map.set(v.patientId, v.date)
  }
  return map
}

const doctorNameOf = (id: string) => doctorShort(doctorsDb.get(id)?.fullName ?? '')

/** Số lượt tiếp đón theo giờ, từ 7h tới 20h, mở rộng nếu có lượt ngoài khoảng đó (giống BE). */
function hourlyCounts(hours: number[]) {
  const first = Math.min(7, ...hours)
  const last = Math.max(20, ...hours)
  return Array.from({ length: last - first + 1 }, (_, n) => n + first).map((hour) => ({ hour, count: hours.filter((h) => h === hour).length }))
}

export const reportMock = {
  async getDashboard(): Promise<DashboardTodayDto> {
    await mockDelay()
    requirePermission(permissions.reports.view)
    ensureFresh()
    const day = today()
    const now = nowMs()
    const dayList = loadDay(day)
    const appts = appointmentsDb.filter((a) => a.date === day)
    const list = visitsDb.filter((v) => v.date === day)
    const started = list.filter((v) => v.startedAt)
    const rooms = new Map(dayList.map((d) => [d.doctor.id, d.doctor.room]))
    const visitDoctors = new Set(list.map((v) => v.doctorId))
    const patients = new Map(patientsDb.all().map((p) => [p.id, p]))
    const avg = (xs: typeof list) => (xs.length === 0 ? null : Math.round(xs.reduce((s, v) => s + waitMinutes(v, now), 0) / xs.length))
    return {
      date: day,
      appointments: appts.filter((a) => a.status !== 'DaHuy').length,
      checkedIn: list.length,
      waiting: list.filter((v) => v.status === 'ChoKham' || v.status === 'ChoKetQua').length,
      done: list.filter((v) => v.status === 'ChoThanhToan' || v.status === 'HoanTat').length,
      noShow: appts.filter((a) => a.status === 'KhongDen').length,
      revenue: receiptsDb.filter((r) => r.status === 'HopLe' && vnDateKey(r.collectedAt) === day).reduce((s, r) => s + r.amount, 0),
      avgWaitMinutes: avg(started),
      hourly: hourlyCounts(list.map((v) => Math.floor(vnLocal(v.checkedInAt).minute / 60))),
      doctors: dayList
        .filter((d) => (d.doctor.isActive && d.slots.length > 0) || visitDoctors.has(d.doctor.id))
        .map((d) => {
          const mine = list.filter((v) => v.doctorId === d.doctor.id)
          const current = mine.find((v) => v.status === 'DangKham')
          return {
            id: d.doctor.id,
            displayName: doctorShort(d.doctor.fullName),
            room: d.doctor.room,
            working: d.working,
            currentTicket: current ? ticketOf(d.doctor.room, current.queueNumber) : null,
            waiting: mine.filter((v) => v.status === 'ChoKham' || v.status === 'ChoKetQua').length,
            done: mine.filter((v) => v.status === 'ChoThanhToan' || v.status === 'HoanTat').length,
            avgWaitMinutes: avg(mine.filter((v) => v.startedAt)),
          }
        }),
      longWaits: list
        .filter((v) => v.status === 'ChoKham' && waitMinutes(v, now) >= clinicRules.waitWarnMinutes)
        .sort((a, b) => waitMinutes(b, now) - waitMinutes(a, now))
        .map((v) => ({
          visitId: v.id,
          ticket: ticketOf(rooms.get(v.doctorId) ?? '', v.queueNumber),
          patientName: patients.get(v.patientId)?.fullName ?? '',
          doctorName: doctorNameOf(v.doctorId),
          waitMinutes: waitMinutes(v, now),
        })),
      pendingOnline: appointmentsDb.count((a) => a.status === 'ChoXacNhan' && a.date >= day),
      pendingApprovals: plansDb.count((p) => p.status === 'ChoDuyet'),
    }
  },

  async getRevenue(query: ReportQuery): Promise<RevenueReportDto> {
    await mockDelay()
    requirePermission(permissions.reports.view)
    ensureFresh()
    const { from, to, days } = range(query)
    const doctors = doctorFilter(query)
    const invoices = new Map(invoicesDb.all().map((i) => [i.id, i]))
    const receiptsIn = (f: string, t: string) =>
      receiptsDb.filter((r) => r.status === 'HopLe' && inVnRange(r.collectedAt, f, t) && (!doctors || doctors.has(invoices.get(r.invoiceId)?.doctorId ?? '')))
    const rows = receiptsIn(from, to)
    const previous = receiptsIn(addDaysKey(from, -days), addDaysKey(from, -1))
    const total = rows.reduce((s, r) => s + r.amount, 0)
    const prevTotal = previous.reduce((s, r) => s + r.amount, 0)
    // Theo nhóm: phân bổ số thu theo tỉ lệ tiền dòng không mua ngoài, phần lẻ dồn vào nhóm lớn nhất
    const byGroup: Record<RevenueGroup, number> = { Kham: 0, ThuThuat: 0, CanLamSang: 0, Thuoc: 0 }
    for (const r of rows) {
      const lines = (invoices.get(r.invoiceId)?.lines ?? []).filter((l) => !l.isOutside && l.amount > 0)
      const groups = new Map<RevenueGroup, number>()
      for (const l of lines) groups.set(l.reportGroup, (groups.get(l.reportGroup) ?? 0) + l.amount)
      const sum = [...groups.values()].reduce((s, x) => s + x, 0)
      if (sum <= 0) {
        byGroup.Kham += r.amount
        continue
      }
      let allocated = 0
      for (const [group, amount] of groups) {
        const share = Math.floor((r.amount * amount) / sum)
        byGroup[group] += share
        allocated += share
      }
      const biggest = [...groups.entries()].sort((a, b) => b[1] - a[1])[0][0]
      byGroup[biggest] += r.amount - allocated
    }
    const methods: PaymentMethod[] = ['TienMat', 'ChuyenKhoan', 'The']
    return {
      from,
      to,
      total,
      receiptCount: rows.length,
      previousTotal: prevTotal,
      changePercent: prevTotal === 0 ? null : Math.round(((total - prevTotal) * 1000) / prevTotal) / 10,
      byDay: Array.from({ length: days }, (_, n) => addDaysKey(from, n)).map((date) => ({
        date,
        amount: rows.filter((r) => vnDateKey(r.collectedAt) === date).reduce((s, r) => s + r.amount, 0),
      })),
      byGroup: (Object.keys(byGroup) as RevenueGroup[]).map((group) => ({ group, amount: byGroup[group] })),
      byMethod: methods.map((method) => ({
        method,
        amount: rows.filter((r) => r.method === method).reduce((s, r) => s + r.amount, 0),
        count: rows.filter((r) => r.method === method).length,
      })),
    }
  },

  async getDoctors(query: ReportQuery): Promise<DoctorReportDto> {
    await mockDelay()
    requirePermission(permissions.reports.view)
    ensureFresh()
    const { from, to } = range(query)
    const specs = new Map(specialtiesDb.all().map((s) => [s.id, s.name]))
    const doctors = doctorsDb
      .filter((d) => (!query.specialtyId || d.specialtyId === query.specialtyId) && (!query.doctorId || d.id === query.doctorId))
      .sort((a, b) => a.sortOrder - b.sortOrder || (a.code < b.code ? -1 : 1))
    const ids = new Set(doctors.map((d) => d.id))
    const visits = visitsDb.filter((v) => ids.has(v.doctorId) && v.date >= from && v.date <= to && v.status !== 'BoVe')
    const first = firstVisitDates()
    const visitIds = new Set(visits.map((v) => v.id))
    const revenue = new Map<string, number>()
    for (const i of invoicesDb.filter((x) => visitIds.has(x.visitId) && x.status !== 'DaHuy'))
      revenue.set(i.doctorId, (revenue.get(i.doctorId) ?? 0) + i.lines.filter((l) => l.kind !== 'Thuoc' && !l.isOutside).reduce((s, l) => s + l.amount, 0))
    return {
      from,
      to,
      rows: doctors.map((d) => {
        const mine = visits.filter((v) => v.doctorId === d.id)
        const done = mine.filter((v) => v.status === 'ChoThanhToan' || v.status === 'HoanTat')
        const waited = mine.filter((v) => v.startedAt)
        return {
          doctorId: d.id,
          displayName: doctorShort(d.fullName),
          specialtyName: specs.get(d.specialtyId) ?? '',
          visits: done.length,
          newPatients: done.filter((v) => first.get(v.patientId) === v.date).length,
          revenue: revenue.get(d.id) ?? 0,
          avgWaitMinutes:
            waited.length === 0
              ? null
              : Math.round(waited.reduce((s, v) => s + Math.max(0, (Date.parse(v.startedAt!) - Date.parse(v.initialQueueAt)) / 60_000), 0) / waited.length),
        }
      }),
    }
  },

  async getVisits(query: ReportQuery): Promise<VisitReportDto> {
    await mockDelay()
    requirePermission(permissions.reports.view)
    ensureFresh()
    const { from, to, days } = range(query)
    const doctors = doctorFilter(query)
    const visits = visitsDb.filter((v) => v.date >= from && v.date <= to && v.status !== 'BoVe' && (!doctors || doctors.has(v.doctorId)))
    const appts = appointmentsDb.filter((a) => a.date >= from && a.date <= to && (!doctors || doctors.has(a.doctorId)))
    const sources = new Map(appts.map((a) => [a.id, a.source]))
    const first = firstVisitDates()
    const isNew = (v: (typeof visits)[number]) => first.get(v.patientId) === v.date
    const total = appts.length
    const cancelled = appts.filter((a) => a.status === 'DaHuy').length
    const noShow = appts.filter((a) => a.status === 'KhongDen').length
    return {
      from,
      to,
      total: visits.length,
      newPatients: visits.filter(isNew).length,
      returning: visits.filter((v) => !isNew(v)).length,
      appointmentTotal: total,
      cancelled,
      noShow,
      noShowRate: total - cancelled === 0 ? 0 : Math.round((noShow * 1000) / (total - cancelled)) / 10,
      fromOnline: visits.filter((v) => v.appointmentId && sources.get(v.appointmentId) === 'Online').length,
      fromReception: visits.filter((v) => v.appointmentId && sources.get(v.appointmentId) === 'LeTan').length,
      walkIn: visits.filter((v) => !v.appointmentId).length,
      byDay: Array.from({ length: days }, (_, n) => addDaysKey(from, n)).map((date) => {
        const mine = visits.filter((v) => v.date === date)
        const fresh = mine.filter(isNew).length
        return { date, total: mine.length, newPatients: fresh, returning: mine.length - fresh }
      }),
    }
  },

  async getFollowUps(query: ReportQuery): Promise<FollowUpReportDto> {
    await mockDelay()
    requirePermission(permissions.reports.view)
    ensureFresh()
    const { from, to } = range(query)
    const doctors = doctorFilter(query)
    const rows = followUpsDb.filter((f) => f.dueDate >= from && f.dueDate <= to && (!doctors || doctors.has(f.doctorId)))
    const closedBefore = addDaysKey(today(), -clinicRules.followUpWindowAfter)
    const closed = rows.filter((r) => r.dueDate < closedBefore)
    const byDoctor = new Map<string, typeof rows>()
    for (const r of rows) byDoctor.set(r.doctorId, [...(byDoctor.get(r.doctorId) ?? []), r])
    return {
      from,
      to,
      total: rows.length,
      reminded: rows.filter((r) => r.sendCount > 0 || r.callResult !== null).length,
      returned: rows.filter((r) => r.status === 'DaQuayLai').length,
      overdue: rows.filter((r) => r.status === 'QuaHan').length,
      closed: closed.length,
      returnRate: closed.length === 0 ? null : Math.round((closed.filter((r) => r.status === 'DaQuayLai').length * 1000) / closed.length) / 10,
      byDoctor: [...byDoctor.entries()]
        .map(([doctorId, list]) => ({
          doctorId,
          displayName: doctorNameOf(doctorId),
          total: list.length,
          returned: list.filter((r) => r.status === 'DaQuayLai').length,
          overdue: list.filter((r) => r.status === 'QuaHan').length,
        }))
        .sort((a, b) => b.total - a.total),
    }
  },

  async getDebts(query: ReportQuery): Promise<DebtReportDto> {
    await mockDelay()
    requirePermission(permissions.reports.view)
    ensureFresh()
    const day = today()
    const doctors = doctorFilter(query)
    const rows = invoicesDb.filter((i) => (i.status === 'ChoThu' || i.status === 'ThuMotPhan') && (!doctors || doctors.has(i.doctorId)))
    const byPatient = new Map<string, typeof rows>()
    for (const i of rows) byPatient.set(i.patientId, [...(byPatient.get(i.patientId) ?? []), i])
    const result = [...byPatient.entries()]
      .map(([patientId, list]) => {
        const p = patientsDb.get(patientId)!
        const oldest = vnDateKey(list.reduce((m, i) => (i.createdAt < m ? i.createdAt : m), list[0].createdAt))
        return {
          patientId,
          patientCode: p.code,
          patientName: p.fullName,
          patientPhone: p.phone,
          invoiceCount: list.length,
          debt: list.reduce((s, i) => s + i.total - i.paid, 0),
          oldestDate: oldest,
          days: diffDaysKey(oldest, day),
          doctorNames: [...new Set(list.map((i) => i.doctorId))].map(doctorNameOf).join(', '),
        }
      })
      .filter((r) => r.debt > 0 && (query.minDays === undefined || query.minDays === null || r.days >= query.minDays))
      .sort((a, b) => b.days - a.days || b.debt - a.debt)
    return { total: result.reduce((s, r) => s + r.debt, 0), patientCount: result.length, rows: result }
  },

  async getCancelledReceipts(query: ReportQuery): Promise<CancelledReceiptReportDto> {
    await mockDelay()
    requirePermission(permissions.reports.view)
    ensureFresh()
    const { from, to } = range(query)
    const invoices = new Map(invoicesDb.all().map((i) => [i.id, i]))
    const rows = receiptsDb
      .filter((r) => r.status === 'DaHuy' && !!r.cancelledAt && inVnRange(r.cancelledAt, from, to))
      .sort((a, b) => (a.cancelledAt! < b.cancelledAt! ? 1 : -1))
    return {
      total: rows.reduce((s, r) => s + r.amount, 0),
      rows: rows.map((r) => ({
        id: r.id,
        code: r.code,
        invoiceCode: invoices.get(r.invoiceId)?.code ?? '',
        patientName: patientsDb.get(r.patientId)?.fullName ?? '',
        amount: r.amount,
        method: r.method,
        collectedAt: r.collectedAt,
        collectedByName: r.collectedByName,
        cancelledAt: r.cancelledAt!,
        cancelledByName: r.cancelledByName ?? '',
        cancelReason: r.cancelReason ?? '',
      })),
    }
  },
}
