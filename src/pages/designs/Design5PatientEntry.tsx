import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FlaskConical, ArrowLeft, Check } from 'lucide-react'
import DesignSwitcher from './DesignSwitcher'
import { ALL_SECTIONS, emptyPatientForm, patientToForm, formToPatient, type MockPatient } from './mockData'

export default function Design5PatientEntry() {
  const navigate = useNavigate()
  const location = useLocation()
  const editing = (location.state as { patient?: MockPatient })?.patient
  const [form, setForm] = useState(editing ? patientToForm(editing) : emptyPatientForm())

  const toggleSection = (s: string) =>
    setForm((f) => ({ ...f, sections: f.sections.includes(s) ? f.sections.filter((x) => x !== s) : [...f.sections, s] }))

  const handleSave = () => {
    const patient = formToPatient(form, editing)
    navigate('/designs/5/report', { state: { patient } })
  }

  return (
    <div className="h-screen overflow-y-auto bg-white pt-9 text-[13.5px]">
      <DesignSwitcher current={5} screen={editing ? `Editing ${editing.name}` : 'New Patient'} />

      <header className="flex items-center gap-3 px-4 h-11 border-b border-[#e2e5e6]">
        <FlaskConical size={15} className="text-[#2c7a73] flex-shrink-0" />
        <span className="font-semibold text-[#1a2023]">Sunrise Diagnostics</span>
        <span className="text-[#8a9094]">— {editing ? 'Edit Patient' : 'New Patient'}</span>
        <div className="flex-1" />
        <button onClick={() => navigate('/designs/5')} className="inline-flex items-center gap-1 text-[#5c6569] hover:text-[#1a2023]">
          <ArrowLeft size={13} />
          Back (Esc)
        </button>
      </header>

      <div className="max-w-xl px-4 py-4">
        <div className="text-[12px] text-[#8a9094] mb-3">
          SID <span className="font-mono text-[#1a2023]">{form.sid}</span>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2 items-end">
            <div className="col-span-2">
              <label className="block text-[11.5px] font-medium text-[#5c6569] mb-1">Full Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-2 py-1.5 border border-[#cbd1d3] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#2c7a73]"
                placeholder="Ravi Kumar Sharma"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-[#5c6569] mb-1">Age</label>
              <div className="flex gap-1">
                <input
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  className="w-full px-2 py-1.5 border border-[#cbd1d3] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#2c7a73]"
                  placeholder="45"
                />
                <select
                  value={form.ageUnit}
                  onChange={(e) => setForm({ ...form, ageUnit: e.target.value as typeof form.ageUnit })}
                  className="px-1 border border-[#cbd1d3] rounded bg-white focus:outline-none"
                >
                  <option value="Y">Y</option>
                  <option value="M">M</option>
                  <option value="D">D</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-[#5c6569] mb-1">Sex</label>
              <div className="flex gap-1">
                {(['M', 'F'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setForm({ ...form, gender: g })}
                    className={`flex-1 py-1.5 rounded border font-medium ${
                      form.gender === g ? 'bg-[#e6f2f0] border-[#bfe0db] text-[#1f5a55]' : 'bg-white border-[#cbd1d3] text-[#5c6569]'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11.5px] font-medium text-[#5c6569] mb-1">Referred By</label>
              <input
                value={form.referredBy}
                onChange={(e) => setForm({ ...form, referredBy: e.target.value })}
                className="w-full px-2 py-1.5 border border-[#cbd1d3] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#2c7a73]"
                placeholder="Dr. A. Mehta"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-[#5c6569] mb-1">Mobile</label>
              <input
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                className="w-full px-2 py-1.5 border border-[#cbd1d3] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#2c7a73]"
                placeholder="98765 43210"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11.5px] font-medium text-[#5c6569] mb-1">Address</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-2 py-1.5 border border-[#cbd1d3] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#2c7a73]"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-[11.5px] font-medium text-[#5c6569] mb-1.5">Sections</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SECTIONS.map((s) => {
                const active = form.sections.includes(s)
                return (
                  <button
                    key={s}
                    onClick={() => toggleSection(s)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[12px] font-medium border ${
                      active ? 'bg-[#2c7a73] border-[#2c7a73] text-white' : 'bg-white border-[#cbd1d3] text-[#5c6569]'
                    }`}
                  >
                    {active && <Check size={10} />}
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              className="px-3 py-1.5 bg-[#2c7a73] text-white text-[12.5px] font-medium rounded hover:bg-[#1f5a55]"
            >
              {editing ? 'Save (⌘S)' : 'Register (⌘S)'}
            </button>
            <button
              onClick={() => navigate('/designs/5')}
              className="px-3 py-1.5 bg-white text-[#1a2023] text-[12.5px] font-medium border border-[#cbd1d3] rounded hover:bg-[#f6f7f7]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
