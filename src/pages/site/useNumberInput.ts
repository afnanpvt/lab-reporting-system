import { useLayoutEffect, useRef } from 'react'
import { formatThousands } from './numberFormat'

/**
 * For a controlled <input> holding a result: runs what was typed through formatThousands() before
 * handing it on, and puts the caret back beside the digit it was next to. A controlled input whose
 * text changes under it jumps its caret to the end, which would make typing in the middle of
 * "11,500" unusable — so the intended caret is remembered here and applied right after the new
 * value has rendered. Spread `ref` and `onChange` onto the input.
 */
export function useNumberInput(commit: (text: string) => void) {
  const ref = useRef<HTMLInputElement>(null)
  const pending = useRef<number | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    const caret = pending.current
    pending.current = null
    if (el && caret !== null && caret >= 0 && document.activeElement === el) el.setSelectionRange(caret, caret)
  })

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target
    const out = formatThousands(el.value, el.selectionStart ?? el.value.length)
    pending.current = out.caret
    commit(out.text)
    // If the value ended up unchanged there is no re-render to consume it; don't let it go stale.
    setTimeout(() => { pending.current = null }, 0)
  }

  return { ref, onChange }
}
