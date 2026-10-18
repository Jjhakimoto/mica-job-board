import { useMemo, useState, type FormEvent } from 'react'
import { useApp } from '../app-state'
import { euro } from '../format'
import { monthLabel, monthOf } from '../model/finance'
import { MoneyChart } from './MoneyChart'

export function CheckIn({ theme }: { theme: 'light' | 'dark' }) {
  const { config, model, update } = useApp()
  const [month, setMonth] = useState('2026-11')
  const [liquid, setLiquid] = useState('')
  const [note, setNote] = useState('')
  const planColor = theme === 'dark' ? '#9fceb4' : '#245c45'
  const actualColor = theme === 'dark' ? '#e4c48d' : '#8d6a32'

  const rows = useMemo(() => {
    const opening = monthOf(config.profile.asOf)
    const actual = new Map(config.checkIns.map((item) => [item.month, item.liquid]))
    const list: Record<string, string | number | null>[] = [
      {
        date: opening,
        label: monthLabel(opening),
        plan: config.assets.liquid,
        actual: actual.has(opening) ? actual.get(opening)! : null,
      },
    ]
    for (const point of model.plan.slice(0, 36)) {
      list.push({
        date: point.date,
        label: point.label,
        plan: point.liquid,
        actual: actual.has(point.date) ? actual.get(point.date)! : null,
      })
    }
    return list
  }, [config, model.plan])

  function add(event: FormEvent) {
    event.preventDefault()
    const amount = Number(liquid)
    if (!/^\d{4}-\d{2}$/.test(month) || !Number.isFinite(amount)) return
    update((current) => {
      const others = current.checkIns.filter((item) => item.month !== month)
      const checkIns = [...others, { month, liquid: amount, note }].sort((a, b) => a.month.localeCompare(b.month))
      return { ...current, checkIns }
    })
    setLiquid('')
    setNote('')
  }

  function remove(target: string) {
    update((current) => ({ ...current, checkIns: current.checkIns.filter((item) => item.month !== target) }))
  }

  return (
    <section className="card" aria-labelledby="checkin-title">
      <p className="kicker">Once a month</p>
      <h2 id="checkin-title">Check monthly. Not daily.</h2>
      <p className="quiet">
        Enter the liquid balance you actually have. The line is the plan: saving {euro(config.expenses.actualCashSavedMonthly)} plus the vest, at the selected real return.
      </p>
      <form className="fields" onSubmit={add}>
        <label className="field">
          <span>Month</span>
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} required />
        </label>
        <label className="field">
          <span>Liquid balance</span>
          <input
            type="number"
            inputMode="decimal"
            value={liquid}
            onChange={(event) => setLiquid(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Note</span>
          <input type="text" value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <div className="field action-field">
          <span>Save</span>
          <button type="submit" className="button primary">
            Add check-in
          </button>
        </div>
      </form>
      <MoneyChart
        rows={rows}
        series={[
          { key: 'plan', name: 'Plan', color: planColor },
          { key: 'actual', name: 'Actual', color: actualColor, dots: true },
        ]}
        label="Actual liquid balance against the plan for the next three years"
      />
      <ul className="log">
        {config.checkIns.map((item) => (
          <li key={item.month}>
            <time dateTime={item.month}>{monthLabel(item.month)}</time>
            <strong>{euro(item.liquid)}</strong>
            <span>{item.note}</span>
            <button type="button" className="text-button" onClick={() => remove(item.month)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
