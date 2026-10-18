import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BarPane } from '../components/Charts'
import { Shell } from '../components/Shell'
import { addMonthsISO, formatDay, formatMonth, monthKey, todayISO } from '../dates'
import { withCareer, withoutCareer } from '../edit'
import { useStore } from '../store'
import type { CareerKind } from '../types'

function uid(): string {
  return crypto.randomUUID()
}

const KINDS: { id: CareerKind | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'application', label: 'Applications' },
  { id: 'post', label: 'Posts' },
  { id: 'conversation', label: 'Conversations' },
  { id: 'other', label: 'Other' },
]

export function CareerPage() {
  const { state, update } = useStore()
  const [kind, setKind] = useState<CareerKind | 'all'>('all')
  const today = todayISO()
  const entries = [...state.career]
    .filter((c) => kind === 'all' || c.kind === kind)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  const months = Array.from({ length: 12 }, (_, i) => monthKey(addMonthsISO(today, -11 + i)))
  const bars = months.map((month) => ({
    label: formatMonth(month).replace(' 20', ' '),
    value: state.career.filter((c) => c.date.startsWith(month)).length,
  }))

  return (
    <Shell>
      <main className="page">
        <p>
          <Link to="/" className="text-link">
            Overview
          </Link>
        </p>
        <h1>Career</h1>
        <p className="quiet">Concrete steps. The chart is a count, not a grade.</p>
        <BarPane data={bars} />
        <div className="chips">
          {KINDS.map((item) => (
            <button key={item.id} type="button" aria-pressed={kind === item.id} onClick={() => setKind(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        {entries.length === 0 && <p className="quiet">Nothing in this filter yet.</p>}
        <ul className="plain">
          {entries.map((entry) => (
            <li key={entry.id}>
              <span className="quiet">{formatDay(entry.date)} · {entry.kind}</span>
              <div>{entry.text}</div>
              <button type="button" className="text-btn" onClick={() => update((s) => withoutCareer(s, entry.id))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault()
            const data = new FormData(e.currentTarget)
            const text = String(data.get('text') ?? '').trim()
            if (!text) return
            update((s) =>
              withCareer(s, {
                id: uid(),
                date: String(data.get('date') ?? today) || today,
                kind: String(data.get('kind') ?? 'other') as CareerKind,
                text,
              }),
            )
            e.currentTarget.reset()
          }}
        >
          <label className="field">
            <span>What happened</span>
            <input name="text" required placeholder="Sent an application, published a post…" />
          </label>
          <label className="field">
            <span>Kind</span>
            <select name="kind" defaultValue="other">
              <option value="application">Application</option>
              <option value="post">Post</option>
              <option value="conversation">Conversation</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="field">
            <span>Date</span>
            <input name="date" type="date" defaultValue={today} />
          </label>
          <button type="submit" className="btn">
            Add
          </button>
        </form>
      </main>
    </Shell>
  )
}
