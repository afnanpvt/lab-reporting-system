import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutGrid, Users, FileBarChart, Settings, Stethoscope } from 'lucide-react'
import type { ReactNode } from 'react'
import { syncTitleBarOverlay } from './theme'
import { useBranding, refreshBranding } from './brandingStore'

const NAV = [
  { icon: LayoutGrid, label: 'Dashboard', description: 'Overview & quick actions', path: '/' },
  { icon: Users, label: 'Patients', description: 'Manage patient records', path: '/patients' },
  { icon: Stethoscope, label: 'Doctors', description: 'Referring doctors & incentives', path: '/doctors' },
  { icon: FileBarChart, label: 'Reports', description: 'Billing & completed reports', path: '/reports' },
  { icon: Settings, label: 'Settings', description: 'Lab configuration', path: '/settings' }
]

/** Which nav item should light up for a given path — /doctors/5 still highlights Doctors, etc. */
function isNavActive(path: string, pathname: string): boolean {
  if (path === '/') return pathname === '/'
  return pathname === path || pathname.startsWith(path + '/')
}

export default function Shell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [expanded, setExpanded] = useState(false)
  const { labName, logo } = useBranding()

  useEffect(() => {
    refreshBranding()
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

      <div className="flex-1 flex min-h-0 print:h-auto print:overflow-visible">
        {/* Reserves a fixed 80px in the layout so nothing else shifts; the panel that actually
            grows on hover is absolutely positioned and overlays the content instead. */}
        <aside className="relative flex-shrink-0 z-20 print:hidden" style={{ width: 80 }} onMouseEnter={() => setExpanded(true)} onMouseLeave={() => setExpanded(false)}>
          <div
            className="absolute top-0 left-0 h-full bg-[var(--surface)] border-r border-[var(--border)] flex flex-col items-stretch py-6 gap-1.5 overflow-hidden transition-[width] duration-200 ease-out"
            style={{ width: expanded ? 248 : 80, boxShadow: expanded ? '4px 0 16px rgba(26,36,48,0.12)' : 'none' }}
          >
            <nav className="flex flex-col gap-1.5 px-3">
              {NAV.map(({ icon: Icon, label, description, path }) => {
                const active = isNavActive(path, location.pathname)
                return (
                  <button
                    key={label}
                    title={label}
                    aria-label={label}
                    onClick={() => { navigate(path); setExpanded(false) }}
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
          </div>
        </aside>
        <div className="flex-1 overflow-y-auto print:overflow-visible print:h-auto">{children}</div>
      </div>
    </div>
  )
}
