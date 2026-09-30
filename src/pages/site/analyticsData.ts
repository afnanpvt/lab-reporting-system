import { SECTIONS } from '../../types/lab'
import { billTotalFor, priceFor, type BillingContext, type Patient, type PatientWithStatus } from './api'

export type PeriodKey = '7d' | '30d' | '90d' | '12m' | 'all'

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: '12m', label: '12 months' },
  { key: 'all', label: 'All time' }
]

const DAY = 86_400_000

const KEY_TO_LABEL = new Map(SECTIONS.map((s) => [s.key, s.label]))

/** Patients store section labels ("L.F.T."), but older/seeded rows can carry the internal key ("lft") — show both the same way. */
function sectionLabel(raw: string): string {
  return KEY_TO_LABEL.get(raw) ?? raw
}

/** Registration dates are ISO (yyyy-mm-dd) in the app, but older rows can be dd/mm/yyyy — accept either. */
export function parseDate(s: string): Date | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3])
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s)
  if (dmy) return new Date(+dmy[3], +dmy[2] - 1, +dmy[1])
  return null
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

export interface Bucket {
  label: string
  start: Date
  revenue: number
  patients: number
  tests: number
  /** The bucket runs past today (current week/month), so its totals are still growing — the chart draws it dashed. */
  partial?: boolean
}

export interface Ranked {
  name: string
  count: number
  revenue: number
}

export interface Totals {
  revenue: number
  patients: number
  tests: number
  avgBill: number
  completionRate: number
}

export interface Analytics {
  from: Date | null
  to: Date
  hasData: boolean
  totals: Totals
  previous: Totals | null
  buckets: Bucket[]
  granularity: 'day' | 'week' | 'month'
  investigations: Ranked[]
  doctors: Ranked[]
  gender: { M: number; F: number }
  ageGroups: { label: string; count: number }[]
  status: { completed: number; partial: number; draft: number }
  returning: { newPatients: number; returning: number }
  weekday: { label: string; count: number }[]
  heat: number[][] // [weekday Mon..Sun][hour 7..20]
  heatMax: number
  selfReferred: number
  referred: number
  insights: string[]
}

export const HEAT_HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7am – 8pm
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const FULL_WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function ageInYears(p: Patient): number {
  if (p.ageUnit === 'M') return p.age / 12
  if (p.ageUnit === 'D') return p.age / 365
  return p.age
}

function ageGroupOf(years: number): string {
  if (years < 1) return 'Infant'
  if (years < 13) return 'Child'
  if (years < 20) return 'Teen'
  if (years < 40) return '20–39'
  if (years < 60) return '40–59'
  return '60+'
}

const AGE_ORDER = ['Infant', 'Child', 'Teen', '20–39', '40–59', '60+']

function totalsFor(rows: PatientWithStatus[], billing: BillingContext): Totals {
  let revenue = 0
  let tests = 0
  let completed = 0
  for (const { patient, status } of rows) {
    revenue += billTotalFor(billing, patient)
    tests += patient.sections.length
    if (status === 'completed') completed++
  }
  return {
    revenue,
    patients: rows.length,
    tests,
    avgBill: rows.length ? revenue / rows.length : 0,
    completionRate: rows.length ? completed / rows.length : 0
  }
}

function patientKey(p: Patient): string {
  const mobile = p.mobile.replace(/\D/g, '')
  return mobile.length >= 6 ? `m:${mobile}` : `n:${p.name.trim().toLowerCase()}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const shortDate = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`

export function computeAnalytics(all: PatientWithStatus[], billing: BillingContext, period: PeriodKey, today = new Date()): Analytics {
  const dated = all
    .map((r) => ({ ...r, when: parseDate(r.patient.date) }))
    .filter((r): r is typeof r & { when: Date } => r.when !== null)

  const end = startOfDay(today)
  const earliest = dated.reduce<Date | null>((min, r) => (min === null || r.when < min ? r.when : min), null)

  let from: Date | null
  if (period === 'all') from = earliest
  else from = addDays(end, -(period === '7d' ? 6 : period === '30d' ? 29 : period === '90d' ? 89 : 364))

  const inRange = dated.filter((r) => from !== null && r.when >= from && r.when < addDays(end, 1))
  const rows = inRange as PatientWithStatus[]

  // Previous period of equal length, for the "vs last period" deltas.
  let previous: Totals | null = null
  if (period !== 'all' && from) {
    const span = Math.round((end.getTime() - from.getTime()) / DAY) + 1
    const prevFrom = addDays(from, -span)
    const prevRows = dated.filter((r) => r.when >= prevFrom && r.when < from!)
    previous = totalsFor(prevRows as PatientWithStatus[], billing)
  }

  // --- Trend buckets ---
  const spanDays = from ? Math.round((end.getTime() - from.getTime()) / DAY) + 1 : 1
  const granularity: Analytics['granularity'] = spanDays <= 31 ? 'day' : spanDays <= 120 ? 'week' : 'month'
  const buckets: Bucket[] = []
  if (from) {
    if (granularity === 'day') {
      for (let d = from; d <= end; d = addDays(d, 1)) buckets.push({ label: shortDate(d), start: d, revenue: 0, patients: 0, tests: 0 })
    } else if (granularity === 'week') {
      // Weeks start on Monday.
      const dow = (from.getDay() + 6) % 7
      for (let d = addDays(from, -dow); d <= end; d = addDays(d, 7)) buckets.push({ label: shortDate(d), start: d, revenue: 0, patients: 0, tests: 0 })
    } else {
      for (let d = new Date(from.getFullYear(), from.getMonth(), 1); d <= end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
        buckets.push({ label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, start: d, revenue: 0, patients: 0, tests: 0 })
      }
    }
  }
  if (granularity !== 'day' && buckets.length > 1) {
    const last = buckets[buckets.length - 1]
    const next = granularity === 'week' ? addDays(last.start, 7) : new Date(last.start.getFullYear(), last.start.getMonth() + 1, 1)
    if (next > addDays(end, 1)) last.partial = true
  }
  const bucketFor = (when: Date): Bucket | undefined => {
    for (let i = buckets.length - 1; i >= 0; i--) if (when >= buckets[i].start) return buckets[i]
    return undefined
  }

  const invMap = new Map<string, Ranked>()
  const docMap = new Map<string, Ranked>()
  const gender = { M: 0, F: 0 }
  const ageMap = new Map<string, number>()
  const status = { completed: 0, partial: 0, draft: 0 }
  const weekdayCounts = new Array(7).fill(0)
  const heat = WEEKDAYS.map(() => HEAT_HOURS.map(() => 0))
  let heatMax = 0
  let selfReferred = 0

  // Who had registered before each period began — so "returning" means seen at any earlier time, not just earlier in the window.
  const seenBefore = new Set<string>()
  if (from) for (const r of dated) if (r.when < from) seenBefore.add(patientKey(r.patient))
  const seenInPeriod = new Set<string>()
  let newPatients = 0
  let returning = 0

  const chrono = [...inRange].sort((a, b) => a.when.getTime() - b.when.getTime() || a.patient.id - b.patient.id)
  for (const { patient: p, status: st, when } of chrono) {
    const bill = billTotalFor(billing, p)
    const b = bucketFor(when)
    if (b) {
      b.revenue += bill
      b.patients += 1
      b.tests += p.sections.length
    }

    for (const raw of p.sections) {
      const name = sectionLabel(raw)
      const entry = invMap.get(name) ?? { name, count: 0, revenue: 0 }
      entry.count += 1
      entry.revenue += priceFor(billing, p.id, raw)
      invMap.set(name, entry)
    }

    const doc = p.referredBy || 'Self'
    if (doc === 'Self') selfReferred++
    else {
      const entry = docMap.get(doc) ?? { name: doc, count: 0, revenue: 0 }
      entry.count += 1
      entry.revenue += bill
      docMap.set(doc, entry)
    }

    gender[p.gender === 'F' ? 'F' : 'M']++
    const ag = ageGroupOf(ageInYears(p))
    ageMap.set(ag, (ageMap.get(ag) ?? 0) + 1)
    status[st]++

    const wd = (when.getDay() + 6) % 7
    weekdayCounts[wd]++
    const hour = parseInt(p.regTime.split(':')[0] ?? '', 10)
    if (!Number.isNaN(hour)) {
      const hi = Math.min(Math.max(hour, HEAT_HOURS[0]), HEAT_HOURS[HEAT_HOURS.length - 1]) - HEAT_HOURS[0]
      heat[wd][hi]++
      heatMax = Math.max(heatMax, heat[wd][hi])
    }

    const key = patientKey(p)
    if (seenBefore.has(key) || seenInPeriod.has(key)) returning++
    else newPatients++
    seenInPeriod.add(key)
  }

  const byCount = (a: Ranked, b: Ranked) => b.count - a.count || b.revenue - a.revenue
  const investigations = [...invMap.values()].sort(byCount)
  const doctors = [...docMap.values()].sort((a, b) => b.revenue - a.revenue || b.count - a.count)
  const totals = totalsFor(rows, billing)
  const weekday = WEEKDAYS.map((label, i) => ({ label, count: weekdayCounts[i] }))

  // --- Plain-language insights ---
  const insights: string[] = []
  if (rows.length > 0) {
    const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
    if (previous && previous.revenue > 0) {
      const pct = ((totals.revenue - previous.revenue) / previous.revenue) * 100
      insights.push(`Revenue is ${pct >= 0 ? 'up' : 'down'} ${Math.abs(pct).toFixed(0)}% on the previous period (${inr(totals.revenue)} vs ${inr(previous.revenue)}).`)
    }
    const busiest = [...weekday].sort((a, b) => b.count - a.count)[0]
    if (busiest.count > 0) insights.push(`${FULL_WEEKDAYS[WEEKDAYS.indexOf(busiest.label)]} is your busiest day, with ${busiest.count} registration${busiest.count === 1 ? '' : 's'}.`)
    if (investigations[0]) insights.push(`${investigations[0].name} is the most-ordered investigation (${investigations[0].count} orders, ${inr(investigations[0].revenue)}).`)
    const topRev = [...invMap.values()].sort((a, b) => b.revenue - a.revenue)[0]
    if (topRev && topRev.name !== investigations[0]?.name) insights.push(`${topRev.name} earns the most revenue (${inr(topRev.revenue)}).`)
    if (doctors[0]) insights.push(`${doctors[0].name} referred the most business: ${doctors[0].count} patient${doctors[0].count === 1 ? '' : 's'} worth ${inr(doctors[0].revenue)}.`)
    if (returning > 0) insights.push(`${Math.round((returning / rows.length) * 100)}% of patients in this period had visited before.`)
  }

  return {
    from,
    to: end,
    hasData: rows.length > 0,
    totals,
    previous,
    buckets,
    granularity,
    investigations,
    doctors,
    gender,
    ageGroups: AGE_ORDER.map((label) => ({ label, count: ageMap.get(label) ?? 0 })),
    status,
    returning: { newPatients, returning },
    weekday,
    heat,
    heatMax,
    selfReferred,
    referred: rows.length - selfReferred,
    insights
  }
}
