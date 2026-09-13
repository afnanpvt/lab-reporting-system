import { useNavigate } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { daysLeftLabel, useLicense } from './licenseStore'
import { SCALYFT_PHONE_DISPLAY, messageScalyftOnWhatsApp } from './contact'

const WARN_WHEN_DAYS_LEFT = 7

export default function TrialBanner() {
  const navigate = useNavigate()
  const license = useLicense()
  if (license?.state !== 'trial' || (license.daysLeft ?? 0) > WARN_WHEN_DAYS_LEFT) return null

  return (
    <div
      className="flex items-center gap-3 px-6 py-2 flex-shrink-0 text-[13.5px] print:hidden"
      style={{ background: 'var(--warning-soft)', borderBottom: '1px solid var(--warning-soft-border)', color: 'var(--warning-ink)' }}
    >
      <Clock size={14} className="flex-shrink-0" style={{ color: 'var(--warning)' }} />
      <span className="flex-1">
        <span className="font-semibold">Trial: {daysLeftLabel(license.daysLeft)} left.</span> WhatsApp or call Scalyft on{' '}
        {SCALYFT_PHONE_DISPLAY} to buy the full version.
      </span>
      <button onClick={() => messageScalyftOnWhatsApp(license)} className="font-medium hover:underline">
        Message on WhatsApp
      </button>
      <button onClick={() => navigate('/settings')} className="font-medium hover:underline">
        Enter license key
      </button>
    </div>
  )
}
