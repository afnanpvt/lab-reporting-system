import { IpcMain, BrowserWindow, app, shell, dialog } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync, unlinkSync, rmSync } from 'fs'
import { dbRun, dbGet, dbAll } from './db'
import { verifyLicense } from './license'
import { getLogoDataUrl, setLogo, clearLogo } from './branding'

const SECTION_TABLES: Record<string, string> = {
  haematology: 'haematology',
  biochemistry: 'biochemistry',
  serology: 'serology',
  urine: 'urine',
  motion: 'motion',
  cs: 'culture_sensitivity',
  mantoux: 'mantoux',
  gtt_lipid: 'gtt_lipid',
  blood: 'blood_group',
  electrolytes: 'electrolytes',
  lft: 'lft',
  abg_sputum: 'abg_sputum'
}

export function registerIpcHandlers(ipcMain: IpcMain): void {
  // ---- Settings ----
  ipcMain.handle('settings:get', () => {
    const rows = dbAll('SELECT key, value FROM lab_settings')
    return Object.fromEntries(rows.map((r) => [r.key, r.value]))
  })

  ipcMain.handle('settings:set', (_e, key: string, value: string) => {
    dbRun('INSERT OR REPLACE INTO lab_settings (key, value) VALUES (?, ?)', [key, value])
    return true
  })

  // ---- Branding ----
  ipcMain.handle('branding:getLogo', () => {
    return getLogoDataUrl()
  })

  // Dev-only, same reasoning as the profiles:* handlers below — a real customer's logo is set
  // once via a profile at build/launch time, never edited live by the customer themselves.
  ipcMain.handle('branding:setLogo', (_e, dataUrl: string) => {
    if (!is.dev) return false
    setLogo(dataUrl)
    return true
  })

  ipcMain.handle('branding:clearLogo', () => {
    if (!is.dev) return false
    clearLogo()
    return true
  })

  // ---- Patients ----
  ipcMain.handle('patients:list', (_e, search?: string) => {
    if (search) {
      return dbAll(
        `SELECT * FROM patients WHERE name LIKE ? OR sid LIKE ? ORDER BY rowid DESC LIMIT 100`,
        [`%${search}%`, `%${search}%`]
      )
    }
    return dbAll('SELECT * FROM patients ORDER BY rowid DESC LIMIT 100')
  })

  ipcMain.handle('patients:create', (_e, data: Record<string, unknown>) => {
    const sidRow = dbGet("SELECT value FROM lab_settings WHERE key='sid_counter'")
    const counter = parseInt(String(sidRow?.value ?? '1'))
    const sid = String(counter).padStart(6, '0')

    dbRun(
      `INSERT INTO patients (sid, name, age, age_unit, gender, address, mobile, referred_by, reg_date, reg_time, rpt_date, rpt_time, sections, consent_given)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sid,
        data.name,
        data.age,
        data.age_unit ?? 'Y',
        data.gender ?? 'M',
        data.address ?? '',
        data.mobile ?? '',
        data.referred_by ?? '',
        data.reg_date ?? '',
        data.reg_time ?? '',
        data.rpt_date ?? '',
        data.rpt_time ?? '',
        JSON.stringify(data.sections ?? []),
        data.consent_given ? 1 : 0
      ]
    )

    const inserted = dbGet('SELECT id FROM patients ORDER BY rowid DESC LIMIT 1')
    dbRun("UPDATE lab_settings SET value=? WHERE key='sid_counter'", [String(counter + 1)])

    return { id: inserted?.id, sid }
  })

  ipcMain.handle('patients:get', (_e, id: number) => {
    return dbGet('SELECT * FROM patients WHERE id=?', [id])
  })

  ipcMain.handle('patients:update', (_e, id: number, data: Record<string, unknown>) => {
    const keys = Object.keys(data)
    if (keys.length === 0) return true
    const values = keys.map((k) => {
      if (k === 'sections' && Array.isArray(data[k])) return JSON.stringify(data[k])
      if (k === 'consent_given') return data[k] ? 1 : 0
      return data[k]
    })
    const set = keys.map((k) => `${k}=?`).join(',')
    dbRun(`UPDATE patients SET ${set} WHERE id=?`, [...values, id])
    return true
  })

  ipcMain.handle('patients:delete', (_e, id: number) => {
    const resultTables = [...new Set(Object.values(SECTION_TABLES)), 'custom_results']
    for (const table of resultTables) {
      dbRun(`DELETE FROM ${table} WHERE patient_id=?`, [id])
    }
    dbRun('DELETE FROM bill_items WHERE patient_id=?', [id])
    dbRun('DELETE FROM patients WHERE id=?', [id])
    return true
  })

  // ---- Results ----
  ipcMain.handle('results:save', (_e, section: string, patientId: number, data: Record<string, string>) => {
    if (section === 'others') {
      dbRun(
        `INSERT INTO custom_results (patient_id, data) VALUES (?, ?)
         ON CONFLICT(patient_id) DO UPDATE SET data=excluded.data`,
        [patientId, JSON.stringify(data)]
      )
      return true
    }

    const table = SECTION_TABLES[section]
    if (!table) return false

    const keys = Object.keys(data).filter((k) => k !== 'patient_id')
    if (keys.length === 0) {
      // upsert with just patient_id to create the row
      dbRun(`INSERT OR IGNORE INTO ${table} (patient_id) VALUES (?)`, [patientId])
      return true
    }

    const placeholders = keys.map(() => '?').join(',')
    const updateSet = keys.map((k) => `${k}=excluded.${k}`).join(',')

    dbRun(
      `INSERT INTO ${table} (patient_id, ${keys.join(',')}) VALUES (?, ${placeholders})
       ON CONFLICT(patient_id) DO UPDATE SET ${updateSet}`,
      [patientId, ...keys.map((k) => data[k] ?? '')]
    )

    return true
  })

  // patient_id is the join key, not a result field — every caller treats these rows as
  // Record<string, string> of just the clinical fields, so it must never leak into them
  // (it's a number, not text, and crashes anything that assumes every value is a string).
  function stripPatientId(row: Record<string, unknown> | null): Record<string, unknown> {
    if (!row) return {}
    const { patient_id, ...rest } = row
    return rest
  }

  function getCustomResults(patientId: number): Record<string, string> {
    const row = dbGet('SELECT data FROM custom_results WHERE patient_id=?', [patientId])
    if (!row) return {}
    try {
      return JSON.parse(String(row.data ?? '{}'))
    } catch {
      return {}
    }
  }

  ipcMain.handle('results:get', (_e, section: string, patientId: number) => {
    if (section === 'others') return getCustomResults(patientId)
    const table = SECTION_TABLES[section]
    if (!table) return null
    return stripPatientId(dbGet(`SELECT * FROM ${table} WHERE patient_id=?`, [patientId]))
  })

  ipcMain.handle('results:getAll', (_e, patientId: number) => {
    const result: Record<string, unknown> = {}
    for (const [section, table] of Object.entries(SECTION_TABLES)) {
      result[section] = stripPatientId(dbGet(`SELECT * FROM ${table} WHERE patient_id=?`, [patientId]))
    }
    result.others = getCustomResults(patientId)
    return result
  })

  // ---- Printers ----
  ipcMain.handle('printers:list', () => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    if (!win) return []
    return win.webContents.getPrinters()
  })

  // ---- Print to PDF ----
  // Renders the live report window itself rather than re-loading a detached HTML string, so the
  // PDF is pixel-identical to the preview (same stylesheet, same bundled logo/badge assets), then
  // asks where to save it. Margins are zero because the report's own .print-page box already owns
  // the full 210x297mm sheet and applies the margin as internal padding — letting the PDF engine
  // add its own margin on top would scale the page down and reintroduce the tiny-print bug.
  ipcMain.handle('print:pdf', async (e, suggestedName: string) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return { saved: false as const, reason: 'no-window' }

    const safe = (suggestedName || 'report').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Save report as PDF',
      defaultPath: join(app.getPath('documents'), `${safe}.pdf`),
      filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
    })
    if (canceled || !filePath) return { saved: false as const, reason: 'canceled' }

    const pdfBuffer = await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 }
    })
    writeFileSync(filePath, pdfBuffer)

    return { saved: true as const, filePath }
  })

  // ---- Direct print ----
  ipcMain.handle('print:direct', async (_e, html: string, printerName: string) => {
    const win = new BrowserWindow({ show: false, webPreferences: { sandbox: false } })
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

    return new Promise<{ success: boolean; reason: string }>((resolve) => {
      win.webContents.print(
        { deviceName: printerName, silent: true, printBackground: true, pageSize: 'A4' },
        (success, reason) => {
          win.close()
          resolve({ success, reason: reason ?? '' })
        }
      )
    })
  })

  // ---- Demo seed ----
  ipcMain.handle('demo:seed', () => {
    const sidRow = dbGet("SELECT value FROM lab_settings WHERE key='sid_counter'")
    const counter = parseInt(String(sidRow?.value ?? '1'))
    const sid = String(counter).padStart(6, '0')
    const today = new Date()
    const dd = String(today.getDate()).padStart(2, '0')
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const yyyy = today.getFullYear()
    const dateStr = `${dd}/${mm}/${yyyy}`
    const timeStr = `${String(today.getHours()).padStart(2,'0')}:${String(today.getMinutes()).padStart(2,'0')}`

    dbRun(
      `INSERT INTO patients (sid, name, age, age_unit, gender, address, mobile, referred_by, reg_date, reg_time, rpt_date, rpt_time, sections)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sid, 'Mr. Mohan Gupta', 29, 'Y', 'M', 'Juni Line, New Delhi', '7070982408',
       'Dr. Ankit Agarwal', dateStr, timeStr, dateStr, timeStr,
       JSON.stringify(['haematology', 'biochemistry', 'serology'])]
    )
    const inserted = dbGet('SELECT id FROM patients ORDER BY rowid DESC LIMIT 1')
    const pid = inserted?.id as number
    dbRun("UPDATE lab_settings SET value=? WHERE key='sid_counter'", [String(counter + 1)])

    // Haematology - CBC with some abnormal flags
    dbRun(
      `INSERT OR REPLACE INTO haematology (patient_id, haemoglobin, rbc_count, pcv, total_wbc,
        neutrophils, lymphocytes, monocytes, eosinophils, basophils,
        platelet_count, mcv, mch, mchc, esr, blood_group, rh_typing)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [pid, '14.2','3.9','46','4500','65','25','8','2','0','1.6','117.9','36.4','30.9','12','B+ve','Positive']
    )
    // Biochemistry
    dbRun(
      `INSERT OR REPLACE INTO biochemistry (patient_id, glucose_r, blood_urea, s_creatinine,
        s_uric_acid, s_cholesterol, s_triglycerides, sgpt, sgot, total_protein, albumin)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [pid, '125','15.2','0.66','2.3','178','142','38','32','7.1','4.2']
    )
    // Serology - Blood group & basic
    dbRun(
      `INSERT OR REPLACE INTO serology (patient_id, hbs_ag, hiv1, hiv2, vdrl, malaria)
       VALUES (?,?,?,?,?,?)`,
      [pid, 'Non-Reactive', 'Non-Reactive', 'Non-Reactive', 'Non-Reactive', 'Negative']
    )

    return { id: pid, sid }
  })

  // ---- Doctors ----
  ipcMain.handle('doctors:list', () => {
    return dbAll('SELECT * FROM doctors ORDER BY name')
  })

  ipcMain.handle('doctors:get', (_e, id: number) => {
    return dbGet('SELECT * FROM doctors WHERE id=?', [id])
  })

  ipcMain.handle('doctors:create', (_e, data: Record<string, unknown>) => {
    dbRun(
      'INSERT INTO doctors (name, specialty, phone) VALUES (?, ?, ?)',
      [data.name, data.specialty ?? '', data.phone ?? '']
    )
    const inserted = dbGet('SELECT id FROM doctors ORDER BY rowid DESC LIMIT 1')
    return { id: inserted?.id }
  })

  ipcMain.handle('doctors:update', (_e, id: number, data: Record<string, unknown>) => {
    const keys = Object.keys(data)
    if (keys.length === 0) return true
    const set = keys.map((k) => `${k}=?`).join(',')
    dbRun(`UPDATE doctors SET ${set} WHERE id=?`, [...Object.values(data), id])
    return true
  })

  // ---- Billing ----
  // Line-item pricing is computed in the renderer from these two tables: rate_card
  // (default price per investigation) and bill_items (per-patient overrides, which
  // always win). Fetching both tables whole is fine at this scale and keeps the IPC
  // surface as dumb as the rest of the app — no server-side business logic to drift
  // out of sync with the UI.
  ipcMain.handle('billing:rateCard', () => {
    return dbAll('SELECT section, amount FROM rate_card')
  })

  ipcMain.handle('billing:setRateCardAmount', (_e, section: string, amount: number) => {
    dbRun(
      `INSERT INTO rate_card (section, amount) VALUES (?, ?)
       ON CONFLICT(section) DO UPDATE SET amount=excluded.amount`,
      [section, amount]
    )
    return true
  })

  ipcMain.handle('billing:allItems', () => {
    return dbAll('SELECT patient_id, section, amount FROM bill_items')
  })

  ipcMain.handle('billing:setItemAmount', (_e, patientId: number, section: string, amount: number) => {
    dbRun(
      `INSERT INTO bill_items (patient_id, section, amount) VALUES (?, ?, ?)
       ON CONFLICT(patient_id, section) DO UPDATE SET amount=excluded.amount`,
      [patientId, section, amount]
    )
    return true
  })

  // ---- License ----
  ipcMain.handle('license:get', () => {
    const result = verifyLicense()
    return result.ok ? { labName: result.labName, licenseId: result.licenseId, issuedAt: result.issuedAt } : null
  })

  // Separate from license:get (which Settings uses for its "Licensed to X" banner and stays
  // null for both "no license" and "expired trial") — App's top-level gate needs to tell those
  // two apart so it can block the whole app on an expired trial instead of quietly falling back
  // to open/demo mode the way a missing license does.
  ipcMain.handle('license:status', () => {
    const result = verifyLicense()
    if (result.expired) {
      return { expired: true, labName: result.labName, expiresAt: result.expiresAt }
    }
    return { expired: false }
  })

  // ---- Vendor profiles (dev-only) ----
  // Lets Settings offer a "preview a profile's branding" switcher while developing/pitching —
  // reads profiles/ straight off disk rather than the staged resources/branding.json, so it can
  // list every profile, not just whichever one is currently applied. Gated on is.dev for defense
  // in depth; the renderer-side switcher itself is compiled out of packaged builds entirely
  // (see the import.meta.env.DEV guard in Settings.tsx), and profiles/ isn't packaged anyway.
  const profilesDir = join(process.cwd(), 'profiles')

  ipcMain.handle('profiles:list', () => {
    if (!is.dev || !existsSync(profilesDir)) return []
    return readdirSync(profilesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(profilesDir, entry.name, 'config.json')))
      .map((entry) => entry.name)
      .sort()
  })

  ipcMain.handle('profiles:get', (_e, name: string) => {
    if (!is.dev) return null
    const configPath = join(profilesDir, name, 'config.json')
    if (!existsSync(configPath)) return null
    try {
      return JSON.parse(readFileSync(configPath, 'utf8'))
    } catch {
      return null
    }
  })

  // A profile's own logo.png, read straight off disk as a data URL — lets the Settings preview
  // switcher apply it live (via branding:setLogo) instead of only the text fields, without
  // needing apply-profile.js + a restart just to see what a vendor's branding actually looks like.
  ipcMain.handle('profiles:getLogo', (_e, name: string) => {
    if (!is.dev) return null
    const logoPath = join(profilesDir, name, 'logo.png')
    if (!existsSync(logoPath)) return null
    try {
      return `data:image/png;base64,${readFileSync(logoPath).toString('base64')}`
    } catch {
      return null
    }
  })

  // Lets Settings save whatever's currently filled in (and the currently-applied logo) as a new
  // profile on disk while demoing — a quicker path than hand-writing profiles/<name>/config.json.
  // Same folder shape apply-profile.js already expects (see profiles/README.md); license.json is
  // never written here, since a real license has to come from scripts/issue-license.js.
  ipcMain.handle('profiles:save', (_e, name: string, config: Record<string, string>, logoDataUrl?: string | null) => {
    if (!is.dev) return false
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    if (!slug) return false

    const dir = join(profilesDir, slug)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'config.json'), JSON.stringify(config, null, 2), 'utf8')

    const logoPath = join(dir, 'logo.png')
    if (logoDataUrl && /^data:image\/[a-zA-Z+.-]+;base64,/.test(logoDataUrl)) {
      const base64 = logoDataUrl.slice(logoDataUrl.indexOf(',') + 1)
      writeFileSync(logoPath, Buffer.from(base64, 'base64'))
    } else if (existsSync(logoPath)) {
      // Saving without a logo after previously saving one to this same name shouldn't leave a
      // stale image behind — the profile should reflect exactly what was on screen when saved.
      unlinkSync(logoPath)
    }

    return slug
  })

  // "demo" is the one profile committed to the repo (see profiles/README.md) — every clone
  // expects it to exist, so it's the only name this refuses to touch. Everything else (including
  // a real customer's profile) is deletable; the renderer confirms with the user before calling
  // this, since there's no undo once the folder's gone.
  ipcMain.handle('profiles:delete', (_e, name: string) => {
    if (!is.dev || name === 'demo') return false
    const dir = join(profilesDir, name)
    if (!existsSync(dir)) return false
    rmSync(dir, { recursive: true, force: true })
    return true
  })

  // ---- Shell ----
  ipcMain.handle('shell:openPath', (_e, path: string) => {
    shell.showItemInFolder(path)
  })

  ipcMain.handle('shell:openWhatsApp', (_e, phone: string, message?: string) => {
    const clean = phone.replace(/\D/g, '')
    const withCountryCode = clean.length === 10 ? `91${clean}` : clean
    const text = message ? `?text=${encodeURIComponent(message)}` : ''
    shell.openExternal(clean ? `https://wa.me/${withCountryCode}${text}` : 'https://web.whatsapp.com')
  })

  ipcMain.handle('shell:openExternal', (_e, url: string) => {
    if (!/^https:\/\//.test(url)) return
    shell.openExternal(url)
  })

  // ---- Window ----
  // The native Windows caption-button overlay (minimize/maximize/close) is drawn by the OS, not
  // the web page, so it can't be re-themed with CSS — the renderer calls this whenever the user's
  // light/dark preference changes (and once on launch) to keep it in sync with the app chrome.
  ipcMain.handle('window:setTitleBarOverlay', (e, options: { color: string; symbolColor: string }) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    win?.setTitleBarOverlay({ color: options.color, symbolColor: options.symbolColor, height: 76 })
  })
}
