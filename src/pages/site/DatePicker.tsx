import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

// A date picker in the app's own look, used wherever a date is chosen. The browser's built-in
// calendar can't be styled, so this draws its own. Dates travel as ISO text (YYYY-MM-DD) like the
// native date input's value, and are never turned into a JavaScript Date for storage, so there is
// no time-zone slip.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

const pad = (n: number) => String(n).padStart(2, '0')
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`

function parseIso(iso: string): { y: number; m: number; d: number } | null {
  const hit = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!hit) return null
  const y = Number(hit[1]), m = Number(hit[2]) - 1, d = Number(hit[3])
  const real = new Date(y, m, d)
  return real.getFullYear() === y && real.getMonth() === m && real.getDate() === d ? { y, m, d } : null
}

function todayIso(): string {
  const n = new Date()
  return toIso(n.getFullYear(), n.getMonth(), n.getDate())
}

/** Moves an ISO date by whole days (the Date object is only used for the arithmetic). */
function addDays(iso: string, days: number): string {
  const p = parseIso(iso) ?? parseIso(todayIso())!
  const d = new Date(p.y, p.m, p.d + days)
  return toIso(d.getFullYear(), d.getMonth(), d.getDate())
}

function pretty(iso: string): string {
  const p = parseIso(iso)
  return p ? `${pad(p.d)} ${SHORT_MONTHS[p.m]} ${p.y}` : ''
}

export default function DatePicker({ value, onChange, className = '', ariaLabel, placeholder = 'Select date', onCommit }: {
  value: string
  onChange: (iso: string) => void
  /** Styles the closed field, so it can match the form it sits in. */
  className?: string
  ariaLabel?: string
  placeholder?: string
  /** Called when a date is picked by pressing Enter on it (lets a caller close what contains it). */
  onCommit?: () => void
}) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 })
  // The month on show, and the day the keyboard is on.
  const start = parseIso(value) ?? parseIso(todayIso())!
  const [shown, setShown] = useState({ y: start.y, m: start.m })
  const [focused, setFocused] = useState(parseIso(value) ? value : todayIso())

  const openPanel = () => {
    const p = parseIso(value) ?? parseIso(todayIso())!
    setShown({ y: p.y, m: p.m })
    setFocused(parseIso(value) ? value : todayIso())
    setOpen(true)
  }

  // Place the panel under the field (or above it when there is no room), kept inside the window.
  useLayoutEffect(() => {
    if (!open || !trigger.current || !panel.current) return
    const t = trigger.current.getBoundingClientRect()
    const h = panel.current.offsetHeight
    const w = panel.current.offsetWidth
    const below = t.bottom + 6
    const top = below + h > window.innerHeight - 8 && t.top - 6 - h > 8 ? t.top - 6 - h : below
    const left = Math.max(8, Math.min(t.left, window.innerWidth - w - 8))
    setPos({ left, top })
  }, [open, shown.y, shown.m])

  // The keyboard works as soon as it opens.
  useEffect(() => {
    if (open) panel.current?.focus({ preventScroll: true })
  }, [open])

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      const t = e.target as Node
      if (!panel.current?.contains(t) && !trigger.current?.contains(t)) setOpen(false)
    }
    const shut = () => setOpen(false)
    document.addEventListener('mousedown', away)
    window.addEventListener('resize', shut)
    window.addEventListener('scroll', shut, true)
    return () => {
      document.removeEventListener('mousedown', away)
      window.removeEventListener('resize', shut)
      window.removeEventListener('scroll', shut, true)
    }
  }, [open])

  // Keep the keyboard's day inside the month on show.
  const goTo = (iso: string) => {
    const p = parseIso(iso)
    if (!p) return
    setFocused(iso)
    setShown({ y: p.y, m: p.m })
  }

  const monthShift = (delta: number) => {
    const d = new Date(shown.y, shown.m + delta, 1)
    setShown({ y: d.getFullYear(), m: d.getMonth() })
  }

  const pick = (iso: string) => {
    onChange(iso)
    setOpen(false)
    trigger.current?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      trigger.current?.focus()
    } else if (step[e.key] !== undefined) {
      e.preventDefault()
      goTo(addDays(focused, step[e.key]))
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault()
      const p = parseIso(focused)!
      const d = new Date(p.y, p.m + (e.key === 'PageUp' ? -1 : 1), 1)
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      goTo(toIso(d.getFullYear(), d.getMonth(), Math.min(p.d, last)))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pick(focused)
      onCommit?.()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  // The grid: six weeks, Monday first, with the neighbouring months' days dimmed.
  const first = new Date(shown.y, shown.m, 1)
  const offset = (first.getDay() + 6) % 7
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(shown.y, shown.m, 1 - offset + i)
    return { iso: toIso(d.getFullYear(), d.getMonth(), d.getDate()), day: d.getDate(), inMonth: d.getMonth() === shown.m }
  })
  const today = todayIso()

  const nav = 'w-8 h-8 flex items-center justify-center rounded-lg text-[var(--ink-3)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink)]'

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); openPanel() } }}
        className={`inline-flex items-center justify-between gap-2 text-left whitespace-nowrap ${className}`}
      >
        <span className={parseIso(value) ? '' : 'text-[var(--ink-4)]'}>{parseIso(value) ? pretty(value) : placeholder}</span>
        <Calendar size={14} className="text-[var(--ink-3)] flex-shrink-0" />
      </button>

      {open && createPortal(
        <div
          ref={panel}
          role="dialog"
          aria-label="Choose a date"
          tabIndex={-1}
          data-slidefilter-keep
          onKeyDown={onKeyDown}
          className="fixed z-[200] w-[19rem] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 focus:outline-none"
          style={{ left: pos.left, top: pos.top, boxShadow: '0 16px 40px rgba(15, 23, 32, 0.22), 0 3px 10px rgba(15, 23, 32, 0.1)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <button type="button" className={nav} onClick={() => monthShift(-12)} aria-label="Previous year" title="Previous year"><ChevronsLeft size={15} /></button>
              <button type="button" className={nav} onClick={() => monthShift(-1)} aria-label="Previous month" title="Previous month"><ChevronLeft size={16} /></button>
            </div>
            <div className="text-[14.5px] font-semibold text-[var(--ink)]">{MONTHS[shown.m]} {shown.y}</div>
            <div className="flex items-center">
              <button type="button" className={nav} onClick={() => monthShift(1)} aria-label="Next month" title="Next month"><ChevronRight size={16} /></button>
              <button type="button" className={nav} onClick={() => monthShift(12)} aria-label="Next year" title="Next year"><ChevronsRight size={15} /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((w) => <div key={w} className="h-8 flex items-center justify-center text-[11.5px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5" role="grid">
            {cells.map(({ iso, day, inMonth }) => {
              const selected = iso === value
              const isFocused = iso === focused
              const isToday = iso === today
              return (
                <button
                  key={iso}
                  type="button"
                  tabIndex={-1}
                  role="gridcell"
                  aria-selected={selected}
                  onClick={() => pick(iso)}
                  onMouseEnter={() => setFocused(iso)}
                  className={`h-9 w-9 mx-auto rounded-full text-[13.5px] flex items-center justify-center transition-colors ${
                    selected ? 'bg-[var(--accent)] text-white font-semibold'
                      : isFocused ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                        : inMonth ? 'text-[var(--ink)] hover:bg-[var(--bg-hover)]' : 'text-[var(--ink-4)] hover:bg-[var(--bg-hover)]'
                  } ${isToday && !selected ? 'ring-1 ring-[var(--accent)]' : ''}`}
                >
                  {day}
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-soft)]">
            <button type="button" onClick={() => goTo(today)} className="text-[13px] font-medium text-[var(--accent)] hover:text-[var(--accent-ink)]">Jump to today</button>
            <button type="button" onClick={() => pick(today)} className="text-[13px] font-medium px-3 py-1.5 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-ink)] hover:opacity-80">Select today</button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
