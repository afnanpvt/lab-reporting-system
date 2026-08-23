import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutGrid, Users, FileText, Settings, FlaskConical, Stethoscope } from 'lucide-react'
import type { ReactNode } from 'react'

const NAV = [
  { icon: LayoutGrid, label: 'Dashboard', path: '/site' },
  { icon: Users, label: 'Patients', path: '/site' },
  { icon: Stethoscope, label: 'Doctors', path: '/site/doctors' },
  { icon: FileText, label: 'Reports', path: '/site' },
  { icon: Settings, label: 'Settings', path: '/site/settings' }
]

export default function Shell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="h-screen overflow-hidden bg-[#faf8f5] flex">
      <aside className="w-20 flex-shrink-0 bg-white border-r border-[#ece7de] flex flex-col items-center py-6 gap-6">
        <div className="w-10 h-10 rounded-2xl bg-[#e07a5f] flex items-center justify-center flex-shrink-0">
          <FlaskConical size={18} className="text-white" />
        </div>
        <nav className="flex flex-col gap-2">
          {NAV.map(({ icon: Icon, label, path }) => {
            const active = location.pathname === path || (path === '/site' && label === 'Dashboard' && location.pathname === '/site')
            return (
              <button
                key={label}
                title={label}
                onClick={() => navigate(path)}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                  active ? 'bg-[#fbe6de] text-[#e07a5f]' : 'text-[#a39c8f] hover:bg-[#f6f2ea]'
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
  )
}
