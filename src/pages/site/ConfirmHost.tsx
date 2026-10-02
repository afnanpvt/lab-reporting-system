import { useEffect, useRef } from 'react'
import { AlertTriangle, HelpCircle, Trash2 } from 'lucide-react'
import { settleConfirm, useConfirmRequest, type ConfirmTone } from './confirmStore'

const TONES: Record<ConfirmTone, { Icon: typeof Trash2; soft: string; fg: string; button: string; buttonHover: string }> = {
  danger: { Icon: Trash2, soft: 'var(--danger-soft)', fg: 'var(--danger)', button: 'var(--danger)', buttonHover: 'var(--danger-ink)' },
  warning: { Icon: AlertTriangle, soft: 'var(--warning-soft)', fg: 'var(--warning)', button: 'var(--accent)', buttonHover: 'var(--accent-ink)' },
  default: { Icon: HelpCircle, soft: 'var(--accent-soft)', fg: 'var(--accent)', button: 'var(--accent)', buttonHover: 'var(--accent-ink)' }
}

const FOCUS = 'focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-40)]'

/**
 * Draws whichever dialog confirmDialog() / unsavedChangesDialog() has asked for. Mounted once, in
 * Shell. Esc or a click on the backdrop cancels. For a destructive action the safe button (Cancel)
 * has focus when it opens, so a stray Enter can't delete anything; otherwise the main button does.
 * Tab moves between the buttons.
 */
export default function ConfirmHost() {
  const request = useConfirmRequest()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const discardRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!request) return
    const first = request.tone === 'danger' || request.noConfirm ? cancelRef : confirmRef
    first.current?.focus()
  }, [request])

  if (!request) return null
  const tone = TONES[request.tone]

  // Nothing typed while a dialog is open may reach the page behind it (shortcuts, field navigation).
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      settleConfirm('cancel')
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const order = [cancelRef.current, discardRef.current, confirmRef.current].filter((b): b is HTMLButtonElement => !!b)
      const at = order.indexOf(document.activeElement as HTMLButtonElement)
      const next = order[(at + (e.shiftKey ? order.length - 1 : 1)) % order.length]
      next?.focus()
    }
    e.stopPropagation()
  }

  return (
    <div
      className="confirm-backdrop fixed inset-0 z-[100] flex items-center justify-center p-6 print:hidden"
      style={{ background: 'rgba(20, 28, 38, 0.5)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) settleConfirm('cancel') }}
      onKeyDown={onKeyDown}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="confirm-card w-[28rem] max-w-full rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6"
        style={{ boxShadow: '0 24px 60px rgba(15, 23, 32, 0.28), 0 4px 14px rgba(15, 23, 32, 0.12)' }}
      >
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: tone.soft, color: tone.fg }}>
            <tone.Icon size={20} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id="confirm-title" className="text-[17px] font-semibold text-[var(--ink)] leading-snug">{request.title}</h2>
            {request.subject && (
              <div className="inline-block max-w-full truncate mt-2 px-2.5 py-1 rounded-lg text-[13.5px] font-medium bg-[var(--bg-app)] border border-[var(--border)] text-[var(--ink)]">
                {request.subject}
              </div>
            )}
            {request.message && <p className="text-[14px] text-[var(--ink-2)] leading-relaxed mt-2.5 whitespace-pre-line">{request.message}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2.5 mt-6">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => settleConfirm('cancel')}
            className={`px-4 py-2.5 text-[14px] font-medium rounded-xl border border-[var(--border-strong)] text-[var(--ink)] hover:bg-[var(--bg-hover)] ${FOCUS}`}
          >
            {request.cancelLabel}
          </button>
          {request.discardLabel && (
            <button
              ref={discardRef}
              type="button"
              onClick={() => settleConfirm('discard')}
              className={`px-4 py-2.5 text-[14px] font-medium rounded-xl border hover:bg-[var(--danger-soft)] ${FOCUS}`}
              style={{ borderColor: 'var(--danger-soft-border)', color: 'var(--danger-ink)' }}
            >
              {request.discardLabel}
            </button>
          )}
          {!request.noConfirm && (
            <button
              ref={confirmRef}
              type="button"
              onClick={() => settleConfirm('confirm')}
              className={`px-4 py-2.5 text-[14px] font-medium rounded-xl text-white shadow-sm ${FOCUS}`}
              style={{ background: tone.button }}
              onMouseEnter={(e) => { e.currentTarget.style.background = tone.buttonHover }}
              onMouseLeave={(e) => { e.currentTarget.style.background = tone.button }}
            >
              {request.confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
