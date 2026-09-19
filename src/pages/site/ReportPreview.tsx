import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Printer, MessageCircle, Building2, ZoomIn, ZoomOut, FileText, Columns2, Rows3, ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react'
import { getPatient, getResultsFor, getLabSettings, getRangeOverrides, getHiddenReferenceSections, getLogoDataUrl, getBadgeDataUrl, getCertificationDataUrls, setPatientCompleted, type Patient, type ResultsBySection, type LabSettingsForm } from './api'
import { humanizeKey, getReferenceRange, unitFor, flagFor, formatTime12h, decodeOtherRow, supportsMethodNote } from './reportFields'
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
const PAGE_PAD_V = '12mm'
const PAGE_PAD_H_MM = 14
const PAGE_PAD_H = `${PAGE_PAD_H_MM}mm`
const PAGE_PAD = `${PAGE_PAD_V} ${PAGE_PAD_H}`

/** "Now", formatted to match the app's existing date/time style, with a 12-hour AM/PM clock. */
function formatReportedAt(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return `${date} ${formatTime12h(`${pad(d.getHours())}:${pad(d.getMinutes())}`)}`
}

function ReportBlockView({ block, patient, results, reportedAt, rangeOverrides, labDoctor, labDoctorQualifications, hiddenReferenceSections }: {
  block: ReportBlock; patient: Patient; results: ResultsBySection; reportedAt: string; rangeOverrides: Record<string, string>; labDoctor: string; labDoctorQualifications: string
  hiddenReferenceSections: Record<string, boolean>
}) {
  if (block.kind === 'patientInfo') {
    // Reported uses the date/time entered on the patient form (see PatientEntry.tsx's "Dates &
    // Times" editor) once it's been set; a patient saved before that existed still falls back to
    // the live moment the report is opened, same as this always used to work.
    const reported = patient.rptDate ? `${patient.rptDate} ${formatTime12h(patient.rptTime)}` : reportedAt

    // Patient name, age/sex, referred-by and SID all repeat on the strip under the letterhead on
    // every page (including this one — see renderPage), so this block only carries what that
    // strip doesn't: the title and the collection/receipt/report timestamps. Showing the same
    // patient/referred-by/age-sex line twice in a row right at the top of page 1 was redundant.
    return (
      <div className="avoid-break mb-6" data-role="patient-info-block">
        <div className="flex items-center justify-between pb-2.5 border-b-2" style={{ borderColor: 'var(--ink)' }}>
          <div className="text-[17px] font-bold uppercase tracking-widest text-[var(--ink)]">Laboratory Report</div>
          <div className="text-[11px] text-right text-[#333] leading-relaxed">
            SID (Unique Ref. No.) <b className="text-[#111]">{patient.sid}</b><br />
            Collected <b className="text-[#111]">{patient.date} {formatTime12h(patient.regTime)}</b><br />
            Received <b className="text-[#111]">{patient.date} {formatTime12h(patient.regTime)}</b><br />
            Reported <b className="text-[#111]">{reported}</b>
          </div>
        </div>
      </div>
    )
  }

  if (block.kind === 'emptySection') {
    return (
      <div className="avoid-break mb-6" data-role="empty-section-block">
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
    // A lab can turn the reference column off for a whole section (see the "Show reference
    // values" checkbox in ResultEntry.tsx) — when it's off the column is dropped entirely
    // rather than left blank, on-screen and on paper alike.
    const showReference = !hiddenReferenceSections[block.sectionKey]
    const gridCols = showReference ? 'grid-cols-[2.4fr_1fr_1fr_1.6fr]' : 'grid-cols-[2.4fr_1fr_1fr]'
    return (
      <div className="avoid-break mb-6" data-role="section-chunk">
        <div className="text-[13px] font-bold uppercase tracking-widest text-[#111] border-b-2 border-[#333] pb-1.5 mb-2" data-role="section-header">
          {block.label}{block.continued && <span className="font-normal italic text-[var(--ink-3)]"> (continued)</span>}
        </div>
        <div className={`grid ${gridCols} text-[11.5px] font-bold uppercase tracking-wide text-[var(--ink)] border-b border-[#bbb] pb-1.5 mb-1`} data-role="column-header">
          <span>Test</span><span>Result</span><span>Unit</span>{showReference && <span>Reference</span>}
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
          // "Method/kit used" note (see supportsMethodNote and ResultEntry.tsx's FieldRow) —
          // printed as a small parenthetical under the result, matching how Super Lab's old
          // system printed e.g. "Negative (SD Diagnostics)". Blank unless staff filled it in.
          const method = !isOthers && supportsMethodNote(block.sectionKey, k) ? data[k + '_method'] : undefined
          return (
            <div key={k} className={`grid ${gridCols} items-baseline text-[13px] py-2 border-b border-[#e8e8e8]`} data-role="result-row">
              <span className="font-bold text-[#111]">{isOthers ? k : humanizeKey(k)}</span>
              <span>
                <span style={{ fontWeight: flag ? 700 : 600, fontSize: '13.5px', color: flag ? arrowColor : '#111', fontFamily: 'Consolas, monospace' }}>
                  {flag === 'high' && <span>▲ </span>}
                  {flag === 'low' && <span>▼ </span>}
                  {value}
                </span>
                {method && <span className="block text-[10.5px] italic text-[#666] font-normal">({method})</span>}
              </span>
              <span className="text-[#333]">{unit}</span>
              {showReference && <span className="text-[#333]">{range}</span>}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="avoid-break" data-role="closing-block">
      <div className="text-center text-[11px] tracking-wide text-[var(--ink-3)] border-t border-b border-[#ddd] py-1.5 my-5">
        — End of report —
      </div>
      {/* items-start, not items-end: the two signature lines must sit level with each other
          regardless of how many lines of text follow (the right side got a second line —
          qualifications — that the left side doesn't have) — aligning to the bottom instead
          would drag this side's line down to match the taller block's total height. */}
      <div className="flex items-start justify-between mt-7">
        <div>
          <div className="border-t border-[var(--ink)] w-[160px] mb-1.5" />
          <div className="text-[11px] font-semibold tracking-wide text-[var(--ink-2)] uppercase">Lab Technician</div>
        </div>
        <div className="text-right">
          <div className="border-t border-[var(--ink)] w-[160px] mb-1.5 ml-auto" />
          {labDoctor && (
            <>
              <div className="text-[14px] font-bold text-[var(--ink)] leading-tight">{labDoctor}</div>
              {labDoctorQualifications && (
                <div className="text-[10.5px] font-medium text-[var(--ink-2)] tracking-wide mt-0.5">{labDoctorQualifications}</div>
              )}
            </>
          )}
          <div className="text-[10.5px] font-semibold text-[var(--accent)] tracking-wide uppercase mt-0.5">Lab Incharge</div>
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
  const [badge, setBadge] = useState<string | null>(null)
  const [certifications, setCertifications] = useState<string[]>([])
  const [rangeOverrides, setRangeOverrides] = useState<Record<string, string>>({})
  const [hiddenReferenceSections, setHiddenReferenceSections] = useState<Record<string, boolean>>({})
  // For a sample tested on behalf of another lab that will print it on their own letterhead —
  // no logo, watermark, footer, or named staff sign-off, just the patient info and results,
  // with blank space left at the top for their pre-printed stationery.
  const [externalMode, setExternalMode] = useState(false)

  // On-screen viewer controls only — printing always renders every page at 100%, regardless of
  // these (see the .report-viewer print override in index.css and the hidden/print:flex dance
  // on each page below, which keeps every page in the DOM for print even when only one is shown
  // on screen).
  const [zoom, setZoom] = useState(1)
  const [viewMode, setViewMode] = useState<'single' | 'two' | 'continuous'>('continuous')
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
    getHiddenReferenceSections().then(setHiddenReferenceSections)
    getLogoDataUrl().then(setLogo)
    getBadgeDataUrl().then(setBadge)
    getCertificationDataUrls().then(setCertifications)
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
    const digits = patient.mobile.replace(/\D/g, '')
    if (!digits) return
    const message = `Hi, your lab report from ${settings.labName} is ready. Please find it attached.`
    window.open(`https://wa.me/91${digits}?text=${encodeURIComponent(message)}`, '_blank')
  }

  const [savingPdf, setSavingPdf] = useState(false)

  // Renders this same window to a PDF rather than opening the print dialog, so "Save PDF"
  // actually saves a file the user picks a location for instead of routing through Windows'
  // print picker (which is what the old window.print()-for-everything approach did). A
  // successful save also marks the patient completed (see Patient.markedComplete) — downloading
  // the report is the real-world signal that it's done, not "every field got filled in".
  const handleSavePdf = async () => {
    if (!patient || savingPdf) return
    setSavingPdf(true)
    try {
      const result = await window.api.print.pdf(`${patient.name}_${patient.sid}`)
      if (result.saved) {
        window.api.shell.openPath(result.filePath)
        if (!patient.markedComplete) {
          await setPatientCompleted(patient.id, true)
          setPatient((p) => (p ? { ...p, markedComplete: true } : p))
        }
      }
    } finally {
      setSavingPdf(false)
    }
  }

  // Manual override for the same flag — for a report handed over some other way (printed
  // directly, read out over the phone), or to undo an accidental/premature completion.
  const handleToggleCompleted = async () => {
    if (!patient) return
    const next = !patient.markedComplete
    await setPatientCompleted(patient.id, next)
    setPatient((p) => (p ? { ...p, markedComplete: next } : p))
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
      data-role="page"
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
          <div className="relative" style={{ zIndex: 1 }} data-role="letterhead-header">
            <LetterheadHeader labName={settings.labName} logoDataUrl={logo} badgeDataUrl={badge} />
          </div>
        </>
      )}

      {/* Repeats on every page (not just the one with the full patient-info block) so a page that
          gets separated from the rest of the report still identifies whose it is. Same
          Patient/Referred by/Age-Sex layout the report used to show once on page 1 only, with
          SID folded into the first row. Counted as a fixed per-page cost in pagination.ts's
          PATIENT_STRIP_HEIGHT — re-measure there if this grows again. */}
      <div className="relative pt-1.5 pb-2" style={{ zIndex: 1, borderBottom: '1px solid #e5e5e5' }} data-role="patient-strip">
        <div className="flex items-center justify-between text-[13px] text-[#333]">
          <span>Patient <b className="text-[var(--ink)]">{patient.name}</b></span>
          <span>Referred by <b className="text-[var(--ink)]">{patient.referredBy}</b></span>
          <span>SID <b className="text-[var(--ink)]">{patient.sid}</b></span>
        </div>
        <div className="text-[13px] text-[#333] mt-1">
          Age / Sex <b className="text-[var(--ink)]">{patient.age}{patient.ageUnit} / {patient.gender === 'M' ? 'Male' : 'Female'}</b>
        </div>
      </div>

      <div className="relative flex-1 mt-3" style={{ zIndex: 1 }} data-role="content">
        {blocks.map((block, i) => (
          <ReportBlockView key={i} block={block} patient={patient} results={results} reportedAt={reportedAt} rangeOverrides={rangeOverrides} labDoctor={settings.labDoctor} labDoctorQualifications={settings.labDoctorQualifications} hiddenReferenceSections={hiddenReferenceSections} />
        ))}
      </div>

      {/* Absolutely positioned against the page box (not "last flex child pushed down by
          content's flex-1") so it sits at the exact same spot on every page regardless of how
          much content precedes it — a flex-computed position drifted a few px page to page
          depending on the PDF engine's rounding. Bottom is 0, not PAGE_PAD_V: the footer's own
          closing wave is a deliberate bleed-to-the-edge flourish, and insetting the whole block
          by the page's bottom padding just left a dead strip of blank white beneath it. Left/right
          stay inset to PAGE_PAD_H so the actual text/contact/certification content lines up with
          everything else on the page — only the wave underneath it bleeds past that inset (see
          bleedMm) to reach both paper edges, so it reads as a band closing off the sheet rather
          than a bar that stops short on both sides. */}
      {!externalMode && (
        <div className="absolute" style={{ zIndex: 1, left: PAGE_PAD_H, right: PAGE_PAD_H, bottom: 0 }} data-role="letterhead-footer">
          <LetterheadFooter settings={settings} certificationDataUrls={certifications} bleedMm={PAGE_PAD_H_MM} />
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
              onClick={handleToggleCompleted}
              title={patient.markedComplete ? 'Move this patient back to in-progress' : 'Mark as completed without saving a PDF (e.g. report handed over some other way)'}
              className={`inline-flex items-center gap-2 px-4 py-2 text-[14px] font-medium rounded-xl border ${
                patient.markedComplete
                  ? 'bg-[var(--success-soft)] text-[var(--success)] border-[var(--success-soft-border)]'
                  : 'bg-[var(--surface)] text-[var(--ink-2)] border-[var(--border-strong)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {patient.markedComplete ? <CheckCircle2 size={14} /> : <Circle size={14} />}
              {patient.markedComplete ? 'Completed' : 'Mark as completed'}
            </button>
            <div className="h-5 w-px bg-[var(--border)]" />
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
            <button
              onClick={handleWhatsApp}
              disabled={!patient.mobile.trim()}
              title={patient.mobile.trim() ? undefined : 'No mobile number on file for this patient'}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-soft)] text-[var(--accent-ink)] text-[14px] font-medium rounded-xl hover:bg-[var(--accent-soft-border)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--accent-soft)]"
            >
              <MessageCircle size={14} />
              Share
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 px-8 py-2 bg-[var(--surface)] border-b border-[var(--border)] flex-shrink-0 print:hidden">
          <div className="inline-flex items-center gap-0.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-app)] p-0.5">
            <button
              onClick={() => setViewMode('continuous')}
              title="Continuous scroll"
              className={`inline-flex items-center justify-center w-7 h-7 rounded-md ${viewMode === 'continuous' ? 'bg-[var(--surface)] shadow-sm text-[var(--accent-ink)]' : 'text-[var(--ink-3)] hover:text-[var(--ink)]'}`}
            >
              <Rows3 size={14} />
            </button>
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
