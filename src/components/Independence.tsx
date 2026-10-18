import { useApp } from '../app-state'
import { euro, percent } from '../format'
import { monthLabel } from '../model/finance'

export function Independence({ pins }: { pins: string[] }) {
  const { config, model } = useApp()
  const { independence } = model
  const shown = independence.rows.filter((row) => pins.includes(row.id))
  const progress = Math.max(0, Math.min(1, independence.progress))

  return (
    <section className="card" aria-labelledby="independence-title">
      <p className="kicker">Independence</p>
      <h2 id="independence-title">{percent(independence.progress, 1)} of {euro(independence.target)}</h2>
      <div className="meter" aria-hidden="true">
        <span style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="quiet">
        Annual spending of {euro(config.independence.annualSpend)} at {percent(config.independence.withdrawalRate, 1)} is a planning convention, not a promise. The target is liquid money, in today’s euros.
      </p>
      <div className="table-wrap">
        <table>
          <caption>When each pinned path reaches the target.</caption>
          <thead>
            <tr>
              <th>Path</th>
              <th>Reached</th>
              <th>Age</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.id}>
                <th>{row.name}</th>
                <td>{row.reached ? monthLabel(row.reached) : 'Not within this projection'}</td>
                <td>{row.age ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details>
        <summary>Every path</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Path</th>
                <th>Reached</th>
                <th>Age</th>
              </tr>
            </thead>
            <tbody>
              {independence.rows.map((row) => (
                <tr key={row.id}>
                  <th>{row.name}</th>
                  <td>{row.reached ? monthLabel(row.reached) : 'Not within this projection'}</td>
                  <td>{row.age ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
