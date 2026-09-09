import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stethoscope, ChevronRight, Phone, Plus } from 'lucide-react'
import { listDoctors, listPatients, loadBillingContext, incentiveTotalFor, type Doctor, type Patient, type BillingContext } from './api'

export default function Doctors() {
  const navigate = useNavigate()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [billing, setBilling] = useState<BillingContext>({ rateCard: [], items: [] })

  useEffect(() => {
    Promise.all([listDoctors(), listPatients(), loadBillingContext()]).then(([d, p, b]) => {
      setDoctors(d)
      setPatients(p)
      setBilling(b)
    })
  }, [])

  return (
      <main className="px-10 py-9">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[26px] font-semibold text-[var(--ink)]">Doctors</h1>
            <p className="text-[15px] text-[var(--ink-2)]">Referring doctors, who they've handled, and their incentive reports</p>
          </div>
          <button
            onClick={() => navigate('/doctors/new')}
            className="inline-flex items-center gap-2 px-5 py-3 bg-[var(--accent)] text-white text-[15px] font-medium rounded-2xl hover:bg-[var(--accent-ink)] shadow-sm"
          >
            <Plus size={16} />
            New Doctor
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {doctors.map((d) => {
            const handled = patients.filter((p) => p.referredBy === d.name)
            const total = incentiveTotalFor(billing, patients, d.name)
            return (
              <button
                key={d.id}
                onClick={() => navigate(`/doctors/${d.id}`)}
                className="text-left rounded-2xl p-5 border shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-40)]"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-start justify-between mb-3.5">
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-hover)] flex items-center justify-center">
                    <Stethoscope size={17} className="text-[var(--ink-3)]" />
                  </div>
                  <ChevronRight size={16} className="text-[var(--ink-4)]" />
                </div>
                <div className="text-[16.5px] font-semibold text-[var(--ink)] mb-0.5">{d.name}</div>
                <div className="text-[13.5px] text-[var(--ink-2)] mb-3.5">{d.specialty}</div>
                <div className="flex items-center gap-1.5 text-[13px] text-[var(--ink-3)] mb-3.5">
                  <Phone size={12} />
                  {d.phone}
                </div>

                <div className="pt-3 border-t border-[var(--border-soft)] mb-3">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--ink-3)] mb-1.5">Patients handled</div>
                  {handled.length === 0 ? (
                    <p className="text-[13px] text-[var(--ink-3)]">None yet</p>
                  ) : (
                    <div className="space-y-1">
                      {handled.slice(0, 3).map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-[13px]">
                          <span className="text-[var(--ink)] truncate">{p.name}</span>
                          <span className="text-[var(--ink-3)] flex-shrink-0 ml-2">{p.date}</span>
                        </div>
                      ))}
                      {handled.length > 3 && (
                        <div className="text-[12px] text-[var(--ink-3)]">+{handled.length - 3} more</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[var(--border-soft)]">
                  <span className="text-[13px] text-[var(--ink-3)]">{handled.length} patient{handled.length === 1 ? '' : 's'} referred</span>
                  <span className="text-[14px] font-semibold text-[var(--ink)]">₹{total.toLocaleString('en-IN')}</span>
                </div>
              </button>
            )
          })}
        </div>
      </main>
  )
}
