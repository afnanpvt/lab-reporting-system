import { useState } from 'react'
import type { ReactNode } from 'react'
import { Calendar, ChevronRight } from 'lucide-react'

export interface SlideOption<K extends string> {
  key: K
  label: string
}

/**
 * A "Show" button that slides a row of choices out beside it and tucks them away again once one is
 * picked, leaving the choice on the button. Used for the period/day filters on Patients and Analytics
 * so they look and behave the same.
 *
 *  - `idleKey`: the option that means "no filter"; the button then reads "Show" and stays neutral.
 *    Without it the button always names the current choice.
 *  - `keepOpenKey` + `extra`: an option that needs more input (a "Custom" number of days). Picking it
 *    keeps the row open and reveals `extra(close)`; it closes on Enter, Esc or when focus leaves.
 *  - `side`: which way the choices slide out. "right" suits a control at the left of a row, "left" a
 *    control against the right edge, so the button itself never moves.
 */
export default function SlideFilter<K extends string>({
  options,
  value,
  onChange,
  idleKey,
  buttonLabel,
  keepOpenKey,
  extra,
  side = 'right',
  extraWidth = '10rem',
  compact = false,
  title = 'Choose a period'
}: {
  options: SlideOption<K>[]
  value: K
  onChange: (key: K) => void
  idleKey?: K
  /** Overrides the text on the button for the current choice (e.g. "Last 5 days" for Custom). */
  buttonLabel?: string
  keepOpenKey?: K
  extra?: (close: () => void) => ReactNode
  side?: 'left' | 'right'
  /** How wide the extra input may grow (the Custom option's date boxes need more than a number box). */
  extraWidth?: string
  /** A slimmer bar, for a row of its own under a page title. */
  compact?: boolean
  title?: string
}) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  const idle = idleKey !== undefined && value === idleKey
  const extraOpen = keepOpenKey !== undefined && value === keepOpenKey
  const label = buttonLabel ?? (idle ? 'Show' : options.find((o) => o.key === value)?.label ?? 'Show')
  const toRight = side === 'right'

  const button = (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      aria-expanded={open}
      title={open ? 'Close' : title}
      className={`inline-flex items-center justify-between gap-2 min-w-[9.5rem] px-3.5 ${compact ? 'py-1' : 'py-1.5'} text-[13.5px] font-medium rounded-lg whitespace-nowrap ${idle ? 'text-[var(--ink-2)] hover:bg-[var(--bg-hover)]' : 'bg-[var(--accent)] text-white'}`}
    >
      <Calendar size={15} />
      {label}
      <ChevronRight size={14} className="transition-transform duration-300" style={{ transform: (toRight ? open : !open) ? 'rotate(180deg)' : undefined }} />
    </button>
  )

  const strip = (
    <div
      // From a control at the left of a row the options push along it. From one against the right
      // edge they float out over the free space to its left, so the row never reflows or wraps.
      className={`flex items-center overflow-hidden transition-all duration-300 ease-out ${toRight ? '' : 'absolute right-full top-[-1px] bottom-[-1px] z-10 rounded-l-xl border bg-[var(--surface)]'}`}
      style={{
        maxWidth: open ? '80rem' : 0,
        opacity: open ? 1 : 0,
        ...(toRight ? { marginLeft: open ? '0.25rem' : 0 } : { borderColor: open ? 'var(--border-strong)' : 'transparent', borderRightWidth: 0, pointerEvents: open ? 'auto' : 'none' })
      }}
      aria-hidden={!open}
    >
      <div className={`flex items-center gap-1 ${toRight ? 'pl-1 border-l border-[var(--border)]' : 'pl-1 pr-1'}`} role="group" aria-label={title}>
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            tabIndex={open ? 0 : -1}
            onClick={() => { onChange(o.key); if (o.key !== keepOpenKey) close() }}
            aria-pressed={value === o.key}
            className={`px-3 ${compact ? 'py-1' : 'py-1.5'} text-[13.5px] font-medium rounded-lg whitespace-nowrap ${value === o.key ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]' : 'text-[var(--ink-2)] hover:bg-[var(--bg-hover)]'}`}
          >
            {o.label}
          </button>
        ))}
        {extra && (
          // Always present so choosing the extra option grows it open smoothly instead of shoving the row.
          <div
            className="overflow-hidden transition-all duration-300 ease-out"
            style={{ maxWidth: extraOpen ? extraWidth : 0, opacity: extraOpen ? 1 : 0, paddingLeft: extraOpen ? '0.25rem' : 0, paddingRight: extraOpen ? '0.5rem' : 0 }}
          >
            {extra(close)}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div
      className={`relative inline-flex flex-shrink-0 items-center border border-[var(--border-strong)] bg-[var(--surface)] ${compact ? 'p-0.5' : 'p-1'} transition-[border-radius] duration-300 ${!toRight && open ? 'rounded-r-xl rounded-l-none border-l-0' : 'rounded-xl'}`}
      onBlur={(e) => {
        // Focus moving into or out of a pop-up calendar (drawn outside this box) is not leaving the filter.
        if (!e.currentTarget.contains(e.target as Node)) return
        const to = e.relatedTarget as Element | null
        if (to?.closest?.('[data-slidefilter-keep]')) return
        if (extraOpen && !e.currentTarget.contains(to)) close()
      }}
      onKeyDown={(e) => { if (e.key === 'Escape') close() }}
    >
      {toRight ? <>{button}{strip}</> : <>{button}{strip}</>}
    </div>
  )
}
