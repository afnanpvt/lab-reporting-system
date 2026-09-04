import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { is } from '@electron-toolkit/utils'

// sql.js types
type SqlDatabase = {
  run(sql: string, params?: unknown[]): void
  exec(sql: string): void
  prepare(sql: string): SqlStatement
  export(): Uint8Array
  close(): void
}

type SqlStatement = {
  run(params?: unknown[]): void
  get(params?: unknown[]): Record<string, unknown> | undefined
  all(params?: unknown[]): Record<string, unknown>[]
  free(): void
  bind(params: unknown[]): void
  step(): boolean
  getAsObject(params?: unknown[]): Record<string, unknown>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SQL: any
let db: SqlDatabase
let dbPath: string

export function getDb(): SqlDatabase {
  return db
}

/**
 * Forces lab_name to whatever the verified license authorizes, every single startup —
 * regardless of what's currently in the database. This is the actual enforcement point:
 * even someone who edits the SQLite file directly (bypassing the UI entirely, which never
 * exposed an edit control for this field anyway) gets overwritten back to the licensed
 * name the next time the app launches. Only a new signed license file changes this.
 */
export function lockLabName(labName: string): void {
  dbRun('INSERT OR REPLACE INTO lab_settings (key, value) VALUES (?, ?)', ['lab_name', labName])
}

export async function initDb(): Promise<void> {
  dbPath = is.dev
    ? join(process.cwd(), 'lab-data.db')
    : join(app.getPath('userData'), 'lab-data.db')

  // sql.js needs the WASM file - find it in node_modules
  const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm')

  // Dynamic import of sql.js (ESM/CJS compat)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const initSqlJs = require('sql.js')
  SQL = await initSqlJs({ locateFile: () => wasmPath })

  if (existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  createTables()
  persist()
}

function persist(): void {
  try {
    const data = db.export()
    const buffer = Buffer.from(data)
    const dir = join(dbPath, '..')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(dbPath, buffer)
  } catch (e) {
    console.error('DB persist error:', e)
  }
}

// Wrap run to auto-persist
export function dbRun(sql: string, params: unknown[] = []): void {
  const stmt = db.prepare(sql)
  stmt.run(params)
  stmt.free()
  persist()
}

export function dbGet(sql: string, params: unknown[] = []): Record<string, unknown> | null {
  const stmt = db.prepare(sql)
  const result = stmt.getAsObject(params)
  stmt.free()
  return Object.keys(result).length === 0 ? null : result
}

export function dbAll(sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = []
  const stmt = db.prepare(sql)
  stmt.bind(params)
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

function addColumnIfNotExists(table: string, col: string, def: string): void {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`)
  } catch {
    // column already exists
  }
}

function createTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lab_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sid TEXT,
      name TEXT NOT NULL,
      age INTEGER,
      age_unit TEXT DEFAULT 'Y',
      gender TEXT DEFAULT 'M',
      address TEXT DEFAULT '',
      mobile TEXT DEFAULT '',
      referred_by TEXT,
      reg_date TEXT,
      reg_time TEXT,
      rpt_date TEXT,
      rpt_time TEXT,
      sections TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS haematology (
      patient_id INTEGER PRIMARY KEY,
      haemoglobin TEXT, rbc_count TEXT, pcv TEXT, total_wbc TEXT,
      neutrophils TEXT, eosinophils TEXT, basophils TEXT,
      lymphocytes TEXT, monocytes TEXT,
      esr TEXT, esr_quarter TEXT, esr_half TEXT, esr_3quarter TEXT, esr_one TEXT,
      abs_eosinophil TEXT, platelet_count TEXT, reticulocyte TEXT,
      mcv TEXT, mch TEXT, mchc TEXT,
      smear_mp TEXT, smear_mf TEXT,
      bleeding_time TEXT, clotting_time TEXT,
      blood_group TEXT, rh_typing TEXT,
      ict TEXT, dct TEXT
    );

    CREATE TABLE IF NOT EXISTS biochemistry (
      patient_id INTEGER PRIMARY KEY,
      glucose_f TEXT, glucose_pp TEXT, glucose_r TEXT,
      blood_urea TEXT, blood_urea_pre TEXT, blood_urea_post TEXT,
      s_creatinine TEXT, s_uric_acid TEXT,
      s_cholesterol TEXT, s_triglycerides TEXT,
      sgpt TEXT, sgot TEXT, alk_phosphatase TEXT,
      total_protein TEXT, albumin TEXT, globulin TEXT,
      s_calcium TEXT, s_phosphorus TEXT,
      hb_a1c TEXT, vitamin_d TEXT,
      bilirubin_total TEXT, bilirubin_direct TEXT, bilirubin_indirect TEXT
    );

    CREATE TABLE IF NOT EXISTS serology (
      patient_id INTEGER PRIMARY KEY,
      widal_o TEXT, widal_h TEXT, widal_ah TEXT, widal_bh TEXT,
      vdrl TEXT, tpha TEXT, hiv1 TEXT, hiv2 TEXT,
      hbs_ag TEXT, hcv TEXT, ra_factor TEXT,
      aso TEXT, crp TEXT, dengue_igg TEXT, dengue_igm TEXT, dengue_ns1 TEXT,
      troponin TEXT, sero_mtb_igg TEXT, sero_mtb_igm TEXT,
      malaria TEXT, chikungunya TEXT
    );

    CREATE TABLE IF NOT EXISTS urine (
      patient_id INTEGER PRIMARY KEY,
      colour TEXT, appearance TEXT, reaction TEXT,
      albumin TEXT, sugar TEXT, ketone TEXT,
      bile_salt TEXT, bile_pigment TEXT, urobilinogen TEXT,
      occult_blood TEXT, nitrites TEXT, ph TEXT, specific_gravity TEXT,
      pregnancy_test TEXT,
      pus_cells TEXT, rbc TEXT, epithelial_cells TEXT,
      casts TEXT, crystals TEXT, flagellates TEXT,
      other_findings TEXT,
      bilirubin TEXT, blood_rbc TEXT, leucocytes TEXT,
      urine_sugar_f TEXT, urine_sugar_pp TEXT, urine_sugar_r TEXT
    );

    CREATE TABLE IF NOT EXISTS motion (
      patient_id INTEGER PRIMARY KEY,
      colour TEXT, consistency TEXT, reaction TEXT, blood TEXT, mucus TEXT,
      pus_cells TEXT, rbc TEXT, ova_cyst TEXT, trophozoites TEXT,
      yeast_cells TEXT, fat_globules TEXT, other TEXT
    );

    CREATE TABLE IF NOT EXISTS culture_sensitivity (
      patient_id INTEGER PRIMARY KEY,
      specimen TEXT, organism TEXT, colony_count TEXT, remarks TEXT
    );

    CREATE TABLE IF NOT EXISTS mantoux (
      patient_id INTEGER PRIMARY KEY,
      reading TEXT, interpretation TEXT, remarks TEXT
    );

    CREATE TABLE IF NOT EXISTS gtt_lipid (
      patient_id INTEGER PRIMARY KEY,
      fasting TEXT, one_hour TEXT, two_hour TEXT, three_hour TEXT,
      s_amylase TEXT,
      total_cholesterol TEXT, hdl TEXT, ldl TEXT, vldl TEXT,
      triglycerides TEXT, cholesterol_hdl_ratio TEXT
    );

    CREATE TABLE IF NOT EXISTS blood_group (
      patient_id INTEGER PRIMARY KEY,
      blood_group TEXT, rh_type TEXT, cross_match TEXT,
      direct_coombs TEXT, indirect_coombs TEXT
    );

    CREATE TABLE IF NOT EXISTS electrolytes (
      patient_id INTEGER PRIMARY KEY,
      sodium TEXT, potassium TEXT, chloride TEXT,
      bicarbonate TEXT, calcium TEXT, phosphorus TEXT, magnesium TEXT
    );

    CREATE TABLE IF NOT EXISTS lft (
      patient_id INTEGER PRIMARY KEY,
      bilirubin_total TEXT, bilirubin_direct TEXT, bilirubin_indirect TEXT,
      sgot TEXT, sgpt TEXT, alk_phosphatase TEXT, ggt TEXT,
      total_protein TEXT, albumin TEXT, globulin TEXT, ag_ratio TEXT,
      pt TEXT, inr TEXT
    );

    CREATE TABLE IF NOT EXISTS abg_sputum (
      patient_id INTEGER PRIMARY KEY,
      ph TEXT, po2 TEXT, pco2 TEXT, hco3 TEXT, o2_sat TEXT,
      base_excess TEXT, fio2 TEXT,
      sputum_appearance TEXT, afb_smear TEXT, culture TEXT
    );

    -- "Others" section has no fixed test list — staff type the test name and result
    -- themselves, so it's stored as one JSON object ({ "Test Name": "result", ... })
    -- per patient rather than as fixed columns like the sections above.
    CREATE TABLE IF NOT EXISTS custom_results (
      patient_id INTEGER PRIMARY KEY,
      data TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      specialty TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- Default price per investigation (keyed by the section label, matching
    -- patients.sections). A starting point, not fixed — bill_items below holds
    -- per-patient overrides.
    CREATE TABLE IF NOT EXISTS rate_card (
      section TEXT PRIMARY KEY,
      amount REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS bill_items (
      patient_id INTEGER NOT NULL,
      section TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (patient_id, section)
    );
  `)

  // Safe migrations for existing databases
  addColumnIfNotExists('patients', 'address', "TEXT DEFAULT ''")
  addColumnIfNotExists('patients', 'mobile', "TEXT DEFAULT ''")
  addColumnIfNotExists('patients', 'status', "TEXT DEFAULT 'draft'")
  addColumnIfNotExists('patients', 'consent_given', 'INTEGER DEFAULT 0')

  // C.S. antibiogram — keys must match ANTIBIOTICS in src/types/lab.ts
  const ANTIBIOTIC_KEYS = [
    'amikacin', 'amoxicillin', 'ampicillin', 'azithromycin', 'cefazolin', 'cefotaxime',
    'ceftazidime', 'ceftriaxone', 'cephalexin', 'chloramphenicol', 'ciprofloxacin',
    'clarithromycin', 'cotrimoxazole', 'gentamicin', 'nitrofurantoin', 'norfloxacin',
    'ofloxacin', 'tetracycline', 'tobramycin', 'vancomycin'
  ]
  for (const key of ANTIBIOTIC_KEYS) {
    addColumnIfNotExists('culture_sensitivity', 'abx_' + key, "TEXT DEFAULT ''")
  }

  // Seed defaults for any key not already present — INSERT OR IGNORE is a no-op against an
  // existing row, so this only backfills what's missing (e.g. a dev DB seeded before
  // sid_counter/lab_email existed) and never overwrites a value staff already set.
  // This build is licensed exclusively to Super Lab Service (see license.ts), so their real
  // contact details are the actual defaults here rather than blanks waiting to be typed in —
  // still editable in Settings if any of it ever changes, just not empty on first launch.
  const defaults = [
    ['lab_name', 'Diagnostic Laboratory'],
    ['lab_address', '#92, Opp. Azeem Hospital, Moolakadai Street, P.J. Nehru Road, Vaniyambadi.'],
    ['lab_phone', '99442 38110'],
    ['lab_email', 'superlab.vaniyambadi@gmail.com'],
    ['lab_doctor', 'Dr. Arvind Nair'],
    ['default_printer', ''],
    ['sid_counter', '1']
  ]
  for (const [k, v] of defaults) {
    dbRun('INSERT OR IGNORE INTO lab_settings (key, value) VALUES (?, ?)', [k, v])
  }

  // Rate card defaults — a placeholder starting price list; staff can edit it like any
  // other row via billing:setRateCardAmount, and per-patient bill_items overrides always
  // take priority over whatever is here. Same backfill-only INSERT OR IGNORE pattern.
  const rateDefaults: [string, number][] = [
    ['Haematology', 350],
    ['Biochemistry', 500],
    ['Serology', 600],
    ['Urine', 200],
    ['Motion', 200],
    ['C.S.', 800],
    ['Mantoux', 150],
    ['GTT / SA / Lipid', 700],
    ['Blood', 250],
    ['Electrolytes', 400],
    ['L.F.T.', 550],
    ['ABG / Sputum', 650],
    ['Others', 0]
  ]
  for (const [section, amount] of rateDefaults) {
    dbRun('INSERT OR IGNORE INTO rate_card (section, amount) VALUES (?, ?)', [section, amount])
  }
}
