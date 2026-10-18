import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { buildDemo } from './demo'
import { defaultState } from './defaults'
import { flushSaves, loadSlot, queueSave, saveSlot } from './storage'
import type { AppState, Settings } from './types'

export function applyTheme(theme: Settings['theme']) {
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = theme === 'dark' || (theme === 'system' && systemDark)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  localStorage.setItem('life-theme', theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  meta?.setAttribute('content', dark ? '#171614' : '#f3f0e8')
}

interface StoreValue {
  ready: boolean
  state: AppState
  update: (fn: (state: AppState) => AppState) => void
  setDemoMode: (on: boolean) => void
  resetDemo: () => void
  replaceAll: (next: AppState) => void
}

const Ctx = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [real, setReal] = useState<AppState | null>(null)
  const [demo, setDemo] = useState<AppState | null>(null)
  const realRef = useRef<AppState | null>(null)
  const demoRef = useRef<AppState | null>(null)

  useEffect(() => {
    let cancel = false
    void (async () => {
      const saved = await loadSlot('state')
      if (cancel) return
      const initial = saved ?? defaultState()
      if (!saved) await saveSlot('state', initial)
      if (cancel) return
      realRef.current = initial
      setReal(initial)
      applyTheme(initial.settings.theme)
      if (initial.settings.demoMode) {
        const seeded = (await loadSlot('demo')) ?? buildDemo(initial)
        if (cancel) return
        demoRef.current = seeded
        setDemo(seeded)
      }
    })()
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushSaves()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flushSaves)
    return () => {
      cancel = true
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flushSaves)
    }
  }, [])

  useEffect(() => {
    if (!real) return
    if (real.settings.theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [real])

  const update = useCallback((fn: (state: AppState) => AppState) => {
    const currentReal = realRef.current
    if (!currentReal) return
    if (currentReal.settings.demoMode) {
      const base = demoRef.current ?? buildDemo(currentReal)
      const next = fn(base)
      const realNext: AppState = {
        ...currentReal,
        settings: {
          ...currentReal.settings,
          theme: next.settings.theme,
          notifications: next.settings.notifications,
          reminderHour: next.settings.reminderHour,
          reminderMinute: next.settings.reminderMinute,
        },
      }
      demoRef.current = { ...next, settings: { ...next.settings, demoMode: true } }
      realRef.current = realNext
      setDemo(demoRef.current)
      setReal(realNext)
      queueSave('demo', demoRef.current)
      queueSave('state', realNext)
      applyTheme(next.settings.theme)
      return
    }
    const next = fn(currentReal)
    realRef.current = next
    setReal(next)
    queueSave('state', next)
    applyTheme(next.settings.theme)
  }, [])

  const setDemoMode = useCallback((on: boolean) => {
    const current = realRef.current
    if (!current) return
    const next = { ...current, settings: { ...current.settings, demoMode: on } }
    realRef.current = next
    setReal(next)
    queueSave('state', next)
    if (on) {
      const seeded = demoRef.current ?? buildDemo(next)
      demoRef.current = seeded
      setDemo(seeded)
      queueSave('demo', seeded)
    }
  }, [])

  const resetDemo = useCallback(() => {
    const current = realRef.current
    if (!current) return
    const seeded = buildDemo(current)
    demoRef.current = seeded
    setDemo(seeded)
    queueSave('demo', seeded)
  }, [])

  const replaceAll = useCallback((next: AppState) => {
    const cleaned = { ...next, settings: { ...next.settings, demoMode: false } }
    realRef.current = cleaned
    setReal(cleaned)
    queueSave('state', cleaned)
    applyTheme(cleaned.settings.theme)
  }, [])

  const viewing = real?.settings.demoMode ? demo : real
  const value = useMemo<StoreValue | null>(() => {
    if (!real || !viewing) return null
    return { ready: true, state: viewing, update, setDemoMode, resetDemo, replaceAll }
  }, [real, viewing, update, setDemoMode, resetDemo, replaceAll])

  if (!value) {
    return (
      <div className="boot">
        <p className="brand">Life</p>
      </div>
    )
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('Store missing')
  return ctx
}
