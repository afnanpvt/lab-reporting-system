import { ResultRow, SectionDivider } from './shared'

interface Props {
  gender: string
  data: Record<string, string>
  onChange: (field: string, value: string) => void
}

export default function Biochemistry({ gender, data, onChange }: Props) {
  const f = gender === 'F'
  const v = (k: string) => data[k] ?? ''
  const set = (k: string) => (val: string) => onChange(k, val)

  return (
    <div>
      <SectionDivider label="Glucose" />
      <ResultRow label="Plasma Glucose (F)" unit="mg/dl" range="70.0–110.0 mg/dl"
        value={v('glucose_f')} onChange={set('glucose_f')} />
      <ResultRow label="Plasma Glucose (PP)" unit="mg/dl" range="Upto 140.0 mg/dl"
        value={v('glucose_pp')} onChange={set('glucose_pp')} />
      <ResultRow label="Plasma Glucose (R)" unit="mg/dl" range="Upto 120.0 mg/dl"
        value={v('glucose_r')} onChange={set('glucose_r')} />

      <SectionDivider label="Renal" />
      <ResultRow label="Blood Urea" unit="mg/dl" range="10.0–50.0 mg/dl"
        value={v('blood_urea')} onChange={set('blood_urea')} />
      <ResultRow label="Blood Urea (Pre)" unit="mg/dl" range=""
        value={v('blood_urea_pre')} onChange={set('blood_urea_pre')} />
      <ResultRow label="Blood Urea (Post)" unit="mg/dl" range=""
        value={v('blood_urea_post')} onChange={set('blood_urea_post')} />
      <ResultRow label="S. Creatinine" unit="mg/dl" range={f ? 'Female: 0.5–1.2' : 'Male: 0.7–1.3'}
        value={v('s_creatinine')} onChange={set('s_creatinine')} />
      <ResultRow label="S. Uric Acid" unit="mg/dl" range={f ? 'Female: 2.7–6.5' : 'Male: 3.5–7.2'}
        value={v('s_uric_acid')} onChange={set('s_uric_acid')} />

      <SectionDivider label="Lipids" />
      <ResultRow label="S. Cholesterol" unit="mg/dl" range="140–200.0 mg/dl"
        value={v('s_cholesterol')} onChange={set('s_cholesterol')} />
      <ResultRow label="S. Triglycerides" unit="mg/dl" range="40.0–160.0 mg/dl"
        value={v('s_triglycerides')} onChange={set('s_triglycerides')} />

      <SectionDivider label="Liver Enzymes" />
      <ResultRow label="S.G.P.T. (ALT)" unit="IU/L" range="Upto 49 IU/L"
        value={v('sgpt')} onChange={set('sgpt')} />
      <ResultRow label="S.G.O.T. (AST)" unit="IU/L" range="Upto 40 IU/L"
        value={v('sgot')} onChange={set('sgot')} />
      <ResultRow label="Alk. Phosphatase" unit="IU/L" range="180–1200 IU/L"
        value={v('alk_phosphatase')} onChange={set('alk_phosphatase')} />

      <SectionDivider label="Proteins" />
      <ResultRow label="S. Total Protein" unit="gm/dl" range="6.0–8.0 gm/dl"
        value={v('total_protein')} onChange={set('total_protein')} />
      <ResultRow label="S. Albumin" unit="gm/dl" range="3.7–5.3 gm/dl"
        value={v('albumin')} onChange={set('albumin')} />
      <ResultRow label="S. Globulin" unit="gm/dl" range="2.3–3.5 gm/dl"
        value={v('globulin')} onChange={set('globulin')} />

      <SectionDivider label="Minerals / Other" />
      <ResultRow label="S. Calcium" unit="mg/dl" range="8.5–11.0 mg/dl"
        value={v('s_calcium')} onChange={set('s_calcium')} />
      <ResultRow label="S. Phosphorus" unit="mg/dl" range="2.5–5.0 mg/dl"
        value={v('s_phosphorus')} onChange={set('s_phosphorus')} />
      <ResultRow label="Hb A1C" unit="%" range="4.0–5.6%"
        value={v('hb_a1c')} onChange={set('hb_a1c')} />
      <ResultRow label="Vitamin D (Rapid)" unit="ng/mL" range="30–100 ng/mL"
        value={v('vitamin_d')} onChange={set('vitamin_d')} />

      <SectionDivider label="Bilirubin" />
      <ResultRow label="S. Bilirubin Total" unit="mg/dl" range="Upto 1.0 mg/dl"
        value={v('bilirubin_total')} onChange={set('bilirubin_total')} />
      <ResultRow label="S. Bilirubin Direct" unit="mg/dl" range="0.0–0.5 mg/dl"
        value={v('bilirubin_direct')} onChange={set('bilirubin_direct')} />
      <ResultRow label="S. Bilirubin Indirect" unit="mg/dl" range=""
        value={v('bilirubin_indirect')} onChange={set('bilirubin_indirect')} />
    </div>
  )
}
