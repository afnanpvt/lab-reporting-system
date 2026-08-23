import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, Download, CheckCircle2, Clock3, MessageCircle } from 'lucide-react'
import Shell from './Shell'
import { billLineItemsFor, billTotalFor, setPaymentStatus, patientById, mockPatients, mockLabSettings, type MockPatient } from './mockData'
import { formatTime12h } from './reportFields'
import { LetterheadHeader, LetterheadWatermark, LetterheadFooter } from './ReportLetterhead'

function resolvePatient(location: ReturnType<typeof useLocation>, idParam?: string): MockPatient {
  const fromState = (location.state as { patient?: MockPatient })?.patient
  if (fromState) return fromState
  const fromParam = idParam ? patientById(Number(idParam)) : undefined
  return fromParam ?? mockPatients[0]
}

export default function Bill() {
  const location = useLocation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const patient = resolvePatient(location, id)
  const [, forceRender] = useState(0)

  const rows = billLineItemsFor(patient)
  const total = billTotalFor(patient)
  const paid = patient.paymentStatus === 'paid'

  const togglePaid = () => {
    setPaymentStatus(patient.id, paid ? 'pending' : 'paid')
    forceRender((n) => n + 1)
  }

  const handleWhatsApp = () => {
    const digits = '9876543210' // placeholder — real number comes from the patient record once wired to production
    const message = `Hi, your bill from ${mockLabSettings.labName} for ${patient.sid} is ₹${total.toLocaleString('en-IN')}. ${paid ? 'Marked as paid — thank you!' : 'Please settle at your earliest convenience.'}`
    window.open(`https://wa.me/91${digits}?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <Shell>
      <div className="flex flex-col h-screen">
        <div className="flex items-center gap-4 px-8 py-4 bg-white border-b border-[#e1e6ec] flex-shrink-0 print:hidden">
          <button
            onClick={() => navigate(`/site/report/${patient.id}`, { state: { patient } })}
            className="inline-flex items-center gap-1.5 text-[14px] text-[#8593a3] hover:text-[#1a2430]"
          >
            <ArrowLeft size={15} />
            Back to patient
          </button>
          <div className="h-5 w-px bg-[#e1e6ec]" />
          <div>
            <div className="text-[15px] font-semibold text-[#1a2430]">Bill</div>
            <div className="text-[13px] text-[#57677a]">{patient.name} · {patient.sid}</div>
          </div>
          <div className="flex-1" />
          <button
            onClick={togglePaid}
            className="inline-flex items-center gap-2 px-4 py-2 text-[14px] font-medium rounded-xl transition-colors"
            style={paid
              ? { background: '#e7f6ee', color: '#1f8a54' }
              : { background: '#fdf3df', color: '#9a6b00' }}
          >
            {paid ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}
            {paid ? 'Paid' : 'Pending — mark as paid'}
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 bg-[#e8f1f9] text-[#125483] text-[14px] font-medium rounded-xl hover:bg-[#bfdcf0]">
              <Download size={14} />
              Save PDF
            </button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 bg-[#1b6fae] text-white text-[14px] font-medium rounded-xl hover:bg-[#125483] shadow-sm">
              <Printer size={14} />
              Print
            </button>
            <button onClick={handleWhatsApp} className="inline-flex items-center gap-2 px-4 py-2 bg-[#e8f1f9] text-[#125483] text-[14px] font-medium rounded-xl hover:bg-[#bfdcf0]">
              <MessageCircle size={14} />
              Share
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#e4e8ee] p-8 print:bg-white print:p-0">
          <div
            className="relative max-w-[780px] mx-auto bg-white shadow-lg print:shadow-none px-[52px] py-11 print:px-2 print:py-2"
            style={{ minHeight: '600px' }}
          >
            <LetterheadWatermark />
            <div className="relative" style={{ zIndex: 1 }}>
              <LetterheadHeader />

              <div className="avoid-break flex items-start justify-between mt-4 mb-6 pb-3 border-b-2" style={{ borderColor: '#1a2430' }}>
                <div>
                  <div className="text-[14px] font-bold uppercase tracking-widest text-[#1a2430] mb-1">Bill</div>
                  <div className="text-[12px] text-[#57677a]">
                    Bill No. <b className="text-[#1a2430]">{patient.sid}</b> · {patient.date} {formatTime12h(patient.regTime)}
                  </div>
                </div>
                <span
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full flex-shrink-0"
                  style={paid
                    ? { background: '#e7f6ee', color: '#1f8a54', border: '1px solid #bfe4d0' }
                    : { background: '#fdf3df', color: '#9a6b00', border: '1px solid #f0dfad' }}
                >
                  {paid ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}
                  {paid ? 'Paid' : 'Payment Pending'}
                </span>
              </div>

              <div className="avoid-break grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] mb-6">
                <div>Patient <b className="text-[#111]">{patient.name}</b></div>
                <div>Referred by <b className="text-[#111]">{patient.referredBy}</b></div>
                <div>Age / Sex <b className="text-[#111]">{patient.age}{patient.ageUnit} / {patient.gender === 'M' ? 'Male' : 'Female'}</b></div>
              </div>

              <table className="w-full text-[12.5px] mb-1">
                <thead>
                  <tr className="text-left text-[#8593a3] text-[10.5px] uppercase tracking-wide border-b-2 border-[#1a2430]">
                    <th className="py-2 pr-2 font-semibold">S.No</th>
                    <th className="py-2 pr-2 font-semibold">Investigation</th>
                    <th className="py-2 pl-2 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-[#8593a3]">No investigations on file for this patient.</td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.sno} className="border-b border-[#eaeef2]">
                        <td className="py-2 pr-2 text-[#57677a]">{r.sno}</td>
                        <td className="py-2 pr-2 text-[#1a2430]">{r.investigation}</td>
                        <td className="py-2 pl-2 text-right font-medium text-[#1a2430]">₹{r.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-[#1a2430]">
                      <td colSpan={2} className="py-3 pr-2 text-right text-[13px] font-semibold text-[#1a2430]">Total</td>
                      <td className="py-3 pl-2 text-right text-[15px] font-bold text-[#1b6fae]">₹{total.toLocaleString('en-IN')}</td>
                    </tr>
                  </tfoot>
                )}
              </table>

              <p className="text-[9.5px] text-[#8593a3] italic mt-2">
                Placeholder rates — replace with your actual price list before this goes live.
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

            <LetterheadFooter variant="billing" />
          </div>
        </div>
      </div>
    </Shell>
  )
}
