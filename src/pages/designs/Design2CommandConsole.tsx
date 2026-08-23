import { useNavigate } from 'react-router-dom'
import { LayoutGrid, Users, FileText, Settings, Search, Plus, FlaskConical } from 'lucide-react'
import DesignSwitcher from './DesignSwitcher'
import { mockPatients, mockStats, type MockPatient } from './mockData'

const statusStyle: Record<string, string> = {
  completed: 'bg-[#eaf5ee] text-[#2f7d4f]',
  partial: 'bg-[#fcf3df] text-[#8a5a00]',
  draft: 'bg-[#eef0f1] text-[#5c6569]'
}

export default function Design2CommandConsole() {
  const navigate = useNavigate()
  const openNewPatient = () => navigate('/designs/2/new')
  const openReport = (p: MockPatient) => navigate('/designs/2/report', { state: { patient: p } })

  const navItems = [
    { icon: LayoutGrid, label: 'Dashboard', active: true, onClick: () => navigate('/designs/2') },
    { icon: Users, label: 'Patients', active: false, onClick: () => navigate('/designs/2') },
    { icon: FileText, label: 'Reports', active: false, onClick: () => navigate('/designs/2') },
    { icon: Settings, label: 'Settings', active: false, onClick: () => navigate('/designs/2/settings') }
  ]

  return (
    <div className="h-screen overflow-y-auto bg-[#f1f4f8] pt-9 flex">
      <DesignSwitcher current={2} />

      <aside className="w-56 flex-shrink-0 bg-[#12233d] text-white flex flex-col h-[calc(100vh-36px)] sticky top-9">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-[#1f5fa8] flex items-center justify-center flex-shrink-0">
            <FlaskConical size={16} />
          </div>
          <span className="font-semibold text-[15px]">Sunrise Diagnostics</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ icon: Icon, label, active, onClick }) => (
            <div
              key={label}
              onClick={onClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14.5px] font-medium cursor-pointer ${
                active ? 'bg-[#1f5fa8] text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={17} />
              {label}
            </div>
          ))}
        </nav>
        <div className="px-5 py-4 text-[12px] text-white/40 border-t border-white/10">v1.0 · Offline mode</div>
      </aside>

      <main className="flex-1 px-8 py-8 min-w-0">
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-[24px] font-semibold text-[#0f1b2d]">Today's Register</h1>
            <p className="text-[14px] text-[#5c6b80]">Tuesday, 13 August 2026</p>
          </div>
          <button
            onClick={openNewPatient}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1f5fa8] text-white text-[14.5px] font-medium rounded-lg hover:bg-[#184a85]"
          >
            <Plus size={15} />
            New Patient
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-7">
          {[
            { label: 'Registered Today', value: mockStats.today, color: '#1f5fa8' },
            { label: 'Pending Results', value: mockStats.pending, color: '#8a5a00' },
            { label: 'Completed', value: mockStats.completed, color: '#2f7d4f' }
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-[#dbe2ea] p-4">
              <div className="text-[13px] font-medium text-[#5c6b80] mb-1.5">{s.label}</div>
              <div className="text-[26px] font-semibold" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-[#dbe2ea] overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#dbe2ea]">
            <Search size={15} className="text-[#8a9094]" />
            <input
              className="flex-1 text-[14.5px] bg-transparent outline-none placeholder:text-[#8a9094]"
              placeholder="Search by name or SID..."
              readOnly
            />
          </div>
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="text-left text-[#5c6b80] text-[12px] uppercase tracking-wide border-b border-[#dbe2ea]">
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
                <tr key={p.id} onClick={() => openReport(p)} className="border-b border-[#eef1f5] last:border-0 hover:bg-[#f6f9fc] cursor-pointer">
                  <td className="px-4 py-3 font-mono text-[#5c6b80]">{p.sid}</td>
                  <td className="px-4 py-3 font-medium text-[#0f1b2d]">{p.name}</td>
                  <td className="px-4 py-3 text-[#5c6b80]">{p.age}{p.ageUnit} / {p.gender}</td>
                  <td className="px-4 py-3 text-[#5c6b80]">{p.referredBy}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {p.sections.map((s) => (
                        <span key={s} className="text-[11px] px-1.5 py-0.5 rounded bg-[#eef1f5] text-[#5c6b80]">{s}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#5c6b80]">{p.regTime}</td>
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
