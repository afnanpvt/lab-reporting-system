import type { Patient, AllResults } from '../../types/lab'

interface Props {
  patient: Patient
  results: Partial<AllResults>
  settings: Record<string, string>
}

// Detect if a numeric value is outside its reference range
function getFlag(value: string, refRange: string): 'H' | 'L' | null {
  const num = parseFloat(value)
  if (isNaN(num) || !refRange) return null

  const rangeMatch = refRange.match(/([\d.]+)\s*[-–]\s*([\d.]+)/)
  if (rangeMatch) {
    const lo = parseFloat(rangeMatch[1])
    const hi = parseFloat(rangeMatch[2])
    if (num > hi) return 'H'
    if (num < lo) return 'L'
    return null
  }

  const gtMatch = refRange.match(/[>≥]\s*([\d.]+)/)
  if (gtMatch && num < parseFloat(gtMatch[1])) return 'L'

  const uptoMatch = refRange.match(/[Uu]p\s*to\s*([\d.]+)|[<≤]\s*([\d.]+)/)
  if (uptoMatch) {
    const thresh = parseFloat(uptoMatch[1] ?? uptoMatch[2])
    if (!isNaN(thresh) && num > thresh) return 'H'
  }
  return null
}

// Single result row
function Row({
  label,
  value,
  unit,
  refRange,
  indent,
  bold
}: {
  label: string
  value: string | undefined
  unit?: string
  refRange?: string
  indent?: boolean
  bold?: boolean
}) {
  if (!value || value.trim() === '') return null
  const flag = refRange ? getFlag(value, refRange) : null
  const isHigh = flag === 'H'
  const isLow = flag === 'L'

  const valueColor = isHigh ? '#c0392b' : isLow ? '#1a5fa8' : '#1a1a2e'
  const flagIcon = isHigh ? '▲ ' : isLow ? '▼ ' : ''

  return (
    <tr>
      <td
        style={{
          padding: '3px 6px 3px 0',
          fontSize: 10.5,
          paddingLeft: indent ? 20 : 0,
          fontWeight: bold ? 700 : 400,
          color: '#1a1a2e',
          width: '42%',
          borderBottom: '1px solid #f0f0f0',
          verticalAlign: 'middle'
        }}
      >
        {label}
      </td>
      <td
        style={{
          padding: '3px 8px',
          fontSize: 10.5,
          fontWeight: 700,
          color: valueColor,
          width: '16%',
          borderBottom: '1px solid #f0f0f0',
          verticalAlign: 'middle'
        }}
      >
        {flagIcon}{value}
      </td>
      <td
        style={{
          padding: '3px 8px',
          fontSize: 10.5,
          color: '#444',
          width: '16%',
          borderBottom: '1px solid #f0f0f0',
          verticalAlign: 'middle'
        }}
      >
        {unit}
      </td>
      <td
        style={{
          padding: '3px 0',
          fontSize: 10,
          color: '#555',
          width: '26%',
          borderBottom: '1px solid #f0f0f0',
          verticalAlign: 'middle'
        }}
      >
        {refRange}
      </td>
    </tr>
  )
}

// Full-width section header (e.g. HEMATOLOGY)
function SectionHeader({ title }: { title: string }) {
  return (
    <tr>
      <td
        colSpan={4}
        style={{
          textAlign: 'center',
          fontWeight: 700,
          fontSize: 11.5,
          letterSpacing: 1.5,
          padding: '7px 0 5px',
          background: '#f5f5f5',
          borderTop: '1px solid #cccccc',
          borderBottom: '1px solid #cccccc',
          color: '#1a1a2e'
        }}
      >
        {title.toUpperCase()}
      </td>
    </tr>
  )
}

// Sub-section header (e.g. COMPLETE BLOOD COUNT)
function SubHeader({ title }: { title: string }) {
  return (
    <tr>
      <td
        colSpan={4}
        style={{
          textAlign: 'center',
          fontWeight: 700,
          fontSize: 10.5,
          padding: '5px 0 4px',
          background: '#fafafa',
          border: '1px solid #ddd',
          color: '#1a1a2e'
        }}
      >
        {title}
      </td>
    </tr>
  )
}

// Method note line
function MethodNote({ text }: { text: string }) {
  return (
    <tr>
      <td
        colSpan={4}
        style={{
          fontSize: 9.5,
          color: '#666',
          fontStyle: 'italic',
          padding: '3px 0 6px',
          borderBottom: '1px solid #e8e8e8'
        }}
      >
        Method : {text}
      </td>
    </tr>
  )
}

// Info row for patient block
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ fontSize: 10.5, color: '#333', paddingBottom: 4, width: 110, whiteSpace: 'nowrap' }}>
        {label}
      </td>
      <td style={{ fontSize: 10.5, fontWeight: 600, color: '#111', paddingBottom: 4 }}>
        : {value}
      </td>
    </tr>
  )
}

export default function ReportTemplate({ patient, results, settings }: Props) {
  const h = results.haematology ?? {}
  const b = results.biochemistry ?? {}
  const s = results.serology ?? {}
  const u = results.urine ?? {}
  const sections = typeof patient.sections === 'string' ? JSON.parse(patient.sections) : patient.sections
  const hasSection = (key: string) => sections.includes(key)

  const labName = settings.lab_name || 'Diagnostic Laboratory'
  const labAddr = settings.lab_address || ''
  const labPhone = settings.lab_phone || ''
  const labDoctor = settings.lab_doctor || ''

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#1a1a2e', fontSize: 11, maxWidth: 760, margin: '0 auto' }}>

      {/* ===== HEADER ===== */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
        <tbody>
          <tr>
            {/* Right: 24x7 badge */}
            <td style={{ textAlign: 'right', fontSize: 9, fontWeight: 700, color: '#1a5fa8', paddingBottom: 4 }}>
              24 x 7 Services Available
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '3px solid #1a5fa8', marginBottom: 2 }}>
        <tbody>
          <tr>
            <td style={{ paddingBottom: 8 }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#1a3a6e', letterSpacing: 0.5, lineHeight: 1.1 }}>
                {labName.toUpperCase()}
              </div>
              {labAddr && (
                <div style={{ fontSize: 10.5, color: '#444', marginTop: 3 }}>{labAddr}</div>
              )}
              {labPhone && (
                <div style={{ fontSize: 10.5, color: '#444', marginTop: 1 }}>Mob. {labPhone}</div>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ===== PATIENT INFO ===== */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #bbb',
          marginTop: 10,
          marginBottom: 10
        }}
      >
        <tbody>
          <tr>
            {/* Left column */}
            <td style={{ width: '46%', padding: '8px 10px', verticalAlign: 'top', borderRight: '1px solid #bbb' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <tbody>
                  <InfoRow label="Patient Name" value={patient.name} />
                  <InfoRow
                    label="Age & Sex"
                    value={`${patient.age} ${patient.age_unit === 'Y' ? 'Yrs' : patient.age_unit === 'M' ? 'Months' : 'Days'} | ${patient.gender === 'M' ? 'Male' : 'Female'}`}
                  />
                  {patient.address && <InfoRow label="Address" value={patient.address} />}
                  {patient.mobile && <InfoRow label="Mobile No." value={patient.mobile} />}
                  <InfoRow label="Referred By" value={patient.referred_by ? `Dr. ${patient.referred_by}` : 'Self'} />
                </tbody>
              </table>
            </td>
            {/* Right column */}
            <td style={{ width: '46%', padding: '8px 10px', verticalAlign: 'top' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <tbody>
                  <InfoRow label="Lab ID No." value={patient.sid} />
                  <InfoRow label="Collection Date" value={`${patient.reg_date} ${patient.reg_time}`} />
                  <InfoRow label="Reporting Date" value={`${patient.rpt_date} ${patient.rpt_time}`} />
                  <InfoRow label="Collection Centre" value="-" />
                </tbody>
              </table>
            </td>
            {/* QR placeholder */}
            <td
              style={{
                width: '8%',
                padding: 4,
                verticalAlign: 'top',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  border: '1px solid #ccc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 7,
                  color: '#aaa'
                }}
              >
                QR
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ===== COLUMN HEADERS ===== */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
        <thead>
          <tr style={{ background: '#f0f0f5', borderTop: '1px solid #aaa', borderBottom: '1px solid #aaa' }}>
            <th style={{ textAlign: 'left', fontSize: 10.5, fontWeight: 700, padding: '5px 6px 5px 0', width: '42%', color: '#1a1a2e' }}>
              Test Name
            </th>
            <th style={{ textAlign: 'left', fontSize: 10.5, fontWeight: 700, padding: '5px 8px', width: '16%', color: '#1a1a2e' }}>
              Results
            </th>
            <th style={{ textAlign: 'left', fontSize: 10.5, fontWeight: 700, padding: '5px 8px', width: '16%', color: '#1a1a2e' }}>
              Units
            </th>
            <th style={{ textAlign: 'left', fontSize: 10.5, fontWeight: 700, padding: '5px 0', width: '26%', color: '#1a1a2e' }}>
              Reference range
            </th>
          </tr>
        </thead>
      </table>

      {/* ===== RESULTS TABLE ===== */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <tbody>

          {/* HAEMATOLOGY */}
          {hasSection('haematology') && (h.haemoglobin || h.total_wbc || h.esr || h.blood_group) && (
            <>
              <SectionHeader title="Haematology" />
              {(h.haemoglobin || h.rbc_count || h.pcv || h.total_wbc) && (
                <SubHeader title="COMPLETE BLOOD COUNT (CBC)" />
              )}
              <Row label="Haemoglobin (Hb)" value={h.haemoglobin} unit="g/dL"
                refRange={patient.gender === 'F' ? 'WOMEN- 12.0 - 15.5' : 'MEN- 13.5 - 17.5'} />
              <Row label="RBC Count" value={h.rbc_count} unit="million/µl"
                refRange={patient.gender === 'F' ? '3.8 - 4.8' : '4.5 - 5.5'} />
              <Row label="Packed Cell Volume (PCV / HCT)" value={h.pcv} unit="%"
                refRange={patient.gender === 'F' ? '36 - 46' : '40 - 54'} />
              <Row label="Total Leukocyte Count (TLC)" value={h.total_wbc} unit="/ cumm"
                refRange="4000 - 11000" />
              {(h.neutrophils || h.lymphocytes || h.monocytes || h.eosinophils || h.basophils) && (
                <>
                  <Row label="Differential Leucocyte Count (DLC)" value=" " bold />
                  <Row label="Neutrophils" value={h.neutrophils} unit="%" refRange="40 - 75" indent />
                  <Row label="Lymphocytes" value={h.lymphocytes} unit="%" refRange="20 - 45" indent />
                  <Row label="Monocytes" value={h.monocytes} unit="%" refRange="2 - 10" indent />
                  <Row label="Eosinophils" value={h.eosinophils} unit="%" refRange="1 - 5" indent />
                  <Row label="Basophils" value={h.basophils} unit="%" refRange="0 - 1" indent />
                </>
              )}
              <Row label="Mean Corpuscular Volume (MCV)" value={h.mcv} unit="fL" refRange="83.0 - 101.0" />
              <Row label="Mean Corpuscular Hemoglobin (MCH)" value={h.mch} unit="pg" refRange="27 - 32" />
              <Row label="Mean Corpuscular Hb Concentration (MCHC)" value={h.mchc} unit="g/dL" refRange="31.5 - 34.5" />
              <Row label="Platelet Count" value={h.platelet_count} unit="lakh/cumm" refRange="1.5 - 4.0" />
              <Row label="Reticulocyte Count" value={h.reticulocyte} unit="%" refRange="0.5 - 2.0" />
              <Row label="Absolute Eosinophil Count" value={h.abs_eosinophil} unit="/cumm" refRange="40 - 440" />
              {h.esr && <SubHeader title="ERYTHROCYTE SEDIMENTATION RATE (ESR)" />}
              <Row label="ESR (Westergren)" value={h.esr} unit="mm/hr"
                refRange={patient.gender === 'F' ? '0 - 20' : '0 - 15'} />
              {(h.bleeding_time || h.clotting_time) && <SubHeader title="COAGULATION PROFILE" />}
              <Row label="Bleeding Time (BT)" value={h.bleeding_time} unit="min" refRange="1 - 3" />
              <Row label="Clotting Time (CT)" value={h.clotting_time} unit="min" refRange="3 - 10" />
              {(h.blood_group || h.rh_typing) && <SubHeader title="BLOOD GROUP & RH TYPING" />}
              <Row label="Blood Group (ABO)" value={h.blood_group} unit="" refRange="" />
              <Row label="Rh Factor" value={h.rh_typing} unit="" refRange="" />
              <Row label="Smear for M.P." value={h.smear_mp} unit="" refRange="" />
              <Row label="Smear for M.F." value={h.smear_mf} unit="" refRange="" />
              {(h.ict || h.dct) && <SubHeader title="COOMBS TEST" />}
              <Row label="Indirect Coombs Test (ICT)" value={h.ict} unit="" refRange="" />
              <Row label="Direct Coombs Test (DCT)" value={h.dct} unit="" refRange="" />
              <MethodNote text="Automated Cell Counter by SYSMEX Japan" />
            </>
          )}

          {/* BIOCHEMISTRY */}
          {hasSection('biochemistry') && (b.glucose_f || b.glucose_r || b.blood_urea || b.sgpt || b.bilirubin_total || b.hb_a1c) && (
            <>
              <SectionHeader title="Biochemistry" />

              {(b.glucose_f || b.glucose_pp || b.glucose_r) && (
                <>
                  <SubHeader title="BLOOD SUGAR" />
                  <Row label="Fasting Blood Sugar (F)" value={b.glucose_f} unit="mg/dL" refRange="70.0 - 110.0" />
                  <Row label="Post Prandial Blood Sugar (PP)" value={b.glucose_pp} unit="mg/dL" refRange="Upto 140.0" />
                  <Row label="Random Blood Sugar" value={b.glucose_r} unit="mg/dL" refRange="70 - 140" />
                </>
              )}

              {(b.blood_urea || b.s_creatinine || b.s_uric_acid) && (
                <>
                  <SubHeader title="KIDNEY FUNCTION TEST" />
                  <Row label="Blood Urea" value={b.blood_urea} unit="mg/dL" refRange="15.0 - 55.0" />
                  <Row label="Blood Urea (Pre)" value={b.blood_urea_pre} unit="mg/dL" refRange="" />
                  <Row label="Blood Urea (Post)" value={b.blood_urea_post} unit="mg/dL" refRange="" />
                  <Row label="S. Creatinine" value={b.s_creatinine} unit="mg/dL"
                    refRange={patient.gender === 'F' ? '0.50 - 1.10' : '0.60 - 1.50'} />
                  <Row label="S. Uric Acid" value={b.s_uric_acid} unit="mg/dL"
                    refRange={patient.gender === 'F' ? '2.5 - 6.0' : '2.5 - 7.2'} />
                </>
              )}

              {(b.s_cholesterol || b.s_triglycerides) && (
                <>
                  <SubHeader title="LIPID PROFILE" />
                  <Row label="S. Cholesterol (Total)" value={b.s_cholesterol} unit="mg/dL" refRange="140 - 200" />
                  <Row label="S. Triglycerides" value={b.s_triglycerides} unit="mg/dL" refRange="40 - 160" />
                </>
              )}

              {(b.sgpt || b.sgot || b.alk_phosphatase || b.total_protein) && (
                <>
                  <SubHeader title="LIVER FUNCTION TEST (LFT)" />
                  <Row label="S.G.P.T. (ALT)" value={b.sgpt} unit="U/L" refRange="0 - 49" />
                  <Row label="S.G.O.T. (AST)" value={b.sgot} unit="U/L" refRange="0 - 40" />
                  <Row label="S. Alkaline Phosphatase" value={b.alk_phosphatase} unit="U/L" refRange="30 - 130" />
                  <Row label="S. Total Protein" value={b.total_protein} unit="g/dL" refRange="6.4 - 8.2" />
                  <Row label="S. Albumin" value={b.albumin} unit="g/dL" refRange="3.4 - 5.0" />
                  <Row label="S. Globulin" value={b.globulin} unit="g/dL" refRange="1.9 - 3.9" />
                </>
              )}

              {(b.s_calcium || b.s_phosphorus) && (
                <>
                  <SubHeader title="MINERALS" />
                  <Row label="Serum Calcium" value={b.s_calcium} unit="mg/dL" refRange="8.20 - 9.60" />
                  <Row label="Serum Phosphorus" value={b.s_phosphorus} unit="mg/dL" refRange="2.20 - 3.90" />
                </>
              )}

              {b.hb_a1c && <SubHeader title="GLYCATED HAEMOGLOBIN" />}
              <Row label="HbA1c" value={b.hb_a1c} unit="%" refRange="4.0 - 5.6" />

              {b.vitamin_d && <SubHeader title="VITAMIN D" />}
              <Row label="Vitamin D (25-OH)" value={b.vitamin_d} unit="ng/mL" refRange="30 - 100" />

              {b.bilirubin_total && (
                <>
                  <SubHeader title="SERUM BILIRUBIN" />
                  <Row label="Bilirubin (Total)" value={b.bilirubin_total} unit="mg/dL" refRange="0.2 - 1.2" />
                  <Row label="Bilirubin (Direct)" value={b.bilirubin_direct} unit="mg/dL" refRange="0.0 - 0.2" />
                  <Row label="Bilirubin (Indirect)" value={b.bilirubin_indirect} unit="mg/dL" refRange="0 - 0.8" />
                </>
              )}

              <MethodNote text="Automated Spectrophotometry Based Assay" />
            </>
          )}

          {/* SEROLOGY */}
          {hasSection('serology') && (s.widal_o || s.hiv1 || s.hbs_ag || s.dengue_igg || s.malaria) && (
            <>
              <SectionHeader title="Serology" />

              {(s.widal_o || s.widal_h) && (
                <>
                  <SubHeader title="WIDAL TEST (Slide Agglutination Method)" />
                  <Row label="S. Typhi 'O'" value={s.widal_o} unit="" refRange="Negative 1:20" />
                  <Row label="S. Typhi 'H'" value={s.widal_h} unit="" refRange="Negative 1:20" />
                  <Row label="S. Paratyphi 'AH'" value={s.widal_ah} unit="" refRange="Negative 1:20" />
                  <Row label="S. Paratyphi 'BH'" value={s.widal_bh} unit="" refRange="Negative 1:20" />
                </>
              )}

              {(s.hiv1 || s.hiv2 || s.hbs_ag || s.hcv || s.vdrl || s.tpha) && (
                <SubHeader title="INFECTIOUS DISEASE MARKERS" />
              )}
              <Row label="HIV - I" value={s.hiv1} unit="" refRange="" />
              <Row label="HIV - II" value={s.hiv2} unit="" refRange="" />
              <Row label="HBs Ag (Hepatitis B Surface Antigen)" value={s.hbs_ag} unit="" refRange="" />
              <Row label="HCV (Anti-Hepatitis C)" value={s.hcv} unit="" refRange="" />
              <Row label="VDRL (Syphilis)" value={s.vdrl} unit="" refRange="" />
              <Row label="TPHA" value={s.tpha} unit="" refRange="" />
              <Row label="RA Factor" value={s.ra_factor} unit="" refRange="" />
              <Row label="ASO (Anti Streptolysin O)" value={s.aso} unit="" refRange="" />
              <Row label="C-Reactive Protein (CRP)" value={s.crp} unit="" refRange="" />

              {(s.dengue_igg || s.dengue_igm || s.dengue_ns1) && (
                <>
                  <SubHeader title="DENGUE PANEL" />
                  <Row label="Dengue (NS1 Antigen)" value={s.dengue_ns1} unit="" refRange="" />
                  <Row label="Dengue IgM" value={s.dengue_igm} unit="" refRange="" />
                  <Row label="Dengue IgG" value={s.dengue_igg} unit="" refRange="" />
                </>
              )}

              <Row label="Malaria (Card Test)" value={s.malaria} unit="" refRange="" />
              <Row label="Chikungunya IgM" value={s.chikungunya} unit="" refRange="" />
              <Row label="Troponin-T" value={s.troponin} unit="" refRange="" />
              {(s.sero_mtb_igg || s.sero_mtb_igm) && <SubHeader title="TUBERCULOSIS" />}
              <Row label="Sero Check-MTB (IgG)" value={s.sero_mtb_igg} unit="" refRange="" />
              <Row label="Sero Check-MTB (IgM)" value={s.sero_mtb_igm} unit="" refRange="" />
              <MethodNote text="Immunochromatography / ELISA Method" />
            </>
          )}

          {/* URINE */}
          {hasSection('urine') && (u.colour || u.albumin || u.pus_cells) && (
            <>
              <SectionHeader title="Urine Examination" />
              <SubHeader title="PHYSICAL PROPERTIES" />
              <Row label="Colour" value={u.colour} unit="" refRange="" />
              <Row label="Appearance" value={u.appearance} unit="" refRange="" />
              <Row label="Reaction / pH" value={u.reaction || u.ph} unit="" refRange="4.6 - 8.0" />
              <Row label="Specific Gravity" value={u.specific_gravity} unit="" refRange="1.005 - 1.030" />
              <SubHeader title="CHEMICAL EXAMINATION" />
              <Row label="Albumin" value={u.albumin} unit="" refRange="Nil" />
              <Row label="Sugar" value={u.sugar} unit="" refRange="Nil" />
              <Row label="Ketone Bodies" value={u.ketone} unit="" refRange="Nil" />
              <Row label="Bile Salt" value={u.bile_salt} unit="" refRange="Nil" />
              <Row label="Bile Pigment" value={u.bile_pigment} unit="" refRange="Nil" />
              <Row label="Urobilinogen" value={u.urobilinogen} unit="" refRange="Normal" />
              <Row label="Occult Blood" value={u.occult_blood} unit="" refRange="Nil" />
              <Row label="Nitrites" value={u.nitrites} unit="" refRange="Nil" />
              <Row label="Bilirubin" value={u.bilirubin} unit="" refRange="Nil" />
              <Row label="Pregnancy Test" value={u.pregnancy_test} unit="" refRange="" />
              <SubHeader title="MICROSCOPIC EXAMINATION" />
              <Row label="Pus Cells" value={u.pus_cells} unit="/HPF" refRange="0 - 4" />
              <Row label="Red Blood Cells (RBC)" value={u.rbc} unit="/HPF" refRange="0 - 2" />
              <Row label="Epithelial Cells" value={u.epithelial_cells} unit="" refRange="Few" />
              <Row label="Casts" value={u.casts} unit="" refRange="Nil" />
              <Row label="Crystals" value={u.crystals} unit="" refRange="Nil" />
              <Row label="Flagellates" value={u.flagellates} unit="" refRange="Nil" />
              {u.other_findings && <Row label="Other Findings" value={u.other_findings} unit="" refRange="" />}
              {(u.urine_sugar_f || u.urine_sugar_pp || u.urine_sugar_r) && (
                <SubHeader title="URINE SUGAR" />
              )}
              <Row label="Urine Sugar (Fasting)" value={u.urine_sugar_f} unit="" refRange="Nil" />
              <Row label="Urine Sugar (PP)" value={u.urine_sugar_pp} unit="" refRange="Nil" />
              <Row label="Urine Sugar (Random)" value={u.urine_sugar_r} unit="" refRange="Nil" />
              <MethodNote text="Urinalysis Analyzer" />
            </>
          )}

        </tbody>
      </table>

      {/* ===== END OF REPORT ===== */}
      <div style={{ textAlign: 'center', fontSize: 10, color: '#555', borderTop: '1px solid #ccc', borderBottom: '1px solid #ccc', padding: '6px 0', margin: '8px 0 20px' }}>
        ----------- End of report -----------
      </div>

      {/* ===== FOOTER ===== */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
        <tbody>
          <tr>
            <td style={{ width: '33%', textAlign: 'left', verticalAlign: 'bottom', paddingTop: 30 }}>
              <div style={{ borderTop: '1px solid #333', width: 100, marginBottom: 4 }} />
              <div style={{ fontSize: 10.5, fontWeight: 700 }}>Lab Incharge</div>
            </td>
            <td style={{ width: '34%', textAlign: 'center', verticalAlign: 'bottom' }}>
              {/* Barcode placeholder */}
              <div style={{ display: 'inline-block', border: '1px solid #ddd', padding: '4px 8px', fontSize: 8, color: '#888', letterSpacing: 2 }}>
                ||||||||||||||||||||||||
              </div>
              <div style={{ fontSize: 8, color: '#888', marginTop: 1 }}>{patient.sid}</div>
            </td>
            <td style={{ width: '33%', textAlign: 'right', verticalAlign: 'bottom', paddingTop: 30 }}>
              <div style={{ borderTop: '1px solid #333', width: 120, marginBottom: 4, marginLeft: 'auto' }} />
              <div style={{ fontSize: 10.5, fontWeight: 700 }}>
                {labDoctor ? `Dr. ${labDoctor}` : 'Consultant Pathologist'}
              </div>
              {labDoctor && (
                <div style={{ fontSize: 9, color: '#555' }}>Consultant Pathologist</div>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ===== LEGAL DISCLAIMER ===== */}
      <div style={{ fontSize: 8.5, color: '#555', borderTop: '1px solid #ccc', paddingTop: 6, marginBottom: 4 }}>
        <strong>Note:</strong> Pathological Tests have technical limitations. For any disparity, repeated examination is required. No legal liability is accepted. Clinical correlation is also recommended.
      </div>

      {/* ===== PAGE NUMBER ===== */}
      <div style={{ textAlign: 'right', fontSize: 9, color: '#888', marginBottom: 4 }}>
        Page 1 of 1
      </div>

      {/* ===== BOTTOM NOTE ===== */}
      <div style={{ fontSize: 8, color: '#666', borderTop: '1px solid #eee', paddingTop: 4, fontStyle: 'italic' }}>
        If test results are alarming or unexpected, client advised to contact the laboratory immediately for possible action.
        Tests conducted at {labName}.
      </div>

    </div>
  )
}
