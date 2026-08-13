import { IpcMain, BrowserWindow, app, shell } from 'electron'
import { join } from 'path'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { dbRun, dbGet, dbAll } from './db'

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
      `INSERT INTO patients (sid, name, age, age_unit, gender, address, mobile, referred_by, reg_date, reg_time, rpt_date, rpt_time, sections)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        JSON.stringify(data.sections ?? [])
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
    const set = keys.map((k) => `${k}=?`).join(',')
    dbRun(`UPDATE patients SET ${set} WHERE id=?`, [...Object.values(data), id])
    return true
  })

  // ---- Results ----
  ipcMain.handle('results:save', (_e, section: string, patientId: number, data: Record<string, string>) => {
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

  ipcMain.handle('results:get', (_e, section: string, patientId: number) => {
    const table = SECTION_TABLES[section]
    if (!table) return null
    return dbGet(`SELECT * FROM ${table} WHERE patient_id=?`, [patientId])
  })

  ipcMain.handle('results:getAll', (_e, patientId: number) => {
    const result: Record<string, unknown> = {}
    for (const [section, table] of Object.entries(SECTION_TABLES)) {
      result[section] = dbGet(`SELECT * FROM ${table} WHERE patient_id=?`, [patientId]) ?? {}
    }
    return result
  })

  // ---- Printers ----
  ipcMain.handle('printers:list', () => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    if (!win) return []
    return win.webContents.getPrinters()
  })

  // ---- Print to PDF ----
  ipcMain.handle('print:pdf', async (_e, html: string, patientName: string) => {
    const win = new BrowserWindow({ show: false, webPreferences: { sandbox: false } })

    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

    const pdfBuffer = await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { marginType: 'custom', top: 0.4, bottom: 0.4, left: 0.5, right: 0.5 }
    })

    win.close()

    const labDir = join(app.getPath('documents'), 'LabReports')
    if (!existsSync(labDir)) mkdirSync(labDir, { recursive: true })

    const safe = patientName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')
    const filePath = join(labDir, `${safe}_${Date.now()}.pdf`)
    writeFileSync(filePath, pdfBuffer)

    return filePath
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
}
