import { useEffect, useRef } from 'react'
import { AlertTriangle, HelpCircle, Trash2 } from 'lucide-react'
import { settleConfirm, useConfirmRequest, type ConfirmTone } from './confirmStore'

const TONES: Record<ConfirmTone, { Icon: typeof Trash2; soft: string; fg: string; button: string; buttonHover: string }> = {
  danger: { Icon: Trash2, soft: 'var(--danger-soft)', fg: 'var(--danger)', button: 'var(--danger)', buttonHover: 'var(--danger-ink)' },
  warning: { Icon: AlertTriangle, soft: 'var(--warning-soft)', fg: 'var(--warning)', button: 'var(--accent)', buttonHover: 'var(--accent-ink)' },
  default: { Icon: HelpCircle, soft: 'var(--accent-soft)', fg: 'var(--accent)', button: 'var(--accent)', buttonHover: 'var(--accent-ink)' }
}

/**
 * Draws whichever confirmation confirmDialog() has asked for. Mounted once, in Shell. Esc or a click
 * on the backdrop cancels. For a destructive action the safe button (Cancel) has focus when it opens,
 * so a stray Enter can't delete anything; Tab moves between the two buttons.
 */
export default function ConfirmHost() {
  const request = useConfirmRequest()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!request) return
    ;(request.tone === 'danger' ? cancelRef : confirmRef).current?.focus()
  }, [request])

  if (!request) return null
  const tone = TONES[request.tone]

  // Nothing typed while the dialog is open may reach the page behind it (shortcuts, field navigation).
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      settleConfirm(false)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const goingToConfirm = document.activeElement === cancelRef.current
      ;(goingToConfirm ? confirmRef : cancelRef).current?.focus()
    }
    e.stopPropagation()
  }

  return (
    <div
      className="confirm-backdrop fixed inset-0 z-[100] flex items-center justify-center p-6 print:hidden"
      style={{ background: 'rgba(20, 28, 38, 0.5)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) settleConfirm(false) }}
      onKeyDown={onKeyDown}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="confirm-card w-[27rem] max-w-full rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6"
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
            onClick={() => settleConfirm(false)}
            className="px-4 py-2.5 text-[14px] font-medium rounded-xl border border-[var(--border-strong)] text-[var(--ink)] hover:bg-[var(--bg-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-40)]"
          >
            {request.cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => settleConfirm(true)}
            className="px-4 py-2.5 text-[14px] font-medium rounded-xl text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-40)]"
            style={{ background: tone.button }}
            onMouseEnter={(e) => { e.currentTarget.style.background = tone.buttonHover }}
            onMouseLeave={(e) => { e.currentTarget.style.background = tone.button }}
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
