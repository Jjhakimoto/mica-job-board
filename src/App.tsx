import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { AppStateProvider, type UpdateConfig } from './app-state'
import { Assumptions } from './components/Assumptions'
import { CheckIn } from './components/CheckIn'
import { Independence } from './components/Independence'
import { Milestone, Runways } from './components/Overview'
import { Scenarios } from './components/Scenarios'
import { Triggers } from './components/Triggers'
import { WorstCase } from './components/WorstCase'
import { longDate } from './format'
import { ageOnDate, defaultConfig, model as projectModel, normalizeConfig, type Config } from './model/finance'
import { clearWorkingCopy, downloadConfig, loadWorkingCopy, saveWorkingCopy } from './storage'

const PINS_KEY = 'resilience-pins'
const THEME_KEY = 'resilience-theme'

function initialTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function initialPins(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(PINS_KEY) || '')
    if (Array.isArray(saved) && saved.every((item) => typeof item === 'string')) return saved.slice(0, 3)
  } catch {
    /* use the default trio */
  }
  return ['base-800', 'job-6', 'worst']
}

export function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme)
  const [pins, setPins] = useState<string[]>(initialPins)
  const [config, setConfig] = useState<Config | null>(null)
  const [fileConfig, setFileConfig] = useState<Config | null>(null)
  const [source, setSource] = useState<'file' | 'browser'>('file')
  const [loadNote, setLoadNote] = useState('')

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem(PINS_KEY, JSON.stringify(pins))
  }, [pins])

  useEffect(() => {
    let live = true
    fetch('/config.json')
      .then((response) => {
        if (!response.ok) throw new Error('missing config')
        return response.json()
      })
      .then((json) => {
        if (!live) return
        const file = normalizeConfig(json)
        setFileConfig(file)
        const saved = loadWorkingCopy()
        if (saved) {
          setConfig(saved)
          setSource('browser')
        } else {
          setConfig(file)
          setSource('file')
        }
      })
      .catch(() => {
        if (!live) return
        const fallback = defaultConfig()
        setFileConfig(fallback)
        setConfig(fallback)
        setSource('file')
        setLoadNote('config.json did not load. Showing the built-in October 2026 figures.')
      })
    return () => {
      live = false
    }
  }, [])

  const update = useCallback<UpdateConfig>((recipe) => {
    setConfig((current) => {
      if (!current) return current
      const next = recipe(current)
      saveWorkingCopy(next)
      setSource('browser')
      return next
    })
  }, [])

  const modeled = useMemo(() => (config ? projectModel(config) : null), [config])

  function resetFile() {
    if (!fileConfig) return
    const drop = window.confirm('Reload config.json? Edits and check-ins kept only in this browser will be dropped.')
    if (!drop) return
    clearWorkingCopy()
    setConfig(fileConfig)
    setSource('file')
  }

  function togglePin(id: string) {
    setPins((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id)
      const next = [...current, id]
      return next.length > 3 ? next.slice(-3) : next
    })
  }

  if (!config || !modeled) {
    return (
      <main className="loading">
        <p>Loading your numbers.</p>
      </main>
    )
  }

  const age = ageOnDate(config.profile.asOf, config.profile.birthday)

  return (
    <AppStateProvider value={{ config, model: modeled, update }}>
      <header className="top">
        <div>
          <p className="kicker">
            {config.profile.name}, {age} · {config.profile.location}
          </p>
          <h1>How long you're safe</h1>
          <p className="lede">Check monthly. Not daily.</p>
          <p className="quiet">As of {longDate(config.profile.asOf)}. A local page for the money you already have.</p>
        </div>
        <div className="actions no-print">
          <button type="button" className="button" aria-pressed={theme === 'dark'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button type="button" className="button" onClick={() => downloadConfig(config)}>
            Download config.json
          </button>
        </div>
      </header>
      <main>
        <WorstCase />
        <Runways />
        <Milestone />
        <Scenarios pins={pins} theme={theme} onToggle={togglePin} />
        <Independence pins={pins} />
        <Assumptions source={source} loadNote={loadNote} onReset={resetFile} onDownload={() => downloadConfig(config)} />
        <Triggers />
        <CheckIn theme={theme} />
      </main>
      <footer>
        <p>Figures are in today’s euros. Real return is after inflation. This page does not call the network, and it is not advice.</p>
        <p>Check monthly. Not daily.</p>
      </footer>
    </AppStateProvider>
  )
}
