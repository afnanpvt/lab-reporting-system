import { type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Settings } from 'lucide-react'
import logo from '../../assets/superlab-logo.png'

export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="flex flex-col h-screen bg-app overflow-hidden">
      {/* Branded header — a real identity block for the lab, not a slim app titlebar */}
      <header
        className="titlebar-drag flex items-center gap-4 pl-6 flex-shrink-0"
        style={{ height: 108, paddingRight: 160, borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <div className="flex items-center titlebar-no-drag min-w-0">
          <img src={logo} alt="Super Lab Service — Digital E.C.G. & Computerised X-Ray" className="h-24 w-auto flex-shrink-0" draggable={false} />
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
