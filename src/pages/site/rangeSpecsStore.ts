import { useSyncExternalStore } from 'react'
import { cleanSpec, type RangeSpec } from './rangeSpec'

// The structured form (see rangeSpec.ts) of every reference range a lab has edited. Keyed exactly
// like the text overrides in api.ts (rangeOverrideKey: "section.field", plus ".M"/".F" for ranges
// that differ by sex), and always written together with them: the override text is what is shown and
// printed, the spec here is what flagging reads. Stored in lab_settings.range_specs (JSON).

const SETTINGS_KEY = 'range_specs'

let specs: Record<string, RangeSpec> = {}
const listeners = new Set<() => void>()

function emit(): void {
  for (const l of listeners) l()
}

function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

export async function refreshRangeSpecs(): Promise<void> {
  const raw = await window.api.settings.get()
  const next: Record<string, RangeSpec> = {}
  try {
    const parsed = raw[SETTINGS_KEY] ? JSON.parse(raw[SETTINGS_KEY]) : {}
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [key, value] of Object.entries(parsed)) {
        const spec = cleanSpec(value)
        if (spec) next[key] = spec
      }
    }
  } catch {
    // corrupt value — fall back to reading the range text, as before specs existed
  }
  specs = next
  emit()
}

/** Stores (or, with null, clears) the structured form of one range. */
export async function saveRangeSpec(key: string, spec: RangeSpec | null): Promise<void> {
  const next = { ...specs }
  if (spec) next[key] = spec
  else delete next[key]
  specs = next
  emit()
  await window.api.settings.set(SETTINGS_KEY, JSON.stringify(specs))
}

export function getStoredSpec(key: string): RangeSpec | undefined {
  return specs[key]
}

/** Re-renders the caller when any range is edited. */
export function useRangeSpecs(): Record<string, RangeSpec> {
  return useSyncExternalStore(subscribe, () => specs)
}
