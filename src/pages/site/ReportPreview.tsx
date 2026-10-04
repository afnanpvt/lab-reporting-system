import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Download, Printer, MessageCircle, Building2, ZoomIn, ZoomOut, FileText, Columns2, Rows3, ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react'
import { getPatient, getResultsFor, listDoctors, referredByLine, type Doctor, getLabSettings, getRangeOverrides, getUnitOverrides, getHiddenReferenceSections, getLogoDataUrl, getBadgeDataUrl, getCertificationDataUrls, setPatientCompleted, type Patient, type ResultsBySection, type LabSettingsForm } from './api'
import { getReferenceRange, sectionKeyForLabel, unitFor, flagFor, formatTime12h, decodeOtherRow, supportsMethodNote } from './reportFields'
import { useLabels } from './labelsStore'
import { useFeatures } from './featuresStore'
import { useRangeSpecs } from './rangeSpecsStore'
import { LetterheadHeader, LetterheadWatermark, LetterheadFooter } from './ReportLetterhead'
import { filledKeysFor, paginateReport, type ReportBlock } from './pagination'
import { reportBlockers } from './valueChecks'
import { buildProbe, measureProbe, overshootOf, type MeasuredMetrics, type Probe } from './measureReport'

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

function useMarginSetting(storageKey: string, fallback: number) {
  const [mm, setMm] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      const n = Number(raw)
      return raw !== null && n >= 0 && n <= 80 ? n : fallback
    } catch { return fallback }
  })
  const set = (n: number) => {
    const clamped = Math.min(80, Math.max(0, Math.round(n) || 0))
    setMm(clamped)
    try { localStorage.setItem(storageKey, String(clamped)) } catch { /* not remembered, still applied */ }
  }
  return [mm, set] as const
}

function ReportBlockView({ block, patient, results, reportedAt, rangeOverrides, unitOverrides, labDoctor, labDoctorQualifications, hiddenReferenceSections }: {
  block: ReportBlock; patient: Patient; results: ResultsBySection; reportedAt: string; rangeOverrides: Record<string, string>; unitOverrides: Record<string, string>; labDoctor: string; labDoctorQualifications: string
  hiddenReferenceSections: Record<string, boolean>
}) {
  const labelFor = useLabels()
  useFeatures() // re-render if highlighting is switched on/off
  useRangeSpecs() // ...or a range is edited
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
    const isCs = block.sectionKey === 'cs'
    // C.S. has no units or ranges (organism, remarks, S/I/R per antibiotic), so it gets a wide
    // result column instead of two permanently empty ones.
    const showReference = !isCs && !hiddenReferenceSections[block.sectionKey]
    const gridCols = isCs ? 'grid-cols-[2.4fr_3.6fr]' : showReference ? 'grid-cols-[2.4fr_1fr_1fr_1.6fr]' : 'grid-cols-[2.4fr_1fr_1fr]'
    // Mantoux is the one two-visit test — print when the PPD was injected and when the induration
    // was read, on a small line under the heading (only on the first chunk, not a "(continued)"
    // one), and only for whichever of the two the technician actually filled in.
    const mantouxData = block.sectionKey === 'mantoux' ? (results.mantoux ?? {}) : null
    const injectionAt = mantouxData?.injection_date
      ? `${mantouxData.injection_date}${mantouxData.injection_time ? ' ' + formatTime12h(mantouxData.injection_time) : ''}`
      : ''
    const readingAt = mantouxData?.reading_date
      ? `${mantouxData.reading_date}${mantouxData.reading_time ? ' ' + formatTime12h(mantouxData.reading_time) : ''}`
      : ''
    return (
      <div className="avoid-break mb-6" data-role="section-chunk">
        <div className="text-[13px] font-bold uppercase tracking-widest text-[#111] border-b-2 border-[#333] pb-1.5 mb-2" data-role="section-header">
          {block.label}{block.continued && <span className="font-normal italic text-[var(--ink-3)]"> (continued)</span>}
        </div>
        {!block.continued && (injectionAt || readingAt) && (
          <div className="flex flex-wrap gap-x-6 text-[11.5px] text-[#333] mb-2" data-role="mantoux-times">
            {injectionAt && <span>Injected <b className="text-[#111]">{injectionAt}</b></span>}
            {readingAt && <span>Read <b className="text-[#111]">{readingAt}</b></span>}
          </div>
        )}
        <div className={`grid ${gridCols} text-[11.5px] font-bold uppercase tracking-wide text-[var(--ink)] border-b border-[#bbb] pb-1.5 mb-1`} data-role="column-header">
          <span>{isCs ? 'Test / Antibiotic' : 'Test'}</span><span>Result</span>{!isCs && <span>Unit</span>}{showReference && <span>Reference</span>}
        </div>
        {block.keys.map((k) => {
          const data = results[block.sectionKey] ?? {}
          const isOthers = block.sectionKey === 'others'
          const other = isOthers ? decodeOtherRow(data[k]) : null
          const value = other ? other.value : data[k]
          const range = other ? other.reference : getReferenceRange(block.sectionKey, k, patient.gender, rangeOverrides, unitOverrides)
          const unit = other ? other.unit : unitFor(block.sectionKey, k, unitOverrides)
          const flag = flagFor(value, range, isOthers ? undefined : k, isOthers ? undefined : { sectionKey: block.sectionKey, gender: patient.gender })
          const arrowColor = flag ? 'var(--danger)' : undefined
          // "Method/kit used" note (see supportsMethodNote and ResultEntry.tsx's FieldRow) —
          // printed as a small parenthetical under the result, matching how Super Lab's old
          // system printed e.g. "Negative (SD Diagnostics)". Blank unless staff filled it in.
          const method = !isOthers && supportsMethodNote(block.sectionKey, k) ? data[k + '_method'] : undefined
          // Remarks, interpretations and long free text would wrap inside a ~30mm column and print as
          // a tall sliver (or run past the footer): give them the full row width, line breaks kept.
          if (/[\r\n]/.test(value) || value.length > 40) {
            return (
              <div key={k} className="text-[13px] py-2 border-b border-[#e8e8e8]" data-role="result-row">
                <div className="font-bold text-[#111] mb-0.5">{isOthers ? k : labelFor(block.sectionKey, k)}</div>
                <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#111', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {value}{unit ? <span className="font-normal text-[#333]"> {unit}</span> : null}
                </div>
                {showReference && range && <div className="text-[11px] text-[#555] mt-0.5">Reference: {range}</div>}
              </div>
            )
          }
          return (
            <div key={k} className={`grid ${gridCols} items-baseline text-[13px] py-2 border-b border-[#e8e8e8]`} data-role="result-row">
              <span className="font-bold text-[#111]">{isOthers ? k : labelFor(block.sectionKey, k)}</span>
              <span>
                <span style={{ fontWeight: flag ? 700 : 600, fontSize: '13.5px', color: flag ? arrowColor : '#111', fontFamily: 'Consolas, monospace' }}>
                  {flag === 'high' && <span>▲ </span>}
                  {flag === 'low' && <span>▼ </span>}
                  {value}
                </span>
                {method && <span className="block text-[10.5px] italic text-[#666] font-normal">({method})</span>}
              </span>
              {!isCs && <span className="text-[#333]">{unit}</span>}
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
        End of report
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
  // Opened from the Reports page? Then Back goes there instead of into the patient's results.
  const from = (location.state as { from?: string } | null)?.from
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [patient, setPatient] = useState<Patient | null>((location.state as { patient?: Patient })?.patient ?? null)
  const [results, setResults] = useState<ResultsBySection | null>(null)
  const [settings, setSettings] = useState<LabSettingsForm | null>(null)
  const [logo, setLogo] = useState<string | null>(null)
  const [badge, setBadge] = useState<string | null>(null)
  const [certifications, setCertifications] = useState<string[]>([])
  const [rangeOverrides, setRangeOverrides] = useState<Record<string, string>>({})
  const [unitOverrides, setUnitOverrides] = useState<Record<string, string>>({})
  const [hiddenReferenceSections, setHiddenReferenceSections] = useState<Record<string, boolean>>({})
  const [doctors, setDoctors] = useState<Doctor[]>([])
  // For a sample tested on behalf of another lab that will print it on their own letterhead —
  // no logo, watermark, footer, or named staff sign-off, just the patient info and results,
  // with blank space left at the top for their pre-printed stationery.
  const [externalMode, setExternalMode] = useState(false)
  // Space kept clear at the top and bottom of an external-lab page for their own letterhead and
  // footer. Their stationery isn't ours, so staff can adjust it; remembered between reports.
  const [externalTopMm, setExternalTopMm] = useMarginSetting('lumalabs.externalTopMm', 29)
  const [externalBottomMm, setExternalBottomMm] = useMarginSetting('lumalabs.externalBottomMm', 30)

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
    listDoctors().then(setDoctors)
    getRangeOverrides().then(setRangeOverrides)
    getUnitOverrides().then(setUnitOverrides)
    getHiddenReferenceSections().then(setHiddenReferenceSections)
    getLogoDataUrl().then(setLogo)
    getBadgeDataUrl().then(setBadge)
    getCertificationDataUrls().then(setCertifications)
  }, [])

  // Page breaks come from the report's real, measured sizes (see measureReport.ts): an invisible
  // "probe" page is rendered with one of every block, measured, and those numbers drive pagination.
  // The first render uses typical sizes; the measurement lands before the browser paints.
  const probeRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  // Measurements and the safety margin both belong to one specific report (`probe`): when the report
  // changes they are discarded rather than carried over, so a stale reading can never shape — or
  // wrongly widen the margin of — the next patient's pages.
  const [measured, setMeasured] = useState<{ probe: Probe; metrics: MeasuredMetrics } | null>(null)
  const [boosted, setBoosted] = useState<{ probe: Probe; value: number } | null>(null)
  const probe = useMemo(() => (patient && results ? buildProbe(patient.sections, results) : null), [patient, results])
  // Extra room held back above the footer. Raised only by the self-check below if a displayed page
  // ever overflows despite the measurements (it should not), so content is never silently clipped.
  const boost = boosted && boosted.probe === probe ? boosted.value : 0
  const metrics = measured && measured.probe === probe ? measured.metrics : null

  const remeasure = () => {
    const root = probeRef.current
    if (!root || !probe) return
    const next = measureProbe(root, probe, boost)
    if (next) setMeasured((prev) => (prev && prev.probe === probe && prev.metrics.sig === next.sig ? prev : { probe, metrics: next }))
  }
  const remeasureRef = useRef(remeasure)
  remeasureRef.current = remeasure
  useLayoutEffect(() => {
    remeasure()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [probe, rangeOverrides, unitOverrides, hiddenReferenceSections, settings, certifications, logo, badge, externalMode, externalTopMm, externalBottomMm, boost])
  // The footer's height can change after first paint (certification logos and fonts load late).
  useEffect(() => {
    const root = probeRef.current
    if (!root || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => remeasureRef.current())
    ro.observe(root)
    document.fonts?.ready.then(() => remeasureRef.current())
    return () => ro.disconnect()
  }, [probe !== null])

  const pages = useMemo(() => (patient && results ? paginateReport(patient, results, metrics ?? undefined) : []), [patient, results, metrics])

  useLayoutEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || pages.length === 0 || !probe || !metrics) return // only check pages built from this report's own measurements
    let worst = 0
    viewer.querySelectorAll<HTMLElement>('[data-role="page"]').forEach((el) => {
      if (el.offsetParent) worst = Math.max(worst, overshootOf(el) / zoom) // a hidden page (single-page view) can't be measured
    })
    if (worst > 0.5 && boost < 80) setBoosted({ probe, value: Math.min(80, boost + Math.ceil(worst) + 2) })
  }, [pages, zoom, viewMode, currentPage])
  const reportedAt = useMemo(() => formatReportedAt(), [patient?.id])
  // Sections picked for this patient with nothing entered aren't printed (see paginateReport); they
  // are listed above the report instead, and a report with no results at all can't be printed or saved.
  const emptySections = useMemo(() => {
    if (!patient || !results) return []
    return patient.sections.filter((label) => {
      const key = sectionKeyForLabel(label)
      return !key || filledKeysFor(key, results[key] ?? {}).length === 0
    })
  }, [patient, results])
  const noResults = !!patient && emptySections.length === patient.sections.length

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
      if (!result.saved && result.reason !== 'canceled') {
        window.alert(`The PDF could not be saved.

${result.reason}

If a PDF with the same name is open in another program, close it and try again.`)
      }
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

  // Impossible results (a differential over 100%) mean there is no report to show, print or save.
  // Every route here (Reports list, Review report) lands on this; see valueChecks.ts's reportBlockers.
  const blockers = reportBlockers(patient.sections.map((l) => sectionKeyForLabel(l) ?? ''), results)
  if (blockers.length > 0) {
    return (
      <main className="px-10 py-9 max-w-xl">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={20} className="text-[var(--danger)]" />
          <h1 className="text-[18px] font-semibold text-[var(--ink)]">This report can't be opened yet</h1>
        </div>
        <p className="text-[14px] text-[var(--ink-2)] mb-3">{patient.name} · {patient.sid}</p>
        <ul className="list-disc pl-5 mb-5 text-[14px] text-[var(--ink)] space-y-1">
          {blockers.map((b) => <li key={`${b.sectionKey}:${b.field}`}>{b.issue.message}</li>)}
        </ul>
        <p className="text-[13px] text-[var(--ink-3)] mb-5">Correct the values in Result Entry. The report, print and PDF stay unavailable until the totals are valid.</p>
        <button
          onClick={() => navigate(`/report/${patient.id}`, { state: { patient } })}
          className="px-4 py-2 text-[14px] font-medium text-white bg-[var(--accent)] rounded-xl hover:bg-[var(--accent-ink)]"
        >
          Back to results
        </button>
      </main>
    )
  }

  // hiddenOnScreen keeps a page in the DOM (so printing still renders the whole document) while
  // collapsing it visually in single-page mode — print:flex brings it back for the print stylesheet.
  const renderPage = (blocks: ReportBlock[], pageIndex: number, hiddenOnScreen = false, probeMode = false) => (
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
        <div style={{ height: `${externalTopMm}mm` }} />
      ) : (
        <>
          <LetterheadWatermark labName={settings.labName} logoDataUrl={logo} />
          <div className="relative" style={{ zIndex: 1 }} data-role="letterhead-header">
            <LetterheadHeader labName={settings.labName} logoDataUrl={logo} badgeDataUrl={badge} />
          </div>
        </>
      )}

      {/* Repeats on every page so a page separated from the rest of the report still identifies
          whose it is. The customer wants pages 2, 3... laid out exactly like page 1, so below it
          every page also carries the full "LABORATORY REPORT" block with SID/Collected/Received/
          Reported (a fixed per-page cost, see paginateReport). */}
      <div className="relative pt-1.5 pb-2" style={{ zIndex: 1, borderBottom: '1px solid #e5e5e5' }} data-role="patient-strip">
        <div className="flex items-center justify-between text-[13px] text-[#333]">
          <span>Patient <b className="text-[var(--ink)]">{patient.name}</b></span>
          {patient.referredBy && patient.referredBy !== 'Self' && (
            <span>Referred by <b className="text-[var(--ink)]">{referredByLine(patient.referredBy, doctors)}</b></span>
          )}
          <span>SID <b className="text-[var(--ink)]">{patient.sid}</b></span>
        </div>
        <div className="flex items-center flex-wrap gap-x-0 text-[#333] mt-1">
          <span className="text-[13px]">Age / Sex <b className="text-[var(--ink)]">{patient.age}{patient.ageUnit} / {patient.gender === 'M' ? 'Male' : 'Female'}</b></span>
        </div>
      </div>

      <div className="relative flex-1 mt-3" style={{ zIndex: 1 }} data-role="content">
        {/* In the probe the patient-info block is measured through its own plan entry instead. */}
        {!probeMode && (
          <ReportBlockView block={{ kind: 'patientInfo' }} patient={patient} results={results} reportedAt={reportedAt} rangeOverrides={rangeOverrides} unitOverrides={unitOverrides} labDoctor={settings.labDoctor} labDoctorQualifications={settings.labDoctorQualifications} hiddenReferenceSections={hiddenReferenceSections} />
        )}
        {blocks.map((block, i) => {
          const view = (
            <ReportBlockView key={i} block={block} patient={patient} results={results} reportedAt={reportedAt} rangeOverrides={rangeOverrides} unitOverrides={unitOverrides} labDoctor={settings.labDoctor} labDoctorQualifications={settings.labDoctorQualifications} hiddenReferenceSections={hiddenReferenceSections} />
          )
          // flow-root keeps each block's own margins inside the wrapper so its true height can be read.
          return probeMode ? <div key={i} data-measure={i} style={{ display: 'flow-root' }}>{view}</div> : view
        })}
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
      {externalMode ? (
        // Their pre-printed footer (address, contact, accreditation) sits down here, so keep clear
        // of it. Registered as the footer so measuring and the overflow self-check both stop above it.
        <div className="absolute left-0 right-0 bottom-0" style={{ height: `${externalBottomMm}mm` }} data-role="letterhead-footer" />
      ) : (
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
            onClick={() => (from ? navigate(from) : navigate(`/report/${patient.id}`, { state: { patient } }))}
            className="inline-flex items-center gap-1.5 text-[14px] text-[var(--ink-3)] hover:text-[var(--ink)]"
          >
            <ArrowLeft size={15} />
            {from === '/reports' ? 'Back to reports' : 'Edit results'}
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
              disabled={savingPdf || noResults}
              title={noResults ? 'No results have been entered yet' : undefined}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-soft)] text-[var(--accent-ink)] text-[14px] font-medium rounded-xl hover:bg-[var(--accent-soft-border)] disabled:opacity-60"
            >
              <Download size={14} />
              {savingPdf ? 'Saving…' : 'Save PDF'}
            </button>
            <button onClick={() => window.print()} disabled={noResults} title={noResults ? 'No results have been entered yet' : undefined} className="disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-soft)] text-[var(--accent-ink)] text-[14px] font-medium rounded-xl hover:bg-[var(--accent-soft-border)]">
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

        {emptySections.length > 0 && (
          <div className="flex items-center gap-2 px-8 py-2 text-[13px] flex-shrink-0 print:hidden" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', borderBottom: '1px solid var(--danger-soft-border)' }}>
            <AlertTriangle size={14} className="flex-shrink-0" />
            {noResults
              ? 'No results have been entered yet, so there is nothing to print or save.'
              : `No results entered for ${emptySections.join(', ')}. ${emptySections.length === 1 ? 'It is' : 'They are'} left out of this report.`}
          </div>
        )}

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

          {externalMode && (
            <div className="inline-flex items-center gap-3 text-[13px] text-[var(--ink-2)]" title="Blank space kept at the top and bottom of every page for the other lab's letterhead and footer">
              {([['Top', externalTopMm, setExternalTopMm], ['Bottom', externalBottomMm, setExternalBottomMm]] as const).map(([label, value, set]) => (
                <label key={label} className="inline-flex items-center gap-1.5">
                  {label} margin
                  <input
                    type="number" min={0} max={80} value={value}
                    onChange={(e) => set(Number(e.target.value))}
                    className="w-14 px-2 py-1 rounded-md border border-[var(--border-strong)] bg-[var(--bg-app)] text-[var(--ink)] tabular-nums"
                  />
                  mm
                </label>
              ))}
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
          <div ref={viewerRef} className="report-viewer flex flex-col items-center gap-9 print:gap-0" style={{ zoom }}>
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

        {/* The invisible probe page the measurements come from (see measureReport.ts). Laid out like a
            real page but off-screen, never zoomed, and never printed. */}
        {probe && (
          <div ref={probeRef} aria-hidden="true" className="print:hidden" style={{ position: 'fixed', left: -20000, top: 0, visibility: 'hidden', pointerEvents: 'none' }}>
            {renderPage(probe.blocks, -1, false, true)}
          </div>
        )}
      </div>
  )
}
