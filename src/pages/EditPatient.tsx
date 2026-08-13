import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, Check, ArrowLeft } from 'lucide-react'
import { SECTIONS } from '../types/lab'

export default function EditPatient() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const patientId = parseInt(id!)

  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '', age: '', age_unit: 'Y', gender: 'M', mobile: '', referred_by: '', address: ''
  })
  const [selectedSections, setSelectedSections] = useState<string[]>([])

  useEffect(() => {
    window.api.patients.get(patientId).then((p) => {
      if (!p) { setLoadFailed(true); return }
      setForm({
        name: p.name ?? '',
        age: String(p.age ?? ''),
        age_unit: p.age_unit ?? 'Y',
        gender: p.gender ?? 'M',
        mobile: p.mobile ?? '',
        referred_by: p.referred_by ?? '',
        address: p.address ?? ''
      })
      const sections = typeof p.sections === 'string' ? JSON.parse(p.sections) : p.sections
      setSelectedSections(sections ?? [])
      setLoading(false)
    }).catch(() => setLoadFailed(true))
  }, [patientId])

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))
  const toggleSection = (key: string) => {
    setSelectedSections((prev) => prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key])
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Please enter the patient\'s name before continuing.')
      return
    }
    if (selectedSections.length === 0) {
      setError('Select at least one test before continuing.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await window.api.patients.update(patientId, {
        ...form,
        age: parseInt(form.age) || 0,
        sections: JSON.stringify(selectedSections)
      })
      navigate(`/report/${patientId}`)
    } catch (e) {
      setError('We couldn\'t save these changes. Please try again.')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loadFailed) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="error-banner max-w-sm">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          <span>This patient record could not be found.</span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-accent-softBorder border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div
        className="flex items-center gap-3 px-5 flex-shrink-0"
        style={{ height: 60, borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <button
          className="flex items-center gap-1.5 text-[14px] text-ink-2 hover:text-ink px-2 py-1.5 rounded-md hover:bg-app transition-colors"
          onClick={() => navigate(`/report/${patientId}`)}
        >
          <ArrowLeft size={15} />
          Cancel
        </button>
      </div>

      <div className="max-w-xl mx-auto px-6 py-10">
        <h1 className="text-[22px] font-semibold text-ink mb-6">Edit patient information</h1>

        {error && (
          <div className="error-banner mb-5">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-[2fr_1fr_1.2fr] gap-4 mb-5">
          <div>
            <label className="form-label">Patient name</label>
            <input className="input-field" value={form.name} onChange={(e) => update('name', e.target.value)} autoFocus />
          </div>
          <div>
            <label className="form-label">Age</label>
            <div className="flex gap-1.5">
              <input className="input-field flex-1" type="number" min={0} value={form.age} onChange={(e) => update('age', e.target.value)} />
              <select className="input-field w-[64px] flex-shrink-0 px-1" value={form.age_unit} onChange={(e) => update('age_unit', e.target.value)}>
                <option value="Y">Y</option>
                <option value="M">M</option>
                <option value="D">D</option>
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Gender</label>
            <div className="flex gap-1.5 h-[42px]">
              {[{ v: 'M', l: 'Male' }, { v: 'F', l: 'Female' }].map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => update('gender', v)}
                  className={`flex-1 text-[15px] rounded-lg border transition-colors font-medium ${
                    form.gender === v ? 'bg-accent-soft border-accent-softBorder text-accent-ink' : 'border-border-strong text-ink-2 hover:bg-app'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="form-label">Mobile number</label>
            <input className="input-field" type="tel" placeholder="e.g. 9876543210" value={form.mobile} onChange={(e) => update('mobile', e.target.value)} />
            <p className="text-[12.5px] text-ink-3 mt-1">Needed to send the report over WhatsApp.</p>
          </div>
          <div>
            <label className="form-label">Referred by</label>
            <input className="input-field" placeholder="Doctor name" value={form.referred_by} onChange={(e) => update('referred_by', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="form-label">Address</label>
            <input className="input-field" placeholder="Patient address" value={form.address} onChange={(e) => update('address', e.target.value)} />
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] font-semibold text-ink-2">Selected tests</span>
            <span className="text-[14px] text-ink-2">
              {selectedSections.length === 0 ? 'None selected' : `${selectedSections.length} selected`}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map(({ key, label }) => {
              const active = selectedSections.includes(key)
              return (
                <button
                  key={key}
                  onClick={() => toggleSection(key)}
                  className={`flex items-center gap-1.5 pl-2.5 pr-3.5 py-2 rounded-full text-[14.5px] border transition-colors ${
                    active ? 'bg-accent-soft border-accent-softBorder text-accent-ink font-medium' : 'border-border-strong text-ink-2 hover:bg-app'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${active ? 'bg-accent' : 'border border-border-strong bg-surface'}`}>
                    {active && <Check size={10} className="text-white" />}
                  </span>
                  {label}
                </button>
              )
            })}
          </div>
          <p className="text-[13px] text-ink-3 mt-3">
            Removing a test that already has results won't delete them — it will just stop appearing in entry and the report.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => navigate(`/report/${patientId}`)}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
