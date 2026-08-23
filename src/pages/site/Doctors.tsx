import { useNavigate } from 'react-router-dom'
import { Stethoscope, ChevronRight, Phone } from 'lucide-react'
import Shell from './Shell'
import { mockDoctors, incentiveTotalFor, mockPatients } from './mockData'

export default function Doctors() {
  const navigate = useNavigate()

  return (
    <Shell>
      <main className="px-10 py-9">
        <div className="mb-8">
          <h1 className="text-[26px] font-semibold text-[#3d3629]">Doctors</h1>
          <p className="text-[15px] text-[#8a8171]">Referring doctors and their incentive reports</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {mockDoctors.map((d) => {
            const patientCount = mockPatients.filter((p) => p.referredBy === d.name).length
            const total = incentiveTotalFor(d.name)
            return (
              <div
                key={d.id}
                onClick={() => navigate(`/site/doctors/${d.id}`)}
                className="rounded-2xl p-5 border shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-white"
                style={{ borderColor: '#ece7de' }}
              >
                <div className="flex items-start justify-between mb-3.5">
                  <div className="w-10 h-10 rounded-full bg-[#f6f2ea] flex items-center justify-center">
                    <Stethoscope size={17} className="text-[#a39c8f]" />
                  </div>
                  <ChevronRight size={16} className="text-[#c9c1b2]" />
                </div>
                <div className="text-[16.5px] font-semibold text-[#3d3629] mb-0.5">{d.name}</div>
                <div className="text-[13.5px] text-[#8a8171] mb-3.5">{d.specialty}</div>
                <div className="flex items-center gap-1.5 text-[13px] text-[#a39c8f] mb-3.5">
                  <Phone size={12} />
                  {d.phone}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-[#f0ece3]">
                  <span className="text-[13px] text-[#a39c8f]">{patientCount} patient{patientCount === 1 ? '' : 's'} referred</span>
                  <span className="text-[14px] font-semibold text-[#3d3629]">₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </Shell>
  )
}
