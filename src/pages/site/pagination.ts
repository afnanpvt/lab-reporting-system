import { sectionKeyForLabel } from './reportFields'
import type { Patient } from './api'

/**
 * Turns a patient's sections into discrete printed pages, so the on-screen preview shows the
 * exact same page breaks the printed report will have — no more finding out a section got
 * awkwardly split in half only after printing.
 *
 * Every constant below was measured off the real rendered page (see scripts note at the bottom
 * of this comment), not guessed — a guess that's a little off compounds over many rows into
 * either a wasted near-blank trailing page or, worse, a footer silently pushed past the sheet
 * and clipped. Re-measure all of them (getBoundingClientRect on each data-role element in
 * ReportPreview.tsx) if the letterhead, footer, patient strip, or font sizes change again.
 *
 * Real page box: a 297mm sheet, 12mm top/bottom padding -> 1122.5px tall. Measured (single-lab,
 * light theme, 96dpi): letterhead header 105.6px, patient strip 57.8px, content's own 12px top
 * margin, footer 204.3px, a result row 37.85px, a section header 27.1px, a column header
 * 24.05px, the patient-info block 83.1px, the closing block 109.9px. Every block below rounds
 * its measurement up a few px as a safety margin for font-rendering variance across machines.
 * The footer is absolutely positioned against the page box's true bottom edge, bleeding past the
 * page's own bottom padding on purpose (its closing wave is a deliberate edge-to-edge flourish —
 * see ReportPreview.tsx) rather than pushed there by flex, so content's available room is
 * measured up to the footer's top edge directly, not derived from the page's nominal padding.
 */
// Repeats a "Patient / Referred by / SID / Age-Sex" strip under the letterhead on every page (see
// ReportPreview.tsx) so a page separated from the rest of the report still identifies whose it is.
const PATIENT_STRIP_HEIGHT = 58
// Measured gap between content's own top (just past the header+strip) and the footer's top edge
// is 697.5px; a few px of that is a safety buffer for font-rendering variance across machines.
const CONTENT_HEIGHT = 685
// Report rows are 13px text on py-2.
const ROW_HEIGHT = 38
const SECTION_HEADER_HEIGHT = 28
const COLUMN_HEADER_HEIGHT = 25
const EMPTY_NOTICE_HEIGHT = 40
// Title row + SID + Collected/Received/Reported timestamps. The patient/referred-by/age-sex grid
// that used to live here too was removed — it's now covered by the per-page patient strip
// (PATIENT_STRIP_HEIGHT above), which repeats on every page including this one.
const PATIENT_INFO_HEIGHT = 84
// End-of-report marker and the sign-off block always travel together as one unit — never worth
// burning a whole extra page on two lines of signature separated from their context. Measured at
// 109.9 with mt-5 above the signature lines; that gap grew to mt-7 (+8px) for breathing room.
const CLOSING_HEIGHT = 118
// Every block below ends in Tailwind's mb-6 (1.5rem = 24px) — matching that exactly (rather than
// a made-up round number) means this budget reflects the real gap, not an approximation of it.
const BLOCK_GAP = 24
// Below this many rows, a split chunk looks like an orphaned sliver — better to start the
// whole remainder fresh on the next page than to dangle 1-2 rows before a "(continued)".
const MIN_ROWS_TO_SPLIT = 4

export interface PatientInfoBlock { kind: 'patientInfo' }
export interface EmptySectionBlock { kind: 'emptySection'; label: string }
export interface SectionChunkBlock { kind: 'sectionChunk'; label: string; sectionKey: string; keys: string[]; continued: boolean }
export interface ClosingBlock { kind: 'closing' }
export type ReportBlock = PatientInfoBlock | EmptySectionBlock | SectionChunkBlock | ClosingBlock

type ResultsBySection = Record<string, Record<string, string>>

export function paginateReport(patient: Pick<Patient, 'sections'>, results: ResultsBySection): ReportBlock[][] {
  const pages: ReportBlock[][] = [[]]
  let remaining = CONTENT_HEIGHT

  const currentPage = () => pages[pages.length - 1]
  const startNewPage = () => { pages.push([]); remaining = CONTENT_HEIGHT }
  const push = (block: ReportBlock, height: number) => {
    currentPage().push(block)
    remaining -= height + BLOCK_GAP
  }
  /** Moves to a fresh page first only if the block wouldn't fit on the current one — never split a whole block that fits on an empty page. */
  const placeWhole = (block: ReportBlock, height: number) => {
    if (height > remaining && currentPage().length > 0) startNewPage()
    push(block, height)
  }

  placeWhole({ kind: 'patientInfo' }, PATIENT_INFO_HEIGHT)

  for (const rawLabel of patient.sections) {
    const sectionKey = sectionKeyForLabel(rawLabel)
    const data = sectionKey ? results[sectionKey] ?? {} : {}
    // 'others' has no fixed identity — staff can rename it in place (see ResultEntry.tsx);
    // the override lives under '__label' in its own results blob, which is never a real row.
    // A '_method' key (Serology's "kit/method used" note — see ResultEntry.tsx's FieldRow) isn't
    // a row either: it prints as a parenthetical under its own field's result (see
    // ReportPreview.tsx's sectionChunk rendering), not as a separate test.
    const label = sectionKey === 'others' && data.__label ? data.__label : rawLabel
    const filledKeys = Object.keys(data).filter((k) => k !== '__label' && !k.endsWith('_method') && data[k] && data[k].trim() !== '')

    if (filledKeys.length === 0) {
      placeWhole({ kind: 'emptySection', label }, SECTION_HEADER_HEIGHT + EMPTY_NOTICE_HEIGHT)
      continue
    }

    // Fill whatever's left on the current page first; only move to a fresh page when the
    // remainder wouldn't be worth splitting into (too few rows to bother with a "(continued)").
    // This is what keeps a section from being bumped wholesale onto the next page while the
    // current one sits mostly blank underneath it.
    const chunkHeaderHeight = SECTION_HEADER_HEIGHT + COLUMN_HEADER_HEIGHT
    let idx = 0
    let firstChunk = true
    while (idx < filledKeys.length) {
      const rowsLeft = filledKeys.length - idx
      const restHeight = chunkHeaderHeight + rowsLeft * ROW_HEIGHT

      if (restHeight <= remaining) {
        // Everything that's left of this section fits right here — place it whole and move on.
        push({ kind: 'sectionChunk', label, sectionKey: sectionKey!, keys: filledKeys.slice(idx), continued: !firstChunk }, restHeight)
        idx = filledKeys.length
        break
      }

      const availableRows = Math.floor((remaining - chunkHeaderHeight) / ROW_HEIGHT)
      if (availableRows >= MIN_ROWS_TO_SPLIT || currentPage().length === 0) {
        const rows = Math.max(1, availableRows)
        const chunkKeys = filledKeys.slice(idx, idx + rows)
        push({ kind: 'sectionChunk', label, sectionKey: sectionKey!, keys: chunkKeys, continued: !firstChunk }, chunkHeaderHeight + chunkKeys.length * ROW_HEIGHT)
        idx += chunkKeys.length
        firstChunk = false
        if (idx < filledKeys.length) startNewPage()
      } else {
        // Not worth a tiny sliver of rows here — start the whole remainder fresh.
        startNewPage()
      }
    }
  }

  placeWhole({ kind: 'closing' }, CLOSING_HEIGHT)

  return pages
}
