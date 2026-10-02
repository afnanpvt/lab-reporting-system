import type { LucideIcon } from 'lucide-react'

export interface TabDef<K extends string> {
  key: K
  label: string
  Icon: LucideIcon
  /** A small count shown beside the label (e.g. how many reports are in the tab). */
  count?: number
}

/**
 * The page-level tab strip used by Settings and Reports: a row of tabs with an accent underline on
 * the active one, which wraps on a narrow window (no scrolling, so no stray scrollbar).
 */
export default function Tabs<K extends string>({ tabs, active, onChange }: { tabs: TabDef<K>[]; active: K; onChange: (key: K) => void }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-[var(--border)] mb-6" role="tablist">
      {tabs.map(({ key, label, Icon, count }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={active === key}
          onClick={() => onChange(key)}
          className={`inline-flex items-center gap-2 px-4 py-3 text-[14px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
            active === key ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--ink-3)] hover:text-[var(--ink)] hover:border-[var(--border-strong)]'
          }`}
        >
          <Icon size={16} />
          {label}
          {count !== undefined && (
            <span
              className="text-[11.5px] font-semibold rounded-full px-2 py-0.5"
              style={active === key ? { background: 'var(--accent-soft)', color: 'var(--accent-ink)' } : { background: 'var(--bg-hover)', color: 'var(--ink-3)' }}
            >
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
