// Purely a per-device visual preference — not lab data, so it lives in localStorage rather than
// the SQLite settings table (no IPC round-trip needed, and it's fine if it doesn't follow the
// lab to another machine). The matching color values live in src/styles/index.css as
// [data-theme='...'] and [data-mode='dark'] blocks; this module only knows ids/labels/swatches.
export const THEMES = [
  { id: 'blue', label: 'Blue', swatch: '#1b6fae' },
  { id: 'green', label: 'Green', swatch: '#16794a' },
  { id: 'slate', label: 'Slate', swatch: '#475569' },
  { id: 'violet', label: 'Violet', swatch: '#7c3aed' },
  { id: 'yellow', label: 'Yellow', swatch: '#a16207' }
] as const

export type ThemeId = (typeof THEMES)[number]['id']

const STORAGE_KEY = 'labapp:theme'
const DEFAULT_THEME: ThemeId = 'blue'

export function getTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && THEMES.some((t) => t.id === stored)) return stored as ThemeId
  } catch {
    // localStorage unavailable (e.g. blocked) — fall through to the default
  }
  return DEFAULT_THEME
}

// Applies the theme to the document immediately (so the change is visible without a reload) and
// persists it for next launch. index.html has a matching inline bootstrap script that reads the
// same key before React mounts, so the app never flashes the wrong theme on startup.
export function setTheme(theme: ThemeId): void {
  document.documentElement.setAttribute('data-theme', theme)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // best-effort persistence only
  }
}

export const MODES = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' }
] as const

export type ModeId = (typeof MODES)[number]['id']

const MODE_STORAGE_KEY = 'labapp:mode'
const DEFAULT_MODE: ModeId = 'light'

export function getMode(): ModeId {
  try {
    const stored = localStorage.getItem(MODE_STORAGE_KEY)
    if (stored && MODES.some((m) => m.id === stored)) return stored as ModeId
  } catch {
    // localStorage unavailable — fall through to the default
  }
  return DEFAULT_MODE
}

// The Windows caption buttons (minimize/maximize/close) are drawn by the OS as a titleBarOverlay,
// not by this web page, so CSS can't reach them — the main process has to be told explicitly.
// Mirrors --surface/--ink from each [data-mode] block in index.css.
const TITLE_BAR_OVERLAY: Record<ModeId, { color: string; symbolColor: string }> = {
  light: { color: '#ffffff', symbolColor: '#1a2023' },
  dark: { color: '#1a212a', symbolColor: '#eef2f6' }
}

function applyTitleBarOverlay(mode: ModeId): void {
  window.api?.window?.setTitleBarOverlay(TITLE_BAR_OVERLAY[mode]).catch(() => {
    // no-op outside Electron (e.g. a plain browser tab during dev)
  })
}

export function setMode(mode: ModeId): void {
  document.documentElement.setAttribute('data-mode', mode)
  applyTitleBarOverlay(mode)
  try {
    localStorage.setItem(MODE_STORAGE_KEY, mode)
  } catch {
    // best-effort persistence only
  }
}

// Called once on app mount (see Shell.tsx) so the caption buttons match whatever mode was saved
// from last launch — setMode() only covers live toggles, not cold start.
export function syncTitleBarOverlay(): void {
  applyTitleBarOverlay(getMode())
}
