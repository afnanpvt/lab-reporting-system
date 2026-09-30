import { useEffect, useRef, useSyncExternalStore } from 'react'

// Every key binding the app reacts to lives here: a fixed list of actions, each with a default
// key, plus whatever the lab has changed in Settings. Overrides are the only thing persisted
// (lab_settings.shortcut_bindings, as JSON), so a future change to a default reaches every lab that
// never touched that action. An override of null means "deliberately unbound".
//
// Field-level keys inside Result Entry (Tab, Enter, arrows, Esc) are intentionally NOT here — they
// are how typing in a form works and stay fixed; see FIXED_SHORTCUTS for what the guide lists.

export type ActionId =
  | 'patient.new'
  | 'fields.next'
  | 'fields.nextAlt'
  | 'fields.prev'
  | 'results.prevSection'
  | 'results.nextSection'
  | 'results.prevPatient'
  | 'results.nextPatient'
  | 'results.review'
  | 'results.help'

export interface ActionDef {
  id: ActionId
  label: string
  group: 'Patients' | 'Fields' | 'Result entry'
  default: string | null
}

export const ACTIONS: ActionDef[] = [
  { id: 'patient.new', label: 'New patient', group: 'Patients', default: 'Ctrl+N' },
  { id: 'fields.next', label: 'Next field', group: 'Fields', default: 'Tab' },
  { id: 'fields.nextAlt', label: 'Next field (alternate)', group: 'Fields', default: 'Enter' },
  { id: 'fields.prev', label: 'Previous field', group: 'Fields', default: 'Shift+Tab' },
  { id: 'results.prevSection', label: 'Previous section', group: 'Result entry', default: 'Ctrl+ArrowUp' },
  { id: 'results.nextSection', label: 'Next section', group: 'Result entry', default: 'Ctrl+ArrowDown' },
  { id: 'results.prevPatient', label: 'Previous patient', group: 'Result entry', default: 'PageUp' },
  { id: 'results.nextPatient', label: 'Next patient', group: 'Result entry', default: 'PageDown' },
  { id: 'results.review', label: 'Review report', group: 'Result entry', default: 'Ctrl+Enter' },
  { id: 'results.help', label: 'Open shortcut guide', group: 'Result entry', default: '?' }
]

/** Keys that work inside a field while entering results — shown in the guide, not editable. (Moving between fields is editable; see the fields.* actions.) */
export const FIXED_SHORTCUTS: { keys: string; description: string }[] = [
  { keys: '↑ / ↓', description: 'Step by the range’s precision' },
  { keys: 'Shift + ↑ / ↓', description: 'Bigger, rounder step' },
  { keys: 'Esc', description: 'Clear field, or exit if empty' }
]

// ---------------------------------------------------------------------------
// Combos: "Ctrl+Shift+K", "PageDown", "?" — modifiers always in Ctrl, Alt, Shift, Meta order.
// ---------------------------------------------------------------------------

// Lock keys count here too: holding Alt and tapping CapsLock is not a shortcut anyone means to record.
const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta', 'AltGraph', 'CapsLock', 'NumLock', 'ScrollLock'])

function isLetterOrDigit(key: string): boolean {
  return /^[A-Za-z0-9]$/.test(key)
}

/** The combo a keydown represents, or null if it's only a modifier being held (nothing to bind yet). */
export function eventToCombo(e: KeyboardEvent): string | null {
  if (MODIFIER_KEYS.has(e.key)) return null
  const key = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  // Shift is what makes "?" from "/" — for symbols it's already baked into the character, so
  // counting it again would make "?" impossible to match on keyboards that need Shift for it.
  if (e.shiftKey && (key.length > 1 || isLetterOrDigit(key))) parts.push('Shift')
  if (e.metaKey) parts.push('Meta')
  parts.push(key)
  return parts.join('+')
}

const KEY_LABELS: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  PageUp: 'Page Up',
  PageDown: 'Page Down',
  Escape: 'Esc'
}

export function comboLabel(combo: string | null): string {
  if (!combo) return 'Not set'
  return combo
    .split('+')
    .map((p) => KEY_LABELS[p] ?? p)
    .join(' + ')
}

// Only what Windows itself takes before the app ever sees it. Everything else can be assigned.
const RESERVED = new Set(['Alt+F4'])

// Select-all, copy, paste and friends can be assigned, but they only fire when focus is NOT in a
// text field — otherwise rebinding Ctrl+A would break selecting text while entering results.
const EDITING_COMBOS = new Set(['Ctrl+A', 'Ctrl+C', 'Ctrl+V', 'Ctrl+X', 'Ctrl+Z', 'Ctrl+Y'])
const NEVER_BARE = new Set(['Tab', 'Enter', 'Escape', 'Backspace', 'Delete', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Insert'])

/** Why a combo can't be used, or null if it's fine. */
export function validateCombo(combo: string, id?: ActionId): string | null {
  if (RESERVED.has(combo)) return `${comboLabel(combo)} is handled by Windows itself and can’t be reassigned.`
  const parts = combo.split('+')
  const key = parts[parts.length - 1]
  const hasCmd = parts.includes('Ctrl') || parts.includes('Alt') || parts.includes('Meta')
  // Moving between fields is the one place Tab and Enter are fine on their own — that is what they do by default.
  const fieldNav = !!id?.startsWith('fields.') && (key === 'Tab' || key === 'Enter')
  if (!hasCmd && !fieldNav && (isLetterOrDigit(key) || NEVER_BARE.has(key))) {
    return `${comboLabel(combo)} on its own would get in the way of typing — add Ctrl or Alt.`
  }
  return null
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

type Overrides = Partial<Record<ActionId, string | null>>

let overrides: Overrides = {}
let capturing = false
const listeners = new Set<() => void>()

function emit(): void {
  for (const l of listeners) l()
}

function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

export async function refreshShortcuts(): Promise<void> {
  const raw = await window.api.settings.get()
  try {
    const parsed = raw.shortcut_bindings ? JSON.parse(raw.shortcut_bindings) : {}
    overrides = parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    overrides = {}
  }
  emit()
}

async function persist(): Promise<void> {
  emit()
  await window.api.settings.set('shortcut_bindings', JSON.stringify(overrides))
}

export function bindingFor(id: ActionId): string | null {
  if (id in overrides) return overrides[id] ?? null
  return ACTIONS.find((a) => a.id === id)?.default ?? null
}

/** Which other action currently owns this combo, if any. Combos are unique app-wide since every action can be live on the results page at once. */
export function ownerOf(combo: string, except?: ActionId): ActionDef | undefined {
  return ACTIONS.find((a) => a.id !== except && bindingFor(a.id) === combo)
}

/** Assigns a combo, taking it from whichever action had it. Returns that action, if there was one. */
export async function setBinding(id: ActionId, combo: string | null): Promise<ActionDef | undefined> {
  const displaced = combo ? ownerOf(combo, id) : undefined
  const next: Overrides = { ...overrides }
  const store = (aid: ActionId, value: string | null) => {
    const def = ACTIONS.find((a) => a.id === aid)!
    if (value === def.default) delete next[aid]
    else next[aid] = value
  }
  store(id, combo)
  if (displaced) store(displaced.id, null)
  overrides = next
  await persist()
  return displaced
}

export async function resetBinding(id: ActionId): Promise<void> {
  // Putting the default back can clash with something the lab has since moved onto that key.
  await setBinding(id, ACTIONS.find((a) => a.id === id)?.default ?? null)
}

export async function resetAllBindings(): Promise<void> {
  overrides = {}
  await persist()
}

export function isCustomised(id: ActionId): boolean {
  return id in overrides
}

/** Settings turns this on while it is listening for a new key, so the key being recorded doesn't also trigger its old action. */
export function setCapturing(on: boolean): void {
  capturing = on
}

export function useBindings(): (id: ActionId) => string | null {
  // The snapshot is the overrides object itself — it is replaced (never mutated) on every change,
  // so components re-render exactly when a binding moves.
  useSyncExternalStore(subscribe, () => overrides)
  return bindingFor
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}

/**
 * Runs `handlers[action]` when that action's current key is pressed. Handlers are read through a
 * ref, so callers can pass fresh closures every render without re-subscribing. A bare printable
 * key (like "?") or an editing combo (Ctrl+A/C/V/X/Z/Y) is skipped while typing in a field so text editing keeps working;
 * anything with Ctrl/Alt, or a named key like PageDown, fires regardless — same as before.
 */
export function useShortcutHandlers(handlers: Partial<Record<ActionId, () => void>>): void {
  const ref = useRef(handlers)
  ref.current = handlers
  useBindings()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (capturing) return
      const combo = eventToCombo(e)
      if (!combo) return
      const action = ACTIONS.find((a) => ref.current[a.id] && bindingFor(a.id) === combo)
      if (!action) return
      const bare = !e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1
      if ((bare || EDITING_COMBOS.has(combo)) && isTyping(e.target)) return
      e.preventDefault()
      ref.current[action.id]?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
