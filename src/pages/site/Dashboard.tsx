import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ClipboardList, Clock3, CheckCircle2, ChevronRight } from 'lucide-react'
import Shell from './Shell'
import { mockPatients, getStats, type MockPatient } from './mockData'
import { PatientCard } from './PatientCard'

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
  const openPatient = (p: MockPatient) => navigate(`/site/report/${p.id}`, { state: { patient: p } })
  const recent = mockPatients.slice(0, 6)
  const stats = getStats()
  const [greeting] = useState(pickGreeting)

  return (
    <Shell>
      <main className="px-10 py-9">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[26px] font-semibold text-[#1a2430]">{greeting}</h1>
            <p className="text-[15px] text-[#57677a]">Here's where things stand across the lab today</p>
          </div>
          <button
            onClick={() => navigate('/site/patient/new')}
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#1b6fae] text-white text-[15px] font-medium rounded-2xl hover:bg-[#125483] shadow-sm"
          >
            <Plus size={16} />
            New Patient
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-9 max-w-3xl">
          <button onClick={() => navigate('/site/patients')} className="text-left rounded-2xl p-5 bg-white border border-[#e1e6ec] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-[#8593a3] mb-2"><ClipboardList size={15} /><span className="text-[12.5px] font-semibold uppercase tracking-wide">Registered</span></div>
            <div className="text-[32px] font-semibold text-[#1a2430]">{stats.today}</div>
          </button>
          <button onClick={() => navigate('/site/patients')} className="text-left rounded-2xl p-5 bg-white border border-[#e1e6ec] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-[#9a6b00] mb-2"><Clock3 size={15} /><span className="text-[12.5px] font-semibold uppercase tracking-wide">Needs attention</span></div>
            <div className="text-[32px] font-semibold text-[#1a2430]">{stats.pending}</div>
          </button>
          <button onClick={() => navigate('/site/reports')} className="text-left rounded-2xl p-5 bg-white border border-[#e1e6ec] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-[#1f8a54] mb-2"><CheckCircle2 size={15} /><span className="text-[12.5px] font-semibold uppercase tracking-wide">Completed</span></div>
            <div className="text-[32px] font-semibold text-[#1a2430]">{stats.completed}</div>
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-[#1a2430]">Recent patients</h2>
          <button onClick={() => navigate('/site/patients')} className="text-[13.5px] text-[#1b6fae] hover:text-[#125483] font-medium inline-flex items-center gap-1">
            View all patients <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {recent.map((p, i) => (
            <PatientCard key={p.id} patient={p} index={i} onOpen={openPatient} />
          ))}
        </div>
      </main>
    </Shell>
  )
}
