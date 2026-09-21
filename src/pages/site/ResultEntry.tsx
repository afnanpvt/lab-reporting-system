import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, ArrowLeft, ChevronLeft, ChevronRight, Eye, IndianRupee, Pencil, Stethoscope, Plus, X, Keyboard, AlertTriangle, AlertOctagon, Calculator } from 'lucide-react'
import { getPatient, getResultsFor, setSectionResults, listPatients, getRangeOverrides, setRangeOverride, getHiddenReferenceSections, setReferenceSectionHidden, type Patient, type ResultsBySection } from './api'
import { humanizeKey, getReferenceRange, defaultReferenceRange, rangeOverrideKey, unitFor, flagFor, sectionKeyForLabel, defaultValueForRange, numericRangeInfo, decodeOtherRow, encodeOtherRow, optionsFor, supportsMethodNote } from './reportFields'
import { SECTION_FIELD_KEYS, HAEMATOLOGY_SUBGROUPS, ANTIBIOTICS, getCompletionState, type CompletionState } from '../../types/lab'
import { checksForSection, type IssuesByField, type ValueIssue } from './valueChecks'

interface PendingIssue { sectionIndex: number; sectionLabel: string; field: string; issue: ValueIssue }

// Excludes the reference-range editor's own <input> (see RangeEditor's data-range-editor
// attribute) — without that, opening a range editor mid-entry would insert it into the Tab/Enter/
// Arrow flow as if it were just another value field, and pressing Enter to save a range would
// also double as "advance to the next field". Includes <select> so a preset-choice field (see
// optionsFor in reportFields.ts) stays part of the same Tab/Ctrl+Enter flow as every other field.
const FOCUSABLE_SELECTOR = 'input:not([data-range-editor]), select, .abx-btn'

/**
 * Lab-wide reference range overrides, threaded via context rather than as a prop through
 * SectionBody -> every field group -> FieldRow — that chain is deep and mostly unrelated
 * components that would otherwise all need to forward a prop they never use themselves.
 */
const RangeOverridesContext = createContext<{
  overrides: Record<string, string>
  setOverride: (key: string, range: string | null) => void
  // Whether the active section's reference column is hidden lab-wide (see the "Show reference
  // values" checkbox in ResultEntry) — a section-level on/off, not per-field like overrides above.
  hideReference: boolean
}>({ overrides: {}, setOverride: () => {}, hideReference: false })

/** The active section's value-check notes (see valueChecks.ts), threaded the same way as range overrides. */
const ValueChecksContext = createContext<{
  issues: IssuesByField
  dismiss: (field: string, issueId: string) => void
}>({ issues: {}, dismiss: () => {} })

export default function ResultEntry() {
  const location = useLocation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [patient, setPatient] = useState<Patient | null>((location.state as { patient?: Patient })?.patient ?? null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [results, setResults] = useState<ResultsBySection>({})
  const [resultsLoaded, setResultsLoaded] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  // Lab-wide reference range customizations (see api.ts) — loaded once, applied to every
  // patient. Editing one here (see RangeEditor below) updates every open report immediately.
  const [rangeOverrides, setRangeOverrides] = useState<Record<string, string>>({})
  // Lab-wide "hide the reference column for this whole section" toggle (see api.ts) — keyed by
  // sectionKey, e.g. a lab that never wants a reference shown on urine reports. Loaded once here
  // and remembered for every future patient/report, same as range overrides above.
  const [hiddenReferenceSections, setHiddenReferenceSections] = useState<Record<string, boolean>>({})
  const [showShortcuts, setShowShortcuts] = useState(false)
  const paneRef = useRef<HTMLDivElement>(null)
  const pendingFocusRef = useRef<false | 'first' | 'last'>(false)

  useEffect(() => {
    listPatients().then(setPatients)
    getRangeOverrides().then(setRangeOverrides)
    getHiddenReferenceSections().then(setHiddenReferenceSections)
  }, [])

  const setOverride = useCallback((key: string, range: string | null) => {
    setRangeOverride(key, range).then(setRangeOverrides)
  }, [])

  const toggleReferenceVisibility = useCallback((sectionKey: string, hidden: boolean) => {
    setReferenceSectionHidden(sectionKey, hidden).then(setHiddenReferenceSections)
  }, [])

  useEffect(() => {
    const fromState = (location.state as { patient?: Patient })?.patient
    if (fromState) { setPatient(fromState); return }
    if (id) getPatient(Number(id)).then(setPatient)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!patient) return
    setResultsLoaded(false)
    getResultsFor(patient.id).then((r) => {
      setResults(r)
      setResultsLoaded(true)
    })
  }, [patient?.id])

  // The 'Others' section has no fixed identity of its own, so staff can rename it in place
  // (e.g. to a lab-specific panel name) — the override lives in its own results blob under
  // '__label' rather than in patient.sections, since that array is otherwise a fixed set of
  // canonical section labels shared across the whole app (billing, rate card, etc.).
  const categories = useMemo(
    () => (patient
      ? patient.sections.map((label) => {
          const key = sectionKeyForLabel(label)!
          // Once customised, an emptied-out label stays empty while the user is still typing —
          // only fall back to the default when it's never been touched at all (undefined), so
          // clearing the field to retype it doesn't keep snapping back to "Others".
          const displayLabel = key === 'others' ? (results.others?.__label ?? label) : label
          return { label: displayLabel, key }
        }).filter((c) => c.key)
      : []),
    [patient, results.others]
  )

  // Notes the technician marked "Value is correct" (or hid). Session-only, and keyed by the reading
  // behind each note, so editing the value brings its warning back.
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set())
  const [pendingIssues, setPendingIssues] = useState<PendingIssue[] | null>(null)

  const issuesBySection = useMemo(() => {
    const out: Record<string, IssuesByField> = {}
    if (!patient) return out
    for (const c of categories) {
      const visible: IssuesByField = {}
      for (const [field, list] of Object.entries(checksForSection(c.key, results[c.key] ?? {}))) {
        const kept = list.filter((issue) => !dismissed.has(`${patient.id}|${c.key}|${field}|${issue.id}`))
        if (kept.length > 0) visible[field] = kept
      }
      out[c.key] = visible
    }
    return out
  }, [categories, results, dismissed, patient])

  useEffect(() => {
    if (!resultsLoaded) return
    const firstIncomplete = categories.findIndex(
      (c) => getCompletionState(c.key, results[c.key] ?? {}) !== 'complete'
    )
    setActiveIndex(firstIncomplete === -1 ? 0 : firstIncomplete)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id, resultsLoaded])

  useEffect(() => {
    if (!pendingFocusRef.current) return
    const focus = pendingFocusRef.current
    pendingFocusRef.current = false
    const t = setTimeout(() => {
      const fields = paneRef.current ? Array.from(paneRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : []
      const target = focus === 'last' ? fields[fields.length - 1] : fields[0]
      target?.focus()
      // 'first' scrolls the whole pane to its top so the section title/progress bar/jump-links
      // are visible, not just the field — scrollIntoView on the field alone can leave those
      // hidden above the fold. 'last' (landing here via Shift+Tab from the next section) has no
      // such header to preserve, so it just brings the field itself into view.
      if (focus === 'last') target?.scrollIntoView({ block: 'end', behavior: 'smooth' })
      else paneRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }, 20)
    return () => clearTimeout(t)
  }, [activeIndex])

  const patientIndex = patient ? patients.findIndex((p) => p.id === patient.id) : -1
  const prevPatient = patientIndex > 0 ? patients[patientIndex - 1] : undefined
  const nextPatient = patientIndex !== -1 && patientIndex < patients.length - 1 ? patients[patientIndex + 1] : undefined
  const goToPatient = (p?: Patient) => { if (p) navigate(`/report/${p.id}`, { state: { patient: p } }) }

  const active = categories[activeIndex]
  const activeData = results[active?.key] ?? {}

  const updateField = useCallback((field: string, value: string) => {
    if (!patient || !active) return
    const merged = { ...(results[active.key] ?? {}), [field]: value }
    setResults((r) => ({ ...r, [active.key]: merged }))
    setSectionResults(patient.id, active.key, merged)
  }, [active, patient, results])

  const dismissIssue = useCallback((field: string, issueId: string) => {
    if (!patient || !active) return
    setDismissed((prev) => new Set(prev).add(`${patient.id}|${active.key}|${field}|${issueId}`))
  }, [patient, active])

  // Review report goes straight through when nothing needs checking; otherwise it lists what's
  // outstanding first. Suggestions (calculated values) never hold it up.
  const openReview = useCallback(() => {
    if (!patient) return
    const pending = categories.flatMap((c, sectionIndex) =>
      Object.entries(issuesBySection[c.key] ?? {}).flatMap(([field, list]) =>
        list.filter((issue) => issue.level !== 'suggest').map((issue) => ({ sectionIndex, sectionLabel: c.label || 'Others', field, issue }))
      )
    )
    if (pending.length === 0) navigate(`/preview/${patient.id}`, { state: { patient } })
    else setPendingIssues(pending)
  }, [patient, categories, issuesBySection, navigate])

  const isOthers = active?.key === 'others'

  // 'Others' rows are keyed by the test name itself, so renaming or removing a row
  // needs to replace the whole section's data rather than merge one field into it.
  const replaceSectionData = useCallback((next: Record<string, string>) => {
    if (!patient || !active) return
    setResults((r) => ({ ...r, [active.key]: next }))
    setSectionResults(patient.id, active.key, next)
  }, [active, patient])

  const goTo = useCallback((idx: number, focus: 'first' | 'last' = 'first') => {
    if (idx < 0 || idx >= categories.length) return
    setActiveIndex(idx)
    pendingFocusRef.current = focus
  }, [categories.length])

  // These are page-level actions, not "field navigation," so they work no matter what has focus
  // (or nothing at all) — a plain window listener rather than the pane's onKeyDown, which only
  // ever sees keydowns whose target is actually inside the results pane (i.e. only fires while a
  // field there is focused). '?' is skipped while actually typing in a text field so it can still
  // be typed as a literal character (e.g. in the Others test-name column or CS remarks).
  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      if (e.key === '?') {
        const target = e.target as HTMLElement
        const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
        if (isTyping) return
        e.preventDefault()
        setShowShortcuts(true)
        return
      }
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault()
        openReview()
        return
      }
      if (e.ctrlKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault()
        goTo(activeIndex + (e.key === 'ArrowUp' ? -1 : 1))
        return
      }
      if (e.key === 'PageUp' || e.key === 'PageDown') {
        e.preventDefault()
        goToPatient(e.key === 'PageUp' ? prevPatient : nextPatient)
      }
    }
    window.addEventListener('keydown', onGlobalKey)
    return () => window.removeEventListener('keydown', onGlobalKey)
  }, [patient, navigate, goTo, activeIndex, prevPatient, nextPatient, openReview])

  // Enter, forward-Tab, and Shift+Tab all move straight between value fields — skipping over each
  // row's inline range-fill/edit-range buttons, which sit in the DOM between one row's input and
  // the next and would otherwise eat 2-3 native Tab presses per row. FOCUSABLE_SELECTOR (just
  // 'input, .abx-btn') deliberately excludes those buttons so `fields` only ever contains the
  // things worth stopping on while entering values. Shift+Tab off the first field of a section
  // steps back into the previous section's LAST field, not its first, so backward navigation
  // feels continuous rather than jumping to the top.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isEnter = e.key === 'Enter'
    const isForwardTab = e.key === 'Tab' && !e.shiftKey
    const isBackwardTab = e.key === 'Tab' && e.shiftKey
    if (!isEnter && !isForwardTab && !isBackwardTab) return
    const pane = paneRef.current
    if (!pane) return
    const fields = Array.from(pane.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    const i = fields.indexOf(e.target as HTMLElement)
    if (i === -1) return
    e.preventDefault()
    if (isBackwardTab) {
      if (i > 0) {
        fields[i - 1].focus()
        fields[i - 1].scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      } else if (activeIndex > 0) {
        goTo(activeIndex - 1, 'last')
      }
      return
    }
    if (i < fields.length - 1) {
      fields[i + 1].focus()
      fields[i + 1].scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    } else if (activeIndex < categories.length - 1) {
      goTo(activeIndex + 1)
    }
  }

  if (!patient || !resultsLoaded) {
    return (
        <main className="px-10 py-9">
          <p className="text-[15px] text-[var(--ink-2)]">Loading…</p>
        </main>
    )
  }

  if (!active) {
    return (
        <main className="px-10 py-9">
          <p className="text-[15px] text-[var(--ink-2)]">This patient has no tests selected.</p>
        </main>
    )
  }

  // '__label' is a reserved key on the 'others' data object for the section's custom display
  // name (see the categories memo above) — it must never be counted as a test row or handed
  // to the row editor, so every other consumer of this section's data works off the rest.
  const { __label: _othersLabel, ...visibleData } = activeData
  const totalCount = isOthers ? Object.keys(visibleData).length : SECTION_FIELD_KEYS[active.key]?.length ?? 0
  // A '_method' key (Serology's "kit/method used" note, see FieldRow) is an annotation on its
  // own field, not a test of its own — it must not inflate this count past the section's real
  // field total.
  const filledCount = Object.entries(visibleData).filter(([k, v]) => !k.endsWith('_method') && v && v.trim() !== '').length
  const completion = getCompletionState(active.key, visibleData)

  return (
    <RangeOverridesContext.Provider value={{ overrides: rangeOverrides, setOverride, hideReference: !!hiddenReferenceSections[active.key] }}>
    <ValueChecksContext.Provider value={{ issues: issuesBySection[active.key] ?? {}, dismiss: dismissIssue }}>
      <div className="flex flex-col h-full">
        {/* Patient context bar */}
        <div className="flex items-center gap-4 px-8 py-4 bg-[var(--surface)] border-b border-[var(--border)] flex-shrink-0">
          <button
            onClick={() => navigate('/patients')}
            className="inline-flex items-center gap-1.5 text-[14px] text-[var(--ink-3)] hover:text-[var(--ink)]"
          >
            <ArrowLeft size={15} />
            Patients
          </button>
          <div className="h-5 w-px bg-[var(--border)]" />

          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPatient(prevPatient)}
              disabled={!prevPatient}
              title={prevPatient ? `Previous: ${prevPatient.name}` : 'No previous patient'}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--ink-3)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink)] disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => goToPatient(nextPatient)}
              disabled={!nextPatient}
              title={nextPatient ? `Next: ${nextPatient.name}` : 'No next patient'}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--ink-3)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink)] disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[16px] font-semibold text-[var(--ink)] leading-tight">{patient.name}</span>
              <button
                onClick={() => navigate('/patient/new', { state: { patient } })}
                title="Edit patient details"
                className="text-[var(--ink-3)] hover:text-[var(--accent)] p-0.5 rounded"
              >
                <Pencil size={13} />
              </button>
            </div>
            <div className="text-[13px] text-[var(--ink-2)] leading-tight">
              {patient.age}{patient.ageUnit} · {patient.gender === 'M' ? 'Male' : 'Female'} · {patient.sid}
            </div>
          </div>
          {patient.referredBy !== 'Self' && (
            <span
              className="inline-flex items-center gap-1.5 text-[13px] text-[var(--accent-ink)] bg-[var(--accent-soft)] px-2.5 py-1.5 rounded-full"
              title="Doctor handling this patient"
            >
              <Stethoscope size={12} />
              {patient.referredBy}
            </span>
          )}
          <div className="flex-1" />

          <button
            onClick={() => setShowShortcuts(true)}
            title="Keyboard shortcuts"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--ink-3)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink)]"
          >
            <Keyboard size={16} />
          </button>
          <span className="text-[13px] text-[var(--ink-3)] flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-[var(--success-muted)]" />
            Saved
          </span>
          <button
            onClick={() => navigate(`/bill/${patient.id}`, { state: { patient } })}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--surface)] text-[var(--ink)] text-[14px] font-medium border border-[var(--border-strong)] rounded-xl hover:bg-[var(--bg-hover)]"
          >
            <IndianRupee size={14} />
            Bill
          </button>
          <button
            onClick={openReview}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white text-[14px] font-medium rounded-xl hover:bg-[var(--accent-ink)] shadow-sm"
          >
            <Eye size={14} />
            Review report
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Local rail — a checklist for this patient, not app navigation */}
          <nav className="w-[220px] flex-shrink-0 bg-[var(--surface)] border-r border-[var(--border)] py-3 overflow-y-auto">
            {categories.map((c, idx) => {
              const state: CompletionState = getCompletionState(c.key, results[c.key] ?? {})
              const isActive = idx === activeIndex
              const toCheck = Object.values(issuesBySection[c.key] ?? {}).flat().filter((i) => i.level !== 'suggest')
              const hasCritical = toCheck.some((i) => i.level === 'critical')
              return (
                <button
                  key={c.key}
                  onClick={() => goTo(idx)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[14.5px] relative transition-colors"
                  style={{
                    color: isActive ? 'var(--ink)' : 'var(--ink-3)',
                    fontWeight: isActive ? 600 : 400,
                    background: isActive ? 'var(--accent-soft)' : 'transparent'
                  }}
                >
                  {isActive && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--accent)]" />}
                  <Dot state={state} />
                  <span className="truncate">{c.label || 'Others'}</span>
                  {toCheck.length > 0 && (
                    <span
                      title={`${toCheck.length} value${toCheck.length === 1 ? '' : 's'} to check`}
                      className="ml-auto flex-shrink-0 inline-flex items-center gap-1 text-[11.5px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: hasCritical ? 'var(--danger-soft)' : 'var(--warning-soft)',
                        color: hasCritical ? 'var(--danger-ink)' : 'var(--warning-ink)'
                      }}
                    >
                      {hasCritical ? <AlertOctagon size={11} /> : <AlertTriangle size={11} />}
                      {toCheck.length}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Focused workspace */}
          <div className="flex-1 overflow-y-auto bg-[var(--bg-app)]" ref={paneRef} onKeyDown={handleKeyDown}>
            <div className="max-w-[820px] mx-auto px-9 py-7">
              <div className="flex items-baseline justify-between mb-1.5">
                {isOthers ? (
                  <input
                    value={active.label}
                    onChange={(e) => replaceSectionData({ ...activeData, __label: e.target.value })}
                    placeholder="Others"
                    className="text-[22px] font-semibold text-[var(--ink)] bg-transparent border-b border-dashed border-[var(--border-strong)] focus:outline-none focus:border-[var(--accent)] px-0.5 -ml-0.5"
                    title="Rename this section"
                  />
                ) : (
                  <h2 className="text-[22px] font-semibold text-[var(--ink)]">{active.label}</h2>
                )}
                <span className="text-[13.5px] text-[var(--ink-2)]">
                  {completion === 'empty' ? 'Not started' : `${filledCount} of ${totalCount} entered`}
                </span>
              </div>
              <div className="h-[3px] rounded-full bg-[var(--border)] mb-3 overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] rounded-full transition-all"
                  style={{ width: totalCount ? `${Math.round((filledCount / totalCount) * 100)}%` : '0%' }}
                />
              </div>

              <label className="flex items-center gap-2 text-[13px] text-[var(--ink-2)] mb-6 select-none cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={!hiddenReferenceSections[active.key]}
                  onChange={(e) => toggleReferenceVisibility(active.key, !e.target.checked)}
                  className="w-3.5 h-3.5 accent-[var(--accent)]"
                />
                Show reference values for {active.label}
              </label>

              {active.key === 'haematology' && (
                <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[13px] mb-5">
                  <span className="text-[var(--ink-3)]">Jump to:</span>
                  {HAEMATOLOGY_SUBGROUPS.map((g, i) => (
                    <span key={g.id}>
                      <button className="text-[var(--accent-ink)] underline" onClick={() => document.getElementById('sg-' + g.id)?.scrollIntoView({ block: 'start', behavior: 'smooth' })}>
                        {g.label}
                      </button>
                      {i < HAEMATOLOGY_SUBGROUPS.length - 1 && <span className="text-[var(--ink-4)]"> · </span>}
                    </span>
                  ))}
                </div>
              )}

              <SectionBody
                key={`${patient.id}:${active.key}`}
                sectionKey={active.key}
                gender={patient.gender}
                data={visibleData}
                onChange={updateField}
                onReplace={(next) => replaceSectionData(_othersLabel !== undefined ? { ...next, __label: _othersLabel } : next)}
              />
            </div>
          </div>
        </div>

        {showShortcuts && <KeyboardShortcutsHelp onClose={() => setShowShortcuts(false)} />}
        {pendingIssues && (
          <ChecksBeforeReview
            issues={pendingIssues}
            onClose={() => setPendingIssues(null)}
            onGoTo={(sectionIndex) => { setPendingIssues(null); goTo(sectionIndex) }}
            onContinue={() => { setPendingIssues(null); navigate(`/preview/${patient.id}`, { state: { patient } }) }}
          />
        )}
      </div>
    </ValueChecksContext.Provider>
    </RangeOverridesContext.Provider>
  )
}

function KeyboardShortcutsHelp({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const groups: { label: string; shortcuts: { keys: string; description: string }[] }[] = [
    {
      label: 'Fields',
      shortcuts: [
        { keys: 'Tab', description: 'Next field' },
        { keys: 'Shift Tab', description: 'Previous field' },
        { keys: 'Enter', description: 'Same as Tab' },
        { keys: '↑ / ↓', description: 'Step by the range’s precision' },
        { keys: 'Shift ↑ / ↓', description: 'Bigger, rounder step' },
        { keys: 'Esc', description: 'Clear field, or exit if empty' }
      ]
    },
    {
      label: 'Navigate',
      shortcuts: [
        { keys: 'Ctrl ↑ / ↓', description: 'Previous / next section' },
        { keys: 'Page Up/Dn', description: 'Previous / next patient' }
      ]
    },
    {
      label: 'Actions',
      shortcuts: [
        { keys: 'Ctrl Enter', description: 'Review report' },
        { keys: '?', description: 'Open this guide' }
      ]
    }
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(26, 36, 48, 0.35)' }}
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-lg p-6"
        style={{ width: '400px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Keyboard size={17} className="text-[var(--accent)]" />
            <h2 className="text-[16px] font-semibold text-[var(--ink)]">Keyboard shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--ink-4)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-2)]"
          >
            <X size={15} />
          </button>
        </div>
        <p className="text-[13px] text-[var(--ink-3)] mb-5">Enter results faster without touching the mouse.</p>

        <div className="space-y-4">
          {groups.map(({ label, shortcuts }) => (
            <div key={label}>
              <div className="text-[10.5px] font-bold uppercase tracking-widest text-[var(--ink-4)] mb-2">{label}</div>
              <div className="grid gap-x-3 gap-y-1.5" style={{ gridTemplateColumns: 'auto 1fr' }}>
                {shortcuts.map(({ keys, description }) => (
                  <div key={keys} className="contents">
                    <span
                      className="justify-self-start text-[12px] font-semibold text-[var(--ink)] bg-[var(--bg-app)] border border-[var(--border)] rounded-md px-2 py-1 whitespace-nowrap"
                      style={{ fontFamily: 'Consolas, monospace' }}
                    >
                      {keys}
                    </span>
                    <span className="text-[13.5px] text-[var(--ink-2)] self-center">{description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Shift+Arrow does a coarse jump sized to the value's own order of magnitude — one power of ten
// below its leading digit, so 4000-10000 (leading digit in the thousands) jumps by 100 while
// 13-17 (leading digit in the tens) jumps by 1 — close to the right ballpark in one press, with
// the plain arrow left for fine-tuning from there. Never smaller than 10x the fine step, so it's
// always a meaningfully bigger jump than a plain arrow even on a narrow single-digit range.
function coarseStepFor(value: number, fineStep: number): number {
  const magnitude = value === 0 ? 0 : Math.floor(Math.log10(Math.abs(value)))
  const candidate = Math.pow(10, Math.max(magnitude - 1, 0))
  return Math.max(candidate, fineStep * 10)
}

// Splits a "low–high[ unit]" range string (e.g. "13.0–17.0 gm/dl", "4.6-6.0 m/cumm", "-2 to +2")
// into separate low/high numbers plus the trailing unit text, so RangeEditor can offer two plain
// number boxes instead of one free-text box. Anchored at the start specifically so single-bound
// ranges ("Upto 140.0 mg/dl", "> 40 mg/dl", "Negative") don't false-match — those fall back to
// the old single free-text box, since "low/high" doesn't mean anything for them.
function parseLowHigh(range: string): { low: string; high: string; suffix: string; usesTo: boolean } | null {
  const m = range.match(/^(-?\d+(?:\.\d+)?)\s*(to|[–-])\s*\+?(-?\d+(?:\.\d+)?)\s*(.*)$/i)
  if (!m) return null
  return { low: m[1], high: m[3], suffix: m[4].trim(), usesTo: /to/i.test(m[2]) }
}

function formatLowHigh(low: string, high: string, suffix: string, usesTo: boolean): string {
  const suffixPart = suffix ? ` ${suffix}` : ''
  if (usesTo) {
    const highNum = parseFloat(high)
    const highStr = !isNaN(highNum) && highNum >= 0 ? `+${high}` : high
    return `${low} to ${highStr}${suffixPart}`
  }
  return `${low}–${high}${suffixPart}`
}

function decimalPlacesOf(numStr: string): number {
  const i = numStr.indexOf('.')
  return i === -1 ? 0 : numStr.length - i - 1
}

function Dot({ state }: { state: CompletionState }) {
  if (state === 'complete') return <span className="w-2 h-2 rounded-full bg-[var(--success-muted)] flex-shrink-0" />
  if (state === 'partial') return <span className="w-2 h-2 rounded-full bg-[var(--accent)] opacity-60 flex-shrink-0" />
  return <span className="w-2 h-2 rounded-full border-[1.5px] border-[var(--ink-4)] flex-shrink-0" />
}

const ISSUE_TONES = {
  critical: { bg: 'var(--danger-soft)', border: 'var(--danger-soft-border)', fg: 'var(--danger-ink)', Icon: AlertOctagon },
  check: { bg: 'var(--warning-soft)', border: 'var(--warning-soft-border)', fg: 'var(--warning-ink)', Icon: AlertTriangle },
  suggest: { bg: 'var(--accent-soft)', border: 'var(--accent-soft-border)', fg: 'var(--accent-ink)', Icon: Calculator }
} as const

function IssueNote({ issue, onFix, onDismiss }: { issue: ValueIssue; onFix: (value: string) => void; onDismiss: () => void }) {
  const tone = ISSUE_TONES[issue.level]
  return (
    <div
      className="flex items-start gap-2 text-[13px] leading-snug rounded-lg px-2.5 py-1.5 mt-1.5 border"
      style={{ background: tone.bg, borderColor: tone.border, color: tone.fg }}
    >
      <tone.Icon size={14} className="flex-shrink-0 mt-[2px]" />
      <span className="flex-1 min-w-0">{issue.message}</span>
      {issue.fix && (
        <button type="button" onClick={() => onFix(issue.fix!.value)} className="font-semibold underline whitespace-nowrap">
          {issue.fix.label}
        </button>
      )}
      <button type="button" onClick={onDismiss} className="opacity-70 hover:opacity-100 whitespace-nowrap">
        {issue.level === 'suggest' ? 'Hide' : 'Value is correct'}
      </button>
    </div>
  )
}

function ChecksBeforeReview({ issues, onClose, onGoTo, onContinue }: {
  issues: PendingIssue[]; onClose: () => void; onGoTo: (sectionIndex: number) => void; onContinue: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const critical = issues.filter((i) => i.issue.level === 'critical').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(26, 36, 48, 0.35)' }} onClick={onClose}>
      <div
        className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-lg p-6"
        style={{ width: '480px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={17} className="text-[var(--warning)]" />
          <h2 className="text-[16px] font-semibold text-[var(--ink)]">
            {issues.length} value{issues.length === 1 ? '' : 's'} to check before the report
          </h2>
        </div>
        <p className="text-[13px] text-[var(--ink-3)] mb-4">
          {critical > 0 ? `Includes ${critical} critical value${critical === 1 ? '' : 's'} — inform the referring doctor. ` : ''}
          Click one to jump to it.
        </p>

        <div className="overflow-y-auto -mx-1 px-1 space-y-1.5 mb-5">
          {issues.map(({ sectionIndex, sectionLabel, field, issue }) => {
            const tone = ISSUE_TONES[issue.level]
            return (
              <button
                key={`${sectionIndex}:${field}:${issue.id}`}
                type="button"
                onClick={() => onGoTo(sectionIndex)}
                className="w-full text-left flex items-start gap-2 rounded-lg px-3 py-2 border hover:brightness-95"
                style={{ background: tone.bg, borderColor: tone.border, color: tone.fg }}
              >
                <tone.Icon size={14} className="flex-shrink-0 mt-[3px]" />
                <span className="text-[13px] leading-snug">
                  <span className="font-semibold">{sectionLabel} · {humanizeKey(field)}</span> — {issue.message}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onGoTo(issues[0].sectionIndex)}
            className="px-4 py-2 text-[14px] font-medium text-[var(--ink)] border border-[var(--border-strong)] rounded-xl hover:bg-[var(--bg-hover)]"
          >
            Back to results
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="px-4 py-2 text-[14px] font-medium text-white bg-[var(--accent)] rounded-xl hover:bg-[var(--accent-ink)]"
          >
            Review report anyway
          </button>
        </div>
      </div>
    </div>
  )
}

function FieldRow({ sectionKey, fieldKey, gender, value, onChange, indent, methodValue, onMethodChange }: {
  sectionKey: string; fieldKey: string; gender: string; value: string; onChange: (v: string) => void; indent?: boolean
  // Optional "method/kit used" note shown under the result (Serology only, for now) — see
  // SerologyResult's `_method` fields and docs/value-checks.md.
  methodValue?: string; onMethodChange?: (v: string) => void
}) {
  const { overrides, setOverride, hideReference } = useContext(RangeOverridesContext)
  const { issues: sectionIssues, dismiss } = useContext(ValueChecksContext)
  const issues = sectionIssues[fieldKey] ?? []
  const checkBorder = issues.some((i) => i.level === 'critical') ? 'var(--danger)' : issues.some((i) => i.level === 'check') ? 'var(--warning)' : undefined
  const [editing, setEditing] = useState(false)
  // Collapsed by default so a section with a method box on every row doesn't turn into a wall of
  // empty inputs — most tests just use the lab's normal method and never need this. Starts open
  // if a note is already saved, so nothing already filled in ever hides itself.
  const [showMethod, setShowMethod] = useState(!!methodValue)

  const label = humanizeKey(fieldKey)
  const unit = unitFor(sectionKey, fieldKey)
  const range = getReferenceRange(sectionKey, fieldKey, gender, overrides)
  const key = rangeOverrideKey(sectionKey, fieldKey, gender)
  const isOverridden = overrides[key] !== undefined
  const flag = flagFor(value, range, fieldKey)
  const flagColor = flag ? 'var(--danger)' : undefined
  const rangeInfo = numericRangeInfo(range)
  const options = optionsFor(sectionKey, fieldKey)
  const longestOption = options ? options.reduce((longest, opt) => (opt.length > longest.length ? opt : longest), '') : ''

  // ArrowUp/ArrowDown step the value by the range's own precision (0.1 for "13.0-17.0", 1 for
  // "0-15", etc.); Shift+Arrow does a coarse jump instead (see coarseStepFor). An empty field
  // starts at the range's midpoint — same value the "click the range" shortcut fills in
  // (defaultValueForRange) — so there's already a real reading to step up or down from instead
  // of the floor. Ticks (round(value/step)) avoid float drift like 0.1+0.1+0.1 !== 0.3, and also
  // snap a coarse jump to the nearest round number on its scale. Escape clears the field — or,
  // if it's already empty (nothing left to clear), backs out of it entirely by blurring, so
  // there's always somewhere for the key to take you.
  const handleValueKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (value.trim() === '') e.currentTarget.blur()
      else onChange('')
      return
    }
    if (!rangeInfo || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
    if (e.ctrlKey || e.metaKey || e.altKey) return // let Ctrl+Arrow bubble up to the pane's section-jump shortcut
    e.preventDefault()
    const current = value.trim() === '' ? NaN : parseFloat(value)
    if (isNaN(current)) {
      const mid = (rangeInfo.min + rangeInfo.max) / 2
      onChange(mid.toFixed(rangeInfo.decimals))
      return
    }
    const dir = e.key === 'ArrowUp' ? 1 : -1
    const step = e.shiftKey ? coarseStepFor(current, rangeInfo.step) : rangeInfo.step
    const ticks = Math.round(current / step) + dir
    onChange((ticks * step).toFixed(rangeInfo.decimals))
  }

  return (
    <div className={`py-2.5 border-b border-[var(--border-soft)] ${indent ? 'pl-6' : ''}`}>
    <div className="flex items-center gap-3">
      <span className="text-[15px] text-[var(--ink)] flex-shrink-0" style={{ width: '13rem' }} title={label}>
        {indent && <span className="text-[var(--ink-4)] mr-1.5">–</span>}
        {label}
      </span>
      {options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-center text-[15px] px-2 py-1.5 rounded-lg border bg-[var(--surface)] flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)]"
          // Wide enough for the longest option's own text (e.g. Widal's "Positive 1:160 dilution")
          // so the closed box doesn't clip it — a plain Negative/Positive field just gets 8.5rem.
          style={{ width: `${Math.max(8.5, longestOption.length * 0.5 + 2.5)}rem`, borderColor: checkBorder ?? 'var(--border-strong)', color: 'var(--ink)' }}
        >
          <option value="">—</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
          {/* A value saved before this field had preset options (or typed in some other way) still shows as itself instead of silently blanking out. */}
          {value && !options.includes(value) && <option value={value}>{value}</option>}
        </select>
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleValueKeyDown}
          className="text-center text-[15px] px-2 py-1.5 rounded-lg border bg-[var(--surface)] flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)]"
          style={{ width: '7rem', fontFamily: 'Consolas, monospace', borderColor: flagColor ?? checkBorder ?? 'var(--border-strong)', color: flagColor ?? 'var(--ink)', fontWeight: flag ? 600 : 400 }}
        />
      )}
      <span className="text-[13.5px] text-[var(--ink-2)] flex-shrink-0" style={{ width: '6rem' }}>{unit}</span>

      <div className="flex-1 flex items-center justify-end gap-1 min-w-0">
        {hideReference ? null : editing ? (
          <RangeEditor
            initial={range}
            defaultRange={defaultReferenceRange(sectionKey, fieldKey, gender)}
            isOverridden={isOverridden}
            onCancel={() => setEditing(false)}
            onSave={(next) => { setOverride(key, next); setEditing(false) }}
            onReset={() => { setOverride(key, null); setEditing(false) }}
          />
        ) : (
          <>
            {range ? (
              !value ? (
                <button
                  type="button"
                  onClick={() => onChange(defaultValueForRange(range))}
                  title="Use this range as the starting value"
                  className="text-[13px] text-[var(--ink-2)] hover:text-[var(--accent-ink)] hover:bg-[var(--accent-soft)] whitespace-nowrap rounded-md px-1.5 py-0.5 transition-colors truncate"
                >
                  {range}
                </button>
              ) : (
                <span className="text-[13px] text-[var(--ink-2)] whitespace-nowrap px-1.5 truncate">
                  {flag === 'high' && <span style={{ color: 'var(--danger)' }}>▲ </span>}
                  {flag === 'low' && <span style={{ color: 'var(--danger)' }}>▼ </span>}
                  {range}
                </span>
              )
            ) : isOverridden ? (
              <span className="text-[12.5px] text-[var(--ink-4)] px-1.5 select-none" title="Reference hidden — click ✏ to restore">—</span>
            ) : (
              <span className="text-[12.5px] text-[var(--ink-4)] italic whitespace-nowrap px-1.5">No range set</span>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              title={isOverridden ? 'Custom range — click to edit or reset to default' : 'Edit reference range for every patient'}
              className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-md transition-colors ${
                isOverridden ? 'text-[var(--accent)] hover:bg-[var(--accent-soft)]' : 'text-[var(--border-strong)] hover:text-[var(--ink-2)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Pencil size={12} />
            </button>
          </>
        )}
      </div>
    </div>
      {issues.length > 0 && (
        <div style={{ marginLeft: 'calc(13rem + 0.75rem)' }}>
          {issues.map((issue) => (
            <IssueNote key={issue.id} issue={issue} onFix={onChange} onDismiss={() => dismiss(fieldKey, issue.id)} />
          ))}
        </div>
      )}
      {onMethodChange && (
        <div style={{ marginLeft: 'calc(13rem + 0.75rem)' }} className="mt-1">
          {showMethod ? (
            <input
              autoFocus={!methodValue}
              value={methodValue ?? ''}
              onChange={(e) => onMethodChange(e.target.value)}
              onBlur={() => { if (!methodValue) setShowMethod(false) }}
              placeholder="Method / kit used — prints under the result"
              className="w-full max-w-xs text-[12.5px] px-2 py-1 rounded-md border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--ink-2)] placeholder:text-[var(--ink-4)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)]"
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowMethod(true)}
              className="text-[12px] text-[var(--ink-4)] hover:text-[var(--accent-ink)] hover:underline"
            >
              + Tested by a different method?
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Inline popover-style editor for a field's reference range — no modal, no navigating away from
 * Result Entry, since the whole point is editing the range right where staff already notice it
 * looks wrong. Most ranges are a plain "low–high[ unit]" (Haemoglobin, RBC Count, etc.), so those
 * get two number boxes — native spinner + arrow-key increment/decrement built in — instead of
 * retyping the whole string by hand. A range that doesn't parse as low/high (e.g. "Upto 140.0
 * mg/dl", "> 40 mg/dl", "Negative") falls back to the original single free-text box.
 */
function RangeEditor({ initial, defaultRange, isOverridden, onCancel, onSave, onReset }: {
  initial: string; defaultRange: string; isOverridden: boolean
  onCancel: () => void; onSave: (range: string) => void; onReset: () => void
}) {
  const parsed = useMemo(() => parseLowHigh(initial), [initial])
  const [lowDraft, setLowDraft] = useState(parsed?.low ?? '')
  const [highDraft, setHighDraft] = useState(parsed?.high ?? '')
  const [rawDraft, setRawDraft] = useState(initial)
  const lowRef = useRef<HTMLInputElement>(null)
  const rawRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (parsed) { lowRef.current?.focus(); lowRef.current?.select() }
    else { rawRef.current?.focus(); rawRef.current?.select() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stopAndHandle = (onCommit: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); onCommit() }
    if (e.key === 'Escape') { e.preventDefault(); onCancel() }
    e.stopPropagation()
  }

  if (!parsed) {
    const commitRaw = () => { if (rawDraft.trim() !== '') onSave(rawDraft.trim()) }
    return (
      <div className="flex items-center gap-1.5">
        <input
          ref={rawRef}
          data-range-editor="true"
          value={rawDraft}
          onChange={(e) => setRawDraft(e.target.value)}
          onKeyDown={stopAndHandle(commitRaw)}
          placeholder="e.g. Upto 140.0 mg/dl"
          className="text-[13px] px-2 py-1 rounded-md border border-[var(--accent)] bg-[var(--surface)] focus:outline-none"
          style={{ width: '10rem' }}
        />
        <button type="button" onClick={commitRaw} title="Save — applies to every patient" className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--success)] hover:bg-[var(--success-soft)]">
          <CheckCircle2 size={14} />
        </button>
        {isOverridden && (
          <button type="button" onClick={onReset} title={`Reset to default: ${defaultRange || '(none)'}`} className="text-[11px] text-[var(--ink-3)] hover:text-[var(--accent-ink)] underline whitespace-nowrap">
            Reset
          </button>
        )}
        {defaultRange && (
          <button type="button" onClick={() => onSave('')} title="Hide this reference from the report" className="text-[11px] text-[var(--ink-3)] hover:text-[var(--danger)] underline whitespace-nowrap">
            Remove
          </button>
        )}
        <button type="button" onClick={onCancel} title="Cancel" className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--ink-4)] hover:bg-[var(--bg-hover)]">
          <X size={14} />
        </button>
      </div>
    )
  }

  const decimals = Math.max(decimalPlacesOf(parsed.low), decimalPlacesOf(parsed.high))
  const step = decimals > 0 ? 1 / 10 ** decimals : 1
  const lowInvalid = lowDraft.trim() === '' || isNaN(parseFloat(lowDraft))
  const highInvalid = highDraft.trim() === '' || isNaN(parseFloat(highDraft))
  const hasInvalid = lowInvalid || highInvalid
  const commit = () => { if (!hasInvalid) onSave(formatLowHigh(lowDraft.trim(), highDraft.trim(), parsed.suffix, parsed.usesTo)) }
  const boxClass = (invalid: boolean) =>
    `text-[13px] text-center px-1.5 py-1 rounded-md border bg-[var(--surface)] focus:outline-none ${invalid ? 'border-[var(--danger)]' : 'border-[var(--accent)]'}`

  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={lowRef}
        data-range-editor="true"
        type="number"
        step={step}
        value={lowDraft}
        onChange={(e) => setLowDraft(e.target.value)}
        onKeyDown={stopAndHandle(commit)}
        title="Low end of the range"
        className={boxClass(lowInvalid)}
        style={{ width: '4.5rem', fontFamily: 'Consolas, monospace' }}
      />
      <span className="text-[12px] text-[var(--ink-3)]">–</span>
      <input
        data-range-editor="true"
        type="number"
        step={step}
        value={highDraft}
        onChange={(e) => setHighDraft(e.target.value)}
        onKeyDown={stopAndHandle(commit)}
        title="High end of the range"
        className={boxClass(highInvalid)}
        style={{ width: '4.5rem', fontFamily: 'Consolas, monospace' }}
      />
      {parsed.suffix && <span className="text-[12px] text-[var(--ink-3)] whitespace-nowrap px-0.5">{parsed.suffix}</span>}
      {hasInvalid && <AlertTriangle size={14} className="text-[var(--danger)] flex-shrink-0" title="Both ends of the range need a number" />}
      <button
        type="button"
        onClick={commit}
        disabled={hasInvalid}
        title={hasInvalid ? 'Enter a number for both ends' : 'Save — applies to every patient'}
        className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--success)] hover:bg-[var(--success-soft)] disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <CheckCircle2 size={14} />
      </button>
      {isOverridden && (
        <button type="button" onClick={onReset} title={`Reset to default: ${defaultRange || '(none)'}`} className="text-[11px] text-[var(--ink-3)] hover:text-[var(--accent-ink)] underline whitespace-nowrap">
          Reset
        </button>
      )}
      {defaultRange && (
        <button type="button" onClick={() => onSave('')} title="Hide this reference from the report" className="text-[11px] text-[var(--ink-3)] hover:text-[var(--danger)] underline whitespace-nowrap">
          Remove
        </button>
      )}
      <button type="button" onClick={onCancel} title="Cancel" className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--ink-4)] hover:bg-[var(--bg-hover)]">
        <X size={14} />
      </button>
    </div>
  )
}

/**
 * 'Others' has no fixed test list — the technician types the test name, result, unit, and
 * reference range, one row per custom investigation. While editing, rows live as a plain array
 * indexed by position (so clearing a name field to retype it never makes the row disappear or
 * collide with another blank row). Only on save does this collapse to the name-keyed object the
 * report reads — at that point a row with nothing entered at all is dropped, since an untouched
 * blank row shouldn't show up as an empty line on the printed report. Unit and reference are
 * optional per row and simply print blank if left empty, same as always.
 */
function OthersEditor({ data, onReplace }: { data: Record<string, string>; onReplace: (next: Record<string, string>) => void }) {
  const [rows, setRows] = useState<{ name: string; value: string; unit: string; reference: string }[]>(
    () => Object.entries(data).map(([name, raw]) => ({ name, ...decodeOtherRow(raw) }))
  )

  const commit = (next: { name: string; value: string; unit: string; reference: string }[]) => {
    setRows(next)
    const obj: Record<string, string> = {}
    next.forEach(({ name, value, unit, reference }) => {
      if (!name.trim() && !value.trim() && !unit.trim() && !reference.trim()) return
      obj[name] = encodeOtherRow({ value, unit, reference })
    })
    onReplace(obj)
  }

  const setRow = (index: number, patch: Partial<{ name: string; value: string; unit: string; reference: string }>) => {
    commit(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  const removeRow = (index: number) => {
    commit(rows.filter((_, i) => i !== index))
  }

  const addRow = () => {
    commit([...rows, { name: '', value: '', unit: '', reference: '' }])
  }

  return (
    <div>
      <div className="flex items-center gap-3 pb-2 text-[10.5px] font-bold uppercase tracking-wide text-[var(--ink-3)]">
        <span className="flex-1">Test</span>
        <span style={{ width: '9rem' }}>Result</span>
        <span style={{ width: '6rem' }}>Unit</span>
        <span style={{ width: '9rem' }}>Reference</span>
        <span className="w-8 flex-shrink-0" />
      </div>
      {rows.map(({ name, value, unit, reference }, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5 border-b border-[var(--border-soft)]">
          <input
            value={name}
            onChange={(e) => setRow(i, { name: e.target.value })}
            placeholder="Test name"
            className="text-[15px] px-2.5 py-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] flex-1 focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)]"
          />
          <input
            value={value}
            onChange={(e) => setRow(i, { value: e.target.value })}
            placeholder="Result"
            className="text-[15px] px-2.5 py-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)]"
            style={{ width: '9rem', fontFamily: 'Consolas, monospace' }}
          />
          <input
            value={unit}
            onChange={(e) => setRow(i, { unit: e.target.value })}
            placeholder="Unit"
            className="text-[15px] px-2.5 py-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)]"
            style={{ width: '6rem' }}
          />
          <input
            value={reference}
            onChange={(e) => setRow(i, { reference: e.target.value })}
            placeholder="Reference"
            className="text-[15px] px-2.5 py-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)]"
            style={{ width: '9rem' }}
          />
          <button
            type="button"
            onClick={() => removeRow(i)}
            title="Remove this test"
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-[var(--ink-4)] hover:text-[var(--danger-ink)] hover:bg-[var(--danger-soft)]"
          >
            <X size={15} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 text-[14px] font-medium text-[var(--accent-ink)] bg-[var(--accent-soft)] rounded-xl hover:bg-[var(--accent-soft-border)]"
      >
        <Plus size={14} />
        Add test
      </button>
    </div>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-5 pb-1.5">
      <span className="text-[12px] font-bold uppercase tracking-widest text-[var(--ink-3)]">{children}</span>
      <div className="flex-1 h-px bg-[var(--border)]" />
    </div>
  )
}

function SectionBody({ sectionKey, gender, data, onChange, onReplace }: {
  sectionKey: string; gender: string; data: Record<string, string>; onChange: (f: string, v: string) => void; onReplace: (next: Record<string, string>) => void
}) {
  const v = (k: string) => data[k] ?? ''
  const set = (k: string) => (val: string) => onChange(k, val)

  if (sectionKey === 'others') {
    return <OthersEditor data={data} onReplace={onReplace} />
  }

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
              <div key={key} className="flex items-center justify-between gap-3 py-1.5 border-b border-[var(--border-soft)]">
                <span className="text-[14.5px] text-[var(--ink)]">{label}</span>
                <div className="flex rounded-md overflow-hidden border border-[var(--border-strong)] flex-shrink-0">
                  {(['S', 'I', 'R'] as const).map((opt, i) => {
                    const isActive = current === opt
                    const bg = opt === 'S' ? 'var(--success-soft)' : opt === 'I' ? 'var(--warning-soft)' : 'var(--danger-soft)'
                    const fg = opt === 'S' ? 'var(--success)' : opt === 'I' ? 'var(--warning-ink)' : 'var(--danger-ink)'
                    return (
                      <button
                        key={opt}
                        onClick={() => set(fieldKey)(isActive ? '' : opt)}
                        className="abx-btn w-8 h-7 text-[11.5px] font-bold"
                        style={{ borderLeft: i > 0 ? '1px solid var(--border-strong)' : 'none', background: isActive ? bg : 'var(--surface)', color: isActive ? fg : 'var(--ink-4)' }}
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
          <span className="block text-[15px] text-[var(--ink)] mb-2">Remarks</span>
          <textarea
            value={v('remarks')}
            onChange={(e) => set('remarks')(e.target.value)}
            rows={2}
            className="w-full px-3.5 py-2.5 text-[15px] border border-[var(--border-strong)] rounded-xl bg-[var(--surface)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)]"
          />
        </div>
      </div>
    )
  }

  const keys = SECTION_FIELD_KEYS[sectionKey] ?? []
  return (
    <div>
      {keys.map((k) => {
        const withMethod = supportsMethodNote(sectionKey, k)
        return (
          <FieldRow
            key={k}
            sectionKey={sectionKey}
            fieldKey={k}
            gender={gender}
            value={v(k)}
            onChange={set(k)}
            methodValue={withMethod ? v(k + '_method') : undefined}
            onMethodChange={withMethod ? set(k + '_method') : undefined}
          />
        )
      })}
    </div>
  )
}
