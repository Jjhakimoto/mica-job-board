import { useApp } from '../app-state'
import { euro, longDate, monthsLabel } from '../format'
import { monthLabel } from '../model/finance'

export function Runways() {
  const { config, model } = useApp()
  const { runways } = model
  const liquid = euro(config.assets.liquid)
  const proceeds = euro(config.assets.saleProceeds)
  const mortgage = euro(config.mortgage.paymentMonthly)

  return (
    <section aria-labelledby="runway-title">
      <h2 id="runway-title">Runway today</h2>
      <p className="quiet">Liquid money divided by a monthly burn. These are starting points, before any chart.</p>
      <div className="runways">
        <article>
          <h3>If everything stops</h3>
          <strong>{monthsLabel(runways.stopped)}</strong>
          <p>
            {liquid} ÷ {euro(runways.stoppedBurn)}. Wolt, the vest, and C-360 all stop.
          </p>
        </article>
        <article>
          <h3>If C-360 continues</h3>
          <strong>{monthsLabel(runways.withSide)}</strong>
          <p>
            {liquid} ÷ {euro(runways.withSideBurn)}. Side work stays. Wolt and the vest stop.
          </p>
        </article>
        <article>
          <h3>Lean mode and C-360</h3>
          <strong>{monthsLabel(runways.lean)}</strong>
          <p>
            {liquid} ÷ {euro(runways.leanBurn)}. Lean is {euro(config.expenses.leanMonthly)}, and that still includes the {mortgage} mortgage.
          </p>
        </article>
        <article>
          <h3>If you sell</h3>
          {runways.sold == null || runways.soldBurn == null ? (
            <>
              <strong>Needs a rent</strong>
              <p>
                Proceeds are {proceeds}. The burn is spending minus the {mortgage} mortgage, plus rent. Set the rent on the card above.
              </p>
            </>
          ) : (
            <>
              <strong>{monthsLabel(runways.sold)}</strong>
              <p>
                ({liquid} + {proceeds}) ÷ {euro(runways.soldBurn)}. Mortgage out, rent in. C-360 is not in this one.
              </p>
            </>
          )}
        </article>
      </div>
    </section>
  )
}

export function Milestone() {
  const { config, model } = useApp()
  const { milestone, gap } = model
  const when = longDate(config.milestone.date)
  const gapText =
    Math.abs(gap.gap) < 0.5
      ? 'No gap. Wolt, C-360, Malta spending, and the cash you save all agree.'
      : gap.gap > 0
        ? `${euro(gap.gap)} of cash is outside the savings figure. Spending may be higher, or this money is somewhere the savings line does not count.`
        : `The savings figure is ${euro(Math.abs(gap.gap))} above Wolt plus C-360 minus spending. One of those three numbers is off.`

  return (
    <div className="pair">
      <section className="card" aria-labelledby="milestone-title">
        <p className="kicker">18 Aug 2027</p>
        <h2 id="milestone-title">€30,000 liquid</h2>
        <p className="figure">{euro(milestone.liquid)}</p>
        <p>
          <span className={milestone.onTrack ? 'pill good' : 'pill watch'}>{milestone.onTrack ? 'On track' : 'Short'}</span>
          {milestone.onTrack
            ? ` On track for ${euro(milestone.target)} in ${monthLabel(milestone.month)}.`
            : ` Short by ${euro(milestone.shortfall)} for ${euro(milestone.target)} on ${when}.`}
        </p>
        <p>
          {milestone.stretchOnTrack
            ? `Also on track for ${euro(milestone.stretch)}.`
            : `The ${euro(milestone.stretch)} line is still ahead.`}
        </p>
        <p className="quiet">
          This uses saving {euro(milestone.savingsMonthly)} a month plus the vest, at the real return selected below. You turn 30 on {when}.
        </p>
      </section>
      <section className="card" aria-labelledby="gap-title">
        <p className="kicker">Cash gap</p>
        <h2 id="gap-title">{Math.abs(gap.gap) < 0.5 ? '€0' : euro(gap.gap)}</h2>
        <p>{gapText}</p>
        <p className="quiet">
          {euro(gap.cashIncome)} in from Wolt and C-360, minus {euro(gap.expenses)} spending, minus {euro(gap.actual)} saved.
          The vest adds about {euro(gap.vestAverage)} a month on top, and only while you stay at Wolt.
        </p>
        {Math.abs(gap.gap) < 0.5 && config.expenses.maltaMonthly === 1700 && config.expenses.actualCashSavedMonthly === 800 ? (
          <p className="quiet">
            An earlier guess put spending at €1,500 and the surplus near €1,250. About €200 of that was spending that belongs in the €1,700. The rest was the DoorDash vest, which sits outside the €800.
          </p>
        ) : null}
      </section>
    </div>
  )
}
