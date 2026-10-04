#!/usr/bin/env node
/**
 * Regression test for report pagination (src/pages/site/pagination.ts).
 *
 *   npm run test:pagination
 *
 * Runs the paginator over thousands of random reports — random sections, row counts and row heights
 * (including very tall rows, like long results that wrap) with random page metrics — and checks the
 * rules that matter on paper:
 *
 *   - every row is printed exactly once, in order (nothing lost, nothing duplicated)
 *   - no page is over-full: its blocks fit inside the page's usable height (otherwise the page's
 *     overflow:hidden clips rows off the bottom)
 *   - no page holds only the patient header while the report continues
 *   - the sign-off is almost never alone on a page, and never when it could have travelled with rows
 *
 * It tests the paginator's logic with injected sizes. Real heights come from measuring the rendered
 * page (measureReport.ts); the on-screen check of that lives in the handbook's release checklist.
 */
const path = require('path')
const os = require('os')
const fs = require('fs')
const esbuild = require('esbuild')

const root = path.join(__dirname, '..')
const out = path.join(os.tmpdir(), `lumalabs-pagination-test-${process.pid}.js`)

esbuild.buildSync({
  // PAGINATION_FILE lets the test be pointed at another version (e.g. to confirm it catches an old bug).
  entryPoints: [process.env.PAGINATION_FILE ? path.resolve(process.env.PAGINATION_FILE) : path.join(root, 'src/pages/site/pagination.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: out,
  logLevel: 'error'
})
const { paginateReport } = require(out)
fs.unlinkSync(out)

// ---- a tiny seeded random generator so a failure can be reproduced ----
let seed = Number(process.env.SEED) || 20261002
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1))

// Real section keys and their labels (see src/types/lab.ts); the paginator only needs which keys are filled.
const SECTIONS = [
  ['haematology', 'Haematology', 24], ['biochemistry', 'Biochemistry', 24], ['serology', 'Serology', 20],
  ['urine', 'Urine', 20], ['motion', 'Motion', 12], ['cs', 'C.S.', 24], ['mantoux', 'Mantoux', 3],
  ['gtt_lipid', 'GTT / SA / Lipid', 11], ['blood', 'Blood', 5], ['electrolytes', 'Electrolytes', 7],
  ['lft', 'L.F.T.', 13], ['abg_sputum', 'ABG / Sputum', 10]
]

const CASES = Number(process.env.CASES) || 20000
const fail = []
const stats = { cases: 0, pages: 0, closingAlone: 0, closingAloneUnavoidable: 0 }
const note = (msg) => { if (fail.length < 10) fail.push(msg) }

for (let n = 0; n < CASES; n++) {
  // random page geometry and block sizes, in the range real measurements fall in (and beyond)
  const contentHeight = int(560, 720)
  const blockGap = 24
  const patientInfo = int(70, 110)
  const closing = int(90, 150)
  const emptySection = int(55, 80)
  const fixedFirst = int(50, 95)
  const fixedCont = int(50, 95)
  const tallRows = rnd() < 0.5 // half the runs include rows that wrap to several lines
  const heights = {}
  const chosen = []
  const results = {}
  const count = int(1, 5)
  while (chosen.length < count) {
    const s = SECTIONS[int(0, SECTIONS.length - 1)]
    if (!chosen.includes(s)) chosen.push(s)
  }
  for (const [key, , max] of chosen) {
    const filled = rnd() < 0.15 ? 0 : int(1, max)
    results[key] = {}
    heights[key] = {}
    for (let i = 0; i < filled; i++) {
      const k = 'f' + i
      results[key][k] = 'v'
      // 38px is a normal row; wrapped rows go much taller (still able to fit on a page with the header)
      heights[key][k] = tallRows && rnd() < 0.3 ? int(60, 300) : 38
    }
  }
  const metrics = {
    contentHeight,
    blockGap,
    patientInfo,
    emptySection,
    closing,
    chunkFixed: (_s, continued) => (continued ? fixedCont : fixedFirst),
    rowHeight: (s, k) => heights[s][k]
  }
  const patient = { sections: chosen.map(([, label]) => label) }
  const desc = () => chosen.map(([k]) => `${k}:${Object.keys(results[k]).length}`).join(', ') + ` content=${contentHeight} closing=${closing}${tallRows ? ' tall' : ''} (case ${n}, seed ${process.env.SEED || 'default'})`

  let pages
  try {
    pages = paginateReport(patient, results, metrics)
  } catch (e) {
    note(`THREW ${e.message} — ${desc()}`)
    continue
  }
  stats.cases++
  stats.pages += pages.length

  // 1. every row exactly once, in order
  for (const [key] of chosen) {
    const expected = Object.keys(results[key])
    const got = pages.flat().filter((b) => b.kind === 'sectionChunk' && b.sectionKey === key).flatMap((b) => b.keys)
    if (JSON.stringify(got) !== JSON.stringify(expected)) note(`ROWS LOST/DUPLICATED in ${key}: expected ${expected.length}, got ${got.length} — ${desc()}`)
  }

  // heights of each block, as the paginator should have counted them
  const blockHeight = (b) =>
    b.kind === 'patientInfo' ? patientInfo
    : b.kind === 'closing' ? closing
    : b.kind === 'emptySection' ? emptySection
    : (b.continued ? fixedCont : fixedFirst) + b.keys.reduce((s, k) => s + heights[b.sectionKey][k], 0)

  pages.forEach((page, i) => {
    const used = page.reduce((s, b) => s + blockHeight(b), 0) + Math.max(0, page.length - 1) * blockGap
    // 2. nothing over-full (a single block alone on a page may exceed it only if one row can never fit)
    const lonelyOversize = page.length === 1 && page[0].kind === 'sectionChunk' && page[0].keys.length === 1
    if (used > contentHeight + 0.01 && !lonelyOversize) note(`PAGE ${i + 1} OVER-FULL ${used.toFixed(0)} > ${contentHeight} — ${desc()}`)

    const isLast = i === pages.length - 1
    // 3. never a page of only the patient header while the report goes on
    if (!isLast && page.length === 1 && page[0].kind === 'patientInfo') note(`PAGE ${i + 1} HOLDS ONLY THE HEADER — ${desc()}`)
    if (page.length === 0) note(`PAGE ${i + 1} IS EMPTY — ${desc()}`)

    // 4. the sign-off alone on a page
    if (page.length === 1 && page[0].kind === 'closing' && pages.length > 1) {
      stats.closingAlone++
      // Unavoidable only when the previous page ended in something that cannot be split or moved
      // (an empty-section notice, or a chunk of <= 2 rows that could not be moved without leaving
      // the page nearly empty).
      const prev = pages[i - 1]
      const last = prev[prev.length - 1]
      const cannotHelp = last.kind === 'emptySection' || (last.kind === 'sectionChunk' && last.keys.length <= 2) || last.kind === 'patientInfo'
      if (cannotHelp) stats.closingAloneUnavoidable++
      else note(`SIGN-OFF ALONE although the last section could share its page — ${desc()}`)
    }
  })
}

console.log(`paginated ${stats.cases} random reports into ${stats.pages} pages`)
console.log(`sign-off alone on a page: ${stats.closingAlone} (${stats.closingAloneUnavoidable} unavoidable)`)
if (fail.length) {
  console.log(`\nFAILED — first ${fail.length} problems:`)
  for (const f of fail) console.log('  ' + f)
  process.exit(1)
}
console.log('OK — all pagination rules hold')
