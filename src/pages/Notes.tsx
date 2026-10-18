import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { formatDay } from '../dates'
import { withWeekly } from '../edit'
import { useStore } from '../store'

export function NotesPage() {
  const { state, update } = useStore()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const notes = [...state.weeklyLogs]
    .filter((w) => w.wentWell || w.toChange)
    .filter((w) => !q || `${w.wentWell} ${w.toChange}`.toLowerCase().includes(q))
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))

  return (
    <Shell>
      <main className="page narrow">
        <p>
          <Link to="/" className="text-link">
            Overview
          </Link>
        </p>
        <h1>Notes</h1>
        <label className="field">
          <span>Search</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="A word from a week" />
        </label>
        {notes.length === 0 && <p className="quiet">Nothing written yet.</p>}
        <div className="stack">
          {notes.map((week) => (
            <article key={week.weekStart} className="card pad">
              <h2>{formatDay(week.weekStart)}</h2>
              <label className="field">
                <span>Went well</span>
                <textarea
                  rows={2}
                  value={week.wentWell}
                  onChange={(e) => update((s) => withWeekly(s, week.weekStart, { wentWell: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>To change</span>
                <textarea
                  rows={2}
                  value={week.toChange}
                  onChange={(e) => update((s) => withWeekly(s, week.weekStart, { toChange: e.target.value }))}
                />
              </label>
            </article>
          ))}
        </div>
      </main>
    </Shell>
  )
}
