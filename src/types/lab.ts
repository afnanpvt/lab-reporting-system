export type Gender = 'M' | 'F'
export type AgeUnit = 'Y' | 'M' | 'D'

export interface Patient {
  id: number
  sid: string
  name: string
  age: number
  age_unit: AgeUnit
  gender: Gender
  address?: string
  mobile?: string
  status?: 'draft' | 'completed'
  consent_given?: number
  referred_by: string
  reg_date: string
  reg_time: string
  rpt_date: string
  rpt_time: string
  sections: string[]
  created_at: string
}

export interface PatientWithResults extends Patient {
  results: AllResults
}

export interface Doctor {
  id: number
  name: string
  specialty: string
  phone: string
  created_at: string
}

export interface RateCardEntry {
  section: string
  amount: number
}

export interface BillItem {
  patient_id: number
  section: string
  amount: number
}

export interface LabSettings {
  lab_name: string
  lab_address: string
  lab_phone: string
  lab_doctor: string
  default_printer: string
  sid_counter: string
}

export interface HaematologyResult {
  patient_id?: number
  haemoglobin?: string
  rbc_count?: string
  pcv?: string
  total_wbc?: string
  neutrophils?: string
  eosinophils?: string
  basophils?: string
  lymphocytes?: string
  monocytes?: string
  esr?: string
  esr_quarter?: string
  esr_half?: string
  esr_3quarter?: string
  esr_one?: string
  abs_eosinophil?: string
  platelet_count?: string
  reticulocyte?: string
  mcv?: string
  mch?: string
  mchc?: string
  smear_mp?: string
  smear_mf?: string
  bleeding_time?: string
  clotting_time?: string
  blood_group?: string
  rh_typing?: string
  ict?: string
  dct?: string
}

export interface BiochemistryResult {
  patient_id?: number
  glucose_f?: string
  glucose_pp?: string
  glucose_r?: string
  blood_urea?: string
  blood_urea_pre?: string
  blood_urea_post?: string
  s_creatinine?: string
  s_uric_acid?: string
  s_cholesterol?: string
  s_triglycerides?: string
  sgpt?: string
  sgot?: string
  alk_phosphatase?: string
  total_protein?: string
  albumin?: string
  globulin?: string
  s_calcium?: string
  s_phosphorus?: string
  hb_a1c?: string
  vitamin_d?: string
  bilirubin_total?: string
  bilirubin_direct?: string
  bilirubin_indirect?: string
  // Optional "method used" note for Blood Sugar (e.g. glucose_f_method) — see SerologyResult's
  // matching comment above; same idea, just the two fields Super Lab's old system recorded it for.
  [key: `${string}_method`]: string | undefined
}

export interface SerologyResult {
  patient_id?: number
  widal_o?: string
  widal_h?: string
  widal_ah?: string
  widal_bh?: string
  vdrl?: string
  tpha?: string
  hiv1?: string
  hiv2?: string
  hbs_ag?: string
  hcv?: string
  ra_factor?: string
  aso?: string
  crp?: string
  dengue_igg?: string
  dengue_igm?: string
  dengue_ns1?: string
  troponin?: string
  sero_mtb_igg?: string
  sero_mtb_igm?: string
  malaria?: string
  chikungunya?: string
  // Optional "method/kit used" note per test (e.g. widal_o_method), shown under the result and
  // printed alongside it when filled in — see ResultEntry.tsx's FieldRow and ReportPreview.tsx.
  // Super Lab's old system recorded exactly this for rapid/kit-based tests ("(SD Diagnostics)",
  // "(Roche Diagnostics)") as a free-text afterthought; this makes it a real field instead.
  [key: `${string}_method`]: string | undefined
}

export interface UrineResult {
  patient_id?: number
  colour?: string
  appearance?: string
  reaction?: string
  albumin?: string
  sugar?: string
  ketone?: string
  bile_salt?: string
  bile_pigment?: string
  urobilinogen?: string
  occult_blood?: string
  nitrites?: string
  ph?: string
  specific_gravity?: string
  pregnancy_test?: string
  pus_cells?: string
  rbc?: string
  epithelial_cells?: string
  casts?: string
  crystals?: string
  flagellates?: string
  other_findings?: string
  bilirubin?: string
  blood_rbc?: string
  leucocytes?: string
  urine_sugar_f?: string
  urine_sugar_pp?: string
  urine_sugar_r?: string
}

export const ANTIBIOTICS = [
  { key: 'amikacin', label: 'Amikacin' },
  { key: 'amoxicillin', label: 'Amoxicillin' },
  { key: 'ampicillin', label: 'Ampicillin' },
  { key: 'azithromycin', label: 'Azithromycin' },
  { key: 'cefazolin', label: 'Cefazolin' },
  { key: 'cefotaxime', label: 'Cefotaxime' },
  { key: 'ceftazidime', label: 'Ceftazidime' },
  { key: 'ceftriaxone', label: 'Ceftriaxone' },
  { key: 'cephalexin', label: 'Cephalexin' },
  { key: 'chloramphenicol', label: 'Chloramphenicol' },
  { key: 'ciprofloxacin', label: 'Ciprofloxacin' },
  { key: 'clarithromycin', label: 'Clarithromycin' },
  { key: 'cotrimoxazole', label: 'Co-trimoxazole' },
  { key: 'gentamicin', label: 'Gentamicin' },
  { key: 'nitrofurantoin', label: 'Nitrofurantoin' },
  { key: 'norfloxacin', label: 'Norfloxacin' },
  { key: 'ofloxacin', label: 'Ofloxacin' },
  { key: 'tetracycline', label: 'Tetracycline' },
  { key: 'tobramycin', label: 'Tobramycin' },
  { key: 'vancomycin', label: 'Vancomycin' }
] as const

export interface CultureSensitivityResult {
  patient_id?: number
  specimen?: string
  organism?: string
  colony_count?: string
  remarks?: string
  [abxKey: string]: string | number | undefined
}

export interface AllResults {
  haematology: HaematologyResult
  biochemistry: BiochemistryResult
  serology: SerologyResult
  urine: UrineResult
  cs: CultureSensitivityResult
  [key: string]: Record<string, string | undefined>
}

export const SECTIONS = [
  { key: 'haematology', label: 'Haematology' },
  { key: 'biochemistry', label: 'Biochemistry' },
  { key: 'serology', label: 'Serology' },
  { key: 'urine', label: 'Urine' },
  { key: 'motion', label: 'Motion' },
  { key: 'cs', label: 'C.S.' },
  { key: 'mantoux', label: 'Mantoux' },
  { key: 'gtt_lipid', label: 'GTT / SA / Lipid' },
  { key: 'blood', label: 'Blood' },
  { key: 'electrolytes', label: 'Electrolytes' },
  { key: 'lft', label: 'L.F.T.' },
  { key: 'abg_sputum', label: 'ABG / Sputum' },
  { key: 'others', label: 'Others' }
]

/** Every data field per section, excluding patient_id — used to compute completion state (empty/partial/complete) for the result-entry rail. Kept in sync with the *Result interfaces and the culture_sensitivity DB columns by hand; this is a small, stable clinical schema. */
export const SECTION_FIELD_KEYS: Record<string, string[]> = {
  haematology: [
    'haemoglobin', 'rbc_count', 'pcv', 'total_wbc',
    'neutrophils', 'eosinophils', 'basophils', 'lymphocytes', 'monocytes',
    'esr', 'esr_quarter', 'esr_half', 'esr_3quarter', 'esr_one',
    'abs_eosinophil', 'platelet_count', 'reticulocyte', 'mcv', 'mch', 'mchc',
    'smear_mp', 'smear_mf', 'bleeding_time', 'clotting_time',
    'blood_group', 'rh_typing', 'ict', 'dct'
  ],
  biochemistry: [
    'glucose_f', 'glucose_pp', 'glucose_r', 'blood_urea', 'blood_urea_pre', 'blood_urea_post',
    's_creatinine', 's_uric_acid', 's_cholesterol', 's_triglycerides', 'sgpt', 'sgot',
    'alk_phosphatase', 'total_protein', 'albumin', 'globulin', 's_calcium', 's_phosphorus',
    'hb_a1c', 'vitamin_d', 'bilirubin_total', 'bilirubin_direct', 'bilirubin_indirect'
  ],
  serology: [
    'widal_o', 'widal_h', 'widal_ah', 'widal_bh', 'vdrl', 'tpha', 'hiv1', 'hiv2',
    'hbs_ag', 'hcv', 'ra_factor', 'aso', 'crp', 'dengue_igg', 'dengue_igm', 'dengue_ns1',
    'troponin', 'sero_mtb_igg', 'sero_mtb_igm', 'malaria', 'chikungunya'
  ],
  urine: [
    'colour', 'appearance', 'reaction', 'ph', 'specific_gravity',
    'albumin', 'sugar', 'ketone', 'bile_salt', 'bile_pigment', 'urobilinogen',
    'occult_blood', 'nitrites', 'bilirubin', 'pregnancy_test',
    'pus_cells', 'rbc', 'epithelial_cells', 'casts', 'crystals', 'flagellates',
    'blood_rbc', 'leucocytes', 'other_findings',
    'urine_sugar_f', 'urine_sugar_pp', 'urine_sugar_r'
  ],
  motion: ['colour', 'consistency', 'reaction', 'blood', 'mucus', 'pus_cells', 'rbc', 'ova_cyst', 'trophozoites', 'yeast_cells', 'fat_globules', 'other'],
  cs: ['specimen', 'organism', 'colony_count', 'remarks', ...ANTIBIOTICS.map((a) => 'abx_' + a.key)],
  mantoux: ['reading', 'interpretation', 'remarks'],
  gtt_lipid: ['fasting', 'one_hour', 'two_hour', 'three_hour', 's_amylase', 'total_cholesterol', 'hdl', 'ldl', 'vldl', 'triglycerides', 'cholesterol_hdl_ratio'],
  blood: ['blood_group', 'rh_type', 'cross_match', 'direct_coombs', 'indirect_coombs'],
  electrolytes: ['sodium', 'potassium', 'chloride', 'bicarbonate', 'calcium', 'phosphorus', 'magnesium'],
  lft: ['bilirubin_total', 'bilirubin_direct', 'bilirubin_indirect', 'sgot', 'sgpt', 'alk_phosphatase', 'ggt', 'total_protein', 'albumin', 'globulin', 'ag_ratio', 'pt', 'inr'],
  abg_sputum: ['ph', 'po2', 'pco2', 'hco3', 'o2_sat', 'base_excess', 'fio2', 'sputum_appearance', 'afb_smear', 'culture']
}

export type CompletionState = 'empty' | 'partial' | 'complete'

export function getCompletionState(sectionKey: string, data: Record<string, string | undefined>): CompletionState {
  // 'others' has no fixed field list — each row's name is typed by the user, so
  // completion is judged by rows entered / rows with a value, not a schema length.
  // '__label' is a reserved key for the section's custom display name, not a test row.
  if (sectionKey === 'others') {
    const rows = Object.keys(data).filter((k) => k !== '__label')
    if (rows.length === 0) return 'empty'
    const filled = rows.filter((k) => data[k] && data[k]!.trim() !== '').length
    if (filled === 0) return 'partial'
    return filled === rows.length ? 'complete' : 'partial'
  }
  const keys = SECTION_FIELD_KEYS[sectionKey] ?? []
  if (keys.length === 0) return 'empty'
  const filled = keys.filter((k) => data[k] && data[k]!.trim() !== '').length
  if (filled === 0) return 'empty'
  if (filled === keys.length) return 'complete'
  return 'partial'
}

/** Haematology's legacy sub-panels, preserved from the original screen structure per the UX brief — presentation grouping only, the underlying fields/keys are unchanged. */
export const HAEMATOLOGY_SUBGROUPS = [
  { id: 'cbc', label: 'Complete Blood Count', keys: ['haemoglobin', 'rbc_count', 'pcv', 'total_wbc', 'abs_eosinophil', 'platelet_count', 'reticulocyte', 'mcv', 'mch', 'mchc', 'smear_mp', 'smear_mf'] },
  { id: 'differential', label: 'Differential Leucocyte Count', keys: ['neutrophils', 'eosinophils', 'basophils', 'lymphocytes', 'monocytes'] },
  { id: 'esr', label: 'ESR', keys: ['esr', 'esr_quarter', 'esr_half', 'esr_3quarter', 'esr_one'] },
  { id: 'coagulation', label: 'Coagulation', keys: ['bleeding_time', 'clotting_time'] },
  { id: 'blood-group', label: 'Blood Group', keys: ['blood_group', 'rh_typing', 'ict', 'dct'] }
] as const
