import { humanizeKey, unitFor } from './reportFields'

/**
 * Entry-time sanity checks for Result Entry. These are deliberately separate from reference
 * ranges and the red high/low flags: a check only asks the technician to confirm a reading, it
 * never blocks saving, never changes a value by itself, and never prints on the report.
 *
 * 'check'    — likely typo, unit slip, impossible value, or fields that contradict each other.
 * 'critical' — a real but dangerous result the referring doctor should be told about.
 * 'suggest'  — a value that can be calculated from other fields (MCV, indirect bilirubin, LDL…).
 *
 * Limits are set outside what real patients show, so extreme-but-genuine results aren't flagged
 * as typos. Sources for every limit and formula: docs/value-checks.md.
 */
export type IssueLevel = 'critical' | 'check' | 'suggest'

export interface ValueIssue {
  /** Built from the readings behind the issue, so "Value is correct" only silences that exact reading. */
  id: string
  level: IssueLevel
  message: string
  fix?: { value: string; label: string }
}

export type IssuesByField = Record<string, ValueIssue[]>

type Data = Record<string, string | undefined>

function num(raw: string | undefined): number | null {
  if (!raw) return null
  const s = raw.trim().replace(/,/g, '')
  if (!/^[-+]?(\d+(\.\d*)?|\.\d+)$/.test(s)) return null
  return parseFloat(s)
}

function fmt(n: number, maxDecimals: number): string {
  return String(parseFloat(n.toFixed(maxDecimals)))
}

function add(issues: IssuesByField, field: string, issue: ValueIssue) {
  ;(issues[field] ??= []).push(issue)
}

// ---------------------------------------------------------------------------------------------
// Realistic limits per field, in the app's own units. `dilute` marks fields whose limit is above
// common analyzer/kit linearity, so a very high reading also reminds them to dilute and re-run.
// ---------------------------------------------------------------------------------------------

interface Limit { min: number; max: number; dilute?: boolean }
const L = (min: number, max: number, dilute?: boolean): Limit => ({ min, max, dilute })

const GLUCOSE = L(10, 600, true)
const BILIRUBIN = L(0, 50)
const TRANSAMINASE = L(1, 5000, true)

const LIMITS: Record<string, Record<string, Limit>> = {
  haematology: {
    haemoglobin: L(2, 25),
    rbc_count: L(0.5, 8.6),
    pcv: L(5, 75),
    total_wbc: L(200, 440000),
    neutrophils: L(0, 100),
    eosinophils: L(0, 100),
    basophils: L(0, 100),
    lymphocytes: L(0, 100),
    monocytes: L(0, 100),
    platelet_count: L(0.05, 20),
    reticulocyte: L(0, 50),
    mcv: L(50, 150),
    mch: L(10, 50),
    mchc: L(20, 40),
    esr: L(0, 200),
    esr_quarter: L(0, 200),
    esr_half: L(0, 200),
    esr_3quarter: L(0, 200),
    esr_one: L(0, 200),
    bleeding_time: L(0.5, 30),
    clotting_time: L(1, 30)
  },
  biochemistry: {
    glucose_f: GLUCOSE,
    glucose_pp: GLUCOSE,
    glucose_r: GLUCOSE,
    blood_urea: L(2, 400, true),
    blood_urea_pre: L(2, 400, true),
    blood_urea_post: L(2, 400, true),
    s_creatinine: L(0.1, 25),
    s_uric_acid: L(0.5, 25),
    s_cholesterol: L(30, 1000),
    s_triglycerides: L(10, 10000, true),
    sgpt: TRANSAMINASE,
    sgot: TRANSAMINASE,
    alk_phosphatase: L(5, 3000),
    total_protein: L(2, 15),
    albumin: L(0.5, 7),
    globulin: L(0.5, 10),
    s_calcium: L(2, 20),
    s_phosphorus: L(0.5, 20),
    hb_a1c: L(3, 20),
    vitamin_d: L(3, 150),
    bilirubin_total: BILIRUBIN,
    bilirubin_direct: BILIRUBIN,
    bilirubin_indirect: BILIRUBIN
  },
  lft: {
    bilirubin_total: BILIRUBIN,
    bilirubin_direct: BILIRUBIN,
    bilirubin_indirect: BILIRUBIN,
    sgot: TRANSAMINASE,
    sgpt: TRANSAMINASE,
    alk_phosphatase: L(5, 3000),
    ggt: L(1, 5000),
    total_protein: L(2, 15),
    albumin: L(0.5, 7),
    globulin: L(0.5, 10),
    pt: L(8, 150),
    inr: L(0.5, 15)
  },
  gtt_lipid: {
    fasting: GLUCOSE,
    one_hour: GLUCOSE,
    two_hour: GLUCOSE,
    three_hour: GLUCOSE,
    s_amylase: L(5, 5000),
    total_cholesterol: L(30, 1000),
    hdl: L(5, 150),
    triglycerides: L(10, 10000, true)
  },
  electrolytes: {
    sodium: L(100, 190),
    potassium: L(1, 10),
    chloride: L(50, 150),
    bicarbonate: L(2, 60),
    calcium: L(2, 20),
    phosphorus: L(0.5, 20),
    magnesium: L(0.3, 10)
  },
  urine: {
    ph: L(4.5, 8.5),
    specific_gravity: L(1.0, 1.05)
  },
  abg_sputum: {
    ph: L(6.8, 7.8),
    po2: L(5, 600),
    pco2: L(10, 150),
    hco3: L(2, 60),
    o2_sat: L(0, 100),
    base_excess: L(-30, 30),
    fio2: L(21, 100)
  }
}

// ---------------------------------------------------------------------------------------------
// Unit and decimal slips — the most common typing mistakes, each with a one-click correction.
// Checked before the limits above, since a slip usually also lands outside them.
// ---------------------------------------------------------------------------------------------

interface Slip { when: (n: number, raw: string) => boolean; to: (n: number) => string; why: string }

const CALCIUM_MMOL: Slip = { when: (n) => n >= 1.5 && n <= 3.5, to: (n) => fmt(n * 4.008, 1), why: 'looks like mmol/L' }
const BILIRUBIN_UMOL: Slip = { when: (n) => n >= 60, to: (n) => fmt(n / 17.1, 2), why: 'looks like µmol/L' }
const PROTEIN_G_L: Slip = { when: (n) => n >= 20, to: (n) => fmt(n / 10, 1), why: 'looks like g/L' }
const ALBUMIN_G_L: Slip = { when: (n) => n >= 10, to: (n) => fmt(n / 10, 1), why: 'looks like g/L' }

const SLIPS: Record<string, Record<string, Slip[]>> = {
  haematology: {
    haemoglobin: [{ when: (n) => n >= 60 && n <= 250, to: (n) => fmt(n / 10, 1), why: 'looks like g/L' }],
    rbc_count: [{ when: (n) => n >= 10000, to: (n) => fmt(n / 1e6, 2), why: 'looks like a count per cumm — this field is in millions' }],
    total_wbc: [{ when: (n, raw) => n < 100 && raw.includes('.'), to: (n) => fmt(n * 1000, 0), why: 'looks like thousands (×10³/µL)' }],
    platelet_count: [
      { when: (n) => n > 20 && n < 5000, to: (n) => fmt(n / 100, 2), why: 'looks like thousands (×10³/µL) — this field is in lakhs' },
      { when: (n) => n >= 5000, to: (n) => fmt(n / 100000, 2), why: 'looks like a count per cumm — this field is in lakhs' }
    ]
  },
  biochemistry: {
    s_creatinine: [{ when: (n) => n >= 40, to: (n) => fmt(n / 88.4, 2), why: 'looks like µmol/L' }],
    bilirubin_total: [BILIRUBIN_UMOL],
    total_protein: [PROTEIN_G_L],
    albumin: [ALBUMIN_G_L],
    s_calcium: [CALCIUM_MMOL],
    hb_a1c: [{ when: (n) => n >= 20 && n <= 200, to: (n) => fmt(n / 10.929 + 2.15, 1), why: 'looks like mmol/mol (IFCC units)' }]
  },
  lft: {
    bilirubin_total: [BILIRUBIN_UMOL],
    total_protein: [PROTEIN_G_L],
    albumin: [ALBUMIN_G_L]
  },
  electrolytes: {
    potassium: [{ when: (n) => n >= 20 && n <= 100, to: (n) => fmt(n / 10, 1), why: 'seems to be missing its decimal point' }],
    calcium: [CALCIUM_MMOL]
  },
  urine: {
    specific_gravity: [{ when: (n) => n >= 1000 && n <= 1060, to: (n) => (n / 1000).toFixed(3), why: 'seems to be missing its decimal point' }]
  },
  abg_sputum: {
    ph: [{ when: (n) => n >= 60 && n <= 80, to: (n) => fmt(n / 10, 2), why: 'seems to be missing its decimal point' }],
    fio2: [{ when: (n) => n >= 0.21 && n <= 1, to: (n) => fmt(n * 100, 0), why: 'looks like a fraction — this field is a percentage' }]
  }
}

// ---------------------------------------------------------------------------------------------
// Critical (panic) values — real results the referring doctor should hear about promptly.
// ---------------------------------------------------------------------------------------------

type Critical = (n: number) => boolean
const CRITICAL_GLUCOSE: Critical = (n) => n < 40 || n > 450
const CRITICAL_CALCIUM: Critical = (n) => n <= 7 || n >= 12

const CRITICAL: Record<string, Record<string, Critical>> = {
  haematology: {
    haemoglobin: (n) => n <= 7 || n >= 21,
    total_wbc: (n) => n < 2000 || n > 40000,
    platelet_count: (n) => n < 0.5 || n > 10
  },
  biochemistry: {
    glucose_f: CRITICAL_GLUCOSE,
    glucose_pp: CRITICAL_GLUCOSE,
    glucose_r: CRITICAL_GLUCOSE,
    s_calcium: CRITICAL_CALCIUM,
    s_creatinine: (n) => n >= 7.5
  },
  gtt_lipid: {
    fasting: CRITICAL_GLUCOSE,
    one_hour: CRITICAL_GLUCOSE,
    two_hour: CRITICAL_GLUCOSE,
    three_hour: CRITICAL_GLUCOSE
  },
  electrolytes: {
    sodium: (n) => n < 120 || n > 160,
    potassium: (n) => n < 3 || n > 6,
    calcium: CRITICAL_CALCIUM
  },
  abg_sputum: {
    ph: (n) => n < 7.2 || n > 7.6,
    po2: (n) => n <= 45
  }
}

function withUnit(value: string, sectionKey: string, fieldKey: string): string {
  const unit = unitFor(sectionKey, fieldKey)
  return unit ? `${value} ${unit}` : value
}

function fieldIssue(sectionKey: string, fieldKey: string, raw: string | undefined): ValueIssue | null {
  const n = num(raw)
  if (n === null || raw === undefined) return null
  const typed = raw.trim()

  const slip = SLIPS[sectionKey]?.[fieldKey]?.find((s) => s.when(n, typed))
  if (slip) {
    const fixed = slip.to(n)
    return {
      id: `slip:${typed}`,
      level: 'check',
      message: `${typed} ${slip.why}. Did you mean ${withUnit(fixed, sectionKey, fieldKey)}?`,
      fix: { value: fixed, label: `Use ${fixed}` }
    }
  }

  const limit = LIMITS[sectionKey]?.[fieldKey]
  if (limit && (n < limit.min || n > limit.max)) {
    const dilute = limit.dilute && n > limit.max ? " If it's above your analyzer's range, dilute the sample and re-run." : ''
    return {
      id: `limit:${typed}`,
      level: 'check',
      message: `${withUnit(typed, sectionKey, fieldKey)} is outside what's realistic for ${humanizeKey(fieldKey)} (${limit.min}–${limit.max}). Please confirm it isn't a typo.${dilute}`
    }
  }

  if (CRITICAL[sectionKey]?.[fieldKey]?.(n)) {
    return { id: `critical:${typed}`, level: 'critical', message: 'Critical value — inform the referring doctor.' }
  }
  return null
}

/** A field's number, but only when it parsed cleanly and passed its own slip/limit checks — cross-field rules skip anything already suspect so warnings don't stack. */
function sane(sectionKey: string, data: Data, fieldKey: string): number | null {
  const n = num(data[fieldKey])
  if (n === null) return null
  const issue = fieldIssue(sectionKey, fieldKey, data[fieldKey])
  return issue && issue.level === 'check' ? null : n
}

/** Offers a value derived from other fields when the field is empty, or flags a typed value that disagrees with it by more than 5% (or `absTol`, whichever is larger). */
function calculated(issues: IssuesByField, data: Data, field: string, value: number | null, decimals: number, absTol: number, basis: string) {
  if (value === null || !isFinite(value) || value < 0) return
  const shown = fmt(value, decimals)
  const raw = data[field]?.trim()
  if (!raw) {
    add(issues, field, { id: `calc:${shown}`, level: 'suggest', message: `Calculated from ${basis}: ${shown}`, fix: { value: shown, label: `Use ${shown}` } })
    return
  }
  const typed = num(raw)
  if (typed !== null && Math.abs(typed - value) > Math.max(Math.abs(value) * 0.05, absTol)) {
    add(issues, field, {
      id: `calcdiff:${raw}:${shown}`,
      level: 'check',
      message: `Doesn't match the value calculated from ${basis} (${shown}).`,
      fix: { value: shown, label: `Use ${shown}` }
    })
  }
}

function bilirubinAndProtein(section: string, data: Data, issues: IssuesByField) {
  const total = sane(section, data, 'bilirubin_total')
  const direct = sane(section, data, 'bilirubin_direct')
  if (total !== null && direct !== null) {
    if (direct > total) {
      add(issues, 'bilirubin_direct', { id: `directgt:${direct}:${total}`, level: 'check', message: 'Direct bilirubin is higher than total bilirubin.' })
    } else {
      calculated(issues, data, 'bilirubin_indirect', total - direct, 2, 0.1, 'total − direct bilirubin')
    }
  }

  const protein = sane(section, data, 'total_protein')
  const albumin = sane(section, data, 'albumin')
  if (protein !== null && albumin !== null) {
    if (albumin > protein) {
      add(issues, 'albumin', { id: `albgt:${albumin}:${protein}`, level: 'check', message: 'Albumin is higher than total protein.' })
    } else {
      calculated(issues, data, 'globulin', protein - albumin, 1, 0.1, 'total protein − albumin')
    }
  }
}

const CROSS_FIELD: Record<string, (data: Data, issues: IssuesByField) => void> = {
  haematology: (data, issues) => {
    const s = (k: string) => sane('haematology', data, k)

    const dlcKeys = ['neutrophils', 'eosinophils', 'basophils', 'lymphocytes', 'monocytes']
    const dlc = dlcKeys.map((k) => ({ k, n: s(k) })).filter((d) => d.n !== null)
    if (dlc.length > 0) {
      const sum = dlc.reduce((a, d) => a + (d.n as number), 0)
      const anchor = dlc[dlc.length - 1].k
      const total = fmt(sum, 1)
      if (sum > 100.5) {
        add(issues, anchor, { id: `dlc:${total}`, level: 'check', message: `Differential count adds up to ${total}% — it can't be more than 100%.` })
      } else if (dlc.length === dlcKeys.length && Math.abs(sum - 100) > 0.5) {
        add(issues, anchor, { id: `dlc:${total}`, level: 'check', message: `Differential count adds up to ${total}% — it should total 100%.` })
      }
    }

    const hb = s('haemoglobin')
    const pcv = s('pcv')
    const rbc = s('rbc_count')
    if (hb !== null && pcv !== null && hb > 0 && pcv > 0) {
      const mchc = (hb * 100) / pcv
      if (Math.abs(pcv - 3 * hb) > 3) {
        add(issues, 'pcv', {
          id: `ruleof3:${hb}:${pcv}`,
          level: 'check',
          message: `PCV is usually about 3 × Haemoglobin (≈${fmt(3 * hb, 1)}%). This can be real (e.g. iron-deficiency anaemia), but check both values.`
        })
      } else if (mchc > 36) {
        add(issues, 'pcv', {
          id: `mchc36:${hb}:${pcv}`,
          level: 'check',
          message: `Haemoglobin and PCV give an MCHC of ${fmt(mchc, 1)}% — above 36 usually means a measurement error or a lipemic sample.`
        })
      }
      calculated(issues, data, 'mchc', mchc, 1, 0.5, 'Haemoglobin and PCV')
    }
    if (pcv !== null && rbc !== null && rbc > 0) calculated(issues, data, 'mcv', (pcv * 10) / rbc, 1, 1, 'PCV and RBC count')
    if (hb !== null && rbc !== null && rbc > 0) calculated(issues, data, 'mch', (hb * 10) / rbc, 1, 0.5, 'Haemoglobin and RBC count')

    const wbc = s('total_wbc')
    const eos = s('eosinophils')
    if (wbc !== null && eos !== null) calculated(issues, data, 'abs_eosinophil', (wbc * eos) / 100, 0, 10, 'Total WBC and eosinophils')

    let previous: { k: string; n: number } | null = null
    for (const k of ['esr_quarter', 'esr_half', 'esr_3quarter', 'esr_one']) {
      const n = s(k)
      if (n === null) continue
      if (previous && n < previous.n) {
        add(issues, k, {
          id: `esrorder:${previous.n}:${n}`,
          level: 'check',
          message: `Lower than the earlier ${humanizeKey(previous.k)} reading (${previous.n} mm) — ESR readings can only stay the same or rise over time.`
        })
      }
      previous = { k, n }
    }
  },

  biochemistry: (data, issues) => {
    bilirubinAndProtein('biochemistry', data, issues)
    const pre = sane('biochemistry', data, 'blood_urea_pre')
    const post = sane('biochemistry', data, 'blood_urea_post')
    if (pre !== null && post !== null && post > pre) {
      add(issues, 'blood_urea_post', { id: `urea:${pre}:${post}`, level: 'check', message: 'Post-dialysis urea is higher than pre-dialysis — check the two aren’t swapped.' })
    }
  },

  lft: (data, issues) => {
    bilirubinAndProtein('lft', data, issues)
    const albumin = sane('lft', data, 'albumin')
    const protein = sane('lft', data, 'total_protein')
    const globulin = sane('lft', data, 'globulin') ?? (protein !== null && albumin !== null ? protein - albumin : null)
    if (albumin !== null && globulin !== null && globulin > 0) calculated(issues, data, 'ag_ratio', albumin / globulin, 2, 0.05, 'albumin ÷ globulin')
  },

  gtt_lipid: (data, issues) => {
    const s = (k: string) => sane('gtt_lipid', data, k)
    const tc = s('total_cholesterol')
    const hdl = s('hdl')
    const ldl = num(data.ldl)
    const tg = s('triglycerides')

    if (tc !== null && hdl !== null && hdl > tc) {
      add(issues, 'hdl', { id: `hdlgt:${hdl}:${tc}`, level: 'check', message: 'HDL is higher than total cholesterol.' })
    }
    if (tc !== null && ldl !== null && ldl > tc) {
      add(issues, 'ldl', { id: `ldlgt:${ldl}:${tc}`, level: 'check', message: 'LDL is higher than total cholesterol.' })
    }

    if (tg !== null && tg > 400) {
      add(issues, 'ldl', {
        id: `tg400:${tg}`,
        level: 'suggest',
        message: 'Triglycerides are above 400 mg/dl, so LDL and VLDL can’t be calculated reliably — use a direct LDL test.'
      })
    } else if (tg !== null) {
      calculated(issues, data, 'vldl', tg / 5, 1, 1, 'triglycerides ÷ 5')
      if (tc !== null && hdl !== null) calculated(issues, data, 'ldl', tc - hdl - tg / 5, 1, 2, 'total cholesterol − HDL − triglycerides ÷ 5')
    }
    if (tc !== null && hdl !== null && hdl > 0) calculated(issues, data, 'cholesterol_hdl_ratio', tc / hdl, 1, 0.1, 'total cholesterol ÷ HDL')
  },

  electrolytes: (data, issues) => {
    const na = sane('electrolytes', data, 'sodium')
    const cl = sane('electrolytes', data, 'chloride')
    const hco3 = sane('electrolytes', data, 'bicarbonate')
    if (na !== null && cl !== null && hco3 !== null) {
      const gap = na - (cl + hco3)
      if (gap < 0) {
        add(issues, 'bicarbonate', {
          id: `aniongap:${na}:${cl}:${hco3}`,
          level: 'check',
          message: `Anion gap (Sodium − Chloride − Bicarbonate) comes out negative (${fmt(gap, 1)}). That's almost always an entry error.`
        })
      }
    }
  },

  abg_sputum: (data, issues) => {
    const ph = sane('abg_sputum', data, 'ph')
    const pco2 = sane('abg_sputum', data, 'pco2')
    if (ph !== null && pco2 !== null) {
      calculated(issues, data, 'hco3', 0.03 * pco2 * Math.pow(10, ph - 6.1), 1, 3, 'pH and pCO2')
    }
  }
}

/** Every check for one section's current values, grouped under the field each note should appear beneath. */
export function checksForSection(sectionKey: string, data: Data): IssuesByField {
  const issues: IssuesByField = {}
  const fields = new Set([
    ...Object.keys(LIMITS[sectionKey] ?? {}),
    ...Object.keys(SLIPS[sectionKey] ?? {}),
    ...Object.keys(CRITICAL[sectionKey] ?? {})
  ])
  for (const field of fields) {
    const issue = fieldIssue(sectionKey, field, data[field])
    if (issue) add(issues, field, issue)
  }
  CROSS_FIELD[sectionKey]?.(data, issues)
  return issues
}
