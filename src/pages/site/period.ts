// The date period shared by the Doctors overview and the incentive report: pick it once on the
// Doctors page and the report opens on the same period.

export type Preset = 'thisMonth' | 'lastMonth' | 'thisYear' | 'allTime' | 'custom'

export const PRESETS: { key: Preset; label: string }[] = [
  { key: 'thisMonth', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'thisYear', label: 'This year' },
  { key: 'allTime', label: 'All time' },
  { key: 'custom', label: 'Custom' }
]

export interface PeriodChoice {
  preset: Preset
  customFrom: string
  customTo: string
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function isoDate(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`
}

function lastDayOfMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate()
}

/** Returns the ISO from/to bounds for a preset, or null/null for "all time". */
export function rangeFor(preset: Preset, customFrom: string, customTo: string): { from: string | null; to: string | null } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1

  if (preset === 'thisMonth') return { from: isoDate(y, m, 1), to: isoDate(y, m, lastDayOfMonth(y, m)) }
  if (preset === 'lastMonth') {
    const py = m === 1 ? y - 1 : y
    const pm = m === 1 ? 12 : m - 1
    return { from: isoDate(py, pm, 1), to: isoDate(py, pm, lastDayOfMonth(py, pm)) }
  }
  if (preset === 'thisYear') return { from: isoDate(y, 1, 1), to: isoDate(y, 12, 31) }
  if (preset === 'custom') return { from: customFrom || null, to: customTo || null }
  return { from: null, to: null } // allTime
}

/** The friendly line that says which period is being shown (also printed on the incentive report). */
export function periodLabel(preset: Preset, from: string | null, to: string | null): string {
  if (preset === 'allTime') return 'All recorded referrals'
  if (!from || !to) return 'Pick a date range'
  const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  if (preset === 'thisMonth' || preset === 'lastMonth') {
    return new Date(from + 'T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  }
  if (preset === 'thisYear') return from.slice(0, 4)
  return `${fmt(from)} – ${fmt(to)}`
}

const KEY = 'labapp:doctorsPeriod'

export function defaultPeriod(): PeriodChoice {
  const now = new Date()
  return {
    preset: 'thisMonth',
    customFrom: isoDate(now.getFullYear(), now.getMonth() + 1, 1),
    customTo: isoDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
  }
}

export function loadPeriod(): PeriodChoice {
  const fallback = defaultPeriod()
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return fallback
    const p = JSON.parse(raw)
    if (!PRESETS.some((x) => x.key === p.preset)) return fallback
    return {
      preset: p.preset,
      customFrom: typeof p.customFrom === 'string' ? p.customFrom : fallback.customFrom,
      customTo: typeof p.customTo === 'string' ? p.customTo : fallback.customTo
    }
  } catch {
    return fallback
  }
}

export function savePeriod(p: PeriodChoice): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // not remembered, still works
  }
}
