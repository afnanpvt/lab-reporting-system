import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, ChevronRight, AlertCircle } from 'lucide-react'
import type { Patient } from '../types/lab'

function todayGB() {
  return new Date().toLocaleDateString('en-GB')
}

export default function Start() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [allPatients, setAllPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    window.api.patients.list(query.trim() || undefined)
      .then((p) => { if (active) { setAllPatients(p); setLoading(false); setError('') } })
      .catch(() => { if (active) { setError('Could not load patients. Please try again.'); setLoading(false) } })
    return () => { active = false }
  }, [query])

  const searching = query.trim().length > 0
  const unfinishedToday = allPatients.filter(
    (p) => p.reg_date === todayGB() && p.status !== 'completed'
  )
  const listToShow = searching ? allPatients : unfinishedToday

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 pt-16 pb-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 flex items-center gap-3 border border-border-strong rounded-xl bg-surface px-4 py-3.5">
            <Search size={17} className="text-ink-3 flex-shrink-0" />
            <input
              className="flex-1 text-[17px] bg-transparent outline-none placeholder:text-ink-3"
              placeholder="Find a patient by name or SID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <button className="btn-primary flex-shrink-0" onClick={() => navigate('/patient/new')}>
            <Plus size={15} />
            New Patient
          </button>
        </div>

        {error && (
          <div className="error-banner mb-5">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!searching && (
          <p className="text-[14.5px] font-medium text-ink-2 mb-2 px-1">
            {unfinishedToday.length > 0 ? `Today — ${unfinishedToday.length} unfinished` : 'Today'}
          </p>
        )}
        {searching && (
          <p className="text-[14.5px] font-medium text-ink-2 mb-2 px-1">
            {listToShow.length} {listToShow.length === 1 ? 'result' : 'results'}
          </p>
        )}

        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block w-5 h-5 border-2 border-accent-softBorder border-t-accent rounded-full animate-spin" />
          </div>
        ) : listToShow.length === 0 ? (
          <p className="text-[15px] text-ink-2 px-1 py-6">
            {searching ? `No patients match "${query}"` : 'Nothing unfinished today — start a new patient whenever you\'re ready.'}
          </p>
        ) : (
          <div>
            {listToShow.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/report/${p.id}`)}
                className="w-full flex items-center gap-3 py-3 px-1 text-left hover:bg-surface rounded-lg transition-colors"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <div>
                  <div className="text-[16px] font-medium text-ink">{p.name}</div>
                  <div className="text-[14px] text-ink-2">
                    {p.age}{p.age_unit} · {p.gender === 'M' ? 'Male' : 'Female'} · {p.sid}
                    {p.referred_by && <> · Dr. {p.referred_by}</>}
                  </div>
                </div>
                <div className="flex-1" />
                <span className="text-[14px] text-ink-2">{p.reg_date}</span>
                <ChevronRight size={14} className="text-ink-3" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
