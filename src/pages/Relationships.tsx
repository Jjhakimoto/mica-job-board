import { Link } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { formatDay, todayISO } from '../dates'
import { withPerson, withoutPerson } from '../edit'
import { useStore } from '../store'

function uid(): string {
  return crypto.randomUUID()
}

function mark(value: boolean | null): string {
  if (value == null) return '—'
  return value ? '✓' : '✗'
}

export function RelationshipsPage() {
  const { state, update } = useStore()
  const today = todayISO()
  const weeks = [...state.weeklyLogs].sort((a, b) => b.weekStart.localeCompare(a.weekStart))
  const people = [...state.people].sort((a, b) => (a.lastContacted ?? '').localeCompare(b.lastContacted ?? ''))

  return (
    <Shell>
      <main className="page">
        <p>
          <Link to="/" className="text-link">
            Overview
          </Link>
        </p>
        <h1>Relationships</h1>
        <h2>Sundays</h2>
        {weeks.length === 0 && <p className="quiet">Weekly answers will collect here.</p>}
        <ul className="plain">
          {weeks.map((week) => (
            <li key={week.weekStart}>
              <span>{formatDay(week.weekStart)}</span>
              <span> Friend or family {mark(week.reachedOut)}</span>
              <span> Girlfriend {mark(week.qualityTime)}</span>
            </li>
          ))}
        </ul>

        <h2>People</h2>
        <p className="quiet">Sorted by longest since contact.</p>
        {people.length === 0 && <p className="quiet">Add someone you want to keep in view.</p>}
        <ul className="plain">
          {people.map((person) => (
            <li key={person.id}>
              <strong>{person.name}</strong>
              <span className="quiet">
                {' '}
                {person.lastContacted ? formatDay(person.lastContacted) : 'No date yet'}
                {person.note ? ` · ${person.note}` : ''}
              </span>
              <span className="row-actions">
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => update((s) => withPerson(s, { ...person, lastContacted: today }))}
                >
                  Spoke today
                </button>
                <button type="button" className="text-btn" onClick={() => update((s) => withoutPerson(s, person.id))}>
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault()
            const data = new FormData(e.currentTarget)
            const name = String(data.get('name') ?? '').trim()
            if (!name) return
            update((s) =>
              withPerson(s, {
                id: uid(),
                name,
                note: String(data.get('note') ?? '').trim(),
                lastContacted: String(data.get('last') ?? '') || null,
              }),
            )
            e.currentTarget.reset()
          }}
        >
          <label className="field">
            <span>Name</span>
            <input name="name" required />
          </label>
          <label className="field">
            <span>Last contact</span>
            <input name="last" type="date" />
          </label>
          <label className="field">
            <span>Note</span>
            <input name="note" />
          </label>
          <button type="submit" className="btn">
            Add
          </button>
        </form>
      </main>
    </Shell>
  )
}
