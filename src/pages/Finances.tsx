import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LinePane } from '../components/Charts'
import { Field, NumberInput } from '../components/Fields'
import { Shell } from '../components/Shell'
import { formatMonth, todayISO } from '../dates'
import { withMonthly } from '../edit'
import {
  abroadPath,
  birthdayMilestone,
  insyncPath,
  jobLossPath,
  offerClearsRule,
  roomPath,
  runwaySet,
  salePath,
  savingsTable,
  steadyPath,
  stepUpPath,
  theoreticalSurplus,
  toModel,
  upsidePath,
  worstRealistic,
  yearlyPoints,
  planSeries,
  baseMonthlySpend,
  independenceOutlook,
} from '../finance/engine'
import { eur, formatRunway } from '../money'
import { currentLiquid } from '../scoring'
import { useStore } from '../store'
import type { FinanceConfig } from '../types'

const RATES = [500, 800, 1000, 1250]
const YEARS = [5, 10, 20, 30]
const GAPS = [3, 6, 12, 18]

export function FinancesPage() {
  const { state, update } = useStore()
  const today = todayISO()
  const liquid = currentLiquid(state)
  const model = useMemo(
    () => toModel(state.finance, state.triggers, liquid),
    [state.finance, state.triggers, liquid],
  )
  const [gap, setGap] = useState(6)
  const [lean, setLean] = useState(false)
  const [offer, setOffer] = useState('2500')
  const [inWriting, setInWriting] = useState(false)

  const worst = worstRealistic(model, today)
  const runways = runwaySet(model)
  const surplus = theoreticalSurplus(model)
  const birthday = birthdayMilestone(model, today)
  const freedom = independenceOutlook(model, today)
  const table = savingsTable(model, today, RATES, YEARS)
  const savingsChart = useMemo(() => {
    const paths = RATES.map((rate) => ({ rate, points: yearlyPoints(steadyPath(model, today, rate, 30 * 12)) }))
    return paths[0].points.map((point, index) => {
      const row: Record<string, string | number> = { label: point.month % 60 === 0 ? String(point.month / 12) : '' }
      for (const path of paths) row[`s${path.rate}`] = Math.round(path.points[index].liquid)
      return row
    })
  }, [model, today])

  const lossChart = useMemo(() => {
    const plain = jobLossPath(model, today, { gapMonths: gap, lean, crash: 0, horizon: 120 })
    const crashed = jobLossPath(model, today, { gapMonths: gap, lean, crash: -0.3, horizon: 120 })
    return plain.filter((p) => p.month % 6 === 0).map((p) => ({
      label: p.month % 12 === 0 ? `${p.month / 12}y` : '',
      kept: Math.round(p.liquid),
      crash: Math.round(crashed[p.month].liquid),
    }))
  }, [model, today, gap, lean])

  const plan = planSeries(
    state.monthlyLogs
      .filter((m) => m.liquidBalance != null)
      .map((m) => ({ month: m.month, liquid: m.liquidBalance as number })),
    state.finance.saveTargetMonthly,
  )
  const planChart = plan.map((row) => ({
    label: formatMonth(row.month).replace(' 20', ' '),
    actual: row.actual,
    plan: Math.round(row.plan),
  }))

  const patch = (partial: Partial<FinanceConfig>) =>
    update((s) => ({ ...s, finance: { ...s.finance, ...partial } }))
  const patchTrigger = (partial: Partial<typeof state.triggers>) =>
    update((s) => ({ ...s, triggers: { ...s.triggers, ...partial } }))

  const offerNet = Number(offer)
  const offerOk = Number.isFinite(offerNet) && offerClearsRule(offerNet, inWriting, runways.allStop, model)

  return (
    <Shell>
      <main className="page">
        <p>
          <Link to="/" className="text-link">
            Overview
          </Link>
        </p>
        <h1>Finances</h1>
        <p className="quiet">Your arithmetic, kept conservative. Figures are in today’s euros. Not advice.</p>

        <section className="card pad worst">
          <h2>Worst realistic case</h2>
          <p className="lead">
            {worst.runsOutDate
              ? `If Wolt and the equity stopped, the balance reaches zero in ${formatMonth(worst.runsOutDate)}.`
              : 'If Wolt and the equity stopped, the balance does not reach zero inside three years, on these rules.'}
          </p>
          <ul className="plain">
            {worst.events.map((event) => (
              <li key={event.id}>{event.detail}</li>
            ))}
          </ul>
          <p className="quiet">
            C-360 continues. This card uses no market return. A fallback without a number is named and left out.
          </p>
        </section>

        <section className="runway-grid">
          <article>
            <span>All income stops</span>
            <strong>{formatRunway(runways.allStop)}</strong>
          </article>
          <article>
            <span>With C-360</span>
            <strong>{formatRunway(runways.withC360)}</strong>
          </article>
          <article>
            <span>Lean mode</span>
            <strong>{formatRunway(runways.lean)}</strong>
          </article>
          <article>
            <span>With apartment sale</span>
            <strong>{formatRunway(runways.withSale)}</strong>
          </article>
        </section>
        <p className="quiet">
          Sale adds {eur(state.finance.saleNet)} and keeps monthly spend at {eur(baseMonthlySpend(model))}. Set a rent below if housing would change.
          {state.finance.expensesIncludeMortgage == null
            ? ' €1,500 is treated as the whole monthly spend until you confirm the mortgage.'
            : ''}
        </p>

        <section>
          <h2>The gap</h2>
          <p>
            Income on file is {eur(Math.round(surplus.income))} a month, including about {eur(Math.round(surplus.doordash))} from DoorDash.
            Against {eur(Math.round(surplus.expenses))} of spend, the surplus is {eur(Math.round(surplus.surplus))}. Logged saving is {eur(Math.round(surplus.actual))}.
          </p>
          <p>
            {surplus.gap >= 0
              ? `${eur(Math.round(surplus.gap))} is not explained by these figures. It is just the difference, not a verdict.`
              : `Logged saving is ${eur(Math.round(-surplus.gap))} above the surplus these figures imply.`}
          </p>
          <div className="chips">
            <span className="quiet">Does €{state.finance.expensesMalta} include the mortgage?</span>
            <button type="button" aria-pressed={state.finance.expensesIncludeMortgage == null} onClick={() => patch({ expensesIncludeMortgage: null })}>
              Not sure
            </button>
            <button type="button" aria-pressed={state.finance.expensesIncludeMortgage === true} onClick={() => patch({ expensesIncludeMortgage: true })}>
              Included
            </button>
            <button type="button" aria-pressed={state.finance.expensesIncludeMortgage === false} onClick={() => patch({ expensesIncludeMortgage: false })}>
              On top
            </button>
          </div>
          <p className="quiet">
            Paper equity is {eur(state.finance.apartmentValue - state.finance.mortgageBalance)}. The plan uses {eur(state.finance.saleNet)} if sold.
          </p>
        </section>

        <section id="birthday">
          <h2>18 Aug 2027</h2>
          <p>
            {birthday.days >= 0 ? `${birthday.days} days from today.` : `${Math.abs(birthday.days)} days ago.`} Projected liquid {eur(Math.round(birthday.projected))}.
          </p>
          <p>
            {birthday.onTrack
              ? `€${Math.round(state.finance.liquidGoal / 1000)}k is in view at the current saving rate.`
              : `The €${Math.round(state.finance.liquidGoal / 1000)}k mark needs about ${eur(Math.round(birthday.neededMonthly))} a month from here, at the return selected below. The current figure is ${eur(state.finance.actualSavingMonthly)}.`}
            {birthday.idealOnTrack ? ` €${Math.round(state.finance.liquidGoalIdeal / 1000)}k is in view too.` : ` €${Math.round(state.finance.liquidGoalIdeal / 1000)}k is the further mark.`}
          </p>
          <h2>Independence</h2>
          <p>
            {eur(state.finance.independenceSpendYear)} a year at {Math.round(state.finance.withdrawalRate * 100)}% is {eur(Math.round(freedom.target))}.
            Liquid is {Math.round(freedom.progress * 100)}% of that.
          </p>
          <p>
            {freedom.hit
              ? `At the current saving rate, liquid reaches it around ${formatMonth(freedom.hit.date)}, age ${freedom.age}.`
              : 'At the current saving rate it does not land inside 40 years. The longer table below is the place to look.'}
          </p>
          <div className="meter" aria-hidden="true">
            <span style={{ width: `${Math.min(100, freedom.progress * 100)}%` }} />
          </div>
        </section>

        <section>
          <h2>Assumptions for the charts</h2>
          <div className="chips">
            {[0, 0.03, 0.05].map((rate) => (
              <button key={rate} type="button" aria-pressed={state.finance.realReturn === rate} onClick={() => patch({ realReturn: rate })}>
                {Math.round(rate * 100)}% real
              </button>
            ))}
            <button type="button" aria-pressed={state.finance.incomeGrowth === 0} onClick={() => patch({ incomeGrowth: 0 })}>
              0% pay growth
            </button>
            <button type="button" aria-pressed={state.finance.incomeGrowth === 0.02} onClick={() => patch({ incomeGrowth: 0.02 })}>
              2% pay growth
            </button>
            <button type="button" aria-pressed={state.finance.marketCrash === -0.3} onClick={() => patch({ marketCrash: state.finance.marketCrash === -0.3 ? 0 : -0.3 })}>
              −30% at the start
            </button>
            {([-0.5, 0, 0.5] as const).map((shock) => (
              <button key={shock} type="button" aria-pressed={state.finance.doordashPriceShock === shock} onClick={() => patch({ doordashPriceShock: shock })}>
                DoorDash {shock === 0 ? 'mid' : shock > 0 ? '+50%' : '−50%'}
              </button>
            ))}
          </div>
          <p className="quiet">Pay growth changes earned-income scenarios. The savings grid uses the amount in the row, with no extra increases. DoorDash ±50% is single-stock price risk, separate from a market crash.</p>
        </section>

        <section>
          <h2>Saving, side by side</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>A month</th>
                  {YEARS.map((y) => (
                    <th key={y}>{y} years</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.map((row) => (
                  <tr key={row.rate}>
                    <td>{eur(row.rate)}</td>
                    {YEARS.map((y) => (
                      <td key={y}>{eur(Math.round(row.byYear[y]))}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <LinePane
            data={savingsChart}
            lines={RATES.map((rate, i) => ({
              key: `s${rate}`,
              name: eur(rate),
              color: ['var(--accent)', 'var(--accent-2)', 'var(--ink)', 'var(--muted)'][i],
            }))}
          />
        </section>

        <section>
          <h2>Job loss</h2>
          <p className="quiet">Wolt and equity stop for the gap, then the current saving rate resumes. C-360 continues. Freelance uses the slider in the rules.</p>
          <div className="chips">
            {GAPS.map((months) => (
              <button key={months} type="button" aria-pressed={gap === months} onClick={() => setGap(months)}>
                {months} months
              </button>
            ))}
            <button type="button" aria-pressed={lean} onClick={() => setLean((v) => !v)}>
              Lean at {eur(state.finance.leanExpenses)}
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Gap</th>
                  <th>Liquid after 5 years</th>
                  <th>Same, with a 30% crash</th>
                </tr>
              </thead>
              <tbody>
                {GAPS.map((months) => {
                  const plain = jobLossPath(model, today, { gapMonths: months, lean, crash: 0, horizon: 60 })
                  const crashed = jobLossPath(model, today, { gapMonths: months, lean, crash: -0.3, horizon: 60 })
                  return (
                    <tr key={months}>
                      <td>{months} months</td>
                      <td>{eur(Math.round(plain[60].liquid))}</td>
                      <td>{eur(Math.round(crashed[60].liquid))}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <LinePane
            data={lossChart}
            lines={[
              { key: 'kept', name: 'Job loss' },
              { key: 'crash', name: 'Job loss and −30%', color: 'var(--accent-2)' },
            ]}
          />
        </section>

        <ScenarioBlocks model={model} today={today} />

        <section>
          <h2>Actual and plan</h2>
          {planChart.length === 0 ? (
            <p className="quiet">When you log a balance, this compares it with {eur(state.finance.saveTargetMonthly)} a month from that first entry.</p>
          ) : (
            <LinePane
              data={planChart}
              lines={[
                { key: 'actual', name: 'Logged' },
                { key: 'plan', name: 'Plan', dashed: true, color: 'var(--muted)' },
              ]}
            />
          )}
          <MonthEditor />
        </section>

        <section>
          <h2>Rules you wrote down</h2>
          <div className="form-grid">
            <Field label="Lean mode when runway is under (months)">
              <NumberInput value={state.triggers.leanRunwayMonths} onChange={(n) => n != null && patchTrigger({ leanRunwayMonths: n })} />
            </Field>
            <Field label="Freelance from month" hint="Counted only if the monthly amount below is above zero.">
              <NumberInput value={state.triggers.jobLossFreelanceMonth} onChange={(n) => n != null && patchTrigger({ jobLossFreelanceMonth: n })} />
            </Field>
            <Field label="Freelance, € / month">
              <NumberInput value={state.finance.freelanceMonthly} onChange={(n) => n != null && patch({ freelanceMonthly: n })} />
            </Field>
            <Field label="Extra C-360, € / month" hint="Leave empty to leave it out.">
              <NumberInput allowEmpty value={state.finance.c360ExtraMonthly} onChange={(n) => patch({ c360ExtraMonthly: n })} />
            </Field>
            <Field label="Rent the room from month">
              <NumberInput value={state.triggers.jobLossRoomMonth} onChange={(n) => n != null && patchTrigger({ jobLossRoomMonth: n })} />
            </Field>
            <Field label="Room rent, € / month">
              <NumberInput allowEmpty value={state.finance.roomRentMonthly} onChange={(n) => patch({ roomRentMonthly: n })} />
            </Field>
            <Field label="Decide on selling from month">
              <NumberInput value={state.triggers.jobLossSaleDecisionMonth} onChange={(n) => n != null && patchTrigger({ jobLossSaleDecisionMonth: n })} />
            </Field>
            <Field label="Rent after a sale, € / month">
              <NumberInput allowEmpty value={state.finance.rentAfterSaleMonthly} onChange={(n) => patch({ rentAfterSaleMonthly: n })} />
            </Field>
            <Field label="Don't leave Wolt below net €">
              <NumberInput value={state.triggers.minOfferNetToLeaveWolt} onChange={(n) => n != null && patchTrigger({ minOfferNetToLeaveWolt: n })} />
            </Field>
            <Field label="Unless runway is above (months) and the offer is in writing">
              <NumberInput value={state.triggers.minRunwayMonthsToLeaveWolt} onChange={(n) => n != null && patchTrigger({ minRunwayMonthsToLeaveWolt: n })} />
            </Field>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={state.triggers.sellEquityOnVest}
              onChange={(e) => patchTrigger({ sellEquityOnVest: e.target.checked })}
            />
            Sell DoorDash equity on vest into a broad ETF
          </label>
          <p className="quiet">
            {state.triggers.sellEquityOnVest
              ? 'Until a vest is sold, the ±50% switch still shows single-stock price risk. Selling would turn that vest into fund units; the cash is still counted as income.'
              : 'The vest stays modeled as DoorDash income.'}
          </p>
          <h3>An offer</h3>
          <div className="form-grid">
            <Field label="Net monthly">
              <input inputMode="decimal" value={offer} onChange={(e) => setOffer(e.target.value)} />
            </Field>
            <label className="check">
              <input type="checkbox" checked={inWriting} onChange={(e) => setInWriting(e.target.checked)} />
              In writing
            </label>
          </div>
          <p>{offerOk ? 'This clears the line you wrote down.' : 'This stays under the line you wrote down.'}</p>
        </section>

        <section>
          <h2>Numbers on file</h2>
          <p className="quiet">Opening snapshot {state.finance.asOf}. Projections start from {liquid === state.finance.liquid ? 'that liquid figure' : `your latest logged balance, ${eur(liquid)}`}.</p>
          <div className="form-grid">
            <Field label="Wolt net / month"><NumberInput value={state.finance.woltNetMonthly} onChange={(n) => n != null && patch({ woltNetMonthly: n })} /></Field>
            <Field label="DoorDash vest low"><NumberInput value={state.finance.doordashVestLow} onChange={(n) => n != null && patch({ doordashVestLow: n })} /></Field>
            <Field label="DoorDash vest high"><NumberInput value={state.finance.doordashVestHigh} onChange={(n) => n != null && patch({ doordashVestHigh: n })} /></Field>
            <Field label="Vest every N months"><NumberInput value={state.finance.doordashEveryMonths} onChange={(n) => n != null && patch({ doordashEveryMonths: n })} /></Field>
            <Field label="C-360 / month"><NumberInput value={state.finance.c360Monthly} onChange={(n) => n != null && patch({ c360Monthly: n })} /></Field>
            <Field label="Opening liquid"><NumberInput value={state.finance.liquid} onChange={(n) => n != null && patch({ liquid: n })} /></Field>
            <Field label="Malta spend / month"><NumberInput value={state.finance.expensesMalta} onChange={(n) => n != null && patch({ expensesMalta: n })} /></Field>
            <Field label="Abroad spend / month"><NumberInput value={state.finance.expensesAbroad} onChange={(n) => n != null && patch({ expensesAbroad: n })} /></Field>
            <Field label="Actual saving / month"><NumberInput value={state.finance.actualSavingMonthly} onChange={(n) => n != null && patch({ actualSavingMonthly: n })} /></Field>
            <Field label="Saving target / month"><NumberInput value={state.finance.saveTargetMonthly} onChange={(n) => n != null && patch({ saveTargetMonthly: n })} /></Field>
            <Field label="Lean spend"><NumberInput value={state.finance.leanExpenses} onChange={(n) => n != null && patch({ leanExpenses: n })} /></Field>
            <Field label="Apartment value"><NumberInput value={state.finance.apartmentValue} onChange={(n) => n != null && patch({ apartmentValue: n })} /></Field>
            <Field label="Mortgage balance"><NumberInput value={state.finance.mortgageBalance} onChange={(n) => n != null && patch({ mortgageBalance: n })} /></Field>
            <Field label="Sale, net"><NumberInput value={state.finance.saleNet} onChange={(n) => n != null && patch({ saleNet: n })} /></Field>
            <Field label="Mortgage payment" hint="Blank until you know it."><NumberInput allowEmpty value={state.finance.mortgagePayment} onChange={(n) => patch({ mortgagePayment: n })} /></Field>
            <Field label="Mortgage rate, annual" hint="0.03 means 3%."><NumberInput allowEmpty step={0.001} value={state.finance.mortgageRateAnnual} onChange={(n) => patch({ mortgageRateAnnual: n })} /></Field>
            <Field label="Remaining term, months"><NumberInput allowEmpty value={state.finance.mortgageRemainingMonths} onChange={(n) => patch({ mortgageRemainingMonths: n })} /></Field>
            <Field label="Step-up date"><input type="date" value={state.finance.mortgageStepUpDate ?? ''} onChange={(e) => patch({ mortgageStepUpDate: e.target.value || null })} /></Field>
            <Field label="Payment after step-up"><NumberInput allowEmpty value={state.finance.mortgageStepUpPayment} onChange={(n) => patch({ mortgageStepUpPayment: n })} /></Field>
            <Field label="Liquid goal"><NumberInput value={state.finance.liquidGoal} onChange={(n) => n != null && patch({ liquidGoal: n })} /></Field>
            <Field label="Ideal liquid"><NumberInput value={state.finance.liquidGoalIdeal} onChange={(n) => n != null && patch({ liquidGoalIdeal: n })} /></Field>
            <Field label="Goal date"><input type="date" value={state.finance.goalDate} onChange={(e) => patch({ goalDate: e.target.value })} /></Field>
            <Field label="Birth date"><input type="date" value={state.finance.birthDate} onChange={(e) => patch({ birthDate: e.target.value })} /></Field>
            <Field label="Independence spend / year"><NumberInput value={state.finance.independenceSpendYear} onChange={(n) => n != null && patch({ independenceSpendYear: n })} /></Field>
            <Field label="Withdrawal rate" hint="0.04 is the 4% rule."><NumberInput step={0.01} value={state.finance.withdrawalRate} onChange={(n) => n != null && patch({ withdrawalRate: n })} /></Field>
            <Field label="Insync, first months"><NumberInput value={state.finance.insyncFirstMonths} onChange={(n) => n != null && patch({ insyncFirstMonths: n })} /></Field>
            <Field label="Insync, first net"><NumberInput value={state.finance.insyncFirstNet} onChange={(n) => n != null && patch({ insyncFirstNet: n })} /></Field>
            <Field label="Insync, then net"><NumberInput value={state.finance.insyncThenNet} onChange={(n) => n != null && patch({ insyncThenNet: n })} /></Field>
            <Field label="Part-time Wolt net" hint="Used only in the Insync-with-Wolt picture."><NumberInput allowEmpty value={state.finance.partTimeWoltMonthly} onChange={(n) => patch({ partTimeWoltMonthly: n })} /></Field>
            <Field label="€48k gross, as net / month" hint="Upside, not the base. Tax is not guessed."><NumberInput allowEmpty value={state.finance.upside48kNetMonthly} onChange={(n) => patch({ upside48kNetMonthly: n })} /></Field>
            <Field label="€55k gross, as net / month" hint="Upside, not the base."><NumberInput allowEmpty value={state.finance.upside55kNetMonthly} onChange={(n) => patch({ upside55kNetMonthly: n })} /></Field>
          </div>
        </section>
      </main>
    </Shell>
  )
}

function ScenarioBlocks({ model, today }: { model: ReturnType<typeof toModel>; today: string }) {
  const steady = steadyPath(model, today, model.actualSavingMonthly, 120)
  const end = (points: { liquid: number }[] | null) => (points ? eur(Math.round(points[points.length - 1].liquid)) : null)
  const insync = insyncPath(model, today, { partTime: false, horizon: 120 })
  const insyncPt = insyncPath(model, today, { partTime: true, horizon: 120 })
  const abroad = abroadPath(model, today, 120)
  const room = roomPath(model, today, 120)
  const sale = salePath(model, today, 120)
  const step = stepUpPath(model, today, 120)
  const up48 = model.upside48kNetMonthly != null ? upsidePath(model, today, model.upside48kNetMonthly, 120) : null
  const up55 = model.upside55kNetMonthly != null ? upsidePath(model, today, model.upside55kNetMonthly, 120) : null
  const rows = [
    ['Keep saving the current amount', end(steady)],
    ['Insync, no Wolt', end(insync)],
    ['Insync, with part-time Wolt', end(insyncPt) ?? 'Set a part-time net to see this'],
    ['Abroad six months a year', end(abroad)],
    ['Rent the second bedroom', end(room) ?? 'Set a room rent to see this'],
    ['Sell the apartment', end(sale) ?? 'Confirm the mortgage and set a rent to see this'],
    ['Mortgage step-up', end(step) ?? 'Set the current payment, the new payment, and the date'],
    ['€48k gross, upside not base', end(up48) ?? 'Enter the net monthly pay'],
    ['€55k gross, upside not base', end(up55) ?? 'Enter the net monthly pay'],
  ] as const
  return (
    <section>
      <h2>Other pictures, liquid in 10 years</h2>
      <p className="quiet">Abroad averages Malta and abroad spend across the year. Upside rows replace Wolt and drop the equity. They are not the base plan.</p>
      <div className="table-wrap">
        <table>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <td>{label}</td>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function MonthEditor() {
  const { state, update } = useStore()
  const rows = [...state.monthlyLogs].sort((a, b) => b.month.localeCompare(a.month))
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        const month = String(data.get('month') ?? '')
        if (!month) return
        const liquid = String(data.get('liquid') ?? '')
        const saved = String(data.get('saved') ?? '')
        update((s) =>
          withMonthly(s, month, {
            liquidBalance: liquid === '' ? null : Number(liquid),
            amountSaved: saved === '' ? null : Number(saved),
          }),
        )
        e.currentTarget.reset()
      }}
    >
      <Field label="Month">
        <input name="month" type="month" required />
      </Field>
      <Field label="Liquid">
        <input name="liquid" inputMode="decimal" />
      </Field>
      <Field label="Saved">
        <input name="saved" inputMode="decimal" />
      </Field>
      <button type="submit" className="btn">
        Log month
      </button>
      {rows.length > 0 && (
        <ul className="plain">
          {rows.map((row) => (
            <li key={row.month}>
              {formatMonth(row.month)} · {row.liquidBalance == null ? '—' : eur(row.liquidBalance)} · saved {row.amountSaved == null ? '—' : eur(row.amountSaved)}
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}
