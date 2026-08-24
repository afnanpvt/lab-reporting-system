import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, Download } from 'lucide-react'
import { getDoctor, listPatients, loadBillingContext, incentiveLineItemsFor, incentiveTotalFor, getLabSettings, type Doctor, type Patient, type BillingContext, type LabSettingsForm } from './api'
import { LetterheadHeader, LetterheadWatermark, LetterheadFooter } from './ReportLetterhead'

export default function IncentiveReport() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [doctorLoaded, setDoctorLoaded] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [billing, setBilling] = useState<BillingContext | null>(null)
  const [settings, setSettings] = useState<LabSettingsForm | null>(null)

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

  const rows = incentiveLineItemsFor(billing, patients, doctor.name)
  const total = incentiveTotalFor(billing, patients, doctor.name)
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
      <div className="flex flex-col h-full print:h-auto">
        {/* Review bar — this is a document to check before it goes out, not a raw data dump */}
        <div className="flex items-center gap-4 px-8 py-4 bg-white border-b border-[#e1e6ec] flex-shrink-0 print:hidden">
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
            <div className="text-[13px] text-[#57677a]">{doctor.name} · {rows.length} line item{rows.length === 1 ? '' : 's'}</div>
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

        {/* The document itself — what's on screen here is exactly what prints, so reviewing it here IS reviewing the final report */}
        <div className="flex-1 overflow-y-auto overflow-x-auto print:overflow-visible print:h-auto bg-[#e4e8ee] p-8 print:bg-white print:p-0">
          <div
            className="relative max-w-[780px] mx-auto bg-white shadow-lg print:shadow-none px-[52px] py-11 print:px-2 print:py-2"
            style={{ minHeight: '600px' }}
          >
            <LetterheadWatermark />
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
                  Period <b className="text-[#1a2430]">All recorded referrals</b>
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
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#8593a3]">
                      No patients referred by this doctor yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
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
              {rows.length > 0 && (
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
