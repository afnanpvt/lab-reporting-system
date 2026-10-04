import { useEffect, useRef, useState } from 'react'
import { confirmDialog } from './confirmStore'
import { useLocation } from 'react-router-dom'
import { ArrowLeft, Save, SlidersHorizontal, Keyboard, CheckCircle2, ShieldCheck, Building2, Tags, Lock, FlaskConical, Palette, Check, Sun, Moon, ImageUp, ImageOff, AlertTriangle, Trash2, KeyRound, ExternalLink } from 'lucide-react'
import {
  getLabSettings,
  saveLabSettings,
  listProfiles,
  getProfile,
  getProfileLogo,
  saveProfile,
  deleteProfile,
  setLogoDataUrl,
  clearLogoDataUrl,
  type LabSettingsForm
} from './api'
import { daysLeftLabel, useLicense } from './licenseStore'
import LicenseKeyForm from './LicenseKeyForm'
import { contactScalyft } from './contact'
import { THEMES, getTheme, setTheme, type ThemeId, MODES, getMode, setMode, type ModeId } from './theme'
import { useBranding, refreshBranding } from './brandingStore'
import { useFeatures, setAnalyticsEnabled, setFlaggingEnabled, setValueChecksEnabled } from './featuresStore'
import ShortcutSettings from './ShortcutSettings'
import SavedTestsSettings from './SavedTestsSettings'
import { useGuardedNavigate, useLeaveGuard } from './leaveGuard'
import Tabs from './Tabs'
import { customLabelCount, useLabels } from './labelsStore'
import { customTestCount, useCustomTests } from './customTestsStore'

type SettingsTab = 'lab' | 'tests' | 'prefs' | 'shortcuts' | 'about'

const TABS: { key: SettingsTab; label: string; Icon: typeof Building2 }[] = [
  { key: 'lab', label: 'Laboratory', Icon: Building2 },
  { key: 'tests', label: 'Tests', Icon: Tags },
  { key: 'prefs', label: 'Preferences', Icon: SlidersHorizontal },
  { key: 'shortcuts', label: 'Shortcuts', Icon: Keyboard },
  { key: 'about', label: 'License & About', Icon: ShieldCheck }
]
const TAB_KEY = 'labapp:settingsTab'

function storedTab(): SettingsTab {
  try {
    const t = sessionStorage.getItem(TAB_KEY)
    if (t && TABS.some((x) => x.key === t)) return t as SettingsTab
  } catch {
    // sessionStorage unavailable — open on the first tab
  }
  return 'lab'
}

const EMPTY: LabSettingsForm = { labName: '', labAddress: '', labPhone: '', labEmail: '', labDoctor: '', labDoctorQualifications: '', labQualityCheck: '' }

// Settings is a routed page — it fully unmounts when you navigate away and remounts from
// scratch when you come back, unlike Shell's persistent header. Plain useState for
// activeProfile would forget which profile was applied on every remount, making the dropdown
// snap back to the list's first entry even though nothing had actually changed. Persisting to
// localStorage survives that remount (and even a full app restart).
const ACTIVE_PROFILE_KEY = 'labapp:activeProfile'
function getStoredActiveProfile(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PROFILE_KEY)
  } catch {
    return null
  }
}
function setStoredActiveProfile(name: string | null): void {
  try {
    if (name) localStorage.setItem(ACTIVE_PROFILE_KEY, name)
    else localStorage.removeItem(ACTIVE_PROFILE_KEY)
  } catch {
    // ignore
  }
}

export default function Settings() {
  const location = useLocation()
  useLabels() // re-render when tests are saved, so the counts below stay current
  useCustomTests()
  const renamedCount = customLabelCount()
  const addedCount = customTestCount()
  const justSaved = (location.state as { testNamesSaved?: { renamed: number; added: number } } | null)?.testNamesSaved
  const [form, setForm] = useState<LabSettingsForm>(EMPTY)
  // What is stored: the lab details count as unsaved when the form no longer matches it.
  const [savedForm, setSavedForm] = useState<LabSettingsForm>(EMPTY)
  const guardedNavigate = useGuardedNavigate()
  // Coming back from the test editor lands on Tests; otherwise the tab you were last on.
  const [tab, setTab] = useState<SettingsTab>(() => ((location.state as { testNamesSaved?: unknown } | null)?.testNamesSaved !== undefined ? 'tests' : storedTab()))
  const changeTab = (next: SettingsTab) => {
    setTab(next)
    try { sessionStorage.setItem(TAB_KEY, next) } catch { /* not remembered, still works */ }
  }
  const license = useLicense()
  const features = useFeatures()
  const analyticsOn = features.analytics !== false
  const hasLicense = license?.state === 'licensed' || license?.state === 'trial'
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [theme, setThemeState] = useState<ThemeId>(getTheme)
  const [mode, setModeState] = useState<ModeId>(getMode)
  const { logo } = useBranding()
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoError, setLogoError] = useState('')
  const logoInputRef = useRef<HTMLInputElement>(null)

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
  const [selectedProfile, setSelectedProfile] = useState(() => getStoredActiveProfile() || '')
  const [applyingProfile, setApplyingProfile] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSavedMsg, setProfileSavedMsg] = useState('')
  // Which profile (if any) the user actually chose — as opposed to selectedProfile, which also
  // holds the dropdown's default first-item value before anyone's touched it. Save Changes writes
  // back into this profile's config.json (see handleSave below) so edits made while "on" a
  // profile stick around instead of only living in the DB until the next Preview overwrites them
  // from the stale file on disk. Null means edit the DB only, same as before profiles existed —
  // never set just from the dropdown defaulting to the first profile in the list. Persisted to
  // localStorage (see ACTIVE_PROFILE_KEY above) so it survives Settings remounting on navigation.
  const [activeProfile, setActiveProfileState] = useState<string | null>(getStoredActiveProfile)

  const setActiveProfile = (name: string | null) => {
    setActiveProfileState(name)
    setStoredActiveProfile(name)
  }

  // Keyed on the licensed lab name because activating a key re-locks lab_name in the database.
  useEffect(() => {
    getLabSettings().then((s) => { setForm(s); setSavedForm(s) })
  }, [license?.labName])

  useEffect(() => {
    if (import.meta.env.DEV) {
      listProfiles().then((list) => {
        setProfiles(list)
        // If the remembered active/selected profile no longer exists (deleted from another
        // session, say), fall back to the list's first entry instead of a dangling selection.
        setSelectedProfile((current) => (current && list.includes(current) ? current : list[0] || ''))
        setActiveProfileState((current) => {
          const next = current && list.includes(current) ? current : null
          if (next !== current) setStoredActiveProfile(next)
          return next
        })
      })
    }
  }, [])

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  // Applies a profile's text fields AND its logo (or clears the logo if the profile has none,
  // e.g. switching back to dev) — the license (when a profile has one) is still baked in at
  // build/launch time (see profiles/README.md), the one piece this can't do live. Fires as soon
  // as the dropdown selection changes, no separate "apply" click needed.
  const handleApplyProfile = async (name: string) => {
    if (!name) return
    setApplyingProfile(true)
    try {
      const [config, logoDataUrl] = await Promise.all([getProfile(name), getProfileLogo(name)])
      if (config) {
        setForm(config)
        await saveLabSettings(config)
      }
      if (logoDataUrl) {
        await setLogoDataUrl(logoDataUrl)
      } else {
        await clearLogoDataUrl()
      }
      await refreshBranding()
      setActiveProfile(name)
    } finally {
      setApplyingProfile(false)
    }
  }

  // Captures whatever's currently filled in (and the currently-applied logo) as a new profile on
  // disk, so a vendor's branding can be set up once while demoing rather than hand-editing a
  // profiles/<name>/config.json file.
  const handleSaveAsProfile = async () => {
    if (!newProfileName.trim()) return
    setSavingProfile(true)
    setProfileSavedMsg('')
    try {
      const slug = await saveProfile(newProfileName, form, logo)
      if (slug) {
        setProfiles(await listProfiles())
        setSelectedProfile(slug)
        setActiveProfile(slug)
        setNewProfileName('')
        setProfileSavedMsg(`Saved as "${slug}"`)
        setTimeout(() => setProfileSavedMsg(''), 3000)
      }
    } finally {
      setSavingProfile(false)
    }
  }

  // "dev" can't be deleted (see the main-process handler) — everything else can, but there's no
  // undo once the folder's gone, so this confirms first.
  const handleDeleteProfile = async () => {
    if (!selectedProfile || selectedProfile === 'dev') return
    const ok = await confirmDialog({
      tone: 'danger',
      title: 'Delete this profile?',
      subject: selectedProfile,
      message: 'This removes the profile folder. It can’t be undone.',
      confirmLabel: 'Delete profile'
    })
    if (!ok) return
    const deleted = await deleteProfile(selectedProfile)
    if (!deleted) return
    const list = await listProfiles()
    setProfiles(list)
    if (activeProfile === selectedProfile) setActiveProfile(null)
    setSelectedProfile(list[0] || '')
  }

  const handleSave = async () => {
    setSaving(true)
    await saveLabSettings(form)
    // Keep the active profile's config.json in sync with whatever was just saved — otherwise
    // edits made "on" a profile only ever land in the DB, and picking that profile again later
    // silently reverts to the stale file on disk.
    if (activeProfile) await saveProfile(activeProfile, form, logo)
    await refreshBranding()
    setSavedForm(form)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Leaving with edited lab details (Back, Edit tests, the sidebar) offers Save / Discard / Keep editing.
  useLeaveGuard(JSON.stringify(form) !== JSON.stringify(savedForm), async () => { await handleSave(); return true }, { what: 'the Laboratory tab' })

  const MAX_LOGO_BYTES = 2 * 1024 * 1024

  const handleLogoFile = async (file: File) => {
    setLogoError('')
    if (!file.type.startsWith('image/')) {
      setLogoError('Please choose an image file (PNG, JPG, or SVG).')
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('That image is too large. Please pick one under 2 MB.')
      return
    }
    setUploadingLogo(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      await setLogoDataUrl(dataUrl)
      await refreshBranding()
    } catch {
      setLogoError('Could not read that image. Please try a different file.')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleRemoveLogo = async () => {
    setLogoError('')
    await clearLogoDataUrl()
    await refreshBranding()
  }

  // Doctor name and qualifications are separate fields, not one free-typed string split apart
  // by guessing at a comma (see the one-time lab_doctor_qualifications migration in db.ts for
  // machines that already had them combined). Unlike the logo, both are left editable in a
  // packaged build too — a lab's signing doctor or qualifications can legitimately change, and
  // there'd otherwise be no way to correct it short of a new release (see the one-time
  // lab_doctor placeholder cleanup in db.ts for machines already stuck on an old default).
  const fields: { key: keyof typeof form; label: string; placeholder: string }[] = [
    { key: 'labName', label: 'Lab Name', placeholder: 'Your Lab Name' },
    { key: 'labAddress', label: 'Address', placeholder: 'Full address' },
    { key: 'labPhone', label: 'Phone / Contact', placeholder: 'e.g. 98765 43210' },
    { key: 'labEmail', label: 'Email', placeholder: 'e.g. lab@example.com' },
    { key: 'labDoctor', label: 'Authorised Doctor', placeholder: 'Dr. Name (printed on reports)' },
    { key: 'labDoctorQualifications', label: 'Qualifications', placeholder: 'e.g. M.Sc. (Biochem), DMLT, DMRT, DCA' },
    { key: 'labQualityCheck', label: 'Quality Check Institution', placeholder: 'e.g. CMC Hospital, Vellore. (blank = no quality-check line on reports)' }
  ]

  return (
      <div className="flex flex-col h-full">
        <div className="flex items-center px-8 py-4 bg-[var(--surface)] border-b border-[var(--border)] flex-shrink-0">
          <button
            onClick={() => guardedNavigate('/')}
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
                <p className="text-[14px] text-[var(--ink-2)] mt-0.5">
                  {activeProfile ? (
                    <>Editing the <span className="font-medium text-[var(--ink)]">{activeProfile}</span> profile. Save Changes updates it too</>
                  ) : (
                    'Laboratory and report configuration'
                  )}
                </p>
              </div>
              {tab === 'lab' && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] text-white text-[14px] font-medium rounded-xl hover:bg-[var(--accent-ink)] shadow-sm disabled:opacity-60"
                >
                  {saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
                  {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
                </button>
              )}
            </div>

            {/* Settings are grouped into tabs so each screen holds one kind of thing. Only the Laboratory tab
                has a Save button; everything else applies the moment it is changed. */}
            <Tabs tabs={TABS} active={tab} onChange={changeTab} />

            {tab === 'lab' && (
              <div className="max-w-3xl [&>*]:mb-5">
                <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <Building2 size={16} className="text-[var(--accent)]" />
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--ink-3)]">Laboratory Information</h2>
                  </div>

                  {hasLicense ? (
                    <div className="flex items-center gap-2.5 mb-5 px-3.5 py-2.5 rounded-xl bg-[var(--bg-app)] border border-[var(--border)]">
                      <Lock size={13} className="text-[var(--ink-3)] flex-shrink-0" />
                      <div className="text-[13px] text-[var(--ink-2)]">
                        Licensed to <span className="font-medium text-[var(--ink)]">{license?.labName}</span>. This name is fixed to the license and can't be changed here. Contact Scalyft to update it.
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 mb-5 px-3.5 py-2.5 rounded-xl bg-[var(--bg-app)] border border-[var(--border)]">
                      <Building2 size={13} className="text-[var(--ink-3)] flex-shrink-0" />
                      <div className="text-[13px] text-[var(--ink-2)]">
                        Demo mode: no license installed. Every field below, including the lab name, is fully editable.
                      </div>
                    </div>
                  )}

                  {/* Dev-only, like the Authorised Doctor field above — a real customer's logo is
                      set once via a profile at build time (see profiles/README.md), never edited
                      live by the customer themselves, so a packaged build has nothing to act on
                      here and nothing worth showing either. */}
                  {import.meta.env.DEV && (
                  <div className="flex items-center gap-4 mb-5 pb-5 border-b border-[var(--border)]">
                    <div
                      className="flex items-center justify-center flex-shrink-0 rounded-xl border border-[var(--border)] bg-[var(--bg-app)] overflow-hidden"
                      style={{ width: 96, height: 64 }}
                    >
                      {logo ? (
                        <img src={logo} alt="Lab logo" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <span className="text-[11px] text-[var(--ink-4)] px-2 text-center">No logo</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block text-[14px] font-medium text-[var(--ink)] mb-1.5">Logo</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={uploadingLogo}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border border-[var(--border-strong)] rounded-lg text-[var(--ink)] hover:bg-[var(--bg-hover)] disabled:opacity-60"
                        >
                          <ImageUp size={14} />
                          {uploadingLogo ? 'Uploading…' : logo ? 'Change logo' : 'Upload logo'}
                        </button>
                        {logo && (
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg text-[var(--ink-3)] hover:bg-[var(--bg-hover)] hover:text-[var(--danger)]"
                          >
                            <ImageOff size={14} />
                            Remove
                          </button>
                        )}
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleLogoFile(file)
                            e.target.value = ''
                          }}
                        />
                      </div>
                      {logoError ? (
                        <div className="flex items-center gap-1.5 mt-1.5 text-[12.5px] text-[var(--danger)]">
                          <AlertTriangle size={12} />
                          {logoError}
                        </div>
                      ) : (
                        <p className="text-[12.5px] text-[var(--ink-3)] mt-1.5">
                          Shown in the app header and on printed reports. Takes effect immediately, no restart needed.
                        </p>
                      )}
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
                          disabled={key === 'labName' && hasLicense}
                          onChange={(e) => update(key, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {import.meta.env.DEV && profiles.length > 0 && (
                  <div className="rounded-2xl p-6" style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning-soft-border)' }}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <FlaskConical size={16} style={{ color: 'var(--warning)' }} />
                      <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--warning)' }}>Dev only: profile preview</h2>
                    </div>
                    <p className="text-[13px] leading-relaxed mb-3" style={{ color: 'var(--warning-ink)' }}>
                      Selecting a profile applies its fields and logo immediately. Only a real
                      license (when one's installed) still needs{' '}
                      <code className="text-[12px]">npm run profile {selectedProfile || '<name>'}</code> and a restart. Never shown in a packaged build.
                    </p>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedProfile}
                        disabled={applyingProfile}
                        onChange={(e) => {
                          const name = e.target.value
                          setSelectedProfile(name)
                          handleApplyProfile(name)
                        }}
                        className="flex-1 px-3 py-2 text-[14px] border border-[var(--warning-soft-border)] rounded-lg bg-[var(--surface)] text-[var(--ink)] focus:outline-none disabled:opacity-60"
                      >
                        {profiles.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      {selectedProfile !== 'dev' && (
                        <button
                          type="button"
                          onClick={handleDeleteProfile}
                          title={`Delete "${selectedProfile}"`}
                          className="inline-flex items-center justify-center w-9 h-9 flex-shrink-0 rounded-lg text-[var(--warning-ink)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--warning-soft-border)' }}>
                      <p className="text-[12.5px] mb-2" style={{ color: 'var(--warning-ink)' }}>
                        Save what's currently filled in (fields + logo above) as a new profile:
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          value={newProfileName}
                          onChange={(e) => setNewProfileName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveAsProfile() }}
                          placeholder="e.g. sunrise-diagnostics"
                          className="flex-1 px-3 py-2 text-[14px] border border-[var(--warning-soft-border)] rounded-lg bg-[var(--surface)] text-[var(--ink)] focus:outline-none"
                        />
                        <button
                          onClick={handleSaveAsProfile}
                          disabled={savingProfile || !newProfileName.trim()}
                          className="px-3.5 py-2 text-[14px] font-medium rounded-lg border disabled:opacity-50"
                          style={{ color: 'var(--warning-ink)', borderColor: 'var(--warning-soft-border)' }}
                        >
                          {savingProfile ? 'Saving…' : 'Save as new profile'}
                        </button>
                      </div>
                      {profileSavedMsg && (
                        <p className="text-[12.5px] mt-1.5" style={{ color: 'var(--success)' }}>{profileSavedMsg}</p>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}
            {tab === 'tests' && (
              <div className="lg:columns-2 lg:gap-6 [&>*]:break-inside-avoid [&>*]:mb-5">
                <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Tags size={16} className="text-[var(--accent)]" />
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--ink-3)]">Tests</h2>
                  </div>
                  <p className="text-[13px] text-[var(--ink-3)] mb-4 leading-relaxed">
                    Rename any test (for example “Plasma Glucose F”) or add new tests to a section, so reports read the way your lab prefers. These are locked while you work and can only be changed here, so nothing changes by accident.
                  </p>
                  {justSaved !== undefined && (
                    <div className="flex items-center gap-2 text-[13px] rounded-lg px-3 py-2 mb-4" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                      <CheckCircle2 size={14} /> Tests saved{justSaved.renamed === 0 && justSaved.added === 0 ? '. Everything uses the default tests.' : '.'}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[13.5px] text-[var(--ink-2)]">
                      {renamedCount === 0 && addedCount === 0
                        ? 'All tests use their default names.'
                        : [renamedCount > 0 && `${renamedCount} renamed`, addedCount > 0 && `${addedCount} added`].filter(Boolean).join(', ') + '.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => guardedNavigate('/settings/test-names')}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-medium border border-[var(--border-strong)] rounded-xl text-[var(--ink)] hover:bg-[var(--bg-hover)] flex-shrink-0"
                    >
                      Edit tests…
                    </button>
                  </div>
                </div>
                <SavedTestsSettings />

              </div>
            )}
            {tab === 'prefs' && (
              <div className="lg:columns-2 lg:gap-6 [&>*]:break-inside-avoid [&>*]:mb-5">
                <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-6">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-4">Features</h2>
                  <div className="divide-y divide-[var(--border-soft)]">
                    {[
                      { label: 'Analytics', on: analyticsOn, set: setAnalyticsEnabled, text: 'Charts and insights on patients, tests and revenue. Turn off to hide the Analytics page from the menu completely.' },
                      { label: 'Abnormal value highlighting', on: features.flagging, set: setFlaggingEnabled, text: 'Marks a result with a red ▲ or ▼ when it is outside its reference range, on the result sheet and on printed reports. Turn off to show results without any colour or arrow.' },
                      { label: 'Smart value checks', on: features.valueChecks, set: setValueChecksEnabled, text: 'The yellow, red and blue notes on the result sheet: likely typos and unit slips, critical values, suggested calculated values, and the “check before report” list. Turn off to enter results with no warnings at all.' }
                    ].map((f) => (
                      <div key={f.label} className="flex items-center justify-between gap-6 py-3.5 first:pt-0 last:pb-0">
                        <div>
                          <div className="text-[14.5px] font-medium text-[var(--ink)]">{f.label}</div>
                          <p className="text-[13px] text-[var(--ink-3)] mt-0.5 leading-relaxed">{f.text}</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={f.on}
                          aria-label={f.label}
                          onClick={() => f.set(!f.on)}
                          className="relative flex-shrink-0 w-[46px] h-[26px] rounded-full transition-colors duration-200"
                          style={{ background: f.on ? 'var(--accent)' : 'var(--border-strong)' }}
                        >
                          <span className="absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-all duration-200" style={{ left: f.on ? 23 : 3 }} />
                        </button>
                      </div>
                    ))}
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

                <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-6">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3">Report Output</h2>
                  <div className="space-y-2 text-[14px] text-[var(--ink-2)] leading-relaxed">
                    <p>PDFs save to <span className="font-medium text-[var(--ink)]">Documents\LabReports\</span>.</p>
                    <p>Printing uses any installed Windows printer, selected from the report preview.</p>
                    <p>WhatsApp sharing opens a chat with a message ready. Attaching the PDF is one drag once it's saved.</p>
                  </div>
                </div>

              </div>
            )}
            {tab === 'shortcuts' && (
              <div className="max-w-3xl [&>*]:mb-5">
                <ShortcutSettings />

              </div>
            )}
            {tab === 'about' && (
              <div className="lg:columns-2 lg:gap-6 [&>*]:break-inside-avoid [&>*]:mb-5">
                <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <KeyRound size={16} className="text-[var(--accent)]" />
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--ink-3)]">License</h2>
                  </div>
                  {license?.state === 'licensed' ? (
                    <div className="text-[14px] text-[var(--ink-2)] leading-relaxed">
                      <div className="flex items-center gap-1.5 font-semibold mb-1" style={{ color: 'var(--success)' }}>
                        <CheckCircle2 size={15} />
                        Full version
                      </div>
                      Licensed to <span className="font-medium text-[var(--ink)]">{license.labName}</span>
                      <div className="text-[13px] text-[var(--ink-3)] mt-0.5">
                        License ID <span className="font-mono text-[var(--ink)] select-text">{license.licenseId}</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-[14px] text-[var(--ink-2)] leading-relaxed mb-3">
                        {license?.state === 'trial' ? (
                          <>
                            <span className="font-semibold text-[var(--ink)]">Trial: {daysLeftLabel(license.daysLeft)} left</span>
                            {license.expiresAt && <> (ends {new Date(license.expiresAt).toLocaleDateString()})</>}. License ID{' '}
                            <span className="font-mono text-[var(--ink)] select-text">{license.licenseId}</span>.
                          </>
                        ) : (
                          'Demo mode, no license installed.'
                        )}{' '}
                        To buy the full version, contact Scalyft.
                      </p>
                      <button
                        onClick={contactScalyft}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 mb-4 text-[14px] font-medium border border-[var(--border-strong)] rounded-xl text-[var(--ink)] hover:bg-[var(--bg-hover)]"
                      >
                        <ExternalLink size={15} />
                        Contact Scalyft
                      </button>
                      <LicenseKeyForm />
                    </>
                  )}
                </div>

                <div className="rounded-2xl p-6" style={{ background: 'var(--success-soft)', border: '1px solid var(--success-soft-border)' }}>
                  <div className="flex items-start gap-3">
                    <ShieldCheck size={19} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                    <div>
                      <h2 className="text-[15px] font-semibold mb-1" style={{ color: 'var(--success)' }}>Data stays on this computer</h2>
                      <p className="text-[14px] leading-relaxed" style={{ color: 'var(--success)' }}>
                        Patient records and reports live in a local database on this machine only.
                        Nothing is uploaded to the cloud, fully offline.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            )}
            {tab === 'about' && (
              <div className="flex items-center justify-between text-[12.5px] text-[var(--ink-4)] px-1 pb-2">
                <span>LumaLabs</span>
                <button
                  onClick={() => window.api.shell.openExternal('https://www.scalyft.tech')}
                  className="hover:text-[var(--accent)] hover:underline"
                >
                  Powered by Scalyft
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
  )
}
