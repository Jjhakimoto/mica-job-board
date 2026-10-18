import { useMemo } from 'react'
import { useApp } from '../app-state'
import { euro, monthsLabel } from '../format'
import {
  addMonths,
  firstRunOut,
  leaveRule,
  monthLabel,
  monthOf,
  monthTurningAge,
  pointOn,
  type ModeledScenario,
} from '../model/finance'
import { MonthField, NumberField, Segmented, ToggleField } from './Fields'
import { MoneyChart, type ChartSeries } from './MoneyChart'

const FAMILIES = ['Base', 'Job loss', 'Recession', 'Transition', 'Home', 'Abroad', 'Upside, not base', 'Worst case']

const LIGHT = ['#245c45', '#8d6a32', '#35586a']
const DARK = ['#9fceb4', '#e4c48d', '#a9c6d4']

export function Scenarios({
  pins,
  theme,
  onToggle,
}: {
  pins: string[]
  theme: 'light' | 'dark'
  onToggle: (id: string) => void
}) {
  const { config, model, update } = useApp()
  const pinned = pins
    .map((id) => model.scenarios.find((scenario) => scenario.spec.id === id))
    .filter((scenario): scenario is ModeledScenario => Boolean(scenario))
  const palette = theme === 'dark' ? DARK : LIGHT
  const series: ChartSeries[] = pinned.map((scenario, index) => ({
    key: scenario.spec.id,
    name: scenario.spec.name,
    color: palette[index % palette.length],
  }))

  const rows = useMemo(() => {
    if (pinned.length === 0) return []
    return pinned[0].points.map((point, index) => {
      const row: Record<string, string | number | null> = { date: point.date, label: point.label }
      for (const scenario of pinned) row[scenario.spec.id] = scenario.points[index]?.liquid ?? null
      return row
    })
  }, [pinned])

  const worthRows = useMemo(() => {
    if (pinned.length === 0) return []
    return pinned[0].points.map((point, index) => {
      const row: Record<string, string | number | null> = { date: point.date, label: point.label }
      for (const scenario of pinned) row[scenario.spec.id] = scenario.points[index]?.netWorth ?? null
      return row
    })
  }, [pinned])

  const horizons = [5, 10, 20, 30].map((years) => ({
    label: `${years} years`,
    month: addMonths(monthOf(config.profile.asOf), years * 12),
  }))
  const ages = [35, 40, 50, 60].map((age) => ({
    label: `Age ${age}`,
    month: monthTurningAge(config.profile.birthday, age),
  }))
  const columns = [...horizons, ...ages]
  const trial = leaveRule(config, config.transition.trialNet, model.runways.withSide)
  const later = leaveRule(config, config.transition.afterNet, model.runways.withSide)
  const identicalGaps =
    config.jobLoss.freelanceMonthly === 0 &&
    config.jobLoss.replacementIncomeMonthly === 0 &&
    !config.jobLoss.lean

  return (
    <section aria-labelledby="paths-title">
      <div className="section-head">
        <div>
          <h2 id="paths-title">Paths side by side</h2>
          <p className="quiet">Three at a time. Choosing a fourth replaces the oldest. Figures are in today’s euros.</p>
        </div>
        <div className="toolbar">
          <Segmented
            label="Real return"
            value={config.returns.realAnnual}
            options={[
              { value: 0, label: '0%' },
              { value: 0.03, label: '3%' },
              { value: 0.05, label: '5%' },
            ]}
            onChange={(realAnnual) => update((current) => ({ ...current, returns: { ...current.returns, realAnnual } }))}
          />
          <Segmented
            label="Income growth"
            value={config.income.incomeGrowthAnnual}
            options={[
              { value: 0, label: '0%' },
              { value: 0.02, label: '2% / yr' },
            ]}
            onChange={(incomeGrowthAnnual) =>
              update((current) => ({ ...current, income: { ...current.income, incomeGrowthAnnual } }))
            }
          />
          <label className="slider">
            <span>DoorDash price {Math.round(config.income.stockPriceFactor * 100)}%</span>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.05}
              value={Math.min(1.5, Math.max(0.5, config.income.stockPriceFactor))}
              onChange={(event) =>
                update((current) => ({
                  ...current,
                  income: { ...current.income, stockPriceFactor: Number(event.target.value) },
                }))
              }
            />
            <small>A vest is {euro(config.income.equityVestAmount * config.income.stockPriceFactor)} at this price. ±50%.</small>
          </label>
        </div>
      </div>

      {FAMILIES.map((family) => (
        <div key={family} className="family">
          <h3>{family}</h3>
          <div className="chips">
            {model.scenarios
              .filter((scenario) => scenario.spec.family === family)
              .map((scenario) => {
                const pressed = pins.includes(scenario.spec.id)
                const current = scenario.spec.mode === 'savings' && scenario.spec.savingsMonthly === config.expenses.actualCashSavedMonthly
                return (
                  <button
                    key={scenario.spec.id}
                    type="button"
                    className="chip"
                    aria-pressed={pressed}
                    onClick={() => onToggle(scenario.spec.id)}
                  >
                    {scenario.spec.name}
                    {current ? <em> Current</em> : null}
                  </button>
                )
              })}
          </div>
        </div>
      ))}

      <div className="note">
        <p>
          The Insync trial is {euro(config.transition.trialNet)} net for {config.transition.trialMonths} months, then{' '}
          {euro(config.transition.afterNet)} net. Runway with C-360 still coming in is {monthsLabel(model.runways.withSide)}.
          Your rule wants more than {config.triggers.minRunwayToLeaveMonths} months, and at least {euro(config.triggers.minNetToLeave)} net in writing, before you leave Wolt.
        </p>
        <p>
          {trial.offerTooLow
            ? `The trial is below that line.`
            : `The trial meets the ${euro(config.triggers.minNetToLeave)} line.`}{' '}
          {later.offerTooLow
            ? `The later rate is below it too.`
            : `The later rate meets the line.`}{' '}
          {trial.runwayTooShort ? `Runway is inside the ${config.triggers.minRunwayToLeaveMonths} month line.` : `Runway clears ${config.triggers.minRunwayToLeaveMonths} months.`}
        </p>
      </div>

      <div className="fields tight">
        <MonthField
          label="Job loss month"
          value={config.jobLoss.month}
          hint="Used by the 3, 6, 12 and 18 month paths."
          onChange={(month) => update((current) => ({ ...current, jobLoss: { ...current.jobLoss, month } }))}
        />
        <NumberField
          label="Freelance during the gap"
          value={config.jobLoss.freelanceMonthly}
          suffix="€ / month"
          onChange={(freelanceMonthly) =>
            update((current) => ({ ...current, jobLoss: { ...current.jobLoss, freelanceMonthly } }))
          }
        />
        <NumberField
          label="Income after the gap"
          value={config.jobLoss.replacementIncomeMonthly}
          suffix="€ / month"
          hint="Zero means C-360 only, for the rest of the chart."
          onChange={(replacementIncomeMonthly) =>
            update((current) => ({ ...current, jobLoss: { ...current.jobLoss, replacementIncomeMonthly } }))
          }
        />
        <ToggleField
          label="Lean mode during the gap"
          checked={config.jobLoss.lean}
          hint={`Cuts spending to ${euro(config.expenses.leanMonthly)} while the gap lasts.`}
          onChange={(lean) => update((current) => ({ ...current, jobLoss: { ...current.jobLoss, lean } }))}
        />
      </div>
      {identicalGaps ? (
        <p className="quiet">
          With freelance at €0, replacement at €0, and lean mode off, the four job-loss lengths are the same path. Set a freelance amount, a replacement income, or lean mode, and the lengths separate.
        </p>
      ) : null}

      {pinned.length === 0 ? (
        <p>Choose a path to draw.</p>
      ) : (
        <>
          <ul className="legend">
            {series.map((item) => (
              <li key={item.key}>
                <i style={{ background: item.color }} />
                {item.name}
              </li>
            ))}
          </ul>
          <div className="table-wrap">
            <table>
              <caption>Liquid on the first line of each pair, net worth underneath.</caption>
              <thead>
                <tr>
                  <th>Path</th>
                  {columns.map((column) => (
                    <th key={column.label}>
                      {column.label}
                      <small>{monthLabel(column.month)}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pinned.map((scenario) => (
                  <tr key={scenario.spec.id}>
                    <th>
                      {scenario.spec.name}
                      <small>{scenario.spec.detail}</small>
                    </th>
                    {columns.map((column) => {
                      const point = pointOn(scenario.points, column.month)
                      return (
                        <td key={column.label}>
                          {point ? (
                            <>
                              <span>{euro(point.liquid)}</span>
                              <small>{euro(point.netWorth)}</small>
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pinned.map((scenario) => {
            const ran = firstRunOut(scenario.points)
            if (!ran) return null
            return (
              <p key={ran + scenario.spec.id} className="quiet">
                {scenario.spec.name}: cash runs out in {monthLabel(ran)}. After that, liquid stays at zero and the mortgage balance is frozen.
              </p>
            )
          })}
          <h3>Liquid money</h3>
          <MoneyChart rows={rows} series={series} label="Liquid savings over time for the selected paths" />
          <h3>Net worth</h3>
          <p className="quiet">
            Liquid money plus the apartment, minus the mortgage. After a sale it is liquid money only, using the {euro(config.assets.saleProceeds)} proceeds. Savings paths keep their monthly amount when the mortgage steps up. The mortgage step-up path lets the higher payment come out of the surplus.
          </p>
          <MoneyChart rows={worthRows} series={series} label="Net worth over time for the selected paths" />
        </>
      )}
    </section>
  )
}
