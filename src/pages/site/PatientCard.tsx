import { useEffect, useRef, useState } from 'react'
import { Clock, User2, Stethoscope, Trash2 } from 'lucide-react'
import type { Patient, PatientStatus } from './api'
import { formatTime12h } from './reportFields'
import type { ViewMode } from './ViewToggle'

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
      className="relative flex flex-col text-left rounded-2xl p-5 border shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-40)]"
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
      <div className="mb-3.5 flex-1"><TestChips sections={p.sections} /></div>
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

const SHOWN_TESTS = 3

/**
 * The tests a patient has. A card shows the first few and a "+N more" chip; that chip opens a small
 * window right there with all of them, so every card stays the same height however many tests there are.
 */
export function TestChips({ sections }: { sections: string[] }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) } }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc, true)
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc, true) }
  }, [open])

  const chip = 'text-[11.5px] px-2 py-1 rounded-full bg-[var(--bg-hover)] text-[var(--ink-2)]'
  const extra = sections.length - SHOWN_TESTS
  return (
    <div ref={box} className="relative flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
      {sections.slice(0, SHOWN_TESTS).map((sec) => <span key={sec} className={chip}>{sec}</span>)}
      {extra > 0 && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          title="Show all tests"
          className="text-[11.5px] font-semibold px-2 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)] hover:opacity-80"
        >
          +{extra} more
        </button>
      )}
      {open && (
        <div
          role="dialog"
          aria-label="All tests"
          className="absolute left-0 top-full mt-2 z-30 w-72 max-w-[85vw] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5"
          style={{ boxShadow: '0 12px 32px rgba(15, 23, 32, 0.18)' }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--ink-3)] mb-2">{sections.length} tests</div>
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
            {sections.map((sec) => <span key={sec} className={chip}>{sec}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}

/** The compact table version of the patient list, for labs with many patients. */
export function PatientTable({ rows, onOpen, onDelete }: { rows: { patient: Patient; status: PatientStatus }[]; onOpen: (p: Patient) => void; onDelete?: (p: Patient) => void }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-x-auto">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="text-left text-[11.5px] font-bold uppercase tracking-wide text-[var(--ink-3)] border-b border-[var(--border)]">
            <th className="pl-5 pr-2 py-3 w-10">#</th>
            <th className="px-3 py-3">Patient</th>
            <th className="px-3 py-3">SID</th>
            <th className="px-3 py-3">Tests</th>
            <th className="px-3 py-3">Referred by</th>
            <th className="px-3 py-3">Time</th>
            <th className="px-3 py-3">Status</th>
            {onDelete && <th className="pr-5 py-3 w-10" />}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ patient: p, status }, i) => {
            const s = statusCard[status]
            return (
              <tr
                key={p.id}
                tabIndex={0}
                onClick={() => onOpen(p)}
                onKeyDown={(e) => { if (e.key === 'Enter') onOpen(p) }}
                className="border-b border-[var(--border-soft)] last:border-0 hover:bg-[var(--bg-hover)] cursor-pointer focus:outline-none focus:bg-[var(--bg-hover)]"
              >
                <td className="pl-5 pr-2 py-3 text-[var(--ink-3)]">{i + 1}</td>
                <td className="px-3 py-3">
                  <div className="font-semibold text-[var(--ink)]">{p.name}</div>
                  <div className="text-[12.5px] text-[var(--ink-3)]">{p.age}{p.ageUnit} · {p.gender === 'M' ? 'Male' : 'Female'}</div>
                </td>
                <td className="px-3 py-3 text-[var(--ink-2)] whitespace-nowrap">{p.sid}</td>
                <td className="px-3 py-3"><TestChips sections={p.sections} /></td>
                <td className="px-3 py-3 text-[var(--ink-2)]">{p.referredBy === 'Self' ? 'Self-referred' : p.referredBy}</td>
                <td className="px-3 py-3 text-[var(--ink-3)] whitespace-nowrap">{formatTime12h(p.regTime)}</td>
                <td className="px-3 py-3">
                  <span className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}` }}>{s.label}</span>
                </td>
                {onDelete && (
                  <td className="pr-5 py-3">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDelete(p) }}
                      title="Delete patient record"
                      aria-label={`Delete ${p.name}`}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--ink-4)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Cards or the table, whichever the user picked: one place so Patients and the Dashboard match. */
export function PatientList({ rows, mode, onOpen, onDelete }: { rows: { patient: Patient; status: PatientStatus }[]; mode: ViewMode; onOpen: (p: Patient) => void; onDelete?: (p: Patient) => void }) {
  if (mode === 'list') return <PatientTable rows={rows} onOpen={onOpen} onDelete={onDelete} />
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {rows.map((r, i) => (
        <PatientCard key={r.patient.id} patient={r.patient} status={r.status} index={i} onOpen={onOpen} onDelete={onDelete} />
      ))}
    </div>
  )
}
