import { SECTIONS, SECTION_FIELD_KEYS } from '../../types/lab'

export { SECTIONS, SECTION_FIELD_KEYS }

const LABEL_OVERRIDES: Record<string, string> = {
  esr: 'ESR', esr_quarter: 'ESR (1/4 hr)', esr_half: 'ESR (1/2 hr)', esr_3quarter: 'ESR (3/4 hr)', esr_one: 'ESR (1 hr)',
  mcv: 'MCV', mch: 'MCH', mchc: 'MCHC', rbc_count: 'RBC Count', pcv: 'PCV', total_wbc: 'Total WBC',
  ict: 'ICT', dct: 'DCT', rh_typing: 'Rh Typing', hb_a1c: 'HbA1c',
  sgpt: 'SGPT', sgot: 'SGOT', s_creatinine: 'S. Creatinine', s_uric_acid: 'S. Uric Acid',
  s_cholesterol: 'S. Cholesterol', s_triglycerides: 'S. Triglycerides', s_calcium: 'S. Calcium', s_phosphorus: 'S. Phosphorus',
  hiv1: 'HIV I', hiv2: 'HIV II', hbs_ag: 'HBsAg', hcv: 'HCV', vdrl: 'VDRL', tpha: 'TPHA',
  ra_factor: 'RA Factor', aso: 'ASO', crp: 'CRP', widal_o: 'Widal O', widal_h: 'Widal H',
  widal_ah: 'Widal AH', widal_bh: 'Widal BH', dengue_igg: 'Dengue IgG', dengue_igm: 'Dengue IgM',
  dengue_ns1: 'Dengue NS1', sero_mtb_igg: 'MTB IgG', sero_mtb_igm: 'MTB IgM',
  ph: 'pH', po2: 'pO2', pco2: 'pCO2', hco3: 'HCO3', o2_sat: 'O2 Saturation', fio2: 'FiO2',
  afb_smear: 'AFB Smear', pt: 'PT', inr: 'INR', ggt: 'GGT', ag_ratio: 'A/G Ratio'
}

/** "09:14" -> "09:14 AM", "14:30" -> "02:30 PM" — every stored time is 24-hour; this is the one place that renders it for display. */
export function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':')
  const h24 = parseInt(hStr, 10)
  if (isNaN(h24)) return time24
  const period = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${String(h12).padStart(2, '0')}:${mStr} ${period}`
}

export function humanizeKey(key: string): string {
  if (LABEL_OVERRIDES[key]) return LABEL_OVERRIDES[key]
  return key
    .split('_')
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(' ')
}

export function sectionKeyForLabel(label: string): string | undefined {
  return SECTIONS.find((s) => s.label === label)?.key
}

type RangeValue = string | { M: string; F: string }
type FieldMeta = { unit: string; range: RangeValue }

/** Reference ranges and units, lifted from the real section components (Haematology.tsx, Biochemistry.tsx, etc.) so the mockup shows the same clinical defaults as the actual app. Keyed per-section since a few field keys (e.g. bilirubin_total) repeat across sections with different ranges. */
const FIELD_META: Record<string, Record<string, FieldMeta>> = {
  haematology: {
    haemoglobin: { unit: 'gm/dl', range: { F: '11.0–15.0 gm/dl', M: '13.0–17.0 gm/dl' } },
    rbc_count: { unit: 'm/cumm', range: { F: '4.2–5.4 m/cumm', M: '4.6–6.0 m/cumm' } },
    pcv: { unit: '%', range: { F: '36–47%', M: '40–54%' } },
    total_wbc: { unit: 'cells/cumm', range: '4000–11000 cells/cumm' },
    abs_eosinophil: { unit: '/cumm', range: '40–440/cumm' },
    platelet_count: { unit: 'lakhs/cumm', range: '1.5–4.0 lakhs/cumm' },
    reticulocyte: { unit: '%', range: 'Upto 2.0%' },
    mcv: { unit: 'cu microns', range: '78–94 cu microns' },
    mch: { unit: 'pg', range: '27–32 pg' },
    mchc: { unit: '%', range: '30–36%' },
    smear_mp: { unit: '', range: '' },
    smear_mf: { unit: '', range: '' },
    neutrophils: { unit: '%', range: '40–75%' },
    eosinophils: { unit: '%', range: '2–6%' },
    basophils: { unit: '%', range: '0–1%' },
    lymphocytes: { unit: '%', range: '25–40%' },
    monocytes: { unit: '%', range: '2–8%' },
    esr: { unit: 'mm/hr', range: { F: '0–20 mm/hr', M: '0–15 mm/hr' } },
    esr_quarter: { unit: 'mm', range: '' },
    esr_half: { unit: 'mm', range: { F: '0–15 mm/hr', M: '0–10 mm/hr' } },
    esr_3quarter: { unit: 'mm', range: '' },
    esr_one: { unit: 'mm', range: '' },
    bleeding_time: { unit: 'min', range: '1–3 minutes' },
    clotting_time: { unit: 'min', range: '3–10 minutes' },
    blood_group: { unit: '', range: '' },
    rh_typing: { unit: '', range: '' },
    ict: { unit: '', range: 'Negative' },
    dct: { unit: '', range: 'Negative' }
  },
  biochemistry: {
    glucose_f: { unit: 'mg/dl', range: '70.0–110.0 mg/dl' },
    glucose_pp: { unit: 'mg/dl', range: 'Upto 140.0 mg/dl' },
    glucose_r: { unit: 'mg/dl', range: 'Upto 120.0 mg/dl' },
    blood_urea: { unit: 'mg/dl', range: '10.0–50.0 mg/dl' },
    blood_urea_pre: { unit: 'mg/dl', range: '' },
    blood_urea_post: { unit: 'mg/dl', range: '' },
    s_creatinine: { unit: 'mg/dl', range: { F: '0.5–1.2 mg/dl', M: '0.7–1.3 mg/dl' } },
    s_uric_acid: { unit: 'mg/dl', range: { F: '2.7–6.5 mg/dl', M: '3.5–7.2 mg/dl' } },
    s_cholesterol: { unit: 'mg/dl', range: '140–200.0 mg/dl' },
    s_triglycerides: { unit: 'mg/dl', range: '40.0–160.0 mg/dl' },
    sgpt: { unit: 'IU/L', range: 'Upto 49 IU/L' },
    sgot: { unit: 'IU/L', range: 'Upto 40 IU/L' },
    alk_phosphatase: { unit: 'IU/L', range: '180–1200 IU/L' },
    total_protein: { unit: 'gm/dl', range: '6.0–8.0 gm/dl' },
    albumin: { unit: 'gm/dl', range: '3.7–5.3 gm/dl' },
    globulin: { unit: 'gm/dl', range: '2.3–3.5 gm/dl' },
    s_calcium: { unit: 'mg/dl', range: '8.5–11.0 mg/dl' },
    s_phosphorus: { unit: 'mg/dl', range: '2.5–5.0 mg/dl' },
    hb_a1c: { unit: '%', range: '4.0–5.6%' },
    vitamin_d: { unit: 'ng/mL', range: '30–100 ng/mL' },
    bilirubin_total: { unit: 'mg/dl', range: 'Upto 1.0 mg/dl' },
    bilirubin_direct: { unit: 'mg/dl', range: '0.0–0.5 mg/dl' },
    bilirubin_indirect: { unit: 'mg/dl', range: '' }
  },
  serology: {
    widal_o: { unit: '', range: 'Negative < 1:20' },
    widal_h: { unit: '', range: 'Negative < 1:20' },
    widal_ah: { unit: '', range: 'Negative < 1:20' },
    widal_bh: { unit: '', range: 'Negative < 1:20' },
    vdrl: { unit: '', range: 'Non-Reactive' },
    tpha: { unit: '', range: 'Non-Reactive' },
    hiv1: { unit: '', range: 'Negative' },
    hiv2: { unit: '', range: 'Negative' },
    hbs_ag: { unit: '', range: 'Negative' },
    hcv: { unit: '', range: 'Negative' },
    ra_factor: { unit: '', range: 'Negative' },
    aso: { unit: '', range: 'Negative' },
    crp: { unit: '', range: 'Negative' },
    dengue_igg: { unit: '', range: 'Negative' },
    dengue_igm: { unit: '', range: 'Negative' },
    dengue_ns1: { unit: '', range: 'Negative' },
    troponin: { unit: '', range: 'Negative' },
    sero_mtb_igg: { unit: '', range: 'Negative' },
    sero_mtb_igm: { unit: '', range: 'Negative' },
    malaria: { unit: '', range: 'Negative' },
    chikungunya: { unit: '', range: 'Negative' }
  },
  urine: {
    ph: { unit: '', range: '4.6–8.0' },
    specific_gravity: { unit: '', range: '1.005–1.030' },
    albumin: { unit: '', range: 'Nil' },
    sugar: { unit: '', range: 'Nil' },
    ketone: { unit: '', range: 'Nil' },
    bile_salt: { unit: '', range: 'Nil' },
    bile_pigment: { unit: '', range: 'Nil' },
    urobilinogen: { unit: '', range: 'Normal' },
    occult_blood: { unit: '', range: 'Nil' },
    nitrites: { unit: '', range: 'Nil' },
    bilirubin: { unit: '', range: 'Nil' },
    pus_cells: { unit: '/HPF', range: '0–4/HPF' },
    rbc: { unit: '/HPF', range: '0–2/HPF' },
    epithelial_cells: { unit: '', range: 'Few' },
    casts: { unit: '', range: 'Nil' },
    crystals: { unit: '', range: 'Nil' },
    flagellates: { unit: '', range: 'Nil' },
    urine_sugar_f: { unit: 'mg/dl', range: '' },
    urine_sugar_pp: { unit: 'mg/dl', range: '' },
    urine_sugar_r: { unit: 'mg/dl', range: '' }
  },
  lft: {
    bilirubin_total: { unit: 'mg/dl', range: '0.2–1.0 mg/dl' },
    bilirubin_direct: { unit: 'mg/dl', range: '0.0–0.5 mg/dl' },
    bilirubin_indirect: { unit: 'mg/dl', range: '0.2–0.8 mg/dl' },
    sgot: { unit: 'IU/L', range: 'Upto 40 IU/L' },
    sgpt: { unit: 'IU/L', range: 'Upto 49 IU/L' },
    alk_phosphatase: { unit: 'IU/L', range: '180–1200 IU/L' },
    ggt: { unit: 'IU/L', range: '11–49 IU/L' },
    total_protein: { unit: 'gm/dl', range: '6.0–8.0 gm/dl' },
    albumin: { unit: 'gm/dl', range: '3.7–5.3 gm/dl' },
    globulin: { unit: 'gm/dl', range: '2.3–3.5 gm/dl' },
    ag_ratio: { unit: '', range: '1.0–2.0' },
    pt: { unit: 'sec', range: '11–13.5 sec' },
    inr: { unit: '', range: '0.9–1.1' }
  },
  mantoux: {
    reading: { unit: 'mm', range: '< 10 mm Negative' }
  },
  gtt_lipid: {
    fasting: { unit: 'mg/dl', range: '70–110 mg/dl' },
    one_hour: { unit: 'mg/dl', range: '< 180 mg/dl' },
    two_hour: { unit: 'mg/dl', range: '< 140 mg/dl' },
    three_hour: { unit: 'mg/dl', range: '< 110 mg/dl' },
    s_amylase: { unit: 'U/L', range: '30–110 U/L' },
    total_cholesterol: { unit: 'mg/dl', range: '< 200 mg/dl' },
    hdl: { unit: 'mg/dl', range: '> 40 mg/dl' },
    ldl: { unit: 'mg/dl', range: '< 130 mg/dl' },
    vldl: { unit: 'mg/dl', range: '< 30 mg/dl' },
    triglycerides: { unit: 'mg/dl', range: '< 150 mg/dl' },
    cholesterol_hdl_ratio: { unit: '', range: '< 5.0' }
  },
  electrolytes: {
    sodium: { unit: 'mEq/L', range: '136–145 mEq/L' },
    potassium: { unit: 'mEq/L', range: '3.5–5.0 mEq/L' },
    chloride: { unit: 'mEq/L', range: '98–106 mEq/L' },
    bicarbonate: { unit: 'mEq/L', range: '22–28 mEq/L' },
    calcium: { unit: 'mg/dl', range: '8.5–11.0 mg/dl' },
    phosphorus: { unit: 'mg/dl', range: '2.5–5.0 mg/dl' },
    magnesium: { unit: 'mg/dl', range: '1.7–2.2 mg/dl' }
  },
  abg_sputum: {
    ph: { unit: '', range: '7.35–7.45' },
    po2: { unit: 'mmHg', range: '80–100 mmHg' },
    pco2: { unit: 'mmHg', range: '35–45 mmHg' },
    hco3: { unit: 'mEq/L', range: '22–26 mEq/L' },
    o2_sat: { unit: '%', range: '95–100%' },
    base_excess: { unit: '', range: '-2 to +2' },
    fio2: { unit: '%', range: '' }
  }
}

/** The key a lab-wide range override is stored under — gender-specific only for fields whose default range actually differs by sex, so a single override on a non-gendered field (e.g. Total WBC) applies to every patient regardless of gender. */
export function rangeOverrideKey(sectionKey: string, fieldKey: string, gender?: string): string {
  const meta = FIELD_META[sectionKey]?.[fieldKey]
  const gendered = meta && typeof meta.range === 'object'
  return gendered ? `${sectionKey}.${fieldKey}.${gender === 'F' ? 'F' : 'M'}` : `${sectionKey}.${fieldKey}`
}

/**
 * Reference range for a field, resolved to the patient's gender when the range differs by sex.
 * Falls back to '' for fields without a defined clinical range (free-text or specimen-style
 * fields). `overrides` is the lab-wide customization map from Settings (see api.ts) — when a
 * field has been overridden, that replaces the hardcoded clinical default; anything not present
 * in the map falls through to FIELD_META exactly as before overrides existed.
 */
export function getReferenceRange(sectionKey: string, fieldKey: string, gender?: string, overrides?: Record<string, string>): string {
  const override = overrides?.[rangeOverrideKey(sectionKey, fieldKey, gender)]
  if (override !== undefined) return override
  const meta = FIELD_META[sectionKey]?.[fieldKey]
  if (!meta) return ''
  if (typeof meta.range === 'string') return meta.range
  return gender === 'F' ? meta.range.F : meta.range.M
}

/** The unedited clinical default for a field — what "Reset to default" restores, ignoring any override. */
export function defaultReferenceRange(sectionKey: string, fieldKey: string, gender?: string): string {
  const meta = FIELD_META[sectionKey]?.[fieldKey]
  if (!meta) return ''
  if (typeof meta.range === 'string') return meta.range
  return gender === 'F' ? meta.range.F : meta.range.M
}

export function unitFor(sectionKey: string, fieldKey: string): string {
  return FIELD_META[sectionKey]?.[fieldKey]?.unit ?? ''
}

/**
 * 'Others' rows have no fixed unit/reference — staff can type their own per row, unlike every
 * fixed section where both come from FIELD_META. Since the whole section is still stored as
 * Record<testName, string> (see custom_results in the DB), a row's value/unit/reference are
 * packed into that single string as JSON rather than widening the storage shape everywhere.
 * A row saved before this existed decodes as a plain result with blank unit/reference.
 */
export interface OtherRow { value: string; unit: string; reference: string }

export function decodeOtherRow(raw: string | undefined): OtherRow {
  if (!raw) return { value: '', unit: '', reference: '' }
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && 'value' in parsed) {
      return { value: String(parsed.value ?? ''), unit: String(parsed.unit ?? ''), reference: String(parsed.reference ?? '') }
    }
  } catch {
    // not JSON — a plain result string from before per-row unit/reference existed
  }
  return { value: raw, unit: '', reference: '' }
}

export function encodeOtherRow(row: OtherRow): string {
  if (!row.unit && !row.reference) return row.value
  return JSON.stringify(row)
}

function decimalPlaces(numStr: string): number {
  const i = numStr.indexOf('.')
  return i === -1 ? 0 : numStr.length - i - 1
}

export interface NumericRangeInfo {
  min: number
  max: number
  /** Smallest sensible increment — 0.1 for a range written as "13.0–17.0", 1 for "0–15", etc.,
   * so ArrowUp/ArrowDown steps (see FieldRow) match the precision the range was defined at. */
  step: number
  decimals: number
}

function rangeInfo(minStr: string, maxStr: string): NumericRangeInfo {
  const decimals = Math.max(decimalPlaces(minStr), decimalPlaces(maxStr))
  return { min: parseFloat(minStr), max: parseFloat(maxStr), step: decimals > 0 ? 1 / 10 ** decimals : 1, decimals }
}

/** Extracts [min, max] (plus step/decimals — see NumericRangeInfo) from a reference range string
 * like "13.0–17.0 gm/dl", "Upto 140.0 mg/dl", "> 40 mg/dl", "< 200 mg/dl", or "-2 to +2". Returns
 * null for non-numeric ranges (e.g. "Negative", "Nil"). */
export function numericRangeInfo(range: string): NumericRangeInfo | null {
  if (!range) return null
  const clean = range.replace(/,/g, '')
  let m = clean.match(/(-?\d+(?:\.\d+)?)\s*[–-]\s*(-?\d+(?:\.\d+)?)/)
  if (m) return rangeInfo(m[1], m[2])
  m = clean.match(/upto\s*(-?\d+(?:\.\d+)?)/i)
  if (m) return rangeInfo('0', m[1])
  m = clean.match(/^\s*>\s*(-?\d+(?:\.\d+)?)/)
  if (m) return rangeInfo(m[1], String(parseFloat(m[1]) * 1.3))
  m = clean.match(/^\s*<\s*(-?\d+(?:\.\d+)?)/)
  if (m) return rangeInfo('0', m[1])
  m = clean.match(/(-?\d+(?:\.\d+)?)\s*to\s*\+?(-?\d+(?:\.\d+)?)/i)
  if (m) return rangeInfo(m[1], m[2])
  return null
}

/** Turns a reference range into a real, editable starting value — the midpoint for a numeric range, or the plain qualitative word for text ranges (e.g. "Negative < 1:20" -> "Negative"). Used to let a technician click the range to prefill the field rather than type the normal reading from scratch. */
export function defaultValueForRange(range: string): string {
  if (!range) return ''
  const info = numericRangeInfo(range)
  if (info) {
    const mid = (info.min + info.max) / 2
    return Number.isInteger(mid) ? String(mid) : mid.toFixed(1)
  }
  return range.replace(/,/g, '').split('<')[0].trim()
}

// Abnormal (red, up/down arrow) flagging is deliberately limited to these three haematology
// fields, not every numeric-range field — flagging everything made the report noisy with
// arrows on fields where a clinically-trivial deviation isn't worth calling out visually.
const FLAGGABLE_FIELDS = new Set(['haemoglobin', 'total_wbc', 'platelet_count'])

/** Whether an entered value falls outside its reference range — drives the abnormal (red) flagging on Result Entry and the printed report. Only Haemoglobin, Total WBC, and Platelet Count ever flag; every other field always returns null regardless of range. `fieldKey` is optional so 'Others' rows (which have no fixed key) can still pass value/range through without flagging. */
export function flagFor(value: string, range: string, fieldKey?: string): 'high' | 'low' | null {
  if (fieldKey !== undefined && !FLAGGABLE_FIELDS.has(fieldKey)) return null
  if (!value || !range) return null
  const info = numericRangeInfo(range)
  if (!info) return null
  const v = parseFloat(value)
  if (isNaN(v)) return null
  if (v > info.max) return 'high'
  if (v < info.min) return 'low'
  return null
}
