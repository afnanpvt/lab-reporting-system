// Numbers in result fields: reading values typed with commas ("11,500"), and adding the commas
// for the user as they type ("20000" -> "20,000"), grouped the Indian way (1,00,000) like the ₹
// amounts elsewhere in the app. Both are pure functions so they can be tested without a screen.

const NUMERIC_TEXT = /^-?[\d,]*\.?\d*$/

/** A plain number typed in a result field — commas and spaces are ignored — or null if it isn't one ("Nil", "4-6", "1:80", "<5"). */
export function parseResultNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null
  const s = raw.replace(/[,\s]/g, '')
  if (!/^[-+]?(\d+(\.\d*)?|\.\d+)$/.test(s)) return null
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

/** "1234567" -> "12,34,567": the last three digits, then pairs. */
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits
  const head = digits.slice(0, -3)
  const tail = digits.slice(-3)
  return head.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + tail
}

export interface Formatted {
  text: string
  /** Where the caret belongs in `text`, given where it was in the input (-1 if no caret was given). */
  caret: number
}

/**
 * Adds thousands separators to a number being typed, leaving anything that isn't a plain number
 * alone (text, "4-6" spans, "1:80" titres, "<5"). Only numbers of four or more whole digits change.
 * Commas the user typed themselves are re-placed correctly, and the caret stays beside the same digit
 * so typing in the middle of a number doesn't jump to the end.
 */
export function formatThousands(raw: string, caret = -1): Formatted {
  if (!NUMERIC_TEXT.test(raw) || !/\d/.test(raw)) return { text: raw, caret }

  const negative = raw.startsWith('-')
  const body = negative ? raw.slice(1) : raw
  const stripped = body.replace(/,/g, '')
  const dot = stripped.indexOf('.')
  const whole = dot === -1 ? stripped : stripped.slice(0, dot)
  const fraction = dot === -1 ? '' : stripped.slice(dot) // includes the "."

  // Leave short numbers and zero-padded ones ("0012") exactly as typed, apart from stray commas.
  if (whole.length < 4 || (whole.length > 1 && whole.startsWith('0'))) {
    const text = (negative ? '-' : '') + stripped
    return { text, caret: caret === -1 ? -1 : mapCaret(raw, text, caret) }
  }

  const text = (negative ? '-' : '') + groupIndian(whole) + fraction
  return { text, caret: caret === -1 ? -1 : mapCaret(raw, text, caret) }
}

/** The position in `to` that sits after the same number of digits (and "." / "-") as `caret` did in `from`. */
function mapCaret(from: string, to: string, caret: number): number {
  const significant = (s: string) => s.replace(/,/g, '')
  const before = significant(from.slice(0, caret)).length
  let seen = 0
  for (let i = 0; i < to.length; i++) {
    if (seen === before) return i
    if (to[i] !== ',') seen++
  }
  return to.length
}
