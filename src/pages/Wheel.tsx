import { Link } from 'react-router-dom'
import { LifeWheel, spokesFrom } from '../components/LifeWheel'
import { Shell } from '../components/Shell'
import { monthKey, todayISO } from '../dates'
import { withMonthly } from '../edit'
import { currentScores, lastMonthOverlay } from '../scoring'
import { useStore } from '../store'

export function WheelPage() {
  const { state, update } = useStore()
  const today = todayISO()
  const month = monthKey(today)
  const scores = currentScores(state, today)
  const overlay = lastMonthOverlay(state, today)

  return (
    <Shell>
      <main className="page">
        <p>
          <Link to="/" className="text-link">
            Overview
          </Link>
        </p>
        <h1>Life wheel</h1>
        <p className="quiet">
          Suggestions come from the last 30 days. A number you choose is stored separately and is what the wheel shows.
          Last month stays as the faint shape, when there is one.
        </p>
        <LifeWheel spokes={spokesFrom(scores, overlay)} />
        <div className="stack">
          {scores.map((area) => (
            <section key={area.id} className="card pad">
              <header>
                <h2>{area.label}</h2>
                <span className="quiet">{area.hint}</span>
              </header>
              <p className="quiet">{area.detail}</p>
              <p>
                Suggested {area.suggested == null ? '—' : area.suggested}
                {area.manual != null ? ` · yours ${area.manual}` : ''}
              </p>
              <div className="choice wrap">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={area.manual === n}
                    className={area.suggested != null && Math.round(area.suggested) === n ? 'hinted' : ''}
                    onClick={() =>
                      update((s) => withMonthly(s, month, { ratings: { [area.id]: area.manual === n ? undefined : n } }))
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
              {area.manual != null && (
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => update((s) => withMonthly(s, month, { ratings: { [area.id]: undefined } }))}
                >
                  Use the suggestion
                </button>
              )}
            </section>
          ))}
        </div>
      </main>
    </Shell>
  )
}
