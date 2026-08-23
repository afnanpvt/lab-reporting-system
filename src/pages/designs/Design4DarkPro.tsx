import { useNavigate } from 'react-router-dom'
import { LayoutGrid, Users, FileText, Settings, Search, Plus, FlaskConical } from 'lucide-react'
import DesignSwitcher from './DesignSwitcher'
import { mockPatients, mockStats, type MockPatient } from './mockData'

const statusStyle: Record<string, string> = {
  completed: 'bg-[#10332b] text-[#4ade80]',
  partial: 'bg-[#3a2f10] text-[#facc15]',
  draft: 'bg-[#26292e] text-[#9ca3af]'
}

const navItems = [
  { icon: LayoutGrid, label: 'Dashboard', active: true },
  { icon: Users, label: 'Patients', active: false },
  { icon: FileText, label: 'Reports', active: false },
  { icon: Settings, label: 'Settings', active: false }
]

export default function Design4DarkPro() {
  const navigate = useNavigate()
  const openPatient = (p?: MockPatient) => navigate('/designs/4/new', { state: { patient: p } })

  return (
    <div className="h-screen overflow-y-auto bg-[#0d1117] pt-9 flex text-[#e6edf3]">
      <DesignSwitcher current={4} />

      <aside className="w-56 flex-shrink-0 bg-[#161b22] border-r border-[#21262d] flex flex-col h-[calc(100vh-36px)] sticky top-9">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-[#21262d]">
          <div className="w-8 h-8 rounded-lg bg-[#1f9d8a] flex items-center justify-center flex-shrink-0">
            <FlaskConical size={16} className="text-[#0d1117]" />
          </div>
          <span className="font-semibold text-[15px]">Sunrise Diagnostics</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14.5px] font-medium cursor-pointer ${
                active ? 'bg-[#1f9d8a]/15 text-[#3ddac4]' : 'text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3]'
              }`}
            >
              <Icon size={17} />
              {label}
            </div>
          ))}
        </nav>
        <div className="px-5 py-4 text-[12px] text-[#6e7681] border-t border-[#21262d]">v1.0 · Offline mode</div>
      </aside>

      <main className="flex-1 px-8 py-8 min-w-0">
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-[24px] font-semibold text-[#e6edf3]">Today's Register</h1>
            <p className="text-[14px] text-[#8b949e]">Tuesday, 13 August 2026</p>
          </div>
          <button
            onClick={() => openPatient()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1f9d8a] text-[#0d1117] text-[14.5px] font-semibold rounded-lg hover:bg-[#3ddac4]"
          >
            <Plus size={15} />
            New Patient
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-7">
          {[
            { label: 'Registered Today', value: mockStats.today, color: '#3ddac4' },
            { label: 'Pending Results', value: mockStats.pending, color: '#facc15' },
            { label: 'Completed', value: mockStats.completed, color: '#4ade80' }
          ].map((s) => (
            <div key={s.label} className="bg-[#161b22] rounded-xl border border-[#21262d] p-4">
              <div className="text-[13px] font-medium text-[#8b949e] mb-1.5">{s.label}</div>
              <div className="text-[26px] font-semibold" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="bg-[#161b22] rounded-xl border border-[#21262d] overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#21262d]">
            <Search size={15} className="text-[#6e7681]" />
            <input
              className="flex-1 text-[14.5px] bg-transparent outline-none placeholder:text-[#6e7681]"
              placeholder="Search by name or SID..."
              readOnly
            />
          </div>
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="text-left text-[#8b949e] text-[12px] uppercase tracking-wide border-b border-[#21262d]">
                <th className="px-4 py-2.5 font-semibold">SID</th>
                <th className="px-4 py-2.5 font-semibold">Patient</th>
                <th className="px-4 py-2.5 font-semibold">Age / Sex</th>
                <th className="px-4 py-2.5 font-semibold">Referred By</th>
                <th className="px-4 py-2.5 font-semibold">Sections</th>
                <th className="px-4 py-2.5 font-semibold">Time</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockPatients.map((p) => (
                <tr key={p.id} onClick={() => openPatient(p)} className="border-b border-[#21262d] last:border-0 hover:bg-white/[0.03] cursor-pointer">
                  <td className="px-4 py-3 font-mono text-[#8b949e]">{p.sid}</td>
                  <td className="px-4 py-3 font-medium text-[#e6edf3]">{p.name}</td>
                  <td className="px-4 py-3 text-[#8b949e]">{p.age}{p.ageUnit} / {p.gender}</td>
                  <td className="px-4 py-3 text-[#8b949e]">{p.referredBy}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {p.sections.map((s) => (
                        <span key={s} className="text-[11px] px-1.5 py-0.5 rounded bg-white/5 text-[#8b949e]">{s}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#8b949e] font-mono">{p.regTime}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11.5px] font-medium px-2 py-1 rounded-md ${statusStyle[p.status]}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
