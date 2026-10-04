#!/usr/bin/env node
/**
 * Regression test for the forgiving search (src/pages/site/fuzzySearch.ts) and the rule that a
 * reference range follows a changed unit (getReferenceRange in reportFields.ts).
 *
 *   npm run test:search
 *
 * Doctors: spelling slips in names ("ravy", "kavita", "mohamad"), qualifications ("mbss"), fields
 * ("cardiolgy") and words that mean the same ("heart", "bone"), run-together names, phone numbers.
 * Patients: names, SID without leading zeros, mobile, tests and referring doctor.
 */
const path = require('path')
const os = require('os')
const fs = require('fs')
const esbuild = require('esbuild')

const root = path.join(__dirname, '..')

function load(entry, name) {
  const out = path.join(os.tmpdir(), `lumalabs-${name}-test-${process.pid}.js`)
  esbuild.buildSync({ entryPoints: [path.join(root, entry)], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'error' })
  const mod = require(out)
  fs.unlinkSync(out)
  return mod
}

// reportFields reads settings through window.api / localStorage; stub them so it can load in node.
global.window = { api: new Proxy({}, { get: () => new Proxy(() => Promise.resolve(null), { get: () => () => Promise.resolve(null) }) }), addEventListener() {} }
global.localStorage = { getItem: () => null, setItem() {} }

const { searchDoctors, searchPatients } = load('src/pages/site/fuzzySearch.ts', 'search')
const rf = load('src/pages/site/reportFields.ts', 'fields')

let failed = 0
function check(label, ok, detail) {
  if (!ok) failed++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? '  ' + detail : ''}`)
}

const D = (id, name, qualifications, specialty, phone = '') => ({ id, name, qualifications, specialty, phone })
const doctors = [
  D(1, 'Dr. Ravi Kumar', 'MBBS, MD (General Medicine)', 'General Medicine', '94422 10011'),
  D(2, 'Dr. Ravindran S', 'MBBS, MS (Ortho)', 'Orthopaedics', '94422 10012'),
  D(3, 'Dr. Kavitha Rajan', 'MBBS, DGO', 'Gynaecology', '94422 10013'),
  D(4, 'Dr. Arvind Nair', 'MBBS, DM (Cardiology)', 'Cardiology', '94422 10014'),
  D(5, 'Dr. Mohamed Ismail', 'MBBS, MD (Paediatrics)', 'Paediatrics', '98765 43210'),
  D(6, 'Dr. R. Kapoor', 'MBBS, MS (Ortho)', 'General Physician', '')
]
function doctorCase(q, want, only = false) {
  const got = searchDoctors(doctors, q).map((m) => m.doctor.id)
  const ok = only ? JSON.stringify(got) === JSON.stringify(want) : want.every((id) => got.slice(0, want.length).includes(id))
  check(`doctors: "${q}"`, ok, `-> ${got.join(',') || 'nobody'}`)
}
doctorCase('ravi', [1])
doctorCase('ravy', [1])
doctorCase('ravi kumr', [1])
doctorCase('rawi kumar', [1])
doctorCase('kavita', [3])
doctorCase('kavitha rajn', [3])
doctorCase('arvnd', [4])
doctorCase('mohammed', [5])
doctorCase('mohamad ismail', [5])
doctorCase('mbss', [1, 2, 3, 4, 5, 6])
doctorCase('cardiolgy', [4])
doctorCase('heart', [4])
doctorCase('bone', [2, 6])
doctorCase('orthopedik', [2, 6])
doctorCase('gynecologist', [3])
doctorCase('childrens', [5])
doctorCase('rkapoor', [6])
doctorCase('kapur', [6])
doctorCase('94422 10013', [3])
doctorCase('10014', [4])
doctorCase('xyzzy', [], true)
doctorCase('', [1, 2, 3, 4, 5, 6], true)

const P = (id, name, sid, sections, referredBy, mobile) => ({ patient: { id, name, sid, sections, referredBy, mobile } })
const patients = [
  P(1, 'Deepa Saravanan', '000011', ['Blood', 'Haematology'], 'Self', '98400 11111'),
  P(2, 'Abdul Kareem', '000010', ['Electrolytes'], 'Dr. Arvind Nair', ''),
  P(3, 'Master Aadhavan', '000009', ['Mantoux'], 'Dr. Meena Krishnan', '90000 12345')
]
function patientCase(q, want) {
  const got = searchPatients(patients, q).map((r) => r.patient.id)
  const ok = JSON.stringify(got.slice(0, want.length)) === JSON.stringify(want) && (want.length > 0 || got.length === 0)
  check(`patients: "${q}"`, ok, `-> ${got.join(',') || 'nobody'}`)
}
patientCase('deepa', [1])
patientCase('depa saravnan', [1])
patientCase('abdhul karim', [2])
patientCase('11', [1])
patientCase('000010', [2])
patientCase('10', [2])
patientCase('haemotology', [1])
patientCase('arvind', [2])
patientCase('mantox', [3])
patientCase('12345', [3])
patientCase('zzzz', [])

// A reference range carries its unit in its text, so it follows a changed unit.
const unitKey = rf.unitOverrideKey('haematology', 'haemoglobin')
const range = (gender, ranges, units) => rf.getReferenceRange('haematology', 'haemoglobin', gender, ranges, units)
check('range: built-in', range('M', {}, {}) === '13.0–17.0 gm/dl')
check('range: unit changed', range('M', {}, { [unitKey]: 'g/L' }) === '13.0–17.0 g/L')
check('range: unit cleared', range('F', {}, { [unitKey]: '' }) === '11.0–15.0')
check('range: custom text is left alone', range('M', { [rf.rangeOverrideKey('haematology', 'haemoglobin', 'M')]: 'Custom text' }, { [unitKey]: 'g/L' }) === 'Custom text')

console.log(failed ? `\n${failed} FAILED` : '\nOK: search and unit rules hold')
process.exit(failed ? 1 : 0)
