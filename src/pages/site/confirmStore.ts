import { useSyncExternalStore } from 'react'

// The app's own dialogs. Anything that used to call window.confirm() (deleting a patient, a doctor, a
// profile, an added test) calls confirmDialog() and awaits the answer; a screen with unsaved edits
// calls unsavedChangesDialog() and gets back what the user wants to do about them. They are drawn by
// ConfirmHost (mounted once in Shell) in the app's own style. The browser's native box looked like an
// old Windows message box, ignored the theme, and showed the app's internal window title.

export type ConfirmTone = 'danger' | 'warning' | 'default'
/** Which button was used: the main action, the optional middle one (discard), or Cancel / Esc / click outside. */
export type ConfirmChoice = 'confirm' | 'discard' | 'cancel'

export interface ConfirmOptions {
  title: string
  /** What is being acted on (a patient's name and SID, a doctor, a profile) shown as a highlighted chip under the title. */
  subject?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Adds a third, middle button (used by the unsaved-changes dialog for "Discard changes"). */
  discardLabel?: string
  tone?: ConfirmTone
}

export interface ConfirmRequest {
  title: string
  subject?: string
  message?: string
  confirmLabel: string
  cancelLabel: string
  discardLabel?: string
  tone: ConfirmTone
  /** Hides the main button (used when there is nothing that can be saved yet). */
  noConfirm?: boolean
  resolve: (choice: ConfirmChoice) => void
}

let current: ConfirmRequest | null = null
const listeners = new Set<() => void>()

function emit(): void {
  for (const l of listeners) l()
}

function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

function open(request: Omit<ConfirmRequest, 'resolve'>): Promise<ConfirmChoice> {
  return new Promise((resolve) => {
    // A second request while one is open cancels the first rather than stacking dialogs.
    current?.resolve('cancel')
    current = { ...request, resolve }
    emit()
  })
}

/** Opens a yes/no dialog and resolves true if the user confirms, false if they cancel, press Esc or click outside. */
export async function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  const tone = options.tone ?? 'default'
  const choice = await open({
    title: options.title,
    subject: options.subject,
    message: options.message,
    tone,
    confirmLabel: options.confirmLabel ?? (tone === 'danger' ? 'Delete' : 'Confirm'),
    cancelLabel: options.cancelLabel ?? 'Cancel',
    discardLabel: options.discardLabel
  })
  return choice === 'confirm'
}

export type UnsavedChoice = 'save' | 'discard' | 'stay'

/**
 * Asked when someone tries to leave a screen with unsaved edits. 'save' saves and carries on,
 * 'discard' leaves and drops the edits, 'stay' (also Esc or a click outside) goes back to editing.
 * When `canSave` is false (something still needs fixing first) the Save button is not offered.
 */
export async function unsavedChangesDialog(options: { canSave?: boolean; what?: string } = {}): Promise<UnsavedChoice> {
  const canSave = options.canSave !== false
  const what = options.what ?? 'this screen'
  const choice = await open({
    title: 'You have unsaved changes',
    message: canSave
      ? `Changes made on ${what} have not been saved. Save them before leaving, or discard them.`
      : `Some entries on ${what} still need attention, so they cannot be saved yet. You can go back and correct them, or discard your changes.`,
    tone: 'warning',
    confirmLabel: 'Save changes',
    cancelLabel: 'Keep editing',
    discardLabel: 'Discard changes',
    noConfirm: !canSave
  })
  return choice === 'confirm' ? 'save' : choice === 'discard' ? 'discard' : 'stay'
}

export function settleConfirm(choice: ConfirmChoice | boolean): void {
  const request = current
  current = null
  emit()
  request?.resolve(typeof choice === 'boolean' ? (choice ? 'confirm' : 'cancel') : choice)
}

export function useConfirmRequest(): ConfirmRequest | null {
  return useSyncExternalStore(subscribe, () => current)
}
