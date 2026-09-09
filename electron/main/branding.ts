import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'

// What a profile (see profiles/README.md) supplies for the lab's contact seed data — the
// license file still separately governs the locked lab_name (see license.ts/lockLabName),
// this only covers what a fresh DB starts out with.
export interface BrandingConfig {
  labName: string
  labAddress: string
  labPhone: string
  labEmail: string
  labDoctor: string
}

const DEFAULT_BRANDING: BrandingConfig = {
  labName: 'Your Lab Name',
  labAddress: '',
  labPhone: '',
  labEmail: '',
  labDoctor: ''
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

// Inlined as a data URL rather than handed to the renderer as a file path — dev and packaged
// builds resolve resources from different directories (see resourcePath above), and a data URL
// sidesteps needing a custom protocol or IPC-plumbed absolute path just to render an <img>.
export function getLogoDataUrl(): string | null {
  const path = resourcePath('logo.png')
  if (!existsSync(path)) return null
  try {
    return `data:image/png;base64,${readFileSync(path).toString('base64')}`
  } catch {
    return null
  }
}
