import { useNavigate } from 'react-router-dom'
import { Search, Plus, FlaskConical, Settings } from 'lucide-react'
import DesignSwitcher from './DesignSwitcher'
import { mockPatients, mockStats, type MockPatient } from './mockData'

const statusStyle: Record<string, string> = {
  completed: 'text-[#2f7d4f]',
  partial: 'text-[#8a5a00]',
  draft: 'text-[#8a9094]'
}

const statusLabel: Record<string, string> = {
  completed: '● Done',
  partial: '● In progress',
  draft: '○ Draft'
}

export default function Design5CompactUtility() {
  const navigate = useNavigate()
  const openNewPatient = () => navigate('/designs/5/new')
  const openReport = (p: MockPatient) => navigate('/designs/5/report', { state: { patient: p } })

  return (
    <div className="h-screen overflow-y-auto bg-white pt-9 text-[13.5px]">
      <DesignSwitcher current={5} />

      <header className="flex items-center gap-3 px-4 h-11 border-b border-[#e2e5e6]">
        <FlaskConical size={15} className="text-[#2c7a73] flex-shrink-0" />
        <span className="font-semibold text-[#1a2023]">Sunrise Diagnostics</span>
        <span className="text-[#8a9094]">— Register</span>
        <div className="flex-1" />
        <span className="text-[#5c6569]">
          Today: <b className="text-[#1a2023]">{mockStats.today}</b> ·
          {' '}Pending: <b className="text-[#8a5a00]">{mockStats.pending}</b> ·
          {' '}Done: <b className="text-[#2f7d4f]">{mockStats.completed}</b>
        </span>
        <button onClick={() => navigate('/designs/5/settings')} className="p-1.5 rounded hover:bg-[#f6f7f7]">
          <Settings size={15} className="text-[#5c6569]" />
        </button>
      </header>

      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#e2e5e6]">
        <Search size={14} className="text-[#8a9094] flex-shrink-0" />
        <input
          className="flex-1 bg-transparent outline-none placeholder:text-[#8a9094]"
          placeholder="Search name, SID... (⌘K)"
          readOnly
        />
        <button
          onClick={openNewPatient}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#2c7a73] text-white text-[12.5px] font-medium rounded hover:bg-[#1f5a55]"
        >
          <Plus size={12} />
          New (⌘N)
        </button>
      </div>

      <table className="w-full">
        <thead>
          <tr className="text-left text-[#8a9094] text-[11px] uppercase tracking-wide border-b border-[#e2e5e6] bg-[#f9fafa]">
            <th className="px-4 py-1.5 font-semibold w-24">Time</th>
            <th className="px-4 py-1.5 font-semibold w-24">SID</th>
            <th className="px-4 py-1.5 font-semibold">Name</th>
            <th className="px-4 py-1.5 font-semibold w-20">Age/Sex</th>
            <th className="px-4 py-1.5 font-semibold w-32">Referred</th>
            <th className="px-4 py-1.5 font-semibold">Sections</th>
            <th className="px-4 py-1.5 font-semibold w-32">Status</th>
          </tr>
        </thead>
        <tbody>
          {mockPatients.map((p, i) => (
            <tr
              key={p.id}
              onClick={() => openReport(p)}
              className={`border-b border-[#eef0f1] cursor-pointer hover:bg-[#e6f2f0] ${i % 2 === 1 ? 'bg-[#fafbfb]' : ''}`}
            >
              <td className="px-4 py-1.5 font-mono text-[#5c6569]">{p.regTime}</td>
              <td className="px-4 py-1.5 font-mono text-[#5c6569]">{p.sid}</td>
              <td className="px-4 py-1.5 font-medium text-[#1a2023]">{p.name}</td>
              <td className="px-4 py-1.5 text-[#5c6569]">{p.age}{p.ageUnit}/{p.gender}</td>
              <td className="px-4 py-1.5 text-[#5c6569] truncate">{p.referredBy}</td>
              <td className="px-4 py-1.5 text-[#5c6569]">{p.sections.join(', ')}</td>
              <td className={`px-4 py-1.5 font-medium ${statusStyle[p.status]}`}>{statusLabel[p.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
