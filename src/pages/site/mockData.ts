import { SECTIONS, getCompletionState } from '../../types/lab'
import { initialResultsFor, sectionKeyForLabel } from './reportFields'

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
  /** Captured at registration — patient (or guardian) consented to their data being collected and stored for testing/reporting. Flagged so the business owner can confirm this satisfies their actual legal obligations; this checkbox alone isn't legal advice. */
  consentGiven: boolean
}

export const mockPatients: MockPatient[] = [
  { id: 1, sid: 'SID-2041', name: 'Ravi Kumar Sharma', age: 45, ageUnit: 'Y', gender: 'M', referredBy: 'Dr. A. Mehta', date: '2026-08-18', regTime: '09:14', status: 'completed', sections: ['Haematology', 'Biochemistry'], consentGiven: true },
  { id: 2, sid: 'SID-2042', name: 'Priya Nair', age: 29, ageUnit: 'Y', gender: 'F', referredBy: 'Dr. S. Rao', date: '2026-08-18', regTime: '09:31', status: 'partial', sections: ['Serology'], consentGiven: true },
  { id: 3, sid: 'SID-2043', name: 'Baby of Fathima', age: 8, ageUnit: 'M', gender: 'F', referredBy: 'Dr. K. Iyer', date: '2026-08-19', regTime: '09:47', status: 'draft', sections: ['Urine'], consentGiven: true },
  { id: 4, sid: 'SID-2044', name: 'Suresh Pillai', age: 61, ageUnit: 'Y', gender: 'M', referredBy: 'Dr. A. Mehta', date: '2026-08-19', regTime: '10:05', status: 'completed', sections: ['Biochemistry', 'L.F.T.'], consentGiven: true },
  { id: 5, sid: 'SID-2045', name: 'Anjali Verma', age: 34, ageUnit: 'Y', gender: 'F', referredBy: 'Self', date: '2026-08-20', regTime: '10:22', status: 'partial', sections: ['Haematology', 'Urine'], consentGiven: true },
  { id: 6, sid: 'SID-2046', name: 'Mohammed Irfan', age: 52, ageUnit: 'Y', gender: 'M', referredBy: 'Dr. N. Das', date: '2026-08-20', regTime: '10:40', status: 'draft', sections: ['C.S.'], consentGiven: true },
  { id: 7, sid: 'SID-2047', name: 'Lakshmi Menon', age: 71, ageUnit: 'Y', gender: 'F', referredBy: 'Dr. S. Rao', date: '2026-08-21', regTime: '10:58', status: 'completed', sections: ['Biochemistry'], consentGiven: true },
  { id: 8, sid: 'SID-2048', name: 'Arjun Reddy', age: 19, ageUnit: 'Y', gender: 'M', referredBy: 'Dr. K. Iyer', date: '2026-08-22', regTime: '11:12', status: 'partial', sections: ['Serology', 'Mantoux'], consentGiven: true },
  { id: 9, sid: 'SID-2049', name: 'Kavya Krishnan', age: 38, ageUnit: 'Y', gender: 'F', referredBy: 'Dr. A. Mehta', date: '2026-08-22', regTime: '11:30', status: 'completed', sections: ['Haematology', 'Electrolytes'], consentGiven: true },
  { id: 10, sid: 'SID-2050', name: 'Thomas Jacob', age: 66, ageUnit: 'Y', gender: 'M', referredBy: 'Dr. N. Das', date: '2026-08-23', regTime: '08:50', status: 'completed', sections: ['ABG / Sputum', 'Biochemistry'], consentGiven: true }
]

/** Recomputed on every call (not cached) so it always reflects live completion state, not the static seed status. */
export function getStats() {
  const statuses = mockPatients.map(computePatientStatus)
  return {
    today: mockPatients.length,
    pending: statuses.filter((s) => s !== 'completed').length,
    completed: statuses.filter((s) => s === 'completed').length
  }
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
  consentGiven: boolean
}

export const emptyPatientForm = (): PatientFormData => ({
  sid: nextSid(),
  name: '',
  age: '',
  ageUnit: 'Y',
  gender: 'M',
  referredBy: 'Self',
  mobile: '',
  address: '',
  sections: [],
  consentGiven: false
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
    sections: p.sections,
    consentGiven: p.consentGiven
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
    sections: form.sections,
    consentGiven: form.consentGiven
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

export const nextDoctorId = () => Math.max(0, ...mockDoctors.map((d) => d.id)) + 1

/** Adds or updates a doctor in place — same append-in-place pattern as upsertPatient. */
export function upsertDoctor(doctor: Doctor) {
  const idx = mockDoctors.findIndex((d) => d.id === doctor.id)
  if (idx === -1) mockDoctors.unshift(doctor)
  else mockDoctors[idx] = doctor
  persist()
}

/** Looks up the doctor record behind a patient's free-text "referredBy" name, so cards can link to that doctor's page — returns undefined for "Self" or a name that doesn't match any doctor on file. */
export function doctorByName(name: string): Doctor | undefined {
  return mockDoctors.find((d) => d.name === name)
}

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
        amount: priceFor(p.id, section)
      })
    }
  }
  return rows.map((r, i) => ({ ...r, sno: i + 1 }))
}

export function incentiveTotalFor(doctorName: string): number {
  return incentiveLineItemsFor(doctorName).reduce((sum, r) => sum + r.amount, 0)
}

export function patientById(id: number): MockPatient | undefined {
  return mockPatients.find((p) => p.id === id)
}

/**
 * The card/dashboard "status" a patient shows as — always auto-computed from what's actually
 * been entered in Result Entry, deliberately with no manual override. A patient becomes
 * 'completed' only once every selected section has every one of its fields filled, 'draft' only
 * while nothing at all has been entered, anything in between is 'partial'. `patient.status`
 * itself is kept only as a seed hint for how much placeholder data to pre-fill in the mock/demo
 * phase — it is never the source of truth for what's shown on screen.
 */
export function computePatientStatus(patient: MockPatient): MockPatient['status'] {
  if (patient.sections.length === 0) return 'draft'
  const results = getResultsFor(patient)
  const states = patient.sections.map((label) => {
    const key = sectionKeyForLabel(label)
    if (!key) return 'empty' as const
    return getCompletionState(key, results[key] ?? {})
  })
  if (states.every((s) => s === 'complete')) return 'completed'
  if (states.every((s) => s === 'empty')) return 'draft'
  return 'partial'
}

/** Adds or updates a patient in place — mockPatients is read fresh on every render (not memoized), so this is enough to make Start's dashboard and everything else see the change without a real store. */
export function upsertPatient(patient: MockPatient) {
  const idx = mockPatients.findIndex((p) => p.id === patient.id)
  if (idx === -1) mockPatients.unshift(patient)
  else mockPatients[idx] = patient
  persist()
}

// ---------------------------------------------------------------------------
// Patient billing — one bill per patient/visit, priced off the same rate card
// as the doctor incentive report. Bill No. reuses the SID: it's already the
// unique reference for this visit, so there's no need for a second number.
// ---------------------------------------------------------------------------

/** Per-patient, per-investigation price overrides — the rate card is a starting point, not fixed; staff can adjust what a specific patient is actually charged. */
const billOverrides: Record<number, Record<string, number>> = {}

/** The real amount a patient is charged for an investigation: their own override if staff set one, otherwise the rate card default. Both the bill and the doctor's incentive report read through this, so an edited amount stays consistent everywhere it appears. */
export function priceFor(patientId: number, section: string): number {
  return billOverrides[patientId]?.[section] ?? mockSectionPrice[section] ?? 0
}

export function setBillItemAmount(patientId: number, section: string, amount: number) {
  if (!billOverrides[patientId]) billOverrides[patientId] = {}
  billOverrides[patientId][section] = Math.max(0, amount)
  persist()
}

export interface BillLineItem {
  sno: number
  investigation: string
  amount: number
}

/** One row per investigation ordered for this patient, numbered for the printed bill. */
export function billLineItemsFor(patient: MockPatient): BillLineItem[] {
  return patient.sections.map((section, i) => ({
    sno: i + 1,
    investigation: section,
    amount: priceFor(patient.id, section)
  }))
}

export function billTotalFor(patient: MockPatient): number {
  return billLineItemsFor(patient).reduce((sum, r) => sum + r.amount, 0)
}

// ---------------------------------------------------------------------------
// Result entry — in-memory only (this is the mock/site phase, no real backend
// yet). Keeping it in a module-level object rather than component state means
// editing a patient's results, navigating away, and coming back doesn't lose
// anything within the same browser session — matching "never lose your place".
// ---------------------------------------------------------------------------

type ResultsBySection = Record<string, Record<string, string>>
const resultsStore: Record<number, ResultsBySection> = {}

export function getResultsFor(patient: MockPatient): ResultsBySection {
  if (!resultsStore[patient.id]) {
    resultsStore[patient.id] = initialResultsFor(patient)
  }
  return resultsStore[patient.id]
}

export function setSectionResults(patientId: number, sectionKey: string, data: Record<string, string>) {
  if (!resultsStore[patientId]) resultsStore[patientId] = {}
  resultsStore[patientId][sectionKey] = data
  persist()
}

// ---------------------------------------------------------------------------
// Lab settings — mock only for now; becomes real once wired to the desktop app.
// ---------------------------------------------------------------------------

export interface LabSettingsForm {
  labName: string
  labAddress: string
  labPhone: string
  labEmail: string
  labDoctor: string
}

export const mockLabSettings: LabSettingsForm = {
  labName: 'Super Lab Service',
  labAddress: '#92, Opp. Azeem Hospital, Moolakadai Street, P.J. Nehru Road, Vaniyambadi.',
  labPhone: '99442 38110',
  labEmail: 'superlab.vaniyambadi@gmail.com',
  labDoctor: 'Dr. Arvind Nair'
}

// ---------------------------------------------------------------------------
// Local persistence — there's no real backend yet, so closing the app or
// navigating away mid-entry used to lose everything the moment the page
// reloaded. This survives that: every mutation above (patients, doctors,
// entered results, bill amounts) writes through to localStorage, and it's
// read back in once, below, after all the seed data has loaded — a saved
// record for a given patient/doctor id replaces the seed one; anything not
// yet touched keeps its seed value.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'labReporter.mockState.v1'

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mockPatients, mockDoctors, resultsStore, billOverrides }))
  } catch {
    // Storage can be unavailable (private mode, quota) — losing autosave silently beats crashing.
  }
}

function hydrate() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const saved = JSON.parse(raw)
    if (Array.isArray(saved.mockPatients)) { mockPatients.length = 0; mockPatients.push(...saved.mockPatients) }
    if (Array.isArray(saved.mockDoctors)) { mockDoctors.length = 0; mockDoctors.push(...saved.mockDoctors) }
    if (saved.resultsStore) Object.assign(resultsStore, saved.resultsStore)
    if (saved.billOverrides) Object.assign(billOverrides, saved.billOverrides)
  } catch {
    // Corrupt or incompatible saved state — fall back to the seed data instead of crashing.
  }
}

hydrate()
