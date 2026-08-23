import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DesignSwitcher from './DesignSwitcher'
import Design6Shell from './Design6Shell'
import { emptyPatientForm, formToPatient } from './mockData'

export default function Design6NewPatient() {
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyPatientForm)

  const handleNext = () => {
    const patient = formToPatient(form)
    navigate('/designs/6/tests', { state: { patient } })
  }

  return (
    <div className="min-h-screen bg-[#f4f3f0] pt-9">
      <DesignSwitcher current={6} screen="New Patient" />
      <Design6Shell
        maxWidth={520}
        headerRight={
          <button
            onClick={() => navigate('/designs/6')}
            className="text-[14px] font-semibold text-[#767470] hover:text-[#8f2c23] whitespace-nowrap flex-shrink-0"
          >
            ← Back to Patients
          </button>
        }
      >
        <div className="bg-white rounded-2xl" style={{ padding: '36px 32px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <h1 className="text-[26px] font-bold text-[#1a1a1a] mb-1">New Patient</h1>
          <p className="text-[14px] text-[#767470] mb-7">Enter details, then choose which tests to run.</p>

          <label className="block text-[15px] font-semibold text-[#1a1a1a] mb-2">Full name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Ramesh Kumar"
            className="w-full px-4 py-4 text-[18px] border-[1.5px] border-[#d8d5cf] rounded-[10px] outline-none focus:border-[#1a1a1a] mb-[22px]"
          />

          <label className="block text-[15px] font-semibold text-[#1a1a1a] mb-2">Age</label>
          <input
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
            placeholder="e.g. 42"
            type="number"
            className="w-full px-4 py-4 text-[18px] border-[1.5px] border-[#d8d5cf] rounded-[10px] outline-none focus:border-[#1a1a1a] mb-[22px]"
          />

          <label className="block text-[15px] font-semibold text-[#1a1a1a] mb-2">Gender</label>
          <div className="flex gap-2.5 mb-[22px]">
            {(['M', 'F'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setForm({ ...form, gender: g })}
                className={`flex-1 py-4 text-[17px] font-semibold rounded-[10px] border-[1.5px] ${
                  form.gender === g ? 'bg-[#b3382c] border-[#b3382c] text-white' : 'bg-white border-[#d8d5cf] text-[#1a1a1a]'
                }`}
              >
                {g === 'M' ? 'Male' : 'Female'}
              </button>
            ))}
          </div>

          <label className="block text-[15px] font-semibold text-[#1a1a1a] mb-2">Phone number</label>
          <input
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            placeholder="10-digit mobile number"
            type="tel"
            className="w-full px-4 py-4 text-[18px] border-[1.5px] border-[#d8d5cf] rounded-[10px] outline-none focus:border-[#1a1a1a] mb-[30px]"
          />

          <button
            onClick={handleNext}
            className="w-full py-[19px] text-[19px] font-bold rounded-[10px] bg-[#b3382c] text-white hover:bg-[#8f2c23]"
          >
            Next: Choose Tests →
          </button>
        </div>
      </Design6Shell>
    </div>
  )
}
