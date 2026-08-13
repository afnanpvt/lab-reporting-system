import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value)
  },
  patients: {
    list: (search?: string) => ipcRenderer.invoke('patients:list', search),
    create: (data: unknown) => ipcRenderer.invoke('patients:create', data),
    get: (id: number) => ipcRenderer.invoke('patients:get', id),
    update: (id: number, data: unknown) => ipcRenderer.invoke('patients:update', id, data)
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
    pdf: (html: string, patientName: string) => ipcRenderer.invoke('print:pdf', html, patientName),
    direct: (html: string, printerName: string) => ipcRenderer.invoke('print:direct', html, printerName)
  },
  shell: {
    openPath: (path: string) => ipcRenderer.invoke('shell:openPath', path),
    openWhatsApp: (phone: string, message?: string) => ipcRenderer.invoke('shell:openWhatsApp', phone, message)
  },
  demo: {
    seed: () => ipcRenderer.invoke('demo:seed')
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
