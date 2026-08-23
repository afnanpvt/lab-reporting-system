import { SECTIONS } from '../../types/lab'

export interface MockPatient {
  id: number
  sid: string
  name: string
  age: number
  ageUnit: 'Y' | 'M' | 'D'
  gender: 'M' | 'F'
  referredBy: string
  date: string
  regTime: string
  status: 'draft' | 'partial' | 'completed'
  sections: string[]
}

export const mockPatients: MockPatient[] = [
  { id: 1, sid: 'SID-2041', name: 'Ravi Kumar Sharma', age: 45, ageUnit: 'Y', gender: 'M', referredBy: 'Dr. A. Mehta', date: '2026-08-18', regTime: '09:14', status: 'completed', sections: ['Haematology', 'Biochemistry'] },
  { id: 2, sid: 'SID-2042', name: 'Priya Nair', age: 29, ageUnit: 'Y', gender: 'F', referredBy: 'Dr. S. Rao', date: '2026-08-18', regTime: '09:31', status: 'partial', sections: ['Serology'] },
  { id: 3, sid: 'SID-2043', name: 'Baby of Fathima', age: 8, ageUnit: 'M', gender: 'F', referredBy: 'Dr. K. Iyer', date: '2026-08-19', regTime: '09:47', status: 'draft', sections: ['Urine'] },
  { id: 4, sid: 'SID-2044', name: 'Suresh Pillai', age: 61, ageUnit: 'Y', gender: 'M', referredBy: 'Dr. A. Mehta', date: '2026-08-19', regTime: '10:05', status: 'completed', sections: ['Biochemistry', 'L.F.T.'] },
  { id: 5, sid: 'SID-2045', name: 'Anjali Verma', age: 34, ageUnit: 'Y', gender: 'F', referredBy: 'Self', date: '2026-08-20', regTime: '10:22', status: 'partial', sections: ['Haematology', 'Urine'] },
  { id: 6, sid: 'SID-2046', name: 'Mohammed Irfan', age: 52, ageUnit: 'Y', gender: 'M', referredBy: 'Dr. N. Das', date: '2026-08-20', regTime: '10:40', status: 'draft', sections: ['C.S.'] },
  { id: 7, sid: 'SID-2047', name: 'Lakshmi Menon', age: 71, ageUnit: 'Y', gender: 'F', referredBy: 'Dr. S. Rao', date: '2026-08-21', regTime: '10:58', status: 'completed', sections: ['Biochemistry'] },
  { id: 8, sid: 'SID-2048', name: 'Arjun Reddy', age: 19, ageUnit: 'Y', gender: 'M', referredBy: 'Dr. K. Iyer', date: '2026-08-22', regTime: '11:12', status: 'partial', sections: ['Serology', 'Mantoux'] },
  { id: 9, sid: 'SID-2049', name: 'Kavya Krishnan', age: 38, ageUnit: 'Y', gender: 'F', referredBy: 'Dr. A. Mehta', date: '2026-08-22', regTime: '11:30', status: 'completed', sections: ['Haematology', 'Electrolytes'] },
  { id: 10, sid: 'SID-2050', name: 'Thomas Jacob', age: 66, ageUnit: 'Y', gender: 'M', referredBy: 'Dr. N. Das', date: '2026-08-23', regTime: '08:50', status: 'completed', sections: ['ABG / Sputum', 'Biochemistry'] }
]

export const mockStats = {
  today: mockPatients.length,
  pending: mockPatients.filter((p) => p.status !== 'completed').length,
  completed: mockPatients.filter((p) => p.status === 'completed').length
}

export const ALL_SECTIONS = SECTIONS.map((s) => s.label)

export const nextSid = () => `SID-2049`

export interface PatientFormData {
  sid: string
  name: string
  age: string
  ageUnit: 'Y' | 'M' | 'D'
  gender: 'M' | 'F'
  referredBy: string
  mobile: string
  address: string
  sections: string[]
}

export const emptyPatientForm = (): PatientFormData => ({
  sid: nextSid(),
  name: '',
  age: '',
  ageUnit: 'Y',
  gender: 'M',
  referredBy: '',
  mobile: '',
  address: '',
  sections: []
})

export function patientToForm(p: MockPatient): PatientFormData {
  return {
    sid: p.sid,
    name: p.name,
    age: String(p.age),
    ageUnit: p.ageUnit,
    gender: p.gender,
    referredBy: p.referredBy,
    mobile: '98765 43210',
    address: '14, Lake View Road, Kochi',
    sections: p.sections
  }
}

/** Builds a MockPatient from the entry form — reuses id/time/status when editing, mints fresh ones for a new registration. */
export function formToPatient(form: PatientFormData, editing?: MockPatient): MockPatient {
  return {
    id: editing?.id ?? Math.max(0, ...mockPatients.map((p) => p.id)) + 1,
    sid: form.sid,
    name: form.name || 'Unnamed Patient',
    age: Number(form.age) || 0,
    ageUnit: form.ageUnit,
    gender: form.gender,
    referredBy: form.referredBy,
    date: editing?.date ?? '2026-08-23',
    regTime: editing?.regTime ?? new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    status: editing?.status ?? 'draft',
    sections: form.sections
  }
}

// ---------------------------------------------------------------------------
// Doctors + incentive reporting
// ---------------------------------------------------------------------------

export interface Doctor {
  id: number
  name: string
  specialty: string
  phone: string
}

export const mockDoctors: Doctor[] = [
  { id: 1, name: 'Dr. A. Mehta', specialty: 'General Physician', phone: '98450 11223' },
  { id: 2, name: 'Dr. S. Rao', specialty: 'Gynaecology', phone: '98450 33445' },
  { id: 3, name: 'Dr. K. Iyer', specialty: 'Paediatrics', phone: '98450 55667' },
  { id: 4, name: 'Dr. N. Das', specialty: 'Orthopaedics', phone: '98450 77889' }
]

/**
 * Price charged to the patient per investigation — this is a placeholder rate card, not a real one.
 * Assumption (flag if wrong): the incentive report's "amount" column is the amount charged to the
 * patient for that investigation, not a separately calculated doctor commission/percentage.
 */
export const mockSectionPrice: Record<string, number> = {
  'Haematology': 350,
  'Biochemistry': 500,
  'Serology': 600,
  'Urine': 200,
  'Motion': 200,
  'C.S.': 800,
  'Mantoux': 150,
  'GTT / SA / Lipid': 700,
  'Blood': 250,
  'Electrolytes': 400,
  'L.F.T.': 550,
  'ABG / Sputum': 650
}

export interface IncentiveLineItem {
  sno: number
  date: string
  patientSid: string
  patientName: string
  gender: 'M' | 'F'
  investigation: string
  amount: number
}

/** One row per (patient × investigation) referred by this doctor, oldest first, numbered for the printed report. */
export function incentiveLineItemsFor(doctorName: string): IncentiveLineItem[] {
  const rows: IncentiveLineItem[] = []
  const patients = mockPatients
    .filter((p) => p.referredBy === doctorName)
    .sort((a, b) => a.date.localeCompare(b.date))

  for (const p of patients) {
    for (const section of p.sections) {
      rows.push({
        sno: 0,
        date: p.date,
        patientSid: p.sid,
        patientName: p.name,
        gender: p.gender,
        investigation: section,
        amount: mockSectionPrice[section] ?? 0
      })
    }
  }
  return rows.map((r, i) => ({ ...r, sno: i + 1 }))
}

export function incentiveTotalFor(doctorName: string): number {
  return incentiveLineItemsFor(doctorName).reduce((sum, r) => sum + r.amount, 0)
}
