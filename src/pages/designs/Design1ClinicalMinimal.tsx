import { useNavigate } from 'react-router-dom'
import { Search, Plus, ChevronRight, FlaskConical, Settings } from 'lucide-react'
import DesignSwitcher from './DesignSwitcher'
import { mockPatients, type MockPatient } from './mockData'

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

const statusDot: Record<string, string> = {
  completed: '#2f7d4f',
  partial: '#8a5a00',
  draft: '#8a9094'
}

export default function Design1ClinicalMinimal() {
  const navigate = useNavigate()
  const openPatient = (p?: MockPatient) => navigate('/designs/1/new', { state: { patient: p } })

  return (
    <div className="h-screen overflow-y-auto bg-[#f6f7f7] pt-9">
      <DesignSwitcher current={1} />

      <header className="flex items-center gap-4 pl-6 pr-6 h-[76px] border-b border-[#e2e5e6] bg-white">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#2c7a73] flex items-center justify-center">
            <FlaskConical size={24} className="text-white" />
          </div>
          <div className="leading-snug">
            <div className="text-[21px] font-semibold text-[#1a2023]">Sunrise Diagnostics</div>
            <div className="text-[13.5px] text-[#5c6569]">Laboratory Reporting System</div>
          </div>
        </div>
        <div className="flex-1" />
        <button className="p-2.5 rounded-lg hover:bg-[#f6f7f7]">
          <Settings size={19} className="text-[#5c6569]" />
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-16 pb-10">
        <div className="flex items-center gap-3 mb-9">
          <div className="flex-1 flex items-center gap-3 border border-[#cbd1d3] rounded-xl bg-white px-4 py-3.5">
            <Search size={17} className="text-[#8a9094]" />
            <input
              className="flex-1 text-[17px] bg-transparent outline-none placeholder:text-[#8a9094]"
              placeholder="Find a patient by name or SID"
              readOnly
            />
          </div>
          <button
            onClick={() => openPatient()}
            className="inline-flex items-center gap-2 px-4 py-3.5 bg-[#2c7a73] text-white text-[15px] font-medium rounded-xl hover:bg-[#1f5a55] transition-colors"
          >
            <Plus size={15} />
            New Patient
          </button>
        </div>

        <p className="text-[14.5px] font-medium text-[#5c6569] mb-3 px-1">
          Today — {mockPatients.filter((p) => p.status !== 'completed').length} unfinished
        </p>

        <div>
          {mockPatients.map((p) => (
            <div
              key={p.id}
              onClick={() => openPatient(p)}
              className="w-full flex items-center gap-3.5 py-3.5 px-1 border-t border-[#e2e5e6] hover:bg-white rounded-lg transition-colors cursor-pointer"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[12.5px] font-semibold text-white flex-shrink-0"
                style={{ backgroundColor: p.gender === 'M' ? '#1f5fa8' : '#a8447f' }}
              >
                {initials(p.name)}
              </div>
              <div className="min-w-0">
                <div className="text-[16px] font-medium text-[#1a2023] truncate">{p.name}</div>
                <div className="text-[14px] text-[#5c6569]">
                  {p.age}{p.ageUnit} · {p.gender === 'M' ? 'Male' : 'Female'} · {p.sid}
                  {p.referredBy && <> · {p.referredBy}</>}
                </div>
              </div>
              <div className="flex-1" />
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusDot[p.status] }} />
              <span className="text-[14px] text-[#5c6569] w-12 text-right flex-shrink-0">{p.regTime}</span>
              <ChevronRight size={14} className="text-[#8a9094] flex-shrink-0" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
