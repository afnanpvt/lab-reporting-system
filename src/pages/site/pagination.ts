import { sectionKeyForLabel, supportsMethodNote } from './reportFields'
import type { Patient } from './api'

// Mantoux's injection/reading date-time columns are printed inline under the section heading, not
// as test rows (see ReportPreview.tsx) — kept in one place so the row filter below and the report
// renderer agree on what counts as metadata.
const MANTOUX_TIME_KEYS = new Set(['injection_date', 'injection_time', 'reading_date', 'reading_time'])

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

// A row whose field carries a filled-in "method/kit used" note (see supportsMethodNote and
// ReportPreview.tsx's `method` span) prints a second line under the result — a fixed ROW_HEIGHT
// didn't know that and let those rows run past the page's real boundary, invisible under/behind
// the footer once the page box clips overflow. Measured live: a row without a note is 37.85px
// (matches ROW_HEIGHT above), one with a note is 53.6px — call the difference 16px.
const METHOD_NOTE_HEIGHT = 16
// Mantoux's injection/reading line (ReportPreview.tsx's data-role="mantoux-times") sits between
// the section header and column header on the section's first chunk only, and was likewise never
// added to the header budget. Measured live: the gap from the section header's top to the column
// header's top grows from 35.1px to 60.35px when the line is present — call it 26px.
const MANTOUX_TIMES_HEIGHT = 26

function hasMethodNote(sectionKey: string, key: string, data: Record<string, string>): boolean {
  return supportsMethodNote(sectionKey, key) && !!data[key + '_method']?.trim()
}

/** A row's real printed height, including the extra line a filled-in method note adds. */
function rowHeightFor(sectionKey: string, key: string, data: Record<string, string>): number {
  return ROW_HEIGHT + (hasMethodNote(sectionKey, key, data) ? METHOD_NOTE_HEIGHT : 0)
}

/** A chunk's header budget, including Mantoux's injection/reading line on its first chunk only. */
function chunkHeaderHeightFor(sectionKey: string, isFirstChunk: boolean, data: Record<string, string>): number {
  const mantouxHasTimes = sectionKey === 'mantoux' && isFirstChunk && !!(data.injection_date || data.reading_date)
  return SECTION_HEADER_HEIGHT + COLUMN_HEADER_HEIGHT + (mantouxHasTimes ? MANTOUX_TIMES_HEIGHT : 0)
}

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
    // ReportPreview.tsx's sectionChunk rendering), not as a separate test. Mantoux's
    // injection/reading date-time are metadata too — they print inline under the section heading
    // (see ReportPreview.tsx's data-role="mantoux-times"), never as their own rows.
    const label = sectionKey === 'others' && data.__label ? data.__label : rawLabel
    const filledKeys = Object.keys(data).filter((k) => k !== '__label' && !k.endsWith('_method') && !MANTOUX_TIME_KEYS.has(k) && data[k] && data[k].trim() !== '')

    if (filledKeys.length === 0) {
      placeWhole({ kind: 'emptySection', label }, SECTION_HEADER_HEIGHT + EMPTY_NOTICE_HEIGHT)
      continue
    }

    const keyHeights = filledKeys.map((k) => rowHeightFor(sectionKey!, k, data))

    // Fill whatever's left on the current page first; only move to a fresh page when the
    // remainder wouldn't be worth splitting into (too few rows to bother with a "(continued)").
    // This is what keeps a section from being bumped wholesale onto the next page while the
    // current one sits mostly blank underneath it.
    let idx = 0
    let firstChunk = true
    while (idx < filledKeys.length) {
      const chunkHeaderHeight = chunkHeaderHeightFor(sectionKey!, firstChunk, data)
      const remainingRowsHeight = keyHeights.slice(idx).reduce((a, b) => a + b, 0)
      const restHeight = chunkHeaderHeight + remainingRowsHeight

      if (restHeight <= remaining) {
        // Everything that's left of this section fits right here — place it whole and move on.
        push({ kind: 'sectionChunk', label, sectionKey: sectionKey!, keys: filledKeys.slice(idx), continued: !firstChunk }, restHeight)
        idx = filledKeys.length
        break
      }

      // Greedily take as many rows as actually fit in what's left of the page — rows vary in
      // height now (a method note makes one taller), so this can't be a flat division anymore.
      const budget = remaining - chunkHeaderHeight
      let rows = 0
      let usedHeight = 0
      while (rows < keyHeights.length - idx && usedHeight + keyHeights[idx + rows] <= budget) {
        usedHeight += keyHeights[idx + rows]
        rows++
      }

      if (rows >= MIN_ROWS_TO_SPLIT || currentPage().length === 0) {
        rows = Math.max(1, rows)
        const chunkKeys = filledKeys.slice(idx, idx + rows)
        const chunkHeight = keyHeights.slice(idx, idx + rows).reduce((a, b) => a + b, 0)
        push({ kind: 'sectionChunk', label, sectionKey: sectionKey!, keys: chunkKeys, continued: !firstChunk }, chunkHeaderHeight + chunkHeight)
        idx += chunkKeys.length
        firstChunk = false
        if (idx < filledKeys.length) startNewPage()
      } else {
        // Not worth a tiny sliver of rows here — start the whole remainder fresh.
        startNewPage()
      }
    }
  }

  // Closing block ("End of report" + the sign-off lines). If it fits under the last section, it
  // just goes there. If it doesn't, it would start a fresh page — but a page holding nothing but
  // the signature looks broken. So when the current page ends with a single self-contained section
  // (one whole chunk that started on this page, not a "(continued)" split), pull that section down
  // onto the new page too, so the last test and its sign-off sit together — as long as the pair
  // fits on one page. Otherwise fall back to the closing on its own page.
  if (CLOSING_HEIGHT <= remaining || currentPage().length === 0) {
    push({ kind: 'closing' }, CLOSING_HEIGHT)
  } else {
    const page = currentPage()
    const last = page[page.length - 1]
    const movable = (last.kind === 'sectionChunk' && !last.continued) || last.kind === 'emptySection'
    const lastHeight =
      last.kind === 'sectionChunk'
        ? chunkHeaderHeightFor(last.sectionKey, !last.continued, results[last.sectionKey] ?? {}) +
          last.keys.reduce((sum, k) => sum + rowHeightFor(last.sectionKey, k, results[last.sectionKey] ?? {}), 0)
        : SECTION_HEADER_HEIGHT + EMPTY_NOTICE_HEIGHT
    if (movable && lastHeight + BLOCK_GAP + CLOSING_HEIGHT <= CONTENT_HEIGHT) {
      page.pop()
      if (page.length === 0) pages.pop() // the section was alone on its page — drop the now-empty page
      startNewPage()
      push(last, lastHeight)
      push({ kind: 'closing' }, CLOSING_HEIGHT)
    } else {
      startNewPage()
      push({ kind: 'closing' }, CLOSING_HEIGHT)
    }
  }

  return pages
}
