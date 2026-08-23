import { useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import DesignSwitcher from './DesignSwitcher'
import Design6Shell from './Design6Shell'
import { mockPatients, type MockPatient } from './mockData'
import {
  SECTION_FIELD_KEYS,
  sectionKeyForLabel,
  humanizeKey,
  unitFor,
  getReferenceRange,
  defaultValueForRange,
  flagFor,
  initialResultsFor
} from './reportFields'

export default function Design6ResultEntry() {
  const navigate = useNavigate()
  const location = useLocation()
  const patient = (location.state as { patient?: MockPatient })?.patient ?? mockPatients[0]
  const [results, setResults] = useState(() => initialResultsFor(patient))
  const sectionKeys = useMemo(() => patient.sections.map(sectionKeyForLabel).filter(Boolean) as string[], [patient])
  const [activeIdx, setActiveIdx] = useState(0)
  const activeKey = sectionKeys[activeIdx] ?? ''
  const activeLabel = patient.sections[activeIdx] ?? activeKey

  const fields = SECTION_FIELD_KEYS[activeKey] ?? []
  const activeData = results[activeKey] ?? {}
  const filled = Object.values(activeData).filter((v) => v.trim() !== '').length

  const updateField = (key: string, value: string) => {
    setResults((r) => ({ ...r, [activeKey]: { ...(r[activeKey] ?? {}), [key]: value } }))
  }

  const isLast = activeIdx === sectionKeys.length - 1
  const nextButtonLabel = isLast ? 'Review Report →' : `Next: ${patient.sections[activeIdx + 1]} →`

  const handleNext = () => {
    if (isLast) navigate('/designs/6/preview', { state: { patient, results } })
    else setActiveIdx((i) => i + 1)
  }

  return (
    <div className="min-h-screen bg-[#f4f3f0] pt-9">
      <DesignSwitcher current={6} screen={`Result Entry — ${patient.name}`} />
      <Design6Shell
        headerRight={
          <button
            onClick={() => navigate('/designs/6')}
            className="text-[14px] font-semibold text-[#767470] hover:text-[#8f2c23] whitespace-nowrap flex-shrink-0"
          >
            ← {patient.name} · {patient.age}{patient.ageUnit} · SID {patient.sid.replace('SID-', '')}
          </button>
        }
      >
        <div className="bg-white rounded-2xl p-8" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <div className="flex items-baseline justify-between mb-[18px]">
            <h1 className="text-[24px] font-bold text-[#1a1a1a] m-0">Result Entry</h1>
            <span className="text-[14px] text-[#767470]">Autosaved 2s ago</span>
          </div>

          <div className="flex gap-1.5 border-b-[1.5px] border-[#ece9e3] mb-5 overflow-x-auto">
            {patient.sections.map((label, i) => (
              <div
                key={label}
                onClick={() => setActiveIdx(i)}
                className="px-4 py-2.5 text-[15px] font-semibold whitespace-nowrap cursor-pointer"
                style={
                  i === activeIdx
                    ? { color: '#1a1a1a', borderBottom: '3px solid #1a1a1a' }
                    : { color: '#9a9790', borderBottom: '3px solid transparent' }
                }
              >
                {label}
              </div>
            ))}
          </div>

          <div
            className="grid gap-3 pb-2.5 px-1 text-[13px] font-semibold text-[#9a9790] uppercase tracking-[.02em]"
            style={{ gridTemplateColumns: '1fr 110px 90px 130px' }}
          >
            <span>Parameter</span>
            <span className="text-center">Result</span>
            <span className="text-center">Unit</span>
            <span>Reference Range</span>
          </div>

          {fields.map((f) => {
            const range = getReferenceRange(activeKey, f, patient.gender)
            const value = activeData[f] ?? ''
            const flag = flagFor(value, range)
            const abnormal = !!flag
            return (
              <div
                key={f}
                className="grid gap-3 items-center py-4 px-1 border-b-[1.5px] border-[#ece9e3] last:border-0"
                style={{ gridTemplateColumns: '1fr 110px 90px 130px' }}
              >
                <span className="text-[17px] font-semibold" style={{ color: abnormal ? '#b3382c' : '#1a1a1a' }}>
                  {humanizeKey(f)}
                </span>
                <input
                  value={value}
                  onChange={(e) => updateField(f, e.target.value)}
                  placeholder="—"
                  className="w-full box-border px-3.5 py-3 text-[18px] text-center rounded-lg outline-none"
                  style={
                    abnormal
                      ? { border: '1.5px solid #b3382c', color: '#b3382c', fontWeight: 700 }
                      : { border: '1.5px solid #d8d5cf' }
                  }
                />
                <span className="text-[15px] text-[#767470] text-center">{unitFor(activeKey, f)}</span>
                {range ? (
                  <button
                    onClick={() => updateField(f, defaultValueForRange(range))}
                    title="Click to use as default value"
                    className="text-[14px] text-[#767470] text-left hover:text-[#8f2c23] hover:underline truncate"
                  >
                    {range}
                  </button>
                ) : (
                  <span />
                )}
              </div>
            )
          })}
          {fields.length === 0 && (
            <div className="py-6 text-[15px] text-[#767470]">No fields configured for this panel.</div>
          )}

          <div className="flex items-center justify-between mt-5">
            <span className="text-[14px] text-[#767470]">{filled} of {fields.length} fields · {activeLabel}</span>
            <button
              onClick={handleNext}
              className="px-[26px] py-[15px] text-[16px] font-bold rounded-[10px] bg-[#b3382c] text-white hover:bg-[#8f2c23] whitespace-nowrap"
            >
              {nextButtonLabel}
            </button>
          </div>
        </div>
      </Design6Shell>
    </div>
  )
}
