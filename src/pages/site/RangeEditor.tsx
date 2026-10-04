import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { RANGE_KINDS, describeFlagging, specProblem, specToText, type RangeKind, type RangeSpec } from './rangeSpec'

function decimalsOf(s: string | undefined): number {
  if (!s) return 0
  const i = s.indexOf('.')
  return i === -1 ? 0 : s.length - i - 1
}

const BOX = 'text-[13px] text-center px-1.5 py-1.5 rounded-md border bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)]'

/**
 * Edits one reference range as an explicit choice — between two numbers, up to / below a limit, at
 * least / above a limit, or plain text — with a live line saying exactly what will be highlighted
 * and what will print. Used on the result sheet (edits the range for every patient) and for tests
 * the lab adds in Settings. It is a card rather than an inline row because there is more to choose
 * than a single text box can carry; the caller positions it.
 */
export default function RangeEditor({
  title, unit, initial, isOverridden, defaultText, removeLabel, removeTitle, onSave, onReset, onRemove, onCancel
}: {
  title: string
  unit: string
  initial: RangeSpec
  isOverridden: boolean
  defaultText: string
  removeLabel?: string
  removeTitle?: string
  onSave: (spec: RangeSpec, text: string) => void
  onReset?: () => void
  onRemove?: () => void
  onCancel: () => void
}) {
  const [kind, setKind] = useState<RangeKind>(initial.kind)
  const [a, setA] = useState(initial.a ?? '')
  const [b, setB] = useState(initial.b ?? '')
  const [text, setText] = useState(initial.text ?? '')
  const [flag, setFlag] = useState(initial.flag)
  const firstRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    firstRef.current?.focus()
    firstRef.current?.select()
    cardRef.current?.scrollIntoView({ block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const spec: RangeSpec = { kind, a: kind === 'text' ? undefined : a.trim(), b: kind === 'between' ? b.trim() : undefined, text: kind === 'text' ? text.trim() : undefined, flag: kind === 'text' ? false : flag }
  const problem = specProblem(spec)
  const shownAs = problem ? '' : specToText(spec, unit)
  const step = 1 / 10 ** Math.max(decimalsOf(a), decimalsOf(b))
  const kindInfo = RANGE_KINDS.find((k) => k.kind === kind)!

  const save = () => { if (!problem) onSave(spec, specToText(spec, unit)) }
  // Everything typed in here stays in here: Tab/Enter/PageUp and friends must not reach the result
  // sheet's field navigation or global shortcuts while this card is open.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'SELECT') { e.preventDefault(); save() }
    if (e.key === 'Escape') { e.preventDefault(); onCancel() }
    if (e.key !== 'Tab') e.stopPropagation()
  }

  const numberBox = (value: string, set: (v: string) => void, label: string, ref?: React.Ref<HTMLInputElement>) => (
    <input
      ref={ref}
      data-range-editor="true"
      type="number"
      step={step}
      value={value}
      onChange={(e) => set(e.target.value)}
      aria-label={label}
      className={BOX}
      style={{ width: '5.5rem', fontFamily: 'Consolas, monospace', borderColor: value.trim() === '' ? 'var(--danger)' : 'var(--accent)' }}
    />
  )
  const unitLabel = unit ? <span className="text-[12.5px] text-[var(--ink-3)] whitespace-nowrap">{unit}</span> : null

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label={`Reference range for ${title}`}
      onKeyDown={onKeyDown}
      onClick={(e) => e.stopPropagation()}
      className="w-[23rem] max-w-[calc(100vw-9rem)] rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-lg p-4 text-left"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px] font-semibold text-[var(--ink)] truncate">Reference range · {title}</div>
        <button type="button" onClick={onCancel} title="Cancel" className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--ink-4)] hover:bg-[var(--bg-hover)]">
          <X size={14} />
        </button>
      </div>

      <label className="block text-[11px] font-bold uppercase tracking-wide text-[var(--ink-3)] mb-1">Type of range</label>
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value as RangeKind)}
        data-range-editor="true"
        className="w-full text-[13.5px] px-2 py-1.5 rounded-md border border-[var(--accent)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)] mb-1"
      >
        {RANGE_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}
      </select>
      <p className="text-[12px] text-[var(--ink-3)] mb-3">{kindInfo.hint}</p>

      {kind === 'text' ? (
        <input
          ref={firstRef}
          data-range-editor="true"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Negative"
          aria-label="Range text"
          className="w-full text-[13.5px] px-2.5 py-1.5 rounded-md border border-[var(--accent)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)]"
        />
      ) : kind === 'between' ? (
        <div className="flex items-center gap-2">
          {numberBox(a, setA, 'Low value', firstRef)}
          <span className="text-[12.5px] text-[var(--ink-3)]">to</span>
          {numberBox(b, setB, 'High value')}
          {unitLabel}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[var(--ink-2)] font-semibold" style={{ width: '1.1rem' }}>{kind === 'upto' ? '≤' : kind === 'lt' ? '<' : kind === 'gte' ? '≥' : '>'}</span>
          {numberBox(a, setA, 'Limit', firstRef)}
          {unitLabel}
        </div>
      )}

      {kind !== 'text' && (
        <label className="flex items-start gap-2 mt-3 cursor-pointer">
          <input type="checkbox" data-range-editor="true" checked={flag} onChange={(e) => setFlag(e.target.checked)} className="mt-0.5" />
          <span className="text-[13px] text-[var(--ink-2)]">Highlight results outside this range</span>
        </label>
      )}

      <div className="mt-3 rounded-lg px-3 py-2 text-[12.5px] leading-snug bg-[var(--bg-app)] border border-[var(--border-soft)]">
        {problem ? (
          <span style={{ color: 'var(--danger-ink)' }}>{problem}</span>
        ) : (
          <>
            <div><span className="text-[var(--ink-3)]">Shown as </span><span className="font-semibold text-[var(--ink)]">{shownAs}</span></div>
            <div className="text-[var(--ink-3)] mt-0.5">{describeFlagging(spec, unit)}</div>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 mt-3.5">
        <button
          type="button"
          onClick={save}
          disabled={!!problem}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-medium rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-ink)] disabled:opacity-40"
        >
          <CheckCircle2 size={14} />
          Save for every patient
        </button>
        <span className="flex-1" />
        {isOverridden && onReset && (
          <button type="button" onClick={onReset} title={`Reset to default: ${defaultText || '(none)'}`} className="text-[12px] text-[var(--ink-3)] hover:text-[var(--accent-ink)] underline whitespace-nowrap">
            Reset
          </button>
        )}
        {onRemove && (
          <button type="button" onClick={onRemove} title={removeTitle ?? 'Hide this reference'} className="text-[12px] text-[var(--ink-3)] hover:text-[var(--danger)] underline whitespace-nowrap">
            {removeLabel ?? 'Remove'}
          </button>
        )}
      </div>
    </div>
  )
}
