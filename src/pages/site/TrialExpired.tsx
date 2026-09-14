import { ExternalLink, Lock } from 'lucide-react'
import type { LicenseStatus } from '../../types/license'
import LicenseKeyForm from './LicenseKeyForm'
import { contactScalyft } from './contact'

// Replaces the whole app (no Shell, no routes) once a trial has expired — see App.tsx.
export default function TrialExpired({ license }: { license: LicenseStatus }) {
  return (
    <div className="relative flex items-center justify-center min-h-screen w-screen bg-[var(--bg-app)] py-10">
      <div className="titlebar-drag fixed top-0 left-0 right-0" style={{ height: 76 }} />
      <div className="max-w-md w-full mx-6 bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-8 text-center">
        <div className="mx-auto mb-5 w-12 h-12 rounded-full bg-[var(--danger-soft)] flex items-center justify-center">
          <Lock size={20} className="text-[var(--danger)]" />
        </div>
        <h1 className="text-[19px] font-semibold text-[var(--ink)] mb-2">Your trial has ended</h1>
        <p className="text-[14.5px] text-[var(--ink-2)] leading-relaxed mb-5">
          The trial for <span className="font-medium text-[var(--ink)]">{license.labName}</span> ended
          {license.expiresAt ? <> on {new Date(license.expiresAt).toLocaleDateString()}</> : ''}. Your patients
          and reports are safe on this computer — activate the full version to keep using them.
        </p>

        <div className="rounded-xl bg-[var(--bg-app)] border border-[var(--border)] px-4 py-3.5 mb-5 text-left">
          <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-1.5">Buy the full version</div>
          <p className="text-[14px] text-[var(--ink-2)]">
            Contact Scalyft to get the full version for your lab.
          </p>
          {license.licenseId && (
            <p className="text-[13px] text-[var(--ink-3)] mt-0.5">
              Your license ID: <span className="font-mono text-[var(--ink)] select-text">{license.licenseId}</span>
            </p>
          )}
          <button
            onClick={contactScalyft}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-[14px] font-medium border border-[var(--border-strong)] rounded-xl text-[var(--ink)] hover:bg-[var(--bg-hover)]"
          >
            <ExternalLink size={15} />
            Contact Scalyft
          </button>
        </div>

        <LicenseKeyForm />
      </div>
    </div>
  )
}
