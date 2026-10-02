import { useSyncExternalStore } from 'react'

// The lab's own list of "Others" tests — the ones with no fixed place in the app that staff type in
// by hand (name, unit, reference range). Without this, a test like "Vitamin B12" had to be typed
// out again for every patient. Each saved entry remembers the name plus its usual unit and reference
// range, so picking it later fills all three.
//
// New tests are remembered automatically (the lab can turn that off) but only once a row has both a
// name and a result — a half-typed or abandoned row never reaches the list — and an existing name is
// never overwritten by a one-off tweak on a single patient. Entries are edited, added or deleted in
// Settings → Saved tests. Stored in lab_settings: saved_other_tests (JSON array) and
// remember_other_tests ('0' = off; anything else = on).

export interface SavedTest {
  name: string
  unit: string
  reference: string
}

const TESTS_KEY = 'saved_other_tests'
const AUTO_KEY = 'remember_other_tests'

interface State {
  tests: SavedTest[]
  autoRemember: boolean
}

let state: State = { tests: [], autoRemember: true }
const listeners = new Set<() => void>()

function emit(): void {
  for (const l of listeners) l()
}

function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

function clean(value: unknown): SavedTest | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const name = String(v.name ?? '').trim()
  if (!name) return null
  return { name, unit: String(v.unit ?? '').trim(), reference: String(v.reference ?? '').trim() }
}

export async function refreshSavedTests(): Promise<void> {
  const raw = await window.api.settings.get()
  let tests: SavedTest[] = []
  try {
    const parsed = raw[TESTS_KEY] ? JSON.parse(raw[TESTS_KEY]) : []
    if (Array.isArray(parsed)) tests = parsed.map(clean).filter((t): t is SavedTest => t !== null)
  } catch {
    tests = []
  }
  state = { tests, autoRemember: raw[AUTO_KEY] !== '0' }
  emit()
}

async function persistTests(tests: SavedTest[]): Promise<void> {
  state = { ...state, tests }
  emit()
  await window.api.settings.set(TESTS_KEY, JSON.stringify(tests))
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export function findSavedTest(name: string): SavedTest | undefined {
  return name.trim() ? state.tests.find((t) => same(t.name, name)) : undefined
}

/** Adds a test if the name is new. Returns true if it was added. Never overwrites an existing entry. */
export async function addSavedTest(test: SavedTest): Promise<boolean> {
  const t = clean(test)
  if (!t || findSavedTest(t.name)) return false
  await persistTests([...state.tests, t].sort((a, b) => a.name.localeCompare(b.name)))
  return true
}

/**
 * Called when staff leave a row in Result Entry. If automatic saving is on and the row has a name and
 * a result, a new name is saved with the unit and reference typed on that row. A name that is already
 * saved is left alone, except that a blank unit or reference on the saved entry is filled in from this
 * row — so finishing a half-entered test later completes it, while a one-off tweak on a single patient
 * never overwrites what the lab saved.
 */
export async function rememberOtherRow(row: { name: string; value: string; unit: string; reference: string }): Promise<void> {
  if (!state.autoRemember || !row.name.trim() || !row.value.trim()) return
  const existing = findSavedTest(row.name)
  if (!existing) {
    await addSavedTest({ name: row.name, unit: row.unit, reference: row.reference })
    return
  }
  const unit = existing.unit || row.unit.trim()
  const reference = existing.reference || row.reference.trim()
  if (unit !== existing.unit || reference !== existing.reference) {
    await persistTests(state.tests.map((t) => (t === existing ? { ...t, unit, reference } : t)))
  }
}

/** Edits an entry. Returns an error message if the new name clashes with a different saved test. */
export async function updateSavedTest(oldName: string, next: SavedTest): Promise<string | null> {
  const t = clean(next)
  if (!t) return 'A test needs a name.'
  const clash = state.tests.find((x) => same(x.name, t.name) && !same(x.name, oldName))
  if (clash) return `“${clash.name}” is already in the list.`
  await persistTests(state.tests.map((x) => (same(x.name, oldName) ? t : x)).sort((a, b) => a.name.localeCompare(b.name)))
  return null
}

export async function removeSavedTest(name: string): Promise<void> {
  await persistTests(state.tests.filter((t) => !same(t.name, name)))
}

export async function setAutoRemember(on: boolean): Promise<void> {
  state = { ...state, autoRemember: on }
  emit()
  await window.api.settings.set(AUTO_KEY, on ? '1' : '0')
}

export function useSavedTests(): State {
  return useSyncExternalStore(subscribe, () => state)
}
