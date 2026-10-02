import { useMemo, useState } from 'react'
import { confirmDialog } from './confirmStore'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronRight, Plus, RotateCcw, Search, Save, Trash2, AlertTriangle } from 'lucide-react'
import { SECTIONS, SECTION_FIELD_KEYS } from '../../types/lab'
import RangeEditor from './RangeEditor'
import { parseRangeText, specToText, type RangeSpec } from './rangeSpec'
import {
  MAX_LABEL_LENGTH,
  defaultLabelFor,
  getLabelOverrides,
  labelKey,
  saveLabelOverrides,
  type LabelOverrides
} from './labelsStore'
import {
  MAX_CUSTOM_NAME,
  MAX_CUSTOM_UNIT,
  getCustomTests,
  newCustomId,
  saveCustomTests,
  type CustomTest,
  type CustomTests
} from './customTestsStore'

// Antibiotic names in the C.S. grid are standard drug names with their own list; 'Others' is typed
// by hand per patient. Every other section's named tests can be renamed here, and new tests can be
// added to any of them.
const EDITABLE_SECTIONS = SECTIONS.filter((s) => s.key !== 'others').map((s) => ({
  key: s.key,
  label: s.label,
  fields: (SECTION_FIELD_KEYS[s.key] ?? []).filter((f) => !f.startsWith('abx_'))
}))

const norm = (s: string) => s.trim().toLowerCase()

const INPUT = 'text-[15px] px-3 py-2 rounded-lg border bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)]'

/**
 * Where the lab renames its tests and adds new ones. Deliberately its own screen, reached from
 * Settings, instead of being editable on the result sheet: a change here touches every report, so
 * it shouldn't be possible to do by accident mid-entry. Saving applies the changes and returns to
 * Settings, which is what "locks" it again; to change more later you come back through Settings.
 */
export default function TestNames() {
  const navigate = useNavigate()
  const savedLabels = useMemo(() => getLabelOverrides(), [])
  const savedCustom = useMemo(() => getCustomTests(), [])
  const [draft, setDraft] = useState<LabelOverrides>(() => ({ ...savedLabels }))
  const [custom, setCustom] = useState<CustomTests>(() => JSON.parse(JSON.stringify(savedCustom)))
  const [focusId, setFocusId] = useState<string | null>(null)
  const [rangeOpen, setRangeOpen] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [confirmingReset, setConfirmingReset] = useState(false)

  const valueOf = (key: string, field: string) => draft[key] ?? defaultLabelFor(field)

  // ---- built-in test names ----
  const setName = (key: string, field: string, text: string) => {
    const next = { ...draft }
    // Typing the built-in name back in is the same as resetting, so it never gets stored as a "custom" name.
    if (text.trim() === '' || text.trim() === defaultLabelFor(field)) {
      if (text === '') next[key] = ''
      else delete next[key]
    } else next[key] = text
    setDraft(next)
  }

  const resetOne = (key: string) => {
    const next = { ...draft }
    delete next[key]
    setDraft(next)
  }

  // What would actually be stored: only trimmed names that differ from the default.
  const cleaned = useMemo(() => {
    const out: LabelOverrides = {}
    for (const sec of EDITABLE_SECTIONS) {
      for (const f of sec.fields) {
        const key = labelKey(sec.key, f)
        const v = (draft[key] ?? '').trim()
        if (v && v !== defaultLabelFor(f)) out[key] = v
      }
    }
    return out
  }, [draft])

  // ---- tests added to a section ----
  const allDraftIds = () => Object.values(custom).flat().map((t) => t.id)

  const addTest = (sectionKey: string) => {
    const id = newCustomId(allDraftIds())
    setCustom({ ...custom, [sectionKey]: [...(custom[sectionKey] ?? []), { id, name: '', unit: '', reference: '' }] })
    setOpen({ ...open, [sectionKey]: true })
    setFocusId(id)
  }

  const patchTest = (sectionKey: string, id: string, patch: Partial<CustomTest>) => {
    setCustom({
      ...custom,
      [sectionKey]: (custom[sectionKey] ?? []).map((t) => {
        if (t.id !== id) return t
        const next = { ...t, ...patch }
        // The printed range text is generated from the structured range plus the unit, so a unit change rewrites it.
        if ('unit' in patch && next.spec) next.reference = specToText(next.spec, next.unit)
        return next
      })
    })
  }

  /** What the range editor opens on for an added test: its structured range, else its older text read once, else a blank "between". */
  const startingSpecFor = (t: CustomTest): RangeSpec => {
    if (t.spec) return t.spec
    if (t.reference.trim()) {
      const parsed = parseRangeText(t.reference)
      return { ...parsed, flag: parsed.kind !== 'text' }
    }
    return { kind: 'between', a: '', b: '', flag: true }
  }

  const removeTest = async (sectionKey: string, test: CustomTest) => {
    const existed = (savedCustom[sectionKey] ?? []).some((t) => t.id === test.id)
    if (existed) {
      const ok = await confirmDialog({
        tone: 'danger',
        title: 'Remove this test?',
        subject: test.name || undefined,
        message: 'It disappears from the result sheet and from printed reports. Values already entered for it are kept in the database but no longer shown.',
        confirmLabel: 'Remove test'
      })
      if (!ok) return
    }
    setCustom({ ...custom, [sectionKey]: (custom[sectionKey] ?? []).filter((t) => t.id !== test.id) })
  }

  // Why a row can't be saved yet (keyed by test id): a missing name, or a name that clashes with
  // another test in the same section — built-in (as it is currently named) or another added one.
  const problems = useMemo(() => {
    const out: Record<string, string> = {}
    for (const sec of EDITABLE_SECTIONS) {
      const taken = new Map<string, string>()
      for (const f of sec.fields) taken.set(norm(valueOf(labelKey(sec.key, f), f) || defaultLabelFor(f)), 'a built-in test')
      for (const t of custom[sec.key] ?? []) {
        const name = norm(t.name)
        if (!name) {
          if (t.unit.trim() || t.reference.trim()) out[t.id] = 'Give this test a name.'
          continue
        }
        if (taken.has(name)) out[t.id] = `There is already ${taken.get(name)} called “${t.name.trim()}” in ${sec.label}.`
        else taken.set(name, 'another added test')
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [custom, draft])

  const cleanedCustom = useMemo(() => {
    const out: CustomTests = {}
    for (const sec of EDITABLE_SECTIONS) {
      const kept = (custom[sec.key] ?? [])
        .filter((t) => t.name.trim())
        .map((t) => ({ id: t.id, name: t.name.trim(), unit: t.unit.trim(), reference: t.reference.trim(), ...(t.spec ? { spec: t.spec } : {}) }))
      if (kept.length > 0) out[sec.key] = kept
    }
    return out
  }, [custom])

  const changeCount = useMemo(() => {
    let n = 0
    const keys = new Set([...Object.keys(savedLabels), ...Object.keys(cleaned)])
    for (const k of keys) if ((savedLabels[k] ?? '') !== (cleaned[k] ?? '')) n++
    const flat = (c: CustomTests) => new Map(Object.entries(c).flatMap(([s, l]) => l.map((t) => [t.id, `${s}|${t.name}|${t.unit}|${t.reference}|${JSON.stringify(t.spec ?? null)}`] as const)))
    const a = flat(savedCustom)
    const b = flat(cleanedCustom)
    for (const id of new Set([...a.keys(), ...b.keys()])) if (a.get(id) !== b.get(id)) n++
    return n
  }, [savedLabels, cleaned, savedCustom, cleanedCustom])

  const renamedTotal = Object.keys(cleaned).length
  const addedTotal = Object.values(cleanedCustom).reduce((n, l) => n + l.length, 0)
  const hasProblems = Object.keys(problems).length > 0

  const q = query.trim().toLowerCase()
  const matches = (sectionLabel: string, field: string, key: string) =>
    !q || sectionLabel.toLowerCase().includes(q) || defaultLabelFor(field).toLowerCase().includes(q) || valueOf(key, field).toLowerCase().includes(q)
  const customMatches = (sectionLabel: string, t: CustomTest) => !q || sectionLabel.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)

  const handleBack = async () => {
    if (changeCount > 0) {
      const leave = await confirmDialog({
        tone: 'warning',
        title: 'Leave without saving?',
        message: 'Your changes to the tests haven’t been saved and will be lost.',
        confirmLabel: 'Leave',
        cancelLabel: 'Keep editing'
      })
      if (!leave) return
    }
    navigate('/settings')
  }

  const handleSave = async () => {
    if (hasProblems) return
    setSaving(true)
    await saveLabelOverrides(cleaned)
    await saveCustomTests(cleanedCustom)
    navigate('/settings', { state: { testNamesSaved: { renamed: renamedTotal, added: addedTotal } } })
  }

  const resetEverything = () => {
    setDraft({})
    setConfirmingReset(false)
  }

  return (
    <main className="px-10 py-9 pb-28 max-w-4xl">
      <button onClick={handleBack} className="inline-flex items-center gap-1.5 text-[13.5px] text-[var(--ink-3)] hover:text-[var(--ink)] mb-4">
        <ArrowLeft size={15} /> Settings
      </button>
      <h1 className="text-[26px] font-semibold text-[var(--ink)]">Edit tests</h1>
      <p className="text-[15px] text-[var(--ink-2)] mb-5">Rename any test, or add new tests to a section. Changes show on the result sheet and on every printed report.</p>

      <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-5 text-[13.5px]" style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning-soft-border)', color: 'var(--warning-ink)' }}>
        <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
        <span>Reports that were already saved are drawn from the current tests, so a renamed test reads differently on older reports if you reprint them, and a removed test no longer prints.</span>
      </div>

      <div className="relative mb-5">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-4)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tests…"
          className="w-full pl-10 pr-3.5 py-2.5 text-[15px] border border-[var(--border-strong)] rounded-xl bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)] focus:border-[var(--accent)]"
        />
      </div>

      <div className="space-y-3">
        {EDITABLE_SECTIONS.map((sec) => {
          const rows = sec.fields.filter((f) => matches(sec.label, f, labelKey(sec.key, f)))
          const addedRows = (custom[sec.key] ?? []).filter((t) => customMatches(sec.label, t))
          if (rows.length === 0 && addedRows.length === 0) return null
          const renamedHere = sec.fields.filter((f) => cleaned[labelKey(sec.key, f)]).length
          const addedHere = (cleanedCustom[sec.key] ?? []).length
          const isOpen = q ? true : !!open[sec.key]
          return (
            <section key={sec.key} className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setOpen({ ...open, [sec.key]: !isOpen })}
                className="w-full flex items-center gap-2.5 px-5 py-3.5 text-left hover:bg-[var(--bg-hover)]"
              >
                {isOpen ? <ChevronDown size={16} className="text-[var(--ink-3)]" /> : <ChevronRight size={16} className="text-[var(--ink-3)]" />}
                <span className="text-[15px] font-semibold text-[var(--ink)]">{sec.label}</span>
                <span className="text-[12.5px] text-[var(--ink-3)]">{sec.fields.length + addedHere} tests</span>
                <span className="ml-auto flex items-center gap-2">
                  {addedHere > 0 && <span className="text-[11.5px] font-semibold rounded-full px-2.5 py-0.5 bg-[var(--success-soft)] text-[var(--success)]">{addedHere} added</span>}
                  {renamedHere > 0 && <span className="text-[11.5px] font-semibold rounded-full px-2.5 py-0.5 bg-[var(--accent-soft)] text-[var(--accent-ink)]">{renamedHere} renamed</span>}
                </span>
              </button>
              {isOpen && (
                <div className="px-5 pb-4 border-t border-[var(--border-soft)]">
                  {rows.map((field) => {
                    const key = labelKey(sec.key, field)
                    const custom_ = !!cleaned[key]
                    const empty = (draft[key] ?? undefined) === ''
                    return (
                      <div key={key} className="flex items-center gap-3 py-2.5 border-b border-[var(--border-soft)]">
                        <div className="w-[34%] min-w-0">
                          <div className="text-[13.5px] text-[var(--ink-2)] truncate">{defaultLabelFor(field)}</div>
                          {custom_ && <div className="text-[11px] text-[var(--accent)] font-semibold">Renamed</div>}
                        </div>
                        <input
                          value={valueOf(key, field)}
                          maxLength={MAX_LABEL_LENGTH}
                          onChange={(e) => setName(key, field, e.target.value)}
                          onBlur={() => { if (empty) resetOne(key) }}
                          aria-label={`Name for ${defaultLabelFor(field)} in ${sec.label}`}
                          className={`flex-1 ${INPUT}`}
                          style={{ borderColor: custom_ ? 'var(--accent)' : 'var(--border-strong)' }}
                        />
                        <button
                          type="button"
                          title="Reset to default"
                          aria-label={`Reset ${defaultLabelFor(field)} to default`}
                          disabled={!custom_ && !(key in draft)}
                          onClick={() => resetOne(key)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--ink-4)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent)] disabled:opacity-0 disabled:pointer-events-none"
                        >
                          <RotateCcw size={14} />
                        </button>
                      </div>
                    )
                  })}

                  <div className="pt-4">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--ink-3)]">Tests you've added to {sec.label}</span>
                      <div className="flex-1 h-px bg-[var(--border-soft)]" />
                    </div>
                    {addedRows.length > 0 && (
                      <div className="flex items-center gap-2 pt-2 pb-1 text-[10.5px] font-bold uppercase tracking-wide text-[var(--ink-3)]">
                        <span className="flex-1">Test name</span>
                        <span style={{ width: '6.5rem' }}>Unit</span>
                        <span style={{ width: '11rem' }}>Reference range</span>
                        <span className="w-8 flex-shrink-0" />
                      </div>
                    )}
                    {addedRows.map((t) => (
                      <div key={t.id} className="py-1.5 relative">
                        {rangeOpen === t.id && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setRangeOpen(null)} />
                            <div className="absolute right-10 top-full z-30 mt-1">
                              <RangeEditor
                                title={t.name || 'this test'}
                                unit={t.unit}
                                initial={startingSpecFor(t)}
                                isOverridden={false}
                                defaultText=""
                                removeLabel="Clear"
                                removeTitle="Remove the reference range from this test"
                                onCancel={() => setRangeOpen(null)}
                                onSave={(spec, text) => { patchTest(sec.key, t.id, { spec, reference: text }); setRangeOpen(null) }}
                                onRemove={t.reference ? () => { patchTest(sec.key, t.id, { spec: undefined, reference: '' }); setRangeOpen(null) } : undefined}
                              />
                            </div>
                          </>
                        )}
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus={focusId === t.id}
                            value={t.name}
                            maxLength={MAX_CUSTOM_NAME}
                            onChange={(e) => patchTest(sec.key, t.id, { name: e.target.value })}
                            placeholder="e.g. Vitamin D"
                            aria-label={`Added test name in ${sec.label}`}
                            className={`flex-1 ${INPUT}`}
                            style={{ borderColor: problems[t.id] ? 'var(--danger)' : 'var(--border-strong)' }}
                          />
                          <input
                            value={t.unit}
                            maxLength={MAX_CUSTOM_UNIT}
                            onChange={(e) => patchTest(sec.key, t.id, { unit: e.target.value })}
                            placeholder="Unit"
                            aria-label={`Unit for ${t.name || 'added test'}`}
                            className={INPUT}
                            style={{ width: '6.5rem', borderColor: 'var(--border-strong)' }}
                          />
                          <button
                            type="button"
                            onClick={() => setRangeOpen(rangeOpen === t.id ? null : t.id)}
                            aria-label={`Reference range for ${t.name || 'added test'}`}
                            title="Choose between, up to, below, at least, above or text"
                            className={`${INPUT} text-left truncate hover:bg-[var(--bg-hover)]`}
                            style={{ width: '11rem', borderColor: 'var(--border-strong)', color: t.reference ? 'var(--ink)' : 'var(--ink-4)' }}
                          >
                            {t.reference || 'Set range…'}
                          </button>
                          <button
                            type="button"
                            title="Remove this test"
                            aria-label={`Remove ${t.name || 'added test'}`}
                            onClick={() => removeTest(sec.key, t)}
                            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-[var(--ink-4)] hover:text-[var(--danger-ink)] hover:bg-[var(--danger-soft)]"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {problems[t.id] && <div className="text-[12px] mt-1.5" style={{ color: 'var(--danger-ink)' }}>{problems[t.id]}</div>}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addTest(sec.key)}
                      className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 text-[14px] font-medium text-[var(--accent-ink)] bg-[var(--accent-soft)] rounded-xl hover:bg-[var(--accent-soft-border)]"
                    >
                      <Plus size={14} />
                      Add a test to {sec.label}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )
        })}
      </div>

      <div className="fixed bottom-0 right-0 left-[80px] z-10 bg-[var(--surface)] border-t border-[var(--border)] px-10 py-3.5 flex items-center gap-3">
        <span className="text-[13.5px] text-[var(--ink-3)] mr-auto">
          {hasProblems
            ? 'Fix the highlighted tests to save'
            : `${changeCount > 0 ? `${changeCount} unsaved change${changeCount === 1 ? '' : 's'}` : 'No changes yet'} · ${renamedTotal} renamed, ${addedTotal} added`}
        </span>
        {confirmingReset ? (
          <>
            <span className="text-[13.5px] text-[var(--ink-2)]">Reset every built-in test to its default name?</span>
            <button type="button" onClick={resetEverything} className="px-3.5 py-2 text-[14px] font-medium rounded-xl bg-[var(--danger-soft)] text-[var(--danger-ink)]">Yes, reset names</button>
            <button type="button" onClick={() => setConfirmingReset(false)} className="px-3.5 py-2 text-[14px] font-medium rounded-xl text-[var(--ink-2)] hover:bg-[var(--bg-hover)]">Keep</button>
          </>
        ) : (
          <button type="button" disabled={Object.keys(draft).length === 0} onClick={() => setConfirmingReset(true)} className="px-3.5 py-2 text-[14px] font-medium rounded-xl text-[var(--ink-2)] hover:bg-[var(--bg-hover)] disabled:opacity-40">
            Reset names to defaults
          </button>
        )}
        <button type="button" onClick={handleBack} className="px-4 py-2.5 text-[14px] font-medium rounded-xl border border-[var(--border-strong)] text-[var(--ink)] hover:bg-[var(--bg-hover)]">Cancel</button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || changeCount === 0 || hasProblems}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-white text-[14px] font-medium rounded-xl hover:bg-[var(--accent-ink)] shadow-sm disabled:opacity-50"
        >
          <Save size={15} />
          Save
        </button>
      </div>
    </main>
  )
}
