import type { MockPatient } from './mockData'
import { SECTION_FIELD_KEYS, sectionKeyForLabel, humanizeKey, unitFor, getReferenceRange, flagFor } from './reportFields'

export default function Design6ReportPaper({
  patient,
  results,
  labName = 'ABC LABORATORY',
  labAddress = 'Vaniyambadi, Tamil Nadu · Ph: 04174-000000',
  doctorName = 'Dr. Anand'
}: {
  patient: MockPatient
  results: Record<string, Record<string, string>>
  labName?: string
  labAddress?: string
  doctorName?: string
}) {
  return (
    <div
      className="bg-white w-full max-w-[480px] mx-auto text-[14px] text-[#1a1a1a]"
      style={{ padding: '44px 40px', boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}
    >
      <div className="text-center mb-[18px]">
        <div className="text-[20px] font-bold tracking-[.02em]">{labName}</div>
        <div className="text-[13px] text-[#767470]">{labAddress}</div>
      </div>
      <div style={{ borderTop: '2px solid #1a1a1a', margin: '12px 0' }} />

      <div className="grid grid-cols-2 gap-1 text-[13.5px]">
        <div><b>Name:</b> {patient.name}</div>
        <div><b>SID:</b> {patient.sid.replace('SID-', '')}</div>
        <div><b>Age/Sex:</b> {patient.age}{patient.ageUnit} / {patient.gender}</div>
        <div><b>Date:</b> 15/08/2026</div>
        <div className="col-span-2"><b>Ref. Doctor:</b> {patient.referredBy || '—'}</div>
      </div>
      <div style={{ borderTop: '1px solid #e3e0d9', margin: '12px 0' }} />

      {patient.sections.map((label) => {
        const key = sectionKeyForLabel(label)
        if (!key) return null
        const fields = SECTION_FIELD_KEYS[key] ?? []
        const data = results[key] ?? {}
        const rows = fields.filter((f) => (data[f] ?? '').trim() !== '')
        if (rows.length === 0) return null
        return (
          <div key={label}>
            <div className="text-[14px] font-bold tracking-[.03em]" style={{ margin: '14px 0 4px' }}>
              {label.toUpperCase()}
            </div>
            {rows.map((f) => {
              const range = getReferenceRange(key, f, patient.gender)
              const flag = flagFor(data[f], range)
              const unit = unitFor(key, f)
              const abnormal = !!flag
              const style = abnormal ? { color: '#b3382c', fontWeight: 600 } : undefined
              return (
                <div key={f} className="flex justify-between text-[14px]" style={{ padding: '5px 0' }}>
                  <span style={style}>{humanizeKey(f)}</span>
                  <span style={style}>
                    {data[f]}{unit && ` ${unit}`}{flag === 'high' ? ' ↑' : flag === 'low' ? ' ↓' : ''}
                    {range && <span style={{ color: '#767470', fontWeight: 400 }}> ({range})</span>}
                  </span>
                </div>
              )
            })}
          </div>
        )
      })}

      <div style={{ borderTop: '1px solid #e3e0d9', margin: '12px 0' }} />
      <div className="flex justify-end" style={{ marginTop: 30 }}>
        <div className="text-center">
          <div style={{ borderTop: '1.5px solid #1a1a1a', paddingTop: 6 }} className="text-[13px] font-semibold">
            {doctorName}
            <br />
            <span className="font-normal text-[#767470]">Authorised Signatory</span>
          </div>
        </div>
      </div>
    </div>
  )
}
