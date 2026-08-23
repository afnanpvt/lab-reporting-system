import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import Shell from './Shell'
import { ALL_SECTIONS, emptyPatientForm, patientToForm, type MockPatient } from './mockData'

export default function PatientEntry() {
  const navigate = useNavigate()
  const location = useLocation()
  const editing = (location.state as { patient?: MockPatient })?.patient
  const [form, setForm] = useState(editing ? patientToForm(editing) : emptyPatientForm())

  const toggleSection = (s: string) =>
    setForm((f) => ({ ...f, sections: f.sections.includes(s) ? f.sections.filter((x) => x !== s) : [...f.sections, s] }))

  return (
    <Shell>
      <main className="px-10 py-9 max-w-3xl">
        <button
          onClick={() => navigate('/site')}
          className="inline-flex items-center gap-1.5 text-[14px] text-[#a39c8f] hover:text-[#3d3629] mb-5"
        >
          <ArrowLeft size={15} />
          Back to dashboard
        </button>

        <h1 className="text-[24px] font-semibold text-[#3d3629] mb-1">{editing ? 'Edit Patient' : 'New Patient'}</h1>
        <p className="text-[15px] text-[#8a8171] mb-7">SID <span className="font-mono text-[#3d3629]">{form.sid}</span></p>

        <div className="bg-white rounded-2xl border border-[#ece7de] p-6 space-y-5 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[14px] font-medium text-[#3d3629] mb-1.5">Full Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 text-[15px] border border-[#e3ddd0] rounded-xl bg-[#faf8f5] focus:outline-none focus:ring-2 focus:ring-[#e07a5f]/25 focus:border-[#e07a5f]"
                placeholder="e.g. Ravi Kumar Sharma"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#3d3629] mb-1.5">Age</label>
              <div className="flex gap-2">
                <input
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-[15px] border border-[#e3ddd0] rounded-xl bg-[#faf8f5] focus:outline-none focus:ring-2 focus:ring-[#e07a5f]/25 focus:border-[#e07a5f]"
                  placeholder="45"
                />
                <select
                  value={form.ageUnit}
                  onChange={(e) => setForm({ ...form, ageUnit: e.target.value as typeof form.ageUnit })}
                  className="px-2 py-2.5 text-[15px] border border-[#e3ddd0] rounded-xl bg-[#faf8f5] focus:outline-none"
                >
                  <option value="Y">Yrs</option>
                  <option value="M">Mos</option>
                  <option value="D">Days</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#3d3629] mb-1.5">Gender</label>
              <div className="flex gap-2">
                {(['M', 'F'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setForm({ ...form, gender: g })}
                    className={`flex-1 py-2.5 rounded-xl text-[15px] font-medium border transition-colors ${
                      form.gender === g ? 'bg-[#fbe6de] border-[#f0c3ae] text-[#c9603f]' : 'bg-[#faf8f5] border-[#e3ddd0] text-[#8a8171]'
                    }`}
                  >
                    {g === 'M' ? 'Male' : 'Female'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#3d3629] mb-1.5">Referred By</label>
              <input
                value={form.referredBy}
                onChange={(e) => setForm({ ...form, referredBy: e.target.value })}
                className="w-full px-3.5 py-2.5 text-[15px] border border-[#e3ddd0] rounded-xl bg-[#faf8f5] focus:outline-none focus:ring-2 focus:ring-[#e07a5f]/25 focus:border-[#e07a5f]"
                placeholder="Dr. A. Mehta"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#3d3629] mb-1.5">Mobile</label>
              <input
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                className="w-full px-3.5 py-2.5 text-[15px] border border-[#e3ddd0] rounded-xl bg-[#faf8f5] focus:outline-none focus:ring-2 focus:ring-[#e07a5f]/25 focus:border-[#e07a5f]"
                placeholder="98765 43210"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[14px] font-medium text-[#3d3629] mb-1.5">Address</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={2}
                className="w-full px-3.5 py-2.5 text-[15px] border border-[#e3ddd0] rounded-xl bg-[#faf8f5] focus:outline-none focus:ring-2 focus:ring-[#e07a5f]/25 focus:border-[#e07a5f] resize-none"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label className="block text-[14px] font-medium text-[#3d3629] mb-2">Sections to Report</label>
            <div className="flex flex-wrap gap-2">
              {ALL_SECTIONS.map((s) => {
                const active = form.sections.includes(s)
                return (
                  <button
                    key={s}
                    onClick={() => toggleSection(s)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13.5px] font-medium border transition-colors ${
                      active ? 'bg-[#e07a5f] border-[#e07a5f] text-white' : 'bg-[#faf8f5] border-[#e3ddd0] text-[#8a8171]'
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
              onClick={() => navigate('/site')}
              className="px-5 py-2.5 bg-[#e07a5f] text-white text-[15px] font-medium rounded-2xl hover:bg-[#c96a51] shadow-sm"
            >
              {editing ? 'Save Changes' : 'Register Patient'}
            </button>
            <button
              onClick={() => navigate('/site')}
              className="px-5 py-2.5 bg-white text-[#3d3629] text-[15px] font-medium border border-[#e3ddd0] rounded-2xl hover:bg-[#f6f2ea]"
            >
              Cancel
            </button>
          </div>
        </div>
      </main>
    </Shell>
  )
}
