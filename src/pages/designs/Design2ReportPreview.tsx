import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Printer, Download, Share2 } from 'lucide-react'
import DesignSwitcher from './DesignSwitcher'
import ReportPaper from './ReportPaper'
import { mockPatients, type MockPatient } from './mockData'

export default function Design2ReportPreview() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { patient?: MockPatient; results?: Record<string, Record<string, string>> } | null
  const patient = state?.patient ?? mockPatients[0]
  const results = state?.results ?? {}

  return (
    <div className="h-screen overflow-y-auto bg-[#e9edf3] pt-9">
      <DesignSwitcher current={2} screen={`Preview — ${patient.name}`} />

      <div className="flex items-center gap-4 px-6 h-16 bg-white border-b border-[#dbe2ea] sticky top-9 z-10">
        <button
          onClick={() => navigate('/designs/2/report', { state: { patient } })}
          className="inline-flex items-center gap-1.5 text-[13.5px] text-[#5c6b80] hover:text-[#0f1b2d]"
        >
          <ArrowLeft size={14} />
          Back to results
        </button>
        <div className="w-px h-6 bg-[#dbe2ea]" />
        <span className="text-[15px] font-semibold text-[#0f1b2d]">{patient.name} — Report Preview</span>
        <div className="flex-1" />
        <button className="inline-flex items-center gap-1.5 px-3 py-2 text-[13.5px] font-medium text-[#5c6b80] border border-[#dbe2ea] rounded-lg hover:bg-[#f6f9fc]">
          <Share2 size={14} />
          Share
        </button>
        <button className="inline-flex items-center gap-1.5 px-3 py-2 text-[13.5px] font-medium text-[#5c6b80] border border-[#dbe2ea] rounded-lg hover:bg-[#f6f9fc]">
          <Download size={14} />
          Save PDF
        </button>
        <button className="inline-flex items-center gap-1.5 px-3 py-2 text-[13.5px] font-medium text-white bg-[#1f5fa8] rounded-lg hover:bg-[#184a85]">
          <Printer size={14} />
          Print
        </button>
      </div>

      <div className="px-6 py-10">
        <ReportPaper patient={patient} results={results} />
      </div>
    </div>
  )
}
