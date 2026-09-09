import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Printer, MessageCircle, Building2, ZoomIn, ZoomOut, FileText, Columns2, Rows3, ChevronLeft, ChevronRight } from 'lucide-react'
import { getPatient, getResultsFor, getLabSettings, getRangeOverrides, getLogoDataUrl, type Patient, type ResultsBySection, type LabSettingsForm } from './api'
import { humanizeKey, getReferenceRange, unitFor, flagFor, formatTime12h, decodeOtherRow } from './reportFields'
import { LetterheadHeader, LetterheadWatermark, LetterheadFooter } from './ReportLetterhead'
import { paginateReport, type ReportBlock } from './pagination'

/**
 * A4 is 210x297mm (ISO 216 — the same sheet worldwide, India included). The page box owns the
 * whole sheet and applies the margin as its own padding, because @page margins shrink the
 * printable area and make the engine scale the content down to fit. Sizing in mm rather than px
 * means the preview is 1:1 with the paper at any screen DPI.
 */
const PAGE_W = '210mm'
const PAGE_H = '297mm'
const PAGE_PAD = '12mm 14mm'

/** "Now", formatted to match the app's existing date/time style, with a 12-hour AM/PM clock. */
function formatReportedAt(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return `${date} ${formatTime12h(`${pad(d.getHours())}:${pad(d.getMinutes())}`)}`
}

function ReportBlockView({ block, patient, results, reportedAt, rangeOverrides, labDoctor }: {
  block: ReportBlock; patient: Patient; results: ResultsBySection; reportedAt: string; rangeOverrides: Record<string, string>; labDoctor: string
}) {
  if (block.kind === 'patientInfo') {
    return (
      <div className="avoid-break">
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b-2" style={{ borderColor: 'var(--ink)' }}>
          <div className="text-[17px] font-bold uppercase tracking-widest text-[var(--ink)]">Laboratory Report</div>
          <div className="text-[11px] text-right text-[#333] leading-relaxed">
            SID (Unique Ref. No.) <b className="text-[#111]">{patient.sid}</b><br />
            Collected <b className="text-[#111]">{patient.date} {formatTime12h(patient.regTime)}</b><br />
            Received <b className="text-[#111]">{patient.date} {formatTime12h(patient.regTime)}</b><br />
            Reported <b className="text-[#111]">{reportedAt}</b>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-[13px] mb-1 text-[#333]">
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
        <div className="text-[13px] font-bold uppercase tracking-widest text-[#111] border-b-2 border-[#333] pb-1.5 mb-2">
          {block.label}
        </div>
        <p className="text-[11.5px] text-[var(--danger-ink)] italic py-1">
          {block.label} was selected, but no results have been entered yet. This section will not appear in the final report.
        </p>
      </div>
    )
  }

  if (block.kind === 'sectionChunk') {
    return (
      <div className="avoid-break mb-6">
        <div className="text-[13px] font-bold uppercase tracking-widest text-[#111] border-b-2 border-[#333] pb-1.5 mb-2">
          {block.label}{block.continued && <span className="font-normal italic text-[var(--ink-3)]"> (continued)</span>}
        </div>
        <div className="grid grid-cols-[2.4fr_1fr_1fr_1.6fr] text-[11.5px] font-bold uppercase tracking-wide text-[var(--ink)] border-b border-[#bbb] pb-1.5 mb-1">
          <span>Test</span><span>Result</span><span>Unit</span><span>Reference</span>
        </div>
        {block.keys.map((k) => {
          const data = results[block.sectionKey] ?? {}
          const isOthers = block.sectionKey === 'others'
          const other = isOthers ? decodeOtherRow(data[k]) : null
          const value = other ? other.value : data[k]
          const range = other ? other.reference : getReferenceRange(block.sectionKey, k, patient.gender, rangeOverrides)
          const unit = other ? other.unit : unitFor(block.sectionKey, k)
          const flag = flagFor(value, range, isOthers ? undefined : k)
          const arrowColor = flag ? 'var(--danger)' : undefined
          return (
            <div key={k} className="grid grid-cols-[2.4fr_1fr_1fr_1.6fr] items-baseline text-[13px] py-2 border-b border-[#e8e8e8]">
              <span className="font-bold text-[#111]">{isOthers ? k : humanizeKey(k)}</span>
              <span style={{ fontWeight: flag ? 700 : 600, fontSize: '13.5px', color: flag ? arrowColor : '#111', fontFamily: 'Consolas, monospace' }}>
                {flag === 'high' && <span>▲ </span>}
                {flag === 'low' && <span>▼ </span>}
                {value}
              </span>
              <span className="text-[#333]">{unit}</span>
              <span className="text-[#333]">{range}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="avoid-break">
      <div className="text-center text-[11px] tracking-wide text-[var(--ink-3)] border-t border-b border-[#ddd] py-1.5 my-5">
        — End of report —
      </div>
      <div className="flex items-end justify-between mt-8">
        <div>
          <div className="border-t border-[var(--ink)] w-[160px] mb-1.5" />
          <div className="text-[11px] font-semibold tracking-wide text-[var(--ink-2)] uppercase">Lab Technician</div>
        </div>
        <div className="text-right">
          <div className="border-t border-[var(--ink)] w-[160px] mb-1.5 ml-auto" />
          {labDoctor && <div className="text-[14px] font-bold text-[var(--ink)] leading-tight">{labDoctor}</div>}
          <div className="text-[10.5px] font-semibold text-[var(--accent)] tracking-wide uppercase mt-0.5">Authorised Signatory</div>
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
  const [logo, setLogo] = useState<string | null>(null)
  const [rangeOverrides, setRangeOverrides] = useState<Record<string, string>>({})
  // For a sample tested on behalf of another lab that will print it on their own letterhead —
  // no logo, watermark, footer, or named staff sign-off, just the patient info and results,
  // with blank space left at the top for their pre-printed stationery.
  const [externalMode, setExternalMode] = useState(false)

  // On-screen viewer controls only — printing always renders every page at 100%, regardless of
  // these (see the .report-viewer print override in index.css and the hidden/print:flex dance
  // on each page below, which keeps every page in the DOM for print even when only one is shown
  // on screen).
  const [zoom, setZoom] = useState(1)
  const [viewMode, setViewMode] = useState<'single' | 'two' | 'continuous'>('single')
  const [currentPage, setCurrentPage] = useState(0)

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
    getRangeOverrides().then(setRangeOverrides)
    getLogoDataUrl().then(setLogo)
  }, [])

  const pages = useMemo(() => (patient && results ? paginateReport(patient, results) : []), [patient, results])
  const reportedAt = useMemo(() => formatReportedAt(), [patient?.id])

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, Math.max(pages.length - 1, 0)))
  }, [pages.length])

  const zoomIn = () => setZoom((z) => Math.min(2, Math.round((z + 0.1) * 100) / 100))
  const zoomOut = () => setZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 100) / 100))

  const handleWhatsApp = () => {
    if (!patient || !settings) return
    const digits = patient.mobile.replace(/\D/g, '') || '9876543210'
    const message = `Hi, your lab report from ${settings.labName} is ready. Please find it attached.`
    window.open(`https://wa.me/91${digits}?text=${encodeURIComponent(message)}`, '_blank')
  }

  const [savingPdf, setSavingPdf] = useState(false)

  // Renders this same window to a PDF rather than opening the print dialog, so "Save PDF"
  // actually saves a file the user picks a location for instead of routing through Windows'
  // print picker (which is what the old window.print()-for-everything approach did).
  const handleSavePdf = async () => {
    if (!patient || savingPdf) return
    setSavingPdf(true)
    try {
      const result = await window.api.print.pdf(`${patient.name}_${patient.sid}`)
      if (result.saved) window.api.shell.openPath(result.filePath)
    } finally {
      setSavingPdf(false)
    }
  }

  if (!patient || !results || !settings) {
    return (
        <main className="px-10 py-9">
          <p className="text-[15px] text-[var(--ink-2)]">Loading…</p>
        </main>
    )
  }

  // hiddenOnScreen keeps a page in the DOM (so printing still renders the whole document) while
  // collapsing it visually in single-page mode — print:flex brings it back for the print stylesheet.
  const renderPage = (blocks: ReportBlock[], pageIndex: number, hiddenOnScreen = false) => (
    <div
      key={pageIndex}
      className={`print-page relative bg-[var(--surface)] shadow-lg print:shadow-none flex-col flex-shrink-0 ${hiddenOnScreen ? 'hidden print:flex' : 'flex'}`}
      style={{ width: PAGE_W, height: PAGE_H, padding: PAGE_PAD, overflow: 'hidden' }}
    >
      {pages.length > 1 && (
        <div className="absolute top-2 right-3 text-[8.5px] text-[var(--ink-4)] print:text-[var(--border-strong)]" style={{ zIndex: 2 }}>
          Page {pageIndex + 1} of {pages.length}
        </div>
      )}

      {externalMode ? (
        // Blank space reserved for the external lab's own pre-printed letterhead —
        // no logo, watermark, or footer of ours anywhere on the page.
        <div style={{ height: 110 }} />
      ) : (
        <>
          <LetterheadWatermark labName={settings.labName} />
          <div className="relative" style={{ zIndex: 1 }}>
            <LetterheadHeader labName={settings.labName} logoDataUrl={logo} />
          </div>
        </>
      )}

      <div className="relative flex-1 mt-3" style={{ zIndex: 1 }}>
        {blocks.map((block, i) => (
          <ReportBlockView key={i} block={block} patient={patient} results={results} reportedAt={reportedAt} rangeOverrides={rangeOverrides} labDoctor={settings.labDoctor} />
        ))}
      </div>

      {!externalMode && (
        <div className="relative mt-4" style={{ zIndex: 1 }}>
          <LetterheadFooter settings={settings} />
        </div>
      )}
    </div>
  )

  return (
      <div className="flex flex-col h-full print:h-auto">
        <div className="flex items-center gap-4 px-8 py-4 bg-[var(--surface)] border-b border-[var(--border)] flex-shrink-0 print:hidden">
          <button
            onClick={() => navigate(`/report/${patient.id}`, { state: { patient } })}
            className="inline-flex items-center gap-1.5 text-[14px] text-[var(--ink-3)] hover:text-[var(--ink)]"
          >
            <ArrowLeft size={15} />
            Edit results
          </button>
          <div className="h-5 w-px bg-[var(--border)]" />
          <div>
            <div className="text-[15px] font-semibold text-[var(--ink)]">Report Preview</div>
            <div className="text-[13px] text-[var(--ink-2)]">{patient.name} · {patient.sid} · {pages.length} page{pages.length === 1 ? '' : 's'}</div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExternalMode((v) => !v)}
              title="Print without our branding, for a sample tested on behalf of another lab that will print it on their own letterhead"
              className={`inline-flex items-center gap-2 px-4 py-2 text-[14px] font-medium rounded-xl border ${
                externalMode ? 'bg-[var(--ink)] text-white border-[var(--ink)]' : 'bg-[var(--surface)] text-[var(--ink-2)] border-[var(--border-strong)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Building2 size={14} />
              {externalMode ? 'External lab report: On' : 'External lab report'}
            </button>
            <div className="h-5 w-px bg-[var(--border)]" />
            <button
              onClick={handleSavePdf}
              disabled={savingPdf}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-soft)] text-[var(--accent-ink)] text-[14px] font-medium rounded-xl hover:bg-[var(--accent-soft-border)] disabled:opacity-60"
            >
              <Download size={14} />
              {savingPdf ? 'Saving…' : 'Save PDF'}
            </button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-soft)] text-[var(--accent-ink)] text-[14px] font-medium rounded-xl hover:bg-[var(--accent-soft-border)]">
              <Printer size={14} />
              Print
            </button>
            <button onClick={handleWhatsApp} className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-soft)] text-[var(--accent-ink)] text-[14px] font-medium rounded-xl hover:bg-[var(--accent-soft-border)]">
              <MessageCircle size={14} />
              Share
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 px-8 py-2 bg-[var(--surface)] border-b border-[var(--border)] flex-shrink-0 print:hidden">
          <div className="inline-flex items-center gap-0.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-app)] p-0.5">
            <button
              onClick={() => setViewMode('single')}
              title="Single page"
              className={`inline-flex items-center justify-center w-7 h-7 rounded-md ${viewMode === 'single' ? 'bg-[var(--surface)] shadow-sm text-[var(--accent-ink)]' : 'text-[var(--ink-3)] hover:text-[var(--ink)]'}`}
            >
              <FileText size={14} />
            </button>
            <button
              onClick={() => setViewMode('two')}
              title="Two-page view"
              className={`inline-flex items-center justify-center w-7 h-7 rounded-md ${viewMode === 'two' ? 'bg-[var(--surface)] shadow-sm text-[var(--accent-ink)]' : 'text-[var(--ink-3)] hover:text-[var(--ink)]'}`}
            >
              <Columns2 size={14} />
            </button>
            <button
              onClick={() => setViewMode('continuous')}
              title="Continuous scroll"
              className={`inline-flex items-center justify-center w-7 h-7 rounded-md ${viewMode === 'continuous' ? 'bg-[var(--surface)] shadow-sm text-[var(--accent-ink)]' : 'text-[var(--ink-3)] hover:text-[var(--ink)]'}`}
            >
              <Rows3 size={14} />
            </button>
          </div>

          {viewMode === 'single' && pages.length > 1 && (
            <div className="inline-flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--ink-2)] hover:bg-[var(--bg-hover)] disabled:opacity-35 disabled:hover:bg-transparent"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-[13px] text-[var(--ink-2)] tabular-nums w-14 text-center">{currentPage + 1} / {pages.length}</span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}
                disabled={currentPage === pages.length - 1}
                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--ink-2)] hover:bg-[var(--bg-hover)] disabled:opacity-35 disabled:hover:bg-transparent"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}

          <div className="flex-1" />

          <div className="inline-flex items-center gap-1">
            <button
              onClick={zoomOut}
              disabled={zoom <= 0.5}
              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--ink-2)] hover:bg-[var(--bg-hover)] disabled:opacity-35 disabled:hover:bg-transparent"
            >
              <ZoomOut size={14} />
            </button>
            <button onClick={() => setZoom(1)} title="Reset zoom" className="text-[13px] text-[var(--ink-2)] hover:text-[var(--ink)] tabular-nums w-11 text-center">
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={zoomIn}
              disabled={zoom >= 2}
              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--ink-2)] hover:bg-[var(--bg-hover)] disabled:opacity-35 disabled:hover:bg-transparent"
            >
              <ZoomIn size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-auto print:overflow-visible print:h-auto bg-[var(--bg-canvas)] p-8 print:bg-white print:p-0">
          <div className="report-viewer flex flex-col items-center gap-9 print:gap-0" style={{ zoom }}>
            {viewMode === 'two'
              ? Array.from({ length: Math.ceil(pages.length / 2) }, (_, spreadIndex) => {
                  const first = spreadIndex * 2
                  return (
                    <div key={spreadIndex} className="flex items-start gap-6 print:contents">
                      {renderPage(pages[first], first)}
                      {pages[first + 1] !== undefined && renderPage(pages[first + 1], first + 1)}
                    </div>
                  )
                })
              : pages.map((blocks, pageIndex) => renderPage(blocks, pageIndex, viewMode === 'single' && pageIndex !== currentPage))}
          </div>
        </div>
      </div>
  )
}
