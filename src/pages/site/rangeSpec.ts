// A reference range as a *choice*, not as text to be guessed at.
//
// Until now a range was just a string ("Upto 40 IU/L") and the app worked out what it meant by
// reading the wording — so flagging depended on someone having typed "Upto" in the right place.
// A RangeSpec says it outright: which kind of range it is, its number(s), and whether results
// outside it should be highlighted. The text printed on the report and shown beside the field is
// generated from the spec (specToText), so the two can never disagree.
//
// Ranges that predate this (every built-in default, and anything a lab typed before) are turned
// into a spec by parseRangeText, once, at the point they're read — see effectiveSpec in
// reportFields.ts.

export type RangeKind = 'between' | 'upto' | 'lt' | 'gte' | 'gt' | 'text'

export interface RangeSpec {
  kind: RangeKind
  /** between: the low end · upto / lt: the upper limit · gte / gt: the lower limit. Kept as typed ("140.0") so the printed range keeps its decimals. */
  a?: string
  /** between: the high end. */
  b?: string
  /** text: the range exactly as it should read (qualitative results like "Negative"). */
  text?: string
  /** Highlight results outside this range. Meaningless for text ranges, which never highlight. */
  flag: boolean
}

export const RANGE_KINDS: { kind: RangeKind; label: string; hint: string }[] = [
  { kind: 'between', label: 'Between (low – high)', hint: 'normal is from the low value to the high value' },
  { kind: 'upto', label: 'Up to (≤ limit)', hint: 'normal is anything up to and including the limit' },
  { kind: 'lt', label: 'Below (< limit)', hint: 'normal is anything below the limit' },
  { kind: 'gte', label: 'At least (≥ limit)', hint: 'normal is the limit or anything above it' },
  { kind: 'gt', label: 'Above (> limit)', hint: 'normal is anything above the limit' },
  { kind: 'text', label: 'Text only (e.g. Negative)', hint: 'shown as written; never highlights' }
]

const NUM = '(-?\\d+(?:\\.\\d+)?)'

const isNum = (s: string | undefined): s is string => s !== undefined && s.trim() !== '' && !isNaN(parseFloat(s))

/** "13.0–17.0 gm/dl" -> { a: '13.0', b: '17.0' }, "Upto 140" -> upto, "< 200" -> lt, "> 40" -> gt, "≥ 4" -> gte, anything else -> text. `flag` is left for the caller to decide. */
export function parseRangeText(text: string): Omit<RangeSpec, 'flag'> {
  const clean = text.replace(/,/g, '')
  let m = clean.match(new RegExp(`^\\s*up\\s*to\\s*${NUM}`, 'i'))
  if (m) return { kind: 'upto', a: m[1] }
  m = clean.match(new RegExp(`^\\s*(?:>=|≥)\\s*${NUM}`))
  if (m) return { kind: 'gte', a: m[1] }
  m = clean.match(new RegExp(`^\\s*<\\s*${NUM}`))
  if (m) return { kind: 'lt', a: m[1] }
  m = clean.match(new RegExp(`^\\s*>\\s*${NUM}`))
  if (m) return { kind: 'gt', a: m[1] }
  // Two-sided: "13.0–17.0", "4.6-6.0", "-2 to +2" — but only as a plain range, so a descriptive
  // text that merely contains numbers ("Negative < 1:20") stays text.
  m = clean.match(new RegExp(`^\\s*${NUM}\\s*(?:to|[–-])\\s*\\+?${NUM}`, 'i'))
  if (m) return { kind: 'between', a: m[1], b: m[2] }
  return { kind: 'text', text: text.trim() }
}

function unitSuffix(unit: string): string {
  const u = unit.trim()
  if (!u) return ''
  // "36–47%" has always been written without a space; every other unit has one ("13.0–17.0 gm/dl").
  return u === '%' ? u : ` ${u}`
}

/** The text shown beside a field and printed on the report. */
export function specToText(spec: RangeSpec, unit: string): string {
  const u = unitSuffix(unit)
  switch (spec.kind) {
    case 'between': return `${spec.a ?? ''}–${spec.b ?? ''}${u}`
    case 'upto': return `Upto ${spec.a ?? ''}${u}`
    case 'lt': return `< ${spec.a ?? ''}${u}`
    case 'gte': return `≥ ${spec.a ?? ''}${u}`
    case 'gt': return `> ${spec.a ?? ''}${u}`
    case 'text': return spec.text ?? ''
  }
}

/** Why a spec can't be saved yet, or null if it can. */
export function specProblem(spec: RangeSpec): string | null {
  if (spec.kind === 'text') return (spec.text ?? '').trim() ? null : 'Type the range as it should read.'
  if (!isNum(spec.a)) return spec.kind === 'between' ? 'Enter the low value.' : 'Enter the limit.'
  if (spec.kind === 'between') {
    if (!isNum(spec.b)) return 'Enter the high value.'
    if (parseFloat(spec.a) > parseFloat(spec.b)) return 'The low value must not be above the high value.'
  }
  return null
}

/** Which way a result has to go to be highlighted, in words — shown in the editor so there is no guessing. */
export function describeFlagging(spec: RangeSpec, unit: string): string {
  if (spec.kind === 'text') return 'Text ranges are never highlighted.'
  if (!spec.flag) return 'Results are not highlighted for this test.'
  const u = unitSuffix(unit)
  const a = spec.a ?? '…'
  switch (spec.kind) {
    case 'between': return `Red ▼ below ${a}${u}, red ▲ above ${spec.b ?? '…'}${u}.`
    case 'upto': return `Red ▲ above ${a}${u}. Nothing is flagged for low values.`
    case 'lt': return `Red ▲ at ${a}${u} or above. Nothing is flagged for low values.`
    case 'gte': return `Red ▼ below ${a}${u}. Nothing is flagged for high values.`
    case 'gt': return `Red ▼ at ${a}${u} or below. Nothing is flagged for high values.`
  }
}

/**
 * The numeric reading in a typed result: a plain number is its own low and high end, and a span such
 * as "4-6" or "10 – 12" (how pus cells and RBCs are usually reported) covers both. Anything else —
 * "Nil", "Plenty", "1:80", "<5" — has no reading and is never flagged.
 */
function readingOf(raw: string): { lo: number; hi: number } | null {
  // "11,500" and "1,00,000" are plain numbers: the commas are only there for reading.
  const value = raw.replace(/,/g, '')
  const span = value.match(new RegExp(`^\\s*${NUM}\\s*[–-]\\s*${NUM}\\s*(?:/\\s*\\w+)?\\s*$`))
  if (span) {
    const x = parseFloat(span[1])
    const y = parseFloat(span[2])
    return { lo: Math.min(x, y), hi: Math.max(x, y) }
  }
  if (!/^\s*-?\d+(?:\.\d+)?\s*[A-Za-z%/]*\s*$/.test(value)) return null
  const v = parseFloat(value)
  return isNaN(v) ? null : { lo: v, hi: v }
}

/**
 * Whether a typed result is outside the range, per its kind. A result is "high" if any part of it is
 * above the range and "low" if any part is below, so a reported span like "4-6" against 0–4 is high.
 * Never flags a non-number, a text range, or a spec with highlighting off.
 */
export function flagBySpec(value: string, spec: RangeSpec): 'high' | 'low' | null {
  if (!spec.flag || spec.kind === 'text') return null
  const r = readingOf(value)
  if (!r || !isNum(spec.a)) return null
  const a = parseFloat(spec.a)
  switch (spec.kind) {
    case 'between': {
      if (!isNum(spec.b)) return null
      const b = parseFloat(spec.b)
      return r.hi > b ? 'high' : r.lo < a ? 'low' : null
    }
    case 'upto': return r.hi > a ? 'high' : null
    case 'lt': return r.hi >= a ? 'high' : null
    case 'gte': return r.lo < a ? 'low' : null
    case 'gt': return r.lo <= a ? 'low' : null
  }
}

/** A spec is only worth storing if it is complete. */
export function cleanSpec(value: unknown): RangeSpec | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const kind = v.kind as RangeKind
  if (!RANGE_KINDS.some((k) => k.kind === kind)) return null
  const spec: RangeSpec = {
    kind,
    a: v.a === undefined ? undefined : String(v.a),
    b: v.b === undefined ? undefined : String(v.b),
    text: v.text === undefined ? undefined : String(v.text),
    flag: v.flag !== false
  }
  return specProblem(spec) === null ? spec : null
}
