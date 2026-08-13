import { ANTIBIOTICS } from '../../types/lab'
import { DropdownRow, ResultRow, SectionDivider, TextAreaRow } from './shared'

interface Props {
  data: Record<string, string>
  onChange: (field: string, value: string) => void
}

const PRESENCE = ['', 'Nil', 'Present', 'Absent', '+', '++', '+++']
const MICRO = ['', 'Nil', '2–4/HPF', '4–6/HPF', '6–8/HPF', '8–10/HPF', 'Plenty']
const COLOUR = ['', 'Brown', 'Yellow', 'Green', 'Black', 'Red', 'Pale Yellow']
const CONSISTENCY = ['', 'Formed', 'Semi-Formed', 'Loose', 'Watery', 'Hard']

export function Motion({ data, onChange }: Props) {
  const v = (k: string) => data[k] ?? ''
  const set = (k: string) => (val: string) => onChange(k, val)
  return (
    <div>
      <SectionDivider label="Macroscopic" />
      <DropdownRow label="Colour" value={v('colour')} onChange={set('colour')} options={COLOUR} />
      <DropdownRow label="Consistency" value={v('consistency')} onChange={set('consistency')} options={CONSISTENCY} />
      <DropdownRow label="Reaction" value={v('reaction')} onChange={set('reaction')} options={['', 'Acidic', 'Alkaline', 'Neutral']} />
      <DropdownRow label="Blood" value={v('blood')} onChange={set('blood')} options={PRESENCE} showRef="Nil" />
      <DropdownRow label="Mucus" value={v('mucus')} onChange={set('mucus')} options={PRESENCE} showRef="Nil" />

      <SectionDivider label="Microscopic" />
      <DropdownRow label="Pus Cells" value={v('pus_cells')} onChange={set('pus_cells')} options={MICRO} showRef="Nil" />
      <DropdownRow label="Red Blood Cells" value={v('rbc')} onChange={set('rbc')} options={MICRO} showRef="Nil" />
      <DropdownRow label="Ova / Cysts" value={v('ova_cyst')} onChange={set('ova_cyst')} options={PRESENCE} showRef="Nil" />
      <DropdownRow label="Trophozoites" value={v('trophozoites')} onChange={set('trophozoites')} options={PRESENCE} showRef="Nil" />
      <DropdownRow label="Yeast Cells" value={v('yeast_cells')} onChange={set('yeast_cells')} options={PRESENCE} showRef="Nil" />
      <DropdownRow label="Fat Globules" value={v('fat_globules')} onChange={set('fat_globules')} options={PRESENCE} />
      <TextAreaRow label="Other" value={v('other')} onChange={set('other')} />
    </div>
  )
}

/** Culture & Sensitivity — deliberately not the row pattern used elsewhere. Susceptibility is a matrix, not a list. */
export function CultureSensitivity({ data, onChange }: Props) {
  const v = (k: string) => data[k] ?? ''
  const set = (k: string) => (val: string) => onChange(k, val)

  return (
    <div>
      <SectionDivider label="Specimen" />
      <ResultRow label="Specimen" unit="" range="" value={v('specimen')} onChange={set('specimen')} />
      <ResultRow label="Organism Grown" unit="" range="" value={v('organism')} onChange={set('organism')} />
      <ResultRow label="Colony Count" unit="" range="" value={v('colony_count')} onChange={set('colony_count')} />

      <SectionDivider label="Antibiogram" />
      <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 py-1">
        {ANTIBIOTICS.map(({ key, label }) => {
          const fieldKey = 'abx_' + key
          const current = v(fieldKey)
          return (
            <div key={key} className="flex items-center justify-between gap-3 py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-[15px] text-ink">{label}</span>
              <div className="flex border rounded-md overflow-hidden flex-shrink-0" style={{ borderColor: 'var(--border-strong)' }}>
                {(['S', 'I', 'R'] as const).map((opt, i) => {
                  const active = current === opt
                  const activeColor = opt === 'S' ? 'var(--success)' : opt === 'I' ? 'var(--warning)' : 'var(--danger)'
                  const activeBg = opt === 'S' ? 'var(--success-soft)' : opt === 'I' ? 'var(--warning-soft)' : 'var(--danger-soft)'
                  return (
                    <button
                      key={opt}
                      onClick={() => set(fieldKey)(active ? '' : opt)}
                      className="result-field-btn w-9 h-8 text-[12.5px] font-bold"
                      style={{
                        borderLeft: i > 0 ? '1px solid var(--border-strong)' : 'none',
                        background: active ? activeBg : 'var(--surface)',
                        color: active ? activeColor : 'var(--ink-3)'
                      }}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4">
        <TextAreaRow label="Remarks" value={v('remarks')} onChange={set('remarks')} />
      </div>
    </div>
  )
}

export function Mantoux({ data, onChange }: Props) {
  const v = (k: string) => data[k] ?? ''
  const set = (k: string) => (val: string) => onChange(k, val)
  return (
    <div className="max-w-sm">
      <ResultRow label="Reading (mm)" unit="mm" range="< 10 mm Negative" value={v('reading')} onChange={set('reading')} />
      <DropdownRow label="Interpretation" value={v('interpretation')} onChange={set('interpretation')}
        options={['', 'Negative (< 10 mm)', 'Positive (≥ 10 mm)', 'Strongly Positive (≥ 15 mm)']} />
      <TextAreaRow label="Remarks" value={v('remarks')} onChange={set('remarks')} />
    </div>
  )
}

export function GttLipid({ data, onChange }: Props) {
  const v = (k: string) => data[k] ?? ''
  const set = (k: string) => (val: string) => onChange(k, val)
  return (
    <div>
      <SectionDivider label="Glucose Tolerance Test" />
      <ResultRow label="Fasting" unit="mg/dl" range="70–110 mg/dl" value={v('fasting')} onChange={set('fasting')} />
      <ResultRow label="1 Hour" unit="mg/dl" range="< 180 mg/dl" value={v('one_hour')} onChange={set('one_hour')} />
      <ResultRow label="2 Hours" unit="mg/dl" range="< 140 mg/dl" value={v('two_hour')} onChange={set('two_hour')} />
      <ResultRow label="3 Hours" unit="mg/dl" range="< 110 mg/dl" value={v('three_hour')} onChange={set('three_hour')} />

      <SectionDivider label="Serum Amylase" />
      <ResultRow label="S. Amylase" unit="U/L" range="30–110 U/L" value={v('s_amylase')} onChange={set('s_amylase')} />

      <SectionDivider label="Lipid Profile" />
      <ResultRow label="Total Cholesterol" unit="mg/dl" range="< 200 mg/dl" value={v('total_cholesterol')} onChange={set('total_cholesterol')} />
      <ResultRow label="HDL Cholesterol" unit="mg/dl" range="> 40 mg/dl" value={v('hdl')} onChange={set('hdl')} />
      <ResultRow label="LDL Cholesterol" unit="mg/dl" range="< 130 mg/dl" value={v('ldl')} onChange={set('ldl')} />
      <ResultRow label="VLDL" unit="mg/dl" range="< 30 mg/dl" value={v('vldl')} onChange={set('vldl')} />
      <ResultRow label="Triglycerides" unit="mg/dl" range="< 150 mg/dl" value={v('triglycerides')} onChange={set('triglycerides')} />
      <ResultRow label="Chol:HDL Ratio" unit="" range="< 5.0" value={v('cholesterol_hdl_ratio')} onChange={set('cholesterol_hdl_ratio')} />
    </div>
  )
}

export function BloodGroup({ data, onChange }: Props) {
  const v = (k: string) => data[k] ?? ''
  const set = (k: string) => (val: string) => onChange(k, val)
  return (
    <div className="max-w-sm">
      <DropdownRow label="Blood Group" value={v('blood_group')} onChange={set('blood_group')}
        options={['', 'A', 'B', 'AB', 'O']} />
      <DropdownRow label="Rh Typing" value={v('rh_type')} onChange={set('rh_type')}
        options={['', 'Positive (+ve)', 'Negative (-ve)']} />
      <DropdownRow label="Cross Match" value={v('cross_match')} onChange={set('cross_match')}
        options={['', 'Compatible', 'Incompatible']} />
      <DropdownRow label="Direct Coombs" value={v('direct_coombs')} onChange={set('direct_coombs')}
        options={['', 'Positive', 'Negative']} />
      <DropdownRow label="Indirect Coombs" value={v('indirect_coombs')} onChange={set('indirect_coombs')}
        options={['', 'Positive', 'Negative']} />
    </div>
  )
}

export function Electrolytes({ data, onChange }: Props) {
  const v = (k: string) => data[k] ?? ''
  const set = (k: string) => (val: string) => onChange(k, val)
  return (
    <div className="max-w-sm">
      <ResultRow label="Sodium (Na)" unit="mEq/L" range="136–145 mEq/L" value={v('sodium')} onChange={set('sodium')} />
      <ResultRow label="Potassium (K)" unit="mEq/L" range="3.5–5.0 mEq/L" value={v('potassium')} onChange={set('potassium')} />
      <ResultRow label="Chloride (Cl)" unit="mEq/L" range="98–106 mEq/L" value={v('chloride')} onChange={set('chloride')} />
      <ResultRow label="Bicarbonate (HCO3)" unit="mEq/L" range="22–28 mEq/L" value={v('bicarbonate')} onChange={set('bicarbonate')} />
      <ResultRow label="Calcium" unit="mg/dl" range="8.5–11.0 mg/dl" value={v('calcium')} onChange={set('calcium')} />
      <ResultRow label="Phosphorus" unit="mg/dl" range="2.5–5.0 mg/dl" value={v('phosphorus')} onChange={set('phosphorus')} />
      <ResultRow label="Magnesium" unit="mg/dl" range="1.7–2.2 mg/dl" value={v('magnesium')} onChange={set('magnesium')} />
    </div>
  )
}

export function LFT({ data, onChange }: Props) {
  const v = (k: string) => data[k] ?? ''
  const set = (k: string) => (val: string) => onChange(k, val)
  return (
    <div>
      <SectionDivider label="Bilirubin" />
      <ResultRow label="Bilirubin Total" unit="mg/dl" range="0.2–1.0 mg/dl" value={v('bilirubin_total')} onChange={set('bilirubin_total')} />
      <ResultRow label="Bilirubin Direct" unit="mg/dl" range="0.0–0.5 mg/dl" value={v('bilirubin_direct')} onChange={set('bilirubin_direct')} />
      <ResultRow label="Bilirubin Indirect" unit="mg/dl" range="0.2–0.8 mg/dl" value={v('bilirubin_indirect')} onChange={set('bilirubin_indirect')} />

      <SectionDivider label="Enzymes" />
      <ResultRow label="SGOT (AST)" unit="IU/L" range="Upto 40 IU/L" value={v('sgot')} onChange={set('sgot')} />
      <ResultRow label="SGPT (ALT)" unit="IU/L" range="Upto 49 IU/L" value={v('sgpt')} onChange={set('sgpt')} />
      <ResultRow label="Alk. Phosphatase" unit="IU/L" range="180–1200 IU/L" value={v('alk_phosphatase')} onChange={set('alk_phosphatase')} />
      <ResultRow label="GGT" unit="IU/L" range="11–49 IU/L" value={v('ggt')} onChange={set('ggt')} />

      <SectionDivider label="Proteins" />
      <ResultRow label="Total Protein" unit="gm/dl" range="6.0–8.0 gm/dl" value={v('total_protein')} onChange={set('total_protein')} />
      <ResultRow label="Albumin" unit="gm/dl" range="3.7–5.3 gm/dl" value={v('albumin')} onChange={set('albumin')} />
      <ResultRow label="Globulin" unit="gm/dl" range="2.3–3.5 gm/dl" value={v('globulin')} onChange={set('globulin')} />
      <ResultRow label="A:G Ratio" unit="" range="1.0–2.0" value={v('ag_ratio')} onChange={set('ag_ratio')} />

      <SectionDivider label="Coagulation" />
      <ResultRow label="Prothrombin Time (PT)" unit="sec" range="11–13.5 sec" value={v('pt')} onChange={set('pt')} />
      <ResultRow label="INR" unit="" range="0.9–1.1" value={v('inr')} onChange={set('inr')} />
    </div>
  )
}

export function AbgSputum({ data, onChange }: Props) {
  const v = (k: string) => data[k] ?? ''
  const set = (k: string) => (val: string) => onChange(k, val)
  return (
    <div>
      <SectionDivider label="Arterial Blood Gas" />
      <ResultRow label="pH" unit="" range="7.35–7.45" value={v('ph')} onChange={set('ph')} />
      <ResultRow label="pO2" unit="mmHg" range="80–100 mmHg" value={v('po2')} onChange={set('po2')} />
      <ResultRow label="pCO2" unit="mmHg" range="35–45 mmHg" value={v('pco2')} onChange={set('pco2')} />
      <ResultRow label="HCO3" unit="mEq/L" range="22–26 mEq/L" value={v('hco3')} onChange={set('hco3')} />
      <ResultRow label="O2 Saturation" unit="%" range="95–100%" value={v('o2_sat')} onChange={set('o2_sat')} />
      <ResultRow label="Base Excess" unit="" range="-2 to +2" value={v('base_excess')} onChange={set('base_excess')} />
      <ResultRow label="FiO2" unit="%" range="" value={v('fio2')} onChange={set('fio2')} />

      <SectionDivider label="Sputum Examination" />
      <DropdownRow label="Appearance" value={v('sputum_appearance')} onChange={set('sputum_appearance')}
        options={['', 'Mucoid', 'Mucopurulent', 'Purulent', 'Blood Stained', 'Scanty']} />
      <DropdownRow label="AFB Smear" value={v('afb_smear')} onChange={set('afb_smear')}
        options={['', 'Negative for AFB', 'Positive for AFB (1+)', 'Positive for AFB (2+)', 'Positive for AFB (3+)']} />
      <TextAreaRow label="Culture" value={v('culture')} onChange={set('culture')} />
    </div>
  )
}
