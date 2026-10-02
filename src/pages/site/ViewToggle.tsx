import { useState } from 'react'
import { LayoutGrid, List } from 'lucide-react'

export type ViewMode = 'cards' | 'list'

/** A Cards / List choice that is remembered between visits under `storageKey`. */
export function useViewMode(storageKey: string): [ViewMode, (next: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(() => {
    try {
      return localStorage.getItem(storageKey) === 'list' ? 'list' : 'cards'
    } catch {
      return 'cards'
    }
  })
  const change = (next: ViewMode) => {
    setMode(next)
    try { localStorage.setItem(storageKey, next) } catch { /* not remembered, still works */ }
  }
  return [mode, change]
}

/** The segmented Cards / List switch used on Doctors, Patients and the Dashboard. */
export default function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (next: ViewMode) => void }) {
  return (
    <div className="inline-flex gap-1 p-1 rounded-xl bg-[var(--bg-hover)]" role="group" aria-label="View">
      {([['cards', 'Cards', LayoutGrid], ['list', 'List', List]] as const).map(([key, label, Icon]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={mode === key}
          title={`${label} view`}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13.5px] font-medium rounded-lg ${mode === key ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm' : 'text-[var(--ink-3)] hover:text-[var(--ink)]'}`}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  )
}
