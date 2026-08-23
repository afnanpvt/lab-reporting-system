import { useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FlaskConical, ArrowLeft, Pencil } from 'lucide-react'
import DesignSwitcher from './DesignSwitcher'
import { mockPatients, type MockPatient } from './mockData'
import { SECTION_FIELD_KEYS, sectionKeyForLabel, humanizeKey, unitFor, getReferenceRange, defaultValueForRange, initialResultsFor } from './reportFields'

export default function Design5ReportEntry() {
  const navigate = useNavigate()
  const location = useLocation()
  const patient = (location.state as { patient?: MockPatient })?.patient ?? mockPatients[0]
  const [results, setResults] = useState(() => initialResultsFor(patient))
  const sectionKeys = useMemo(() => patient.sections.map(sectionKeyForLabel).filter(Boolean) as string[], [patient])
  const [activeKey, setActiveKey] = useState(sectionKeys[0] ?? '')

  const fields = SECTION_FIELD_KEYS[activeKey] ?? []
  const activeData = results[activeKey] ?? {}
  const filled = Object.values(activeData).filter((v) => v.trim() !== '').length

  const updateField = (key: string, value: string) => {
    setResults((r) => ({ ...r, [activeKey]: { ...(r[activeKey] ?? {}), [key]: value } }))
  }

  return (
    <div className="h-screen overflow-y-auto bg-white pt-9 text-[13.5px] flex flex-col">
      <DesignSwitcher current={5} screen={`Report — ${patient.name}`} />

      <header className="flex items-center gap-3 px-4 h-11 border-b border-[#e2e5e6] flex-shrink-0">
        <FlaskConical size={15} className="text-[#2c7a73] flex-shrink-0" />
        <button onClick={() => navigate('/designs/5')} className="inline-flex items-center gap-1 text-[#5c6569] hover:text-[#1a2023]">
          <ArrowLeft size={13} />
          Register
        </button>
        <span className="text-[#cbd1d3]">|</span>
        <span className="font-semibold text-[#1a2023]">{patient.name}</span>
        <button onClick={() => navigate('/designs/5/new', { state: { patient } })} className="text-[#8a9094] hover:text-[#2c7a73]" title="Edit patient">
          <Pencil size={12} />
        </button>
        <span className="text-[#8a9094]">{patient.age}{patient.ageUnit}/{patient.gender} · {patient.sid}</span>
        <div className="flex-1" />
        <button
          onClick={() => navigate('/designs/5/preview', { state: { patient, results } })}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#2c7a73] text-white text-[12.5px] font-medium rounded hover:bg-[#1f5a55]"
        >
          Review (⌘R)
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        <nav className="w-44 flex-shrink-0 overflow-y-auto border-r border-[#e2e5e6] bg-[#f9fafa]">
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
                className={`w-full flex items-center justify-between gap-1 px-3 py-2 text-left border-b border-[#eef0f1] ${
                  active ? 'bg-[#e6f2f0] text-[#1a2023] font-semibold' : 'text-[#5c6569] hover:bg-white'
                }`}
              >
                <span className="truncate">{label}</span>
                <span className={`text-[10.5px] flex-shrink-0 ${done === total ? 'text-[#2f7d4f]' : 'text-[#a3adba]'}`}>{done}/{total}</span>
              </button>
            )
          })}
        </nav>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl px-4 py-3">
            <div className="flex items-baseline justify-between mb-2">
              <span className="font-semibold text-[#1a2023]">
                {patient.sections.find((s) => sectionKeyForLabel(s) === activeKey) ?? activeKey}
              </span>
              <span className="text-[12px] text-[#5c6569]">{filled} of {fields.length} entered</span>
            </div>

            <div className="flex items-center gap-2 px-2 py-1 text-[10.5px] uppercase tracking-wide text-[#8a9094]">
              <span style={{ width: '11rem' }}>Field</span>
              <span style={{ width: '6.5rem' }}>Value</span>
              <span style={{ width: '3.5rem' }}>Unit</span>
              <span>Normal Range</span>
            </div>

            <div className="border border-[#e2e5e6] rounded-md overflow-hidden">
              {fields.map((f, i) => {
                const range = getReferenceRange(activeKey, f, patient.gender)
                return (
                  <div key={f} className={`flex items-center gap-2 px-2 py-1.5 ${i % 2 === 1 ? 'bg-[#fafbfb]' : 'bg-white'}`}>
                    <span className="text-[#1a2023] flex-shrink-0" style={{ width: '11rem' }}>{humanizeKey(f)}</span>
                    <input
                      value={activeData[f] ?? ''}
                      onChange={(e) => updateField(f, e.target.value)}
                      style={{ width: '6.5rem' }}
                      className="flex-shrink-0 px-1.5 py-1 text-center border border-[#cbd1d3] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#2c7a73]"
                    />
                    <span className="text-[#8a9094] flex-shrink-0" style={{ width: '3.5rem' }}>{unitFor(activeKey, f)}</span>
                    {range ? (
                      <button
                        onClick={() => updateField(f, defaultValueForRange(range))}
                        title="Click to use as default value"
                        className="text-[#5c6569] hover:text-[#1f5a55] hover:underline text-left truncate"
                      >
                        {range}
                      </button>
                    ) : (
                      <span className="text-[#cbd1d3]">—</span>
                    )}
                  </div>
                )
              })}
              {fields.length === 0 && (
                <div className="px-2 py-3 text-[#8a9094]">No fields configured for this section.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
