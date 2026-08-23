import { sectionKeyForLabel } from './reportFields'
import type { MockPatient } from './mockData'

/**
 * Turns a patient's sections into discrete printed pages, so the on-screen preview shows the
 * exact same page breaks the printed report will have — no more finding out a section got
 * awkwardly split in half only after printing.
 *
 * CONTENT_HEIGHT and PATIENT_INFO_HEIGHT are calibrated against the actual rendered page in
 * ReportPreview.tsx (measured live: a 1260px page with the current letterhead leaves ~785px of
 * real content room, and the patient-info block itself measures ~132px) — keep them in sync with
 * that page's padding/header/footer if those change again, or short reports start wasting whole
 * pages on almost nothing, which is exactly the "blank first page" bug this was tuned to fix.
 */
const CONTENT_HEIGHT = 785
// Rows grew from py-1/10.5px to py-1.5/11px (typography pass for legibility) — re-measure this
// against the live page if row padding/font-size changes again.
const ROW_HEIGHT = 29
const SECTION_HEADER_HEIGHT = 26
const COLUMN_HEADER_HEIGHT = 22
const EMPTY_NOTICE_HEIGHT = 36
// Title row + SID + Collected/Received/Reported timestamps + the patient/doctor/age grid.
const PATIENT_INFO_HEIGHT = 140
// End-of-report marker and the sign-off block always travel together as one unit — never
// worth burning a whole extra page on two lines of signature separated from their context.
const CLOSING_HEIGHT = 100
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

export function paginateReport(patient: Pick<MockPatient, 'sections'>, results: ResultsBySection): ReportBlock[][] {
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

  for (const label of patient.sections) {
    const sectionKey = sectionKeyForLabel(label)
    const data = sectionKey ? results[sectionKey] ?? {} : {}
    const filledKeys = Object.keys(data).filter((k) => data[k] && data[k].trim() !== '')

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
