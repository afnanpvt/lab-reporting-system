import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { IndianRupee, Users, FlaskConical, Receipt, BadgeCheck, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react'
import { listAllPatientsForAnalytics, loadBillingContext, type PatientWithStatus, type BillingContext } from './api'
import { computeAnalytics, PERIODS, HEAT_HOURS, type PeriodKey, type Analytics as AnalyticsData, type Bucket, type Totals } from './analyticsData'

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
const compactInr = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${Math.round(n)}`)

// Category colours beyond the theme accent — fixed hues so a slice keeps its colour across charts.
const PALETTE = ['var(--accent)', '#1c9aa8', '#7c5cbf', 'var(--success)', '#d98a1f', '#c9497a', '#5b7bd5', '#8593a3']

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function Card({ title, subtitle, right, children, className = '' }: { title: string; subtitle?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--ink)]">{title}</h3>
          {subtitle && <p className="text-[12.5px] text-[var(--ink-3)] mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

function Empty({ text = 'Nothing to show for this period' }: { text?: string }) {
  return <div className="h-full min-h-[120px] flex items-center justify-center text-[13px] text-[var(--ink-3)]">{text}</div>
}

function Delta({ now, before }: { now: number; before: number | undefined }) {
  if (before === undefined) return <span className="text-[12px] text-[var(--ink-3)]">all recorded</span>
  if (before === 0) return <span className="text-[12px] text-[var(--ink-3)]">{now > 0 ? 'new this period' : 'no change'}</span>
  const pct = ((now - before) / before) * 100
  if (Math.abs(pct) < 0.5) return <span className="inline-flex items-center gap-1 text-[12px] text-[var(--ink-3)] whitespace-nowrap"><Minus size={12} /> flat vs prev.</span>
  const up = pct > 0
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] font-medium whitespace-nowrap ${up ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
      {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {Math.abs(pct).toFixed(0)}% vs prev.
    </span>
  )
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const w = 120
  const h = 36
  const max = Math.max(...values, 1)
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - (v / max) * (h - 8)] as const)
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-[84px] h-9 flex-shrink-0" preserveAspectRatio="none" aria-hidden>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={color} opacity={0.12} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function Kpi({ icon, label, value, color, now, before, spark }: { icon: ReactNode; label: string; value: string; color: string; now: number; before: number | undefined; spark: number[] }) {
  return (
    <div className="rounded-2xl p-5 bg-[var(--surface)] border border-[var(--border)] shadow-sm">
      <div className="flex items-center gap-2 mb-3" style={{ color }}>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in srgb, ${color} 13%, transparent)` }}>{icon}</span>
        <span className="text-[12px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-[28px] leading-none font-semibold text-[var(--ink)] mb-2">{value}</div>
          <Delta now={now} before={before} />
        </div>
        <Sparkline values={spark} color={color} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

type Metric = 'revenue' | 'patients' | 'tests'
const METRICS: { key: Metric; label: string }[] = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'patients', label: 'Patients' },
  { key: 'tests', label: 'Tests' }
]

function niceMax(v: number): number {
  if (v <= 0) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / pow
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow
}

function TrendChart({ buckets, metric }: { buckets: Bucket[]; metric: Metric }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 720
  const H = 260
  const pad = { l: 46, r: 14, t: 14, b: 28 }
  const iw = W - pad.l - pad.r
  const ih = H - pad.t - pad.b
  const values = buckets.map((b) => b[metric])
  const max = niceMax(Math.max(...values, 0))
  const x = (i: number) => pad.l + (buckets.length === 1 ? iw / 2 : (i / (buckets.length - 1)) * iw)
  const y = (v: number) => pad.t + ih - (v / max) * ih
  const fmt = (v: number) => (metric === 'revenue' ? compactInr(v) : String(Math.round(v)))

  // Smooth the line with a monotone-ish cubic so it reads as a trend, not a polyline.
  const pts = values.map((v, i) => [x(i), y(v)] as const)
  const curve = (from: number, to: number) => {
    let d = ''
    for (let i = from; i <= to; i++) {
      const [px, py] = pts[i]
      if (i === from) d = `M${px},${py}`
      else {
        const [qx, qy] = pts[i - 1]
        const cx = (px + qx) / 2
        d += ` C${cx},${qy} ${cx},${py} ${px},${py}`
      }
    }
    return d
  }
  // The still-running last week/month is drawn dashed so its low total isn't read as a collapse.
  const lastPartial = buckets.length > 1 && !!buckets[buckets.length - 1].partial
  const line = pts.length ? curve(0, lastPartial ? pts.length - 2 : pts.length - 1) : ''
  const tail = lastPartial ? curve(pts.length - 2, pts.length - 1) : ''
  const area = pts.length ? `${line}${lastPartial ? tail.replace(/^M[^C]*/, '') : ''} L${pts[pts.length - 1][0]},${pad.t + ih} L${pts[0][0]},${pad.t + ih} Z` : ''
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max)
  const labelEvery = Math.ceil(buckets.length / 9)

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--border-soft)" strokeDasharray={t === 0 ? undefined : '3 4'} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--ink-3)">{fmt(t)}</text>
          </g>
        ))}
        {buckets.map((b, i) => (i % labelEvery === 0 ? <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--ink-3)">{b.label}</text> : null))}
        <path d={area} fill="url(#trendFill)" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {lastPartial && <path d={tail} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" strokeDasharray="5 5" opacity={0.7} />}
        {buckets.length <= 40 && pts.map(([px, py], i) => <circle key={i} cx={px} cy={py} r={hover === i ? 5 : 3} fill="var(--surface)" stroke="var(--accent)" strokeWidth={2} />)}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="var(--accent)" strokeOpacity={0.35} />}
        {buckets.map((_, i) => {
          const step = buckets.length === 1 ? iw : iw / (buckets.length - 1)
          return <rect key={i} x={x(i) - step / 2} y={pad.t} width={step} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} />
        })}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 rounded-xl bg-[var(--ink)] text-white text-[12px] px-3 py-2 shadow-lg whitespace-nowrap"
          style={{ left: `${(x(hover) / W) * 100}%`, top: 4, transform: `translateX(${hover > buckets.length * 0.7 ? '-105%' : '8%'})` }}
        >
          <div className="font-semibold mb-0.5">{buckets[hover].label}{buckets[hover].partial ? ' (so far)' : ''}</div>
          <div>{inr(buckets[hover].revenue)} revenue</div>
          <div>{buckets[hover].patients} patients · {buckets[hover].tests} tests</div>
        </div>
      )}
    </div>
  )
}

interface Slice { label: string; value: number; color: string }

function Donut({ slices, centerLabel }: { slices: Slice[]; centerLabel: string }) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  const r = 52
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="flex items-center gap-5">
      <div className="relative w-[132px] h-[132px] flex-shrink-0">
        <svg viewBox="0 0 132 132" className="w-full h-full -rotate-90">
          <circle cx={66} cy={66} r={r} fill="none" stroke="var(--border-soft)" strokeWidth={16} />
          {total > 0 && slices.filter((s) => s.value > 0).map((s) => {
            const len = (s.value / total) * c
            const el = <circle key={s.label} cx={66} cy={66} r={r} fill="none" stroke={s.color} strokeWidth={16} strokeDasharray={`${Math.max(len - 2, 0)} ${c - Math.max(len - 2, 0)}`} strokeDashoffset={-offset} />
            offset += len
            return el
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[22px] font-semibold text-[var(--ink)] leading-none">{total}</div>
          <div className="text-[11px] text-[var(--ink-3)] mt-1">{centerLabel}</div>
        </div>
      </div>
      <ul className="space-y-2 min-w-0 flex-1">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-[13px]">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-[var(--ink-2)] truncate">{s.label}</span>
            <span className="ml-auto font-semibold text-[var(--ink)]">{s.value}</span>
            <span className="text-[var(--ink-3)] w-9 text-right">{total ? Math.round((s.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RankedBars({ rows, valueOf, format, sub }: { rows: { name: string; count: number; revenue: number }[]; valueOf: (r: { count: number; revenue: number }) => number; format: (r: { count: number; revenue: number }) => string; sub: (r: { count: number; revenue: number }) => string }) {
  const max = Math.max(...rows.map(valueOf), 1)
  return (
    <ul className="space-y-3.5">
      {rows.map((r, i) => (
        <li key={r.name}>
          <div className="flex items-baseline justify-between gap-3 mb-1.5">
            <span className="text-[13.5px] text-[var(--ink)] font-medium truncate">
              <span className="text-[var(--ink-4)] mr-2 tabular-nums">{i + 1}</span>
              {r.name}
            </span>
            <span className="text-[13px] text-[var(--ink)] font-semibold flex-shrink-0">{format(r)} <span className="text-[var(--ink-3)] font-normal">· {sub(r)}</span></span>
          </div>
          <div className="h-2 rounded-full bg-[var(--border-soft)] overflow-hidden">
            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(valueOf(r) / max) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function Columns({ items, color = 'var(--accent)' }: { items: { label: string; count: number }[]; color?: string }) {
  const max = Math.max(...items.map((i) => i.count), 1)
  const top = items.reduce((best, i) => (i.count > best.count ? i : best), items[0])
  return (
    <div className="flex items-end gap-2.5 h-[170px]">
      {items.map((i) => (
        <div key={i.label} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
          <span className="text-[12px] font-semibold text-[var(--ink)] mb-1">{i.count}</span>
          <div className="w-full rounded-t-lg transition-[height] duration-500" style={{ height: `${Math.max((i.count / max) * 100, i.count ? 4 : 1)}%`, background: i.label === top.label && top.count > 0 ? color : `color-mix(in srgb, ${color} 38%, transparent)` }} />
          <span className="text-[11.5px] text-[var(--ink-3)] mt-2 truncate max-w-full">{i.label}</span>
        </div>
      ))}
    </div>
  )
}

function Heatmap({ heat, max }: { heat: number[][]; max: number }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const hourLabel = (h: number) => (h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`)
  return (
    <div>
      <div>
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: `30px repeat(${HEAT_HOURS.length}, 1fr)` }}>
          <span />
          {HEAT_HOURS.map((h) => <span key={h} className="text-[9.5px] text-[var(--ink-3)] text-center">{hourLabel(h)}</span>)}
          {days.map((d, di) => (
            <div key={d} className="contents">
              <span className="text-[11.5px] text-[var(--ink-3)] flex items-center">{d}</span>
              {HEAT_HOURS.map((h, hi) => {
                const v = heat[di][hi]
                return (
                  <div
                    key={h}
                    title={`${d} ${hourLabel(h)} — ${v} registration${v === 1 ? '' : 's'}`}
                    className="h-[22px] rounded-[5px]"
                    style={{ background: v === 0 ? 'var(--border-soft)' : `color-mix(in srgb, var(--accent) ${20 + (v / Math.max(max, 1)) * 80}%, transparent)` }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ProgressRing({ value, color, label }: { value: number; color: string; label: string }) {
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-[88px] h-[88px]">
        <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
          <circle cx={44} cy={44} r={r} fill="none" stroke="var(--border-soft)" strokeWidth={9} />
          <circle cx={44} cy={44} r={r} fill="none" stroke={color} strokeWidth={9} strokeLinecap="round" strokeDasharray={`${value * c} ${c}`} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[17px] font-semibold text-[var(--ink)]">{Math.round(value * 100)}%</div>
      </div>
      <span className="text-[12.5px] text-[var(--ink-2)]">{label}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function periodText(a: AnalyticsData): string {
  if (!a.from) return 'No registrations yet'
  const f = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${f(a.from)} – ${f(a.to)}`
}

export default function Analytics() {
  const [rows, setRows] = useState<PatientWithStatus[] | null>(null)
  const [billing, setBilling] = useState<BillingContext | null>(null)
  const [period, setPeriod] = useState<PeriodKey>('30d')
  const [metric, setMetric] = useState<Metric>('revenue')

  useEffect(() => {
    Promise.all([listAllPatientsForAnalytics(), loadBillingContext()]).then(([r, b]) => {
      setRows(r)
      setBilling(b)
    })
  }, [])

  const a = useMemo(() => (rows && billing ? computeAnalytics(rows, billing, period) : null), [rows, billing, period])

  if (!a) return <main className="px-10 py-9 text-[var(--ink-3)] text-[14px]">Loading analytics…</main>

  const t: Totals = a.totals
  const prev = a.previous ?? undefined
  const series = (m: Metric) => a.buckets.map((b) => b[m])

  return (
    <main className="px-10 py-9 pb-14">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
        <div>
          <h1 className="text-[26px] font-semibold text-[var(--ink)]">Analytics</h1>
          <p className="text-[15px] text-[var(--ink-2)]">How the lab is performing · {periodText(a)}</p>
        </div>
        <div className="inline-flex p-1 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 rounded-xl text-[13.5px] font-medium transition-colors ${period === p.key ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--ink-2)] hover:bg-[var(--bg-hover)]'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {!a.hasData ? (
        <Card title="No data in this period" subtitle="Register patients, or pick a longer period, and the charts will fill in.">
          <Empty text="Try 'All time'" />
        </Card>
      ) : (
        <>
          {a.insights.length > 0 && (
            <div className="rounded-2xl border border-[var(--accent-soft-border)] bg-[var(--accent-soft)] p-5 mb-6">
              <div className="flex items-center gap-2 text-[var(--accent)] text-[12px] font-bold uppercase tracking-wide mb-2.5"><Sparkles size={14} /> Highlights</div>
              <ul className="grid md:grid-cols-2 gap-x-8 gap-y-1.5">
                {a.insights.map((s) => (
                  <li key={s} className="text-[13.5px] text-[var(--ink)] flex gap-2"><span className="text-[var(--accent)]">•</span>{s}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
            <Kpi icon={<IndianRupee size={15} />} label="Revenue" value={inr(t.revenue)} color="var(--accent)" now={t.revenue} before={prev?.revenue} spark={series('revenue')} />
            <Kpi icon={<Users size={15} />} label="Patients" value={String(t.patients)} color="#7c5cbf" now={t.patients} before={prev?.patients} spark={series('patients')} />
            <Kpi icon={<FlaskConical size={15} />} label="Tests" value={String(t.tests)} color="#1c9aa8" now={t.tests} before={prev?.tests} spark={series('tests')} />
            <Kpi icon={<Receipt size={15} />} label="Avg. bill" value={inr(t.avgBill)} color="#d98a1f" now={t.avgBill} before={prev?.avgBill} spark={a.buckets.map((b) => (b.patients ? b.revenue / b.patients : 0))} />
            <Kpi icon={<BadgeCheck size={15} />} label="Completed" value={`${Math.round(t.completionRate * 100)}%`} color="var(--success)" now={t.completionRate} before={prev?.completionRate} spark={[]} />
          </div>

          <div className="grid xl:grid-cols-3 gap-5 mb-5">
            <Card
              className="xl:col-span-2"
              title="Trend"
              subtitle={`By ${a.granularity}`}
              right={
                <div className="inline-flex p-0.5 rounded-xl bg-[var(--bg-app)] border border-[var(--border-soft)]">
                  {METRICS.map((m) => (
                    <button key={m.key} onClick={() => setMetric(m.key)} className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium ${metric === m.key ? 'bg-[var(--surface)] text-[var(--accent)] shadow-sm' : 'text-[var(--ink-3)]'}`}>{m.label}</button>
                  ))}
                </div>
              }
            >
              <TrendChart buckets={a.buckets} metric={metric} />
            </Card>

            <Card title="Report completion" subtitle="Status of reports registered in this period">
              <div className="flex justify-around mb-5">
                <ProgressRing value={t.patients ? a.status.completed / t.patients : 0} color="var(--success)" label="Completed" />
                <ProgressRing value={t.patients ? a.status.partial / t.patients : 0} color="var(--warning)" label="In progress" />
                <ProgressRing value={t.patients ? a.status.draft / t.patients : 0} color="var(--ink-4)" label="Not started" />
              </div>
              <div className="text-[12.5px] text-[var(--ink-3)] text-center">{a.status.completed} of {t.patients} reports delivered</div>
            </Card>
          </div>

          <div className="grid xl:grid-cols-2 gap-5 mb-5">
            <Card title="Top investigations" subtitle="Most ordered, with what they earned">
              {a.investigations.length ? <RankedBars rows={a.investigations.slice(0, 7)} valueOf={(r) => r.count} format={(r) => `${r.count} orders`} sub={(r) => inr(r.revenue)} /> : <Empty />}
            </Card>
            <Card title="Top referring doctors" subtitle="By revenue brought in">
              {a.doctors.length ? <RankedBars rows={a.doctors.slice(0, 7)} valueOf={(r) => r.revenue} format={(r) => inr(r.revenue)} sub={(r) => `${r.count} patient${r.count === 1 ? '' : 's'}`} /> : <Empty text="No doctor referrals in this period" />}
            </Card>
          </div>

          <div className="grid xl:grid-cols-3 gap-5 mb-5">
            <Card title="Patients by gender">
              <Donut centerLabel="patients" slices={[{ label: 'Male', value: a.gender.M, color: 'var(--accent)' }, { label: 'Female', value: a.gender.F, color: '#c9497a' }]} />
            </Card>
            <Card title="New vs returning" subtitle="Returning = seen before, matched by mobile number or name">
              <Donut centerLabel="visits" slices={[{ label: 'New patients', value: a.returning.newPatients, color: 'var(--success)' }, { label: 'Returning', value: a.returning.returning, color: '#7c5cbf' }]} />
            </Card>
            <Card title="Referral source" subtitle="Walk-ins vs referred by a doctor">
              <Donut centerLabel="patients" slices={[{ label: 'Doctor referred', value: a.referred, color: '#1c9aa8' }, { label: 'Self / walk-in', value: a.selfReferred, color: '#d98a1f' }]} />
            </Card>
          </div>

          <div className="grid xl:grid-cols-3 gap-5">
            <Card title="Age groups" subtitle="Who walks through the door">
              <Columns items={a.ageGroups} color="#7c5cbf" />
            </Card>
            <Card title="Busiest days" subtitle="Registrations by weekday">
              <Columns items={a.weekday} />
            </Card>
            <Card title="Peak hours" subtitle="When registrations happen — darker is busier">
              <Heatmap heat={a.heat} max={a.heatMax} />
            </Card>
          </div>
        </>
      )}
    </main>
  )
}
