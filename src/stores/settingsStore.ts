import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ApiConfig, Settings } from '@/types'

interface SettingsState {
  apiConfig: ApiConfig
  settings: Settings
  setApiConfig: (config: Partial<ApiConfig>) => void
  setSettings: (settings: Partial<Settings>) => void
  clearApiConfig: () => void
}

const defaultApiConfig: ApiConfig = {
  provider: 'openai',
  apiKey: '',
  baseURL: 'https://api.openai.com/v1',
  model: '',
}

const defaultSettings: Settings = {
  theme: 'light',
  autoSave: true,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiConfig: defaultApiConfig,
      settings: defaultSettings,

      setApiConfig: (config) =>
        set((state) => ({
          apiConfig: { ...state.apiConfig, ...config },
        })),

      setSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      clearApiConfig: () =>
        set({
          apiConfig: defaultApiConfig,
        }),
    }),
    {
      name: 'gameworder:settings',
      partialize: (state) => ({
        apiConfig: state.apiConfig,
        settings: state.settings,
      }),
    }
  )
)
