import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { createPublicKey, verify } from 'crypto'

// Public half of the signing keypair only — verification only, can never be used to
// produce a new valid license. The matching private key stays with Scalyft, outside
// this repo and outside every build; see scripts/issue-license.js.
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEACFJimm0hq/NFh/7ubcGwfwwPwPe+G7SWNPBvi24GS5s=
-----END PUBLIC KEY-----`

interface LicenseFile {
  labName: string
  licenseId: string
  issuedAt: string
  expiresAt?: string
  signature: string
}

export interface LicenseResult {
  ok: boolean
  labName?: string
  licenseId?: string
  issuedAt?: string
  expiresAt?: string
  expired?: boolean
  reason?: string
}

function licensePath(): string {
  return is.dev
    ? join(process.cwd(), 'resources', 'license.json')
    : join(process.resourcesPath, 'license.json')
}

export function verifyLicense(): LicenseResult {
  const path = licensePath()
  if (!existsSync(path)) {
    return { ok: false, reason: 'No license file found at ' + path }
  }

  let parsed: LicenseFile
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return { ok: false, reason: 'License file is not valid JSON' }
  }

  const { labName, licenseId, issuedAt, expiresAt, signature } = parsed
  if (!labName || !licenseId || !issuedAt || !signature) {
    return { ok: false, reason: 'License file is missing required fields' }
  }

  // Trial licenses sign expiresAt into the payload too, so it can't be pushed out by hand-editing
  // the file — that would invalidate the signature. Permanent licenses issued before trials
  // existed (and any license with no expiry) keep the original 3-field payload, so they keep
  // verifying without needing to be re-issued.
  const payload = expiresAt ? `${labName}|${licenseId}|${issuedAt}|${expiresAt}` : `${labName}|${licenseId}|${issuedAt}`
  const publicKey = createPublicKey(PUBLIC_KEY_PEM)
  let signatureValid = false
  try {
    signatureValid = verify(null, Buffer.from(payload, 'utf8'), publicKey, Buffer.from(signature, 'base64'))
  } catch {
    signatureValid = false
  }

  if (!signatureValid) {
    return { ok: false, reason: 'License signature does not match — file may be tampered with or forged' }
  }

  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return { ok: false, expired: true, labName, licenseId, issuedAt, expiresAt, reason: 'Trial period has ended' }
  }

  return { ok: true, labName, licenseId, issuedAt, expiresAt }
}
