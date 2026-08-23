import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutGrid, Users, FileText, Settings, FlaskConical, ArrowLeft, Check } from 'lucide-react'
import DesignSwitcher from './DesignSwitcher'
import { ALL_SECTIONS, emptyPatientForm, patientToForm, formToPatient, type MockPatient } from './mockData'

const navItems = [
  { icon: LayoutGrid, label: 'Dashboard', active: false },
  { icon: Users, label: 'Patients', active: true },
  { icon: FileText, label: 'Reports', active: false },
  { icon: Settings, label: 'Settings', active: false }
]

export default function Design2PatientEntry() {
  const navigate = useNavigate()
  const location = useLocation()
  const editing = (location.state as { patient?: MockPatient })?.patient
  const [form, setForm] = useState(editing ? patientToForm(editing) : emptyPatientForm())

  const toggleSection = (s: string) =>
    setForm((f) => ({ ...f, sections: f.sections.includes(s) ? f.sections.filter((x) => x !== s) : [...f.sections, s] }))

  const handleSave = () => {
    const patient = formToPatient(form, editing)
    navigate('/designs/2/report', { state: { patient } })
  }

  return (
    <div className="h-screen overflow-y-auto bg-[#f1f4f8] pt-9 flex">
      <DesignSwitcher current={2} screen={editing ? `Editing ${editing.name}` : 'New Patient'} />

      <aside className="w-56 flex-shrink-0 bg-[#12233d] text-white flex flex-col h-[calc(100vh-36px)] sticky top-9">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-[#1f5fa8] flex items-center justify-center flex-shrink-0">
            <FlaskConical size={16} />
          </div>
          <span className="font-semibold text-[15px]">Sunrise Diagnostics</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14.5px] font-medium cursor-pointer ${
                active ? 'bg-[#1f5fa8] text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={17} />
              {label}
            </div>
          ))}
        </nav>
        <div className="px-5 py-4 text-[12px] text-white/40 border-t border-white/10">v1.0 · Offline mode</div>
      </aside>

      <main className="flex-1 px-8 py-8 min-w-0 max-w-3xl">
        <button
          onClick={() => navigate('/designs/2')}
          className="inline-flex items-center gap-1.5 text-[13.5px] text-[#5c6b80] hover:text-[#0f1b2d] mb-5"
        >
          <ArrowLeft size={14} />
          Back to register
        </button>

        <h1 className="text-[24px] font-semibold text-[#0f1b2d] mb-1">{editing ? 'Edit Patient' : 'New Patient'}</h1>
        <p className="text-[14px] text-[#5c6b80] mb-6">SID <span className="font-mono text-[#0f1b2d]">{form.sid}</span></p>

        <div className="bg-white rounded-xl border border-[#dbe2ea] p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[13px] font-semibold text-[#5c6b80] uppercase tracking-wide mb-1.5">Full Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 text-[14.5px] border border-[#dbe2ea] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1f5fa8]/25 focus:border-[#1f5fa8]"
                placeholder="e.g. Ravi Kumar Sharma"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#5c6b80] uppercase tracking-wide mb-1.5">Age</label>
              <div className="flex gap-2">
                <input
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-[14.5px] border border-[#dbe2ea] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1f5fa8]/25 focus:border-[#1f5fa8]"
                  placeholder="45"
                />
                <select
                  value={form.ageUnit}
                  onChange={(e) => setForm({ ...form, ageUnit: e.target.value as typeof form.ageUnit })}
                  className="px-2 py-2.5 text-[14.5px] border border-[#dbe2ea] rounded-lg bg-white focus:outline-none"
                >
                  <option value="Y">Yrs</option>
                  <option value="M">Mos</option>
                  <option value="D">Days</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#5c6b80] uppercase tracking-wide mb-1.5">Gender</label>
              <div className="flex gap-2">
                {(['M', 'F'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setForm({ ...form, gender: g })}
                    className={`flex-1 py-2.5 rounded-lg text-[14.5px] font-medium border transition-colors ${
                      form.gender === g ? 'bg-[#e9f1fa] border-[#b8d3ee] text-[#1f5fa8]' : 'bg-white border-[#dbe2ea] text-[#5c6b80]'
                    }`}
                  >
                    {g === 'M' ? 'Male' : 'Female'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#5c6b80] uppercase tracking-wide mb-1.5">Referred By</label>
              <input
                value={form.referredBy}
                onChange={(e) => setForm({ ...form, referredBy: e.target.value })}
                className="w-full px-3.5 py-2.5 text-[14.5px] border border-[#dbe2ea] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1f5fa8]/25 focus:border-[#1f5fa8]"
                placeholder="Dr. A. Mehta"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#5c6b80] uppercase tracking-wide mb-1.5">Mobile</label>
              <input
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                className="w-full px-3.5 py-2.5 text-[14.5px] border border-[#dbe2ea] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1f5fa8]/25 focus:border-[#1f5fa8]"
                placeholder="98765 43210"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[13px] font-semibold text-[#5c6b80] uppercase tracking-wide mb-1.5">Address</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={2}
                className="w-full px-3.5 py-2.5 text-[14.5px] border border-[#dbe2ea] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1f5fa8]/25 focus:border-[#1f5fa8] resize-none"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#5c6b80] uppercase tracking-wide mb-2">Sections to Report</label>
            <div className="flex flex-wrap gap-2">
              {ALL_SECTIONS.map((s) => {
                const active = form.sections.includes(s)
                return (
                  <button
                    key={s}
                    onClick={() => toggleSection(s)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors ${
                      active ? 'bg-[#1f5fa8] border-[#1f5fa8] text-white' : 'bg-white border-[#dbe2ea] text-[#5c6b80]'
                    }`}
                  >
                    {active && <Check size={12} />}
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              className="px-4 py-2.5 bg-[#1f5fa8] text-white text-[14.5px] font-medium rounded-lg hover:bg-[#184a85]"
            >
              {editing ? 'Save Changes' : 'Register Patient'}
            </button>
            <button
              onClick={() => navigate('/designs/2')}
              className="px-4 py-2.5 bg-white text-[#0f1b2d] text-[14.5px] font-medium border border-[#dbe2ea] rounded-lg hover:bg-[#f6f9fc]"
            >
              Cancel
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
