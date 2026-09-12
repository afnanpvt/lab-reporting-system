// One-off demo data seeder for the Vaniyambadi (superlab) demo.
// Run with the dev app STOPPED (sql.js loads the whole file into memory and
// writes it back whole, so a concurrently running app would clobber this).
//
//   node scripts/seed-vaniyambadi-demo.js
//
const path = require('path')
const fs = require('fs')
const initSqlJs = require('sql.js')

const dbPath = path.join(process.cwd(), 'lab-data.db')

async function main() {
  const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm')
  const SQL = await initSqlJs({ locateFile: () => wasmPath })

  if (!fs.existsSync(dbPath)) {
    console.error('lab-data.db not found at', dbPath, '- run the app once first so tables get created.')
    process.exit(1)
  }
  const db = new SQL.Database(fs.readFileSync(dbPath))

  function run(sql, params = []) {
    const stmt = db.prepare(sql)
    stmt.run(params)
    stmt.free()
  }
  function get(sql, params = []) {
    const stmt = db.prepare(sql)
    stmt.bind(params)
    const row = stmt.step() ? stmt.getAsObject() : null
    stmt.free()
    return row
  }

  // ---- Doctors ----
  const doctors = [
    { name: 'Dr. Arvind Nair', specialty: 'General Medicine', phone: '94422 10011' },
    { name: 'Dr. Kavitha Rajan', specialty: 'Gynaecology', phone: '94422 10022' },
    { name: 'Dr. Suresh Babu', specialty: 'Orthopaedics', phone: '94422 10033' },
    { name: 'Dr. Meena Krishnan', specialty: 'Paediatrics', phone: '94422 10044' },
    { name: 'Dr. Ilamaran Chezhiyan', specialty: 'General Physician', phone: '94422 10055' }
  ]
  const doctorNames = []
  for (const d of doctors) {
    const existing = get('SELECT id FROM doctors WHERE name=?', [d.name])
    if (!existing) {
      run('INSERT INTO doctors (name, specialty, phone) VALUES (?,?,?)', [d.name, d.specialty, d.phone])
    }
    doctorNames.push(d.name)
  }

  // ---- Rate card (defaults, only if not already set) ----
  const rateCard = {
    haematology: 250, biochemistry: 400, serology: 350, urine: 150, motion: 150,
    cs: 500, mantoux: 200, gtt_lipid: 450, blood: 200, electrolytes: 350,
    lft: 400, abg_sputum: 450
  }
  for (const [section, amount] of Object.entries(rateCard)) {
    const existing = get('SELECT section FROM rate_card WHERE section=?', [section])
    if (!existing) run('INSERT INTO rate_card (section, amount) VALUES (?,?)', [section, amount])
  }

  // ---- Patients ----
  const sidRow = get("SELECT value FROM lab_settings WHERE key='sid_counter'")
  let counter = parseInt(String(sidRow ? sidRow.value : '1'))

  function fmtDate(d) {
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${dd}/${mm}/${d.getFullYear()}`
  }
  function fmtTime(d) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  function daysAgo(n) {
    const d = new Date()
    d.setDate(d.getDate() - n)
    d.setHours(9 + (n % 6), 15 + (n % 40), 0, 0)
    return d
  }

  const patients = [
    {
      name: 'Muthu Kumaran', age: 45, ageUnit: 'Y', gender: 'M',
      address: 'Bazaar Street, Vaniyambadi', mobile: '9843211001',
      referredBy: 'Dr. Arvind Nair', daysAgo: 0,
      sections: ['haematology', 'biochemistry', 'urine'],
      results: {
        haematology: { haemoglobin: '13.8', rbc_count: '4.6', pcv: '42', total_wbc: '7200', neutrophils: '58', lymphocytes: '34', monocytes: '5', eosinophils: '2', basophils: '1', platelet_count: '2.4', mcv: '91.3', mch: '30', mchc: '32.8', esr: '10', blood_group: 'O+ve', rh_typing: 'Positive' },
        biochemistry: { glucose_f: '96', glucose_pp: '132', blood_urea: '28', s_creatinine: '0.9', s_uric_acid: '5.1', s_cholesterol: '188', s_triglycerides: '140', sgpt: '30', sgot: '28', total_protein: '7.3', albumin: '4.4' },
        urine: { colour: 'Pale Yellow', appearance: 'Clear', reaction: 'Acidic', albumin: 'Nil', sugar: 'Nil', pus_cells: '2-3', rbc: 'Nil', epithelial_cells: '1-2' }
      }
    },
    {
      name: 'Selvi Ramachandran', age: 32, ageUnit: 'Y', gender: 'F',
      address: 'Melvisharam Road, Vaniyambadi', mobile: '9843211002',
      referredBy: 'Dr. Kavitha Rajan', daysAgo: 0,
      sections: ['haematology', 'serology'],
      results: {
        haematology: { haemoglobin: '11.2', rbc_count: '4.1', pcv: '35', total_wbc: '8100', neutrophils: '62', lymphocytes: '30', monocytes: '5', eosinophils: '2', basophils: '1', platelet_count: '2.9', mcv: '85.4', mch: '27.3', mchc: '32', esr: '18', blood_group: 'B+ve', rh_typing: 'Positive' },
        serology: { hbs_ag: 'Non-Reactive', hiv1: 'Non-Reactive', hiv2: 'Non-Reactive', vdrl: 'Non-Reactive', widal_o: 'Negative', widal_h: 'Negative' }
      }
    },
    {
      name: 'Baby Iniya', age: 4, ageUnit: 'Y', gender: 'F',
      address: 'Ambur Road, Vaniyambadi', mobile: '9843211003',
      referredBy: 'Dr. Meena Krishnan', daysAgo: 1,
      sections: ['haematology', 'motion'],
      results: {
        haematology: { haemoglobin: '11.8', rbc_count: '4.4', pcv: '36', total_wbc: '9800', neutrophils: '45', lymphocytes: '48', monocytes: '4', eosinophils: '3', basophils: '0', platelet_count: '3.1', mcv: '82', mch: '26.8', mchc: '32.7', esr: '8' },
        motion: { colour: 'Brown', consistency: 'Semi-formed', reaction: 'Neutral', blood: 'Absent', mucus: 'Absent', pus_cells: '1-2', rbc: 'Nil', ova_cyst: 'Not seen' }
      }
    },
    {
      name: 'Rajendran Pillai', age: 61, ageUnit: 'Y', gender: 'M',
      address: 'Gandhi Nagar, Vaniyambadi', mobile: '9843211004',
      referredBy: 'Dr. Suresh Babu', daysAgo: 1,
      sections: ['biochemistry', 'lft', 'electrolytes'],
      results: {
        biochemistry: { glucose_f: '142', glucose_pp: '218', hb_a1c: '7.8', blood_urea: '34', s_creatinine: '1.1', s_uric_acid: '6.4', s_cholesterol: '212', s_triglycerides: '175', total_protein: '6.9', albumin: '3.9' },
        lft: { bilirubin_total: '0.8', bilirubin_direct: '0.2', bilirubin_indirect: '0.6', sgot: '34', sgpt: '38', alk_phosphatase: '96', ggt: '30', total_protein: '6.9', albumin: '3.9', globulin: '3', ag_ratio: '1.3' },
        electrolytes: { sodium: '138', potassium: '4.2', chloride: '101', bicarbonate: '24', calcium: '9.1', phosphorus: '3.4', magnesium: '2.0' }
      }
    },
    {
      name: 'Farhana Begum', age: 27, ageUnit: 'Y', gender: 'F',
      address: 'Nellikuppam Street, Vaniyambadi', mobile: '9843211005',
      referredBy: 'Dr. Kavitha Rajan', daysAgo: 2,
      sections: ['haematology', 'urine', 'serology'],
      results: {
        haematology: { haemoglobin: '10.4', rbc_count: '3.8', pcv: '33', total_wbc: '7600', neutrophils: '60', lymphocytes: '32', monocytes: '5', eosinophils: '2', basophils: '1', platelet_count: '2.7', mcv: '86.8', mch: '27.4', mchc: '31.5', esr: '22', blood_group: 'A+ve', rh_typing: 'Positive' },
        urine: { colour: 'Pale Yellow', appearance: 'Clear', reaction: 'Acidic', albumin: 'Trace', sugar: 'Nil', pregnancy_test: 'Positive', pus_cells: '1-2', rbc: 'Nil' },
        serology: { vdrl: 'Non-Reactive', hiv1: 'Non-Reactive', hiv2: 'Non-Reactive', hbs_ag: 'Non-Reactive' }
      }
    },
    {
      name: 'Chezhian Murugesan', age: 38, ageUnit: 'Y', gender: 'M',
      address: 'Pernambut Road, Vaniyambadi', mobile: '9843211006',
      referredBy: 'Self', daysAgo: 2,
      sections: ['cs', 'urine'],
      results: {
        cs: { specimen: 'Urine', organism: 'E. coli', colony_count: '>10^5 CFU/mL', remarks: 'Sensitive to Nitrofurantoin, Ciprofloxacin' },
        urine: { colour: 'Cloudy', appearance: 'Turbid', reaction: 'Alkaline', albumin: '+', sugar: 'Nil', pus_cells: '15-20', rbc: '2-3', nitrites: 'Positive' }
      }
    },
    {
      name: 'Lakshmi Narayanan', age: 55, ageUnit: 'Y', gender: 'F',
      address: 'Kongarpalayam, Vaniyambadi', mobile: '9843211007',
      referredBy: 'Dr. Arvind Nair', daysAgo: 3,
      sections: ['gtt_lipid', 'biochemistry'],
      results: {
        gtt_lipid: { fasting: '108', one_hour: '176', two_hour: '142', total_cholesterol: '224', hdl: '42', ldl: '148', vldl: '34', triglycerides: '168', cholesterol_hdl_ratio: '5.3' },
        biochemistry: { glucose_f: '108', glucose_pp: '156', s_cholesterol: '224', s_triglycerides: '168', blood_urea: '22', s_creatinine: '0.8' }
      }
    },
    {
      name: 'Master Aadhavan', age: 9, ageUnit: 'Y', gender: 'M',
      address: 'Odugathur Road, Vaniyambadi', mobile: '9843211008',
      referredBy: 'Dr. Meena Krishnan', daysAgo: 3,
      sections: ['mantoux', 'haematology'],
      results: {
        mantoux: { reading: '6 mm', interpretation: 'Negative', remarks: 'No induration of significance' },
        haematology: { haemoglobin: '12.6', rbc_count: '4.5', pcv: '38', total_wbc: '8900', neutrophils: '48', lymphocytes: '44', monocytes: '5', eosinophils: '3', basophils: '0', platelet_count: '3.3', mcv: '84.4', mch: '28', mchc: '33.2', esr: '6' }
      }
    },
    {
      name: 'Abdul Kareem', age: 68, ageUnit: 'Y', gender: 'M',
      address: 'Melpalli Street, Vaniyambadi', mobile: '9843211009',
      referredBy: 'Dr. Ilamaran Chezhiyan', daysAgo: 4,
      sections: ['abg_sputum', 'electrolytes'],
      results: {
        abg_sputum: { ph: '7.38', po2: '78', pco2: '42', hco3: '23', o2_sat: '95', base_excess: '-1.2', fio2: '21', sputum_appearance: 'Mucopurulent', afb_smear: 'Negative', culture: 'No growth after 48 hrs' },
        electrolytes: { sodium: '135', potassium: '4.6', chloride: '99', bicarbonate: '23', calcium: '8.8', phosphorus: '3.1', magnesium: '1.9' }
      }
    },
    {
      name: 'Deepa Saravanan', age: 24, ageUnit: 'Y', gender: 'F',
      address: 'Chinnakannampalayam, Vaniyambadi', mobile: '9843211010',
      referredBy: 'Self', daysAgo: 5,
      sections: ['blood', 'haematology'],
      results: {
        blood: { blood_group: 'AB+ve', rh_type: 'Positive', cross_match: 'Compatible', direct_coombs: 'Negative', indirect_coombs: 'Negative' },
        haematology: { haemoglobin: '12.9', rbc_count: '4.3', pcv: '39', total_wbc: '6800', neutrophils: '55', lymphocytes: '38', monocytes: '4', eosinophils: '2', basophils: '1', platelet_count: '2.8', mcv: '90.7', mch: '30', mchc: '33.1', esr: '9', blood_group: 'AB+ve', rh_typing: 'Positive' }
      }
    }
  ]

  const SECTION_TABLES = {
    haematology: 'haematology', biochemistry: 'biochemistry', serology: 'serology',
    urine: 'urine', motion: 'motion', cs: 'culture_sensitivity', mantoux: 'mantoux',
    gtt_lipid: 'gtt_lipid', blood: 'blood_group', electrolytes: 'electrolytes',
    lft: 'lft', abg_sputum: 'abg_sputum'
  }

  for (const p of patients) {
    const sid = String(counter).padStart(6, '0')
    const d = daysAgo(p.daysAgo)
    const dateStr = fmtDate(d)
    const timeStr = fmtTime(d)
    run(
      `INSERT INTO patients (sid, name, age, age_unit, gender, address, mobile, referred_by, reg_date, reg_time, rpt_date, rpt_time, sections, consent_given)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [sid, p.name, p.age, p.ageUnit, p.gender, p.address, p.mobile, p.referredBy, dateStr, timeStr, dateStr, timeStr, JSON.stringify(p.sections), 1]
    )
    const pid = get('SELECT id FROM patients ORDER BY rowid DESC LIMIT 1').id
    counter += 1

    for (const [section, values] of Object.entries(p.results)) {
      const table = SECTION_TABLES[section]
      const cols = Object.keys(values)
      const placeholders = cols.map(() => '?').join(',')
      run(
        `INSERT OR REPLACE INTO ${table} (patient_id, ${cols.join(', ')}) VALUES (?, ${placeholders})`,
        [pid, ...cols.map((c) => values[c])]
      )
    }

    // A modest bill-item override on a couple of patients, so Billing has something to show
    if (p.sections.includes('cs')) run('INSERT OR REPLACE INTO bill_items (patient_id, section, amount) VALUES (?,?,?)', [pid, 'cs', 550])
    if (p.sections.includes('gtt_lipid')) run('INSERT OR REPLACE INTO bill_items (patient_id, section, amount) VALUES (?,?,?)', [pid, 'gtt_lipid', 500])
  }

  run("UPDATE lab_settings SET value=? WHERE key='sid_counter'", [String(counter)])

  fs.writeFileSync(dbPath, Buffer.from(db.export()))
  console.log(`Seeded ${patients.length} patients and ${doctorNames.length} doctors into ${dbPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
