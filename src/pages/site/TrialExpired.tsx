import { Lock, Mail } from 'lucide-react'

/**
 * Full-screen block shown instead of the entire app (Shell, routes, everything) once a trial
 * license's expiresAt has passed — see App.tsx, which checks license:status before rendering
 * anything else. Deliberately shows nothing about the lab's data behind it; the point is sales
 * pressure to convert the trial, not a soft "read-only" mode.
 */
export default function TrialExpired({ labName, expiresAt }: { labName?: string; expiresAt?: string }) {
  return (
    <div className="flex items-center justify-center h-screen w-screen bg-[var(--bg-app)]">
      <div className="max-w-md w-full mx-6 bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-8 text-center">
        <div className="mx-auto mb-5 w-12 h-12 rounded-full bg-[var(--danger-soft)] flex items-center justify-center">
          <Lock size={20} className="text-[var(--danger)]" />
        </div>
        <h1 className="text-[19px] font-semibold text-[var(--ink)] mb-2">Your trial has ended</h1>
        <p className="text-[14.5px] text-[var(--ink-2)] leading-relaxed mb-1">
          {labName ? <>The trial period for <span className="font-medium text-[var(--ink)]">{labName}</span> ended</> : 'This trial ended'}
          {expiresAt ? <> on {new Date(expiresAt).toLocaleDateString()}</> : ''}.
        </p>
        <p className="text-[14.5px] text-[var(--ink-2)] leading-relaxed mb-6">
          Contact Scalyft to activate the full version and keep using LumaLabs.
        </p>
        <button
          onClick={() => window.api.shell.openExternal('https://www.scalyft.tech')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-white text-[14px] font-medium rounded-xl hover:bg-[var(--accent-ink)] shadow-sm"
        >
          <Mail size={15} />
          Contact Scalyft
        </button>
      </div>
    </div>
  )
}
