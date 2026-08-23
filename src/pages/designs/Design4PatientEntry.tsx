import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutGrid, Users, FileText, Settings, FlaskConical, ArrowLeft, Check } from 'lucide-react'
import DesignSwitcher from './DesignSwitcher'
import { ALL_SECTIONS, emptyPatientForm, patientToForm, type MockPatient } from './mockData'

const navItems = [
  { icon: LayoutGrid, label: 'Dashboard', active: false },
  { icon: Users, label: 'Patients', active: true },
  { icon: FileText, label: 'Reports', active: false },
  { icon: Settings, label: 'Settings', active: false }
]

export default function Design4PatientEntry() {
  const navigate = useNavigate()
  const location = useLocation()
  const editing = (location.state as { patient?: MockPatient })?.patient
  const [form, setForm] = useState(editing ? patientToForm(editing) : emptyPatientForm())

  const toggleSection = (s: string) =>
    setForm((f) => ({ ...f, sections: f.sections.includes(s) ? f.sections.filter((x) => x !== s) : [...f.sections, s] }))

  return (
    <div className="h-screen overflow-y-auto bg-[#0d1117] pt-9 flex text-[#e6edf3]">
      <DesignSwitcher current={4} screen={editing ? `Editing ${editing.name}` : 'New Patient'} />

      <aside className="w-56 flex-shrink-0 bg-[#161b22] border-r border-[#21262d] flex flex-col h-[calc(100vh-36px)] sticky top-9">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-[#21262d]">
          <div className="w-8 h-8 rounded-lg bg-[#1f9d8a] flex items-center justify-center flex-shrink-0">
            <FlaskConical size={16} className="text-[#0d1117]" />
          </div>
          <span className="font-semibold text-[15px]">Sunrise Diagnostics</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14.5px] font-medium cursor-pointer ${
                active ? 'bg-[#1f9d8a]/15 text-[#3ddac4]' : 'text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3]'
              }`}
            >
              <Icon size={17} />
              {label}
            </div>
          ))}
        </nav>
        <div className="px-5 py-4 text-[12px] text-[#6e7681] border-t border-[#21262d]">v1.0 · Offline mode</div>
      </aside>

      <main className="flex-1 px-8 py-8 min-w-0 max-w-3xl">
        <button
          onClick={() => navigate('/designs/4')}
          className="inline-flex items-center gap-1.5 text-[13.5px] text-[#8b949e] hover:text-[#e6edf3] mb-5"
        >
          <ArrowLeft size={14} />
          Back to register
        </button>

        <h1 className="text-[24px] font-semibold text-[#e6edf3] mb-1">{editing ? 'Edit Patient' : 'New Patient'}</h1>
        <p className="text-[14px] text-[#8b949e] mb-6">SID <span className="font-mono text-[#e6edf3]">{form.sid}</span></p>

        <div className="bg-[#161b22] rounded-xl border border-[#21262d] p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[13px] font-semibold text-[#8b949e] uppercase tracking-wide mb-1.5">Full Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 text-[14.5px] border border-[#30363d] rounded-lg bg-[#0d1117] text-[#e6edf3] focus:outline-none focus:ring-2 focus:ring-[#1f9d8a]/25 focus:border-[#1f9d8a]"
                placeholder="e.g. Ravi Kumar Sharma"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#8b949e] uppercase tracking-wide mb-1.5">Age</label>
              <div className="flex gap-2">
                <input
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-[14.5px] border border-[#30363d] rounded-lg bg-[#0d1117] text-[#e6edf3] focus:outline-none focus:ring-2 focus:ring-[#1f9d8a]/25 focus:border-[#1f9d8a]"
                  placeholder="45"
                />
                <select
                  value={form.ageUnit}
                  onChange={(e) => setForm({ ...form, ageUnit: e.target.value as typeof form.ageUnit })}
                  className="px-2 py-2.5 text-[14.5px] border border-[#30363d] rounded-lg bg-[#0d1117] text-[#e6edf3] focus:outline-none"
                >
                  <option value="Y">Yrs</option>
                  <option value="M">Mos</option>
                  <option value="D">Days</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#8b949e] uppercase tracking-wide mb-1.5">Gender</label>
              <div className="flex gap-2">
                {(['M', 'F'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setForm({ ...form, gender: g })}
                    className={`flex-1 py-2.5 rounded-lg text-[14.5px] font-medium border transition-colors ${
                      form.gender === g ? 'bg-[#1f9d8a]/15 border-[#1f9d8a]/40 text-[#3ddac4]' : 'bg-[#0d1117] border-[#30363d] text-[#8b949e]'
                    }`}
                  >
                    {g === 'M' ? 'Male' : 'Female'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#8b949e] uppercase tracking-wide mb-1.5">Referred By</label>
              <input
                value={form.referredBy}
                onChange={(e) => setForm({ ...form, referredBy: e.target.value })}
                className="w-full px-3.5 py-2.5 text-[14.5px] border border-[#30363d] rounded-lg bg-[#0d1117] text-[#e6edf3] focus:outline-none focus:ring-2 focus:ring-[#1f9d8a]/25 focus:border-[#1f9d8a]"
                placeholder="Dr. A. Mehta"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#8b949e] uppercase tracking-wide mb-1.5">Mobile</label>
              <input
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                className="w-full px-3.5 py-2.5 text-[14.5px] border border-[#30363d] rounded-lg bg-[#0d1117] text-[#e6edf3] focus:outline-none focus:ring-2 focus:ring-[#1f9d8a]/25 focus:border-[#1f9d8a]"
                placeholder="98765 43210"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[13px] font-semibold text-[#8b949e] uppercase tracking-wide mb-1.5">Address</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={2}
                className="w-full px-3.5 py-2.5 text-[14.5px] border border-[#30363d] rounded-lg bg-[#0d1117] text-[#e6edf3] focus:outline-none focus:ring-2 focus:ring-[#1f9d8a]/25 focus:border-[#1f9d8a] resize-none"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#8b949e] uppercase tracking-wide mb-2">Sections to Report</label>
            <div className="flex flex-wrap gap-2">
              {ALL_SECTIONS.map((s) => {
                const active = form.sections.includes(s)
                return (
                  <button
                    key={s}
                    onClick={() => toggleSection(s)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors ${
                      active ? 'bg-[#1f9d8a] border-[#1f9d8a] text-[#0d1117]' : 'bg-[#0d1117] border-[#30363d] text-[#8b949e]'
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
              onClick={() => navigate('/designs/4')}
              className="px-4 py-2.5 bg-[#1f9d8a] text-[#0d1117] text-[14.5px] font-semibold rounded-lg hover:bg-[#3ddac4]"
            >
              {editing ? 'Save Changes' : 'Register Patient'}
            </button>
            <button
              onClick={() => navigate('/designs/4')}
              className="px-4 py-2.5 bg-[#0d1117] text-[#e6edf3] text-[14.5px] font-medium border border-[#30363d] rounded-lg hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
