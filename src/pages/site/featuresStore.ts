import { useSyncExternalStore } from 'react'

// Optional parts of the app a lab can switch off in Settings. Stored in lab_settings (not
// localStorage) because it's a lab decision that should follow the database, not a per-device look.
// Shell's sidebar and the router both read this, and Shell never remounts between pages — so like
// brandingStore this is a tiny external store: Settings flips a flag and every subscriber
// re-renders at once, no navigation or reload.
interface FeaturesState {
  // null until the first read finishes, so a disabled page can't flash before it's redirected away.
  analytics: boolean | null
}

let state: FeaturesState = { analytics: null }
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
  state = { analytics: raw.feature_analytics !== '0' }
  emit()
}

export async function setAnalyticsEnabled(enabled: boolean): Promise<void> {
  state = { ...state, analytics: enabled }
  emit()
  await window.api.settings.set('feature_analytics', enabled ? '1' : '0')
}

export function useFeatures(): FeaturesState {
  return useSyncExternalStore(subscribe, () => state)
}
