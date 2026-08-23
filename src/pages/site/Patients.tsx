import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import Shell from './Shell'
import { mockPatients, computePatientStatus, type MockPatient } from './mockData'
import { PatientCard, statusCard } from './PatientCard'

export default function Patients() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const newPatient = () => navigate('/site/patient/new')
  const openPatient = (p: MockPatient) => navigate(`/site/report/${p.id}`, { state: { patient: p } })

  const filtered = mockPatients.filter((p) =>
    !query.trim() ||
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.sid.toLowerCase().includes(query.toLowerCase())
  )

  const liveStatuses = mockPatients.map(computePatientStatus)
  const counts = {
    completed: liveStatuses.filter((s) => s === 'completed').length,
    partial: liveStatuses.filter((s) => s === 'partial').length,
    draft: liveStatuses.filter((s) => s === 'draft').length
  }

  return (
    <Shell>
      <main className="px-10 py-9">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[26px] font-semibold text-[#1a2430]">Patients</h1>
            <p className="text-[15px] text-[#57677a]">{mockPatients.length} registered · who handled each one, at a glance</p>
          </div>
          <button
            onClick={newPatient}
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#1b6fae] text-white text-[15px] font-medium rounded-2xl hover:bg-[#125483] shadow-sm"
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
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8593a3]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or SID"
            className="w-full pl-10 pr-3.5 py-2.5 text-[14.5px] border border-[#c7cfd9] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1b6fae]/25 focus:border-[#1b6fae]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p, i) => (
            <PatientCard key={p.id} patient={p} index={i} onOpen={openPatient} />
          ))}
          {filtered.length === 0 && (
            <p className="text-[14px] text-[#8593a3] col-span-full py-8 text-center">No patients match "{query}".</p>
          )}
        </div>
      </main>
    </Shell>
  )
}
