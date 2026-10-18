import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { formatDay, mondayOf, monthKey, todayISO } from '../dates'
import { useStore } from '../store'
import type { AppState } from '../types'

function reminderCopy(state: AppState, now: Date): string | null {
  const today = todayISO(now)
  const minutes = now.getHours() * 60 + now.getMinutes()
  const target = state.settings.reminderHour * 60 + state.settings.reminderMinute
  const habits = state.habits.filter((h) => h.active && h.cadence === 'daily')
  const log = state.dailyLogs.find((l) => l.date === today)
  const answered = habits.filter((h) => log?.values[h.id] != null).length
  if (minutes >= target && answered < habits.length) return 'Evening check-in is open.'
  if (now.getDay() === 0) {
    const week = state.weeklyLogs.find((w) => w.weekStart === mondayOf(today))
    if (!week || week.energy == null) return 'Sunday check-in is open.'
  }
  if (today.endsWith('-01')) {
    const month = state.monthlyLogs.find((m) => m.month === monthKey(today))
    if (month?.liquidBalance == null) return 'Monthly numbers are open.'
  }
  return null
}

export function Shell({ children }: { children: ReactNode }) {
  const { state, update } = useStore()
  const location = useLocation()
  const overview = location.pathname === '/'
  const [banner, setBanner] = useState<string | null>(null)
  const today = todayISO()

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const copy = reminderCopy(state, now)
      setBanner(copy)
      if (!copy || !state.settings.notifications) return
      if (!('Notification' in window) || Notification.permission !== 'granted') return
      const key = `life-notified-${todayISO(now)}`
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
      new Notification('Life', { body: copy, silent: true })
    }
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [state])

  const dark = document.documentElement.dataset.theme === 'dark'

  return (
    <div className={overview ? 'shell shell-overview' : 'shell'}>
      <header className="topbar">
        <Link to="/" className="brand">
          Life
        </Link>
        <span className="top-date">{formatDay(today)}</span>
        <span className="spacer" />
        {state.settings.demoMode && <span className="pill">Demo</span>}
        <button
          type="button"
          className="text-btn"
          onClick={() =>
            update((s) => ({
              ...s,
              settings: { ...s.settings, theme: dark ? 'light' : 'dark' },
            }))
          }
        >
          {dark ? 'Light' : 'Dark'}
        </button>
        <Link to="/settings" className="text-link">
          Settings
        </Link>
        {location.pathname !== '/log' && (
          <Link to="/log" className="btn desktop-log">
            Log today
          </Link>
        )}
      </header>
      {banner && location.pathname !== '/log' && (
        <Link to="/log" className="banner">
          {banner}
        </Link>
      )}
      <div className="shell-body">{children}</div>
      {location.pathname !== '/log' && (
        <Link to="/log" className="fab">
          Log
        </Link>
      )}
    </div>
  )
}
