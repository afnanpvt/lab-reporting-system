import { DropdownRow, ResultRow, SectionDivider, TextAreaRow } from './shared'

interface Props {
  data: Record<string, string>
  onChange: (field: string, value: string) => void
}

const COLOUR_OPTS = ['', 'Pale Yellow', 'Yellow', 'Dark Yellow', 'Amber', 'Red', 'Brown', 'Colourless']
const APPEARANCE_OPTS = ['', 'Clear', 'Slightly Turbid', 'Turbid', 'Cloudy']
const REACTION_OPTS = ['', 'Acidic', 'Alkaline', 'Neutral']
const PRESENCE_OPTS = ['', 'Nil', 'Trace', '+', '++', '+++', '++++', 'Present', 'Absent']
const PH_OPTS = ['', '5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5']
const SG_OPTS = ['', '1.000', '1.005', '1.010', '1.015', '1.020', '1.025', '1.030']
const PREG_OPTS = ['', 'Positive', 'Negative']
const MICRO_OPTS = ['', 'Nil', '2–4/HPF', '4–6/HPF', '6–8/HPF', '8–10/HPF', 'Plenty']

export default function Urine({ data, onChange }: Props) {
  const v = (k: string) => data[k] ?? ''
  const set = (k: string) => (val: string) => onChange(k, val)

  return (
    <div>
      <SectionDivider label="Physical Properties" />
      <DropdownRow label="Colour" value={v('colour')} onChange={set('colour')} options={COLOUR_OPTS} />
      <DropdownRow label="Appearance" value={v('appearance')} onChange={set('appearance')} options={APPEARANCE_OPTS} />
      <DropdownRow label="Reaction" value={v('reaction')} onChange={set('reaction')} options={REACTION_OPTS} />
      <DropdownRow label="PH" value={v('ph')} onChange={set('ph')} options={PH_OPTS} showRef="4.6–8.0" />
      <DropdownRow label="Specific Gravity" value={v('specific_gravity')} onChange={set('specific_gravity')} options={SG_OPTS} showRef="1.005–1.030" />

      <SectionDivider label="Chemical Examination" />
      <DropdownRow label="Albumin" value={v('albumin')} onChange={set('albumin')} options={PRESENCE_OPTS} showRef="Nil" />
      <DropdownRow label="Sugar" value={v('sugar')} onChange={set('sugar')} options={PRESENCE_OPTS} showRef="Nil" />
      <DropdownRow label="Ketone Bodies" value={v('ketone')} onChange={set('ketone')} options={PRESENCE_OPTS} showRef="Nil" />
      <DropdownRow label="Bile Salt" value={v('bile_salt')} onChange={set('bile_salt')} options={PRESENCE_OPTS} showRef="Nil" />
      <DropdownRow label="Bile Pigment" value={v('bile_pigment')} onChange={set('bile_pigment')} options={PRESENCE_OPTS} showRef="Nil" />
      <DropdownRow label="Urobilinogen" value={v('urobilinogen')} onChange={set('urobilinogen')} options={PRESENCE_OPTS} showRef="Normal" />
      <DropdownRow label="Occult Blood" value={v('occult_blood')} onChange={set('occult_blood')} options={PRESENCE_OPTS} showRef="Nil" />
      <DropdownRow label="Nitrites" value={v('nitrites')} onChange={set('nitrites')} options={PRESENCE_OPTS} showRef="Nil" />
      <DropdownRow label="Bilirubin" value={v('bilirubin')} onChange={set('bilirubin')} options={PRESENCE_OPTS} showRef="Nil" />
      <DropdownRow label="Urine Pregnancy Test" value={v('pregnancy_test')} onChange={set('pregnancy_test')} options={PREG_OPTS} />

      <SectionDivider label="Microscopic Examination" />
      <DropdownRow label="Pus Cells" value={v('pus_cells')} onChange={set('pus_cells')} options={MICRO_OPTS} showRef="0–4/HPF" />
      <DropdownRow label="Red Blood Cells" value={v('rbc')} onChange={set('rbc')} options={MICRO_OPTS} showRef="0–2/HPF" />
      <DropdownRow label="Epithelial Cells" value={v('epithelial_cells')} onChange={set('epithelial_cells')} options={MICRO_OPTS} showRef="Few" />
      <DropdownRow label="Casts" value={v('casts')} onChange={set('casts')} options={MICRO_OPTS} showRef="Nil" />
      <DropdownRow label="Crystals" value={v('crystals')} onChange={set('crystals')} options={MICRO_OPTS} showRef="Nil" />
      <DropdownRow label="Flagellates" value={v('flagellates')} onChange={set('flagellates')} options={PRESENCE_OPTS} showRef="Nil" />
      <DropdownRow label="Blood RBC" value={v('blood_rbc')} onChange={set('blood_rbc')} options={PRESENCE_OPTS} />
      <DropdownRow label="Leucocytes" value={v('leucocytes')} onChange={set('leucocytes')} options={PRESENCE_OPTS} />
      <TextAreaRow label="Other Findings" value={v('other_findings')} onChange={set('other_findings')} />

      <SectionDivider label="Urine Sugar" />
      <ResultRow label="Urine Sugar (F)" unit="mg/dl" range="" value={v('urine_sugar_f')} onChange={set('urine_sugar_f')} />
      <ResultRow label="Urine Sugar (PP)" unit="mg/dl" range="" value={v('urine_sugar_pp')} onChange={set('urine_sugar_pp')} />
      <ResultRow label="Urine Sugar (R)" unit="mg/dl" range="" value={v('urine_sugar_r')} onChange={set('urine_sugar_r')} />
    </div>
  )
}
