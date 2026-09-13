export type LicenseState = 'licensed' | 'trial' | 'expired' | 'none'

export interface LicenseStatus {
  state: LicenseState
  labName?: string
  licenseId?: string
  issuedAt?: string
  expiresAt?: string
  daysLeft?: number
}

export type ActivationResult = { ok: true; status: LicenseStatus } | { ok: false; error: string }
