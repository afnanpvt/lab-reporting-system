import type { ElectronAPI } from '@electron-toolkit/preload'

interface LabAPI {
  settings: {
    get(): Promise<Record<string, string>>
    set(key: string, value: string): Promise<boolean>
  }
  patients: {
    list(search?: string): Promise<import('./lab').Patient[]>
    create(data: Omit<import('./lab').Patient, 'id' | 'created_at'>): Promise<{ id: number; sid: string }>
    get(id: number): Promise<import('./lab').Patient | null>
    update(id: number, data: Partial<import('./lab').Patient>): Promise<boolean>
  }
  results: {
    save(section: string, patientId: number, data: Record<string, string>): Promise<boolean>
    get(section: string, patientId: number): Promise<Record<string, string> | null>
    getAll(patientId: number): Promise<import('./lab').AllResults>
  }
  printers: {
    list(): Promise<Electron.PrinterInfo[]>
  }
  print: {
    pdf(html: string, patientName: string): Promise<string>
    direct(html: string, printerName: string): Promise<{ success: boolean; reason: string }>
  }
  shell: {
    openPath(path: string): Promise<void>
    openWhatsApp(phone: string, message?: string): Promise<void>
    openExternal(url: string): Promise<void>
  }
  demo: {
    seed(): Promise<{ id: number; sid: string }>
  }
  doctors: {
    list(): Promise<import('./lab').Doctor[]>
    get(id: number): Promise<import('./lab').Doctor | null>
    create(data: { name: string; specialty?: string; phone?: string }): Promise<{ id: number }>
    update(id: number, data: Partial<import('./lab').Doctor>): Promise<boolean>
  }
  billing: {
    rateCard(): Promise<import('./lab').RateCardEntry[]>
    setRateCardAmount(section: string, amount: number): Promise<boolean>
    allItems(): Promise<import('./lab').BillItem[]>
    setItemAmount(patientId: number, section: string, amount: number): Promise<boolean>
  }
  license: {
    get(): Promise<{ labName: string; licenseId: string; issuedAt: string } | null>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: LabAPI
  }
}
