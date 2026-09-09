import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Check, AlertCircle, User2, Plus } from 'lucide-react'
import { ALL_SECTIONS, emptyPatientForm, patientToForm, createPatient, updatePatient, listDoctors, type Patient, type Doctor } from './api'

export default function PatientEntry() {
  const navigate = useNavigate()
  const location = useLocation()
  const editing = (location.state as { patient?: Patient })?.patient
  const [form, setForm] = useState(editing ? patientToForm(editing) : emptyPatientForm())
  const [error, setError] = useState('')
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listDoctors().then(setDoctors)
  }, [])

  const toggleSection = (s: string) =>
    setForm((f) => ({ ...f, sections: f.sections.includes(s) ? f.sections.filter((x) => x !== s) : [...f.sections, s] }))

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Please enter the patient\'s name before continuing.'); return }
    if (!form.mobile.trim()) { setError('Please enter the patient\'s mobile number before continuing.'); return }
    if (form.sections.length === 0) { setError('Select at least one test before continuing.'); return }
    if (!form.consentGiven) { setError('Patient consent is required before registering — please confirm with the patient and check the consent box below.'); return }
    setError('')
    setSaving(true)
    const patient = editing ? await updatePatient(editing.id, form) : await createPatient(form)
    navigate(`/report/${patient.id}`, { state: { patient } })
  }

  return (
      <main className="px-10 py-9">
        <button
          onClick={() => navigate('/patients')}
          className="inline-flex items-center gap-1.5 text-[14px] text-[var(--ink-3)] hover:text-[var(--ink)] mb-5"
        >
          <ArrowLeft size={15} />
          Back to patients
        </button>

        <h1 className="text-[24px] font-semibold text-[var(--ink)] mb-1">{editing ? 'Edit Patient' : 'New Patient'}</h1>
        <p className="text-[15px] text-[var(--ink-2)] mb-5">
          {editing ? <>SID <span className="font-mono text-[var(--ink)]">{form.sid}</span></> : 'SID will be assigned once saved'}
        </p>

        {error && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-[14px] mb-5 max-w-2xl" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger-soft-border)' }}>
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 space-y-5 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[14px] font-medium text-[var(--ink)] mb-1.5">Full Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-[15px] border border-[var(--border-strong)] rounded-xl bg-[var(--bg-app)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)] focus:border-[var(--accent)]"
                  placeholder="e.g. Ravi Kumar Sharma"
                />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[var(--ink)] mb-1.5">Age</label>
                <div className="flex gap-2">
                  <input
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-[15px] border border-[var(--border-strong)] rounded-xl bg-[var(--bg-app)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)] focus:border-[var(--accent)]"
                    placeholder="45"
                  />
                  <select
                    value={form.ageUnit}
                    onChange={(e) => setForm({ ...form, ageUnit: e.target.value as typeof form.ageUnit })}
                    className="px-2 py-2.5 text-[15px] border border-[var(--border-strong)] rounded-xl bg-[var(--bg-app)] focus:outline-none"
                  >
                    <option value="Y">Yrs</option>
                    <option value="M">Mos</option>
                    <option value="D">Days</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[var(--ink)] mb-1.5">Gender</label>
                <div className="flex gap-2">
                  {(['M', 'F'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setForm({ ...form, gender: g })}
                      className={`flex-1 py-2.5 rounded-xl text-[15px] font-medium border transition-colors ${
                        form.gender === g ? 'bg-[var(--accent-soft)] border-[var(--accent-soft-border)] text-[var(--accent-ink)]' : 'bg-[var(--bg-app)] border-[var(--border-strong)] text-[var(--ink-2)]'
                      }`}
                    >
                      {g === 'M' ? 'Male' : 'Female'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[14px] font-medium text-[var(--ink)]">Referred By</label>
                  <button
                    type="button"
                    onClick={() => navigate('/doctors/new')}
                    className="inline-flex items-center gap-1 text-[12.5px] text-[var(--accent)] hover:text-[var(--accent-ink)] font-medium"
                  >
                    <Plus size={12} />
                    New doctor
                  </button>
                </div>
                <select
                  value={form.referredBy}
                  onChange={(e) => setForm({ ...form, referredBy: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-[15px] border border-[var(--border-strong)] rounded-xl bg-[var(--bg-app)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)] focus:border-[var(--accent)]"
                >
                  <option value="Self">Self (no referring doctor)</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}{d.specialty ? ` — ${d.specialty}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[var(--ink)] mb-1.5">Mobile</label>
                <input
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-[15px] border border-[var(--border-strong)] rounded-xl bg-[var(--bg-app)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)] focus:border-[var(--accent)]"
                  placeholder="98765 43210"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[14px] font-medium text-[var(--ink)] mb-1.5">Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2.5 text-[15px] border border-[var(--border-strong)] rounded-xl bg-[var(--bg-app)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)] focus:border-[var(--accent)] resize-none"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[var(--ink)] mb-2">Sections to Report</label>
              <div className="flex flex-wrap gap-2">
                {ALL_SECTIONS.map((s) => {
                  const active = form.sections.includes(s)
                  return (
                    <button
                      key={s}
                      onClick={() => toggleSection(s)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13.5px] font-medium border transition-colors ${
                        active ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'bg-[var(--bg-app)] border-[var(--border-strong)] text-[var(--ink-2)]'
                      }`}
                    >
                      {active && <Check size={12} />}
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={form.consentGiven}
                onChange={(e) => setForm({ ...form, consentGiven: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded border-[var(--border-strong)] text-[var(--accent)] focus:ring-[var(--accent-ring-25)] flex-shrink-0"
              />
              <span className="text-[13.5px] text-[var(--ink-2)] leading-snug">
                The patient (or their guardian) has consented to their personal and health data being
                collected and stored for testing, reporting, and billing purposes.
              </span>
            </label>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-5 py-2.5 bg-[var(--accent)] text-white text-[15px] font-medium rounded-2xl hover:bg-[var(--accent-ink)] shadow-sm disabled:opacity-60"
              >
                {saving ? 'Saving…' : editing ? 'Save & Continue' : 'Start Entering Results'}
              </button>
              <button
                onClick={() => navigate('/patients')}
                className="px-5 py-2.5 bg-[var(--surface)] text-[var(--ink)] text-[15px] font-medium border border-[var(--border-strong)] rounded-2xl hover:bg-[var(--bg-hover)]"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Live preview — the card this patient will show up as, filled in as you type */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 shadow-sm sticky top-9">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-4">Preview</h2>
            <div className="w-10 h-10 rounded-full bg-[var(--bg-hover)] flex items-center justify-center mb-3">
              <User2 size={17} className="text-[var(--ink-3)]" />
            </div>
            <div className="text-[16.5px] font-semibold text-[var(--ink)] mb-0.5">{form.name.trim() || 'Unnamed Patient'}</div>
            <div className="text-[13.5px] text-[var(--ink-2)] mb-3.5">
              {form.age || '—'}{form.ageUnit} · {form.gender === 'M' ? 'Male' : 'Female'} · {form.sid || 'SID pending'}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mb-3.5">
              {form.sections.length === 0 ? (
                <span className="text-[13px] text-[var(--ink-3)]">No tests selected yet</span>
              ) : (
                form.sections.map((sec) => (
                  <span key={sec} className="text-[11.5px] px-2 py-1 rounded-full bg-[var(--bg-hover)] text-[var(--ink-2)]">{sec}</span>
                ))
              )}
            </div>
            <div className="pt-3 border-t border-[var(--border-soft)] text-[13px] text-[var(--ink-3)]">
              {form.referredBy === 'Self' ? 'Self-referred' : form.referredBy}
            </div>
          </div>
        </div>
      </main>
  )
}
