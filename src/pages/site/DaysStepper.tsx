import { Minus, Plus } from 'lucide-react'

/**
 * "Last [ - 5 + ] days": a number box with − and + buttons, in the app's look (the browser's own
 * number box has tiny spin arrows). `value` is text so the box can be emptied while typing.
 */
export default function DaysStepper({ value, onChange, onEnter, min = 1, max = 3650 }: {
  value: string
  onChange: (next: string) => void
  onEnter?: () => void
  min?: number
  max?: number
}) {
  const n = Math.floor(Number(value)) || 0
  const set = (next: number) => onChange(String(Math.min(max, Math.max(min, next))))
  const btn = 'w-6 h-6 flex items-center justify-center rounded-md text-[var(--ink-2)] hover:bg-[var(--surface)] hover:text-[var(--accent)] hover:shadow-sm disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none disabled:hover:text-[var(--ink-2)]'
  return (
    <span className="inline-flex items-center gap-0.5 rounded-lg bg-[var(--bg-hover)] p-0.5 focus-within:ring-2 focus-within:ring-[var(--accent-ring-40)]">
      <button type="button" className={btn} onClick={() => set((n || min) - 1)} disabled={n <= min} aria-label="One day fewer"><Minus size={13} /></button>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onEnter?.()
          else if (e.key === 'ArrowUp') { e.preventDefault(); set(n + 1) }
          else if (e.key === 'ArrowDown') { e.preventDefault(); set(n - 1) }
        }}
        aria-label="Number of days"
        className="w-10 text-center text-[13.5px] font-semibold text-[var(--ink)] bg-transparent focus:outline-none"
      />
      <button type="button" className={btn} onClick={() => set(n + 1)} disabled={n >= max} aria-label="One day more"><Plus size={13} /></button>
    </span>
  )
}
