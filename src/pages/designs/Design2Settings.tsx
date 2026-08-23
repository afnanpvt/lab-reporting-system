import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutGrid, Users, FileText, Settings as SettingsIcon, FlaskConical, Save, ShieldCheck } from 'lucide-react'
import DesignSwitcher from './DesignSwitcher'

const FIELDS = [
  { key: 'lab_name', label: 'Laboratory Name', placeholder: 'e.g. Sunrise Diagnostics', value: 'Sunrise Diagnostics' },
  { key: 'lab_address', label: 'Address', placeholder: 'Full address', value: '221, MG Road, Kochi, Kerala — 682016' },
  { key: 'lab_phone', label: 'Phone / Contact', placeholder: 'e.g. 9443963741', value: '0484 234 5678' },
  { key: 'lab_doctor', label: 'Authorised Doctor', placeholder: 'Dr. Name', value: 'Dr. Anitha George, MD (Pathology)' }
]

export default function Design2Settings() {
  const navigate = useNavigate()
  const [form, setForm] = useState(Object.fromEntries(FIELDS.map((f) => [f.key, f.value])))
  const [saved, setSaved] = useState(false)

  const navItems = [
    { icon: LayoutGrid, label: 'Dashboard', active: false, onClick: () => navigate('/designs/2') },
    { icon: Users, label: 'Patients', active: false, onClick: () => navigate('/designs/2') },
    { icon: FileText, label: 'Reports', active: false, onClick: () => navigate('/designs/2') },
    { icon: SettingsIcon, label: 'Settings', active: true, onClick: () => navigate('/designs/2/settings') }
  ]

  const save = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="h-screen overflow-y-auto bg-[#f1f4f8] pt-9 flex">
      <DesignSwitcher current={2} screen="Settings" />

      <aside className="w-56 flex-shrink-0 bg-[#12233d] text-white flex flex-col h-[calc(100vh-36px)] sticky top-9">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-[#1f5fa8] flex items-center justify-center flex-shrink-0">
            <FlaskConical size={16} />
          </div>
          <span className="font-semibold text-[15px]">Sunrise Diagnostics</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ icon: Icon, label, active, onClick }) => (
            <div
              key={label}
              onClick={onClick}
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

      <main className="flex-1 px-8 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[24px] font-semibold text-[#0f1b2d]">Settings</h1>
            <p className="text-[14px] text-[#5c6b80]">Laboratory and report configuration</p>
          </div>
          <button onClick={save} className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1f5fa8] text-white text-[14.5px] font-medium rounded-lg hover:bg-[#184a85]">
            <Save size={15} />
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-[#dbe2ea] p-6 space-y-4 mb-4">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="block text-[13px] font-semibold text-[#5c6b80] uppercase tracking-wide mb-1.5">{f.label}</label>
              <input
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="w-full px-3.5 py-2.5 text-[14.5px] border border-[#dbe2ea] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1f5fa8]/25 focus:border-[#1f5fa8]"
              />
            </div>
          ))}
        </div>

        <div className="bg-[#e9f1fa] border border-[#b8d3ee] rounded-xl p-5 flex items-start gap-3">
          <ShieldCheck size={19} className="text-[#1f5fa8] flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-[15px] font-semibold text-[#184a85] mb-1">Data stays on this computer</h2>
            <p className="text-[14px] text-[#184a85] leading-relaxed">
              All patient records and reports are stored locally. Nothing is uploaded to the cloud — the app works fully offline.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
