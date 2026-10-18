import { normalizeConfig, type Config } from './model/finance'

const KEY = 'resilience-working-copy-v1'

export function loadWorkingCopy(): Config | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return normalizeConfig(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveWorkingCopy(config: Config): void {
  localStorage.setItem(KEY, JSON.stringify(config))
}

export function clearWorkingCopy(): void {
  localStorage.removeItem(KEY)
}

export function downloadConfig(config: Config): void {
  const blob = new Blob([`${JSON.stringify(config, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'config.json'
  link.click()
  URL.revokeObjectURL(url)
}
