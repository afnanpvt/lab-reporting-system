import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value)
  },
  branding: {
    getLogo: () => ipcRenderer.invoke('branding:getLogo'),
    setLogo: (dataUrl: string) => ipcRenderer.invoke('branding:setLogo', dataUrl),
    clearLogo: () => ipcRenderer.invoke('branding:clearLogo'),
    getBadge: () => ipcRenderer.invoke('branding:getBadge'),
    getCertifications: () => ipcRenderer.invoke('branding:getCertifications')
  },
  profiles: {
    list: () => ipcRenderer.invoke('profiles:list'),
    get: (name: string) => ipcRenderer.invoke('profiles:get', name),
    getLogo: (name: string) => ipcRenderer.invoke('profiles:getLogo', name),
    save: (name: string, config: unknown, logoDataUrl?: string | null) =>
      ipcRenderer.invoke('profiles:save', name, config, logoDataUrl),
    delete: (name: string) => ipcRenderer.invoke('profiles:delete', name)
  },
  patients: {
    list: (search?: string) => ipcRenderer.invoke('patients:list', search),
    create: (data: unknown) => ipcRenderer.invoke('patients:create', data),
    get: (id: number) => ipcRenderer.invoke('patients:get', id),
    update: (id: number, data: unknown) => ipcRenderer.invoke('patients:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('patients:delete', id)
  },
  results: {
    save: (section: string, patientId: number, data: unknown) =>
      ipcRenderer.invoke('results:save', section, patientId, data),
    get: (section: string, patientId: number) =>
      ipcRenderer.invoke('results:get', section, patientId),
    getAll: (patientId: number) => ipcRenderer.invoke('results:getAll', patientId)
  },
  printers: {
    list: () => ipcRenderer.invoke('printers:list')
  },
  print: {
    pdf: (suggestedName: string) => ipcRenderer.invoke('print:pdf', suggestedName),
    direct: (html: string, printerName: string) => ipcRenderer.invoke('print:direct', html, printerName)
  },
  shell: {
    openPath: (path: string) => ipcRenderer.invoke('shell:openPath', path),
    openWhatsApp: (phone: string, message?: string) => ipcRenderer.invoke('shell:openWhatsApp', phone, message),
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url)
  },
  doctors: {
    list: () => ipcRenderer.invoke('doctors:list'),
    get: (id: number) => ipcRenderer.invoke('doctors:get', id),
    create: (data: unknown) => ipcRenderer.invoke('doctors:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('doctors:update', id, data)
  },
  billing: {
    rateCard: () => ipcRenderer.invoke('billing:rateCard'),
    setRateCardAmount: (section: string, amount: number) => ipcRenderer.invoke('billing:setRateCardAmount', section, amount),
    allItems: () => ipcRenderer.invoke('billing:allItems'),
    setItemAmount: (patientId: number, section: string, amount: number) =>
      ipcRenderer.invoke('billing:setItemAmount', patientId, section, amount)
  },
  demo: {
    seed: () => ipcRenderer.invoke('demo:seed')
  },
  license: {
    status: () => ipcRenderer.invoke('license:status'),
    activate: (key: string) => ipcRenderer.invoke('license:activate', key)
  },
  window: {
    setTitleBarOverlay: (options: { color: string; symbolColor: string }) =>
      ipcRenderer.invoke('window:setTitleBarOverlay', options)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
