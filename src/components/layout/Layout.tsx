import { type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FlaskConical, Settings } from 'lucide-react'
import { useReport } from '../../store/useReport'

export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const settings = useReport((s) => s.settings)
  const labName = settings.lab_name ?? 'Lab Reporter'

  return (
    <div className="flex flex-col h-screen bg-app overflow-hidden">
      {/* Branded header — a real identity block for the lab, not a slim app titlebar */}
      <header
        className="titlebar-drag flex items-center gap-4 pl-6 flex-shrink-0"
        style={{ height: 76, paddingRight: 160, borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <div className="flex items-center gap-3.5 titlebar-no-drag min-w-0">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
            <FlaskConical size={24} className="text-white" />
          </div>
          <div className="min-w-0 leading-snug">
            <div className="text-[21px] font-semibold text-ink truncate max-w-[360px]">{labName}</div>
            <div className="text-[13.5px] text-ink-2 truncate">Laboratory Reporting System</div>
          </div>
        </div>
        <div className="flex-1" />
        <button
          className="titlebar-no-drag p-2.5 rounded-lg hover:bg-app transition-colors"
          onClick={() => navigate('/settings')}
          title="Settings"
        >
          <Settings size={19} className={location.pathname === '/settings' ? 'text-accent' : 'text-ink-2'} />
        </button>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}
