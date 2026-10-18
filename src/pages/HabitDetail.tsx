import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LinePane } from '../components/Charts'
import { Shell } from '../components/Shell'
import { addDays, eachDate, formatShort, mondayOf, todayISO } from '../dates'
import { cellLevel, correlateDaily, correlateWithEnergy, correlationPhrase, weeklyHitRates } from '../scoring'
import { streaks } from '../streaks'
import { useStore } from '../store'
import type { Habit } from '../types'

export function HabitDetail() {
  const { id } = useParams()
  const { state, update } = useStore()
  const habit = state.habits.find((h) => h.id === id)
  const today = todayISO()
  const others = state.habits.filter((h) => h.active && h.id !== id)
  const preset = id === 'nicotine' || id === 'diet' ? 'energy' : id === 'sleep' ? 'exercise' : 'sleep'
  const [other, setOther] = useState(preset)

  const run = useMemo(() => (habit ? streaks(habit, state.dailyLogs, today) : { current: 0, best: 0 }), [habit, state.dailyLogs, today])
  if (!habit) {
    return (
      <Shell>
        <main className="page">
          <p>That habit isn't here.</p>
          <Link to="/">Back</Link>
        </main>
      </Shell>
    )
  }

  const rates = weeklyHitRates(habit, state.dailyLogs, today)
  const chart = rates.map((r) => ({ label: formatShort(r.week), rate: r.rate == null ? null : Math.round(r.rate * 100) }))
  const partner = others.find((h) => h.id === other)
  const correlation =
    other === 'energy'
      ? correlateWithEnergy(habit, state.dailyLogs, state.weeklyLogs)
      : partner
        ? correlateDaily(habit, partner, state.dailyLogs, today)
        : { r: null, n: 0 }
  const partnerName = other === 'energy' ? 'energy' : partner?.name ?? 'that'

  const start = addDays(mondayOf(today), -52 * 7)
  const weeks: string[][] = []
  let cursor = start
  while (cursor <= today) {
    weeks.push(eachDate(cursor, addDays(cursor, 6)))
    cursor = addDays(cursor, 7)
  }
  const logs = new Map(state.dailyLogs.map((l) => [l.date, l]))

  const patch = (partial: Partial<Habit>) =>
    update((s) => ({ ...s, habits: s.habits.map((h) => (h.id === habit.id ? { ...h, ...partial } : h)) }))

  return (
    <Shell>
      <main className="page">
        <p>
          <Link to="/" className="text-link">
            Overview
          </Link>
        </p>
        <h1>{habit.name}</h1>
        <p className="quiet streak">
          {run.current > 0
            ? `${run.current} in a row · longest ${run.best}`
            : run.best > 0
              ? `Longest run ${run.best} days`
              : 'Runs show up once days connect'}
        </p>

        <section>
          <h2>This year</h2>
          <div className="year-heat" aria-label="Year of days">
            {weeks.flatMap((week) =>
              week.map((day) => {
                const value = day > today ? undefined : logs.get(day)?.values[habit.id]
                const level = day > today ? 0 : cellLevel(habit, value)
                return <span key={day} className="cell" data-level={day > today ? undefined : level} title={`${formatShort(day)}${value == null ? '' : ` · ${value}`}`} />
              }),
            )}
          </div>
          <p className="quiet">Hollow means not logged. Colour is only how full the day was.</p>
        </section>

        <section>
          <h2>Week by week</h2>
          <p className="quiet">Share of the days you logged that met the target. A week you didn't open is left blank.</p>
          <LinePane data={chart} lines={[{ key: 'rate', name: '%' }]} />
        </section>

        <section>
          <h2>Alongside something else</h2>
          <label className="field">
            <span>Compare with</span>
            <select value={other} onChange={(e) => setOther(e.target.value)}>
              <option value="energy">Energy (weekly)</option>
              {others.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
          <p>
            {habit.name} and {partnerName}: {correlationPhrase(correlation.r, correlation.n)}
          </p>
        </section>

        <section>
          <h2>Target</h2>
          <div className="form-grid">
            <label className="field">
              <span>Name</span>
              <input value={habit.name} onChange={(e) => patch({ name: e.target.value })} />
            </label>
            <label className="field">
              <span>Hits per week for a full score</span>
              <input
                inputMode="decimal"
                value={habit.targetPerWeek}
                onChange={(e) => patch({ targetPerWeek: Number(e.target.value) || 0 })}
              />
            </label>
            <label className="field">
              <span>Counts when</span>
              <span className="split">
                <select value={habit.hitOp} onChange={(e) => patch({ hitOp: e.target.value as Habit['hitOp'] })}>
                  <option value="gte">at least</option>
                  <option value="lte">at most</option>
                  <option value="eq">exactly</option>
                </select>
                <input inputMode="decimal" value={habit.hitAt} onChange={(e) => patch({ hitAt: Number(e.target.value) })} />
              </span>
            </label>
            <label className="check">
              <input type="checkbox" checked={habit.inWeekScore} onChange={(e) => patch({ inWeekScore: e.target.checked })} />
              Counts toward the weekly total
            </label>
          </div>
        </section>
      </main>
    </Shell>
  )
}
