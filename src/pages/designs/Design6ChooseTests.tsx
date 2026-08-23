import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import DesignSwitcher from './DesignSwitcher'
import Design6Shell from './Design6Shell'
import { emptyPatientForm, formToPatient, type MockPatient } from './mockData'

const TEST_PANELS = [
  { key: 'Haematology', label: 'Haematology' },
  { key: 'Biochemistry', label: 'Biochemistry' },
  { key: 'Urine', label: 'Urine' },
  { key: 'Serology', label: 'Serology' },
  { key: 'Motion', label: 'Motion' },
  { key: 'C.S.', label: 'Culture & Sensitivity' }
]

export default function Design6ChooseTests() {
  const navigate = useNavigate()
  const location = useLocation()
  const patient = (location.state as { patient?: MockPatient })?.patient ?? formToPatient(emptyPatientForm())
  const [sections, setSections] = useState<string[]>(patient.sections)

  const toggle = (key: string) =>
    setSections((s) => (s.includes(key) ? s.filter((x) => x !== key) : [...s, key]))

  const handleStart = () => {
    navigate('/designs/6/report', { state: { patient: { ...patient, sections } } })
  }

  return (
    <div className="min-h-screen bg-[#f4f3f0] pt-9">
      <DesignSwitcher current={6} screen={`Choose Tests — ${patient.name || 'New Patient'}`} />
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
          <div className="flex items-baseline justify-between mb-1 gap-3">
            <h1 className="text-[26px] font-bold text-[#1a1a1a]">Which Tests?</h1>
            <span className="text-[14px] text-[#767470] whitespace-nowrap">
              {patient.name || 'New Patient'}{patient.age ? ` · ${patient.age}${patient.ageUnit}` : ''}
            </span>
          </div>
          <p className="text-[14px] text-[#767470] mb-2">Tap to select. You can add more later.</p>

          <div className="mt-4">
            {TEST_PANELS.map((panel) => {
              const checked = sections.includes(panel.key)
              return (
                <button
                  key={panel.key}
                  onClick={() => toggle(panel.key)}
                  className="w-full flex items-center gap-3.5 text-left border-b-[1.5px] border-[#ece9e3] last:border-0"
                  style={{ padding: '18px 4px' }}
                >
                  <span
                    className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center flex-shrink-0 text-[16px] font-bold"
                    style={
                      checked
                        ? { background: '#b3382c', color: '#fff', border: '2px solid #b3382c' }
                        : { border: '2px solid #d8d5cf' }
                    }
                  >
                    {checked && '✓'}
                  </span>
                  <span className="text-[19px] font-semibold text-[#1a1a1a]">{panel.label}</span>
                </button>
              )
            })}
          </div>

          <button
            onClick={handleStart}
            className="w-full py-[19px] text-[19px] font-bold rounded-[10px] bg-[#b3382c] text-white hover:bg-[#8f2c23] mt-[26px]"
          >
            Start Entry →
          </button>
        </div>
      </Design6Shell>
    </div>
  )
}
