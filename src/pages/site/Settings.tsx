import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, CheckCircle2, ShieldCheck, Building2, Lock, FlaskConical, Palette, Check, Sun, Moon } from 'lucide-react'
import { getLabSettings, saveLabSettings, getLicenseInfo, listProfiles, getProfile, type LabSettingsForm, type LicenseInfo } from './api'
import { THEMES, getTheme, setTheme, type ThemeId, MODES, getMode, setMode, type ModeId } from './theme'

const EMPTY: LabSettingsForm = { labName: '', labAddress: '', labPhone: '', labEmail: '', labDoctor: '' }

export default function Settings() {
  const navigate = useNavigate()
  const [form, setForm] = useState<LabSettingsForm>(EMPTY)
  const [license, setLicense] = useState<LicenseInfo | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [theme, setThemeState] = useState<ThemeId>(getTheme)
  const [mode, setModeState] = useState<ModeId>(getMode)

  const handleThemeChange = (id: ThemeId) => {
    setTheme(id)
    setThemeState(id)
  }

  const handleModeChange = (id: ModeId) => {
    setMode(id)
    setModeState(id)
  }

  // Dev-only convenience — lets us preview a vendor profile's branding while pitching/testing
  // without hand-typing every field. import.meta.env.DEV is statically false in a packaged
  // build, so this whole branch (and the UI below it) is stripped out, not just hidden.
  const [profiles, setProfiles] = useState<string[]>([])
  const [selectedProfile, setSelectedProfile] = useState('')
  const [applyingProfile, setApplyingProfile] = useState(false)

  useEffect(() => {
    getLabSettings().then(setForm)
    getLicenseInfo().then(setLicense)
    if (import.meta.env.DEV) {
      listProfiles().then((list) => {
        setProfiles(list)
        setSelectedProfile((current) => current || list[0] || '')
      })
    }
  }, [])

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  // Only previews the text fields — logo and license are baked in at build/launch time
  // (see profiles/README.md), not something a running app can swap live.
  const handleApplyProfile = async () => {
    if (!selectedProfile) return
    setApplyingProfile(true)
    try {
      const config = await getProfile(selectedProfile)
      if (config) {
        setForm(config)
        await saveLabSettings(config)
      }
    } finally {
      setApplyingProfile(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    await saveLabSettings(form)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const fields: { key: keyof typeof form; label: string; placeholder: string }[] = [
    { key: 'labName', label: 'Lab Name', placeholder: 'Your Lab Name' },
    { key: 'labAddress', label: 'Address', placeholder: 'Full address' },
    { key: 'labPhone', label: 'Phone / Contact', placeholder: 'e.g. 99442 38110' },
    { key: 'labEmail', label: 'Email', placeholder: 'e.g. lab@example.com' },
    { key: 'labDoctor', label: 'Authorised Doctor', placeholder: 'Dr. Name (printed on reports)' }
  ]

  return (
      <div className="flex flex-col h-full">
        <div className="flex items-center px-8 py-4 bg-[var(--surface)] border-b border-[var(--border)] flex-shrink-0">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-[14px] text-[var(--ink-3)] hover:text-[var(--ink)]"
          >
            <ArrowLeft size={15} />
            Dashboard
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[var(--bg-app)]">
          <div className="px-10 py-9">
            <div className="flex items-center justify-between mb-7">
              <div>
                <h1 className="text-[24px] font-semibold text-[var(--ink)]">Settings</h1>
                <p className="text-[14px] text-[var(--ink-2)] mt-0.5">Laboratory and report configuration</p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] text-white text-[14px] font-medium rounded-xl hover:bg-[var(--accent-ink)] shadow-sm disabled:opacity-60"
              >
                {saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
                {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
              <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Building2 size={16} className="text-[var(--accent)]" />
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--ink-3)]">Laboratory Information</h2>
                </div>

                {license ? (
                  <div className="flex items-center gap-2.5 mb-5 px-3.5 py-2.5 rounded-xl bg-[var(--bg-app)] border border-[var(--border)]">
                    <Lock size={13} className="text-[var(--ink-3)] flex-shrink-0" />
                    <div className="text-[13px] text-[var(--ink-2)]">
                      Licensed to <span className="font-medium text-[var(--ink)]">{license.labName}</span> — this name is fixed to the license and can't be changed here. Contact Scalyft to update it.
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 mb-5 px-3.5 py-2.5 rounded-xl bg-[var(--bg-app)] border border-[var(--border)]">
                    <Building2 size={13} className="text-[var(--ink-3)] flex-shrink-0" />
                    <div className="text-[13px] text-[var(--ink-2)]">
                      Demo mode — no license installed. Every field below, including the lab name, is fully editable.
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {fields.map(({ key, label, placeholder }) => (
                    <div key={key} className={key === 'labAddress' ? 'col-span-2' : ''}>
                      <label className="block text-[14px] font-medium text-[var(--ink)] mb-1.5">{label}</label>
                      <input
                        className="w-full px-3.5 py-2.5 text-[15px] border border-[var(--border-strong)] rounded-xl bg-[var(--bg-app)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-25)] focus:border-[var(--accent)] disabled:opacity-60"
                        placeholder={placeholder}
                        value={form[key]}
                        disabled={key === 'labName' && !!license}
                        onChange={(e) => update(key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl p-6" style={{ background: 'var(--success-soft)', border: '1px solid var(--success-soft-border)' }}>
                  <div className="flex items-start gap-3">
                    <ShieldCheck size={19} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                    <div>
                      <h2 className="text-[15px] font-semibold mb-1" style={{ color: 'var(--success)' }}>Data stays on this computer</h2>
                      <p className="text-[14px] leading-relaxed" style={{ color: 'var(--success)' }}>
                        Patient records and reports live in a local database on this machine only —
                        nothing is uploaded to the cloud, fully offline.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-6">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3">Report Output</h2>
                  <div className="space-y-2 text-[14px] text-[var(--ink-2)] leading-relaxed">
                    <p>PDFs save to <span className="font-medium text-[var(--ink)]">Documents\LabReports\</span>.</p>
                    <p>Printing uses any installed Windows printer, selected from the report preview.</p>
                    <p>WhatsApp sharing opens a chat with a message ready — attaching the PDF is one drag once it's saved.</p>
                  </div>
                </div>

                <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Palette size={16} className="text-[var(--accent)]" />
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--ink-3)]">Appearance</h2>
                  </div>

                  <div className="flex items-center gap-2 p-1 rounded-xl bg-[var(--bg-app)] border border-[var(--border)] mb-5 w-fit">
                    {MODES.map(({ id, label }) => {
                      const isActive = mode === id
                      const Icon = id === 'dark' ? Moon : Sun
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleModeChange(id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors ${
                            isActive ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm' : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
                          }`}
                        >
                          <Icon size={13} />
                          {label}
                        </button>
                      )
                    })}
                  </div>

                  <div className="flex items-center gap-3">
                    {THEMES.map(({ id, label, swatch }) => {
                      const isActive = theme === id
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleThemeChange(id)}
                          title={label}
                          className="flex flex-col items-center gap-1.5 group"
                        >
                          <span
                            className="w-9 h-9 rounded-full flex items-center justify-center transition-transform group-hover:scale-105"
                            style={{ background: swatch, boxShadow: isActive ? `0 0 0 2px var(--surface), 0 0 0 4px ${swatch}` : 'none' }}
                          >
                            {isActive && <Check size={15} className="text-white" strokeWidth={3} />}
                          </span>
                          <span className="text-[12px]" style={{ color: isActive ? 'var(--ink)' : 'var(--ink-3)', fontWeight: isActive ? 600 : 400 }}>
                            {label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {import.meta.env.DEV && profiles.length > 0 && (
                  <div className="rounded-2xl p-6" style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning-soft-border)' }}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <FlaskConical size={16} style={{ color: 'var(--warning)' }} />
                      <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--warning)' }}>Dev only — profile preview</h2>
                    </div>
                    <p className="text-[13px] leading-relaxed mb-3" style={{ color: 'var(--warning-ink)' }}>
                      Fills the fields above from a profile's config.json — logo and license need{' '}
                      <code className="text-[12px]">npm run profile {selectedProfile || '<name>'}</code> and a restart. Never shown in a packaged build.
                    </p>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedProfile}
                        onChange={(e) => setSelectedProfile(e.target.value)}
                        className="flex-1 px-3 py-2 text-[14px] border border-[var(--warning-soft-border)] rounded-lg bg-[var(--surface)] text-[var(--ink)] focus:outline-none"
                      >
                        {profiles.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleApplyProfile}
                        disabled={applyingProfile}
                        className="px-3.5 py-2 text-[14px] font-medium rounded-lg text-white disabled:opacity-60"
                        style={{ background: 'var(--warning)' }}
                      >
                        {applyingProfile ? 'Applying…' : 'Preview'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-[12.5px] text-[var(--ink-4)] px-1">
                  <span>LumaLabs</span>
                  <button
                    onClick={() => window.api.shell.openExternal('https://www.scalyft.tech')}
                    className="hover:text-[var(--accent)] hover:underline"
                  >
                    Powered by Scalyft
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  )
}
