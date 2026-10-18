import { createContext, useContext, type ReactNode } from 'react'
import type { Config, Model } from './model/finance'

export type UpdateConfig = (recipe: (config: Config) => Config) => void

type AppState = {
  config: Config
  model: Model
  update: UpdateConfig
}

const AppContext = createContext<AppState | null>(null)

export function AppStateProvider({ value, children }: { value: AppState; children: ReactNode }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppState {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used inside the provider')
  return value
}
