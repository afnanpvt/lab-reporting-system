import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Printer, MessageCircle } from 'lucide-react'
import { getPatient, getResultsFor, getLabSettings, type Patient, type ResultsBySection, type LabSettingsForm } from './api'
import { humanizeKey, getReferenceRange, unitFor, flagFor, formatTime12h } from './reportFields'
import { LetterheadHeader, LetterheadWatermark, LetterheadFooter } from './ReportLetterhead'
import { paginateReport, type ReportBlock } from './pagination'

/** "Now", formatted to match the app's existing date/time style, with a 12-hour AM/PM clock. */
function formatReportedAt(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return `${date} ${formatTime12h(`${pad(d.getHours())}:${pad(d.getMinutes())}`)}`
}

function ReportBlockView({ block, patient, results, reportedAt, labDoctor }: {
  block: ReportBlock; patient: Patient; results: ResultsBySection; reportedAt: string; labDoctor: string
}) {
  if (block.kind === 'patientInfo') {
    return (
      <div className="avoid-break">
        <div className="flex items-center justify-between mb-4 pb-3 border-b-2" style={{ borderColor: '#1a2430' }}>
          <div className="text-[14px] font-bold uppercase tracking-widest text-[#1a2430]">Laboratory Report</div>
          <div className="text-[10px] text-right text-[#444] leading-relaxed">
            SID (Unique Ref. No.) <b className="text-[#111]">{patient.sid}</b><br />
            Collected <b className="text-[#111]">{patient.date} {formatTime12h(patient.regTime)}</b><br />
            Received <b className="text-[#111]">{patient.date} {formatTime12h(patient.regTime)}</b><br />
            Reported <b className="text-[#111]">{reportedAt}</b>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] mb-1">
          <div>Patient <b className="text-[#111]">{patient.name}</b></div>
          <div>Referred by <b className="text-[#111]">{patient.referredBy}</b></div>
          <div className="col-span-2">Age / Sex <b className="text-[#111]">{patient.age}{patient.ageUnit} / {patient.gender === 'M' ? 'Male' : 'Female'}</b></div>
        </div>
      </div>
    )
  }

  if (block.kind === 'emptySection') {
    return (
      <div className="avoid-break mb-6">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#111] border-b border-[#ddd] pb-1 mb-1.5">
          {block.label}
        </div>
        <p className="text-[9.5px] text-[#b3261e] italic py-1">
          {block.label} was selected, but no results have been entered yet. This section will not appear in the final report.
        </p>
      </div>
    )
  }

  if (block.kind === 'sectionChunk') {
    return (
      <div className="avoid-break mb-6">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#111] border-b border-[#ddd] pb-1 mb-1.5">
          {block.label}{block.continued && <span className="font-normal italic text-[#8593a3]"> (continued)</span>}
        </div>
        <div className="grid grid-cols-[2.4fr_1fr_1fr_1.6fr] text-[9.5px] font-bold uppercase tracking-wide text-[#57677a] border-b border-[#ddd] pb-1 mb-1">
          <span>Test</span><span>Result</span><span>Unit</span><span>Reference</span>
        </div>
        {block.keys.map((k) => {
          const data = results[block.sectionKey] ?? {}
          const range = getReferenceRange(block.sectionKey, k, patient.gender)
          const unit = unitFor(block.sectionKey, k)
          const flag = flagFor(data[k], range)
          const arrowColor = flag === 'high' ? '#c0392b' : flag === 'low' ? '#3b6ea5' : undefined
          return (
            <div key={k} className="grid grid-cols-[2.4fr_1fr_1fr_1.6fr] text-[11px] py-1.5 border-b border-[#f0f0f0]">
              <span className="font-bold text-[#1a2430]">{humanizeKey(k)}</span>
              <span style={{ fontWeight: flag ? 600 : 400, color: '#111', fontFamily: 'Consolas, monospace' }}>
                {flag === 'high' && <span style={{ color: arrowColor }}>▲ </span>}
                {flag === 'low' && <span style={{ color: arrowColor }}>▼ </span>}
                {data[k]}
              </span>
              <span>{unit}</span>
              <span>{range}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="avoid-break">
      <div className="text-center text-[10px] text-[#555] border-t border-b border-[#ccc] py-1.5 my-5">
        ----------- End of report -----------
      </div>
      <div className="flex items-end justify-between mt-6">
        <div>
          <div className="border-t border-[#333] w-[110px] mb-1" />
          <div className="text-[10px] font-bold">Lab Incharge</div>
        </div>
        <div className="text-right">
          <div className="border-t border-[#333] w-[130px] mb-1 ml-auto" />
          <div className="text-[10px] font-bold">{labDoctor}</div>
          <div className="text-[9px] text-[#555]">Consultant Pathologist</div>
        </div>
      </div>
    </div>
  )
}

export default function ReportPreview() {
  const location = useLocation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [patient, setPatient] = useState<Patient | null>((location.state as { patient?: Patient })?.patient ?? null)
  const [results, setResults] = useState<ResultsBySection | null>(null)
  const [settings, setSettings] = useState<LabSettingsForm | null>(null)

  useEffect(() => {
    const fromState = (location.state as { patient?: Patient })?.patient
    if (fromState) { setPatient(fromState); return }
    if (id) getPatient(Number(id)).then(setPatient)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!patient) return
    getResultsFor(patient.id).then(setResults)
  }, [patient?.id])

  useEffect(() => {
    getLabSettings().then(setSettings)
  }, [])

  const pages = useMemo(() => (patient && results ? paginateReport(patient, results) : []), [patient, results])
  const reportedAt = useMemo(() => formatReportedAt(), [patient?.id])

  const handleWhatsApp = () => {
    if (!patient || !settings) return
    const digits = patient.mobile.replace(/\D/g, '') || '9876543210'
    const message = `Hi, your lab report from ${settings.labName} is ready. Please find it attached.`
    window.open(`https://wa.me/91${digits}?text=${encodeURIComponent(message)}`, '_blank')
  }

  if (!patient || !results || !settings) {
    return (
        <main className="px-10 py-9">
          <p className="text-[15px] text-[#57677a]">Loading…</p>
        </main>
    )
  }

  return (
      <div className="flex flex-col h-full print:h-auto">
        <div className="flex items-center gap-4 px-8 py-4 bg-white border-b border-[#e1e6ec] flex-shrink-0 print:hidden">
          <button
            onClick={() => navigate(`/report/${patient.id}`, { state: { patient } })}
            className="inline-flex items-center gap-1.5 text-[14px] text-[#8593a3] hover:text-[#1a2430]"
          >
            <ArrowLeft size={15} />
            Edit results
          </button>
          <div className="h-5 w-px bg-[#e1e6ec]" />
          <div>
            <div className="text-[15px] font-semibold text-[#1a2430]">Report Preview</div>
            <div className="text-[13px] text-[#57677a]">{patient.name} · {patient.sid} · {pages.length} page{pages.length === 1 ? '' : 's'}</div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 bg-[#e8f1f9] text-[#125483] text-[14px] font-medium rounded-xl hover:bg-[#f6d9cd]">
              <Download size={14} />
              Save PDF
            </button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 bg-[#e8f1f9] text-[#125483] text-[14px] font-medium rounded-xl hover:bg-[#f6d9cd]">
              <Printer size={14} />
              Print
            </button>
            <button onClick={handleWhatsApp} className="inline-flex items-center gap-2 px-4 py-2 bg-[#e8f1f9] text-[#125483] text-[14px] font-medium rounded-xl hover:bg-[#f6d9cd]">
              <MessageCircle size={14} />
              Share
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-auto print:overflow-visible print:h-auto bg-[#e4e8ee] p-8 print:bg-white print:p-0">
          <div className="flex flex-col items-center gap-9 print:gap-0">
            {pages.map((blocks, pageIndex) => (
              <div
                key={pageIndex}
                className="print-page relative bg-white shadow-lg print:shadow-none flex flex-col"
                style={{ width: 780, minHeight: 1260, padding: '32px 52px' }}
              >
                {pages.length > 1 && (
                  <div className="absolute top-2 right-3 text-[8.5px] text-[#a8b4c2] print:text-[#c7cfd9]" style={{ zIndex: 2 }}>
                    Page {pageIndex + 1} of {pages.length}
                  </div>
                )}

                <LetterheadWatermark />

                <div className="relative" style={{ zIndex: 1 }}>
                  <LetterheadHeader labName={settings.labName} />
                </div>

                <div className="relative flex-1 mt-3" style={{ zIndex: 1 }}>
                  {blocks.map((block, i) => (
                    <ReportBlockView key={i} block={block} patient={patient} results={results} reportedAt={reportedAt} labDoctor={settings.labDoctor} />
                  ))}
                </div>

                <div className="relative mt-4" style={{ zIndex: 1 }}>
                  <LetterheadFooter settings={settings} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
  )
}
