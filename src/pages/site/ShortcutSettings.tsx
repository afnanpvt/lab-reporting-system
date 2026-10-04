import { useEffect, useState } from 'react'
import { Keyboard, RotateCcw, X } from 'lucide-react'
import {
  ACTIONS,
  comboLabel,
  eventToCombo,
  isCustomised,
  resetAllBindings,
  resetBinding,
  setBinding,
  setCapturing,
  useBindings,
  validateCombo,
  type ActionDef,
  type ActionId
} from './shortcutsStore'

const GROUPS: ActionDef['group'][] = ['Patients', 'Fields', 'Result entry']

/** Settings card for viewing and changing every app shortcut. Click a key, press the new combination; Esc cancels, Backspace clears it. */
export default function ShortcutSettings() {
  const bindingFor = useBindings()
  const [recording, setRecording] = useState<ActionId | null>(null)
  // Shown on the row it is about, not at the top of the card — the list is long enough that the
  // top is usually scrolled out of sight while a key is being recorded.
  const [message, setMessage] = useState<{ id: ActionId; tone: 'error' | 'info'; text: string } | null>(null)

  useEffect(() => {
    setCapturing(recording !== null)
    return () => setCapturing(false)
  }, [recording])

  useEffect(() => {
    if (!recording) return
    const onKey = async (e: KeyboardEvent) => {
      // Take over the keyboard completely while recording — otherwise Ctrl+1 would also navigate away.
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') {
        setRecording(null)
        return
      }
      if (e.key === 'Backspace' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        await setBinding(recording, null)
        setMessage({ id: recording, tone: 'info', text: 'Shortcut removed.' })
        setRecording(null)
        return
      }
      const combo = eventToCombo(e)
      if (!combo) return // only a modifier so far — wait for the real key
      const problem = validateCombo(combo, recording)
      if (problem) {
        setMessage({ id: recording, tone: 'error', text: problem })
        return
      }
      const displaced = await setBinding(recording, combo)
      setMessage(displaced ? { id: recording, tone: 'info', text: `Saved. “${displaced.label}” had ${comboLabel(combo)} and is now unassigned.` } : { id: recording, tone: 'info', text: 'Saved.' })
      setRecording(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [recording])

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Keyboard size={16} className="text-[var(--accent)]" />
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--ink-3)]">Keyboard shortcuts</h2>
        </div>
        <button
          type="button"
          onClick={() => { resetAllBindings(); setMessage(null); setRecording(null) }}
          className="text-[12.5px] font-medium text-[var(--ink-3)] hover:text-[var(--accent)]"
        >
          Reset all
        </button>
      </div>
      <p className="text-[13px] text-[var(--ink-3)] mb-4 leading-relaxed">Click a shortcut, then press the keys you want. Esc cancels; Backspace removes it.</p>

      <div className="space-y-4">
        {GROUPS.map((group) => (
          <div key={group}>
            <div className="text-[10.5px] font-bold uppercase tracking-widest text-[var(--ink-4)] mb-1.5">{group}</div>
            <div className="divide-y divide-[var(--border-soft)]">
              {ACTIONS.filter((a) => a.group === group).map((a) => {
                const combo = bindingFor(a.id)
                const active = recording === a.id
                return (
                  <div key={a.id} className="py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13.5px] text-[var(--ink)]">{a.label}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => { setMessage(null); setRecording(active ? null : a.id) }}
                        className="min-w-[112px] text-center text-[12px] font-semibold rounded-md px-2.5 py-1.5 border transition-colors"
                        style={{
                          fontFamily: 'Consolas, monospace',
                          background: active ? 'var(--accent-soft)' : 'var(--bg-app)',
                          borderColor: active ? 'var(--accent)' : 'var(--border)',
                          color: active ? 'var(--accent)' : combo ? 'var(--ink)' : 'var(--ink-4)'
                        }}
                      >
                        {active ? 'Press keys…' : comboLabel(combo)}
                      </button>
                      <button
                        type="button"
                        title="Reset to default"
                        aria-label={`Reset ${a.label} to default`}
                        disabled={!isCustomised(a.id)}
                        onClick={() => { resetBinding(a.id); setMessage(null) }}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--ink-4)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent)] disabled:opacity-0 disabled:pointer-events-none"
                      >
                        <RotateCcw size={13} />
                      </button>
                      <button
                        type="button"
                        title="Remove shortcut"
                        aria-label={`Remove ${a.label} shortcut`}
                        disabled={!combo}
                        onClick={() => { setBinding(a.id, null); setMessage(null) }}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--ink-4)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] disabled:opacity-0 disabled:pointer-events-none"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                  {message?.id === a.id && (
                    <div
                      className="text-[12px] rounded-lg px-2.5 py-1.5 mt-2"
                      style={message.tone === 'error' ? { background: 'var(--danger-soft)', color: 'var(--danger-ink)' } : { background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}
                    >
                      {message.text}
                    </div>
                  )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
