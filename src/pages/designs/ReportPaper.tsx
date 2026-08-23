import type { MockPatient } from './mockData'
import { SECTION_FIELD_KEYS, sectionKeyForLabel, humanizeKey, unitFor } from './reportFields'

export default function ReportPaper({
  patient,
  results,
  labName = 'Sunrise Diagnostics',
  labAddress = '221, MG Road, Kochi, Kerala — 682016',
  labPhone = '0484 234 5678',
  labDoctor = 'Dr. Anitha George, MD (Pathology)'
}: {
  patient: MockPatient
  results: Record<string, Record<string, string>>
  labName?: string
  labAddress?: string
  labPhone?: string
  labDoctor?: string
}) {
  return (
    <div className="bg-white text-[#1a2023] w-full max-w-[720px] mx-auto shadow-sm border border-[#e2e5e6] rounded-sm">
      <div className="px-10 pt-8 pb-5 border-b-2 border-[#1a2023] text-center">
        <div className="text-[22px] font-bold tracking-wide">{labName}</div>
        <div className="text-[13px] text-[#5c6569] mt-1">{labAddress} · {labPhone}</div>
      </div>

      <div className="px-10 py-4 border-b border-[#e2e5e6] grid grid-cols-2 gap-y-1.5 text-[13.5px]">
        <div><span className="text-[#5c6569]">Name: </span><span className="font-medium">{patient.name}</span></div>
        <div><span className="text-[#5c6569]">SID: </span><span className="font-medium font-mono">{patient.sid}</span></div>
        <div><span className="text-[#5c6569]">Age / Sex: </span><span className="font-medium">{patient.age}{patient.ageUnit} / {patient.gender === 'M' ? 'Male' : 'Female'}</span></div>
        <div><span className="text-[#5c6569]">Referred By: </span><span className="font-medium">{patient.referredBy}</span></div>
        <div><span className="text-[#5c6569]">Reg. Date: </span><span className="font-medium">15/08/2026</span></div>
        <div><span className="text-[#5c6569]">Report Date: </span><span className="font-medium">15/08/2026</span></div>
      </div>

      <div className="px-10 py-6 space-y-6">
        {patient.sections.map((label) => {
          const key = sectionKeyForLabel(label)
          if (!key) return null
          const fields = SECTION_FIELD_KEYS[key] ?? []
          const data = results[key] ?? {}
          const rows = fields.filter((f) => (data[f] ?? '').trim() !== '')
          return (
            <div key={label}>
              <div className="text-[13px] font-bold uppercase tracking-widest text-[#1a2023] border-b border-[#1a2023] pb-1 mb-2">
                {label}
              </div>
              {rows.length === 0 ? (
                <p className="text-[13px] text-[#8a9094] italic">No results entered yet.</p>
              ) : (
                <table className="w-full text-[13.5px]">
                  <tbody>
                    {rows.map((f) => (
                      <tr key={f} className="border-b border-[#f0f2f2]">
                        <td className="py-1.5 text-[#5c6569]" style={{ width: '55%' }}>{humanizeKey(f)}</td>
                        <td className="py-1.5 font-medium font-mono">{data[f]}</td>
                        <td className="py-1.5 text-[#8a9094] text-right">{unitFor(key, f)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )
        })}
      </div>

      <div className="px-10 pb-8 pt-4 border-t border-[#e2e5e6] flex items-end justify-between">
        <p className="text-[12px] text-[#8a9094] italic">End of report — computer generated, no signature required.</p>
        <div className="text-right">
          <div className="text-[14px] font-semibold">{labDoctor}</div>
          <div className="text-[12px] text-[#8a9094]">Consultant Pathologist</div>
        </div>
      </div>
    </div>
  )
}
