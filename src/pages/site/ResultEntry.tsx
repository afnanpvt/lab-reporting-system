import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, ArrowLeft, ChevronLeft, ChevronRight, Eye, IndianRupee, Pencil, Stethoscope } from 'lucide-react'
import Shell from './Shell'
import { getResultsFor, setSectionResults, patientById, mockPatients, doctorByName, type MockPatient } from './mockData'
import { humanizeKey, getReferenceRange, unitFor, flagFor, sectionKeyForLabel, defaultValueForRange } from './reportFields'
import { SECTION_FIELD_KEYS, HAEMATOLOGY_SUBGROUPS, ANTIBIOTICS, getCompletionState, type CompletionState } from '../../types/lab'

const FOCUSABLE_SELECTOR = 'input, .abx-btn'

function resolvePatient(location: ReturnType<typeof useLocation>, idParam?: string): MockPatient {
  const fromState = (location.state as { patient?: MockPatient })?.patient
  if (fromState) return fromState
  const fromParam = idParam ? patientById(Number(idParam)) : undefined
  return fromParam ?? mockPatients[0]
}

export default function ResultEntry() {
  const location = useLocation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const patient = resolvePatient(location, id)

  const categories = useMemo(
    () => patient.sections.map((label) => ({ label, key: sectionKeyForLabel(label)! })).filter((c) => c.key),
    [patient]
  )

  const [resultsVersion, setResultsVersion] = useState(0)
  const results = getResultsFor(patient)
  const [activeIndex, setActiveIndex] = useState(0)
  const paneRef = useRef<HTMLDivElement>(null)
  const pendingFocusRef = useRef(false)

  useEffect(() => {
    const firstIncomplete = categories.findIndex(
      (c) => getCompletionState(c.key, results[c.key] ?? {}) !== 'complete'
    )
    setActiveIndex(firstIncomplete === -1 ? 0 : firstIncomplete)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id])

  useEffect(() => {
    if (!pendingFocusRef.current) return
    pendingFocusRef.current = false
    const t = setTimeout(() => {
      paneRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus()
      paneRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }, 20)
    return () => clearTimeout(t)
  }, [activeIndex])

  const patientIndex = mockPatients.findIndex((p) => p.id === patient.id)
  const prevPatient = patientIndex > 0 ? mockPatients[patientIndex - 1] : undefined
  const nextPatient = patientIndex !== -1 && patientIndex < mockPatients.length - 1 ? mockPatients[patientIndex + 1] : undefined
  const goToPatient = (p?: MockPatient) => { if (p) navigate(`/site/report/${p.id}`, { state: { patient: p } }) }

  const active = categories[activeIndex]
  const activeData = results[active?.key] ?? {}

  const updateField = useCallback((field: string, value: string) => {
    const merged = { ...(results[active.key] ?? {}), [field]: value }
    setSectionResults(patient.id, active.key, merged)
    setResultsVersion((v) => v + 1)
  }, [active, patient.id, results])

  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= categories.length) return
    setActiveIndex(idx)
    pendingFocusRef.current = true
  }, [categories.length])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isEnter = e.key === 'Enter'
    const isForwardTab = e.key === 'Tab' && !e.shiftKey
    if (!isEnter && !isForwardTab) return
    const pane = paneRef.current
    if (!pane) return
    const fields = Array.from(pane.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    const i = fields.indexOf(e.target as HTMLElement)
    if (i === -1) return
    if (i < fields.length - 1) {
      if (isEnter) { e.preventDefault(); fields[i + 1].focus(); fields[i + 1].scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }
    } else if (activeIndex < categories.length - 1) {
      e.preventDefault()
      goTo(activeIndex + 1)
    }
  }

  if (!active) {
    return (
      <Shell>
        <main className="px-10 py-9">
          <p className="text-[15px] text-[#57677a]">This patient has no tests selected.</p>
        </main>
      </Shell>
    )
  }

  const totalCount = SECTION_FIELD_KEYS[active.key]?.length ?? 0
  const filledCount = Object.values(activeData).filter((v) => v && v.trim() !== '').length
  const completion = getCompletionState(active.key, activeData)

  return (
    <Shell>
      <div className="flex flex-col h-screen">
        {/* Patient context bar */}
        <div className="flex items-center gap-4 px-8 py-4 bg-white border-b border-[#e1e6ec] flex-shrink-0">
          <button
            onClick={() => navigate('/site/patients')}
            className="inline-flex items-center gap-1.5 text-[14px] text-[#8593a3] hover:text-[#1a2430]"
          >
            <ArrowLeft size={15} />
            Patients
          </button>
          <div className="h-5 w-px bg-[#e1e6ec]" />

          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPatient(prevPatient)}
              disabled={!prevPatient}
              title={prevPatient ? `Previous: ${prevPatient.name}` : 'No previous patient'}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8593a3] hover:bg-[#eef2f6] hover:text-[#1a2430] disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => goToPatient(nextPatient)}
              disabled={!nextPatient}
              title={nextPatient ? `Next: ${nextPatient.name}` : 'No next patient'}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8593a3] hover:bg-[#eef2f6] hover:text-[#1a2430] disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[16px] font-semibold text-[#1a2430] leading-tight">{patient.name}</span>
              <button
                onClick={() => navigate('/site/patient/new', { state: { patient } })}
                title="Edit patient details"
                className="text-[#8593a3] hover:text-[#1b6fae] p-0.5 rounded"
              >
                <Pencil size={13} />
              </button>
            </div>
            <div className="text-[13px] text-[#57677a] leading-tight">
              {patient.age}{patient.ageUnit} · {patient.gender === 'M' ? 'Male' : 'Female'} · {patient.sid}
            </div>
          </div>
          {patient.referredBy !== 'Self' && (
            <span
              className="inline-flex items-center gap-1.5 text-[13px] text-[#125483] bg-[#e8f1f9] px-2.5 py-1.5 rounded-full"
              title="Doctor handling this patient"
            >
              <Stethoscope size={12} />
              {doctorByName(patient.referredBy)?.name ?? patient.referredBy}
            </span>
          )}
          <div className="flex-1" />
          <span className="text-[13px] text-[#8593a3] flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-[#7fae90]" />
            Saved
          </span>
          <button
            onClick={() => navigate(`/site/bill/${patient.id}`, { state: { patient } })}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#1a2430] text-[14px] font-medium border border-[#c7cfd9] rounded-xl hover:bg-[#eef2f6]"
          >
            <IndianRupee size={14} />
            Bill
          </button>
          <button
            onClick={() => navigate(`/site/preview/${patient.id}`, { state: { patient } })}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1b6fae] text-white text-[14px] font-medium rounded-xl hover:bg-[#125483] shadow-sm"
          >
            <Eye size={14} />
            Review report
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Local rail — a checklist for this patient, not app navigation */}
          <nav className="w-[220px] flex-shrink-0 bg-white border-r border-[#e1e6ec] py-3 overflow-y-auto">
            {categories.map((c, idx) => {
              const state: CompletionState = getCompletionState(c.key, results[c.key] ?? {})
              const isActive = idx === activeIndex
              return (
                <button
                  key={c.key}
                  onClick={() => goTo(idx)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[14.5px] relative transition-colors"
                  style={{
                    color: isActive ? '#1a2430' : '#8593a3',
                    fontWeight: isActive ? 600 : 400,
                    background: isActive ? '#e8f1f9' : 'transparent'
                  }}
                >
                  {isActive && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#1b6fae]" />}
                  <Dot state={state} />
                  <span className="truncate">{c.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Focused workspace */}
          <div className="flex-1 overflow-y-auto bg-[#f5f7fa]" ref={paneRef} onKeyDown={handleKeyDown}>
            <div className="max-w-[820px] mx-auto px-9 py-7">
              <div className="flex items-baseline justify-between mb-1.5">
                <h2 className="text-[22px] font-semibold text-[#1a2430]">{active.label}</h2>
                <span className="text-[13.5px] text-[#57677a]">
                  {completion === 'empty' ? 'Not started' : `${filledCount} of ${totalCount} entered`}
                </span>
              </div>
              <div className="h-[3px] rounded-full bg-[#e1e6ec] mb-6 overflow-hidden">
                <div
                  className="h-full bg-[#1b6fae] rounded-full transition-all"
                  style={{ width: totalCount ? `${Math.round((filledCount / totalCount) * 100)}%` : '0%' }}
                />
              </div>

              {active.key === 'haematology' && (
                <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[13px] mb-5">
                  <span className="text-[#8593a3]">Jump to:</span>
                  {HAEMATOLOGY_SUBGROUPS.map((g, i) => (
                    <span key={g.id}>
                      <button className="text-[#125483] underline" onClick={() => document.getElementById('sg-' + g.id)?.scrollIntoView({ block: 'start', behavior: 'smooth' })}>
                        {g.label}
                      </button>
                      {i < HAEMATOLOGY_SUBGROUPS.length - 1 && <span className="text-[#a8b4c2]"> · </span>}
                    </span>
                  ))}
                </div>
              )}

              <SectionBody
                sectionKey={active.key}
                gender={patient.gender}
                data={activeData}
                onChange={updateField}
              />
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}

function Dot({ state }: { state: CompletionState }) {
  if (state === 'complete') return <span className="w-2 h-2 rounded-full bg-[#7fae90] flex-shrink-0" />
  if (state === 'partial') return <span className="w-2 h-2 rounded-full bg-[#1b6fae] opacity-60 flex-shrink-0" />
  return <span className="w-2 h-2 rounded-full border-[1.5px] border-[#a8b4c2] flex-shrink-0" />
}

function FieldRow({ sectionKey, fieldKey, gender, value, onChange, indent }: {
  sectionKey: string; fieldKey: string; gender: string; value: string; onChange: (v: string) => void; indent?: boolean
}) {
  const label = humanizeKey(fieldKey)
  const unit = unitFor(sectionKey, fieldKey)
  const range = getReferenceRange(sectionKey, fieldKey, gender)
  const flag = flagFor(value, range)
  const flagColor = flag === 'high' ? '#c0392b' : flag === 'low' ? '#3b6ea5' : undefined

  return (
    <div className={`flex items-center gap-3 py-2.5 border-b border-[#eaeef2] ${indent ? 'pl-6' : ''}`}>
      <span className="text-[15px] text-[#1a2430] flex-shrink-0" style={{ width: '13rem' }} title={label}>
        {indent && <span className="text-[#a8b4c2] mr-1.5">–</span>}
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-center text-[15px] px-2 py-1.5 rounded-lg border bg-white flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[#1b6fae]/25"
        style={{ width: '7rem', fontFamily: 'Consolas, monospace', borderColor: flagColor ?? '#c7cfd9', color: flagColor ?? '#1a2430', fontWeight: flag ? 600 : 400 }}
      />
      <span className="text-[13.5px] text-[#57677a] flex-shrink-0" style={{ width: '6rem' }}>{unit}</span>
      {range && (
        !value ? (
          <button
            type="button"
            onClick={() => onChange(defaultValueForRange(range))}
            title="Use this range as the starting value"
            className="text-[13px] text-[#57677a] hover:text-[#125483] hover:bg-[#e8f1f9] flex-1 text-right whitespace-nowrap rounded-md px-1.5 py-0.5 -mr-1.5 transition-colors"
          >
            {range}
          </button>
        ) : (
          <span className="text-[13px] text-[#57677a] flex-1 text-right whitespace-nowrap px-1.5">
            {flag === 'high' && <span style={{ color: '#c23b33' }}>▲ </span>}
            {flag === 'low' && <span style={{ color: '#1b6fae' }}>▼ </span>}
            {range}
          </span>
        )
      )}
    </div>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-5 pb-1.5">
      <span className="text-[12px] font-bold uppercase tracking-widest text-[#8593a3]">{children}</span>
      <div className="flex-1 h-px bg-[#e1e6ec]" />
    </div>
  )
}

function SectionBody({ sectionKey, gender, data, onChange }: {
  sectionKey: string; gender: string; data: Record<string, string>; onChange: (f: string, v: string) => void
}) {
  const v = (k: string) => data[k] ?? ''
  const set = (k: string) => (val: string) => onChange(k, val)

  if (sectionKey === 'haematology') {
    return (
      <div>
        {HAEMATOLOGY_SUBGROUPS.map((g) => (
          <div key={g.id} id={'sg-' + g.id}>
            <SubHeading>{g.label}</SubHeading>
            {g.keys.map((k) => (
              <FieldRow key={k} sectionKey={sectionKey} fieldKey={k} gender={gender} value={v(k)} onChange={set(k)}
                indent={g.id === 'differential' || (g.id === 'esr' && k !== 'esr')} />
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (sectionKey === 'cs') {
    return (
      <div>
        <FieldRow sectionKey={sectionKey} fieldKey="specimen" gender={gender} value={v('specimen')} onChange={set('specimen')} />
        <FieldRow sectionKey={sectionKey} fieldKey="organism" gender={gender} value={v('organism')} onChange={set('organism')} />
        <FieldRow sectionKey={sectionKey} fieldKey="colony_count" gender={gender} value={v('colony_count')} onChange={set('colony_count')} />
        <SubHeading>Antibiogram</SubHeading>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 py-1">
          {ANTIBIOTICS.map(({ key, label }) => {
            const fieldKey = 'abx_' + key
            const current = v(fieldKey)
            return (
              <div key={key} className="flex items-center justify-between gap-3 py-1.5 border-b border-[#eaeef2]">
                <span className="text-[14.5px] text-[#1a2430]">{label}</span>
                <div className="flex rounded-md overflow-hidden border border-[#c7cfd9] flex-shrink-0">
                  {(['S', 'I', 'R'] as const).map((opt, i) => {
                    const isActive = current === opt
                    const bg = opt === 'S' ? '#eaf5ee' : opt === 'I' ? '#fdf3df' : '#fbeae8'
                    const fg = opt === 'S' ? '#2f7d4f' : opt === 'I' ? '#8a5a00' : '#b3261e'
                    return (
                      <button
                        key={opt}
                        onClick={() => set(fieldKey)(isActive ? '' : opt)}
                        className="abx-btn w-8 h-7 text-[11.5px] font-bold"
                        style={{ borderLeft: i > 0 ? '1px solid #c7cfd9' : 'none', background: isActive ? bg : '#fff', color: isActive ? fg : '#a8b4c2' }}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-4">
          <span className="block text-[15px] text-[#1a2430] mb-2">Remarks</span>
          <textarea
            value={v('remarks')}
            onChange={(e) => set('remarks')(e.target.value)}
            rows={2}
            className="w-full px-3.5 py-2.5 text-[15px] border border-[#c7cfd9] rounded-xl bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#1b6fae]/25"
          />
        </div>
      </div>
    )
  }

  const keys = SECTION_FIELD_KEYS[sectionKey] ?? []
  return (
    <div>
      {keys.map((k) => (
        <FieldRow key={k} sectionKey={sectionKey} fieldKey={k} gender={gender} value={v(k)} onChange={set(k)} />
      ))}
    </div>
  )
}
