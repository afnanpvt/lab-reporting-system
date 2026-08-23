import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import Shell from './Shell'
import { mockDoctors, incentiveLineItemsFor, incentiveTotalFor } from './mockData'

export default function IncentiveReport() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const doctor = mockDoctors.find((d) => d.id === Number(id))

  if (!doctor) {
    return (
      <Shell>
        <main className="px-10 py-9">
          <p className="text-[15px] text-[#8a8171]">Doctor not found.</p>
        </main>
      </Shell>
    )
  }

  const rows = incentiveLineItemsFor(doctor.name)
  const total = incentiveTotalFor(doctor.name)

  return (
    <Shell>
      <main className="px-10 py-9 max-w-4xl">
        <button
          onClick={() => navigate('/site/doctors')}
          className="inline-flex items-center gap-1.5 text-[14px] text-[#a39c8f] hover:text-[#3d3629] mb-5"
        >
          <ArrowLeft size={15} />
          Back to doctors
        </button>

        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-[24px] font-semibold text-[#3d3629] mb-1">Incentive Report</h1>
            <p className="text-[15px] text-[#8a8171]">{doctor.specialty} · {doctor.phone}</p>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-[#3d3629] text-[14px] font-medium border border-[#e3ddd0] rounded-xl hover:bg-[#f6f2ea]"
          >
            <Printer size={15} />
            Print
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-[#ece7de] shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-[#f0ece3]">
            <div className="text-[19px] font-semibold text-[#3d3629]">{doctor.name}</div>
            <div className="text-[13px] text-[#a39c8f]">Referral incentive summary</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="text-left text-[#a39c8f] text-[11.5px] uppercase tracking-wide border-b border-[#f0ece3]">
                  <th className="px-6 py-3 font-semibold">S.No</th>
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">Patient No.</th>
                  <th className="px-3 py-3 font-semibold">Gender</th>
                  <th className="px-3 py-3 font-semibold">Investigation</th>
                  <th className="px-6 py-3 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-[#a39c8f]">
                      No patients referred by this doctor yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.sno} className="border-b border-[#f5f2ec]">
                      <td className="px-6 py-3 text-[#8a8171]">{r.sno}</td>
                      <td className="px-3 py-3 text-[#3d3629]">{r.date}</td>
                      <td className="px-3 py-3 font-mono text-[#3d3629]">{r.patientSid}</td>
                      <td className="px-3 py-3 text-[#8a8171]">{r.gender === 'M' ? 'Male' : 'Female'}</td>
                      <td className="px-3 py-3 text-[#3d3629]">{r.investigation}</td>
                      <td className="px-6 py-3 text-right font-medium text-[#3d3629]">₹{r.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-right text-[14px] font-semibold text-[#3d3629]">Total</td>
                    <td className="px-6 py-4 text-right text-[16px] font-semibold text-[#e07a5f]">₹{total.toLocaleString('en-IN')}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <p className="text-[12.5px] text-[#a39c8f] mt-4">
          Amounts shown are what patients were charged for each investigation — not a pre-calculated commission. Placeholder rates; replace with your actual price list before this goes live.
        </p>
      </main>
    </Shell>
  )
}
