import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, CheckCircle2, ShieldCheck, Building2 } from 'lucide-react'
import Shell from './Shell'
import { mockLabSettings } from './mockData'

export default function Settings() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ ...mockLabSettings })
  const [saved, setSaved] = useState(false)

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const fields: { key: keyof typeof form; label: string; placeholder: string }[] = [
    { key: 'labAddress', label: 'Address', placeholder: 'Full address' },
    { key: 'labPhone', label: 'Phone / Contact', placeholder: 'e.g. 99442 38110' },
    { key: 'labEmail', label: 'Email', placeholder: 'e.g. lab@example.com' },
    { key: 'labDoctor', label: 'Authorised Doctor', placeholder: 'Dr. Name (printed on reports)' }
  ]

  return (
    <Shell>
      <div className="flex flex-col h-full">
        <div className="flex items-center px-8 py-4 bg-white border-b border-[#e1e6ec] flex-shrink-0">
          <button
            onClick={() => navigate('/site')}
            className="inline-flex items-center gap-1.5 text-[14px] text-[#8593a3] hover:text-[#1a2430]"
          >
            <ArrowLeft size={15} />
            Dashboard
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#f5f7fa]">
          <div className="px-10 py-9">
            <div className="flex items-center justify-between mb-7">
              <div>
                <h1 className="text-[24px] font-semibold text-[#1a2430]">Settings</h1>
                <p className="text-[14px] text-[#57677a] mt-0.5">Laboratory and report configuration</p>
              </div>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1b6fae] text-white text-[14px] font-medium rounded-xl hover:bg-[#125483] shadow-sm"
              >
                {saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
                {saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
              <div className="bg-white rounded-2xl border border-[#e1e6ec] shadow-sm p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Building2 size={16} className="text-[#1b6fae]" />
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#8593a3]">Laboratory Information</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {fields.map(({ key, label, placeholder }) => (
                    <div key={key} className={key === 'labAddress' ? 'col-span-2' : ''}>
                      <label className="block text-[14px] font-medium text-[#1a2430] mb-1.5">{label}</label>
                      <input
                        className="w-full px-3.5 py-2.5 text-[15px] border border-[#c7cfd9] rounded-xl bg-[#f5f7fa] focus:outline-none focus:ring-2 focus:ring-[#1b6fae]/25 focus:border-[#1b6fae]"
                        placeholder={placeholder}
                        value={form[key]}
                        onChange={(e) => update(key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl p-6" style={{ background: '#f2f9f4', border: '1px solid #cfe9d7' }}>
                  <div className="flex items-start gap-3">
                    <ShieldCheck size={19} className="flex-shrink-0 mt-0.5" style={{ color: '#2f7d4f' }} />
                    <div>
                      <h2 className="text-[15px] font-semibold mb-1" style={{ color: '#2f7d4f' }}>Data stays on this computer</h2>
                      <p className="text-[14px] leading-relaxed" style={{ color: '#2f7d4f' }}>
                        Patient records and reports live in a local database on this machine only —
                        nothing is uploaded to the cloud, fully offline.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#e1e6ec] shadow-sm p-6">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#8593a3] mb-3">Report Output</h2>
                  <div className="space-y-2 text-[14px] text-[#57677a] leading-relaxed">
                    <p>PDFs save to <span className="font-medium text-[#1a2430]">Documents\LabReports\</span>.</p>
                    <p>Printing uses any installed Windows printer, selected from the report preview.</p>
                    <p>WhatsApp sharing opens a chat with a message ready — attaching the PDF is one drag once it's saved.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}
