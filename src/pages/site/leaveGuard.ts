import { useEffect, useRef } from 'react'
import { useNavigate, type NavigateOptions } from 'react-router-dom'
import { unsavedChangesDialog } from './confirmStore'

// "You have unsaved changes": one guard shared by every screen that has a Save button.
//
// A screen with edits that haven't been saved registers a guard (useLeaveGuard). Every way of
// leaving the screen inside the app (the sidebar, a Back or Cancel button, a keyboard shortcut) goes
// through useGuardedNavigate(), which asks the guard first. The guard shows the unsaved-changes
// dialog and answers "may we leave?": Save changes saves and then lets the move happen, Discard
// changes lets it happen, Keep editing stops it. Only one screen is ever on show, so one guard is
// enough, and it is removed as soon as the edits are saved, undone, or the screen closes.

type Guard = () => Promise<boolean>
let guard: Guard | null = null

/** Resolves true if it is fine to leave the current screen (no unsaved edits, or the user dealt with them). */
export async function canLeave(): Promise<boolean> {
  return guard ? guard() : true
}

/**
 * Registers the guard while `dirty` is true. `save` should persist the edits and return false if it
 * could not (nothing is then left); `canSave` is false when something needs fixing first, which
 * hides the Save button in the dialog. `what` names the screen in the wording.
 */
export function useLeaveGuard(dirty: boolean, save: () => Promise<boolean> | boolean, options: { canSave?: boolean; what?: string } = {}): void {
  const saveRef = useRef(save)
  saveRef.current = save
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    if (!dirty) return
    const mine: Guard = async () => {
      const choice = await unsavedChangesDialog({ canSave: optionsRef.current.canSave, what: optionsRef.current.what })
      if (choice === 'stay') return false
      if (choice === 'save') return (await saveRef.current()) !== false
      return true // discard
    }
    guard = mine
    return () => {
      if (guard === mine) guard = null
    }
  }, [dirty])
}

/** react-router's navigate, but it first gives the current screen a chance to keep unsaved edits. */
export function useGuardedNavigate() {
  const navigate = useNavigate()
  return async (to: string, options?: NavigateOptions) => {
    if (await canLeave()) navigate(to, options)
  }
}
