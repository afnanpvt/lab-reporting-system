import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stethoscope, ChevronRight, FileCheck2, Eye, IndianRupee } from 'lucide-react'
import Tabs from './Tabs'
import PeriodFilter from './PeriodFilter'
import { rangeFor, loadPeriod, savePeriod, type Preset } from './period'
import { listDoctors, listPatientsWithStatus, loadBillingContext, incentiveTotalFor, billTotalFor, type Doctor, type Patient, type PatientWithStatus, type BillingContext } from './api'

type ReportsTab = 'reports' | 'billing' | 'incentives'
const TAB_KEY = 'labapp:reportsTab'

function storedTab(): ReportsTab {
  try {
    const t = sessionStorage.getItem(TAB_KEY)
    if (t === 'reports' || t === 'billing' || t === 'incentives') return t
  } catch {
    // sessionStorage unavailable: open on the first tab
  }
  return 'reports'
}

export default function Reports() {
  const navigate = useNavigate()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [rows, setRows] = useState<PatientWithStatus[]>([])
  const [billing, setBilling] = useState<BillingContext>({ rateCard: [], items: [] })
  const [tab, setTab] = useState<ReportsTab>(storedTab)
  // The same period as the doctor screens, so a report opens on the period it was found in.
  const initial = useState(loadPeriod)[0]
  const [preset, setPreset] = useState<Preset>(initial.preset)
  const [customFrom, setCustomFrom] = useState(initial.customFrom)
  const [customTo, setCustomTo] = useState(initial.customTo)
  useEffect(() => { savePeriod({ preset, customFrom, customTo }) }, [preset, customFrom, customTo])
  const changeTab = (next: ReportsTab) => {
    setTab(next)
    try { sessionStorage.setItem(TAB_KEY, next) } catch { /* not remembered, still works */ }
  }

  useEffect(() => {
    Promise.all([listDoctors(), listPatientsWithStatus(), loadBillingContext()]).then(([d, r, b]) => {
      setDoctors(d)
      setRows(r)
      setBilling(b)
    })
  }, [])

  const { from, to } = rangeFor(preset, customFrom, customTo)
  const inPeriod = rows.filter((r) => (!from || r.patient.date >= from) && (!to || r.patient.date <= to))
  const patients = inPeriod.map((r) => r.patient)
  const completed = inPeriod.filter((r) => r.status === 'completed').map((r) => r.patient)
  const noneText = 'Nothing in this period. Try a longer one.'
  const openPreview = (p: Patient) => navigate(`/preview/${p.id}`, { state: { patient: p, from: '/reports' } })
  const openBill = (p: Patient) => navigate(`/bill/${p.id}`, { state: { patient: p, from: '/reports' } })

  return (
      <main className="px-10 py-9 max-w-5xl">
        <div className="mb-3">
          <h1 className="text-[26px] font-semibold text-[var(--ink)]">Reports</h1>
          <p className="text-[15px] text-[var(--ink-2)]">Finished patient reports, billing and doctor incentive summaries</p>
        </div>

        {/* A slim row of its own, so the options that slide out to the right have only empty space to cover. */}
        <div className="flex mb-2">
          <PeriodFilter preset={preset} customFrom={customFrom} customTo={customTo} onPreset={setPreset} onFrom={setCustomFrom} onTo={setCustomTo} compact />
        </div>

        <Tabs
          tabs={[
            { key: 'reports' as const, label: 'Patient Reports', Icon: FileCheck2, count: completed.length },
            { key: 'billing' as const, label: 'Billing', Icon: IndianRupee, count: patients.length },
            { key: 'incentives' as const, label: 'Doctor Incentives', Icon: Stethoscope, count: doctors.length }
          ]}
          active={tab}
          onChange={changeTab}
        />

        {tab === 'incentives' && (
        <section>
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3">Doctor Incentive Reports</h2>
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
            {doctors.map((d) => (
              <button
                key={d.id}
                onClick={() => navigate(`/doctors/${d.id}/report`, { state: { from: '/reports' } })}
                className="w-full flex items-center gap-4 px-6 py-3.5 border-b border-[var(--border-soft)] last:border-b-0 hover:bg-[var(--bg-app)] text-left"
              >
                <Stethoscope size={16} className="text-[var(--ink-3)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[14.5px] font-medium text-[var(--ink)] truncate">{d.name}</div>
                  <div className="text-[12.5px] text-[var(--ink-3)] truncate">{[d.qualifications, d.specialty].filter(Boolean).join(' · ')}</div>
                </div>
                <span className="text-[14px] font-semibold text-[var(--ink)] flex-shrink-0">₹{incentiveTotalFor(billing, patients, d.name).toLocaleString('en-IN')}</span>
                <ChevronRight size={14} className="text-[var(--ink-4)] flex-shrink-0" />
              </button>
            ))}
          </div>
        </section>

        )}

        {tab === 'billing' && (
        <section>
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3">Billing</h2>
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
            {patients.length === 0 && <p className="text-[14px] text-[var(--ink-3)] px-6 py-8 text-center">{noneText}</p>}
            {patients.map((p) => (
              <button
                key={p.id}
                onClick={() => openBill(p)}
                className="w-full flex items-center gap-4 px-6 py-3.5 border-b border-[var(--border-soft)] last:border-b-0 hover:bg-[var(--bg-app)] text-left"
              >
                <IndianRupee size={16} className="text-[var(--ink-3)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[14.5px] font-medium text-[var(--ink)] truncate">{p.name}</div>
                  <div className="text-[12.5px] text-[var(--ink-3)]">{p.sid} · {p.sections.join(', ')}</div>
                </div>
                <span className="text-[14px] font-semibold text-[var(--ink)] flex-shrink-0">₹{billTotalFor(billing, p).toLocaleString('en-IN')}</span>
              </button>
            ))}
          </div>
        </section>

        )}

        {tab === 'reports' && (
        <section>
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3">Completed Patient Reports</h2>
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
            {completed.length === 0 ? (
              <p className="text-[14px] text-[var(--ink-3)] px-6 py-8 text-center">{rows.length === 0 ? 'No completed reports yet.' : noneText}</p>
            ) : (
              completed.map((p) => (
                <button
                  key={p.id}
                  onClick={() => openPreview(p)}
                  className="w-full flex items-center gap-4 px-6 py-3.5 border-b border-[var(--border-soft)] last:border-b-0 hover:bg-[var(--bg-app)] text-left"
                >
                  <FileCheck2 size={16} className="text-[var(--success)] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14.5px] font-medium text-[var(--ink)] truncate">{p.name}</div>
                    <div className="text-[12.5px] text-[var(--ink-3)]">{p.sid} · {p.sections.join(', ')} · {p.date}</div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--accent-ink)] font-medium flex-shrink-0">
                    <Eye size={13} />
                    Review
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
        )}
      </main>
  )
}
