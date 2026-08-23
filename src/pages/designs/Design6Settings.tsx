import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DesignSwitcher from './DesignSwitcher'
import { INTER_STACK } from './Design6Shell'

export default function Design6Settings() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    lab_name: 'ABC Laboratory',
    lab_address: 'Vaniyambadi, Tamil Nadu',
    lab_phone: '04174-000000',
    lab_doctor: 'Dr. Anand'
  })

  const inputClass =
    'w-full box-border px-4 py-[15px] text-[16px] border-[1.5px] border-[#d8d5cf] rounded-[10px] outline-none focus:border-[#1a1a1a] mb-5'

  return (
    <div className="min-h-screen bg-[#f4f3f0] pt-9">
      <DesignSwitcher current={6} screen="Settings" />
      <div className="flex justify-center px-5 py-12" style={{ fontFamily: INTER_STACK }}>
        <div className="w-full max-w-[520px]">
          <button
            onClick={() => navigate('/designs/6')}
            className="text-[14px] font-semibold text-[#767470] hover:text-[#8f2c23] mb-[22px] inline-block"
          >
            ← Back to Patients
          </button>

          <div className="bg-white rounded-2xl" style={{ padding: '36px 32px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <h1 className="text-[26px] font-bold text-[#1a1a1a] mb-6">Settings</h1>

            <label className="block text-[15px] font-semibold text-[#1a1a1a] mb-2">Lab name</label>
            <input
              value={form.lab_name}
              onChange={(e) => setForm({ ...form, lab_name: e.target.value })}
              className={inputClass}
            />

            <label className="block text-[15px] font-semibold text-[#1a1a1a] mb-2">Address</label>
            <input
              value={form.lab_address}
              onChange={(e) => setForm({ ...form, lab_address: e.target.value })}
              className={inputClass}
            />

            <div className="flex gap-3.5">
              <div className="flex-1">
                <label className="block text-[15px] font-semibold text-[#1a1a1a] mb-2">Phone</label>
                <input
                  value={form.lab_phone}
                  onChange={(e) => setForm({ ...form, lab_phone: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="flex-1">
                <label className="block text-[15px] font-semibold text-[#1a1a1a] mb-2">Authorised doctor</label>
                <input
                  value={form.lab_doctor}
                  onChange={(e) => setForm({ ...form, lab_doctor: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div style={{ borderTop: '1.5px solid #ece9e3', margin: '8px 0 18px' }} />
            <div className="text-[14px] text-[#767470] flex items-center gap-2">
              🔒 Everything is stored on this computer only — nothing is sent online.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
