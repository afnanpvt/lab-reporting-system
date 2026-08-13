import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import type { Patient } from '../../types/lab'

interface Props {
  patient: Patient
  right?: ReactNode
  /** Where the back arrow returns to. Omit to hide it (e.g. there's nowhere sensible to go back to). */
  backTo?: string
  backLabel?: string
  /** Shows a small edit affordance next to the patient's name — the only way to change registration info once a patient exists. */
  editHref?: string
}

export default function PatientContextBar({ patient, right, backTo, backLabel = 'Back', editHref }: Props) {
  const navigate = useNavigate()
  return (
    <div
      className="flex items-center gap-4 px-5 flex-shrink-0"
      style={{ height: 60, borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
    >
      {backTo && (
        <button
          className="flex items-center gap-1.5 text-[14px] text-ink-2 hover:text-ink px-2 py-1.5 rounded-md hover:bg-app transition-colors flex-shrink-0"
          onClick={() => navigate(backTo)}
        >
          <ArrowLeft size={15} />
          {backLabel}
        </button>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[17px] font-semibold text-ink leading-tight truncate">{patient.name}</span>
          {editHref && (
            <button
              className="text-ink-3 hover:text-accent-ink p-0.5 rounded transition-colors flex-shrink-0"
              onClick={() => navigate(editHref)}
              title="Edit patient information"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
        <div className="text-[14px] text-ink-2 leading-tight">
          {patient.age}{patient.age_unit} · {patient.gender === 'M' ? 'Male' : 'Female'} · {patient.sid}
          {patient.referred_by && <> · Dr. {patient.referred_by}</>}
        </div>
      </div>
      <div className="flex-1" />
      {right}
    </div>
  )
}
