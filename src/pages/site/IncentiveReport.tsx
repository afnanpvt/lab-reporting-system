import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, Download, Calendar } from 'lucide-react'
import { getDoctor, listPatients, loadBillingContext, incentiveLineItemsFor, getLabSettings, type Doctor, type Patient, type BillingContext, type LabSettingsForm } from './api'
import { LetterheadHeader, LetterheadWatermark, LetterheadFooter } from './ReportLetterhead'

type Preset = 'thisMonth' | 'lastMonth' | 'thisYear' | 'allTime' | 'custom'

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'thisMonth', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'thisYear', label: 'This year' },
  { key: 'allTime', label: 'All time' },
  { key: 'custom', label: 'Custom' }
]

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function isoDate(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`
}

function lastDayOfMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate()
}

/** Returns the ISO from/to bounds for a preset, or null/null for "all time". */
function rangeFor(preset: Preset, customFrom: string, customTo: string): { from: string | null; to: string | null } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1

  if (preset === 'thisMonth') return { from: isoDate(y, m, 1), to: isoDate(y, m, lastDayOfMonth(y, m)) }
  if (preset === 'lastMonth') {
    const py = m === 1 ? y - 1 : y
    const pm = m === 1 ? 12 : m - 1
    return { from: isoDate(py, pm, 1), to: isoDate(py, pm, lastDayOfMonth(py, pm)) }
  }
  if (preset === 'thisYear') return { from: isoDate(y, 1, 1), to: isoDate(y, 12, 31) }
  if (preset === 'custom') return { from: customFrom || null, to: customTo || null }
  return { from: null, to: null } // allTime
}

/** The friendly line printed on the report itself — this is what tells the doctor's office what period they're being paid for. */
function periodLabel(preset: Preset, from: string | null, to: string | null): string {
  if (preset === 'allTime') return 'All recorded referrals'
  if (!from || !to) return 'Pick a date range'
  const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  if (preset === 'thisMonth' || preset === 'lastMonth') {
    return new Date(from + 'T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  }
  if (preset === 'thisYear') return from.slice(0, 4)
  return `${fmt(from)} – ${fmt(to)}`
}

export default function IncentiveReport() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [doctorLoaded, setDoctorLoaded] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [billing, setBilling] = useState<BillingContext | null>(null)
  const [settings, setSettings] = useState<LabSettingsForm | null>(null)

  const now = new Date()
  const [preset, setPreset] = useState<Preset>('thisMonth')
  const [customFrom, setCustomFrom] = useState(isoDate(now.getFullYear(), now.getMonth() + 1, 1))
  const [customTo, setCustomTo] = useState(isoDate(now.getFullYear(), now.getMonth() + 1, now.getDate()))

  useEffect(() => {
    if (!id) return
    getDoctor(Number(id)).then((d) => { setDoctor(d); setDoctorLoaded(true) })
    listPatients().then(setPatients)
    loadBillingContext().then(setBilling)
    getLabSettings().then(setSettings)
  }, [id])

  if (doctorLoaded && !doctor) {
    return (
        <main className="px-10 py-9">
          <p className="text-[15px] text-[#57677a]">Doctor not found.</p>
        </main>
    )
  }

  if (!doctor || !billing || !settings) {
    return (
        <main className="px-10 py-9">
          <p className="text-[15px] text-[#57677a]">Loading…</p>
        </main>
    )
  }

  const { from, to } = rangeFor(preset, customFrom, customTo)
  const allRows = incentiveLineItemsFor(billing, patients, doctor.name)
  const filtered = allRows
    .filter((r) => (!from || r.date >= from) && (!to || r.date <= to))
    .map((r, i) => ({ ...r, sno: i + 1 }))
  const total = filtered.reduce((sum, r) => sum + r.amount, 0)
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const period = periodLabel(preset, from, to)

  return (
      <div className="flex flex-col h-full print:h-auto">
        {/* Review bar — this is a document to check before it goes out, not a raw data dump */}
        <div className="flex flex-col gap-3 px-8 py-4 bg-white border-b border-[#e1e6ec] flex-shrink-0 print:hidden">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/doctors')}
              className="inline-flex items-center gap-1.5 text-[14px] text-[#8593a3] hover:text-[#1a2430]"
            >
              <ArrowLeft size={15} />
              Back to doctors
            </button>
            <div className="h-5 w-px bg-[#e1e6ec]" />
            <div>
              <div className="text-[15px] font-semibold text-[#1a2430]">Incentive Report — Review</div>
              <div className="text-[13px] text-[#57677a]">{doctor.name} · {filtered.length} line item{filtered.length === 1 ? '' : 's'} · {period}</div>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 bg-[#e8f1f9] text-[#125483] text-[14px] font-medium rounded-xl hover:bg-[#bfdcf0]">
                <Download size={14} />
                Save PDF
              </button>
              <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 bg-[#1b6fae] text-white text-[14px] font-medium rounded-xl hover:bg-[#125483] shadow-sm">
                <Printer size={14} />
                Print
              </button>
            </div>
          </div>

          {/* Period picker — this is what "before creating the report" actually means: pick the
              window you're paying for, then the table/total below update immediately. Defaults to
              the current month, since that's the normal payout cycle, not a lifetime total. */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#8593a3]">
              <Calendar size={13} />
              Period
            </span>
            <div className="inline-flex items-center gap-1 bg-[#f5f7fa] rounded-xl p-1">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPreset(p.key)}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                    preset === p.key ? 'bg-[#1b6fae] text-white shadow-sm' : 'text-[#57677a] hover:bg-[#eef2f6]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {preset === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="px-2.5 py-1.5 text-[13px] border border-[#c7cfd9] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1b6fae]/25"
                />
                <span className="text-[13px] text-[#8593a3]">to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="px-2.5 py-1.5 text-[13px] border border-[#c7cfd9] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1b6fae]/25"
                />
              </div>
            )}
          </div>
        </div>

        {/* The document itself — what's on screen here is exactly what prints, so reviewing it here IS reviewing the final report */}
        <div className="flex-1 overflow-y-auto overflow-x-auto print:overflow-visible print:h-auto bg-[#e4e8ee] p-8 print:bg-white print:p-0">
          <div
            className="relative max-w-[780px] mx-auto bg-white shadow-lg print:shadow-none px-[52px] py-11 print:px-2 print:py-2"
            style={{ minHeight: '600px' }}
          >
            <LetterheadWatermark labName={settings.labName} />
            <div className="relative" style={{ zIndex: 1 }}>
              <LetterheadHeader labName={settings.labName} />

              <div className="avoid-break flex items-start justify-between mt-4 mb-6 pb-3 border-b-2" style={{ borderColor: '#1a2430' }}>
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-[#8593a3] mb-1">Referral Incentive Report</div>
                  <div className="text-[18px] font-bold text-[#1a2430]">{doctor.name}</div>
                  <div className="text-[12px] text-[#57677a]">{doctor.specialty} · {doctor.phone}</div>
                </div>
                <div className="text-[11px] text-right text-[#57677a] leading-relaxed">
                  Generated <b className="text-[#1a2430]">{today}</b><br />
                  Period <b className="text-[#1a2430]">{period}</b>
                </div>
              </div>

              <table className="w-full text-[12.5px] mb-1">
              <thead>
                <tr className="text-left text-[#8593a3] text-[10.5px] uppercase tracking-wide border-b-2 border-[#1a2430]">
                  <th className="py-2 pr-2 font-semibold">S.No</th>
                  <th className="py-2 pr-2 font-semibold">Date</th>
                  <th className="py-2 pr-2 font-semibold">Patient No.</th>
                  <th className="py-2 pr-2 font-semibold">Gender</th>
                  <th className="py-2 pr-2 font-semibold">Investigation</th>
                  <th className="py-2 pl-2 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#8593a3]">
                      No referrals from this doctor in this period.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.sno} className="border-b border-[#eaeef2]">
                      <td className="py-2 pr-2 text-[#57677a]">{r.sno}</td>
                      <td className="py-2 pr-2 text-[#1a2430]">{r.date}</td>
                      <td className="py-2 pr-2 font-mono text-[#1a2430]">{r.patientSid}</td>
                      <td className="py-2 pr-2 text-[#57677a]">{r.gender === 'M' ? 'Male' : 'Female'}</td>
                      <td className="py-2 pr-2 text-[#1a2430]">{r.investigation}</td>
                      <td className="py-2 pl-2 text-right font-medium text-[#1a2430]">₹{r.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-[#1a2430]">
                    <td colSpan={5} className="py-3 pr-2 text-right text-[13px] font-semibold text-[#1a2430]">Total</td>
                    <td className="py-3 pl-2 text-right text-[15px] font-bold text-[#1b6fae]">₹{total.toLocaleString('en-IN')}</td>
                  </tr>
                </tfoot>
              )}
              </table>

              <p className="text-[9.5px] text-[#8593a3] italic mt-2">
                Amounts shown are what patients were charged for each investigation, not a pre-calculated commission.
              </p>

              <div className="avoid-break flex items-end justify-between mt-16">
                <div>
                  <div className="border-t border-[#333] w-[130px] mb-1" />
                  <div className="text-[10px] font-bold">Accounts / Billing</div>
                </div>
                <div className="text-right">
                  <div className="border-t border-[#333] w-[130px] mb-1 ml-auto" />
                  <div className="text-[10px] font-bold">{settings.labDoctor}</div>
                  <div className="text-[9px] text-[#57677a]">Consultant Pathologist</div>
                </div>
              </div>
            </div>

            <LetterheadFooter variant="incentive" settings={settings} />
          </div>
        </div>
      </div>
  )
}
