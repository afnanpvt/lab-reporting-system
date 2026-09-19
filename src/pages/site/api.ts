import { SECTIONS, getCompletionState, type Doctor, type RateCardEntry, type BillItem } from '../../types/lab'
import { sectionKeyForLabel } from './reportFields'

export type { Doctor, RateCardEntry, BillItem }

export interface Patient {
  id: number
  sid: string
  name: string
  age: number
  ageUnit: 'Y' | 'M' | 'D'
  gender: 'M' | 'F'
  address: string
  mobile: string
  referredBy: string
  date: string
  regTime: string
  // Report date/time — shown as "Reported" on the printed report. Defaults to registration
  // date/time but is independently editable via the "Dates & Times" editor in PatientEntry.tsx
  // (matching the SID Date/Reg Time/Rpt Date/Rpt Time fields of the lab's previous software).
  rptDate: string
  rptTime: string
  sections: string[]
  consentGiven: boolean
  // Sticky "completed" flag — set automatically when the report PDF is saved, or by hand via
  // the "Mark as completed" toggle on Report Preview. Once set it stays set until someone
  // explicitly undoes it; it does not get cleared just because a field changes afterwards.
  // Replaces the old field-count-based "completed" (see computePatientStatus below) — that
  // required every field in every section a patient was tested for, including ones nobody
  // actually orders together (e.g. Haematology's Blood Group/Coombs alongside a routine CBC),
  // so real patients almost never reached it.
  markedComplete: boolean
}

export type ResultsBySection = Record<string, Record<string, string>>
export type PatientStatus = 'draft' | 'partial' | 'completed'

export const ALL_SECTIONS = SECTIONS.map((s) => s.label)

function safeParseSections(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[]
  if (typeof raw !== 'string') return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function rowToPatient(row: Record<string, unknown>): Patient {
  return {
    id: Number(row.id),
    sid: String(row.sid ?? ''),
    name: String(row.name ?? ''),
    age: Number(row.age ?? 0),
    ageUnit: (row.age_unit as Patient['ageUnit']) ?? 'Y',
    gender: (row.gender as Patient['gender']) ?? 'M',
    address: String(row.address ?? ''),
    mobile: String(row.mobile ?? ''),
    referredBy: (row.referred_by as string) || 'Self',
    date: String(row.reg_date ?? ''),
    regTime: String(row.reg_time ?? ''),
    rptDate: String(row.rpt_date ?? ''),
    rptTime: String(row.rpt_time ?? ''),
    sections: safeParseSections(row.sections),
    consentGiven: !!row.consent_given,
    markedComplete: row.status === 'completed'
  }
}

/** Sets or clears the sticky "completed" flag (see Patient.markedComplete) — the only writer of
 * the patients.status column now; nothing else touches it. */
export async function setPatientCompleted(id: number, completed: boolean): Promise<void> {
  await window.api.patients.update(id, { status: completed ? 'completed' : '' })
}

export async function listPatients(search?: string): Promise<Patient[]> {
  const rows = (await window.api.patients.list(search)) as unknown as Record<string, unknown>[]
  return rows.map(rowToPatient)
}

export async function getPatient(id: number): Promise<Patient | null> {
  const row = (await window.api.patients.get(id)) as unknown as Record<string, unknown> | null
  return row ? rowToPatient(row) : null
}

export interface PatientFormData {
  sid: string
  name: string
  age: string
  ageUnit: 'Y' | 'M' | 'D'
  gender: 'M' | 'F'
  referredBy: string
  mobile: string
  address: string
  // "Dates & Times" editor in PatientEntry.tsx — SID Date/Reg Time and Rpt Date/Rpt Time, same
  // pair the lab's previous software had. Both default to today/now and stay editable afterwards.
  regDate: string
  regTime: string
  rptDate: string
  rptTime: string
  sections: string[]
  consentGiven: boolean
}

export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const emptyPatientForm = (): PatientFormData => ({
  sid: '',
  name: '',
  age: '',
  ageUnit: 'Y',
  gender: 'M',
  referredBy: 'Self',
  mobile: '',
  address: '',
  regDate: todayIso(),
  regTime: nowHHMM(),
  rptDate: todayIso(),
  rptTime: nowHHMM(),
  sections: [],
  consentGiven: false
})

export function patientToForm(p: Patient): PatientFormData {
  return {
    sid: p.sid,
    name: p.name,
    age: String(p.age),
    ageUnit: p.ageUnit,
    gender: p.gender,
    referredBy: p.referredBy,
    mobile: p.mobile,
    address: p.address,
    regDate: p.date,
    regTime: p.regTime,
    rptDate: p.rptDate,
    rptTime: p.rptTime,
    sections: p.sections,
    consentGiven: p.consentGiven
  }
}

export async function createPatient(form: PatientFormData): Promise<Patient> {
  const { id } = await window.api.patients.create({
    name: form.name.trim() || 'Unnamed Patient',
    age: Number(form.age) || 0,
    age_unit: form.ageUnit,
    gender: form.gender,
    address: form.address,
    mobile: form.mobile,
    referred_by: form.referredBy,
    reg_date: form.regDate || todayIso(),
    reg_time: form.regTime || nowHHMM(),
    rpt_date: form.rptDate || '',
    rpt_time: form.rptTime || '',
    sections: form.sections,
    consent_given: form.consentGiven ? 1 : 0
  } as never)
  const created = await getPatient(id)
  if (!created) throw new Error('Patient not found after create')
  return created
}

export async function updatePatient(id: number, form: PatientFormData): Promise<Patient> {
  await window.api.patients.update(id, {
    name: form.name.trim() || 'Unnamed Patient',
    age: Number(form.age) || 0,
    age_unit: form.ageUnit,
    gender: form.gender,
    address: form.address,
    mobile: form.mobile,
    referred_by: form.referredBy,
    reg_date: form.regDate,
    reg_time: form.regTime,
    rpt_date: form.rptDate,
    rpt_time: form.rptTime,
    sections: form.sections,
    consent_given: form.consentGiven ? 1 : 0
  } as never)
  const updated = await getPatient(id)
  if (!updated) throw new Error('Patient not found after update')
  return updated
}

export async function deletePatient(id: number): Promise<boolean> {
  return window.api.patients.delete(id)
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export async function getResultsFor(patientId: number): Promise<ResultsBySection> {
  return (await window.api.results.getAll(patientId)) as unknown as ResultsBySection
}

export async function setSectionResults(patientId: number, sectionKey: string, data: Record<string, string>): Promise<void> {
  await window.api.results.save(sectionKey, patientId, data)
}

/**
 * The card/dashboard "status" a patient shows as. 'completed' is the sticky manual/PDF-triggered
 * flag (see Patient.markedComplete) — it used to be auto-computed from "every field in every
 * selected section is filled", but sections bundle multiple separately-orderable tests (e.g.
 * Haematology also covers Blood Group and Coombs, not just a routine CBC), so real patients
 * almost never filled literally everything and 'completed' was effectively unreachable.
 * 'draft' vs 'partial' is still auto-computed — that distinction (nothing entered yet vs. some
 * results in progress) was never the broken part.
 */
export function computePatientStatus(patient: Patient, results: ResultsBySection): PatientStatus {
  if (patient.markedComplete) return 'completed'
  if (patient.sections.length === 0) return 'draft'
  const states = patient.sections.map((label) => {
    const key = sectionKeyForLabel(label)
    if (!key) return 'empty' as const
    return getCompletionState(key, results[key] ?? {})
  })
  if (states.every((s) => s === 'empty')) return 'draft'
  return 'partial'
}

export interface PatientWithStatus {
  patient: Patient
  status: PatientStatus
}

/** Patients plus their live-computed status, for list views (Dashboard, Patients, Reports) that need to show/filter/count by status. */
export async function listPatientsWithStatus(search?: string): Promise<PatientWithStatus[]> {
  const patients = await listPatients(search)
  const resultsList = await Promise.all(patients.map((p) => getResultsFor(p.id)))
  return patients.map((patient, i) => ({ patient, status: computePatientStatus(patient, resultsList[i]) }))
}

// ---------------------------------------------------------------------------
// Doctors
// ---------------------------------------------------------------------------

export async function listDoctors(): Promise<Doctor[]> {
  return (await window.api.doctors.list()) as unknown as Doctor[]
}

export async function getDoctor(id: number): Promise<Doctor | null> {
  return (await window.api.doctors.get(id)) as unknown as Doctor | null
}

export async function createDoctor(data: { name: string; specialty: string; phone: string }): Promise<Doctor> {
  const { id } = await window.api.doctors.create(data)
  const doctor = await getDoctor(id)
  if (!doctor) throw new Error('Doctor not found after create')
  return doctor
}

// ---------------------------------------------------------------------------
// Billing — bills are derived per-patient from patient.sections x a rate card,
// with per-patient-per-section overrides. Both the bill and the doctor's
// incentive report read through the same priceFor(), so an edited amount
// stays consistent everywhere it appears.
// ---------------------------------------------------------------------------

export interface BillingContext {
  rateCard: RateCardEntry[]
  items: BillItem[]
}

export async function loadBillingContext(): Promise<BillingContext> {
  const [rateCard, items] = await Promise.all([
    window.api.billing.rateCard() as unknown as Promise<RateCardEntry[]>,
    window.api.billing.allItems() as unknown as Promise<BillItem[]>
  ])
  return { rateCard, items }
}

export function priceFor(ctx: BillingContext, patientId: number, section: string): number {
  const override = ctx.items.find((it) => it.patient_id === patientId && it.section === section)
  if (override) return override.amount
  return ctx.rateCard.find((r) => r.section === section)?.amount ?? 0
}

export async function setBillItemAmount(patientId: number, section: string, amount: number): Promise<void> {
  await window.api.billing.setItemAmount(patientId, section, Math.max(0, amount))
}

export interface BillLineItem {
  sno: number
  investigation: string
  amount: number
}

export function billLineItemsFor(ctx: BillingContext, patient: Patient): BillLineItem[] {
  return patient.sections.map((section, i) => ({
    sno: i + 1,
    investigation: section,
    amount: priceFor(ctx, patient.id, section)
  }))
}

export function billTotalFor(ctx: BillingContext, patient: Patient): number {
  return billLineItemsFor(ctx, patient).reduce((sum, r) => sum + r.amount, 0)
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

/** One row per (patient x investigation) referred by this doctor, oldest first, numbered for the printed report. */
export function incentiveLineItemsFor(ctx: BillingContext, patients: Patient[], doctorName: string): IncentiveLineItem[] {
  const rows: IncentiveLineItem[] = []
  const referred = patients
    .filter((p) => p.referredBy === doctorName)
    .sort((a, b) => a.date.localeCompare(b.date))

  for (const p of referred) {
    for (const section of p.sections) {
      rows.push({
        sno: 0,
        date: p.date,
        patientSid: p.sid,
        patientName: p.name,
        gender: p.gender,
        investigation: section,
        amount: priceFor(ctx, p.id, section)
      })
    }
  }
  return rows.map((r, i) => ({ ...r, sno: i + 1 }))
}

export function incentiveTotalFor(ctx: BillingContext, patients: Patient[], doctorName: string): number {
  return incentiveLineItemsFor(ctx, patients, doctorName).reduce((sum, r) => sum + r.amount, 0)
}

// ---------------------------------------------------------------------------
// Lab settings
// ---------------------------------------------------------------------------

export interface LabSettingsForm {
  labName: string
  labAddress: string
  labPhone: string
  labEmail: string
  labDoctor: string
  // Degrees/certifications printed smaller, under the name, on the sign-off line (e.g. "M.Sc.
  // (Biochem), DMLT, DMRT, DCA") — a separate field from labDoctor so editing one can't mangle
  // the other (see ReportPreview.tsx's sign-off block, which used to guess this apart from a
  // single free-typed field by finding the first comma).
  labDoctorQualifications: string
  // The institution named on the report's quality-control line (e.g. "CMC Hospital, Vellore."),
  // shown only when set — see ReportLetterhead.tsx's 'report' footer.
  labQualityCheck: string
}

export async function getLabSettings(): Promise<LabSettingsForm> {
  const raw = await window.api.settings.get()
  return {
    labName: raw.lab_name || 'Your Lab Name',
    labAddress: raw.lab_address || '',
    labPhone: raw.lab_phone || '',
    labEmail: raw.lab_email || '',
    labDoctor: raw.lab_doctor || '',
    labDoctorQualifications: raw.lab_doctor_qualifications || '',
    labQualityCheck: raw.lab_quality_check || ''
  }
}

// A profile's extra header badge (e.g. a "25 years of service" seal) — optional, no in-app
// picker (unlike the logo): it's fixed branding, staged once per profile (see profiles/README.md).
export async function getBadgeDataUrl(): Promise<string | null> {
  return window.api.branding.getBadge()
}

// A profile's certification/accreditation logos, shown together on the report footer.
export async function getCertificationDataUrls(): Promise<string[]> {
  return window.api.branding.getCertifications()
}

// A logo picked from Settings, if any — otherwise whatever the active vendor profile staged
// (see profiles/README.md), otherwise null (falls back to the plain text wordmark everywhere
// it's used: Shell header, report letterhead).
export async function getLogoDataUrl(): Promise<string | null> {
  return window.api.branding.getLogo()
}

export async function setLogoDataUrl(dataUrl: string): Promise<void> {
  await window.api.branding.setLogo(dataUrl)
}

export async function clearLogoDataUrl(): Promise<void> {
  await window.api.branding.clearLogo()
}

// Dev-only vendor-profile listing (see profiles/README.md) — the main process itself gates
// these to is.dev, so a packaged build gets an empty list / null even if this were still called.
export async function listProfiles(): Promise<string[]> {
  return window.api.profiles.list()
}

export async function getProfile(name: string): Promise<LabSettingsForm | null> {
  return window.api.profiles.get(name)
}

export async function getProfileLogo(name: string): Promise<string | null> {
  return window.api.profiles.getLogo(name)
}

// Saves whatever's currently on screen as a new (or updated) profile on disk, so a demo/pitch
// session can capture a vendor's branding without hand-writing profiles/<name>/config.json.
// Returns the actual slug it saved under (names are sanitized), or false if the name was empty.
export async function saveProfile(name: string, form: LabSettingsForm, logoDataUrl: string | null): Promise<string | false> {
  return window.api.profiles.save(name, form, logoDataUrl)
}

// "dev" refuses to delete itself (see the main-process handler) — it's the generic profile every
// clone expects to exist.
export async function deleteProfile(name: string): Promise<boolean> {
  return window.api.profiles.delete(name)
}

// ---------------------------------------------------------------------------
// Reference range overrides — lab-wide, apply to every patient from then on.
// Stored as one JSON blob under a single lab_settings key rather than a new table, since it's
// a small sparse map (only fields someone actually chose to customize, not all ~150 of them).
// ---------------------------------------------------------------------------

const RANGE_OVERRIDES_KEY = 'reference_range_overrides'

export async function getRangeOverrides(): Promise<Record<string, string>> {
  const raw = await window.api.settings.get()
  const stored = raw[RANGE_OVERRIDES_KEY]
  if (!stored) return {}
  try {
    return JSON.parse(stored)
  } catch {
    return {}
  }
}

// null (the "Reset to default" button) clears the override entirely, falling back to the
// clinical default in FIELD_META. An explicit '' is a real, distinct override, not a reset — it's
// how a field's reference gets hidden without hiding the whole section (see the "Show reference
// values" checkbox for that): clear the box in RangeEditor and save, and getReferenceRange
// returns '' for that field from then on instead of falling through to the default.
export async function setRangeOverride(key: string, range: string | null): Promise<Record<string, string>> {
  const current = await getRangeOverrides()
  const next = { ...current }
  if (range === null) {
    delete next[key]
  } else {
    next[key] = range
  }
  await window.api.settings.set(RANGE_OVERRIDES_KEY, JSON.stringify(next))
  return next
}

// ---------------------------------------------------------------------------
// Reference column visibility — lab-wide, per section (e.g. a lab that doesn't want a reference
// column on urine reports at all). Same one-JSON-blob approach as the range overrides above:
// only sections someone actually hid need an entry; every other section defaults to shown.
// ---------------------------------------------------------------------------

const HIDDEN_REFERENCE_SECTIONS_KEY = 'hidden_reference_sections'

export async function getHiddenReferenceSections(): Promise<Record<string, boolean>> {
  const raw = await window.api.settings.get()
  const stored = raw[HIDDEN_REFERENCE_SECTIONS_KEY]
  if (!stored) return {}
  try {
    return JSON.parse(stored)
  } catch {
    return {}
  }
}

export async function setReferenceSectionHidden(sectionKey: string, hidden: boolean): Promise<Record<string, boolean>> {
  const current = await getHiddenReferenceSections()
  const next = { ...current }
  if (hidden) next[sectionKey] = true
  else delete next[sectionKey]
  await window.api.settings.set(HIDDEN_REFERENCE_SECTIONS_KEY, JSON.stringify(next))
  return next
}

// Writes lab_name along with everything else. On a licensed build, main process's lockLabName()
// re-asserts the license's name on every launch (see electron/main/index.ts), so this only
// actually sticks when running unlicensed — this demo/pitch build included.
export async function saveLabSettings(form: LabSettingsForm): Promise<void> {
  await Promise.all([
    window.api.settings.set('lab_name', form.labName),
    window.api.settings.set('lab_address', form.labAddress),
    window.api.settings.set('lab_phone', form.labPhone),
    window.api.settings.set('lab_email', form.labEmail),
    window.api.settings.set('lab_doctor', form.labDoctor),
    window.api.settings.set('lab_doctor_qualifications', form.labDoctorQualifications),
    window.api.settings.set('lab_quality_check', form.labQualityCheck)
  ])
}
