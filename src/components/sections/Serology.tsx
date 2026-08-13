import { QualitativeRow, SectionDivider } from './shared'

interface Props {
  data: Record<string, string>
  onChange: (field: string, value: string) => void
}

const QUALITATIVE = ['', 'Positive', 'Negative', 'Reactive', 'Non-Reactive', 'Weakly Positive', 'Borderline']
const DENGUE_OPTS = ['', 'Positive', 'Negative', 'Equivocal']
const WIDAL_OPTS = ['', 'Negative 1:20 dilution', '1:20', '1:40', '1:80', '1:160', '1:320']

export default function Serology({ data, onChange }: Props) {
  const v = (k: string) => data[k] ?? ''
  const set = (k: string) => (val: string) => onChange(k, val)

  return (
    <div>
      <SectionDivider label="WIDAL (Colour Antigen-Slide Method)" />
      <QualitativeRow label="S. Typhosum 'O'" value={v('widal_o')} onChange={set('widal_o')} options={WIDAL_OPTS} />
      <QualitativeRow label="S. Typhosum 'H'" value={v('widal_h')} onChange={set('widal_h')} options={WIDAL_OPTS} />
      <QualitativeRow label="S. Typhosum 'A'(H)" value={v('widal_ah')} onChange={set('widal_ah')} options={WIDAL_OPTS} />
      <QualitativeRow label="S. Paratyphosum 'B'(H)" value={v('widal_bh')} onChange={set('widal_bh')} options={WIDAL_OPTS} />

      <SectionDivider label="STI / Infections" />
      <QualitativeRow label="V.D.R.L." value={v('vdrl')} onChange={set('vdrl')} options={QUALITATIVE} />
      <QualitativeRow label="T.P.H.A." value={v('tpha')} onChange={set('tpha')} options={QUALITATIVE} />
      <QualitativeRow label="H.I.V. - I" value={v('hiv1')} onChange={set('hiv1')} options={QUALITATIVE} />
      <QualitativeRow label="H.I.V. - II" value={v('hiv2')} onChange={set('hiv2')} options={QUALITATIVE} />
      <QualitativeRow label="HBs. Ag." value={v('hbs_ag')} onChange={set('hbs_ag')} options={QUALITATIVE} />
      <QualitativeRow label="H.C.V." value={v('hcv')} onChange={set('hcv')} options={QUALITATIVE} />

      <SectionDivider label="Autoimmune / Inflammatory" />
      <QualitativeRow label="R.A. Factor" value={v('ra_factor')} onChange={set('ra_factor')} options={QUALITATIVE} />
      <QualitativeRow label="Anti Streptolysin 'O'" value={v('aso')} onChange={set('aso')} options={QUALITATIVE} />
      <QualitativeRow label="C-Reactive Protein" value={v('crp')} onChange={set('crp')} options={QUALITATIVE} />

      <SectionDivider label="Dengue" />
      <QualitativeRow label="Dengue (IgG)" value={v('dengue_igg')} onChange={set('dengue_igg')} options={DENGUE_OPTS} />
      <QualitativeRow label="Dengue (IgM)" value={v('dengue_igm')} onChange={set('dengue_igm')} options={DENGUE_OPTS} />
      <QualitativeRow label="Dengue (NS1)" value={v('dengue_ns1')} onChange={set('dengue_ns1')} options={DENGUE_OPTS} />

      <SectionDivider label="Cardiac / Other" />
      <QualitativeRow label="Troponin - T" value={v('troponin')} onChange={set('troponin')} options={QUALITATIVE} />

      <SectionDivider label="Tuberculosis" />
      <QualitativeRow label="SERO CHECK-MTB (IgG)" value={v('sero_mtb_igg')} onChange={set('sero_mtb_igg')} options={QUALITATIVE} />
      <QualitativeRow label="SERO CHECK-MTB (IgM)" value={v('sero_mtb_igm')} onChange={set('sero_mtb_igm')} options={QUALITATIVE} />

      <SectionDivider label="Vector-Borne" />
      <QualitativeRow label="Malaria Card Test" value={v('malaria')} onChange={set('malaria')} options={QUALITATIVE} />
      <QualitativeRow label="Chikungunya IgM" value={v('chikungunya')} onChange={set('chikungunya')} options={QUALITATIVE} />
    </div>
  )
}
