import { sectionKeyForLabel, supportsMethodNote } from './reportFields'
import { findCustomTest, isCustomKey } from './customTestsStore'
import type { Patient } from './api'

// Mantoux's injection/reading date-time columns are printed inline under the section heading, not
// as test rows (see ReportPreview.tsx) — kept in one place so the row filter below and the report
// renderer agree on what counts as metadata.
const MANTOUX_TIME_KEYS = new Set(['injection_date', 'injection_time', 'reading_date', 'reading_time'])

/**
 * Turns a patient's sections into discrete printed pages, so the on-screen preview shows the exact
 * same page breaks the printed report will have.
 *
 * HOW BIG THINGS ARE. A page is `overflow: hidden`, so anything the paginator misjudges is silently
 * clipped (a row lost under the footer) or leaves a page needlessly blank. Fixed guesses at row
 * heights kept going wrong the moment real content differed from the guess — a long test name that
 * wraps, a long result, a method note, a Mantoux line. So the paginator takes its sizes from a
 * `PageMetrics`: ReportPreview measures the real rendered rows, headings, sign-off block and the room
 * above the footer (see measureMetrics in ReportPreview.tsx) and passes them in. `defaultMetrics`
 * below is the fallback (the numbers measured on a typical report), used for the very first render
 * before measuring has happened and in tests.
 */
export interface PageMetrics {
  /** Usable height for blocks on one page: from the top of the content area to the footer's top edge. */
  contentHeight: number
  /** The gap every block ends with (Tailwind mb-6). */
  blockGap: number
  patientInfo: number
  emptySection: number
  /** "End of report" + sign-off. */
  closing: number
  /** Everything in a section chunk except its rows: heading, column header, Mantoux line, margins. */
  chunkFixed: (sectionKey: string, continued: boolean, data: Record<string, string>) => number
  /** One row's real printed height, including a method note or wrapped text. */
  rowHeight: (sectionKey: string, key: string, data: Record<string, string>) => number
}

// Measured off a typical rendered page (single lab, light theme, 96dpi). Page box: a 297mm sheet,
// 12mm top/bottom padding -> 1122.5px; the gap between content's top and the footer's top edge is
// 697.5px, a few px of which is a safety buffer for font-rendering variance across machines.
const CONTENT_HEIGHT = 685
const ROW_HEIGHT = 38
const SECTION_HEADER_HEIGHT = 28
const COLUMN_HEADER_HEIGHT = 25
const EMPTY_NOTICE_HEIGHT = 40
const PATIENT_INFO_HEIGHT = 84
const CLOSING_HEIGHT = 118
// Every block ends in Tailwind's mb-6 (1.5rem = 24px).
const BLOCK_GAP = 24
// A row with a filled-in "method/kit used" note prints a second line (37.85px -> 53.6px).
const METHOD_NOTE_HEIGHT = 16
// Mantoux's injection/reading line adds ~26px to its first chunk's heading.
const MANTOUX_TIMES_HEIGHT = 26

export function defaultMetrics(): PageMetrics {
  return {
    contentHeight: CONTENT_HEIGHT,
    blockGap: BLOCK_GAP,
    patientInfo: PATIENT_INFO_HEIGHT,
    emptySection: SECTION_HEADER_HEIGHT + EMPTY_NOTICE_HEIGHT,
    closing: CLOSING_HEIGHT,
    chunkFixed: (sectionKey, continued, data) =>
      SECTION_HEADER_HEIGHT + COLUMN_HEADER_HEIGHT + (sectionKey === 'mantoux' && !continued && (data.injection_date || data.reading_date) ? MANTOUX_TIMES_HEIGHT : 0),
    rowHeight: (sectionKey, key, data) =>
      ROW_HEIGHT + (supportsMethodNote(sectionKey, key) && !!data[key + '_method']?.trim() ? METHOD_NOTE_HEIGHT : 0)
  }
}

// Below this many rows, a split chunk looks like an orphaned sliver — better to start the whole
// remainder fresh on the next page than to dangle 1-2 rows before a "(continued)".
const MIN_ROWS_TO_SPLIT = 4
// When the sign-off has to share a fresh page with the end of the last section, at least this many
// rows travel with it (never a single orphaned row)...
const MIN_ROWS_WITH_CLOSING = 2
// ...and a whole last section is only moved down with it if the page it leaves behind still holds at
// least this share of other content (a page holding just the patient header is not acceptable).
const MIN_PAGE_FILL_SHARE = 0.4

export interface PatientInfoBlock { kind: 'patientInfo' }
export interface EmptySectionBlock { kind: 'emptySection'; label: string }
export interface SectionChunkBlock { kind: 'sectionChunk'; label: string; sectionKey: string; keys: string[]; continued: boolean }
export interface ClosingBlock { kind: 'closing' }
export type ReportBlock = PatientInfoBlock | EmptySectionBlock | SectionChunkBlock | ClosingBlock

type ResultsBySection = Record<string, Record<string, string>>

/**
 * The rows of a section that actually print, in order. 'others' keeps its custom heading under
 * '__label', which is never a row; a '_method' key (Serology's "kit/method used" note) prints as a
 * parenthetical under its own field's result, not as a row; Mantoux's injection/reading date-time
 * print inline under the heading; and a value for an added test that has since been deleted in
 * Settings stays in the database but no longer prints.
 */
export function filledKeysFor(sectionKey: string | undefined, data: Record<string, string>): string[] {
  return Object.keys(data).filter(
    (k) =>
      k !== '__label' &&
      !k.endsWith('_method') &&
      !MANTOUX_TIME_KEYS.has(k) &&
      data[k] &&
      data[k].trim() !== '' &&
      (!isCustomKey(k) || !!findCustomTest(sectionKey ?? '', k))
  )
}

export function paginateReport(patient: Pick<Patient, 'sections'>, results: ResultsBySection, metrics: PageMetrics = defaultMetrics()): ReportBlock[][] {
  const { contentHeight, blockGap } = metrics
  const pages: ReportBlock[][] = [[]]
  let remaining = contentHeight

  const currentPage = () => pages[pages.length - 1]
  const startNewPage = () => { pages.push([]); remaining = contentHeight }
  const push = (block: ReportBlock, height: number) => {
    currentPage().push(block)
    remaining -= height + blockGap
  }
  /** Moves to a fresh page first only if the block wouldn't fit on the current one — never split a whole block that fits on an empty page. */
  const placeWhole = (block: ReportBlock, height: number) => {
    if (height > remaining && currentPage().length > 0) startNewPage()
    push(block, height)
  }

  placeWhole({ kind: 'patientInfo' }, metrics.patientInfo)

  for (const rawLabel of patient.sections) {
    const sectionKey = sectionKeyForLabel(rawLabel)
    const data = sectionKey ? results[sectionKey] ?? {} : {}
    // 'others' has no fixed identity — staff can rename it in place (see ResultEntry.tsx).
    const label = sectionKey === 'others' && data.__label ? data.__label : rawLabel
    const filledKeys = filledKeysFor(sectionKey, data)

    if (filledKeys.length === 0) {
      placeWhole({ kind: 'emptySection', label }, metrics.emptySection)
      continue
    }

    const keyHeights = filledKeys.map((k) => metrics.rowHeight(sectionKey!, k, data))

    // Fill whatever's left on the current page first; only move to a fresh page when the
    // remainder wouldn't be worth splitting into (too few rows to bother with a "(continued)").
    let idx = 0
    let firstChunk = true
    while (idx < filledKeys.length) {
      const chunkHeaderHeight = metrics.chunkFixed(sectionKey!, !firstChunk, data)
      const remainingRowsHeight = keyHeights.slice(idx).reduce((a, b) => a + b, 0)
      const restHeight = chunkHeaderHeight + remainingRowsHeight

      if (restHeight <= remaining) {
        // Everything that's left of this section fits right here — place it whole and move on.
        push({ kind: 'sectionChunk', label, sectionKey: sectionKey!, keys: filledKeys.slice(idx), continued: !firstChunk }, restHeight)
        idx = filledKeys.length
        break
      }

      // Greedily take as many rows as actually fit in what's left of the page.
      const budget = remaining - chunkHeaderHeight
      let rows = 0
      let usedHeight = 0
      while (rows < keyHeights.length - idx && usedHeight + keyHeights[idx + rows] <= budget) {
        usedHeight += keyHeights[idx + rows]
        rows++
      }

      // Never leave a single row for the next page by itself: hold one more back so at least two go.
      if (filledKeys.length - (idx + rows) === 1 && rows > MIN_ROWS_TO_SPLIT) rows--

      // A short run of rows is only "not worth splitting" when the page already holds real content.
      // A page that is nearly empty (just the patient header) must take whatever rows fit instead of
      // being abandoned and pushing the whole table onto the next page.
      const pageIsMostlyEmpty = contentHeight - remaining < contentHeight * MIN_PAGE_FILL_SHARE
      if (rows >= MIN_ROWS_TO_SPLIT || currentPage().length === 0 || (rows >= 1 && pageIsMostlyEmpty)) {
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
  // the signature looks broken, so the last test and its sign-off are kept together:
  //   1. If the last block is a whole section and the page would still be well filled without it,
  //      the whole section moves down with the sign-off.
  //   2. Otherwise only the last few rows of that section move down, as a "(continued)" chunk,
  //      leaving the rest where it was. (Moving the whole section is wrong when it IS the page — a
  //      report of one long section, such as Urine, would be left with a first page holding only
  //      the patient header and a second page holding everything else.)
  //   3. If neither works, the closing goes on its own page.
  const closing = metrics.closing
  if (closing <= remaining || currentPage().length === 0) {
    push({ kind: 'closing' }, closing)
  } else {
    const page = currentPage()
    const last = page[page.length - 1]
    const lastData = last.kind === 'sectionChunk' ? results[last.sectionKey] ?? {} : {}
    const rowHeights = last.kind === 'sectionChunk' ? last.keys.map((k) => metrics.rowHeight(last.sectionKey, k, lastData)) : []
    const lastHeight =
      last.kind === 'sectionChunk'
        ? metrics.chunkFixed(last.sectionKey, last.continued, lastData) + rowHeights.reduce((sum, h) => sum + h, 0)
        : metrics.emptySection
    // How much of the page the OTHER blocks fill if the last one is taken away.
    const otherBlocksHeight = contentHeight - (remaining + lastHeight + blockGap)
    // A "(continued)" chunk can move as well: it simply starts the next page with its heading repeated.
    const movable = last.kind === 'sectionChunk' || last.kind === 'emptySection'
    const pairFits = lastHeight + blockGap + closing <= contentHeight

    if (movable && pairFits && otherBlocksHeight >= contentHeight * MIN_PAGE_FILL_SHARE) {
      page.pop()
      startNewPage()
      push(last, lastHeight)
      push({ kind: 'closing' }, closing)
    } else if (last.kind === 'sectionChunk' && last.keys.length > MIN_ROWS_WITH_CLOSING) {
      // Take the fewest rows off the end that leave room for the closing, never fewer than
      // MIN_ROWS_WITH_CLOSING (a lone orphaned row before the signature looks worse than a pair).
      let tail = MIN_ROWS_WITH_CLOSING
      let freed = rowHeights.slice(-tail).reduce((sum, h) => sum + h, 0)
      while (remaining + freed < closing && tail < last.keys.length - 1) {
        tail++
        freed += rowHeights[rowHeights.length - tail]
      }
      const keptKeys = last.keys.slice(0, last.keys.length - tail)
      const tailKeys = last.keys.slice(last.keys.length - tail)
      const tailRowsHeight = rowHeights.slice(-tail).reduce((sum, h) => sum + h, 0)
      const tailHeight = metrics.chunkFixed(last.sectionKey, true, lastData) + tailRowsHeight
      if (keptKeys.length > 0 && remaining + freed >= closing && tailHeight + blockGap + closing <= contentHeight) {
        page[page.length - 1] = { ...last, keys: keptKeys }
        startNewPage()
        push({ kind: 'sectionChunk', label: last.label, sectionKey: last.sectionKey, keys: tailKeys, continued: true }, tailHeight)
        push({ kind: 'closing' }, closing)
      } else {
        startNewPage()
        push({ kind: 'closing' }, closing)
      }
    } else if (movable && pairFits) {
      // Too short to split, and nothing better available — keep it with its sign-off.
      page.pop()
      if (page.length === 0) pages.pop()
      startNewPage()
      push(last, lastHeight)
      push({ kind: 'closing' }, closing)
    } else {
      startNewPage()
      push({ kind: 'closing' }, closing)
    }
  }

  return pages
}
