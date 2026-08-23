import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FlaskConical, Settings, ArrowLeft, Check } from 'lucide-react'
import DesignSwitcher from './DesignSwitcher'
import { ALL_SECTIONS, emptyPatientForm, patientToForm, type MockPatient } from './mockData'

export default function Design1PatientEntry() {
  const navigate = useNavigate()
  const location = useLocation()
  const editing = (location.state as { patient?: MockPatient })?.patient
  const [form, setForm] = useState(editing ? patientToForm(editing) : emptyPatientForm())

  const toggleSection = (s: string) =>
    setForm((f) => ({ ...f, sections: f.sections.includes(s) ? f.sections.filter((x) => x !== s) : [...f.sections, s] }))

  return (
    <div className="h-screen overflow-y-auto bg-[#f6f7f7] pt-9">
      <DesignSwitcher current={1} screen={editing ? `Editing ${editing.name}` : 'New Patient'} />

      <header className="flex items-center gap-4 pl-6 pr-6 h-[76px] border-b border-[#e2e5e6] bg-white">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#2c7a73] flex items-center justify-center">
            <FlaskConical size={24} className="text-white" />
          </div>
          <div className="leading-snug">
            <div className="text-[21px] font-semibold text-[#1a2023]">Sunrise Diagnostics</div>
            <div className="text-[13.5px] text-[#5c6569]">Laboratory Reporting System</div>
          </div>
        </div>
        <div className="flex-1" />
        <button className="p-2.5 rounded-lg hover:bg-[#f6f7f7]">
          <Settings size={19} className="text-[#5c6569]" />
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-10 pb-16">
        <button
          onClick={() => navigate('/designs/1')}
          className="inline-flex items-center gap-1.5 text-[14px] text-[#5c6569] hover:text-[#1a2023] mb-6"
        >
          <ArrowLeft size={15} />
          Back to register
        </button>

        <h1 className="text-[24px] font-semibold text-[#1a2023] mb-1">{editing ? 'Edit Patient' : 'New Patient'}</h1>
        <p className="text-[14.5px] text-[#5c6569] mb-7">SID <span className="font-mono text-[#1a2023]">{form.sid}</span> will be assigned to this registration.</p>

        <div className="bg-white rounded-2xl border border-[#e2e5e6] p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[13.5px] font-medium text-[#1a2023] mb-1.5">Full Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 text-[15px] border border-[#cbd1d3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2c7a73]/25 focus:border-[#2c7a73]"
                placeholder="e.g. Ravi Kumar Sharma"
              />
            </div>
            <div>
              <label className="block text-[13.5px] font-medium text-[#1a2023] mb-1.5">Age</label>
              <div className="flex gap-2">
                <input
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-[15px] border border-[#cbd1d3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2c7a73]/25 focus:border-[#2c7a73]"
                  placeholder="45"
                />
                <select
                  value={form.ageUnit}
                  onChange={(e) => setForm({ ...form, ageUnit: e.target.value as typeof form.ageUnit })}
                  className="px-2 py-2.5 text-[15px] border border-[#cbd1d3] rounded-lg bg-white focus:outline-none"
                >
                  <option value="Y">Yrs</option>
                  <option value="M">Mos</option>
                  <option value="D">Days</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[13.5px] font-medium text-[#1a2023] mb-1.5">Gender</label>
              <div className="flex gap-2">
                {(['M', 'F'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setForm({ ...form, gender: g })}
                    className={`flex-1 py-2.5 rounded-lg text-[15px] font-medium border transition-colors ${
                      form.gender === g
                        ? 'bg-[#e6f2f0] border-[#bfe0db] text-[#1f5a55]'
                        : 'bg-white border-[#cbd1d3] text-[#5c6569]'
                    }`}
                  >
                    {g === 'M' ? 'Male' : 'Female'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[13.5px] font-medium text-[#1a2023] mb-1.5">Referred By</label>
              <input
                value={form.referredBy}
                onChange={(e) => setForm({ ...form, referredBy: e.target.value })}
                className="w-full px-3.5 py-2.5 text-[15px] border border-[#cbd1d3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2c7a73]/25 focus:border-[#2c7a73]"
                placeholder="Dr. A. Mehta"
              />
            </div>
            <div>
              <label className="block text-[13.5px] font-medium text-[#1a2023] mb-1.5">Mobile</label>
              <input
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                className="w-full px-3.5 py-2.5 text-[15px] border border-[#cbd1d3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2c7a73]/25 focus:border-[#2c7a73]"
                placeholder="98765 43210"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[13.5px] font-medium text-[#1a2023] mb-1.5">Address</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={2}
                className="w-full px-3.5 py-2.5 text-[15px] border border-[#cbd1d3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2c7a73]/25 focus:border-[#2c7a73] resize-none"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13.5px] font-medium text-[#1a2023] mb-2">Sections to Report</label>
            <div className="flex flex-wrap gap-2">
              {ALL_SECTIONS.map((s) => {
                const active = form.sections.includes(s)
                return (
                  <button
                    key={s}
                    onClick={() => toggleSection(s)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13.5px] font-medium border transition-colors ${
                      active ? 'bg-[#2c7a73] border-[#2c7a73] text-white' : 'bg-white border-[#cbd1d3] text-[#5c6569]'
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
              onClick={() => navigate('/designs/1')}
              className="px-4 py-2.5 bg-[#2c7a73] text-white text-[15px] font-medium rounded-lg hover:bg-[#1f5a55]"
            >
              {editing ? 'Save Changes' : 'Register Patient'}
            </button>
            <button
              onClick={() => navigate('/designs/1')}
              className="px-4 py-2.5 bg-white text-[#1a2023] text-[15px] font-medium border border-[#cbd1d3] rounded-lg hover:bg-[#f6f7f7]"
            >
              Cancel
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
