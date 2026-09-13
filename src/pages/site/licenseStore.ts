import { useSyncExternalStore } from 'react'
import type { ActivationResult, LicenseStatus } from '../../types/license'
import { refreshBranding } from './brandingStore'

let current: LicenseStatus | null = null
const listeners = new Set<() => void>()

function publish(status: LicenseStatus): void {
  current = status
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function refreshLicense(): Promise<void> {
  publish(await window.api.license.status())
}

// Activation re-locks the lab name in the database, so branding refreshes along with the status.
export async function activateLicense(key: string): Promise<ActivationResult> {
  const result = await window.api.license.activate(key)
  if (result.ok) {
    publish(result.status)
    await refreshBranding()
  }
  return result
}

export function useLicense(): LicenseStatus | null {
  return useSyncExternalStore(subscribe, () => current)
}

export function daysLeftLabel(days = 0): string {
  return days === 1 ? '1 day' : `${days} days`
}
