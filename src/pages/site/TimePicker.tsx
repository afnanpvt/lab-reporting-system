import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Clock } from 'lucide-react'

// A time picker in the app's own look, the partner of DatePicker. Times travel as 24-hour "HH:MM"
// text like the native time input's value, and are shown the way the lab reads them (07:47 PM).

const pad = (n: number) => String(n).padStart(2, '0')

function parse(value: string): { h: number; m: number } | null {
  const hit = /^(\d{1,2}):(\d{2})/.exec(value)
  if (!hit) return null
  const h = Number(hit[1]), m = Number(hit[2])
  return h < 24 && m < 60 ? { h, m } : null
}

function pretty(value: string): string {
  const t = parse(value)
  if (!t) return ''
  return `${pad(t.h % 12 === 0 ? 12 : t.h % 12)}:${pad(t.m)} ${t.h < 12 ? 'AM' : 'PM'}`
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)

export default function TimePicker({ value, onChange, className = '', ariaLabel, placeholder = 'Select time' }: {
  value: string
  onChange: (time: string) => void
  /** Styles the closed field, so it can match the form it sits in. */
  className?: string
  ariaLabel?: string
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: 0, top: 0 })
  const now = new Date()
  const current = parse(value) ?? { h: now.getHours(), m: now.getMinutes() }
  const [draft, setDraft] = useState(current)

  const hour12 = draft.h % 12 === 0 ? 12 : draft.h % 12
  const pm = draft.h >= 12

  const openPanel = () => {
    const n = new Date()
    setDraft(parse(value) ?? { h: n.getHours(), m: n.getMinutes() })
    setOpen(true)
  }

  useLayoutEffect(() => {
    if (!open || !trigger.current || !panel.current) return
    const t = trigger.current.getBoundingClientRect()
    const h = panel.current.offsetHeight
    const w = panel.current.offsetWidth
    const below = t.bottom + 6
    const top = below + h > window.innerHeight - 8 && t.top - 6 - h > 8 ? t.top - 6 - h : below
    setPos({ left: Math.max(8, Math.min(t.left, window.innerWidth - w - 8)), top })
  }, [open])

  // Bring the chosen hour and minute into view in their columns when it opens.
  useEffect(() => {
    if (!open) return
    panel.current?.focus({ preventScroll: true })
    panel.current?.querySelectorAll('[data-on="1"]').forEach((el) => (el as HTMLElement).scrollIntoView({ block: 'center' }))
  }, [open])

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      const t = e.target as Node
      if (!panel.current?.contains(t) && !trigger.current?.contains(t)) setOpen(false)
    }
    const shut = (e: Event) => { if (!panel.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', away)
    window.addEventListener('resize', shut)
    window.addEventListener('scroll', shut, true)
    return () => {
      document.removeEventListener('mousedown', away)
      window.removeEventListener('resize', shut)
      window.removeEventListener('scroll', shut, true)
    }
  }, [open])

  const setHour = (h12: number) => setDraft((d) => ({ ...d, h: (h12 % 12) + (d.h >= 12 ? 12 : 0) }))
  const setPeriod = (toPm: boolean) => setDraft((d) => ({ ...d, h: (d.h % 12) + (toPm ? 12 : 0) }))
  const commit = () => {
    onChange(`${pad(draft.h)}:${pad(draft.m)}`)
    setOpen(false)
    trigger.current?.focus()
  }
  const useNow = () => {
    const n = new Date()
    onChange(`${pad(n.getHours())}:${pad(n.getMinutes())}`)
    setOpen(false)
    trigger.current?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      trigger.current?.focus()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  const cell = (on: boolean) => `w-full h-8 rounded-lg text-[13.5px] flex items-center justify-center ${on ? 'bg-[var(--accent)] text-white font-semibold' : 'text-[var(--ink)] hover:bg-[var(--bg-hover)]'}`
  const column = 'flex-1 max-h-48 overflow-y-auto flex flex-col gap-0.5 px-1'

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPanel())}
        className={`inline-flex items-center justify-between gap-2 text-left whitespace-nowrap ${className}`}
      >
        <span className={parse(value) ? '' : 'text-[var(--ink-4)]'}>{parse(value) ? pretty(value) : placeholder}</span>
        <Clock size={14} className="text-[var(--ink-3)] flex-shrink-0" />
      </button>

      {open && createPortal(
        <div
          ref={panel}
          role="dialog"
          aria-label="Choose a time"
          tabIndex={-1}
          data-slidefilter-keep
          onKeyDown={onKeyDown}
          className="fixed z-[200] w-[16rem] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 focus:outline-none"
          style={{ left: pos.left, top: pos.top, boxShadow: '0 16px 40px rgba(15, 23, 32, 0.22), 0 3px 10px rgba(15, 23, 32, 0.1)' }}
        >
          <div className="text-center text-[22px] font-semibold text-[var(--ink)] mb-3" style={{ fontFamily: 'Consolas, monospace' }}>
            {pad(hour12)}:{pad(draft.m)} <span className="text-[15px] text-[var(--ink-3)]">{pm ? 'PM' : 'AM'}</span>
          </div>
          <div className="flex gap-1">
            <div className={column} aria-label="Hour">
              {HOURS.map((h) => (
                <button key={h} type="button" tabIndex={-1} data-on={h === hour12 ? '1' : undefined} onClick={() => setHour(h)} className={cell(h === hour12)}>{pad(h)}</button>
              ))}
            </div>
            <div className={column} aria-label="Minute">
              {MINUTES.map((m) => (
                <button key={m} type="button" tabIndex={-1} data-on={m === draft.m ? '1' : undefined} onClick={() => setDraft((d) => ({ ...d, m }))} className={cell(m === draft.m)}>{pad(m)}</button>
              ))}
            </div>
            <div className="flex flex-col gap-0.5 px-1">
              {(['AM', 'PM'] as const).map((p) => (
                <button key={p} type="button" tabIndex={-1} onClick={() => setPeriod(p === 'PM')} className={`${cell((p === 'PM') === pm)} px-2`}>{p}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-soft)]">
            <button type="button" onClick={useNow} className="text-[13px] font-medium text-[var(--accent)] hover:text-[var(--accent-ink)]">Now</button>
            <button type="button" onClick={commit} className="text-[13px] font-medium px-4 py-1.5 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-ink)]">Set time</button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
