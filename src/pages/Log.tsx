import { Link } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { addDays, mondayOf, monthKey, todayISO } from '../dates'
import { withCareer, withDaily, withMonthly, withWeekly, withoutCareer } from '../edit'
import { currentScores } from '../scoring'
import { useStore } from '../store'
import type { Habit } from '../types'

function uid(): string {
  return crypto.randomUUID()
}

export function LogPage() {
  const { state, update } = useStore()
  const today = todayISO()
  const sunday = new Date().getDay() === 0
  const first = today.endsWith('-01')
  const weekStart = mondayOf(today)
  const week = state.weeklyLogs.find((w) => w.weekStart === weekStart)
  const monthId = monthKey(today)
  const month = state.monthlyLogs.find((m) => m.month === monthId)
  const habits = state.habits.filter((h) => h.active && h.cadence === 'daily').sort((a, b) => a.sort - b.sort)
  const log = state.dailyLogs.find((l) => l.date === today)
  const answered = habits.filter((h) => log?.values[h.id] != null).length
  const scores = currentScores(state, today)
  const steps = state.career.filter((c) => c.date >= weekStart && c.date <= addDays(weekStart, 6))

  return (
    <Shell>
      <main className="page narrow">
        <h1>Today</h1>
        <p className="quiet">
          Answered {answered} of {habits.length}. You can stop whenever.
        </p>
        <div className="log-list">
          {habits.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              value={log?.values[habit.id] ?? null}
              onChange={(value) => update((s) => withDaily(s, today, habit.id, value))}
            />
          ))}
        </div>

        <details className="fold" open={sunday}>
          <summary>This week</summary>
          <div className="log-list">
            <ToggleRow
              label="Reached out to, or saw, a friend or family member?"
              value={week?.reachedOut ?? null}
              onChange={(reachedOut) => update((s) => withWeekly(s, weekStart, { reachedOut }))}
            />
            <ToggleRow
              label="Quality time with your girlfriend?"
              value={week?.qualityTime ?? null}
              onChange={(qualityTime) => update((s) => withWeekly(s, weekStart, { qualityTime }))}
            />
            <div className="log-row">
              <p>Energy</p>
              <div className="choice">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={week?.energy === n}
                    onClick={() => update((s) => withWeekly(s, weekStart, { energy: week?.energy === n ? null : n }))}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <ToggleRow
              label="Work hours felt sustainable?"
              value={week?.workSustainable ?? null}
              onChange={(workSustainable) => update((s) => withWeekly(s, weekStart, { workSustainable }))}
            />
            <div className="log-row">
              <p>A career step</p>
              <StepAdder
                onAdd={(text) =>
                  update((s) => withCareer(s, { id: uid(), date: today, kind: 'other', text }))
                }
              />
              <ul className="plain">
                {steps.map((step) => (
                  <li key={step.id}>
                    {step.text}{' '}
                    <button type="button" className="text-btn" onClick={() => update((s) => withoutCareer(s, step.id))}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>

        <details className="fold" open={first}>
          <summary>This month</summary>
          <div className="log-list">
            <label className="field">
              <span>Liquid balance</span>
              <input
                inputMode="decimal"
                value={month?.liquidBalance ?? ''}
                onChange={(e) => {
                  const raw = e.target.value
                  update((s) => withMonthly(s, monthId, { liquidBalance: raw === '' ? null : Number(raw) }))
                }}
              />
            </label>
            <label className="field">
              <span>Amount saved</span>
              <input
                inputMode="decimal"
                value={month?.amountSaved ?? ''}
                onChange={(e) => {
                  const raw = e.target.value
                  update((s) => withMonthly(s, monthId, { amountSaved: raw === '' ? null : Number(raw) }))
                }}
              />
            </label>
            <p className="quiet">Wheel ratings. A number you tap is yours. The dotted one is the suggestion.</p>
            {scores.map((area) => (
              <div key={area.id} className="log-row">
                <p>
                  {area.label} <span className="quiet">{area.detail}</span>
                </p>
                <div className="choice wrap">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={area.manual === n}
                      className={area.suggested != null && Math.round(area.suggested) === n ? 'hinted' : ''}
                      onClick={() =>
                        update((s) =>
                          withMonthly(s, monthId, {
                            ratings: { [area.id]: area.manual === n ? undefined : n } as never,
                          }),
                        )
                      }
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <Link to="/wheel" className="text-link">
              Open the wheel
            </Link>
          </div>
        </details>

        <p className="page-end">
          <Link to="/" className="btn">
            Done
          </Link>
        </p>
      </main>
    </Shell>
  )
}

function HabitRow({
  habit,
  value,
  onChange,
}: {
  habit: Habit
  value: number | null
  onChange: (value: number | null) => void
}) {
  if (habit.kind === 'boolean') {
    return (
      <div className="log-row">
        <p>{habit.name}</p>
        <div className="choice">
          <button type="button" aria-pressed={value === 1} onClick={() => onChange(value === 1 ? null : 1)}>
            Yes
          </button>
          <button type="button" aria-pressed={value === 0} onClick={() => onChange(value === 0 ? null : 0)}>
            No
          </button>
        </div>
      </div>
    )
  }
  if (habit.kind === 'scale' && habit.max - habit.min <= 6) {
    const options = []
    for (let n = habit.min; n <= habit.max; n += habit.step || 1) options.push(n)
    return (
      <div className="log-row">
        <p>{habit.name}</p>
        <div className="choice">
          {options.map((n) => (
            <button key={n} type="button" aria-pressed={value === n} onClick={() => onChange(value === n ? null : n)}>
              {n}
            </button>
          ))}
        </div>
      </div>
    )
  }
  const step = habit.step || 1
  return (
    <div className="log-row">
        <p>{habit.name}</p>
        <div className="choice">
        {habit.hitOp === 'lte' && (
          <button type="button" aria-pressed={value === habit.hitAt} onClick={() => onChange(value === habit.hitAt ? null : habit.hitAt)}>
            None
          </button>
        )}
        <button
          type="button"
          onClick={() => onChange(value == null ? null : Math.max(habit.min, roundTo(value - step, step)))}
          aria-label="Decrease"
        >
          −
        </button>
        <span className="step-value">
          {value == null ? '—' : value}
          {value != null && habit.unit ? habit.unit : ''}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(habit.max, roundTo((value ?? habit.min - step) + step, step)))}
          aria-label="Increase"
        >
          +
        </button>
      </div>
    </div>
  )
}

function roundTo(n: number, step: number): number {
  const places = step < 1 ? 1 : 0
  const p = 10 ** places
  return Math.round(n * p) / p
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean | null
  onChange: (value: boolean | null) => void
}) {
  return (
    <div className="log-row">
      <p>{label}</p>
      <div className="choice">
        <button type="button" aria-pressed={value === true} onClick={() => onChange(value === true ? null : true)}>
          Yes
        </button>
        <button type="button" aria-pressed={value === false} onClick={() => onChange(value === false ? null : false)}>
          No
        </button>
      </div>
    </div>
  )
}

function StepAdder({ onAdd }: { onAdd: (text: string) => void }) {
  return (
    <form
      className="inline-add"
      onSubmit={(e) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        const text = String(data.get('text') ?? '').trim()
        if (!text) return
        onAdd(text)
        e.currentTarget.reset()
      }}
    >
      <input name="text" placeholder="One concrete step" />
      <button type="submit" className="btn">
        Add
      </button>
    </form>
  )
}
