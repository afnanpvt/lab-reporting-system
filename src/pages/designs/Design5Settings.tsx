import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical, ArrowLeft, ShieldCheck } from 'lucide-react'
import DesignSwitcher from './DesignSwitcher'

const FIELDS = [
  { key: 'lab_name', label: 'Laboratory Name', value: 'Sunrise Diagnostics' },
  { key: 'lab_address', label: 'Address', value: '221, MG Road, Kochi, Kerala — 682016' },
  { key: 'lab_phone', label: 'Phone / Contact', value: '0484 234 5678' },
  { key: 'lab_doctor', label: 'Authorised Doctor', value: 'Dr. Anitha George, MD (Pathology)' }
]

export default function Design5Settings() {
  const navigate = useNavigate()
  const [form, setForm] = useState(Object.fromEntries(FIELDS.map((f) => [f.key, f.value])))
  const [saved, setSaved] = useState(false)

  const save = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="h-screen overflow-y-auto bg-white pt-9 text-[13.5px]">
      <DesignSwitcher current={5} screen="Settings" />

      <header className="flex items-center gap-3 px-4 h-11 border-b border-[#e2e5e6]">
        <FlaskConical size={15} className="text-[#2c7a73] flex-shrink-0" />
        <button onClick={() => navigate('/designs/5')} className="inline-flex items-center gap-1 text-[#5c6569] hover:text-[#1a2023]">
          <ArrowLeft size={13} />
          Register
        </button>
        <span className="text-[#8a9094]">— Settings</span>
        <div className="flex-1" />
        <button onClick={save} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#2c7a73] text-white text-[12.5px] font-medium rounded hover:bg-[#1f5a55]">
          {saved ? 'Saved!' : 'Save (⌘S)'}
        </button>
      </header>

      <div className="max-w-lg px-4 py-4">
        <div className="space-y-3 mb-4">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="block text-[11.5px] font-medium text-[#5c6569] mb-1">{f.label}</label>
              <input
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full px-2 py-1.5 border border-[#cbd1d3] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#2c7a73]"
              />
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 px-3 py-2.5 bg-[#e6f2f0] border border-[#bfe0db] rounded">
          <ShieldCheck size={15} className="text-[#1f5a55] flex-shrink-0 mt-0.5" />
          <p className="text-[12.5px] text-[#1f5a55] leading-relaxed">
            Data stays on this computer. Nothing is uploaded to the cloud — fully offline.
          </p>
        </div>
      </div>
    </div>
  )
}
