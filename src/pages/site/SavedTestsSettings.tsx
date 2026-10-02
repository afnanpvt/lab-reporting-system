import { useState } from 'react'
import { BookmarkCheck, Plus, Trash2 } from 'lucide-react'
import { addSavedTest, removeSavedTest, setAutoRemember, updateSavedTest, useSavedTests, type SavedTest } from './savedTestsStore'

const INPUT = 'w-full text-[14px] px-2.5 py-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)]'

/** One saved test. Edits are held locally and written on blur, so renaming doesn't fight the sorted list while typing. */
function SavedRow({ test, onError }: { test: SavedTest; onError: (msg: string | null) => void }) {
  const [draft, setDraft] = useState(test)

  const commit = async () => {
    if (draft.name === test.name && draft.unit === test.unit && draft.reference === test.reference) return
    const problem = await updateSavedTest(test.name, draft)
    if (problem) {
      onError(problem)
      setDraft(test)
    } else onError(null)
  }

  return (
    <div className="flex items-center gap-2 py-2 border-b border-[var(--border-soft)] last:border-b-0">
      <input className={INPUT} style={{ flex: '2 1 0' }} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} onBlur={commit} aria-label="Test name" />
      <input className={INPUT} style={{ flex: '1 1 0' }} value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} onBlur={commit} placeholder="Unit" aria-label="Unit" />
      <input className={INPUT} style={{ flex: '1.4 1 0' }} value={draft.reference} onChange={(e) => setDraft({ ...draft, reference: e.target.value })} onBlur={commit} placeholder="Reference" aria-label="Reference range" />
      <button
        type="button"
        title="Remove from saved tests"
        aria-label={`Remove ${test.name}`}
        onClick={() => removeSavedTest(test.name)}
        className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-[var(--ink-4)] hover:text-[var(--danger-ink)] hover:bg-[var(--danger-soft)]"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

/**
 * Settings card for the lab's saved "Others" tests (see savedTestsStore.ts): turn automatic saving
 * on or off, and edit, add or delete entries. Anything staff type under Others in Result Entry
 * lands here once it has a name and a result.
 */
export default function SavedTestsSettings() {
  const { tests, autoRemember } = useSavedTests()
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState<SavedTest>({ name: '', unit: '', reference: '' })

  const add = async () => {
    if (!adding.name.trim()) return
    const ok = await addSavedTest(adding)
    if (!ok) {
      setError(`“${adding.name.trim()}” is already in the list.`)
      return
    }
    setError(null)
    setAdding({ name: '', unit: '', reference: '' })
  }

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <BookmarkCheck size={16} className="text-[var(--accent)]" />
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--ink-3)]">Saved tests (Others)</h2>
      </div>
      <p className="text-[13px] text-[var(--ink-3)] mb-4 leading-relaxed">
        Tests you type under <span className="font-medium text-[var(--ink-2)]">Others</span> are remembered with their unit and reference range, so next time you can pick them from a list instead of typing them again.
      </p>

      <label className="flex items-center justify-between gap-4 mb-4 py-2.5 px-3.5 rounded-xl bg-[var(--bg-app)] border border-[var(--border-soft)] cursor-pointer">
        <span>
          <span className="block text-[14px] font-medium text-[var(--ink)]">Remember new tests automatically</span>
          <span className="block text-[12.5px] text-[var(--ink-3)]">A test is saved once a row has a name and a result. Turn off to only keep what you add here.</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={autoRemember}
          aria-label="Remember new tests automatically"
          onClick={() => setAutoRemember(!autoRemember)}
          className="relative flex-shrink-0 w-[46px] h-[26px] rounded-full transition-colors duration-200"
          style={{ background: autoRemember ? 'var(--accent)' : 'var(--border-strong)' }}
        >
          <span className="absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-all duration-200" style={{ left: autoRemember ? 23 : 3 }} />
        </button>
      </label>

      {error && (
        <div className="text-[12.5px] rounded-lg px-3 py-2 mb-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger-ink)' }}>{error}</div>
      )}

      {tests.length === 0 ? (
        <p className="text-[13.5px] text-[var(--ink-3)] py-3">Nothing saved yet. Add a test below, or enter one under Others in Result Entry.</p>
      ) : (
        <div className="mb-2">
          <div className="flex items-center gap-2 pb-1 text-[10.5px] font-bold uppercase tracking-wide text-[var(--ink-3)]">
            <span style={{ flex: '2 1 0' }}>Test</span>
            <span style={{ flex: '1 1 0' }}>Unit</span>
            <span style={{ flex: '1.4 1 0' }}>Reference</span>
            <span className="w-8 flex-shrink-0" />
          </div>
          {tests.map((t) => (
            // Keyed by name: an edit that renames a test remounts its row with the new values.
            <SavedRow key={t.name} test={t} onError={setError} />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-soft)]">
        <input className={INPUT} style={{ flex: '2 1 0' }} value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') add() }} placeholder="New test name" aria-label="New test name" />
        <input className={INPUT} style={{ flex: '1 1 0' }} value={adding.unit} onChange={(e) => setAdding({ ...adding, unit: e.target.value })} placeholder="Unit" aria-label="New test unit" />
        <input className={INPUT} style={{ flex: '1.4 1 0' }} value={adding.reference} onChange={(e) => setAdding({ ...adding, reference: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') add() }} placeholder="Reference" aria-label="New test reference range" />
        <button
          type="button"
          onClick={add}
          disabled={!adding.name.trim()}
          title="Add to saved tests"
          aria-label="Add to saved tests"
          className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-ink)] hover:bg-[var(--accent-soft-border)] disabled:opacity-40"
        >
          <Plus size={15} />
        </button>
      </div>
    </div>
  )
}
