import { useSyncExternalStore } from 'react'

// The app's own confirmation dialog. Anything that used to call window.confirm() — deleting a
// patient, a doctor, a profile, an added test; leaving the test editor with unsaved changes — calls
// confirmDialog() instead and awaits the answer. The browser's native box looked like an old Windows
// message box, ignored the app's theme, and showed the app's internal window title; this one is drawn
// by ConfirmHost (mounted once in Shell) in the app's own style.

export type ConfirmTone = 'danger' | 'warning' | 'default'

export interface ConfirmOptions {
  title: string
  /** What is being acted on — a patient's name and SID, a doctor, a profile — shown as a highlighted chip under the title. */
  subject?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
}

export interface ConfirmRequest extends Required<Pick<ConfirmOptions, 'title' | 'confirmLabel' | 'cancelLabel' | 'tone'>> {
  subject?: string
  message?: string
  resolve: (confirmed: boolean) => void
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

/** Opens the dialog and resolves true if the user confirms, false if they cancel, press Esc or click outside. */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    // A second request while one is open cancels the first rather than stacking dialogs.
    current?.resolve(false)
    const tone = options.tone ?? 'default'
    current = {
      title: options.title,
      subject: options.subject,
      message: options.message,
      tone,
      confirmLabel: options.confirmLabel ?? (tone === 'danger' ? 'Delete' : 'Confirm'),
      cancelLabel: options.cancelLabel ?? 'Cancel',
      resolve
    }
    emit()
  })
}

export function settleConfirm(confirmed: boolean): void {
  const request = current
  current = null
  emit()
  request?.resolve(confirmed)
}

export function useConfirmRequest(): ConfirmRequest | null {
  return useSyncExternalStore(subscribe, () => current)
}
