import { useSyncExternalStore } from 'react'
import { humanizeKey } from './reportFields'
import { findCustomTest, isCustomKey, useCustomTests } from './customTestsStore'

// Lab-chosen names for the built-in tests ("Plasma Glucose F" -> whatever the lab prefers).
// Stored as one JSON object in lab_settings.test_labels, keyed "sectionKey.fieldKey" — section-aware
// because the same field key appears in several sections (albumin is in Biochemistry, Urine and
// L.F.T.) and renaming it in one must not rename it in the others. Only names that differ from the
// built-in default are stored, so "reset to default" is simply removing the entry.
//
// Names are changed from Settings → Test names, never from the result sheet itself, so a stray
// keystroke while entering results can't rename a test. Everything that shows a test name (result
// entry, the review warnings, the printed report) goes through labelFor() below.

const SETTINGS_KEY = 'test_labels'
export const MAX_LABEL_LENGTH = 48

export type LabelOverrides = Record<string, string>

let overrides: LabelOverrides = {}
const listeners = new Set<() => void>()

function emit(): void {
  for (const l of listeners) l()
}

function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function labelKey(sectionKey: string, fieldKey: string): string {
  return `${sectionKey}.${fieldKey}`
}

export async function refreshLabels(): Promise<void> {
  const raw = await window.api.settings.get()
  try {
    const parsed = raw[SETTINGS_KEY] ? JSON.parse(raw[SETTINGS_KEY]) : {}
    overrides = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    overrides = {}
  }
  emit()
}

/** Replaces every custom name at once — the edit screen saves as a whole, not field by field. */
export async function saveLabelOverrides(next: LabelOverrides): Promise<void> {
  overrides = { ...next }
  emit()
  await window.api.settings.set(SETTINGS_KEY, JSON.stringify(overrides))
}

/** The built-in name for a field, ignoring anything the lab has customised. */
export function defaultLabelFor(fieldKey: string): string {
  return humanizeKey(fieldKey)
}

/** What to show for a test: the lab's own name if they set one, otherwise the built-in. */
export function labelFor(sectionKey: string, fieldKey: string): string {
  // A lab-added test is named by its own definition, not by a rename of a built-in.
  if (isCustomKey(fieldKey)) return findCustomTest(sectionKey, fieldKey)?.name ?? ''
  return overrides[labelKey(sectionKey, fieldKey)] || humanizeKey(fieldKey)
}

export function getLabelOverrides(): LabelOverrides {
  return overrides
}

export function customLabelCount(): number {
  return Object.keys(overrides).length
}

/**
 * Subscribes the calling component to name changes and hands back labelFor. The overrides object is
 * replaced (never mutated), so components re-render exactly when a name is saved.
 */
export function useLabels(): typeof labelFor {
  useSyncExternalStore(subscribe, () => overrides)
  useCustomTests() // custom names change in the same Settings screen
  return labelFor
}
