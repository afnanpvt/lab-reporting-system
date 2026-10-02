import { useSyncExternalStore } from 'react'

// Optional parts of the app a lab can switch off in Settings. Stored in lab_settings (not
// localStorage) because it's a lab decision that should follow the database, not a per-device look.
// Shell's sidebar and the router both read this, and Shell never remounts between pages — so like
// brandingStore this is a tiny external store: Settings flips a flag and every subscriber
// re-renders at once, no navigation or reload.
interface FeaturesState {
  // null until the first read finishes, so a disabled page can't flash before it's redirected away.
  analytics: boolean | null
  // Red ▲/▼ marks (and red result text) when a result is outside its reference range.
  flagging: boolean
  // The yellow / red / blue notes on Result Entry (typo and unit-slip warnings, critical values,
  // suggested calculated values) and the "check before report" list they feed.
  valueChecks: boolean
}

// Both switches default to on, so a lab sees no change until it turns one off. They are read from
// plain functions (isFlaggingOn / isValueChecksOn) as well as the hook, because flagFor() and
// checksForSection() are pure helpers called from many places.
let state: FeaturesState = { analytics: null, flagging: true, valueChecks: true }
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function refreshFeatures(): Promise<void> {
  const raw = await window.api.settings.get()
  // On unless explicitly switched off, so existing labs keep the page after updating.
  state = {
    analytics: raw.feature_analytics !== '0',
    flagging: raw.feature_flagging !== '0',
    valueChecks: raw.feature_value_checks !== '0'
  }
  emit()
}

export async function setAnalyticsEnabled(enabled: boolean): Promise<void> {
  state = { ...state, analytics: enabled }
  emit()
  await window.api.settings.set('feature_analytics', enabled ? '1' : '0')
}

export async function setFlaggingEnabled(enabled: boolean): Promise<void> {
  state = { ...state, flagging: enabled }
  emit()
  await window.api.settings.set('feature_flagging', enabled ? '1' : '0')
}

export async function setValueChecksEnabled(enabled: boolean): Promise<void> {
  state = { ...state, valueChecks: enabled }
  emit()
  await window.api.settings.set('feature_value_checks', enabled ? '1' : '0')
}

export const isFlaggingOn = (): boolean => state.flagging
export const isValueChecksOn = (): boolean => state.valueChecks

export function useFeatures(): FeaturesState {
  return useSyncExternalStore(subscribe, () => state)
}
