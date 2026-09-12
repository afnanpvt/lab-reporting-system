import { useSyncExternalStore } from 'react'
import { getLabSettings, getLogoDataUrl } from './api'

// Shell's header/sidebar renders the lab name and logo, but Shell itself never remounts as the
// user navigates between routes (it wraps every page — see App.tsx) — so a one-off fetch on
// mount would go stale the moment Settings saves a new name or logo. This tiny store is the fix:
// Settings calls refreshBranding() after a successful save/upload, and every subscriber
// (currently just Shell) re-renders with the new value immediately, no navigation/reload needed.
interface BrandingState {
  labName: string
  logo: string | null
}

let state: BrandingState = { labName: '', logo: null }
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function subscribeBranding(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getBrandingSnapshot(): BrandingState {
  return state
}

export async function refreshBranding(): Promise<void> {
  const [settings, logo] = await Promise.all([getLabSettings(), getLogoDataUrl()])
  state = { labName: settings.labName, logo }
  emit()
}

export function useBranding(): BrandingState {
  return useSyncExternalStore(subscribeBranding, getBrandingSnapshot)
}
