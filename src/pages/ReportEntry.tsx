import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import type { Patient } from '../types/lab'
import { SECTIONS, SECTION_FIELD_KEYS, HAEMATOLOGY_SUBGROUPS, getCompletionState, type CompletionState } from '../types/lab'
import PatientContextBar from '../components/layout/PatientContextBar'
import AutosaveStatus from '../components/layout/AutosaveStatus'
import { useAutosave } from '../lib/useAutosave'
import Haematology from '../components/sections/Haematology'
import Biochemistry from '../components/sections/Biochemistry'
import Serology from '../components/sections/Serology'
import Urine from '../components/sections/Urine'
import {
  Motion, CultureSensitivity, Mantoux, GttLipid,
  BloodGroup, Electrolytes, LFT, AbgSputum
} from '../components/sections/OtherSections'

const SECTION_COMPONENTS: Record<string, React.ComponentType<any>> = {
  haematology: Haematology,
  biochemistry: Biochemistry,
  serology: Serology,
  urine: Urine,
  motion: Motion,
  cs: CultureSensitivity,
  mantoux: Mantoux,
  gtt_lipid: GttLipid,
  blood: BloodGroup,
  electrolytes: Electrolytes,
  lft: LFT,
  abg_sputum: AbgSputum
}

const FOCUSABLE_SELECTOR = 'input, select, textarea, .result-field-btn'

export default function ReportEntry() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const patientId = parseInt(id!)

  const [patient, setPatient] = useState<Patient | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [sectionData, setSectionData] = useState<Record<string, Record<string, string>>>({})
  const paneRef = useRef<HTMLDivElement>(null)
  const pendingFocusFirstRef = useRef(false)
  const autosave = useAutosave()

  useEffect(() => {
    window.api.patients.get(patientId).then(async (p) => {
      if (!p) { setLoadFailed(true); return }
      setPatient(p)

      const all = await window.api.results.getAll(patientId)
      const mapped: Record<string, Record<string, string>> = {}
      for (const [sec, res] of Object.entries(all)) {
        if (res && typeof res === 'object') {
          mapped[sec] = Object.fromEntries(
            Object.entries(res as Record<string, unknown>)
              .filter(([k]) => k !== 'patient_id')
              .map(([k, v]) => [k, v == null ? '' : String(v)])
          )
        }
      }
      setSectionData(mapped)
    }).catch(() => setLoadFailed(true))
  }, [patientId])

  const sections = useMemo(() => {
    if (!patient) return []
    const raw = typeof patient.sections === 'string' ? JSON.parse(patient.sections) : patient.sections
    return SECTIONS.filter((s) => raw.includes(s.key))
  }, [patient])

  // Resume at the first incomplete category, not always the start — this is the "where was I" recovery heuristic.
  useEffect(() => {
    if (sections.length === 0) return
    const firstIncomplete = sections.findIndex(
      (s) => getCompletionState(s.key, sectionData[s.key] ?? {}) !== 'complete'
    )
    setActiveIndex(firstIncomplete === -1 ? 0 : firstIncomplete)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.length])

  const activeSection = sections[activeIndex]
  const activeKey = activeSection?.key ?? ''
  const ActiveComponent = SECTION_COMPONENTS[activeKey]

  const saveSection = useCallback(async (key: string, data: Record<string, string>) => {
    await window.api.results.save(key, patientId, data)
  }, [patientId])

  const updateField = useCallback((field: string, value: string) => {
    const merged = { ...(sectionData[activeKey] ?? {}), [field]: value }
    setSectionData((prev) => ({ ...prev, [activeKey]: merged }))
    autosave.trigger(() => saveSection(activeKey, merged))
  }, [activeKey, sectionData, saveSection, autosave])

  const goToCategory = useCallback((idx: number) => {
    if (idx < 0 || idx >= sections.length) return
    setActiveIndex(idx)
    pendingFocusFirstRef.current = true
  }, [sections.length])

  // Focus the first field of a category right after switching into it (rail click, or crossing a boundary).
  useEffect(() => {
    if (!pendingFocusFirstRef.current) return
    pendingFocusFirstRef.current = false
    const t = setTimeout(() => {
      const first = paneRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      first?.focus()
      paneRef.current?.scrollTo({ top: 0 })
    }, 20)
    return () => clearTimeout(t)
  }, [activeIndex])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const isEnter = e.key === 'Enter'
    const isForwardTab = e.key === 'Tab' && !e.shiftKey
    if (!isEnter && !isForwardTab) return
    const pane = paneRef.current
    if (!pane) return
    const fields = Array.from(pane.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    const i = fields.indexOf(e.target as HTMLElement)
    if (i === -1) return

    if (i < fields.length - 1) {
      if (isEnter) {
        e.preventDefault()
        const next = fields[i + 1]
        next.focus()
        next.scrollIntoView({ block: 'nearest' })
      }
      // mid-category forward Tab: native focus order already matches DOM order
    } else if (activeIndex < sections.length - 1) {
      e.preventDefault()
      goToCategory(activeIndex + 1)
    }
  }, [activeIndex, sections.length, goToCategory])

  const handleReviewClick = async () => {
    if (activeKey) {
      try {
        await saveSection(activeKey, sectionData[activeKey] ?? {})
      } catch {
        // Review still proceeds — any unsaved edit remains visible if the operator returns; autosave will retry.
      }
    }
    navigate(`/preview/${patientId}`)
  }

  if (loadFailed) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="error-banner max-w-sm">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          <span>This patient record could not be found.</span>
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-accent-softBorder border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  const activeData = sectionData[activeKey] ?? {}
  const completion = getCompletionState(activeKey, activeData)
  const filledCount = (typeof activeData === 'object') ? Object.values(activeData).filter((v) => v && v.trim() !== '').length : 0
  const totalCount = SECTION_FIELD_KEYS[activeKey]?.length ?? 0

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PatientContextBar
        patient={patient}
        backTo="/"
        backLabel="Start"
        editHref={`/patient/${patientId}/edit`}
        right={
          <div className="flex items-center gap-4">
            <AutosaveStatus state={autosave.state} onRetry={autosave.retry} />
            <button className="btn-primary" onClick={handleReviewClick}>Review report</button>
          </div>
        }
      />

      <div className="flex flex-1 min-h-0">
        {/* Local category rail — a checklist for this patient, not an app sidebar */}
        <nav className="w-[220px] flex-shrink-0 overflow-y-auto py-3" style={{ borderRight: '1px solid var(--border)' }}>
          {sections.map((s, idx) => {
            const state: CompletionState = getCompletionState(s.key, sectionData[s.key] ?? {})
            const active = idx === activeIndex
            return (
              <button
                key={s.key}
                onClick={() => goToCategory(idx)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[15px] relative"
                style={{
                  color: active ? 'var(--ink)' : 'var(--ink-2)',
                  fontWeight: active ? 600 : 400,
                  background: active ? 'var(--accent-soft)' : 'transparent'
                }}
              >
                {active && <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--accent)' }} />}
                <Dot state={state} />
                <span className="truncate">{s.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Focused category workspace — one category at a time, sized to its own content */}
        <div className="flex-1 overflow-y-auto" ref={paneRef} onKeyDown={handleKeyDown}>
          <div className="max-w-[820px] mx-auto px-9 py-7">
            <div className="flex items-baseline justify-between mb-1.5">
              <h2 className="text-[23px] font-semibold text-ink">{activeSection?.label}</h2>
              <span className="text-[14px] text-ink-2">
                {completion === 'empty' ? 'Not started' : `${filledCount} of ${totalCount} entered`}
              </span>
            </div>
            <div className="h-[3px] rounded-full mb-6" style={{ background: 'var(--border)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: totalCount ? `${Math.round((filledCount / totalCount) * 100)}%` : '0%',
                  background: 'var(--accent)'
                }}
              />
            </div>

            {activeKey === 'haematology' && (
              <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[13.5px] mb-5" style={{ color: 'var(--accent-ink)' }}>
                <span className="text-ink-3">Jump to:</span>
                {HAEMATOLOGY_SUBGROUPS.map((g, i) => (
                  <span key={g.id}>
                    <button
                      className="underline"
                      onClick={() => document.getElementById('sg-' + g.id)?.scrollIntoView({ block: 'start' })}
                    >
                      {g.label}
                    </button>
                    {i < HAEMATOLOGY_SUBGROUPS.length - 1 && <span className="text-ink-3"> · </span>}
                  </span>
                ))}
              </div>
            )}

            {ActiveComponent && (
              <ActiveComponent
                gender={patient.gender}
                data={activeData}
                onChange={updateField}
              />
            )}

            {activeIndex === sections.length - 1 && (
              <div className="mt-8 pt-4 text-center text-[14px] text-ink-2" style={{ borderTop: '1px solid var(--border)' }}>
                Last category for this patient — review the report when ready.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Dot({ state }: { state: CompletionState }) {
  const style: React.CSSProperties = {
    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
    border: '1.5px solid var(--ink-3)'
  }
  if (state === 'partial') Object.assign(style, { background: 'var(--accent)', borderColor: 'var(--accent)', opacity: 0.55 })
  if (state === 'complete') Object.assign(style, { background: 'var(--success)', borderColor: 'var(--success)' })
  return <span style={style} />
}
