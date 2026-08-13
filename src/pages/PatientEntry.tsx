import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Check, ChevronRight } from 'lucide-react'
import { SECTIONS } from '../types/lab'
import { todayDate, todayTime } from '../lib/utils'

export default function PatientEntry() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showContact, setShowContact] = useState(false)

  const [form, setForm] = useState({
    name: '',
    age: '',
    age_unit: 'Y',
    gender: 'M',
    mobile: '',
    referred_by: '',
    address: ''
  })

  const [selectedSections, setSelectedSections] = useState<string[]>([])

  const toggleSection = (key: string) => {
    setSelectedSections((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    )
  }

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Please enter the patient\'s name before continuing.')
      return
    }
    if (!form.mobile.trim()) {
      setError('Please enter the patient\'s mobile number before continuing.')
      return
    }
    if (selectedSections.length === 0) {
      setError('Select at least one test before continuing.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const now = { reg_date: todayDate(), reg_time: todayTime() }
      const result = await window.api.patients.create({
        ...form,
        age: parseInt(form.age) || 0,
        sid: '',
        ...now,
        rpt_date: now.reg_date,
        rpt_time: now.reg_time,
        sections: selectedSections
      } as any)
      navigate(`/report/${result.id}`)
    } catch (e) {
      setError('We couldn\'t register this patient. Please try again.')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto px-6 py-10">
        <h1 className="text-[22px] font-semibold text-ink mb-6">New patient</h1>

        {error && (
          <div className="error-banner mb-5">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Patient information */}
        <div className="grid grid-cols-[2fr_1fr_1.2fr] gap-4 mb-4">
          <div>
            <label className="form-label">Patient name</label>
            <input
              className="input-field"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="form-label">Age</label>
            <div className="flex gap-1.5">
              <input
                className="input-field flex-1"
                type="number"
                placeholder="0"
                min={0}
                value={form.age}
                onChange={(e) => update('age', e.target.value)}
              />
              <select
                className="input-field w-[68px] flex-shrink-0 px-1"
                value={form.age_unit}
                onChange={(e) => update('age_unit', e.target.value)}
              >
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
                    form.gender === v
                      ? 'bg-accent-soft border-accent-softBorder text-accent-ink'
                      : 'border-border-strong text-ink-2 hover:bg-app'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-2">
          <div>
            <label className="form-label">Mobile number <span className="text-danger">*</span></label>
            <input
              className="input-field"
              placeholder="e.g. 9876543210"
              type="tel"
              value={form.mobile}
              onChange={(e) => update('mobile', e.target.value)}
            />
            <p className="text-[12.5px] text-ink-3 mt-1">Needed to send the report over WhatsApp.</p>
          </div>
          <div>
            <label className="form-label">Referred by</label>
            <input
              className="input-field"
              placeholder="Doctor name (optional)"
              value={form.referred_by}
              onChange={(e) => update('referred_by', e.target.value)}
            />
          </div>
        </div>

        {/* Address — collapsed by default, genuinely optional */}
        <button
          className="flex items-center gap-1.5 text-[14px] font-medium text-accent-ink py-2 mb-1"
          onClick={() => setShowContact((s) => !s)}
        >
          <ChevronRight size={14} className="transition-transform" style={{ transform: showContact ? 'rotate(90deg)' : 'none' }} />
          Add address
        </button>
        {showContact && (
          <div className="mb-4 pt-1">
            <label className="form-label">Address</label>
            <input
              className="input-field"
              placeholder="Patient address"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
            />
          </div>
        )}

        {/* Test selection */}
        <div className="mt-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] font-semibold text-ink-2">Select tests</span>
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
                    active
                      ? 'bg-accent-soft border-accent-softBorder text-accent-ink font-medium'
                      : 'border-border-strong text-ink-2 hover:bg-app'
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
        </div>

        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => navigate('/')}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Starting…' : 'Start entering results'}
          </button>
        </div>
      </div>
    </div>
  )
}
