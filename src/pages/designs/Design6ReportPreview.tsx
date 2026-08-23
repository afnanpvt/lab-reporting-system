import { useNavigate, useLocation } from 'react-router-dom'
import DesignSwitcher from './DesignSwitcher'
import Design6ReportPaper from './Design6ReportPaper'
import { INTER_STACK } from './Design6Shell'
import { mockPatients, type MockPatient } from './mockData'

export default function Design6ReportPreview() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { patient?: MockPatient; results?: Record<string, Record<string, string>> } | null
  const patient = state?.patient ?? mockPatients[0]
  const results = state?.results ?? {}

  return (
    <div className="min-h-screen bg-[#f4f3f0] pt-9">
      <DesignSwitcher current={6} screen={`Preview — ${patient.name}`} />
      <div className="flex justify-center px-5 py-12" style={{ fontFamily: INTER_STACK }}>
        <div className="w-full max-w-[640px]">
          <div className="flex items-center justify-between mb-[22px]">
            <button
              onClick={() => navigate('/designs/6')}
              className="text-[14px] font-semibold text-[#767470] hover:text-[#8f2c23]"
            >
              ← Back to Patients
            </button>
            <div className="flex gap-2.5">
              <button
                className="px-4 py-2.5 text-[14px] font-bold rounded-lg bg-white text-[#1a1a1a]"
                style={{ border: '1.5px solid #d8d5cf' }}
              >
                🖨 Print
              </button>
              <button className="px-4 py-2.5 text-[14px] font-bold rounded-lg bg-[#b3382c] text-white hover:bg-[#8f2c23]">
                ⬇ Save as PDF
              </button>
            </div>
          </div>

          <div className="bg-[#e5e3dd] rounded-2xl p-8 flex justify-center">
            <Design6ReportPaper patient={patient} results={results} />
          </div>
        </div>
      </div>
    </div>
  )
}
