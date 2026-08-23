import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutGrid, Users, FileBarChart, Settings, Stethoscope } from 'lucide-react'
import type { ReactNode } from 'react'
import logo from '../../assets/superlab-logo.png'

const NAV = [
  { icon: LayoutGrid, label: 'Dashboard', path: '/site' },
  { icon: Users, label: 'Patients', path: '/site/patients' },
  { icon: Stethoscope, label: 'Doctors', path: '/site/doctors' },
  { icon: FileBarChart, label: 'Reports', path: '/site/reports' },
  { icon: Settings, label: 'Settings', path: '/site/settings' }
]

/** Which nav item should light up for a given path — /site/doctors/5 still highlights Doctors, etc. */
function isNavActive(path: string, pathname: string): boolean {
  if (path === '/site') return pathname === '/site'
  return pathname === path || pathname.startsWith(path + '/')
}

export default function Shell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="h-screen overflow-hidden bg-[#f5f7fa] flex flex-col">
      {/* Branded header — claims the full top strip so the native window controls never
          collide with in-page content (every page's own bar sits below this). */}
      <header
        className="titlebar-drag flex items-center gap-4 pl-6 flex-shrink-0 bg-white border-b border-[#e1e6ec]"
        style={{ height: 104, paddingRight: 170 }}
      >
        <img src={logo} alt="Super Lab Service — Digital E.C.G. & Computerised X-Ray" className="titlebar-no-drag h-24 w-auto flex-shrink-0" draggable={false} />
      </header>

      <div className="flex-1 flex min-h-0">
        <aside className="w-20 flex-shrink-0 bg-white border-r border-[#e1e6ec] flex flex-col items-center py-6 gap-2">
          <nav className="flex flex-col gap-2">
            {NAV.map(({ icon: Icon, label, path }) => {
              const active = isNavActive(path, location.pathname)
              return (
                <button
                  key={label}
                  title={label}
                  aria-label={label}
                  onClick={() => navigate(path)}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                    active ? 'bg-[#e8f1f9] text-[#1b6fae]' : 'text-[#8593a3] hover:bg-[#eef2f6]'
                  }`}
                >
                  <Icon size={19} />
                </button>
              )
            })}
          </nav>
        </aside>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
