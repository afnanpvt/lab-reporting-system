import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { listPatientsWithStatus, type Patient, type PatientWithStatus } from './api'
import { PatientCard, statusCard } from './PatientCard'

export default function Patients() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<PatientWithStatus[]>([])
  const newPatient = () => navigate('/patient/new')
  const openPatient = (p: Patient) => navigate(`/report/${p.id}`, { state: { patient: p } })

  useEffect(() => {
    listPatientsWithStatus().then(setRows)
  }, [])

  const filtered = rows.filter(
    ({ patient: p }) =>
      !query.trim() ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.sid.toLowerCase().includes(query.toLowerCase())
  )

  const counts = {
    completed: rows.filter((r) => r.status === 'completed').length,
    partial: rows.filter((r) => r.status === 'partial').length,
    draft: rows.filter((r) => r.status === 'draft').length
  }

  return (
      <main className="px-10 py-9">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[26px] font-semibold text-[var(--ink)]">Patients</h1>
            <p className="text-[15px] text-[var(--ink-2)]">{rows.length} registered · who handled each one, at a glance</p>
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
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-full"
                style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}` }}
              >
                {counts[key]} {s.label}
              </span>
            )
          })}
        </div>

        <div className="relative mb-6 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or SID"
            className="w-full pl-10 pr-3.5 py-2.5 text-[14.5px] border border-[var(--border-strong)] rounded-xl bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)] focus:border-[var(--accent)]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((r, i) => (
            <PatientCard key={r.patient.id} patient={r.patient} status={r.status} index={i} onOpen={openPatient} />
          ))}
          {filtered.length === 0 && (
            <p className="text-[14px] text-[var(--ink-3)] col-span-full py-8 text-center">No patients match "{query}".</p>
          )}
        </div>
      </main>
  )
}
