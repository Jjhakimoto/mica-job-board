import type { ReactNode } from 'react'
import { useApp } from '../app-state'
import { euro, longDate, percent } from '../format'
import { monthLabel } from '../model/finance'
import { MonthField, NumberField, OptionalNumberField, PercentField, TextField, ToggleField } from './Fields'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function Block({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div className="block">
      <h3>{title}</h3>
      {note ? <p className="quiet">{note}</p> : null}
      <div className="fields">{children}</div>
    </div>
  )
}

export function Assumptions({
  source,
  loadNote,
  onReset,
  onDownload,
}: {
  source: 'file' | 'browser'
  loadNote: string
  onReset: () => void
  onDownload: () => void
}) {
  const { config, model, update } = useApp()
  const mortgage = model.mortgage
  const paymentLeft = mortgage.payment - mortgage.insurance
  const clears = paymentLeft + 0.5 >= mortgage.zeroInterestPayment

  return (
    <section aria-labelledby="assumptions-title">
      <div className="section-head">
        <div>
          <h2 id="assumptions-title">Assumptions</h2>
          <p className="quiet">
            Every number lives here and in config.json. Nothing is fetched from the internet. Edits stay in this browser until you download the file and replace public/config.json.
          </p>
          {source === 'browser' ? (
            <p className="quiet">This page is showing edits saved in this browser, including check-ins.</p>
          ) : null}
          {loadNote ? <p className="quiet">{loadNote}</p> : null}
        </div>
        <div className="actions no-print">
          <button type="button" className="button" onClick={onDownload}>
            Download config.json
          </button>
          <button type="button" className="button" onClick={onReset}>
            Reload config.json
          </button>
        </div>
      </div>

      <Block title="Who and when">
        <TextField label="Name" value={config.profile.name} onChange={(name) => update((c) => ({ ...c, profile: { ...c.profile, name } }))} />
        <TextField
          label="Location"
          value={config.profile.location}
          onChange={(location) => update((c) => ({ ...c, profile: { ...c.profile, location } }))}
        />
        <label className="field">
          <span>As of</span>
          <input
            type="date"
            value={config.profile.asOf}
            onChange={(event) => update((c) => ({ ...c, profile: { ...c.profile, asOf: event.target.value } }))}
          />
          <small>Opening liquid already includes this month’s salary. The chart starts the month after.</small>
        </label>
        <label className="field">
          <span>Birthday</span>
          <input
            type="date"
            value={config.profile.birthday}
            onChange={(event) => update((c) => ({ ...c, profile: { ...c.profile, birthday: event.target.value } }))}
          />
        </label>
      </Block>

      <Block title="Income" note="All figures are net, in euros per month, except the vest, which arrives as a lump.">
        <NumberField
          label="Wolt"
          value={config.income.woltNetMonthly}
          suffix="€"
          hint={`Usually ${euro(config.income.woltLow)} to ${euro(config.income.woltHigh)}.`}
          onChange={(woltNetMonthly) => update((c) => ({ ...c, income: { ...c.income, woltNetMonthly } }))}
        />
        <NumberField label="Wolt low" value={config.income.woltLow} suffix="€" onChange={(woltLow) => update((c) => ({ ...c, income: { ...c.income, woltLow } }))} />
        <NumberField label="Wolt high" value={config.income.woltHigh} suffix="€" onChange={(woltHigh) => update((c) => ({ ...c, income: { ...c.income, woltHigh } }))} />
        <NumberField
          label="C-360"
          value={config.income.sideNetMonthly}
          suffix="€"
          hint="Continues if Wolt stops."
          onChange={(sideNetMonthly) => update((c) => ({ ...c, income: { ...c.income, sideNetMonthly } }))}
        />
        <NumberField label="C-360 low" value={config.income.sideLow} suffix="€" onChange={(sideLow) => update((c) => ({ ...c, income: { ...c.income, sideLow } }))} />
        <NumberField label="C-360 high" value={config.income.sideHigh} suffix="€" onChange={(sideHigh) => update((c) => ({ ...c, income: { ...c.income, sideHigh } }))} />
        <NumberField
          label="DoorDash vest"
          value={config.income.equityVestAmount}
          suffix="€"
          hint={`Usually ${euro(config.income.equityVestLow)} to ${euro(config.income.equityVestHigh)} each vest.`}
          onChange={(equityVestAmount) => update((c) => ({ ...c, income: { ...c.income, equityVestAmount } }))}
        />
        <NumberField label="Vest low" value={config.income.equityVestLow} suffix="€" onChange={(equityVestLow) => update((c) => ({ ...c, income: { ...c.income, equityVestLow } }))} />
        <NumberField label="Vest high" value={config.income.equityVestHigh} suffix="€" onChange={(equityVestHigh) => update((c) => ({ ...c, income: { ...c.income, equityVestHigh } }))} />
        <NumberField
          label="Months between vests"
          value={config.income.equityEveryMonths}
          min={1}
          onChange={(equityEveryMonths) => update((c) => ({ ...c, income: { ...c.income, equityEveryMonths } }))}
        />
        <NumberField
          label="Months until the next vest"
          value={config.income.monthsUntilNextVest}
          min={1}
          hint="Three means the next vest is January 2027, counting from October 2026."
          onChange={(monthsUntilNextVest) => update((c) => ({ ...c, income: { ...c.income, monthsUntilNextVest } }))}
        />
        <PercentField
          label="DoorDash price versus today"
          value={config.income.stockPriceFactor}
          hint="100% is today’s vest. 50% and 150% are the stress range. The vest joins the diversified pot."
          onChange={(stockPriceFactor) => update((c) => ({ ...c, income: { ...c.income, stockPriceFactor } }))}
        />
        <PercentField
          label="Income growth per year"
          value={config.income.incomeGrowthAnnual}
          hint="Applied to Wolt salary only, once a year from the start. Offers and the vest are left alone. Default is 0%."
          onChange={(incomeGrowthAnnual) => update((c) => ({ ...c, income: { ...c.income, incomeGrowthAnnual } }))}
        />
      </Block>

      <Block title="Spending" note="Malta spending includes the mortgage. Confirmed for October 2026.">
        <NumberField
          label="Malta spending"
          value={config.expenses.maltaMonthly}
          suffix="€"
          onChange={(maltaMonthly) => update((c) => ({ ...c, expenses: { ...c.expenses, maltaMonthly } }))}
        />
        <ToggleField
          label="Malta spending includes the mortgage"
          checked={config.expenses.maltaIncludesMortgage}
          hint="On: the mortgage is inside the Malta figure. Off: the mortgage is added on top."
          onChange={(maltaIncludesMortgage) => update((c) => ({ ...c, expenses: { ...c.expenses, maltaIncludesMortgage } }))}
        />
        <NumberField
          label="Cash you actually save"
          value={config.expenses.actualCashSavedMonthly}
          suffix="€"
          hint="This is the plan line and the milestone. The vest is extra, unless the switch below is on."
          onChange={(actualCashSavedMonthly) => update((c) => ({ ...c, expenses: { ...c.expenses, actualCashSavedMonthly } }))}
        />
        <ToggleField
          label="Savings figure already includes the vest"
          checked={config.savingsAlreadyIncludeEquity}
          hint="Off: each vest is added on top of the cash you save."
          onChange={(savingsAlreadyIncludeEquity) => update((c) => ({ ...c, savingsAlreadyIncludeEquity }))}
        />
        <NumberField
          label="Lean spending"
          value={config.expenses.leanMonthly}
          suffix="€"
          hint="Includes the mortgage. Used by the runway card and the rules."
          onChange={(leanMonthly) => update((c) => ({ ...c, expenses: { ...c.expenses, leanMonthly } }))}
        />
        <NumberField
          label="Abroad spending"
          value={config.expenses.abroadMonthly}
          suffix="€"
          hint="Treated as the whole month’s spend. Turn the switch on to add the Malta mortgage as well."
          onChange={(abroadMonthly) => update((c) => ({ ...c, expenses: { ...c.expenses, abroadMonthly } }))}
        />
        <ToggleField
          label="Add the Malta mortgage on top of abroad spending"
          checked={config.expenses.addMortgageOnTopWhenAbroad}
          onChange={(addMortgageOnTopWhenAbroad) =>
            update((c) => ({ ...c, expenses: { ...c.expenses, addMortgageOnTopWhenAbroad } }))
          }
        />
        <MonthField
          label="Abroad pattern starts"
          value={config.expenses.abroadPatternFrom}
          onChange={(abroadPatternFrom) => update((c) => ({ ...c, expenses: { ...c.expenses, abroadPatternFrom } }))}
        />
        <div className="field span">
          <span>Abroad months</span>
          <div className="chips">
            {MONTHS.map((name, index) => {
              const month = index + 1
              const on = config.expenses.abroadMonths.includes(month)
              return (
                <button
                  key={name}
                  type="button"
                  className="chip"
                  aria-pressed={on}
                  onClick={() =>
                    update((c) => {
                      const abroadMonths = on
                        ? c.expenses.abroadMonths.filter((item) => item !== month)
                        : [...c.expenses.abroadMonths, month].sort((a, b) => a - b)
                      return { ...c, expenses: { ...c.expenses, abroadMonths } }
                    })
                  }
                >
                  {name}
                </button>
              )
            })}
          </div>
          <small>Default is May to October. The apartment stays.</small>
        </div>
        {config.savingsRates.map((rate, index) => (
          <NumberField
            key={index}
            label={`Savings path ${index + 1}`}
            value={rate}
            suffix="€"
            hint={rate > config.expenses.actualCashSavedMonthly ? 'Only if spending falls.' : undefined}
            onChange={(next) =>
              update((c) => ({
                ...c,
                savingsRates: c.savingsRates.map((item, itemIndex) => (itemIndex === index ? next : item)),
              }))
            }
          />
        ))}
      </Block>

      <Block title="Assets and return" note="Returns are real, after inflation. Outputs stay in today’s euros.">
        <NumberField
          label="Liquid money"
          value={config.assets.liquid}
          suffix="€"
          hint="Stocks, savings, cash and crypto, after this month’s salary."
          onChange={(liquid) => update((c) => ({ ...c, assets: { ...c.assets, liquid } }))}
        />
        <NumberField
          label="Cash that is not in the market"
          value={config.assets.cashNotInMarket}
          suffix="€"
          hint="Left at zero, a crash hits the whole liquid balance. Set your real cash so the drop misses it."
          onChange={(cashNotInMarket) => update((c) => ({ ...c, assets: { ...c.assets, cashNotInMarket } }))}
        />
        <NumberField
          label="Apartment value"
          value={config.assets.apartmentValue}
          suffix="€"
          onChange={(apartmentValue) => update((c) => ({ ...c, assets: { ...c.assets, apartmentValue } }))}
        />
        <PercentField
          label="Apartment growth, real"
          value={config.assets.apartmentRealGrowthAnnual}
          hint="0% keeps the value flat in today’s euros. Equity then grows only as the loan is paid down."
          onChange={(apartmentRealGrowthAnnual) => update((c) => ({ ...c, assets: { ...c.assets, apartmentRealGrowthAnnual } }))}
        />
        <NumberField
          label="Sale proceeds"
          value={config.assets.saleProceeds}
          suffix="€"
          hint="Conservative net after taxes and fees."
          onChange={(saleProceeds) => update((c) => ({ ...c, assets: { ...c.assets, saleProceeds } }))}
        />
        <PercentField
          label="Real return on invested money"
          value={config.returns.realAnnual}
          hint="Default 3%. Cash earns nothing. New money earns from the next month."
          onChange={(realAnnual) => update((c) => ({ ...c, returns: { ...c.returns, realAnnual } }))}
        />
      </Block>

      <Block
        title="Mortgage"
        note="The 2% promo rate and the 3.5% rate after the step-up are placeholders. They are not your bank’s quote."
      >
        <NumberField label="Balance" value={config.mortgage.balance} suffix="€" onChange={(balance) => update((c) => ({ ...c, mortgage: { ...c.mortgage, balance } }))} />
        <NumberField
          label="Remaining term"
          value={config.mortgage.termMonths}
          suffix="months"
          hint="33 years is 396 months."
          onChange={(termMonths) => update((c) => ({ ...c, mortgage: { ...c.mortgage, termMonths } }))}
        />
        <NumberField
          label="Payment, including insurance"
          value={config.mortgage.paymentMonthly}
          suffix="€"
          hint="€600 for the next 3 years, confirmed."
          onChange={(paymentMonthly) => update((c) => ({ ...c, mortgage: { ...c.mortgage, paymentMonthly } }))}
        />
        <NumberField
          label="Insurance inside that payment"
          value={config.mortgage.insuranceMonthly}
          suffix="€"
          hint="Insurance does not reduce the balance. Default is €0 because the split is unknown."
          onChange={(insuranceMonthly) => update((c) => ({ ...c, mortgage: { ...c.mortgage, insuranceMonthly } }))}
        />
        <PercentField
          label="Promo rate, assumed"
          value={config.mortgage.promoAnnualRate}
          hint={`About ${euro(mortgage.monthlyInterest)} of the current payment is interest, and about ${euro(mortgage.monthlyPrincipal)} is principal.`}
          onChange={(promoAnnualRate) => update((c) => ({ ...c, mortgage: { ...c.mortgage, promoAnnualRate } }))}
        />
        <ToggleField
          label="Let the balance rise if interest exceeds the payment"
          checked={config.mortgage.allowBalanceToRise}
          hint="Off: the balance stays put. On: unpaid interest is added."
          onChange={(allowBalanceToRise) => update((c) => ({ ...c, mortgage: { ...c.mortgage, allowBalanceToRise } }))}
        />
        <label className="field">
          <span>Step-up date</span>
          <input
            type="date"
            value={config.mortgage.stepUpDate}
            onChange={(event) => update((c) => ({ ...c, mortgage: { ...c.mortgage, stepUpDate: event.target.value } }))}
          />
        </label>
        <PercentField
          label="Rate after the step-up, assumed"
          value={config.mortgage.stepUpAnnualRate}
          hint="Used only when you have not typed a payment."
          onChange={(stepUpAnnualRate) => update((c) => ({ ...c, mortgage: { ...c.mortgage, stepUpAnnualRate } }))}
        />
        <OptionalNumberField
          label="Payment after the step-up"
          value={config.mortgage.stepUpPaymentOverride}
          placeholder="Compute it"
          hint="A typed payment wins over the formula. Empty means compute it."
          onChange={(stepUpPaymentOverride) => update((c) => ({ ...c, mortgage: { ...c.mortgage, stepUpPaymentOverride } }))}
        />
        <p className="quiet span">
          Clearing {euro(config.mortgage.balance)} in {Math.round(config.mortgage.termMonths / 12)} years with no interest needs at least {euro(mortgage.zeroInterestPayment)} a month before insurance.
          {clears ? ' The payment covers that.' : ' The payment left after insurance is below that, so the loan does not clear on this term even at 0% interest.'}
          {' '}
          {mortgage.stepUpIsOverride
            ? `From ${monthLabel(mortgage.stepUpMonth)} the payment is the ${euro(mortgage.stepUpPayment)} you set.`
            : `From ${monthLabel(mortgage.stepUpMonth)} the formula gives about ${euro(mortgage.stepUpPayment)}, from a balance near ${euro(mortgage.stepUpBalance)} at ${percent(config.mortgage.stepUpAnnualRate, 1)}. Not your bank’s quote.`}
        </p>
      </Block>

      <Block title="Insync, the room, selling, recession, and upside">
        <MonthField label="Insync starts" value={config.transition.startMonth} onChange={(startMonth) => update((c) => ({ ...c, transition: { ...c.transition, startMonth } }))} />
        <NumberField label="Trial length" value={config.transition.trialMonths} suffix="months" onChange={(trialMonths) => update((c) => ({ ...c, transition: { ...c.transition, trialMonths } }))} />
        <NumberField label="Trial net" value={config.transition.trialNet} suffix="€" onChange={(trialNet) => update((c) => ({ ...c, transition: { ...c.transition, trialNet } }))} />
        <NumberField label="Net after the trial" value={config.transition.afterNet} suffix="€" onChange={(afterNet) => update((c) => ({ ...c, transition: { ...c.transition, afterNet } }))} />
        <ToggleField
          label="Keep part-time Wolt"
          checked={config.transition.keepPartTimeWolt}
          onChange={(keepPartTimeWolt) => update((c) => ({ ...c, transition: { ...c.transition, keepPartTimeWolt } }))}
        />
        <NumberField
          label="Part-time Wolt net"
          value={config.transition.partTimeWoltNet}
          suffix="€"
          hint="Zero until you have a figure."
          onChange={(partTimeWoltNet) => update((c) => ({ ...c, transition: { ...c.transition, partTimeWoltNet } }))}
        />
        <ToggleField
          label="Vest continues on part-time Wolt"
          checked={config.transition.equityContinuesIfPartTime}
          hint="Off by default. The vest is employment-contingent."
          onChange={(equityContinuesIfPartTime) =>
            update((c) => ({ ...c, transition: { ...c.transition, equityContinuesIfPartTime } }))
          }
        />
        <MonthField label="Sell month" value={config.sell.month} onChange={(month) => update((c) => ({ ...c, sell: { ...c.sell, month } }))} />
        <OptionalNumberField
          label="Rent after selling"
          value={config.sell.rentMonthly}
          placeholder="Not set"
          onChange={(rentMonthly) => update((c) => ({ ...c, sell: { ...c.sell, rentMonthly } }))}
        />
        <MonthField label="Room rented from" value={config.room.startMonth} onChange={(startMonth) => update((c) => ({ ...c, room: { ...c.room, startMonth } }))} />
        <NumberField label="Room rent" value={config.room.rentMonthly} suffix="€" onChange={(rentMonthly) => update((c) => ({ ...c, room: { ...c.room, rentMonthly } }))} />
        <MonthField label="Recession month" value={config.recession.month} onChange={(month) => update((c) => ({ ...c, recession: { ...c.recession, month } }))} />
        <NumberField label="Recession months out" value={config.recession.unemploymentMonths} onChange={(unemploymentMonths) => update((c) => ({ ...c, recession: { ...c.recession, unemploymentMonths } }))} />
        <PercentField label="Recession market drop" value={config.recession.marketDrop} onChange={(marketDrop) => update((c) => ({ ...c, recession: { ...c.recession, marketDrop } }))} />
        <NumberField label="Recession freelance" value={config.recession.freelanceMonthly} suffix="€" onChange={(freelanceMonthly) => update((c) => ({ ...c, recession: { ...c.recession, freelanceMonthly } }))} />
        <NumberField label="Recession replacement income" value={config.recession.replacementIncomeMonthly} suffix="€" onChange={(replacementIncomeMonthly) => update((c) => ({ ...c, recession: { ...c.recession, replacementIncomeMonthly } }))} />
        <ToggleField label="Lean mode in the recession path" checked={config.recession.lean} onChange={(lean) => update((c) => ({ ...c, recession: { ...c.recession, lean } }))} />
        <MonthField label="Upside role starts" value={config.upside.startMonth} hint="Optional. Labelled upside, not the base plan." onChange={(startMonth) => update((c) => ({ ...c, upside: { ...c.upside, startMonth } }))} />
        <ToggleField
          label="Keep C-360 with an upside role"
          checked={config.upside.keepSideIncome}
          onChange={(keepSideIncome) => update((c) => ({ ...c, upside: { ...c.upside, keepSideIncome } }))}
        />
        <ToggleField
          label="15% flat tax on the upside role"
          checked={config.upside.useFlatTax}
          hint="Off. Only for a qualifying contract. This is a planning assumption, not tax advice."
          onChange={(useFlatTax) => update((c) => ({ ...c, upside: { ...c.upside, useFlatTax } }))}
        />
        <PercentField label="Flat tax rate" value={config.upside.flatTaxRate} onChange={(flatTaxRate) => update((c) => ({ ...c, upside: { ...c.upside, flatTaxRate } }))} />
        {config.upside.offers.map((offer, index) => (
          <NumberField
            key={offer.id}
            label={`${offer.label} gross per year`}
            value={offer.grossAnnual}
            suffix="€"
            hint="Net uses the brackets below, plus capped social security, then ÷ 12. Not a payslip."
            onChange={(grossAnnual) =>
              update((c) => ({
                ...c,
                upside: {
                  ...c.upside,
                  offers: c.upside.offers.map((item, itemIndex) => (itemIndex === index ? { ...item, grossAnnual } : item)),
                },
              }))
            }
          />
        ))}
      </Block>

      <Block
        title="Tax used for the upside roles"
        note="2026 Malta single-filer brackets, stored here so you can correct them. Social security is the Class 1 employee cap for someone born after 1961."
      >
        {config.tax.brackets.map((bracket, index) => (
          <div key={index} className="span bracket">
            <OptionalNumberField
              label={index === config.tax.brackets.length - 1 ? 'Up to (empty means and over)' : `Bracket ${index + 1} up to`}
              value={bracket.upTo}
              placeholder="and over"
              onChange={(upTo) =>
                update((c) => ({
                  ...c,
                  tax: {
                    ...c.tax,
                    brackets: c.tax.brackets.map((item, itemIndex) => (itemIndex === index ? { ...item, upTo } : item)),
                  },
                }))
              }
            />
            <PercentField
              label="Rate"
              value={bracket.rate}
              onChange={(rate) =>
                update((c) => ({
                  ...c,
                  tax: {
                    ...c.tax,
                    brackets: c.tax.brackets.map((item, itemIndex) => (itemIndex === index ? { ...item, rate } : item)),
                  },
                }))
              }
            />
            <NumberField
              label="Subtract"
              value={bracket.subtract}
              suffix="€"
              onChange={(subtract) =>
                update((c) => ({
                  ...c,
                  tax: {
                    ...c.tax,
                    brackets: c.tax.brackets.map((item, itemIndex) => (itemIndex === index ? { ...item, subtract } : item)),
                  },
                }))
              }
            />
          </div>
        ))}
        <NumberField
          label="Social security cap per week"
          value={config.tax.socialSecurityWeeklyCap}
          step={0.01}
          suffix="€"
          onChange={(socialSecurityWeeklyCap) => update((c) => ({ ...c, tax: { ...c.tax, socialSecurityWeeklyCap } }))}
        />
        <NumberField
          label="Weeks counted"
          value={config.tax.weeksPerYear}
          onChange={(weeksPerYear) => update((c) => ({ ...c, tax: { ...c.tax, weeksPerYear } }))}
        />
      </Block>

      <Block title="Independence and the August 2027 milestone">
        <NumberField
          label="Annual spending"
          value={config.independence.annualSpend}
          suffix="€"
          onChange={(annualSpend) => update((c) => ({ ...c, independence: { ...c.independence, annualSpend } }))}
        />
        <PercentField
          label="Withdrawal rate"
          value={config.independence.withdrawalRate}
          onChange={(withdrawalRate) => update((c) => ({ ...c, independence: { ...c.independence, withdrawalRate } }))}
        />
        <label className="field">
          <span>Milestone date</span>
          <input
            type="date"
            value={config.milestone.date}
            onChange={(event) => update((c) => ({ ...c, milestone: { ...c.milestone, date: event.target.value } }))}
          />
          <small>{longDate(config.milestone.date)}</small>
        </label>
        <NumberField label="Liquid target" value={config.milestone.liquidTarget} suffix="€" onChange={(liquidTarget) => update((c) => ({ ...c, milestone: { ...c.milestone, liquidTarget } }))} />
        <NumberField label="Stretch target" value={config.milestone.stretchTarget} suffix="€" onChange={(stretchTarget) => update((c) => ({ ...c, milestone: { ...c.milestone, stretchTarget } }))} />
      </Block>
    </section>
  )
}
