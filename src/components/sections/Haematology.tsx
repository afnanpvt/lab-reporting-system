import { ResultRow, SectionDivider, QualitativeRow } from './shared'

interface Props {
  gender: string
  data: Record<string, string>
  onChange: (field: string, value: string) => void
}

export default function Haematology({ gender, data, onChange }: Props) {
  const f = gender === 'F'
  const v = (k: string) => data[k] ?? ''
  const set = (k: string) => (val: string) => onChange(k, val)

  return (
    <div>
      <div id="sg-cbc">
        <SectionDivider label="Complete Blood Count" />
        <ResultRow label="Haemoglobin" unit="gm/dl" range={f ? '11.0–15.0 gm/dl' : '13.0–17.0 gm/dl'}
          value={v('haemoglobin')} onChange={set('haemoglobin')} />
        <ResultRow label="RBC Count" unit="m/cumm" range={f ? '4.2–5.4 m/cumm' : '4.6–6.0 m/cumm'}
          value={v('rbc_count')} onChange={set('rbc_count')} />
        <ResultRow label="P.C.V. (H.C.T.)" unit="%" range={f ? '36–47%' : '40–54%'}
          value={v('pcv')} onChange={set('pcv')} />
        <ResultRow label="Total WBC Count" unit="cells/cumm" range="4000–11000 cells/cumm"
          value={v('total_wbc')} onChange={set('total_wbc')} />
        <ResultRow label="Abs. Eosinophil Count" unit="/cumm" range="40–440/cumm"
          value={v('abs_eosinophil')} onChange={set('abs_eosinophil')} />
        <ResultRow label="Platelet Count" unit="lakhs/cumm" range="1.5–4.0 lakhs/cumm"
          value={v('platelet_count')} onChange={set('platelet_count')} />
        <ResultRow label="Reticulocyte Count" unit="%" range="Upto 2.0%"
          value={v('reticulocyte')} onChange={set('reticulocyte')} />
        <ResultRow label="M.C.V." unit="cu microns" range="78–94 cu microns"
          value={v('mcv')} onChange={set('mcv')} />
        <ResultRow label="M.C.H." unit="pg" range="27–32 pg"
          value={v('mch')} onChange={set('mch')} />
        <ResultRow label="M.C.H.C." unit="%" range="30–36%"
          value={v('mchc')} onChange={set('mchc')} />
        <ResultRow label="Smear for M.P." unit="" range=""
          value={v('smear_mp')} onChange={set('smear_mp')} />
        <ResultRow label="Smear for M.F." unit="" range=""
          value={v('smear_mf')} onChange={set('smear_mf')} />
      </div>

      <div id="sg-differential">
        <SectionDivider label="Differential Leucocyte Count" />
        <ResultRow label="Neutrophils" unit="%" range="40–75%"
          value={v('neutrophils')} onChange={set('neutrophils')} indent />
        <ResultRow label="Eosinophils" unit="%" range="2–6%"
          value={v('eosinophils')} onChange={set('eosinophils')} indent />
        <ResultRow label="Basophils" unit="%" range="0–1%"
          value={v('basophils')} onChange={set('basophils')} indent />
        <ResultRow label="Lymphocytes" unit="%" range="25–40%"
          value={v('lymphocytes')} onChange={set('lymphocytes')} indent />
        <ResultRow label="Monocytes" unit="%" range="2–8%"
          value={v('monocytes')} onChange={set('monocytes')} indent />
      </div>

      <div id="sg-esr">
        <SectionDivider label="ESR" />
        <ResultRow label="E.S.R. (Westergren)" unit="mm/hr" range={f ? '0–20 mm/hr' : '0–15 mm/hr'}
          value={v('esr')} onChange={set('esr')} />
        <ResultRow label="E.S.R. (1/4)" unit="mm" range=""
          value={v('esr_quarter')} onChange={set('esr_quarter')} indent />
        <ResultRow label="E.S.R. (1/2)" unit="mm" range={f ? '0–15 mm/hr' : '0–10 mm/hr'}
          value={v('esr_half')} onChange={set('esr_half')} indent />
        <ResultRow label="E.S.R. (3/4)" unit="mm" range=""
          value={v('esr_3quarter')} onChange={set('esr_3quarter')} indent />
        <ResultRow label="E.S.R. (1)" unit="mm" range=""
          value={v('esr_one')} onChange={set('esr_one')} indent />
      </div>

      <div id="sg-coagulation">
        <SectionDivider label="Coagulation" />
        <ResultRow label="Bleeding Time" unit="min" range="1–3 minutes"
          value={v('bleeding_time')} onChange={set('bleeding_time')} />
        <ResultRow label="Clotting Time" unit="min" range="3–10 minutes"
          value={v('clotting_time')} onChange={set('clotting_time')} />
      </div>

      <div id="sg-blood-group">
        <SectionDivider label="Blood Group" />
        <ResultRow label="Blood Grouping" unit="" range=""
          value={v('blood_group')} onChange={set('blood_group')} />
        <ResultRow label="Rh. Typing" unit="" range=""
          value={v('rh_typing')} onChange={set('rh_typing')} />
        <QualitativeRow label="Indirect Coombs Test (ICT)"
          value={v('ict')} onChange={set('ict')}
          options={['', 'Positive', 'Negative', 'Weakly Positive']} />
        <QualitativeRow label="Direct Coombs Test (DCT)"
          value={v('dct')} onChange={set('dct')}
          options={['', 'Positive', 'Negative', 'Weakly Positive']} />
      </div>
    </div>
  )
}
