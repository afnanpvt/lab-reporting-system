import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ClipboardList, Clock3, CheckCircle2, ChevronRight, X } from 'lucide-react'
import { listPatientsWithStatus, type Patient, type PatientWithStatus, type PatientStatus } from './api'
import { PatientCard, statusCard } from './PatientCard'

/** Plain, workplace-appropriate greetings — time-of-day aware, with a little variety so the
 * dashboard doesn't say the exact same line every single day. */
const GREETINGS: Record<'morning' | 'afternoon' | 'evening', string[]> = {
  morning: ['Good morning', 'Good morning, have a productive day', 'Good morning, welcome back'],
  afternoon: ['Good afternoon', 'Good afternoon, hope the day is going well', 'Welcome back'],
  evening: ['Good evening', 'Good evening, wrapping up for the day?', 'Welcome back']
}

function pickGreeting(): string {
  const hour = new Date().getHours()
  const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const options = GREETINGS[period]
  return options[Math.floor(Math.random() * options.length)]
}

export default function Dashboard() {
  const navigate = useNavigate()
  const openPatient = (p: Patient) => navigate(`/report/${p.id}`, { state: { patient: p } })
  const [rows, setRows] = useState<PatientWithStatus[]>([])
  const [greeting] = useState(pickGreeting)
  // Filters the list below to one status at a time — null shows the usual "recent 6" mix.
  // Picking one shows every matching patient instead, since that's the point of asking for
  // just that type rather than a quick recent-activity glance.
  const [statusFilter, setStatusFilter] = useState<PatientStatus | null>(null)

  useEffect(() => {
    listPatientsWithStatus().then(setRows)
  }, [])

  const filtered = statusFilter ? rows.filter((r) => r.status === statusFilter) : rows.slice(0, 6)
  const stats = {
    today: rows.length,
    pending: rows.filter((r) => r.status !== 'completed').length,
    completed: rows.filter((r) => r.status === 'completed').length
  }
  const counts = {
    completed: rows.filter((r) => r.status === 'completed').length,
    partial: rows.filter((r) => r.status === 'partial').length,
    draft: rows.filter((r) => r.status === 'draft').length
  }

  return (
      <main className="px-10 py-9">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[26px] font-semibold text-[var(--ink)]">{greeting}</h1>
            <p className="text-[15px] text-[var(--ink-2)]">Here's where things stand across the lab today</p>
          </div>
          <button
            onClick={() => navigate('/patient/new')}
            className="inline-flex items-center gap-2 px-5 py-3 bg-[var(--accent)] text-white text-[15px] font-medium rounded-2xl hover:bg-[var(--accent-ink)] shadow-sm"
          >
            <Plus size={16} />
            New Patient
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-9 max-w-3xl">
          <button onClick={() => navigate('/patients')} className="text-left rounded-2xl p-5 bg-[var(--surface)] border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-[var(--ink-3)] mb-2"><ClipboardList size={15} /><span className="text-[12.5px] font-semibold uppercase tracking-wide">Registered</span></div>
            <div className="text-[32px] font-semibold text-[var(--ink)]">{stats.today}</div>
          </button>
          <button onClick={() => navigate('/patients')} className="text-left rounded-2xl p-5 bg-[var(--surface)] border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-[var(--warning)] mb-2"><Clock3 size={15} /><span className="text-[12.5px] font-semibold uppercase tracking-wide">Needs attention</span></div>
            <div className="text-[32px] font-semibold text-[var(--ink)]">{stats.pending}</div>
          </button>
          <button onClick={() => navigate('/reports')} className="text-left rounded-2xl p-5 bg-[var(--surface)] border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-[var(--success)] mb-2"><CheckCircle2 size={15} /><span className="text-[12.5px] font-semibold uppercase tracking-wide">Completed</span></div>
            <div className="text-[32px] font-semibold text-[var(--ink)]">{stats.completed}</div>
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[15px] font-semibold text-[var(--ink)]">{statusFilter ? statusCard[statusFilter].label : 'Recent patients'}</h2>
            <div className="flex items-center gap-1.5">
              {(['completed', 'partial', 'draft'] as const).map((key) => {
                const s = statusCard[key]
                const active = statusFilter === key
                return (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(active ? null : key)}
                    title={active ? 'Click to clear this filter' : `Show only ${s.label.toLowerCase()} patients`}
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor: active ? s.text : s.bg,
                      color: active ? 'white' : s.text,
                      border: `1px solid ${active ? s.text : s.border}`
                    }}
                  >
                    {counts[key]} {s.label}
                  </button>
                )
              })}
              {statusFilter && (
                <button onClick={() => setStatusFilter(null)} title="Clear filter" className="text-[var(--ink-3)] hover:text-[var(--ink)] p-1">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <button onClick={() => navigate('/patients')} className="text-[13.5px] text-[var(--accent)] hover:text-[var(--accent-ink)] font-medium inline-flex items-center gap-1">
            View all patients <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((r, i) => (
            <PatientCard key={r.patient.id} patient={r.patient} status={r.status} index={i} onOpen={openPatient} />
          ))}
          {statusFilter && filtered.length === 0 && (
            <p className="text-[14px] text-[var(--ink-3)] col-span-full py-8 text-center">No {statusCard[statusFilter].label.toLowerCase()} patients right now.</p>
          )}
        </div>
      </main>
  )
}
