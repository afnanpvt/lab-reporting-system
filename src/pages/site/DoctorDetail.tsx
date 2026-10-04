import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Pencil, Phone, Stethoscope, Users, IndianRupee, ClipboardList } from 'lucide-react'
import { getDoctor, listPatients, loadBillingContext, incentiveLineItemsFor, type Doctor, type Patient, type BillingContext } from './api'
import PeriodFilter from './PeriodFilter'
import { rangeFor, periodLabel, loadPeriod, savePeriod, type Preset } from './period'

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`

/**
 * One referring doctor: how many patients they sent and what was billed, for a chosen period, with
 * the patients listed. The printable incentive report is made from here ("Create incentive report"),
 * for the same period.
 */
export default function DoctorDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [billing, setBilling] = useState<BillingContext | null>(null)

  const initial = useState(loadPeriod)[0]
  const [preset, setPreset] = useState<Preset>(initial.preset)
  const [customFrom, setCustomFrom] = useState(initial.customFrom)
  const [customTo, setCustomTo] = useState(initial.customTo)
  useEffect(() => { savePeriod({ preset, customFrom, customTo }) }, [preset, customFrom, customTo])

  useEffect(() => {
    if (!id) return
    getDoctor(Number(id)).then((d) => { setDoctor(d); setLoaded(true) })
    listPatients().then(setPatients)
    loadBillingContext().then(setBilling)
  }, [id])

  if (loaded && !doctor) {
    return <main className="px-10 py-9"><p className="text-[15px] text-[var(--ink-2)]">Doctor not found.</p></main>
  }
  if (!doctor || !billing) {
    return <main className="px-10 py-9"><p className="text-[15px] text-[var(--ink-2)]">Loading…</p></main>
  }

  const { from, to } = rangeFor(preset, customFrom, customTo)
  const rows = incentiveLineItemsFor(billing, patients, doctor.name).filter((r) => (!from || r.date >= from) && (!to || r.date <= to))
  const total = rows.reduce((sum, r) => sum + r.amount, 0)

  // One line per patient, with the tests they had and what those came to.
  const byPatient = new Map<string, { name: string; sid: string; date: string; tests: string[]; amount: number }>()
  for (const r of rows) {
    const entry = byPatient.get(r.patientSid) ?? { name: r.patientName, sid: r.patientSid, date: r.date, tests: [], amount: 0 }
    entry.tests.push(r.investigation)
    entry.amount += r.amount
    byPatient.set(r.patientSid, entry)
  }
  const handled = [...byPatient.values()]

  const tile = (Icon: typeof Users, label: string, value: string) => (
    <div className="flex items-center gap-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
        <Icon size={17} />
      </div>
      <div>
        <div className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">{label}</div>
        <div className="text-[22px] font-semibold text-[var(--ink)] leading-tight">{value}</div>
      </div>
    </div>
  )

  return (
    <main className="px-10 py-9">
      <button onClick={() => navigate('/doctors')} className="inline-flex items-center gap-1.5 text-[14px] text-[var(--ink-3)] hover:text-[var(--ink)] mb-5">
        <ArrowLeft size={15} />
        Back to doctors
      </button>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-hover)] flex items-center justify-center flex-shrink-0">
            <Stethoscope size={20} className="text-[var(--ink-3)]" />
          </div>
          <div>
            <h1 className="text-[26px] font-semibold text-[var(--ink)] leading-tight">{doctor.name}</h1>
            {doctor.qualifications && <div className="text-[14px] text-[var(--ink-3)]">{doctor.qualifications}</div>}
            <div className="text-[14.5px] text-[var(--ink-2)]">{doctor.specialty}</div>
            {doctor.phone && (
              <div className="flex items-center gap-1.5 text-[13.5px] text-[var(--ink-3)] mt-1"><Phone size={12} />{doctor.phone}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/doctors/new', { state: { doctor } })}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-medium rounded-xl border border-[var(--border-strong)] text-[var(--ink)] hover:bg-[var(--bg-hover)]"
          >
            <Pencil size={14} />
            Edit
          </button>
          <button
            onClick={() => navigate(`/doctors/${doctor.id}/report`, { state: { from: `/doctors/${doctor.id}` } })}
            className="inline-flex items-center gap-2 px-5 py-3 bg-[var(--accent)] text-white text-[15px] font-medium rounded-2xl hover:bg-[var(--accent-ink)] shadow-sm"
            title="Review and print or save the incentive report as a PDF, for the period shown"
          >
            <FileText size={16} />
            Create incentive report
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <PeriodFilter preset={preset} customFrom={customFrom} customTo={customTo} onPreset={setPreset} onFrom={setCustomFrom} onTo={setCustomTo} />
        <span className="text-[13.5px] text-[var(--ink-3)]">{periodLabel(preset, from, to)}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
        {tile(Users, 'Patients referred', String(handled.length))}
        {tile(ClipboardList, 'Tests done', String(rows.length))}
        {tile(IndianRupee, 'Billed through referrals', inr(total))}
      </div>

      <h2 className="text-[13px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3">Patients in this period</h2>
      {handled.length === 0 ? (
        <p className="text-[14.5px] text-[var(--ink-3)] py-10 text-center rounded-2xl border border-[var(--border)] bg-[var(--surface)]">No referrals from this doctor in this period.</p>
      ) : (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-[11.5px] font-bold uppercase tracking-wide text-[var(--ink-3)] border-b border-[var(--border)]">
                <th className="px-5 py-3">Date</th>
                <th className="px-3 py-3">Patient</th>
                <th className="px-3 py-3">SID</th>
                <th className="px-3 py-3">Tests</th>
                <th className="px-5 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {handled.map((h) => (
                <tr key={h.sid} className="border-b border-[var(--border-soft)] last:border-0">
                  <td className="px-5 py-3 text-[var(--ink-2)] whitespace-nowrap">{h.date}</td>
                  <td className="px-3 py-3 font-semibold text-[var(--ink)]">{h.name}</td>
                  <td className="px-3 py-3 text-[var(--ink-2)] whitespace-nowrap">{h.sid}</td>
                  <td className="px-3 py-3 text-[var(--ink-2)]">{h.tests.join(', ')}</td>
                  <td className="px-5 py-3 text-right font-semibold text-[var(--ink)] whitespace-nowrap">{inr(h.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-[var(--border)]">
                <td colSpan={4} className="px-5 py-3 text-right text-[13px] font-semibold text-[var(--ink-3)]">Total</td>
                <td className="px-5 py-3 text-right font-semibold text-[var(--accent-ink)] whitespace-nowrap">{inr(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </main>
  )
}
