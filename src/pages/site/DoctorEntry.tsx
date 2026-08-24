import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, Stethoscope, Phone } from 'lucide-react'
import { createDoctor } from './api'

export default function DoctorEntry() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', specialty: '', phone: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Please enter the doctor's name before continuing."); return }
    setError('')
    setSaving(true)
    await createDoctor({ name: form.name.trim(), specialty: form.specialty.trim() || 'General Physician', phone: form.phone.trim() })
    navigate('/doctors')
  }

  return (
      <main className="px-10 py-9">
        <button
          onClick={() => navigate('/doctors')}
          className="inline-flex items-center gap-1.5 text-[14px] text-[#8593a3] hover:text-[#1a2430] mb-5"
        >
          <ArrowLeft size={15} />
          Back to doctors
        </button>

        <h1 className="text-[24px] font-semibold text-[#1a2430] mb-1">New Doctor</h1>
        <p className="text-[15px] text-[#57677a] mb-5">Add a referring doctor so their patients and incentive report can be tracked.</p>

        {error && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-[14px] mb-5 max-w-2xl" style={{ background: '#fceae8', color: '#c23b33', border: '1px solid #f0c9c5' }}>
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          <div className="bg-white rounded-2xl border border-[#e1e6ec] p-6 space-y-4 shadow-sm">
            <div>
              <label className="block text-[14px] font-medium text-[#1a2430] mb-1.5">Full Name</label>
              <input
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className="w-full px-3.5 py-2.5 text-[15px] border border-[#c7cfd9] rounded-xl bg-[#f5f7fa] focus:outline-none focus:ring-2 focus:ring-[#1b6fae]/25 focus:border-[#1b6fae]"
                placeholder="e.g. Dr. R. Kapoor"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#1a2430] mb-1.5">Specialty</label>
              <input
                value={form.specialty}
                onChange={(e) => update('specialty', e.target.value)}
                className="w-full px-3.5 py-2.5 text-[15px] border border-[#c7cfd9] rounded-xl bg-[#f5f7fa] focus:outline-none focus:ring-2 focus:ring-[#1b6fae]/25 focus:border-[#1b6fae]"
                placeholder="e.g. Cardiology"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#1a2430] mb-1.5">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                className="w-full px-3.5 py-2.5 text-[15px] border border-[#c7cfd9] rounded-xl bg-[#f5f7fa] focus:outline-none focus:ring-2 focus:ring-[#1b6fae]/25 focus:border-[#1b6fae]"
                placeholder="98765 43210"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-5 py-2.5 bg-[#1b6fae] text-white text-[15px] font-medium rounded-2xl hover:bg-[#125483] shadow-sm disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Add Doctor'}
              </button>
              <button
                onClick={() => navigate('/doctors')}
                className="px-5 py-2.5 bg-white text-[#1a2430] text-[15px] font-medium border border-[#c7cfd9] rounded-2xl hover:bg-[#eef2f6]"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Live preview — the card this doctor will show up as on the Doctors page */}
          <div className="bg-white rounded-2xl border border-[#e1e6ec] p-5 shadow-sm sticky top-9">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#8593a3] mb-4">Preview</h2>
            <div className="w-10 h-10 rounded-full bg-[#eef2f6] flex items-center justify-center mb-3">
              <Stethoscope size={17} className="text-[#8593a3]" />
            </div>
            <div className="text-[16.5px] font-semibold text-[#1a2430] mb-0.5">{form.name.trim() || 'Unnamed Doctor'}</div>
            <div className="text-[13.5px] text-[#57677a] mb-3.5">{form.specialty.trim() || 'General Physician'}</div>
            {form.phone.trim() && (
              <div className="flex items-center gap-1.5 text-[13px] text-[#8593a3]">
                <Phone size={12} />
                {form.phone.trim()}
              </div>
            )}
          </div>
        </div>
      </main>
  )
}
