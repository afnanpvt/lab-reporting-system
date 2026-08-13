import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import type { SaveState } from '../../lib/useAutosave'

export default function AutosaveStatus({ state, onRetry }: { state: SaveState; onRetry?: () => void }) {
  if (state === 'idle') return null
  if (state === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-[14px] text-ink-2">
        <Loader2 size={14} className="animate-spin" />
        Saving…
      </span>
    )
  }
  if (state === 'error') {
    return (
      <span className="flex items-center gap-1.5 text-[14px] text-danger">
        <AlertCircle size={14} />
        Couldn't save
        <button className="underline font-medium" onClick={onRetry}>Retry</button>
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 text-[14px] text-ink-2">
      <CheckCircle2 size={14} className="text-success" />
      All changes saved
    </span>
  )
}
