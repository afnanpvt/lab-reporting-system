import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, Stethoscope, Phone } from 'lucide-react'
import { createDoctor, updateDoctor, type Doctor } from './api'
import { useGuardedNavigate, useLeaveGuard } from './leaveGuard'

export default function DoctorEntry() {
  const navigate = useNavigate()
  const location = useLocation()
  const editing = (location.state as { doctor?: Doctor })?.doctor
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    qualifications: editing?.qualifications ?? '',
    specialty: editing?.specialty ?? '',
    phone: editing?.phone ?? ''
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const initialForm = useRef(JSON.stringify(form))
  const guardedNavigate = useGuardedNavigate()

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  // `goToList` is false when saving from the unsaved-changes dialog, which carries on to wherever the user was heading.
  const save = async (goToList: boolean): Promise<boolean> => {
    if (!form.name.trim()) { setError("Please enter the doctor's name before continuing."); return false }
    setError('')
    setSaving(true)
    const data = { name: form.name.trim(), qualifications: form.qualifications.trim(), specialty: form.specialty.trim() || 'General Physician', phone: form.phone.trim() }
    if (editing) await updateDoctor(editing.id, data)
    else await createDoctor(data)
    if (goToList) navigate('/doctors')
    return true
  }
  const handleSubmit = () => save(true)

  // Leaving with unsaved edits (Back, Cancel or the sidebar) offers Save / Discard / Keep editing.
  useLeaveGuard(JSON.stringify(form) !== initialForm.current && !saving, () => save(false), { what: 'this doctor' })

  return (
      <main className="px-10 py-9">
        <button
          onClick={() => guardedNavigate('/doctors')}
          className="inline-flex items-center gap-1.5 text-[14px] text-[var(--ink-3)] hover:text-[var(--ink)] mb-5"
        >
          <ArrowLeft size={15} />
          Back to doctors
        </button>

        <h1 className="text-[24px] font-semibold text-[var(--ink)] mb-1">{editing ? 'Edit Doctor' : 'New Doctor'}</h1>
        <p className="text-[15px] text-[var(--ink-2)] mb-5">
          {editing ? "Update this referring doctor's details." : 'Add a referring doctor so their patients and incentive report can be tracked.'}
        </p>

        {error && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-[14px] mb-5 max-w-2xl" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger-soft-border)' }}>
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 space-y-4 shadow-sm">
            <div>
              <label className="block text-[14px] font-medium text-[var(--ink)] mb-1.5">Full Name</label>
              <input
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className="w-full px-3.5 py-2.5 text-[15px] border border-[var(--border-strong)] rounded-xl bg-[var(--bg-app)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)] focus:border-[var(--accent)]"
                placeholder="e.g. Dr. R. Kapoor"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[var(--ink)] mb-1.5">Qualifications</label>
              <input
                value={form.qualifications}
                onChange={(e) => update('qualifications', e.target.value)}
                className="w-full px-3.5 py-2.5 text-[15px] border border-[var(--border-strong)] rounded-xl bg-[var(--bg-app)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)] focus:border-[var(--accent)]"
                placeholder="e.g. MBBS, MD (General Medicine)"
              />
              <p className="text-[12.5px] text-[var(--ink-3)] mt-1.5">Shown beside the name, and printed with “Referred by” on reports.</p>
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[var(--ink)] mb-1.5">Specialty</label>
              <input
                value={form.specialty}
                onChange={(e) => update('specialty', e.target.value)}
                className="w-full px-3.5 py-2.5 text-[15px] border border-[var(--border-strong)] rounded-xl bg-[var(--bg-app)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)] focus:border-[var(--accent)]"
                placeholder="e.g. Cardiology"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[var(--ink)] mb-1.5">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                className="w-full px-3.5 py-2.5 text-[15px] border border-[var(--border-strong)] rounded-xl bg-[var(--bg-app)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)] focus:border-[var(--accent)]"
                placeholder="98765 43210"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-5 py-2.5 bg-[var(--accent)] text-white text-[15px] font-medium rounded-2xl hover:bg-[var(--accent-ink)] shadow-sm disabled:opacity-60"
              >
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Doctor'}
              </button>
              <button
                onClick={() => guardedNavigate('/doctors')}
                className="px-5 py-2.5 bg-[var(--surface)] text-[var(--ink)] text-[15px] font-medium border border-[var(--border-strong)] rounded-2xl hover:bg-[var(--bg-hover)]"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Live preview — the card this doctor will show up as on the Doctors page */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 shadow-sm sticky top-9">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-4">Preview</h2>
            <div className="w-10 h-10 rounded-full bg-[var(--bg-hover)] flex items-center justify-center mb-3">
              <Stethoscope size={17} className="text-[var(--ink-3)]" />
            </div>
            <div className="text-[16.5px] font-semibold text-[var(--ink)] mb-0.5">{form.name.trim() || 'Unnamed Doctor'}</div>
            {form.qualifications.trim() && <div className="text-[13px] text-[var(--ink-3)] mb-0.5">{form.qualifications.trim()}</div>}
            <div className="text-[13.5px] text-[var(--ink-2)] mb-3.5">{form.specialty.trim() || 'General Physician'}</div>
            {form.phone.trim() && (
              <div className="flex items-center gap-1.5 text-[13px] text-[var(--ink-3)]">
                <Phone size={12} />
                {form.phone.trim()}
              </div>
            )}
          </div>
        </div>
      </main>
  )
}
