import { Clock, User2, Stethoscope } from 'lucide-react'
import { doctorByName, computePatientStatus, type MockPatient } from './mockData'
import { formatTime12h } from './reportFields'

export const statusCard: Record<string, { bg: string; border: string; text: string; label: string }> = {
  completed: { bg: '#e7f6ee', border: '#bfe4d0', text: '#1f8a54', label: 'Completed' },
  partial: { bg: '#fdf3df', border: '#f0dfad', text: '#9a6b00', label: 'In progress' },
  draft: { bg: '#fceae8', border: '#f0c9c5', text: '#c23b33', label: 'Draft' }
}

/**
 * The doctor's name shown as its own recognizable badge rather than buried in a meta line.
 * Deliberately not a link — the patients area is a clinical working view, not a place to jump
 * into a doctor's financial incentive report. That report is only reachable from the Doctors
 * and Reports areas, where looking at commission figures actually belongs.
 */
export function HandledByBadge({ referredBy }: { referredBy: string }) {
  const doctor = doctorByName(referredBy)
  if (referredBy === 'Self') {
    return <span className="text-[13px] text-[#8593a3]">Self-referred</span>
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-[#125483] bg-[#e8f1f9] px-2 py-1 rounded-full -ml-2">
      <Stethoscope size={11} />
      {doctor?.name ?? referredBy}
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
 */
export function PatientCard({ patient: p, index, onOpen }: { patient: MockPatient; index: number; onOpen: (p: MockPatient) => void }) {
  const s = statusCard[computePatientStatus(p)]
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(p)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(p) } }}
      className="relative text-left rounded-2xl p-5 border shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-white focus:outline-none focus:ring-2 focus:ring-[#1b6fae]/40"
      style={{ borderColor: '#e1e6ec' }}
    >
      <div
        className="absolute -top-2.5 -left-2.5 w-7 h-7 rounded-full text-white text-[12px] font-bold flex items-center justify-center shadow"
        style={{ background: '#1a2430' }}
        title={`Patient ${index + 1} in this list`}
      >
        {index + 1}
      </div>
      <div className="flex items-start justify-between mb-3.5">
        <div className="w-10 h-10 rounded-full bg-[#eef2f6] flex items-center justify-center">
          <User2 size={17} className="text-[#8593a3]" />
        </div>
        <span
          className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}` }}
        >
          {s.label}
        </span>
      </div>
      <div className="text-[16.5px] font-semibold text-[#1a2430] mb-0.5">{p.name}</div>
      <div className="text-[13.5px] text-[#57677a] mb-3.5">
        {p.age}{p.ageUnit} · {p.gender === 'M' ? 'Male' : 'Female'} · {p.sid}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap mb-3.5">
        {p.sections.map((sec) => (
          <span key={sec} className="text-[11.5px] px-2 py-1 rounded-full bg-[#eef2f6] text-[#57677a]">
            {sec}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-[#eaeef2]">
        <HandledByBadge referredBy={p.referredBy} />
        <span className="flex items-center gap-1 text-[13px] text-[#8593a3] flex-shrink-0">
          <Clock size={12} />
          {formatTime12h(p.regTime)}
        </span>
      </div>
    </div>
  )
}
