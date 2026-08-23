import { useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutGrid, Users, FileText, Settings, FlaskConical, ArrowLeft, Pencil } from 'lucide-react'
import DesignSwitcher from './DesignSwitcher'
import { mockPatients, type MockPatient } from './mockData'
import { SECTION_FIELD_KEYS, sectionKeyForLabel, humanizeKey, unitFor, getReferenceRange, defaultValueForRange, initialResultsFor } from './reportFields'

export default function Design2ReportEntry() {
  const navigate = useNavigate()
  const location = useLocation()
  const patient = (location.state as { patient?: MockPatient })?.patient ?? mockPatients[0]
  const [results, setResults] = useState(() => initialResultsFor(patient))
  const sectionKeys = useMemo(() => patient.sections.map(sectionKeyForLabel).filter(Boolean) as string[], [patient])
  const [activeKey, setActiveKey] = useState(sectionKeys[0] ?? '')

  const navItems = [
    { icon: LayoutGrid, label: 'Dashboard', active: false, onClick: () => navigate('/designs/2') },
    { icon: Users, label: 'Patients', active: true, onClick: () => navigate('/designs/2') },
    { icon: FileText, label: 'Reports', active: false, onClick: () => navigate('/designs/2') },
    { icon: Settings, label: 'Settings', active: false, onClick: () => navigate('/designs/2/settings') }
  ]

  const fields = SECTION_FIELD_KEYS[activeKey] ?? []
  const activeData = results[activeKey] ?? {}
  const filled = Object.values(activeData).filter((v) => v.trim() !== '').length

  const updateField = (key: string, value: string) => {
    setResults((r) => ({ ...r, [activeKey]: { ...(r[activeKey] ?? {}), [key]: value } }))
  }

  return (
    <div className="h-screen overflow-y-auto bg-[#f1f4f8] pt-9 flex">
      <DesignSwitcher current={2} screen={`Report — ${patient.name}`} />

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

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-4 px-6 h-16 flex-shrink-0 border-b border-[#dbe2ea] bg-white">
          <button onClick={() => navigate('/designs/2')} className="inline-flex items-center gap-1.5 text-[13.5px] text-[#5c6b80] hover:text-[#0f1b2d]">
            <ArrowLeft size={14} />
            Register
          </button>
          <div className="w-px h-6 bg-[#dbe2ea]" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[16px] font-semibold text-[#0f1b2d]">{patient.name}</span>
              <button onClick={() => navigate('/designs/2/new', { state: { patient } })} className="text-[#8a97a8] hover:text-[#1f5fa8]" title="Edit patient info">
                <Pencil size={13} />
              </button>
            </div>
            <div className="text-[13px] text-[#5c6b80]">{patient.age}{patient.ageUnit} · {patient.gender === 'M' ? 'Male' : 'Female'} · {patient.sid}</div>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => navigate('/designs/2/preview', { state: { patient, results } })}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1f5fa8] text-white text-[14px] font-medium rounded-lg hover:bg-[#184a85]"
          >
            Review Report
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          <nav className="w-56 flex-shrink-0 overflow-y-auto py-3 border-r border-[#dbe2ea] bg-white">
            {sectionKeys.map((key) => {
              const data = results[key] ?? {}
              const total = SECTION_FIELD_KEYS[key]?.length ?? 0
              const done = Object.values(data).filter((v) => v.trim() !== '').length
              const active = key === activeKey
              const label = patient.sections.find((s) => sectionKeyForLabel(s) === key) ?? key
              return (
                <button
                  key={key}
                  onClick={() => setActiveKey(key)}
                  className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-[14px] ${
                    active ? 'bg-[#e9f1fa] text-[#0f1b2d] font-semibold' : 'text-[#5c6b80] hover:bg-[#f6f9fc]'
                  }`}
                >
                  <span className="truncate">{label}</span>
                  <span className={`text-[11px] flex-shrink-0 ${done === total ? 'text-[#2f7d4f]' : 'text-[#a3adba]'}`}>{done}/{total}</span>
                </button>
              )
            })}
          </nav>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-8 py-7">
              <div className="flex items-baseline justify-between mb-1">
                <h2 className="text-[21px] font-semibold text-[#0f1b2d]">
                  {patient.sections.find((s) => sectionKeyForLabel(s) === activeKey) ?? activeKey}
                </h2>
                <span className="text-[13.5px] text-[#5c6b80]">{filled} of {fields.length} entered</span>
              </div>
              <div className="h-[3px] rounded-full mb-6 bg-[#dbe2ea]">
                <div className="h-full rounded-full bg-[#1f5fa8]" style={{ width: fields.length ? `${Math.round((filled / fields.length) * 100)}%` : '0%' }} />
              </div>

              <div className="bg-white rounded-xl border border-[#dbe2ea]">
                {fields.map((f) => {
                  const range = getReferenceRange(activeKey, f, patient.gender)
                  return (
                    <div key={f} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#eef1f5] last:border-0">
                      <span className="flex-shrink-0 text-[14px] text-[#0f1b2d]" style={{ width: '12rem' }}>{humanizeKey(f)}</span>
                      <input
                        value={activeData[f] ?? ''}
                        onChange={(e) => updateField(f, e.target.value)}
                        className="w-28 flex-shrink-0 px-2.5 py-1.5 text-[14px] text-center border border-[#dbe2ea] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1f5fa8]/25 focus:border-[#1f5fa8]"
                      />
                      <span className="text-[12.5px] text-[#8a97a8] flex-shrink-0" style={{ width: '3.5rem' }}>{unitFor(activeKey, f)}</span>
                      {range && (
                        <button
                          onClick={() => updateField(f, defaultValueForRange(range))}
                          title="Click to use as default value"
                          className="text-[12.5px] text-[#8a97a8] hover:text-[#1f5fa8] hover:underline flex-1 text-right whitespace-nowrap truncate"
                        >
                          {range}
                        </button>
                      )}
                    </div>
                  )
                })}
                {fields.length === 0 && (
                  <div className="px-4 py-6 text-[14px] text-[#8a97a8]">No fields configured for this section.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
