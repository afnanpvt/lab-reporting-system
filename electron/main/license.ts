import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { createPublicKey, verify } from 'crypto'

// Public half of the signing keypair only — verification only, can never be used to
// produce a new valid license. The matching private key stays with Scalyft, outside
// this repo and outside every build; see scripts/issue-license.js.
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAUm8HVMKX4ovT4ylhWzwfD62KsZBnPRgE9uOn9ZIXvoI=
-----END PUBLIC KEY-----`

interface LicenseFile {
  labName: string
  licenseId: string
  issuedAt: string
  signature: string
}

export interface LicenseResult {
  ok: boolean
  labName?: string
  licenseId?: string
  issuedAt?: string
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

  const { labName, licenseId, issuedAt, signature } = parsed
  if (!labName || !licenseId || !issuedAt || !signature) {
    return { ok: false, reason: 'License file is missing required fields' }
  }

  const payload = `${labName}|${licenseId}|${issuedAt}`
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

  return { ok: true, labName, licenseId, issuedAt }
}
