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
          className="inline-flex items-center gap-1.5 text-[14px] text-[#8593a3] hover:text-[#1a2430] mb-5"
        >
          <ArrowLeft size={15} />
          Back to patients
        </button>

        <h1 className="text-[24px] font-semibold text-[#1a2430] mb-1">{editing ? 'Edit Patient' : 'New Patient'}</h1>
        <p className="text-[15px] text-[#57677a] mb-5">
          {editing ? <>SID <span className="font-mono text-[#1a2430]">{form.sid}</span></> : 'SID will be assigned once saved'}
        </p>

        {error && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-[14px] mb-5 max-w-2xl" style={{ background: '#fceae8', color: '#c23b33', border: '1px solid #f0c9c5' }}>
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          <div className="bg-white rounded-2xl border border-[#e1e6ec] p-6 space-y-5 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[14px] font-medium text-[#1a2430] mb-1.5">Full Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-[15px] border border-[#c7cfd9] rounded-xl bg-[#f5f7fa] focus:outline-none focus:ring-2 focus:ring-[#1b6fae]/25 focus:border-[#1b6fae]"
                  placeholder="e.g. Ravi Kumar Sharma"
                />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#1a2430] mb-1.5">Age</label>
                <div className="flex gap-2">
                  <input
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-[15px] border border-[#c7cfd9] rounded-xl bg-[#f5f7fa] focus:outline-none focus:ring-2 focus:ring-[#1b6fae]/25 focus:border-[#1b6fae]"
                    placeholder="45"
                  />
                  <select
                    value={form.ageUnit}
                    onChange={(e) => setForm({ ...form, ageUnit: e.target.value as typeof form.ageUnit })}
                    className="px-2 py-2.5 text-[15px] border border-[#c7cfd9] rounded-xl bg-[#f5f7fa] focus:outline-none"
                  >
                    <option value="Y">Yrs</option>
                    <option value="M">Mos</option>
                    <option value="D">Days</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#1a2430] mb-1.5">Gender</label>
                <div className="flex gap-2">
                  {(['M', 'F'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setForm({ ...form, gender: g })}
                      className={`flex-1 py-2.5 rounded-xl text-[15px] font-medium border transition-colors ${
                        form.gender === g ? 'bg-[#e8f1f9] border-[#bfdcf0] text-[#125483]' : 'bg-[#f5f7fa] border-[#c7cfd9] text-[#57677a]'
                      }`}
                    >
                      {g === 'M' ? 'Male' : 'Female'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[14px] font-medium text-[#1a2430]">Referred By</label>
                  <button
                    type="button"
                    onClick={() => navigate('/doctors/new')}
                    className="inline-flex items-center gap-1 text-[12.5px] text-[#1b6fae] hover:text-[#125483] font-medium"
                  >
                    <Plus size={12} />
                    New doctor
                  </button>
                </div>
                <select
                  value={form.referredBy}
                  onChange={(e) => setForm({ ...form, referredBy: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-[15px] border border-[#c7cfd9] rounded-xl bg-[#f5f7fa] focus:outline-none focus:ring-2 focus:ring-[#1b6fae]/25 focus:border-[#1b6fae]"
                >
                  <option value="Self">Self (no referring doctor)</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}{d.specialty ? ` — ${d.specialty}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#1a2430] mb-1.5">Mobile</label>
                <input
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-[15px] border border-[#c7cfd9] rounded-xl bg-[#f5f7fa] focus:outline-none focus:ring-2 focus:ring-[#1b6fae]/25 focus:border-[#1b6fae]"
                  placeholder="98765 43210"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[14px] font-medium text-[#1a2430] mb-1.5">Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2.5 text-[15px] border border-[#c7cfd9] rounded-xl bg-[#f5f7fa] focus:outline-none focus:ring-2 focus:ring-[#1b6fae]/25 focus:border-[#1b6fae] resize-none"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#1a2430] mb-2">Sections to Report</label>
              <div className="flex flex-wrap gap-2">
                {ALL_SECTIONS.map((s) => {
                  const active = form.sections.includes(s)
                  return (
                    <button
                      key={s}
                      onClick={() => toggleSection(s)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13.5px] font-medium border transition-colors ${
                        active ? 'bg-[#1b6fae] border-[#1b6fae] text-white' : 'bg-[#f5f7fa] border-[#c7cfd9] text-[#57677a]'
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
                className="mt-0.5 w-4 h-4 rounded border-[#c7cfd9] text-[#1b6fae] focus:ring-[#1b6fae]/25 flex-shrink-0"
              />
              <span className="text-[13.5px] text-[#57677a] leading-snug">
                The patient (or their guardian) has consented to their personal and health data being
                collected and stored for testing, reporting, and billing purposes.
              </span>
            </label>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-5 py-2.5 bg-[#1b6fae] text-white text-[15px] font-medium rounded-2xl hover:bg-[#125483] shadow-sm disabled:opacity-60"
              >
                {saving ? 'Saving…' : editing ? 'Save & Continue' : 'Start Entering Results'}
              </button>
              <button
                onClick={() => navigate('/patients')}
                className="px-5 py-2.5 bg-white text-[#1a2430] text-[15px] font-medium border border-[#c7cfd9] rounded-2xl hover:bg-[#eef2f6]"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Live preview — the card this patient will show up as, filled in as you type */}
          <div className="bg-white rounded-2xl border border-[#e1e6ec] p-5 shadow-sm sticky top-9">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#8593a3] mb-4">Preview</h2>
            <div className="w-10 h-10 rounded-full bg-[#eef2f6] flex items-center justify-center mb-3">
              <User2 size={17} className="text-[#8593a3]" />
            </div>
            <div className="text-[16.5px] font-semibold text-[#1a2430] mb-0.5">{form.name.trim() || 'Unnamed Patient'}</div>
            <div className="text-[13.5px] text-[#57677a] mb-3.5">
              {form.age || '—'}{form.ageUnit} · {form.gender === 'M' ? 'Male' : 'Female'} · {form.sid || 'SID pending'}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mb-3.5">
              {form.sections.length === 0 ? (
                <span className="text-[13px] text-[#8593a3]">No tests selected yet</span>
              ) : (
                form.sections.map((sec) => (
                  <span key={sec} className="text-[11.5px] px-2 py-1 rounded-full bg-[#eef2f6] text-[#57677a]">{sec}</span>
                ))
              )}
            </div>
            <div className="pt-3 border-t border-[#eaeef2] text-[13px] text-[#8593a3]">
              {form.referredBy === 'Self' ? 'Self-referred' : form.referredBy}
            </div>
          </div>
        </div>
      </main>
  )
}
