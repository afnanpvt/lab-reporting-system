import { useEffect, useState } from 'react'
import { confirmDialog } from './confirmStore'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, X } from 'lucide-react'
import { deletePatient, listPatientsWithStatus, type Patient, type PatientWithStatus, type PatientStatus } from './api'
import { PatientList, statusCard } from './PatientCard'
import { searchPatients } from './fuzzySearch'
import SlideFilter from './SlideFilter'
import DaysStepper from './DaysStepper'
import ViewToggle, { useViewMode } from './ViewToggle'

type Range = 'today' | '7' | '30' | 'all' | 'custom'
const RANGES: { key: Range; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7', label: 'Last 7 days' },
  { key: '30', label: 'Last 30 days' },
  { key: 'all', label: 'All' },
  { key: 'custom', label: 'Custom' }
]
const RANGE_KEY = 'labapp:patientsRange'

function storedRange(): { range: Range; days: string } {
  try {
    const raw = JSON.parse(sessionStorage.getItem(RANGE_KEY) ?? 'null')
    if (raw && RANGES.some((r) => r.key === raw.range)) return { range: raw.range, days: String(raw.days || '5') }
  } catch {
    // not remembered: start on All
  }
  return { range: 'all', days: '5' }
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** The earliest date shown for "the last n days" (today counts as day one), or null for everything. */
function cutoffFor(range: Range, days: string): string | null {
  const n = range === 'today' ? 1 : range === 'all' ? 0 : range === 'custom' ? Math.floor(Number(days)) : Number(range)
  if (!n || n < 1) return null
  const d = new Date()
  d.setDate(d.getDate() - (n - 1))
  return iso(d)
}

export default function Patients() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [view, changeView] = useViewMode('labapp:patientsView')
  const initialRange = useState(storedRange)[0]
  const [range, setRange] = useState<Range>(initialRange.range)
  const [days, setDays] = useState(initialRange.days)
  // Pressing a status chip shows only those patients; pressing it again shows everyone.
  const [statusFilter, setStatusFilter] = useState<PatientStatus | null>(null)
  useEffect(() => {
    try { sessionStorage.setItem(RANGE_KEY, JSON.stringify({ range, days })) } catch { /* not remembered, still works */ }
  }, [range, days])
  const [rows, setRows] = useState<PatientWithStatus[]>([])
  const newPatient = () => navigate('/patient/new')
  const openPatient = (p: Patient) => navigate(`/report/${p.id}`, { state: { patient: p } })

  const refresh = () => listPatientsWithStatus().then(setRows)

  useEffect(() => {
    refresh()
  }, [])

  const removePatient = async (p: Patient) => {
    const ok = await confirmDialog({
      tone: 'danger',
      title: 'Delete this patient?',
      subject: `${p.name} · SID ${p.sid}`,
      message: 'This permanently removes their record and all of their results. This can’t be undone.',
      confirmLabel: 'Delete patient'
    })
    if (!ok) return
    await deletePatient(p.id)
    refresh()
  }

  const cutoff = cutoffFor(range, days)
  const inRange = cutoff ? rows.filter((r) => r.patient.date >= cutoff) : rows
  // Forgiving search: spelling slips, SID without the leading zeros, mobile, test or doctor.
  const byStatus = statusFilter ? inRange.filter((r) => r.status === statusFilter) : inRange
  const filtered = query.trim() ? searchPatients(byStatus, query) : byStatus

  const counts = {
    completed: inRange.filter((r) => r.status === 'completed').length,
    partial: inRange.filter((r) => r.status === 'partial').length,
    draft: inRange.filter((r) => r.status === 'draft').length
  }

  return (
      <main className="px-10 py-9">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[26px] font-semibold text-[var(--ink)]">Patients</h1>
            <p className="text-[15px] text-[var(--ink-2)]">{inRange.length} registered{cutoff ? ` of ${rows.length}` : ''} · who handled each one, at a glance</p>
          </div>
          <button
            onClick={newPatient}
            className="inline-flex items-center gap-2 px-5 py-3 bg-[var(--accent)] text-white text-[15px] font-medium rounded-2xl hover:bg-[var(--accent-ink)] shadow-sm"
          >
            <Plus size={16} />
            New Patient
          </button>
        </div>

        <div className="flex items-center gap-2.5 mb-6">
          {(['completed', 'partial', 'draft'] as const).map((key) => {
            const s = statusCard[key]
            const active = statusFilter === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(active ? null : key)}
                aria-pressed={active}
                title={active ? 'Click to show everyone again' : `Show only ${s.label.toLowerCase()} patients`}
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
            <button type="button" onClick={() => setStatusFilter(null)} title="Clear filter" aria-label="Clear status filter" className="text-[var(--ink-3)] hover:text-[var(--ink)] p-1">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm min-w-[10rem]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, SID, mobile or test"
              className="w-full pl-10 pr-3.5 py-2.5 text-[14.5px] border border-[var(--border-strong)] rounded-xl bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)] focus:border-[var(--accent)]"
            />
          </div>
          <SlideFilter
            options={RANGES}
            value={range}
            onChange={setRange}
            idleKey="all"
            keepOpenKey="custom"
            extraWidth="16rem"
            buttonLabel={range === 'custom' ? `Last ${days || '?'} days` : undefined}
            title="Show only recent patients"
            extra={(close) => (
              <span className="inline-flex items-center gap-2 text-[13.5px] text-[var(--ink-2)] whitespace-nowrap">
                Last
                <DaysStepper value={days} onChange={setDays} onEnter={close} />
                days
              </span>
            )}
          />
          <div className="ml-auto"><ViewToggle mode={view} onChange={changeView} /></div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-[14px] text-[var(--ink-3)] py-8 text-center">
            {query.trim() ? `No patients match "${query}"${cutoff ? ' in this period' : ''}.` : statusFilter ? `No ${statusCard[statusFilter].label.toLowerCase()} patients${cutoff ? ' in this period' : ''}.` : 'No patients registered in this period.'}
          </p>
        ) : (
          <PatientList rows={filtered} mode={view} onOpen={openPatient} onDelete={removePatient} />
        )}
      </main>
  )
}
