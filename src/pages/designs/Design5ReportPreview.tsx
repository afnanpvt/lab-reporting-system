import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Printer, Download, Share2 } from 'lucide-react'
import DesignSwitcher from './DesignSwitcher'
import ReportPaper from './ReportPaper'
import { mockPatients, type MockPatient } from './mockData'

export default function Design5ReportPreview() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { patient?: MockPatient; results?: Record<string, Record<string, string>> } | null
  const patient = state?.patient ?? mockPatients[0]
  const results = state?.results ?? {}

  return (
    <div className="h-screen overflow-y-auto bg-[#f4f5f6] pt-9 text-[13.5px]">
      <DesignSwitcher current={5} screen={`Preview — ${patient.name}`} />

      <header className="flex items-center gap-3 px-4 h-11 border-b border-[#e2e5e6] bg-white sticky top-9 z-10">
        <button
          onClick={() => navigate('/designs/5/report', { state: { patient } })}
          className="inline-flex items-center gap-1 text-[#5c6569] hover:text-[#1a2023]"
        >
          <ArrowLeft size={13} />
          Back
        </button>
        <span className="font-semibold text-[#1a2023]">{patient.name} — Preview</span>
        <div className="flex-1" />
        <button className="inline-flex items-center gap-1 px-2 py-1 text-[#5c6569] hover:bg-[#f6f7f7] rounded">
          <Share2 size={13} />
          Share
        </button>
        <button className="inline-flex items-center gap-1 px-2 py-1 text-[#5c6569] hover:bg-[#f6f7f7] rounded">
          <Download size={13} />
          PDF
        </button>
        <button className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#2c7a73] text-white font-medium rounded hover:bg-[#1f5a55]">
          <Printer size={13} />
          Print (⌘P)
        </button>
      </header>

      <div className="px-4 py-8">
        <ReportPaper patient={patient} results={results} />
      </div>
    </div>
  )
}
