/** Parses a free-text reference range like "11.0–15.0 gm/dl", "Upto 140.0 mg/dl", ">40", "-2 to +2" into [lo, hi]. Returns null when the range isn't numeric (e.g. "Nil", "Few") — those never get flagged. */
function parseRange(ref: string): [number, number] | null {
  if (!ref) return null
  const clean = ref.replace(/,/g, '')
  let m = clean.match(/(-?\d+(?:\.\d+)?)\s*[–-]\s*(-?\d+(?:\.\d+)?)/)
  if (m) return [parseFloat(m[1]), parseFloat(m[2])]
  m = clean.match(/upto\s*(-?\d+(?:\.\d+)?)/i)
  if (m) return [-Infinity, parseFloat(m[1])]
  m = clean.match(/^\s*>\s*(-?\d+(?:\.\d+)?)/)
  if (m) return [parseFloat(m[1]), Infinity]
  m = clean.match(/^\s*<\s*(-?\d+(?:\.\d+)?)/)
  if (m) return [-Infinity, parseFloat(m[1])]
  m = clean.match(/(-?\d+(?:\.\d+)?)\s*to\s*\+?(-?\d+(?:\.\d+)?)/i)
  if (m) return [parseFloat(m[1]), parseFloat(m[2])]
  return null
}

function flagFor(value: string, ref: string): 'high' | 'low' | null {
  const range = parseRange(ref)
  if (!range) return null
  const v = parseFloat(value)
  if (isNaN(v)) return null
  if (v > range[1]) return 'high'
  if (v < range[0]) return 'low'
  return null
}

interface ResultRowProps {
  label: string
  unit: string
  range: string
  value: string
  onChange: (v: string) => void
  indent?: boolean
}

export function ResultRow({ label, unit, range: refRange, value, onChange, indent }: ResultRowProps) {
  const flag = flagFor(value, refRange)
  return (
    <div
      className={`flex items-center gap-3 py-2.5 ${indent ? 'pl-6' : ''}`}
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <span
        className="flex-shrink-0 text-[15px] text-ink leading-tight"
        style={{ width: '13rem' }}
        title={label}
      >
        {indent && <span className="text-ink-3 mr-1.5 text-[13px]">–</span>}
        {label}
      </span>
      <input
        className="result-input flex-shrink-0"
        style={{
          width: '7.5rem',
          ...(flag === 'high' ? { borderColor: 'var(--danger)', color: 'var(--danger)', fontWeight: 600 } : {}),
          ...(flag === 'low' ? { borderColor: 'var(--info)', color: 'var(--info)', fontWeight: 600 } : {})
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="text-[14px] text-ink-2 flex-shrink-0" style={{ width: '6rem' }}>{unit}</span>
      {refRange && (
        <span className="text-[13.5px] text-ink-3 flex-1 text-right whitespace-nowrap leading-tight">
          {flag === 'high' && <span style={{ color: 'var(--danger)' }}>&#9650; </span>}
          {flag === 'low' && <span style={{ color: 'var(--info)' }}>&#9660; </span>}
          {refRange}
        </span>
      )}
    </div>
  )
}

interface QualitativeRowProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}

export function QualitativeRow({ label, value, onChange, options }: QualitativeRowProps) {
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="flex-shrink-0 text-[15px] text-ink" style={{ width: '13rem' }} title={label}>
        {label}
      </span>
      <select
        className="result-input flex-shrink-0 text-left text-[15px]"
        style={{ width: '11.5rem' }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o || '— Select —'}</option>
        ))}
      </select>
    </div>
  )
}

interface DropdownRowProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  showRef?: string
}

export function DropdownRow({ label, value, onChange, options, showRef }: DropdownRowProps) {
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="flex-shrink-0 text-[15px] text-ink" style={{ width: '13rem' }} title={label}>
        {label}
      </span>
      <select
        className="result-input flex-1 text-left text-[15px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o || '— Select —'}</option>
        ))}
      </select>
      {showRef && (
        <span className="text-[13.5px] text-ink-3 flex-shrink-0 text-right" style={{ width: '11rem' }}>{showRef}</span>
      )}
    </div>
  )
}

export function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-5 pb-1.5 mt-1">
      <span className="text-[12px] font-bold uppercase tracking-widest text-ink-2 flex-shrink-0">{label}</span>
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
    </div>
  )
}

export function TextAreaRow({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="block text-[15px] text-ink mb-2">{label}</span>
      <textarea
        className="w-full px-3.5 py-2.5 text-[15px] border border-border-strong rounded-lg bg-surface resize-none
          focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-25 focus:border-accent
          text-ink transition-all"
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
