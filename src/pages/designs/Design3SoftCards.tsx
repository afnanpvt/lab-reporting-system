import { useNavigate } from 'react-router-dom'
import { LayoutGrid, Users, FileText, Settings, Plus, FlaskConical, Clock, User2 } from 'lucide-react'
import DesignSwitcher from './DesignSwitcher'
import { mockPatients, type MockPatient } from './mockData'

const statusCard: Record<string, { bg: string; border: string; text: string; label: string }> = {
  completed: { bg: '#f2f9f4', border: '#cfe9d7', text: '#2f7d4f', label: 'Completed' },
  partial: { bg: '#fdf7ea', border: '#f0dfad', text: '#8a5a00', label: 'In progress' },
  draft: { bg: '#fbeeee', border: '#f0d3d3', text: '#a8434a', label: 'Draft' }
}

const navItems = [
  { icon: LayoutGrid, label: 'Dashboard', active: true },
  { icon: Users, label: 'Patients', active: false },
  { icon: FileText, label: 'Reports', active: false },
  { icon: Settings, label: 'Settings', active: false }
]

export default function Design3SoftCards() {
  const navigate = useNavigate()
  const openPatient = (p?: MockPatient) => navigate('/designs/3/new', { state: { patient: p } })

  return (
    <div className="h-screen overflow-y-auto bg-[#faf8f5] pt-9 flex">
      <DesignSwitcher current={3} />

      <aside className="w-20 flex-shrink-0 bg-white border-r border-[#ece7de] flex flex-col items-center py-5 gap-6 h-[calc(100vh-36px)] sticky top-9">
        <div className="w-10 h-10 rounded-2xl bg-[#e07a5f] flex items-center justify-center">
          <FlaskConical size={18} className="text-white" />
        </div>
        <nav className="flex flex-col gap-2">
          {navItems.map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              title={label}
              className={`w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer ${
                active ? 'bg-[#fbe6de] text-[#e07a5f]' : 'text-[#a39c8f] hover:bg-[#f6f2ea]'
              }`}
            >
              <Icon size={19} />
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 px-10 py-9">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[26px] font-semibold text-[#3d3629]">Good morning 👋</h1>
            <p className="text-[15px] text-[#8a8171]">8 patients registered today, 5 still need attention</p>
          </div>
          <button
            onClick={() => openPatient()}
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#e07a5f] text-white text-[15px] font-medium rounded-2xl hover:bg-[#c96a51] shadow-sm"
          >
            <Plus size={16} />
            New Patient
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {mockPatients.map((p) => {
            const s = statusCard[p.status]
            return (
              <div
                key={p.id}
                onClick={() => openPatient(p)}
                className="rounded-2xl p-5 border shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-white"
                style={{ borderColor: '#ece7de' }}
              >
                <div className="flex items-start justify-between mb-3.5">
                  <div className="w-10 h-10 rounded-full bg-[#f6f2ea] flex items-center justify-center">
                    <User2 size={17} className="text-[#a39c8f]" />
                  </div>
                  <span
                    className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}` }}
                  >
                    {s.label}
                  </span>
                </div>
                <div className="text-[16.5px] font-semibold text-[#3d3629] mb-0.5">{p.name}</div>
                <div className="text-[13.5px] text-[#8a8171] mb-3.5">
                  {p.age}{p.ageUnit} · {p.gender === 'M' ? 'Male' : 'Female'} · {p.sid}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mb-3.5">
                  {p.sections.map((sec) => (
                    <span key={sec} className="text-[11.5px] px-2 py-1 rounded-full bg-[#f6f2ea] text-[#8a8171]">
                      {sec}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-[#f0ece3]">
                  <span className="text-[13px] text-[#a39c8f]">{p.referredBy}</span>
                  <span className="flex items-center gap-1 text-[13px] text-[#a39c8f]">
                    <Clock size={12} />
                    {p.regTime}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
