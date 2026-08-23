import { create } from 'zustand'
import type { Patient, AllResults } from '../types/lab'

interface ReportStore {
  patient: Patient | null
  results: Partial<AllResults>
  settings: Record<string, string>
  setPatient: (p: Patient) => void
  setResults: (section: string, data: Record<string, string>) => void
  setSettings: (s: Record<string, string>) => void
  clearReport: () => void
  loadSettings: () => Promise<void>
}

export const useReport = create<ReportStore>((set) => ({
  patient: null,
  results: {},
  settings: {},

  setPatient: (p) => set({ patient: p }),
  setResults: (section, data) =>
    set((state) => ({
      results: { ...state.results, [section]: data }
    })),
  setSettings: (s) => set({ settings: s }),
  clearReport: () => set({ patient: null, results: {} }),

  loadSettings: async () => {
    // window.api only exists inside Electron — this store is also mounted on /site routes,
    // which run in a plain browser during the design-review phase, so this is expected there.
    if (!window.api) return
    const s = await window.api.settings.get()
    set({ settings: s })
  }
}))
