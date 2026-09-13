import { useState } from 'react'
import { AlertTriangle, KeyRound } from 'lucide-react'
import { activateLicense } from './licenseStore'

export default function LicenseKeyForm() {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [activating, setActivating] = useState(false)

  const handleActivate = async () => {
    if (!key.trim()) return
    setActivating(true)
    setError('')
    const result = await activateLicense(key)
    setActivating(false)
    if (result.ok) setKey('')
    else setError(result.error)
  }

  return (
    <div className="text-left">
      <label className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">License key</label>
      <textarea
        value={key}
        onChange={(e) => setKey(e.target.value)}
        rows={3}
        spellCheck={false}
        placeholder="Paste the LUMA-… key you received from Scalyft"
        className="w-full px-3 py-2 text-[12.5px] font-mono break-all border border-[var(--border-strong)] rounded-xl bg-[var(--bg-app)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)] focus:border-[var(--accent)]"
      />
      {error && (
        <p className="flex items-start gap-1.5 mt-1.5 text-[12.5px] text-[var(--danger)]">
          <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
          {error}
        </p>
      )}
      <button
        onClick={handleActivate}
        disabled={activating || !key.trim()}
        className="mt-2.5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--accent)] text-white text-[14px] font-medium rounded-xl hover:bg-[var(--accent-ink)] shadow-sm disabled:opacity-60"
      >
        <KeyRound size={15} />
        {activating ? 'Activating…' : 'Activate'}
      </button>
    </div>
  )
}
