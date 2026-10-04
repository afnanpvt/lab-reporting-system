import { useSyncExternalStore } from 'react'
import { cleanSpec, type RangeSpec } from './rangeSpec'

// Tests a lab has added to a built-in section (e.g. a "Vitamin D" under Haematology) from
// Settings → Test names. A definition is just a name, unit and default reference range; the value
// entered for each patient is stored by the main process in section_extras (the section tables have
// fixed columns), under the key 'x_' + id, and merged back into that section's results on read.
//
// Ids are generated once and never reused, so renaming a test can't detach its saved values, and a
// deleted test's old values simply stop being shown (they are not erased from the database).
// Stored in lab_settings.custom_tests as { sectionKey: CustomTest[] }.

export interface CustomTest {
  id: string
  name: string
  unit: string
  /** The range as text — always generated from `spec` when there is one (specToText), so what prints matches what flags. */
  reference: string
  /** The structured range (kind, numbers, highlighting). Absent on tests saved before this existed; the text is read instead. */
  spec?: RangeSpec
}

export type CustomTests = Record<string, CustomTest[]>

const SETTINGS_KEY = 'custom_tests'
/** Every custom test's result key starts with this; no built-in column does. Keep in sync with splitExtras in electron/main/ipc.ts. */
export const CUSTOM_PREFIX = 'x_'
export const MAX_CUSTOM_NAME = 48
export const MAX_CUSTOM_UNIT = 24
export const MAX_CUSTOM_REFERENCE = 48

let defs: CustomTests = {}
const listeners = new Set<() => void>()

function emit(): void {
  for (const l of listeners) l()
}

function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const customKey = (id: string): string => CUSTOM_PREFIX + id
export const isCustomKey = (key: string): boolean => key.startsWith(CUSTOM_PREFIX)

/** A fresh id that isn't used by any existing custom test (in any section). */
export function newCustomId(taken: Iterable<string> = []): string {
  const used = new Set<string>(taken)
  for (const list of Object.values(defs)) for (const t of list) used.add(t.id)
  let id: string
  do id = Math.random().toString(36).slice(2, 8)
  while (!id || used.has(id))
  return id
}

function clean(value: unknown): CustomTest | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const id = String(v.id ?? '').trim()
  const name = String(v.name ?? '').trim()
  if (!id || !name) return null
  const spec = cleanSpec(v.spec) ?? undefined
  return { id, name, unit: String(v.unit ?? '').trim(), reference: String(v.reference ?? '').trim(), ...(spec ? { spec } : {}) }
}

export async function refreshCustomTests(): Promise<void> {
  const raw = await window.api.settings.get()
  const next: CustomTests = {}
  try {
    const parsed = raw[SETTINGS_KEY] ? JSON.parse(raw[SETTINGS_KEY]) : {}
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [section, list] of Object.entries(parsed)) {
        if (Array.isArray(list)) {
          const cleaned = list.map(clean).filter((t): t is CustomTest => t !== null)
          if (cleaned.length > 0) next[section] = cleaned
        }
      }
    }
  } catch {
    // corrupt value — behave as if none are defined rather than failing to open result sheets
  }
  defs = next
  emit()
}

/** Replaces every definition at once — the edit screen saves as a whole. */
export async function saveCustomTests(next: CustomTests): Promise<void> {
  const cleaned: CustomTests = {}
  for (const [section, list] of Object.entries(next)) {
    const kept = list.map(clean).filter((t): t is CustomTest => t !== null)
    if (kept.length > 0) cleaned[section] = kept
  }
  defs = cleaned
  emit()
  await window.api.settings.set(SETTINGS_KEY, JSON.stringify(cleaned))
}

export function getCustomTests(): CustomTests {
  return defs
}

export function customTestsFor(sectionKey: string): CustomTest[] {
  return defs[sectionKey] ?? []
}

/** The definition behind a result key like 'x_ab12cd' in a section, if it still exists. */
export function findCustomTest(sectionKey: string, fieldKey: string): CustomTest | undefined {
  if (!isCustomKey(fieldKey)) return undefined
  const id = fieldKey.slice(CUSTOM_PREFIX.length)
  return defs[sectionKey]?.find((t) => t.id === id)
}

export function customTestCount(): number {
  return Object.values(defs).reduce((n, list) => n + list.length, 0)
}

export function useCustomTests(): CustomTests {
  return useSyncExternalStore(subscribe, () => defs)
}
