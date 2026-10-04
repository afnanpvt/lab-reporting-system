import { sectionKeyForLabel } from './reportFields'
import { defaultMetrics, filledKeysFor, type PageMetrics, type ReportBlock } from './pagination'

// Reads the report's real sizes off the screen so pagination (pagination.ts) never has to guess.
//
// ReportPreview renders an invisible "probe" page containing one of every kind of block — the patient
// block, the sign-off, an empty-section notice, and for every section in the report its full table (in
// both its first-chunk and "(continued)" form). measureProbe() reads how tall each piece really came
// out, plus how much room there is above the footer, and hands the paginator exactly those numbers.
// That makes the page breaks right for whatever the content is — a test name that wraps onto two
// lines, a long result, a method note, a wider footer from a lab with many certification logos —
// where fixed guesses were only ever right for typical rows.

export interface ProbeEntry {
  kind: ReportBlock['kind']
  sectionKey?: string
  continued?: boolean
  keys?: string[]
}

export interface Probe {
  blocks: ReportBlock[]
  plan: ProbeEntry[]
}

/** The blocks to render invisibly for measuring: everything the report can contain, each once. */
export function buildProbe(sections: string[], results: Record<string, Record<string, string>>): Probe {
  const blocks: ReportBlock[] = [{ kind: 'patientInfo' }, { kind: 'closing' }, { kind: 'emptySection', label: 'Section' }]
  const plan: ProbeEntry[] = [{ kind: 'patientInfo' }, { kind: 'closing' }, { kind: 'emptySection' }]
  const seen = new Set<string>()
  for (const rawLabel of sections) {
    const sectionKey = sectionKeyForLabel(rawLabel)
    if (!sectionKey || seen.has(sectionKey)) continue
    const data = results[sectionKey] ?? {}
    const keys = filledKeysFor(sectionKey, data)
    if (keys.length === 0) continue
    seen.add(sectionKey)
    const label = sectionKey === 'others' && data.__label ? data.__label : rawLabel
    for (const continued of [false, true]) {
      blocks.push({ kind: 'sectionChunk', label, sectionKey, keys, continued })
      plan.push({ kind: 'sectionChunk', sectionKey, continued, keys })
    }
  }
  return { blocks, plan }
}

// Printing engines round differently from the screen; keep a little room above the footer. (If a page
// still overflows, ReportPreview's self-check raises this per report — see `boost`.)
const SAFETY = 4

export type MeasuredMetrics = PageMetrics & { sig: string }

const r1 = (n: number) => Math.round(n * 10) / 10

/**
 * Reads the probe. `boost` is extra room to hold back, raised by ReportPreview's self-check if a
 * rendered page ever turns out to overflow despite these measurements. Returns null if the probe
 * isn't laid out yet (zero-size).
 */
export function measureProbe(root: HTMLElement, probe: Probe, boost: number): MeasuredMetrics | null {
  const page = root.querySelector<HTMLElement>('[data-role="page"]')
  const content = page?.querySelector<HTMLElement>('[data-role="content"]')
  if (!page || !content || page.clientHeight === 0) return null
  const footer = page.querySelector<HTMLElement>('[data-role="letterhead-footer"]')
  const wrappers = Array.from(content.querySelectorAll<HTMLElement>(':scope > [data-measure]'))
  if (wrappers.length !== probe.plan.length) return null

  // Everything is measured in the probe's own (unzoomed) coordinates, so getBoundingClientRect is exact.
  const limit = footer ? footer.offsetTop : page.clientHeight - parseFloat(getComputedStyle(page).paddingBottom || '0')
  const contentHeight = r1(limit - content.offsetTop - SAFETY - boost)

  // A block's height without the gap it ends with: the wrapper is a flow-root so the block's own
  // bottom margin (mb-6) is inside it, and is taken back out here.
  const blockHeight = (w: HTMLElement) => {
    const child = w.firstElementChild as HTMLElement | null
    const margin = child ? parseFloat(getComputedStyle(child).marginBottom || '0') : 0
    return w.getBoundingClientRect().height - margin
  }
  const blockGap = (() => {
    const first = wrappers[0]?.firstElementChild as HTMLElement | null
    return first ? parseFloat(getComputedStyle(first).marginBottom || '0') || 24 : 24
  })()

  let patientInfo = 0
  let closing = 0
  let emptySection = 0
  const rowH: Record<string, Record<string, number>> = {}
  const fixedFirst: Record<string, number> = {}
  const fixedCont: Record<string, number> = {}

  probe.plan.forEach((entry, i) => {
    const w = wrappers[i]
    const h = blockHeight(w)
    if (entry.kind === 'patientInfo') patientInfo = h
    else if (entry.kind === 'closing') {
      // The sign-off has no trailing gap. Its first child's top margin (my-5) collapses into the gap
      // above it on a real page — one 24px gap, not 24 + 20 — so that overlap is not counted twice.
      const inner = w.firstElementChild?.firstElementChild as HTMLElement | null
      const topMargin = inner ? parseFloat(getComputedStyle(inner).marginTop || '0') : 0
      closing = w.getBoundingClientRect().height - Math.min(topMargin, blockGap)
    }
    else if (entry.kind === 'emptySection') emptySection = h
    else if (entry.sectionKey && entry.keys) {
      const rows = Array.from(w.querySelectorAll<HTMLElement>('[data-role="result-row"]'))
      const heights = rows.map((r) => r.getBoundingClientRect().height)
      const rowsTotal = heights.reduce((a, b) => a + b, 0)
      // Everything in the chunk that is not a row: headings, the column header, the Mantoux line, margins.
      const fixed = h - rowsTotal
      if (entry.continued) fixedCont[entry.sectionKey] = fixed
      else {
        fixedFirst[entry.sectionKey] = fixed
        const byKey: Record<string, number> = {}
        entry.keys.forEach((k, idx) => { if (heights[idx] !== undefined) byKey[k] = heights[idx] })
        rowH[entry.sectionKey] = byKey
      }
    }
  })

  const fallback = defaultMetrics()
  const metrics: PageMetrics = {
    contentHeight,
    blockGap,
    patientInfo: patientInfo || fallback.patientInfo,
    emptySection: emptySection || fallback.emptySection,
    closing: closing || fallback.closing,
    chunkFixed: (sectionKey, continued, data) => (continued ? fixedCont[sectionKey] : fixedFirst[sectionKey]) ?? fallback.chunkFixed(sectionKey, continued, data),
    rowHeight: (sectionKey, key, data) => rowH[sectionKey]?.[key] ?? fallback.rowHeight(sectionKey, key, data)
  }
  const sig = JSON.stringify([
    r1(contentHeight), r1(blockGap), r1(patientInfo), r1(closing), r1(emptySection),
    Object.entries(fixedFirst).map(([k, v]) => [k, r1(v)]), Object.entries(fixedCont).map(([k, v]) => [k, r1(v)]),
    Object.entries(rowH).map(([k, v]) => [k, Object.entries(v).map(([kk, vv]) => [kk, r1(vv)])])
  ])
  return { ...metrics, sig }
}

/**
 * How far past the footer's top edge a rendered page's last block reaches (positive = overflowing,
 * i.e. something would be clipped or printed over the footer). Only meaningful for a page that is
 * actually displayed.
 */
export function overshootOf(page: HTMLElement): number {
  const content = page.querySelector<HTMLElement>('[data-role="content"]')
  if (!content || content.children.length === 0) return 0
  const footer = page.querySelector<HTMLElement>('[data-role="letterhead-footer"]')
  const limit = footer ? footer.offsetTop : page.clientHeight - parseFloat(getComputedStyle(page).paddingBottom || '0')
  const last = content.children[content.children.length - 1] as HTMLElement
  return content.offsetTop + last.offsetTop + last.offsetHeight - limit
}
