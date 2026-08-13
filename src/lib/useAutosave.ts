import { useCallback, useRef, useState } from 'react'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/** Debounced autosave — result entry never depends on a manual Save button. Failure surfaces as 'error' with a retry, never a thrown exception the caller has to handle. */
export function useAutosave(delay = 700) {
  const [state, setState] = useState<SaveState>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const pendingFnRef = useRef<(() => Promise<void>) | null>(null)

  const runSave = useCallback(async (fn: () => Promise<void>) => {
    setState('saving')
    try {
      await fn()
      setState('saved')
    } catch {
      setState('error')
    }
  }, [])

  const trigger = useCallback((fn: () => Promise<void>) => {
    pendingFnRef.current = fn
    setState('saving')
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (pendingFnRef.current) runSave(pendingFnRef.current)
    }, delay)
  }, [delay, runSave])

  const retry = useCallback(() => {
    if (pendingFnRef.current) runSave(pendingFnRef.current)
  }, [runSave])

  return { state, trigger, retry }
}
