import { app } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { createPublicKey, verify } from 'crypto'

// Public half of the signing keypair only — verification only, can never be used to
// produce a new valid license. The matching private key stays with Scalyft, outside
// this repo and outside every build; see scripts/license.js.
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEACFJimm0hq/NFh/7ubcGwfwwPwPe+G7SWNPBvi24GS5s=
-----END PUBLIC KEY-----`

const KEY_PREFIX = 'LUMA-'
const DAY_MS = 24 * 60 * 60 * 1000

interface LicenseFile {
  labName: string
  licenseId: string
  issuedAt: string
  expiresAt?: string
  signature: string
}

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

const RANK: Record<LicenseState, number> = { none: 0, expired: 1, trial: 2, licensed: 3 }

function bundledLicensePath(): string {
  return is.dev ? join(process.cwd(), 'resources', 'license.json') : join(process.resourcesPath, 'license.json')
}

// Keys pasted in-app live next to the patient database, not in the install folder, so updates and
// reinstalls keep them. Dev uses the project folder so it never touches a real install's data.
function activatedLicensePath(): string {
  return is.dev ? join(process.cwd(), 'license-activated.json') : join(app.getPath('userData'), 'license.json')
}

function isLicenseFile(value: unknown): value is LicenseFile {
  const l = value as LicenseFile
  return (
    !!l &&
    typeof l.labName === 'string' &&
    typeof l.licenseId === 'string' &&
    typeof l.issuedAt === 'string' &&
    typeof l.signature === 'string' &&
    (l.expiresAt === undefined || typeof l.expiresAt === 'string')
  )
}

function hasValidSignature(l: LicenseFile): boolean {
  // Trial licenses sign expiresAt too, so the expiry can't be pushed out by hand-editing. Licenses
  // with no expiry keep the original 3-field payload, so older permanent licenses still verify.
  const payload = l.expiresAt
    ? `${l.labName}|${l.licenseId}|${l.issuedAt}|${l.expiresAt}`
    : `${l.labName}|${l.licenseId}|${l.issuedAt}`
  try {
    return verify(null, Buffer.from(payload, 'utf8'), createPublicKey(PUBLIC_KEY_PEM), Buffer.from(l.signature, 'base64'))
  } catch {
    return false
  }
}

function readVerifiedLicense(path: string): LicenseFile | null {
  if (!existsSync(path)) return null
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
    return isLicenseFile(parsed) && hasValidSignature(parsed) ? parsed : null
  } catch {
    return null
  }
}

function statusOf(l: LicenseFile): LicenseStatus {
  const base = { labName: l.labName, licenseId: l.licenseId, issuedAt: l.issuedAt }
  if (!l.expiresAt) return { state: 'licensed', ...base }
  const msLeft = new Date(l.expiresAt).getTime() - Date.now()
  if (msLeft < 0) return { state: 'expired', ...base, expiresAt: l.expiresAt }
  return { state: 'trial', ...base, expiresAt: l.expiresAt, daysLeft: Math.ceil(msLeft / DAY_MS) }
}

function outranks(a: LicenseStatus, b: LicenseStatus): boolean {
  if (RANK[a.state] !== RANK[b.state]) return RANK[a.state] > RANK[b.state]
  return (a.expiresAt ?? '') > (b.expiresAt ?? '')
}

// Uses the stronger of the license built into the installer and one pasted in-app, so installing
// an update that still bundles a trial can never undo a paid key. A pasted key only counts if it's
// for the lab this installer was built for.
export function getLicenseStatus(): LicenseStatus {
  const bundled = readVerifiedLicense(bundledLicensePath())
  const activated = readVerifiedLicense(activatedLicensePath())
  return [bundled, activated]
    .filter((l): l is LicenseFile => !!l && (!bundled || l.labName === bundled.labName))
    .map(statusOf)
    .reduce<LicenseStatus>((best, s) => (outranks(s, best) ? s : best), { state: 'none' })
}

function decodeLicenseKey(key: string): LicenseFile | null {
  // WhatsApp and email often wrap long keys across lines.
  const compact = key.replace(/\s+/g, '')
  if (!compact.toUpperCase().startsWith(KEY_PREFIX)) return null
  try {
    const parsed: unknown = JSON.parse(Buffer.from(compact.slice(KEY_PREFIX.length), 'base64url').toString('utf8'))
    return isLicenseFile(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function activateLicenseKey(key: string): ActivationResult {
  const license = decodeLicenseKey(key)
  if (!license) {
    return { ok: false, error: "That doesn't look like a LumaLabs license key — check the whole key was copied." }
  }
  if (!hasValidSignature(license)) {
    return { ok: false, error: 'This license key is not valid. Contact Scalyft for a new one.' }
  }

  const bundled = readVerifiedLicense(bundledLicensePath())
  if (bundled && license.labName !== bundled.labName) {
    return { ok: false, error: `This key is for "${license.labName}", but this installation is for "${bundled.labName}".` }
  }

  const incoming = statusOf(license)
  if (incoming.state === 'expired') {
    return { ok: false, error: 'This license key has already expired.' }
  }
  const current = getLicenseStatus()
  if (!outranks(incoming, current)) {
    return {
      ok: false,
      error: current.state === 'licensed' ? 'This installation is already fully licensed.' : 'This key would not extend the current trial.'
    }
  }

  writeFileSync(activatedLicensePath(), JSON.stringify(license, null, 2), 'utf8')
  return { ok: true, status: getLicenseStatus() }
}
