import { app } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from 'fs'

// What a profile (see profiles/README.md) supplies for the lab's contact seed data — the
// license file still separately governs the locked lab_name (see license.ts/lockLabName),
// this only covers what a fresh DB starts out with.
export interface BrandingConfig {
  labName: string
  labAddress: string
  labPhone: string
  labEmail: string
  labDoctor: string
  // The institution named on the report footer's quality-control line (e.g. "CMC Hospital,
  // Vellore."), shown only when set — most labs don't have one, so this stays blank for them.
  labQualityCheck: string
}

const DEFAULT_BRANDING: BrandingConfig = {
  labName: 'Your Lab Name',
  labAddress: '',
  labPhone: '',
  labEmail: '',
  labDoctor: '',
  labQualityCheck: ''
}

function resourcePath(file: string): string {
  return is.dev ? join(process.cwd(), 'resources', file) : join(process.resourcesPath, file)
}

// Reads whatever profiles/apply-profile.js last staged at resources/branding.json. No file
// staged (a fresh clone, or nobody's applied a profile yet) falls back to the same generic
// placeholder defaults the demo/pitch build always used.
export function getBranding(): BrandingConfig {
  const path = resourcePath('branding.json')
  if (!existsSync(path)) return DEFAULT_BRANDING
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'))
    return { ...DEFAULT_BRANDING, ...parsed }
  } catch {
    return DEFAULT_BRANDING
  }
}

// A logo picked from Settings lives in userData (writable at runtime, unlike resources/ in a
// packaged install) as the data URL string itself — storing it pre-encoded means reading it back
// is a plain text read, no re-encoding or MIME-type bookkeeping needed.
function userLogoPath(): string {
  return join(app.getPath('userData'), 'logo-data-url.txt')
}

// Inlined as a data URL rather than handed to the renderer as a file path — dev and packaged
// builds resolve resources from different directories (see resourcePath above), and a data URL
// sidesteps needing a custom protocol or IPC-plumbed absolute path just to render an <img>.
// A logo set from Settings (userData) always wins over one staged by a vendor profile
// (resources/logo.png, see profiles/README.md) — the running app's own choice is the live one.
export function getLogoDataUrl(): string | null {
  const userPath = userLogoPath()
  if (existsSync(userPath)) {
    try {
      const dataUrl = readFileSync(userPath, 'utf8').trim()
      if (dataUrl) return dataUrl
    } catch {
      // fall through to the profile-staged logo
    }
  }

  const path = resourcePath('logo.png')
  if (!existsSync(path)) return null
  try {
    return `data:image/png;base64,${readFileSync(path).toString('base64')}`
  } catch {
    return null
  }
}

// Persists whatever image Settings' logo picker read as a data URL — validated to actually be
// one so a bad renderer-side read can't wedge the file into something getLogoDataUrl can't use.
export function setLogo(dataUrl: string): void {
  if (!/^data:image\/[a-zA-Z+.-]+;base64,/.test(dataUrl)) {
    throw new Error('Not a valid image data URL')
  }
  writeFileSync(userLogoPath(), dataUrl, 'utf8')
}

// Reverts to whatever the active vendor profile staged (or the plain text wordmark, if none).
export function clearLogo(): void {
  const path = userLogoPath()
  if (existsSync(path)) unlinkSync(path)
}

// A profile's extra header badge (e.g. Super Lab's "25 years of service" seal) — optional, staged
// the same way as logo.png (see profiles/README.md), and unlike the logo there's no in-app picker
// for it: it's a fixed piece of the vendor's branding, not something staff swap at runtime.
export function getBadgeDataUrl(): string | null {
  const path = resourcePath('badge.png')
  if (!existsSync(path)) return null
  try {
    return `data:image/png;base64,${readFileSync(path).toString('base64')}`
  } catch {
    return null
  }
}

// A profile's certification/accreditation logos (e.g. BMQR, ISO 9001), shown together on the
// report footer. Zero or more PNGs staged under profiles/<name>/certifications/ — sorted by
// filename so the order is stable and controlled by whoever names the files in the profile.
export function getCertificationDataUrls(): string[] {
  const dir = resourcePath('certifications')
  if (!existsSync(dir)) return []
  try {
    return readdirSync(dir)
      .filter((f) => f.toLowerCase().endsWith('.png'))
      .sort()
      .map((f) => `data:image/png;base64,${readFileSync(join(dir, f)).toString('base64')}`)
  } catch {
    return []
  }
}
