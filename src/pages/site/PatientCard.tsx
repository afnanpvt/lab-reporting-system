import { Clock, User2, Stethoscope, Trash2 } from 'lucide-react'
import type { Patient, PatientStatus } from './api'
import { formatTime12h } from './reportFields'

export const statusCard: Record<string, { bg: string; border: string; text: string; label: string }> = {
  completed: { bg: 'var(--success-soft)', border: 'var(--success-soft-border)', text: 'var(--success)', label: 'Completed' },
  partial: { bg: 'var(--warning-soft)', border: 'var(--warning-soft-border)', text: 'var(--warning)', label: 'In progress' },
  draft: { bg: 'var(--danger-soft)', border: 'var(--danger-soft-border)', text: 'var(--danger)', label: 'Draft' }
}

/**
 * The doctor's name shown as its own recognizable badge rather than buried in a meta line.
 * Deliberately not a link — the patients area is a clinical working view, not a place to jump
 * into a doctor's financial incentive report. That report is only reachable from the Doctors
 * and Reports areas, where looking at commission figures actually belongs.
 */
export function HandledByBadge({ referredBy }: { referredBy: string }) {
  if (referredBy === 'Self') {
    return <span className="text-[13px] text-[var(--ink-3)]">Self-referred</span>
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--accent-ink)] bg-[var(--accent-soft)] px-2 py-1 rounded-full -ml-2">
      <Stethoscope size={11} />
      {referredBy}
    </span>
  )
}

/**
 * The one patient card design used everywhere a patient shows up as a card — Patients directory
 * and Dashboard's recent-patients grid — so the two never drift apart.
 *
 * `index` is a plain display-order number ("Patient 3"), not a stored identifier — it's for quick
 * verbal reference ("look at patient 3") and changes if the list order changes. The permanent,
 * unique-per-patient reference is the SID printed on the report itself.
 *
 * `status` is passed in rather than computed here — it depends on that patient's results, which
 * now live behind an async IPC call, so callers batch-load it once via listPatientsWithStatus().
 */
export function PatientCard({ patient: p, status, index, onOpen, onDelete }: { patient: Patient; status: PatientStatus; index: number; onOpen: (p: Patient) => void; onDelete?: (p: Patient) => void }) {
  const s = statusCard[status]
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(p)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(p) } }}
      className="relative text-left rounded-2xl p-5 border shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-40)]"
      style={{ borderColor: 'var(--border)' }}
    >
      <div
        className="absolute -top-2.5 -left-2.5 w-7 h-7 rounded-full text-white text-[12px] font-bold flex items-center justify-center shadow"
        style={{ background: 'var(--ink)' }}
        title={`Patient ${index + 1} in this list`}
      >
        {index + 1}
      </div>
      {onDelete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(p) }}
          title="Delete patient record"
          className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full text-[var(--danger)] bg-[var(--surface)] border border-[var(--danger-soft-border)] flex items-center justify-center shadow hover:bg-[var(--danger-soft)]"
        >
          <Trash2 size={13} />
        </button>
      )}
      <div className="flex items-start justify-between mb-3.5">
        <div className="w-10 h-10 rounded-full bg-[var(--bg-hover)] flex items-center justify-center">
          <User2 size={17} className="text-[var(--ink-3)]" />
        </div>
        <span
          className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}` }}
        >
          {s.label}
        </span>
      </div>
      <div className="text-[16.5px] font-semibold text-[var(--ink)] mb-0.5">{p.name}</div>
      <div className="text-[13.5px] text-[var(--ink-2)] mb-3.5">
        {p.age}{p.ageUnit} · {p.gender === 'M' ? 'Male' : 'Female'} · {p.sid}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap mb-3.5">
        {p.sections.map((sec) => (
          <span key={sec} className="text-[11.5px] px-2 py-1 rounded-full bg-[var(--bg-hover)] text-[var(--ink-2)]">
            {sec}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border-soft)]">
        <HandledByBadge referredBy={p.referredBy} />
        <span className="flex items-center gap-1 text-[13px] text-[var(--ink-3)] flex-shrink-0">
          <Clock size={12} />
          {formatTime12h(p.regTime)}
        </span>
      </div>
    </div>
  )
}
