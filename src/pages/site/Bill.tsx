import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, Download, MessageCircle } from 'lucide-react'
import { getPatient, billLineItemsFor, billTotalFor, setBillItemAmount, loadBillingContext, getLabSettings, getLogoDataUrl, getBadgeDataUrl, getCertificationDataUrls, type Patient, type BillingContext, type LabSettingsForm } from './api'
import { formatTime12h } from './reportFields'
import { LetterheadHeader, LetterheadWatermark, LetterheadFooter } from './ReportLetterhead'

export default function Bill() {
  const location = useLocation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [patient, setPatient] = useState<Patient | null>((location.state as { patient?: Patient })?.patient ?? null)
  const [billing, setBilling] = useState<BillingContext | null>(null)
  const [settings, setSettings] = useState<LabSettingsForm | null>(null)
  const [logo, setLogo] = useState<string | null>(null)
  const [badge, setBadge] = useState<string | null>(null)
  const [certifications, setCertifications] = useState<string[]>([])

  useEffect(() => {
    const fromState = (location.state as { patient?: Patient })?.patient
    if (fromState) { setPatient(fromState); return }
    if (id) getPatient(Number(id)).then(setPatient)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    loadBillingContext().then(setBilling)
    getLabSettings().then(setSettings)
    getLogoDataUrl().then(setLogo)
    getBadgeDataUrl().then(setBadge)
    getCertificationDataUrls().then(setCertifications)
  }, [])

  const refreshBilling = () => loadBillingContext().then(setBilling)

  const handleAmountChange = (section: string, amount: number) => {
    if (!patient) return
    setBillItemAmount(patient.id, section, amount).then(refreshBilling)
  }

  const handleWhatsApp = () => {
    if (!patient || !billing || !settings) return
    const total = billTotalFor(billing, patient)
    const digits = patient.mobile.replace(/\D/g, '') || '9876543210'
    const message = `Hi, your bill from ${settings.labName} for ${patient.sid} is ₹${total.toLocaleString('en-IN')}.`
    window.open(`https://wa.me/91${digits}?text=${encodeURIComponent(message)}`, '_blank')
  }

  if (!patient || !billing || !settings) {
    return (
        <main className="px-10 py-9">
          <p className="text-[15px] text-[var(--ink-2)]">Loading…</p>
        </main>
    )
  }

  const rows = billLineItemsFor(billing, patient)
  const total = billTotalFor(billing, patient)

  return (
      <div className="flex flex-col h-full print:h-auto">
        <div className="flex items-center gap-4 px-8 py-4 bg-[var(--surface)] border-b border-[var(--border)] flex-shrink-0 print:hidden">
          <button
            onClick={() => navigate(`/report/${patient.id}`, { state: { patient } })}
            className="inline-flex items-center gap-1.5 text-[14px] text-[var(--ink-3)] hover:text-[var(--ink)]"
          >
            <ArrowLeft size={15} />
            Back to patient
          </button>
          <div className="h-5 w-px bg-[var(--border)]" />
          <div>
            <div className="text-[15px] font-semibold text-[var(--ink)]">Bill</div>
            <div className="text-[13px] text-[var(--ink-2)]">{patient.name} · {patient.sid}</div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-soft)] text-[var(--accent-ink)] text-[14px] font-medium rounded-xl hover:bg-[var(--accent-soft-border)]">
              <Download size={14} />
              Save PDF
            </button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white text-[14px] font-medium rounded-xl hover:bg-[var(--accent-ink)] shadow-sm">
              <Printer size={14} />
              Print
            </button>
            <button onClick={handleWhatsApp} className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-soft)] text-[var(--accent-ink)] text-[14px] font-medium rounded-xl hover:bg-[var(--accent-soft-border)]">
              <MessageCircle size={14} />
              Share
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-auto print:overflow-visible print:h-auto bg-[var(--bg-canvas)] p-8 print:bg-white print:p-0">
          <div
            className="report-paper relative max-w-[780px] mx-auto bg-[var(--surface)] shadow-lg print:shadow-none px-[52px] py-11 print:px-2 print:py-2"
            style={{ minHeight: '600px' }}
          >
            <LetterheadWatermark labName={settings.labName} />
            <div className="relative" style={{ zIndex: 1 }}>
              <LetterheadHeader labName={settings.labName} logoDataUrl={logo} badgeDataUrl={badge} />

              <div className="avoid-break mt-4 mb-6 pb-3 border-b-2" style={{ borderColor: 'var(--ink)' }}>
                <div className="text-[14px] font-bold uppercase tracking-widest text-[var(--ink)] mb-1">Bill</div>
                <div className="text-[12px] text-[var(--ink-2)]">
                  Bill No. <b className="text-[var(--ink)]">{patient.sid}</b> · {patient.date} {formatTime12h(patient.regTime)}
                </div>
              </div>

              <div className="avoid-break grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] mb-6">
                <div>Patient <b className="text-[#111]">{patient.name}</b></div>
                <div>Referred by <b className="text-[#111]">{patient.referredBy}</b></div>
                <div>Age / Sex <b className="text-[#111]">{patient.age}{patient.ageUnit} / {patient.gender === 'M' ? 'Male' : 'Female'}</b></div>
              </div>

              <table className="w-full text-[12.5px] mb-1">
                <thead>
                  <tr className="text-left text-[var(--ink-3)] text-[10.5px] uppercase tracking-wide border-b-2 border-[var(--ink)]">
                    <th className="py-2 pr-2 font-semibold">S.No</th>
                    <th className="py-2 pr-2 font-semibold">Investigation</th>
                    <th className="py-2 pl-2 font-semibold text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-[var(--ink-3)]">No investigations on file for this patient.</td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.sno} className="border-b border-[var(--border-soft)]">
                        <td className="py-2 pr-2 text-[var(--ink-2)]">{r.sno}</td>
                        <td className="py-2 pr-2 text-[var(--ink)]">{r.investigation}</td>
                        <td className="py-1.5 pl-2 text-right font-medium text-[var(--ink)]">
                          <span className="print:inline hidden">₹{r.amount.toLocaleString('en-IN')}</span>
                          <span className="print:hidden inline-flex items-center justify-end gap-1">
                            ₹
                            <input
                              type="number"
                              min={0}
                              value={r.amount}
                              onChange={(e) => handleAmountChange(r.investigation, Number(e.target.value) || 0)}
                              className="w-20 text-right px-1.5 py-1 rounded-md border border-[var(--border-strong)] bg-[var(--bg-app)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)] focus:border-[var(--accent)]"
                            />
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-[var(--ink)]">
                      <td colSpan={2} className="py-3 pr-2 text-right text-[13px] font-semibold text-[var(--ink)]">Total</td>
                      <td className="py-3 pl-2 text-right text-[15px] font-bold text-[var(--accent)]">₹{total.toLocaleString('en-IN')}</td>
                    </tr>
                  </tfoot>
                )}
              </table>

              <p className="text-[9.5px] text-[var(--ink-3)] italic mt-2 print:hidden">
                Click an amount above to adjust it for this patient — rates aren't fixed.
              </p>

              <div className="avoid-break flex items-end justify-between mt-16">
                <div>
                  <div className="border-t border-[#333] w-[130px] mb-1" />
                  <div className="text-[10px] font-bold">Received By</div>
                </div>
                <div className="text-right">
                  <div className="border-t border-[#333] w-[130px] mb-1 ml-auto" />
                  <div className="text-[10px] font-bold">Authorised Signatory</div>
                </div>
              </div>
            </div>

            <LetterheadFooter variant="billing" settings={settings} certificationDataUrls={certifications} />
          </div>
        </div>
      </div>
  )
}
