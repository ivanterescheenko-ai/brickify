import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Settings {
  provider: string
  apiKey: string
  model: string
  baseUrl: string
  tavilyKey: string
  setSettings: (s: Partial<Omit<Settings, 'setSettings'>>) => void
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      provider: '',
      apiKey: '',
      model: '',
      baseUrl: '',
      tavilyKey: '',
      setSettings: (s) => set(s),
    }),
    { name: 'brickify-settings' }
  )
)
