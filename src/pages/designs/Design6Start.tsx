import { useNavigate } from 'react-router-dom'
import DesignSwitcher from './DesignSwitcher'
import Design6Shell from './Design6Shell'
import { mockPatients, type MockPatient } from './mockData'
import { initialResultsFor } from './reportFields'

const STATUS_META: Record<MockPatient['status'], { dot: string; label: string }> = {
  completed: { dot: '#b3382c', label: 'Ready' },
  partial: { dot: '#1a1a1a', label: 'Partial' },
  draft: { dot: '#d8d5cf', label: 'Not started' }
}

export default function Design6Start() {
  const navigate = useNavigate()
  const unfinished = mockPatients.filter((p) => p.status !== 'completed')

  const openPatient = (p: MockPatient) => {
    if (p.status === 'draft') navigate('/designs/6/tests', { state: { patient: p } })
    else if (p.status === 'partial') navigate('/designs/6/report', { state: { patient: p } })
    else navigate('/designs/6/preview', { state: { patient: p, results: initialResultsFor(p) } })
  }

  return (
    <div className="min-h-screen bg-[#f4f3f0] pt-9">
      <DesignSwitcher current={6} />
      <Design6Shell
        headerRight={
          <button
            onClick={() => navigate('/designs/6/settings')}
            className="text-[14px] font-semibold text-[#767470] hover:text-[#8f2c23] whitespace-nowrap flex-shrink-0"
          >
            ⚙ Settings
          </button>
        }
      >
        <div className="bg-white rounded-2xl p-8" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <div className="flex gap-3 mb-6">
            <input
              placeholder="🔍 Find patient by name or SID..."
              className="flex-1 min-w-0 px-4 py-[15px] text-[16px] border-[1.5px] border-[#d8d5cf] rounded-[10px] outline-none focus:border-[#1a1a1a]"
            />
            <button
              onClick={() => navigate('/designs/6/new')}
              className="px-[22px] py-[15px] text-[16px] font-bold rounded-[10px] bg-[#b3382c] text-white hover:bg-[#8f2c23] whitespace-nowrap flex-shrink-0"
            >
              + New
            </button>
          </div>

          <div className="text-[13px] font-semibold text-[#9a9790] uppercase tracking-[.02em] mb-1.5">
            Today — {unfinished.length} unfinished
          </div>

          <div>
            {mockPatients.map((p, i) => {
              const meta = STATUS_META[p.status]
              return (
                <button
                  key={p.id}
                  onClick={() => openPatient(p)}
                  className={`w-full flex items-center gap-3.5 py-4 px-1 text-left ${
                    i < mockPatients.length - 1 ? 'border-b-[1.5px] border-[#ece9e3]' : ''
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: meta.dot }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[17px] font-semibold text-[#1a1a1a] truncate">{p.name}</div>
                    <div className="text-[14px] text-[#767470] truncate">
                      {p.age}{p.ageUnit} · SID {p.sid.replace('SID-', '')}
                      {p.referredBy && p.referredBy !== 'Self' && ` · ${p.referredBy}`}
                    </div>
                  </div>
                  <span className="text-[14px] text-[#767470] flex-shrink-0">{meta.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </Design6Shell>
    </div>
  )
}
