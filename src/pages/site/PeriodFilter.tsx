import SlideFilter from './SlideFilter'
import DatePicker from './DatePicker'
import { PRESETS, periodLabel, rangeFor, type Preset } from './period'

/**
 * The period picker for the doctor screens (This month, Last month, This year, All time, Custom
 * dates): the same slide-out control as Patients and Analytics, with from/to dates for Custom.
 */
export default function PeriodFilter({ preset, customFrom, customTo, onPreset, onFrom, onTo, side = 'right', compact = false }: {
  preset: Preset
  customFrom: string
  customTo: string
  onPreset: (p: Preset) => void
  onFrom: (d: string) => void
  onTo: (d: string) => void
  side?: 'left' | 'right'
  compact?: boolean
}) {
  const { from, to } = rangeFor(preset, customFrom, customTo)
  const field = 'w-[9.5rem] px-2.5 py-1 text-[13px] rounded-md border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--accent)]'
  return (
    <SlideFilter
      options={PRESETS}
      value={preset}
      onChange={onPreset}
      keepOpenKey="custom"
      side={side}
      compact={compact}
      extraWidth="24rem"
      buttonLabel={preset === 'custom' ? periodLabel(preset, from, to) : undefined}
      title="Choose the period"
      extra={(close) => (
        <div className="inline-flex items-center gap-2 text-[13px] text-[var(--ink-2)] whitespace-nowrap">
          <DatePicker value={customFrom} onChange={onFrom} className={field} ariaLabel="From date" />
          to
          <DatePicker value={customTo} onChange={onTo} onCommit={close} className={field} ariaLabel="To date" />
        </div>
      )}
    />
  )
}
