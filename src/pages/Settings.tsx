import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, CheckCircle2, Building2, ShieldCheck, ArrowLeft } from 'lucide-react'
import { useReport } from '../store/useReport'

export default function Settings() {
  const navigate = useNavigate()
  const { settings, setSettings } = useReport()
  const [form, setForm] = useState({ ...settings })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setForm({ ...settings })
  }, [settings])

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    for (const [k, v] of Object.entries(form)) {
      await window.api.settings.set(k, v ?? '')
    }
    setSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const fields = [
    { key: 'lab_name',    label: 'Laboratory Name',     placeholder: 'e.g. City Diagnostic Lab' },
    { key: 'lab_address', label: 'Address',              placeholder: 'Full address' },
    { key: 'lab_phone',   label: 'Phone / Contact',      placeholder: 'e.g. 9443963741' },
    { key: 'lab_doctor',  label: 'Authorised Doctor',    placeholder: 'Dr. Name (printed on reports)' }
  ]

  return (
    <div className="flex-1 overflow-y-auto">
      <div
        className="flex items-center px-5 flex-shrink-0"
        style={{ height: 52, borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <button
          className="flex items-center gap-1.5 text-[14px] text-ink-2 hover:text-ink px-2 py-1.5 rounded-md hover:bg-app transition-colors"
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={15} />
          Start
        </button>
      </div>

      <div className="max-w-xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[20px] font-semibold text-ink">Settings</h1>
            <p className="text-[14px] text-ink-2 mt-0.5">Laboratory and report configuration</p>
          </div>
          <button className="btn-primary" onClick={handleSave}>
            {saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>

        <div className="card p-5 mb-4">
          <div className="flex items-center gap-2 mb-5">
            <Building2 size={16} className="text-accent" />
            <h2 className="section-heading mb-0">Laboratory Information</h2>
          </div>
          <div className="space-y-4">
            {fields.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="form-label">{label}</label>
                <input
                  className="input-field"
                  placeholder={placeholder}
                  value={form[key] ?? ''}
                  onChange={(e) => update(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 mb-4" style={{ borderColor: 'var(--accent-soft-border)', background: 'var(--accent-soft)' }}>
          <div className="flex items-start gap-3">
            <ShieldCheck size={19} className="text-accent flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-[15px] font-semibold text-accent-ink mb-1">Data stays on this computer</h2>
              <p className="text-[14.5px] text-accent-ink leading-relaxed">
                All patient records and reports are stored in a local database file on this machine only.
                Nothing is uploaded to the cloud or any external server — the app works fully offline.
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="section-heading">Report Output</h2>
          <div className="space-y-2 text-[14.5px] text-ink-2 leading-relaxed">
            <p>
              PDFs are saved to <span className="font-medium text-ink">Documents\LabReports\</span> on this computer and opened automatically after saving.
            </p>
            <p>
              Printing uses any installed Windows printer. Select your printer from the dropdown in the report preview.
            </p>
            <p>
              WhatsApp sharing saves the PDF first, then opens WhatsApp Web. Attach the PDF from Documents\LabReports manually.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
