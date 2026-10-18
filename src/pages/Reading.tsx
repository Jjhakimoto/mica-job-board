import { Link } from 'react-router-dom'
import { BarPane } from '../components/Charts'
import { Shell } from '../components/Shell'
import { formatDay, quarterIndex, todayISO } from '../dates'
import { withBook, withoutBook } from '../edit'
import { useStore } from '../store'

function uid(): string {
  return crypto.randomUUID()
}

export function ReadingPage() {
  const { state, update } = useStore()
  const year = todayISO().slice(0, 4)
  const finished = state.books
    .filter((b) => b.finishedOn?.startsWith(year))
    .sort((a, b) => (b.finishedOn ?? '').localeCompare(a.finishedOn ?? ''))
  const current = state.books.filter((b) => b.finishedOn == null)
  const quarters = [1, 2, 3, 4].map((q) => ({
    label: `Q${q}`,
    value: finished.filter((b) => b.finishedOn && quarterIndex(b.finishedOn) === q).length,
  }))

  return (
    <Shell>
      <main className="page">
        <p>
          <Link to="/" className="text-link">
            Overview
          </Link>
        </p>
        <h1>Reading</h1>
        <p className="quiet">{finished.length} finished in {year}.</p>
        <BarPane data={quarters} />

        <h2>Open</h2>
        {current.length === 0 && <p className="quiet">No book open.</p>}
        <ul className="plain">
          {current.map((book) => (
            <li key={book.id}>
              <strong>{book.title}</strong> · {book.author || 'Author not set'}
              <span className="row-actions">
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => update((s) => withBook(s, { ...book, finishedOn: todayISO() }))}
                >
                  Finished today
                </button>
                <button type="button" className="text-btn" onClick={() => update((s) => withoutBook(s, book.id))}>
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>

        <h2>Finished</h2>
        {finished.length === 0 && <p className="quiet">The list starts when you finish one.</p>}
        <ul className="plain">
          {finished.map((book) => (
            <li key={book.id}>
              <strong>{book.title}</strong> · {book.author || 'Author not set'}
              {book.finishedOn ? ` · ${formatDay(book.finishedOn)}` : ''}
              <button type="button" className="text-btn" onClick={() => update((s) => withoutBook(s, book.id))}>
                Remove
              </button>
            </li>
          ))}
        </ul>

        <h2>Add a book</h2>
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault()
            const data = new FormData(e.currentTarget)
            const title = String(data.get('title') ?? '').trim()
            if (!title) return
            const author = String(data.get('author') ?? '').trim()
            const finishedOn = String(data.get('finishedOn') ?? '')
            update((s) => withBook(s, { id: uid(), title, author, finishedOn: finishedOn || null }))
            e.currentTarget.reset()
          }}
        >
          <label className="field">
            <span>Title</span>
            <input name="title" required />
          </label>
          <label className="field">
            <span>Author</span>
            <input name="author" />
          </label>
          <label className="field">
            <span>Finished on</span>
            <input name="finishedOn" type="date" />
            <small>Leave empty if you're still reading it.</small>
          </label>
          <button type="submit" className="btn">
            Add
          </button>
        </form>
      </main>
    </Shell>
  )
}
