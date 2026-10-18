import { useApp } from '../app-state'
import { euro, monthsLabel } from '../format'
import { monthLabel } from '../model/finance'
import { MonthField, NumberField, OptionalNumberField } from './Fields'

function outcome(month: string | null, lead: string): string {
  if (!month) return `${lead}, cash lasts through this whole projection.`
  return `${lead}, cash runs out in ${monthLabel(month)}.`
}

export function WorstCase() {
  const { config, model, update } = useApp()
  const worst = model.worst
  const shock = monthLabel(worst.shockMonth)
  const drop = Math.round(worst.drop * 100)

  return (
    <section className="worst" aria-labelledby="worst-title">
      <p className="kicker">Worst realistic case</p>
      <h2 id="worst-title">{outcome(worst.withRules.runsOutMonth, 'With your rules')}</h2>
      <p className="second">{outcome(worst.unchanged.runsOutMonth, 'If nothing changes')}</p>
      <p className="lede">
        Wolt salary and the DoorDash vest stop in {shock}, and invested money falls {drop}% in that
        same month. C-360 continues. Replacement income stays at {euro(config.worstCase.replacementIncomeMonthly)}{' '}
        after {worst.unemploymentMonths} months, until you set a figure.
      </p>
      {worst.sold?.runsOutMonth ? (
        <p>
          If you sell in {monthLabel(worst.decisionMonth)} and rent is {euro(config.sell.rentMonthly ?? 0)}, cash
          runs out in {monthLabel(worst.sold.runsOutMonth)}.
        </p>
      ) : worst.sold ? (
        <p>If you sell in {monthLabel(worst.decisionMonth)} at the rent you entered, cash lasts through this projection.</p>
      ) : (
        <p>Add a rent below to see how selling in {monthLabel(worst.decisionMonth)} changes the date. The sale itself stays a decision.</p>
      )}

      <ol className="steps">
        {worst.steps.map((step) => (
          <li key={step.title}>
            <time dateTime={step.month}>{monthLabel(step.month)}</time>
            <div>
              <strong>{step.title}</strong>
              <p>{step.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="fields tight">
        <MonthField
          label="Shock month"
          value={config.worstCase.shockMonth}
          onChange={(shockMonth) => update((current) => ({ ...current, worstCase: { ...current.worstCase, shockMonth } }))}
        />
        <NumberField
          label="Months without Wolt"
          value={config.worstCase.unemploymentMonths}
          min={1}
          suffix="months"
          onChange={(unemploymentMonths) =>
            update((current) => ({ ...current, worstCase: { ...current.worstCase, unemploymentMonths } }))
          }
        />
        <NumberField
          label="Market drop"
          value={Math.round(config.worstCase.marketDrop * 100)}
          min={0}
          max={100}
          suffix="%"
          onChange={(dropPercent) =>
            update((current) => ({ ...current, worstCase: { ...current.worstCase, marketDrop: dropPercent / 100 } }))
          }
        />
        <NumberField
          label="Freelance while out"
          value={config.worstCase.freelanceMonthly}
          suffix="€ / month"
          hint="Month 1 of the shock. Zero until you have a number."
          onChange={(freelanceMonthly) =>
            update((current) => ({ ...current, worstCase: { ...current.worstCase, freelanceMonthly } }))
          }
        />
        <NumberField
          label="Replacement after that"
          value={config.worstCase.replacementIncomeMonthly}
          suffix="€ / month"
          hint="Left at zero. This path does not assume a new job."
          onChange={(replacementIncomeMonthly) =>
            update((current) => ({ ...current, worstCase: { ...current.worstCase, replacementIncomeMonthly } }))
          }
        />
        <NumberField
          label="Room rent from month 3"
          value={config.room.rentMonthly}
          suffix="€ / month"
          hint="Zero until you set what the room would bring in."
          onChange={(rentMonthly) => update((current) => ({ ...current, room: { ...current.room, rentMonthly } }))}
        />
        <OptionalNumberField
          label="Rent if you sell"
          value={config.sell.rentMonthly}
          placeholder="Set a rent"
          hint={
            config.sell.rentMonthly == null
              ? 'Leave this empty until you know the rent. Zero means a sale with no rent payment.'
              : `Today's sale runway, before the shock, is ${model.runways.sold == null ? 'unset' : monthsLabel(model.runways.sold)}.`
          }
          onChange={(rentMonthly) => update((current) => ({ ...current, sell: { ...current.sell, rentMonthly } }))}
        />
      </div>
    </section>
  )
}
