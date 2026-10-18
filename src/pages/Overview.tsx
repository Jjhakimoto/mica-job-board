import { Link } from 'react-router-dom'
import { Sparkline } from '../components/Charts'
import { LifeWheel, spokesFrom } from '../components/LifeWheel'
import { Shell } from '../components/Shell'
import { addDays, addMonthsISO, formatShort, mondayOf, monthKey, todayISO } from '../dates'
import { withWeekly } from '../edit'
import { eur, formatRunway } from '../money'
import { cellLevel, currentLiquid, currentScores, lastMonthOverlay, weekScore } from '../scoring'
import { baseMonthlySpend, birthdayMilestone, runwaySet, toModel } from '../finance/engine'
import { useStore } from '../store'

export function Overview() {
  const { state, update } = useStore()
  const today = todayISO()
  const weekStart = mondayOf(today)
  const scores = currentScores(state, today)
  const overlay = lastMonthOverlay(state, today)
  const habits = state.habits.filter((h) => h.active && h.cadence === 'daily').sort((a, b) => a.sort - b.sort)
  const days = Array.from({ length: 28 }, (_, i) => addDays(today, -27 + i))
  const score = weekScore(state.habits, state.dailyLogs, today)
  const loggedThisWeek = days.some((d) => {
    if (d < weekStart) return false
    const entry = state.dailyLogs.find((l) => l.date === d)
    return entry != null && Object.values(entry.values).some((v) => v != null)
  })
  const liquid = currentLiquid(state)
  const model = toModel(state.finance, state.triggers, liquid)
  const runways = runwaySet(model)
  const birthday = birthdayMilestone(model, today)
  const month = state.monthlyLogs.find((m) => m.month === monthKey(today))
  const week = state.weeklyLogs.find((w) => w.weekStart === weekStart)
  const weekSteps = state.career
    .filter((c) => c.date >= weekStart && c.date <= addDays(weekStart, 6))
    .sort((a, b) => b.date.localeCompare(a.date))
  const year = today.slice(0, 4)
  const finished = state.books.filter((b) => b.finishedOn?.startsWith(year)).length
  const currentBook = state.books.find((b) => b.finishedOn == null)
  const spark = Array.from({ length: 12 }, (_, i) => {
    const key = monthKey(addMonthsISO(today, -11 + i))
    const entry = state.monthlyLogs.find((m) => m.month === key)
    return { x: key, y: entry?.liquidBalance ?? null }
  })
  const logs = new Map(state.dailyLogs.map((l) => [l.date, l]))

  const mark = (value: boolean | null | undefined) => {
    if (value == null) return '—'
    return value ? '✓' : '✗'
  }

  return (
    <Shell>
      <div className="overview">
        <section className="strip">
          <Link to="/finances" className="stat">
            <span>Runway</span>
            <strong>{formatRunway(runways.allStop)}</strong>
            <em>months if income stops</em>
          </Link>
          <Link to="/finances" className="stat">
            <span>Liquid</span>
            <strong>{eur(liquid)}</strong>
            <em>savings, cash, investments</em>
          </Link>
          <Link to="/log" className="stat">
            <span>This week</span>
            <strong>{loggedThisWeek ? `${score.hit}/${score.possible || 0}` : '—'}</strong>
            <em>habit points, no judgment</em>
          </Link>
          <Link to="/finances#birthday" className="stat">
            <span>Turns 30</span>
            <strong>{Math.max(0, birthday.days)}</strong>
            <em>{birthday.days >= 0 ? 'days to 18 Aug 2027' : 'days since 18 Aug 2027'}</em>
          </Link>
        </section>

        <div className="stage">
          <Link to="/wheel" className="card wheel-card">
            <header>
              <h2>Life wheel</h2>
              <span className="quiet">
                {overlay ? 'Faint shape is last month' : scores.filter((s) => s.score != null).length < 4 ? 'Fills in as you log' : ''}
              </span>
            </header>
            <LifeWheel spokes={spokesFrom(scores, overlay)} />
          </Link>

          <section className="card heat-card">
            <header>
              <h2>28 days</h2>
              <span className="quiet">
                {formatShort(days[0])} – {formatShort(days[days.length - 1])}
              </span>
            </header>
            <div className="heat" style={{ gridTemplateColumns: `72px repeat(${days.length}, minmax(0, 1fr))` }}>
              {habits.flatMap((habit) => [
                <Link key={`${habit.id}-label`} to={`/habit/${habit.id}`} className="heat-label">
                  {habit.name}
                </Link>,
                ...days.map((d) => {
                  const value = logs.get(d)?.values[habit.id]
                  const level = cellLevel(habit, value)
                  return (
                    <Link
                      key={`${habit.id}-${d}`}
                      to={`/habit/${habit.id}`}
                      className="cell"
                      data-level={level}
                      title={`${habit.name} · ${formatShort(d)}${value == null ? '' : ` · ${value}`}`}
                    />
                  )
                }),
              ])}
            </div>
          </section>

          <aside className="tiles">
            <Link to="/finances" className="card tile">
              <h2>Finances</h2>
              <p className="tile-num">{eur(liquid)}</p>
              <p className="quiet">
                {month?.amountSaved == null
                  ? `Saved this month not logged · target ${eur(state.finance.saveTargetMonthly)}`
                  : `${eur(month.amountSaved)} saved · target ${eur(state.finance.saveTargetMonthly)}`}
              </p>
              <Sparkline data={spark} />
            </Link>
            <Link to="/career" className="card tile">
              <h2>Career</h2>
              <p className="tile-num">{weekSteps.length}</p>
              <p className="quiet">{weekSteps[0]?.text ?? 'No step logged this week'}</p>
            </Link>
            <Link to="/relationships" className="card tile">
              <h2>Relationships</h2>
              <p className="marks">
                <span>Friend or family {mark(week?.reachedOut)}</span>
                <span>Girlfriend {mark(week?.qualityTime)}</span>
              </p>
            </Link>
            <Link to="/reading" className="card tile">
              <h2>Reading</h2>
              <p className="tile-num">{finished}</p>
              <p className="quiet">{finished === 1 ? 'book finished this year' : 'books finished this year'}</p>
              <p className="quiet">{currentBook ? currentBook.title : 'No book open'}</p>
            </Link>
          </aside>
        </div>

        <form
          className="week-note"
          onSubmit={(e) => e.preventDefault()}
        >
          <label>
            <span>Went well</span>
            <input
              value={week?.wentWell ?? ''}
              placeholder="A line is enough"
              onChange={(e) => update((s) => withWeekly(s, weekStart, { wentWell: e.target.value }))}
            />
          </label>
          <label>
            <span>To change</span>
            <input
              value={week?.toChange ?? ''}
              placeholder="Optional"
              onChange={(e) => update((s) => withWeekly(s, weekStart, { toChange: e.target.value }))}
            />
          </label>
          <Link to="/notes" className="text-link">
            Notes
          </Link>
        </form>
        <p className="fine">
          Spend used for runway: {eur(baseMonthlySpend(model))}
          {state.finance.expensesIncludeMortgage == null ? ' · mortgage inclusion not confirmed' : ''}
        </p>
      </div>
    </Shell>
  )
}
