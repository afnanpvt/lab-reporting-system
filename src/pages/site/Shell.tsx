import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { LayoutGrid, Users, FileBarChart, BarChart3, Settings, Stethoscope, Plus, ShieldCheck, Clock, Pin, PinOff } from 'lucide-react'
import type { ReactNode } from 'react'
import { syncTitleBarOverlay } from './theme'
import { useBranding, refreshBranding } from './brandingStore'
import TrialBanner from './TrialBanner'
import ConfirmHost from './ConfirmHost'
import { useGuardedNavigate } from './leaveGuard'
import { useLicense, daysLeftLabel } from './licenseStore'
import { listAllPatientsForAnalytics } from './api'
import { useFeatures, refreshFeatures } from './featuresStore'
import { refreshLabels } from './labelsStore'
import { refreshCustomTests } from './customTestsStore'
import { refreshRangeSpecs } from './rangeSpecsStore'
import { refreshSavedTests } from './savedTestsStore'
import { useShortcutHandlers, useBindings, refreshShortcuts, comboLabel } from './shortcutsStore'
import { parseDate } from './analyticsData'

interface TodaySnapshot {
  registered: number
  tests: number
  pending: number
}

/** Today's numbers for the sidebar's footer card — registrations and investigations since midnight, plus every report still open. Deliberately no money: this sits on screen at the front desk. */
async function loadToday(): Promise<TodaySnapshot> {
  const rows = await listAllPatientsForAnalytics()
  const now = new Date()
  const isToday = (s: string) => {
    const d = parseDate(s)
    return !!d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  }
  let registered = 0
  let tests = 0
  let pending = 0
  for (const { patient, status } of rows) {
    if (isToday(patient.date)) {
      registered++
      tests += patient.sections.length
    }
    if (status !== 'completed') pending++
  }
  return { registered, tests, pending }
}

const NAV = [
  { icon: LayoutGrid, label: 'Dashboard', description: 'Overview & quick actions', path: '/' },
  { icon: Users, label: 'Patients', description: 'Manage patient records', path: '/patients' },
  { icon: Stethoscope, label: 'Doctors', description: 'Referring doctors & incentives', path: '/doctors' },
  { icon: BarChart3, label: 'Analytics', description: 'Trends, revenue & insights', path: '/analytics' },
  { icon: FileBarChart, label: 'Reports', description: 'Billing & completed reports', path: '/reports' },
  { icon: Settings, label: 'Settings', description: 'Lab configuration', path: '/settings' }
]

/** Which nav item should light up for a given path — /doctors/5 still highlights Doctors, etc. */
function isNavActive(path: string, pathname: string): boolean {
  if (path === '/') return pathname === '/'
  return pathname === path || pathname.startsWith(path + '/')
}

export default function Shell({ children }: { children: ReactNode }) {
  const location = useLocation()
  // The sidebar opens over the page while hovered. Pinning keeps it open, beside the page instead of over it.
  const [hovered, setExpanded] = useState(false)
  const [pinned, setPinned] = useState<boolean>(() => {
    try { return localStorage.getItem('labapp:sidebarPinned') === '1' } catch { return false }
  })
  const expanded = pinned || hovered
  const togglePin = () => {
    const next = !pinned
    setPinned(next)
    try { localStorage.setItem('labapp:sidebarPinned', next ? '1' : '0') } catch { /* not remembered, still works */ }
    if (next) refreshToday()
  }
  const { labName, logo } = useBranding()
  const license = useLicense()
  const { analytics } = useFeatures()
  const bindingFor = useBindings()

  // App-wide shortcuts live here because Shell wraps every page and never remounts.
  // Every way out of a screen asks it first, so unsaved edits are never dropped silently.
  const guardedNavigate = useGuardedNavigate()
  useShortcutHandlers({ 'patient.new': () => guardedNavigate('/patient/new') })
  const [today, setToday] = useState<TodaySnapshot | null>(null)
  const lastFetch = useRef(0)

  // Refreshed when the sidebar opens (at most every 10s) — cheap enough, and it means the card is
  // current the moment someone actually looks at it, without polling in the background.
  const refreshToday = () => {
    if (Date.now() - lastFetch.current < 10_000) return
    lastFetch.current = Date.now()
    loadToday().then(setToday).catch(() => {})
  }

  useEffect(() => {
    if (pinned) refreshToday()
    refreshBranding()
    refreshFeatures()
    refreshShortcuts()
    refreshLabels()
    refreshCustomTests()
    refreshRangeSpecs()
    refreshSavedTests()
    syncTitleBarOverlay()
  }, [])

  return (
    <div className="h-screen overflow-hidden print:h-auto print:overflow-visible bg-[var(--bg-app)] flex flex-col">
      {/* No logo image unless the active profile staged one (see profiles/README.md) — otherwise
          just the lab name from Settings rendered as a text wordmark, so it rebrands live as
          whoever's typing enters their own name. print:hidden because every printable page
          already carries its own letterhead — without this, the app's chrome was bleeding into
          the printed/saved PDF above the document. */}
      <header
        className="titlebar-drag flex items-center gap-4 pl-6 flex-shrink-0 bg-[var(--surface)] border-b border-[var(--border)] print:hidden"
        style={{ height: 104, paddingRight: 170 }}
      >
        {logo ? (
          <img src={logo} alt={labName} style={{ height: 48 }} />
        ) : (
          <div className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--accent)' }}>{labName}</div>
        )}
      </header>
      <TrialBanner />

      <div className="flex-1 flex min-h-0 print:h-auto print:overflow-visible">
        {/* Reserves a fixed 80px in the layout so nothing else shifts; the panel that actually
            grows on hover is absolutely positioned and overlays the content instead. */}
        <aside className="relative flex-shrink-0 z-20 print:hidden transition-[width] duration-200 ease-out" style={{ width: pinned ? 248 : 80 }} onMouseEnter={() => { setExpanded(true); refreshToday() }} onMouseLeave={() => setExpanded(false)}>
          <div
            className="absolute top-0 left-0 h-full bg-[var(--surface)] border-r border-[var(--border)] flex flex-col items-stretch py-6 gap-1.5 overflow-hidden transition-[width] duration-200 ease-out"
            style={{ width: expanded ? 248 : 80, boxShadow: expanded && !pinned ? '4px 0 16px rgba(26,36,48,0.12)' : 'none' }}
          >
            <div className={`px-3 flex-shrink-0 flex justify-end transition-opacity duration-150 ${expanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} style={{ width: 248 }}>
              <button
                type="button"
                onClick={togglePin}
                tabIndex={expanded ? 0 : -1}
                aria-pressed={pinned}
                title={pinned ? 'Unpin: the menu opens only when you hover over it' : 'Pin the menu open'}
                aria-label={pinned ? 'Unpin sidebar' : 'Pin sidebar'}
                className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium rounded-md px-2 py-1 ${pinned ? 'text-[var(--accent-ink)] bg-[var(--accent-soft)]' : 'text-[var(--ink-3)] hover:bg-[var(--bg-hover)]'}`}
              >
                {pinned ? <PinOff size={12} /> : <Pin size={12} />}
                {pinned ? 'Pinned' : 'Pin'}
              </button>
            </div>
            <div className="px-3 mb-3 flex-shrink-0">
              <button
                title={bindingFor('patient.new') ? `New Patient (${comboLabel(bindingFor('patient.new'))})` : 'New Patient'}
                aria-label="New Patient"
                onClick={() => { guardedNavigate('/patient/new'); setExpanded(false) }}
                className="w-full flex items-center gap-3 h-12 rounded-xl px-3.5 bg-[var(--accent)] text-white shadow-sm hover:bg-[var(--accent-ink)] active:scale-[0.97] transition-all duration-150"
              >
                <Plus size={19} className="flex-shrink-0" />
                <span className={`text-[14px] font-medium whitespace-nowrap transition-opacity duration-150 ${expanded ? 'opacity-100' : 'opacity-0'}`}>New Patient</span>
                {bindingFor('patient.new') && (
                  <span className={`ml-auto text-[10.5px] font-semibold rounded-md px-1.5 py-0.5 bg-white/20 whitespace-nowrap transition-opacity duration-150 ${expanded ? 'opacity-100' : 'opacity-0'}`} style={{ fontFamily: 'Consolas, monospace' }}>
                    {comboLabel(bindingFor('patient.new'))}
                  </span>
                )}
              </button>
            </div>
            <nav className="flex flex-col gap-1.5 px-3">
              {NAV.filter((n) => n.path !== '/analytics' || analytics !== false).map(({ icon: Icon, label, description, path }) => {
                const active = isNavActive(path, location.pathname)
                return (
                  <button
                    key={label}
                    title={label}
                    aria-label={label}
                    onClick={() => { guardedNavigate(path); setExpanded(false) }}
                    className={`flex items-center gap-3 h-12 rounded-xl px-3 flex-shrink-0 transition-all duration-150 active:scale-[0.96] active:bg-[var(--accent-soft-border)] ${
                      active ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--ink-3)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <Icon size={19} className="flex-shrink-0" />
                    <span className={`text-left leading-tight overflow-hidden whitespace-nowrap transition-opacity duration-150 ${expanded ? 'opacity-100' : 'opacity-0'}`}>
                      <span className={`block text-[14px] font-medium ${active ? 'text-[var(--accent)]' : 'text-[var(--ink)]'}`}>{label}</span>
                      <span className="block text-[11.5px] text-[var(--ink-3)]">{description}</span>
                    </span>
                  </button>
                )
              })}
            </nav>

            {/* Footer — only legible once the panel is open; the collapsed rail stays just icons. */}
            <div className={`mt-auto px-3 flex flex-col gap-3 transition-opacity duration-150 ${expanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} style={{ width: 248 }}>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-app)] p-3.5">
                <div className="text-[10.5px] font-bold uppercase tracking-wide text-[var(--ink-3)] mb-2.5">Today</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[19px] font-semibold text-[var(--ink)] leading-tight">{today?.registered ?? '–'}</div>
                    <div className="text-[11px] text-[var(--ink-3)]">Patients</div>
                  </div>
                  <div>
                    <div className="text-[19px] font-semibold text-[var(--ink)] leading-tight">{today?.tests ?? '–'}</div>
                    <div className="text-[11px] text-[var(--ink-3)]">Tests</div>
                  </div>
                  <div>
                    <div className="text-[19px] font-semibold leading-tight" style={{ color: today && today.pending > 0 ? 'var(--warning)' : 'var(--ink)' }}>{today?.pending ?? '–'}</div>
                    <div className="text-[11px] text-[var(--ink-3)]">Open</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-1 pb-1 text-[12px] text-[var(--ink-3)] whitespace-nowrap overflow-hidden">
                {license?.state === 'trial' ? <Clock size={14} className="flex-shrink-0 text-[var(--warning)]" /> : <ShieldCheck size={14} className="flex-shrink-0 text-[var(--success)]" />}
                <span className="truncate">
                  {license?.state === 'trial' ? `Trial · ${daysLeftLabel(license.daysLeft)} left` : 'Licensed'}
                  <span className="text-[var(--ink-4)]"> · {labName}</span>
                </span>
              </div>
            </div>
          </div>
        </aside>
        <div className="flex-1 overflow-y-auto print:overflow-visible print:h-auto">{children}</div>
      </div>
      <ConfirmHost />
    </div>
  )
}
