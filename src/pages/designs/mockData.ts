import { SECTIONS } from '../../types/lab'

export interface MockPatient {
  id: number
  sid: string
  name: string
  age: number
  ageUnit: 'Y' | 'M' | 'D'
  gender: 'M' | 'F'
  referredBy: string
  regTime: string
  status: 'draft' | 'partial' | 'completed'
  sections: string[]
}

export const mockPatients: MockPatient[] = [
  { id: 1, sid: 'SID-2041', name: 'Ravi Kumar Sharma', age: 45, ageUnit: 'Y', gender: 'M', referredBy: 'Dr. A. Mehta', regTime: '09:14', status: 'completed', sections: ['Haematology', 'Biochemistry'] },
  { id: 2, sid: 'SID-2042', name: 'Priya Nair', age: 29, ageUnit: 'Y', gender: 'F', referredBy: 'Dr. S. Rao', regTime: '09:31', status: 'partial', sections: ['Serology'] },
  { id: 3, sid: 'SID-2043', name: 'Baby of Fathima', age: 8, ageUnit: 'M', gender: 'F', referredBy: 'Dr. K. Iyer', regTime: '09:47', status: 'draft', sections: ['Urine'] },
  { id: 4, sid: 'SID-2044', name: 'Suresh Pillai', age: 61, ageUnit: 'Y', gender: 'M', referredBy: 'Dr. A. Mehta', regTime: '10:05', status: 'completed', sections: ['Biochemistry', 'L.F.T.'] },
  { id: 5, sid: 'SID-2045', name: 'Anjali Verma', age: 34, ageUnit: 'Y', gender: 'F', referredBy: 'Self', regTime: '10:22', status: 'partial', sections: ['Haematology', 'Urine'] },
  { id: 6, sid: 'SID-2046', name: 'Mohammed Irfan', age: 52, ageUnit: 'Y', gender: 'M', referredBy: 'Dr. N. Das', regTime: '10:40', status: 'draft', sections: ['C.S.'] },
  { id: 7, sid: 'SID-2047', name: 'Lakshmi Menon', age: 71, ageUnit: 'Y', gender: 'F', referredBy: 'Dr. S. Rao', regTime: '10:58', status: 'completed', sections: ['Biochemistry'] },
  { id: 8, sid: 'SID-2048', name: 'Arjun Reddy', age: 19, ageUnit: 'Y', gender: 'M', referredBy: 'Dr. K. Iyer', regTime: '11:12', status: 'partial', sections: ['Serology', 'Mantoux'] }
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
    regTime: editing?.regTime ?? new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    status: editing?.status ?? 'draft',
    sections: form.sections
  }
}
