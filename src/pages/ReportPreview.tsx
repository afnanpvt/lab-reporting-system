import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Download, MessageCircle, ChevronDown, AlertCircle } from 'lucide-react'
import type { Patient, AllResults } from '../types/lab'
import ReportTemplate from '../components/report/ReportTemplate'
import { useReport } from '../store/useReport'
import { renderToStaticMarkup } from 'react-dom/server'

export default function ReportPreview() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const settings = useReport((s) => s.settings)
  const patientId = parseInt(id!)

  const [patient, setPatient] = useState<Patient | null>(null)
  const [results, setResults] = useState<Partial<AllResults>>({})
  const [printers, setPrinters] = useState<Electron.PrinterInfo[]>([])
  const [selectedPrinter, setSelectedPrinter] = useState('')
  const [showPrinterMenu, setShowPrinterMenu] = useState(false)
  const [status, setStatus] = useState('')
  const [statusIsError, setStatusIsError] = useState(false)

  useEffect(() => {
    const load = async () => {
      const p = await window.api.patients.get(patientId)
      if (!p) return
      setPatient(p)
      const all = await window.api.results.getAll(patientId)
      const mapped: Record<string, Record<string, string>> = {}
      for (const [sec, res] of Object.entries(all)) {
        if (res && typeof res === 'object') {
          mapped[sec] = Object.fromEntries(
            Object.entries(res as Record<string, unknown>)
              .filter(([k]) => k !== 'patient_id')
              .map(([k, v]) => [k, v == null ? '' : String(v)])
          )
        }
      }
      setResults(mapped as Partial<AllResults>)
    }
    load()

    window.api.printers.list().then((list) => {
      setPrinters(list)
      const def = list.find((p) => p.isDefault)
      if (def) setSelectedPrinter(def.name)
    })
  }, [patientId])

  const buildHtml = () => {
    if (!patient) return ''
    const body = renderToStaticMarkup(
      <ReportTemplate patient={patient} results={results} settings={settings} />
    )
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 11px; }
      @page { size: A4; margin: 15mm 18mm; }
      @media print { body { -webkit-print-color-adjust: exact; } }
    </style></head><body>${body}</body></html>`
  }

  const setMsg = (msg: string, opts: { isError?: boolean; delay?: number } = {}) => {
    const { isError = false, delay = 3000 } = opts
    setStatus(msg)
    setStatusIsError(isError)
    if (delay > 0) setTimeout(() => setStatus(''), delay)
  }

  const handlePdf = async () => {
    if (!patient) return
    setMsg('Generating PDF...', { delay: 0 })
    try {
      const html = buildHtml()
      const path = await window.api.print.pdf(html, patient.name)
      setMsg('PDF saved!')
      await window.api.shell.openPath(path)
      await window.api.patients.update(patient.id, { status: 'completed' })
    } catch {
      setMsg('Could not generate the PDF. Please try again.', { isError: true, delay: 5000 })
    }
  }

  const handlePrint = async () => {
    if (!patient || !selectedPrinter) return
    setMsg('Sending to printer...', { delay: 0 })
    try {
      const html = buildHtml()
      const result = await window.api.print.direct(html, selectedPrinter)
      if (result.success) {
        setMsg('Sent to printer!')
        await window.api.patients.update(patient.id, { status: 'completed' })
      } else {
        setMsg(`Print failed: ${result.reason || 'unknown error'}`, { isError: true, delay: 5000 })
      }
    } catch {
      setMsg('Could not reach the printer. Please try again.', { isError: true, delay: 5000 })
    }
  }

  const handleWhatsApp = async () => {
    if (!patient) return
    setMsg('Preparing report for WhatsApp...', { delay: 0 })
    try {
      const html = buildHtml()
      const path = await window.api.print.pdf(html, patient.name)
      await window.api.shell.openPath(path)
      if (patient.mobile) {
        const message = `Hi, your lab report from ${settings.lab_name || 'the lab'} is ready. Please find it attached.`
        await window.api.shell.openWhatsApp(patient.mobile, message)
        setMsg(`WhatsApp opened for ${patient.name} — the PDF is highlighted in your file explorer, just drag it into the chat and send.`, { delay: 8000 })
      } else {
        await window.api.shell.openWhatsApp('')
        setMsg('No mobile number on file for this patient. WhatsApp Web opened — attach the highlighted PDF manually.', { delay: 8000 })
      }
    } catch {
      setMsg('Could not prepare the PDF for WhatsApp. Please try again.', { isError: true, delay: 5000 })
    }
  }

  if (!patient) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-accent-softBorder border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white flex-shrink-0" style={{ borderBottom: '1px solid #e7e9ec' }}>
        <button className="btn-ghost py-1.5 px-2.5" onClick={() => navigate(`/report/${patientId}`)}>
          <ArrowLeft size={13} />
          <span className="text-xs">Edit</span>
        </button>

        <div className="h-4 w-px bg-slate-200" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">Report Preview</p>
          <p className="text-xs text-slate-500">
            {patient.name} · <span className="font-mono">{patient.sid}</span>
          </p>
        </div>

        {status && (
          <span className={`flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-lg max-w-[420px] ${
            statusIsError ? 'text-red-700 bg-red-50 border border-red-200' : 'text-slate-700 bg-slate-100'
          }`}>
            {statusIsError && <AlertCircle size={12} className="flex-shrink-0" />}
            {status}
          </span>
        )}

        <div className="flex items-center gap-2">
          {/* Printer selector */}
          <div className="relative flex">
            <button
              className="btn-secondary py-1.5 text-xs rounded-r-none border-r-0"
              onClick={handlePrint}
              disabled={!selectedPrinter}
            >
              <Printer size={12} />
              Print
            </button>
            <button
              className="btn-secondary py-1.5 text-xs rounded-l-none px-2"
              onClick={() => setShowPrinterMenu(!showPrinterMenu)}
            >
              <ChevronDown size={11} />
            </button>
            {showPrinterMenu && (
              <div className="absolute top-full right-0 mt-1.5 w-72 bg-white rounded-xl shadow-lg z-50 py-1.5 overflow-hidden"
                style={{ border: '1px solid #e2e5e9', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Select Printer</p>
                {printers.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-500">No printers found</p>
                ) : (
                  printers.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => { setSelectedPrinter(p.name); setShowPrinterMenu(false) }}
                      className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-slate-50"
                      style={{
                        color: selectedPrinter === p.name ? '#0f766e' : '#334155',
                        fontWeight: selectedPrinter === p.name ? 600 : 400,
                      }}
                    >
                      {p.name}
                      {p.isDefault && <span className="ml-1.5 text-[10px] text-slate-500">(Default)</span>}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <button className="btn-secondary py-1.5 text-xs" onClick={handlePdf}>
            <Download size={12} />
            Save PDF
          </button>

          <button className="btn-secondary py-1.5 text-xs" onClick={handleWhatsApp}>
            <MessageCircle size={12} />
            WhatsApp
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-y-auto p-8" style={{ background: '#dde1e6' }}>
        <div
          className="max-w-[794px] mx-auto bg-white rounded-sm min-h-[1123px] p-[20mm]"
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)' }}
        >
          <ReportTemplate patient={patient} results={results} settings={settings} />
        </div>
      </div>
    </div>
  )
}
