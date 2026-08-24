import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stethoscope, ChevronRight, FileCheck2, Eye, IndianRupee } from 'lucide-react'
import { listDoctors, listPatientsWithStatus, loadBillingContext, incentiveTotalFor, billTotalFor, type Doctor, type Patient, type PatientWithStatus, type BillingContext } from './api'

export default function Reports() {
  const navigate = useNavigate()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [rows, setRows] = useState<PatientWithStatus[]>([])
  const [billing, setBilling] = useState<BillingContext>({ rateCard: [], items: [] })

  useEffect(() => {
    Promise.all([listDoctors(), listPatientsWithStatus(), loadBillingContext()]).then(([d, r, b]) => {
      setDoctors(d)
      setRows(r)
      setBilling(b)
    })
  }, [])

  const patients = rows.map((r) => r.patient)
  const completed = rows.filter((r) => r.status === 'completed').map((r) => r.patient)
  const openPreview = (p: Patient) => navigate(`/preview/${p.id}`, { state: { patient: p } })
  const openBill = (p: Patient) => navigate(`/bill/${p.id}`, { state: { patient: p } })

  return (
      <main className="px-10 py-9 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-[26px] font-semibold text-[#1a2430]">Reports</h1>
          <p className="text-[15px] text-[#57677a]">Finished patient reports, billing, and doctor incentive summaries</p>
        </div>

        <section className="mb-8">
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-[#8593a3] mb-3">Doctor Incentive Reports</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {doctors.map((d) => (
              <button
                key={d.id}
                onClick={() => navigate(`/doctors/${d.id}`)}
                className="text-left rounded-xl p-4 border border-[#e1e6ec] bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <Stethoscope size={15} className="text-[#8593a3]" />
                  <ChevronRight size={14} className="text-[#a8b4c2]" />
                </div>
                <div className="text-[14.5px] font-semibold text-[#1a2430] truncate">{d.name}</div>
                <div className="text-[13px] text-[#8593a3]">₹{incentiveTotalFor(billing, patients, d.name).toLocaleString('en-IN')}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-[#8593a3] mb-3">Billing</h2>
          <div className="bg-white rounded-2xl border border-[#e1e6ec] shadow-sm overflow-hidden">
            {patients.map((p) => (
              <button
                key={p.id}
                onClick={() => openBill(p)}
                className="w-full flex items-center gap-4 px-6 py-3.5 border-b border-[#eaeef2] last:border-b-0 hover:bg-[#f5f7fa] text-left"
              >
                <IndianRupee size={16} className="text-[#8593a3] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[14.5px] font-medium text-[#1a2430] truncate">{p.name}</div>
                  <div className="text-[12.5px] text-[#8593a3]">{p.sid} · {p.sections.join(', ')}</div>
                </div>
                <span className="text-[14px] font-semibold text-[#1a2430] flex-shrink-0">₹{billTotalFor(billing, p).toLocaleString('en-IN')}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-[#8593a3] mb-3">Completed Patient Reports</h2>
          <div className="bg-white rounded-2xl border border-[#e1e6ec] shadow-sm overflow-hidden">
            {completed.length === 0 ? (
              <p className="text-[14px] text-[#8593a3] px-6 py-8 text-center">No completed reports yet.</p>
            ) : (
              completed.map((p) => (
                <button
                  key={p.id}
                  onClick={() => openPreview(p)}
                  className="w-full flex items-center gap-4 px-6 py-3.5 border-b border-[#eaeef2] last:border-b-0 hover:bg-[#f5f7fa] text-left"
                >
                  <FileCheck2 size={16} className="text-[#1f8a54] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14.5px] font-medium text-[#1a2430] truncate">{p.name}</div>
                    <div className="text-[12.5px] text-[#8593a3]">{p.sid} · {p.sections.join(', ')} · {p.date}</div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-[#125483] font-medium flex-shrink-0">
                    <Eye size={13} />
                    Review
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      </main>
  )
}
