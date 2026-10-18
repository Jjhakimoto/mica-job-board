/**
 * All money maths for the resilience page.
 *
 * The first projected month is the month after `profile.asOf`.
 * Opening liquid already includes the as-of month's salary.
 *
 * Each month, in this order:
 * 1. If this is the crash month, cut the invested balance once. Cash is spared.
 * 2. Work out income, the mortgage payment, and expenses before lean mode.
 * 3. Runway uses that post-crash liquid and the non-lean burn.
 *    When rules apply and runway is under the threshold, this month is lean
 *    and (if the pause rule is on) earns no market return.
 * 4. Apply the real return to the post-crash invested balance unless paused.
 *    Cash earns 0. The apartment grows at its own real rate.
 * 5. Add this month's contribution after the return, so new money earns
 *    nothing until next month. Positive money goes to investments, or to
 *    cash when paused. A shortfall spends cash first, then investments.
 * 6. Liquid stops at zero. That month is when cash runs out. Later surpluses
 *    can rebuild from zero. The model does not invent a debt.
 * 7. If the home is kept and the month's spending was covered, amortise one
 *    payment. A month that empties the cash freezes the mortgage. A sale
 *    month adds the proceeds, clears the mortgage, and drops the home
 *    from net worth.
 * Savings paths keep the chosen amount even after the mortgage steps up.
 * The step-up path is the one where the higher payment reduces the surplus.
 *
 * Real return, monthly: (1 + annual) ^ (1/12) - 1.
 * Mortgage interest, monthly: balance * annualRate / 12.
 * Outputs stay in today's euros.
 */

export type TaxBracket = {
  upTo: number | null
  rate: number
  subtract: number
}

export type CheckIn = {
  month: string
  liquid: number
  note: string
}

export type Config = {
  profile: {
    name: string
    asOf: string
    birthday: string
    location: string
  }
  income: {
    woltNetMonthly: number
    woltLow: number
    woltHigh: number
    sideNetMonthly: number
    sideLow: number
    sideHigh: number
    equityVestAmount: number
    equityVestLow: number
    equityVestHigh: number
    equityEveryMonths: number
    monthsUntilNextVest: number
    stockPriceFactor: number
    incomeGrowthAnnual: number
  }
  expenses: {
    maltaMonthly: number
    maltaIncludesMortgage: boolean
    actualCashSavedMonthly: number
    leanMonthly: number
    abroadMonthly: number
    abroadMonths: number[]
    addMortgageOnTopWhenAbroad: boolean
    abroadPatternFrom: string
  }
  assets: {
    liquid: number
    cashNotInMarket: number
    apartmentValue: number
    apartmentRealGrowthAnnual: number
    saleProceeds: number
  }
  returns: {
    realAnnual: number
  }
  mortgage: {
    balance: number
    termMonths: number
    paymentMonthly: number
    insuranceMonthly: number
    promoAnnualRate: number
    allowBalanceToRise: boolean
    stepUpDate: string
    stepUpAnnualRate: number
    stepUpPaymentOverride: number | null
  }
  independence: {
    annualSpend: number
    withdrawalRate: number
  }
  milestone: {
    date: string
    liquidTarget: number
    stretchTarget: number
  }
  savingsRates: number[]
  savingsAlreadyIncludeEquity: boolean
  worstCase: {
    shockMonth: string
    unemploymentMonths: number
    marketDrop: number
    freelanceMonthly: number
    replacementIncomeMonthly: number
  }
  jobLoss: {
    month: string
    freelanceMonthly: number
    lean: boolean
    replacementIncomeMonthly: number
  }
  recession: {
    month: string
    unemploymentMonths: number
    marketDrop: number
    freelanceMonthly: number
    lean: boolean
    replacementIncomeMonthly: number
  }
  transition: {
    startMonth: string
    trialMonths: number
    trialNet: number
    afterNet: number
    keepPartTimeWolt: boolean
    partTimeWoltNet: number
    equityContinuesIfPartTime: boolean
  }
  sell: {
    month: string
    rentMonthly: number | null
  }
  room: {
    startMonth: string
    rentMonthly: number
  }
  upside: {
    startMonth: string
    offers: { id: string; label: string; grossAnnual: number }[]
    keepSideIncome: boolean
    useFlatTax: boolean
    flatTaxRate: number
  }
  tax: {
    brackets: TaxBracket[]
    socialSecurityWeeklyCap: number
    weeksPerYear: number
  }
  triggers: {
    runwayMonths: number
    pauseInvesting: boolean
    roomFromUnemploymentMonth: number
    sellDecisionUnemploymentMonth: number
    minNetToLeave: number
    minRunwayToLeaveMonths: number
    sellEquityOnVest: boolean
    lines: string[]
  }
  checkIns: CheckIn[]
}

export function defaultConfig(): Config {
  return {
    profile: {
      name: 'Jake',
      asOf: '2026-10-18',
      birthday: '1997-08-18',
      location: 'Xgħajra, Malta',
    },
    income: {
      woltNetMonthly: 2250,
      woltLow: 2200,
      woltHigh: 2300,
      sideNetMonthly: 250,
      sideLow: 200,
      sideHigh: 300,
      equityVestAmount: 800,
      equityVestLow: 700,
      equityVestHigh: 900,
      equityEveryMonths: 3,
      monthsUntilNextVest: 3,
      stockPriceFactor: 1,
      incomeGrowthAnnual: 0,
    },
    expenses: {
      maltaMonthly: 1700,
      maltaIncludesMortgage: true,
      actualCashSavedMonthly: 800,
      leanMonthly: 1200,
      abroadMonthly: 2000,
      abroadMonths: [5, 6, 7, 8, 9, 10],
      addMortgageOnTopWhenAbroad: false,
      abroadPatternFrom: '2027-05',
    },
    assets: {
      liquid: 17500,
      cashNotInMarket: 0,
      apartmentValue: 300000,
      apartmentRealGrowthAnnual: 0,
      saleProceeds: 60000,
    },
    returns: {
      realAnnual: 0.03,
    },
    mortgage: {
      balance: 218000,
      termMonths: 396,
      paymentMonthly: 600,
      insuranceMonthly: 0,
      promoAnnualRate: 0.02,
      allowBalanceToRise: false,
      stepUpDate: '2029-10-01',
      stepUpAnnualRate: 0.035,
      stepUpPaymentOverride: null,
    },
    independence: {
      annualSpend: 25000,
      withdrawalRate: 0.04,
    },
    milestone: {
      date: '2027-08-18',
      liquidTarget: 30000,
      stretchTarget: 40000,
    },
    savingsRates: [500, 800, 1000, 1250],
    savingsAlreadyIncludeEquity: false,
    worstCase: {
      shockMonth: '2027-04',
      unemploymentMonths: 12,
      marketDrop: 0.3,
      freelanceMonthly: 0,
      replacementIncomeMonthly: 0,
    },
    jobLoss: {
      month: '2027-04',
      freelanceMonthly: 0,
      lean: false,
      replacementIncomeMonthly: 0,
    },
    recession: {
      month: '2027-04',
      unemploymentMonths: 12,
      marketDrop: 0.3,
      freelanceMonthly: 0,
      lean: false,
      replacementIncomeMonthly: 0,
    },
    transition: {
      startMonth: '2027-07',
      trialMonths: 2,
      trialNet: 1500,
      afterNet: 2500,
      keepPartTimeWolt: false,
      partTimeWoltNet: 0,
      equityContinuesIfPartTime: false,
    },
    sell: {
      month: '2028-01',
      rentMonthly: null,
    },
    room: {
      startMonth: '2027-07',
      rentMonthly: 0,
    },
    upside: {
      startMonth: '2028-01',
      offers: [
        { id: '48k', label: '€48k gross', grossAnnual: 48000 },
        { id: '55k', label: '€55k gross', grossAnnual: 55000 },
      ],
      keepSideIncome: true,
      useFlatTax: false,
      flatTaxRate: 0.15,
    },
    tax: {
      brackets: [
        { upTo: 12000, rate: 0, subtract: 0 },
        { upTo: 16000, rate: 0.15, subtract: 1800 },
        { upTo: 60000, rate: 0.25, subtract: 3400 },
        { upTo: null, rate: 0.35, subtract: 9400 },
      ],
      socialSecurityWeeklyCap: 55.93,
      weeksPerYear: 52,
    },
    triggers: {
      runwayMonths: 9,
      pauseInvesting: true,
      roomFromUnemploymentMonth: 3,
      sellDecisionUnemploymentMonth: 9,
      minNetToLeave: 2500,
      minRunwayToLeaveMonths: 12,
      sellEquityOnVest: true,
      lines: [
        'Runway under 9 months: cut to lean mode, pause investing, and keep new money in cash.',
        'Month 1 after a job loss: start Toptal or other freelance, and add C-360 hours.',
        'Month 3 after a job loss: rent the second bedroom.',
        'Month 9 after a job loss: decide whether to sell the apartment.',
        'Do not leave Wolt for an offer below €2,500 net unless it is in writing and runway is over 12 months.',
        'Sell DoorDash equity when it vests, and move the proceeds into a broad ETF such as VWCE.',
      ],
    },
    checkIns: [
      {
        month: '2026-10',
        liquid: 17500,
        note: "Opening balance, after this month's salary.",
      },
    ],
  }
}

export function monthlyRealRate(annualReal: number): number {
  if (annualReal <= -1) return -1
  return (1 + annualReal) ** (1 / 12) - 1
}

export function runwayMonths(liquid: number, monthlyBurn: number): number {
  if (monthlyBurn <= 0) return Number.POSITIVE_INFINITY
  if (liquid <= 0) return 0
  return liquid / monthlyBurn
}

export function independenceTarget(annualSpend: number, withdrawalRate: number): number {
  if (withdrawalRate <= 0) return Number.POSITIVE_INFINITY
  return annualSpend / withdrawalRate
}

export function incomeTaxAnnual(grossAnnual: number, brackets: TaxBracket[]): number {
  const ordered = [...brackets].sort((a, b) => {
    if (a.upTo == null) return 1
    if (b.upTo == null) return -1
    return a.upTo - b.upTo
  })
  let chosen = ordered[ordered.length - 1]
  for (const bracket of ordered) {
    if (bracket.upTo == null || grossAnnual <= bracket.upTo) {
      chosen = bracket
      break
    }
  }
  if (!chosen) return 0
  return Math.max(0, grossAnnual * chosen.rate - chosen.subtract)
}

export function socialSecurityAnnual(config: Config): number {
  return config.tax.socialSecurityWeeklyCap * config.tax.weeksPerYear
}

export function grossToNetMonthly(grossAnnual: number, config: Config, flatTax: boolean): number {
  const tax = flatTax
    ? grossAnnual * config.upside.flatTaxRate
    : incomeTaxAnnual(grossAnnual, config.tax.brackets)
  return (grossAnnual - tax - socialSecurityAnnual(config)) / 12
}

export function amortizeMonth(
  balance: number,
  annualRate: number,
  payment: number,
  insurance: number,
  allowBalanceToRise: boolean,
): { interest: number; principal: number; balance: number } {
  const interest = balance * (annualRate / 12)
  const toLoan = Math.max(0, payment - Math.max(0, insurance))
  let principal = toLoan - interest
  let next = balance - principal
  if (principal < 0 && !allowBalanceToRise) {
    principal = 0
    next = balance
  }
  if (next < 0) {
    principal += next
    next = 0
  }
  return { interest, principal, balance: next }
}

export function levelPayment(balance: number, annualRate: number, months: number): number {
  if (balance <= 0) return 0
  const n = Math.max(1, months)
  const r = annualRate / 12
  if (Math.abs(r) < 1e-12) return balance / n
  const growth = (1 + r) ** n
  return (balance * r * growth) / (growth - 1)
}

export function monthOf(iso: string): string {
  return iso.slice(0, 7)
}

export function addMonths(ym: string, count: number): string {
  const [year, month] = ym.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + count, 1))
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function diffMonths(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

export function firstProjectedMonth(asOf: string): string {
  return addMonths(monthOf(asOf), 1)
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function monthLabel(ym: string): string {
  const [year, month] = ym.split('-').map(Number)
  return `${MONTH_NAMES[month - 1]} ${year}`
}

export function ageOnDate(iso: string, birthday: string): number {
  const [year, month, day] = iso.split('-').map(Number)
  const [by, bm, bd] = birthday.split('-').map(Number)
  let age = year - by
  if (month < bm || (month === bm && day < bd)) age -= 1
  return age
}

export function ageInMonth(ym: string, birthday: string): number {
  const [year, month] = ym.split('-').map(Number)
  const [by, bm] = birthday.split('-').map(Number)
  let age = year - by
  if (month < bm) age -= 1
  return age
}

export function monthTurningAge(birthday: string, age: number): string {
  const [by, bm] = birthday.split('-')
  return `${Number(by) + age}-${bm}`
}

export function growthFactor(monthIndex: number, annualGrowth: number): number {
  const years = Math.floor(monthIndex / 12)
  return (1 + annualGrowth) ** years
}

export function isVestMonth(monthIndex: number, monthsUntilNextVest: number, everyMonths: number): boolean {
  if (everyMonths <= 0) return false
  const since = monthIndex + 1
  if (since < monthsUntilNextVest) return false
  return (since - monthsUntilNextVest) % everyMonths === 0
}

export function projectionLength(config: Config): number {
  const start = firstProjectedMonth(config.profile.asOf)
  const age60 = monthTurningAge(config.profile.birthday, 60)
  const horizon = addMonths(monthOf(config.profile.asOf), 360)
  const end = age60 > horizon ? age60 : horizon
  return diffMonths(start, end) + 1
}

export type ScenarioSpec = {
  id: string
  name: string
  family: string
  detail: string
  upside: boolean
  mode: 'savings' | 'cashflow'
  savingsMonthly: number
  jobLoss: null | {
    month: string
    unemploymentMonths: number
    freelanceMonthly: number
    replacementMonthly: number
    lean: boolean
  }
  crash: null | { month: string; drop: number }
  transition: null | {
    startMonth: string
    trialMonths: number
    trialNet: number
    afterNet: number
    keepPartTimeWolt: boolean
    partTimeWoltNet: number
    equityContinuesIfPartTime: boolean
  }
  sell: null | { month: string; rentMonthly: number | null }
  roomMonthly: number
  roomFrom: string | null
  abroadFrom: string | null
  upsideRole: null | {
    month: string
    grossAnnual: number
    flatTax: boolean
    keepSide: boolean
  }
  applyRules: boolean
  rulesRoomMonthly: number
}

export type MonthPoint = {
  date: string
  label: string
  index: number
  liquid: number
  cash: number
  invested: number
  netWorth: number
  mortgageBalance: number
  apartmentEquity: number
  income: number
  expenses: number
  contribution: number
  equityIncome: number
  housingPayment: number
  runway: number
  lean: boolean
  crashed: boolean
  ranOut: boolean
  sold: boolean
  abroad: boolean
}

function blankSpec(partial: Partial<ScenarioSpec> & Pick<ScenarioSpec, 'id' | 'name' | 'family'>): ScenarioSpec {
  return {
    detail: '',
    upside: false,
    mode: 'cashflow',
    savingsMonthly: 0,
    jobLoss: null,
    crash: null,
    transition: null,
    sell: null,
    roomMonthly: 0,
    roomFrom: null,
    abroadFrom: null,
    upsideRole: null,
    applyRules: false,
    rulesRoomMonthly: 0,
    ...partial,
  }
}

function savingsLabel(rate: number, actual: number): string {
  if (Math.abs(rate - actual) < 0.5) return 'What you save now, plus the vest.'
  if (rate < actual) return 'A thinner month than the cash you save now.'
  return 'Only if spending falls.'
}

export function buildScenarios(config: Config): ScenarioSpec[] {
  const actual = config.expenses.actualCashSavedMonthly
  const scenarios: ScenarioSpec[] = config.savingsRates.map((rate) =>
    blankSpec({
      id: `base-${rate}`,
      name: `Saving €${rate.toLocaleString('en-IE')}`,
      family: 'Base',
      detail: config.savingsAlreadyIncludeEquity
        ? 'This savings figure already includes the DoorDash vest.'
        : savingsLabel(rate, actual),
      mode: 'savings',
      savingsMonthly: rate,
    }),
  )

  for (const months of [3, 6, 12, 18]) {
    scenarios.push(
      blankSpec({
        id: `job-${months}`,
        name: `Job loss, ${months} months`,
        family: 'Job loss',
        detail: 'Wolt and the vest stop for this stretch. After it, only the replacement income is added, and that starts at zero. C-360 continues.',
        jobLoss: {
          month: config.jobLoss.month,
          unemploymentMonths: months,
          freelanceMonthly: config.jobLoss.freelanceMonthly,
          replacementMonthly: config.jobLoss.replacementIncomeMonthly,
          lean: config.jobLoss.lean,
        },
      }),
    )
  }

  scenarios.push(
    blankSpec({
      id: 'recession',
      name: 'Recession',
      family: 'Recession',
      detail: 'Job loss and a market drop in the same month. You may be selling while prices are down.',
      jobLoss: {
        month: config.recession.month,
        unemploymentMonths: config.recession.unemploymentMonths,
        freelanceMonthly: config.recession.freelanceMonthly,
        replacementMonthly: config.recession.replacementIncomeMonthly,
        lean: config.recession.lean,
      },
      crash: { month: config.recession.month, drop: config.recession.marketDrop },
    }),
  )

  const trial = config.transition
  scenarios.push(
    blankSpec({
      id: 'transition',
      name: 'Insync trial',
      family: 'Transition',
      detail: trial.keepPartTimeWolt
        ? 'Trial, then the higher rate, with part-time Wolt kept on.'
        : 'Trial, then the higher rate. Wolt and the vest stop.',
      upside: false,
      transition: {
        startMonth: trial.startMonth,
        trialMonths: trial.trialMonths,
        trialNet: trial.trialNet,
        afterNet: trial.afterNet,
        keepPartTimeWolt: trial.keepPartTimeWolt,
        partTimeWoltNet: trial.partTimeWoltNet,
        equityContinuesIfPartTime: trial.equityContinuesIfPartTime,
      },
    }),
  )

  scenarios.push(
    blankSpec({
      id: 'sell',
      name: 'Sell the apartment',
      family: 'Home',
      detail: 'Adds the conservative sale proceeds and swaps the mortgage for rent.',
      sell: { month: config.sell.month, rentMonthly: config.sell.rentMonthly },
    }),
  )

  scenarios.push(
    blankSpec({
      id: 'room',
      name: 'Rent the room',
      family: 'Home',
      detail: 'Wolt continues. The second bedroom adds the rent you enter.',
      roomMonthly: config.room.rentMonthly,
      roomFrom: config.room.startMonth,
    }),
  )

  scenarios.push(
    blankSpec({
      id: 'step-up',
      name: 'Mortgage step-up',
      family: 'Home',
      detail: 'You stay at Wolt. The higher payment comes out of the monthly surplus from the step-up date.',
    }),
  )

  scenarios.push(
    blankSpec({
      id: 'abroad',
      name: 'Abroad 6 months',
      family: 'Abroad',
      detail: 'The abroad months use the abroad spending figure. The apartment stays.',
      abroadFrom: config.expenses.abroadPatternFrom,
    }),
  )

  for (const offer of config.upside.offers) {
    const net = grossToNetMonthly(offer.grossAnnual, config, config.upside.useFlatTax)
    scenarios.push(
      blankSpec({
        id: `upside-${offer.id}`,
        name: offer.label,
        family: 'Upside, not base',
        detail: `Optional. About €${Math.round(net).toLocaleString('en-IE')} net a month. Not the plan.`,
        upside: true,
        upsideRole: {
          month: config.upside.startMonth,
          grossAnnual: offer.grossAnnual,
          flatTax: config.upside.useFlatTax,
          keepSide: config.upside.keepSideIncome,
        },
      }),
    )
  }

  scenarios.push(worstSpec(config, true))
  scenarios.push(worstSpec(config, false))
  return scenarios
}

function worstSpec(config: Config, withRules: boolean): ScenarioSpec {
  const shock = config.worstCase
  return blankSpec({
    id: withRules ? 'worst' : 'worst-raw',
    name: withRules ? 'Worst case, with your rules' : 'Worst case, nothing changes',
    family: 'Worst case',
    detail: withRules
      ? 'Job loss, a market drop, then the fallback steps you wrote down.'
      : 'Same shock, spending unchanged, no freelance and no room.',
    jobLoss: {
      month: shock.shockMonth,
      unemploymentMonths: shock.unemploymentMonths,
      freelanceMonthly: withRules ? shock.freelanceMonthly : 0,
      replacementMonthly: shock.replacementIncomeMonthly,
      lean: false,
    },
    crash: { month: shock.shockMonth, drop: shock.marketDrop },
    applyRules: withRules,
    rulesRoomMonthly: withRules ? config.room.rentMonthly : 0,
  })
}

type SalaryResolution = { salary: number; equityOn: boolean }

function resolveSalary(config: Config, spec: ScenarioSpec, date: string, index: number): SalaryResolution {
  const grown = config.income.woltNetMonthly * growthFactor(index, config.income.incomeGrowthAnnual)

  if (spec.upsideRole && date >= spec.upsideRole.month) {
    return {
      salary: grossToNetMonthly(spec.upsideRole.grossAnnual, config, spec.upsideRole.flatTax),
      equityOn: false,
    }
  }

  if (spec.transition && date >= spec.transition.startMonth) {
    const elapsed = diffMonths(spec.transition.startMonth, date)
    const main = elapsed < spec.transition.trialMonths ? spec.transition.trialNet : spec.transition.afterNet
    const extra = spec.transition.keepPartTimeWolt ? spec.transition.partTimeWoltNet : 0
    return {
      salary: main + extra,
      equityOn: spec.transition.keepPartTimeWolt && spec.transition.equityContinuesIfPartTime,
    }
  }

  if (spec.jobLoss && date >= spec.jobLoss.month) {
    return { salary: 0, equityOn: false }
  }

  return { salary: grown, equityOn: true }
}

function unemploymentEnd(spec: ScenarioSpec): string | null {
  if (!spec.jobLoss) return null
  return addMonths(spec.jobLoss.month, spec.jobLoss.unemploymentMonths)
}

function livingSpend(
  config: Config,
  housingPayment: number,
  sold: boolean,
  abroad: boolean,
  lean: boolean,
  rent: number,
): number {
  const baseHousing = config.mortgage.paymentMonthly
  const includes = config.expenses.maltaIncludesMortgage

  if (abroad) {
    let spend = config.expenses.abroadMonthly
    if (config.expenses.addMortgageOnTopWhenAbroad && !sold) spend += housingPayment
    return spend
  }

  const core = lean ? config.expenses.leanMonthly : config.expenses.maltaMonthly
  if (sold) {
    const withoutMortgage = includes ? core - baseHousing : core
    return withoutMortgage + rent
  }
  if (includes) return core - baseHousing + housingPayment
  return core + housingPayment
}

type SimState = {
  date: string
  index: number
  cash: number
  invested: number
  mortgage: number
  apartment: number
  sold: boolean
  ranOut: boolean
  stepUpPayment: number | null
}

function housingFor(config: Config, state: SimState, selling: boolean): { payment: number; rate: number } {
  if (state.sold || selling) return { payment: 0, rate: 0 }
  const stepMonth = monthOf(config.mortgage.stepUpDate)
  if (state.date >= stepMonth) {
    if (state.stepUpPayment == null) {
      const remaining = config.mortgage.termMonths - state.index
      if (config.mortgage.stepUpPaymentOverride != null) {
        state.stepUpPayment = config.mortgage.stepUpPaymentOverride
      } else {
        const principalAndInterest = levelPayment(
          state.mortgage,
          config.mortgage.stepUpAnnualRate,
          remaining,
        )
        state.stepUpPayment = principalAndInterest + Math.max(0, config.mortgage.insuranceMonthly)
      }
    }
    return { payment: state.stepUpPayment, rate: config.mortgage.stepUpAnnualRate }
  }
  return { payment: config.mortgage.paymentMonthly, rate: config.mortgage.promoAnnualRate }
}

function isAbroad(config: Config, spec: ScenarioSpec, date: string): boolean {
  if (!spec.abroadFrom || date < spec.abroadFrom) return false
  const month = Number(date.slice(5, 7))
  return config.expenses.abroadMonths.includes(month)
}

export function project(config: Config, spec: ScenarioSpec, months: number): MonthPoint[] {
  const openingCash = Math.min(Math.max(config.assets.cashNotInMarket, 0), Math.max(config.assets.liquid, 0))
  const state: SimState = {
    date: firstProjectedMonth(config.profile.asOf),
    index: 0,
    cash: openingCash,
    invested: config.assets.liquid - openingCash,
    mortgage: config.mortgage.balance,
    apartment: config.assets.apartmentValue,
    sold: false,
    ranOut: false,
    stepUpPayment: null,
  }
  const points: MonthPoint[] = []
  const real = monthlyRealRate(config.returns.realAnnual)
  const homeReal = monthlyRealRate(config.assets.apartmentRealGrowthAnnual)

  for (let i = 0; i < months; i += 1) {
    const date = state.date
    let crashed = false
    if (spec.crash && date === spec.crash.month) {
      state.invested *= 1 - spec.crash.drop
      crashed = true
    }

    const salary = resolveSalary(config, spec, date, state.index)
    const vestDue =
      salary.equityOn &&
      isVestMonth(state.index, config.income.monthsUntilNextVest, config.income.equityEveryMonths)
    const vest = vestDue ? config.income.equityVestAmount * config.income.stockPriceFactor : 0

    const end = unemploymentEnd(spec)
    const inUnemployment = spec.jobLoss != null && end != null && date >= spec.jobLoss.month && date < end
    const afterUnemployment = spec.jobLoss != null && end != null && date >= end
    const freelance = inUnemployment ? spec.jobLoss!.freelanceMonthly : 0
    const replacement = afterUnemployment ? spec.jobLoss!.replacementMonthly : 0

    let room = 0
    if (spec.roomFrom && date >= spec.roomFrom) room += spec.roomMonthly
    if (spec.applyRules && spec.jobLoss && spec.rulesRoomMonthly > 0) {
      const roomStart = addMonths(spec.jobLoss.month, config.triggers.roomFromUnemploymentMonth - 1)
      if (date >= roomStart) room += spec.rulesRoomMonthly
    }

    const upsideStarted = spec.upsideRole != null && date >= spec.upsideRole.month
    const side =
      upsideStarted && spec.upsideRole && !spec.upsideRole.keepSide ? 0 : config.income.sideNetMonthly

    const selling = !state.sold && spec.sell != null && date >= spec.sell.month
    const soldNow = state.sold || selling
    const abroad = isAbroad(config, spec, date)
    const housing = housingFor(config, state, selling)
    const rent = soldNow ? (spec.sell?.rentMonthly ?? 0) : 0

    const forcedLean = Boolean(spec.jobLoss?.lean && inUnemployment && !abroad)
    const ordinaryExpenses = livingSpend(config, housing.payment, soldNow, abroad, false, rent)
    const incomeExVest = salary.salary + side + freelance + room + replacement
    const cashflowIncome = incomeExVest + vest
    const liquidAfterCrash = state.cash + state.invested
    const ordinaryBurn = ordinaryExpenses - cashflowIncome
    const runway = runwayMonths(liquidAfterCrash, ordinaryBurn)
    const ruleLean = spec.applyRules && runway < config.triggers.runwayMonths && !abroad
    const lean = forcedLean || ruleLean
    const pause = spec.applyRules && config.triggers.pauseInvesting && runway < config.triggers.runwayMonths
    const expenses = lean ? livingSpend(config, housing.payment, soldNow, abroad, true, rent) : ordinaryExpenses

    if (!pause) state.invested *= 1 + real
    if (!soldNow) state.apartment *= 1 + homeReal

    let contribution = 0
    if (spec.mode === 'savings') {
      contribution = spec.savingsMonthly
      if (!config.savingsAlreadyIncludeEquity && salary.equityOn) contribution += vest
      if (selling) contribution += config.assets.saleProceeds
    } else {
      contribution = cashflowIncome - expenses
      if (selling) contribution += config.assets.saleProceeds
    }

    if (contribution >= 0) {
      if (pause) state.cash += contribution
      else state.invested += contribution
    } else {
      let need = -contribution
      const fromCash = Math.min(state.cash, need)
      state.cash -= fromCash
      need -= fromCash
      state.invested -= need
    }

    const alreadyOut = state.ranOut
    let ranOutThisMonth = false
    if (state.cash + state.invested <= 0.005) {
      state.cash = 0
      state.invested = 0
      if (!alreadyOut) ranOutThisMonth = true
      state.ranOut = true
    }
    const missedPayment = ranOutThisMonth || (alreadyOut && contribution < housing.payment)

    if (selling) {
      state.sold = true
      state.mortgage = 0
      state.apartment = 0
    } else if (!state.sold && !missedPayment) {
      const result = amortizeMonth(
        state.mortgage,
        housing.rate,
        housing.payment,
        config.mortgage.insuranceMonthly,
        config.mortgage.allowBalanceToRise,
      )
      state.mortgage = result.balance
    }

    const liquid = state.cash + state.invested
    const apartmentEquity = state.sold ? 0 : state.apartment - state.mortgage
    points.push({
      date,
      label: monthLabel(date),
      index: state.index,
      liquid,
      cash: state.cash,
      invested: state.invested,
      netWorth: liquid + apartmentEquity,
      mortgageBalance: state.mortgage,
      apartmentEquity,
      income: cashflowIncome,
      expenses,
      contribution,
      equityIncome: vest,
      housingPayment: housing.payment,
      runway,
      lean,
      crashed,
      ranOut: ranOutThisMonth,
      sold: state.sold,
      abroad,
    })

    state.index += 1
    state.date = addMonths(date, 1)
  }

  return points
}

export function pointOn(points: MonthPoint[], ym: string): MonthPoint | undefined {
  return points.find((point) => point.date === ym)
}

export function firstRunOut(points: MonthPoint[]): string | null {
  const found = points.find((point) => point.ranOut)
  return found ? found.date : null
}

export type RunwayReport = {
  stopped: number
  stoppedBurn: number
  withSide: number
  withSideBurn: number
  lean: number
  leanBurn: number
  sold: number | null
  soldBurn: number | null
}

export function headlineRunways(config: Config): RunwayReport {
  const liquid = config.assets.liquid
  const spend = config.expenses.maltaMonthly
  const side = config.income.sideNetMonthly
  const leanSpend = config.expenses.leanMonthly
  const stoppedBurn = spend
  const withSideBurn = spend - side
  const leanBurn = leanSpend - side
  let sold: number | null = null
  let soldBurn: number | null = null
  if (config.sell.rentMonthly != null) {
    const withoutMortgage = config.expenses.maltaIncludesMortgage
      ? spend - config.mortgage.paymentMonthly
      : spend
    soldBurn = withoutMortgage + config.sell.rentMonthly
    sold = runwayMonths(liquid + config.assets.saleProceeds, soldBurn)
  }
  return {
    stopped: runwayMonths(liquid, stoppedBurn),
    stoppedBurn,
    withSide: runwayMonths(liquid, withSideBurn),
    withSideBurn,
    lean: runwayMonths(liquid, leanBurn),
    leanBurn,
    sold,
    soldBurn,
  }
}

export type GapReport = {
  cashIncome: number
  expenses: number
  actual: number
  gap: number
  vestAverage: number
}

export function cashGap(config: Config): GapReport {
  const cashIncome = config.income.woltNetMonthly + config.income.sideNetMonthly
  const every = config.income.equityEveryMonths
  const vestAverage =
    every > 0 ? (config.income.equityVestAmount * config.income.stockPriceFactor) / every : 0
  return {
    cashIncome,
    expenses: config.expenses.maltaMonthly,
    actual: config.expenses.actualCashSavedMonthly,
    gap: cashIncome - config.expenses.maltaMonthly - config.expenses.actualCashSavedMonthly,
    vestAverage,
  }
}

export type MortgagePreview = {
  monthlyInterest: number
  monthlyPrincipal: number
  zeroInterestPayment: number
  payment: number
  insurance: number
  stepUpPayment: number
  stepUpBalance: number
  stepUpMonth: string
  stepUpIsOverride: boolean
}

export function mortgagePreview(config: Config): MortgagePreview {
  const insurance = Math.max(0, config.mortgage.insuranceMonthly)
  const payment = config.mortgage.paymentMonthly
  const first = amortizeMonth(
    config.mortgage.balance,
    config.mortgage.promoAnnualRate,
    payment,
    insurance,
    config.mortgage.allowBalanceToRise,
  )
  let balance = config.mortgage.balance
  let month = firstProjectedMonth(config.profile.asOf)
  let index = 0
  const stepMonth = monthOf(config.mortgage.stepUpDate)
  while (month < stepMonth && index < config.mortgage.termMonths) {
    const result = amortizeMonth(
      balance,
      config.mortgage.promoAnnualRate,
      payment,
      insurance,
      config.mortgage.allowBalanceToRise,
    )
    balance = result.balance
    month = addMonths(month, 1)
    index += 1
  }
  const remaining = config.mortgage.termMonths - index
  const override = config.mortgage.stepUpPaymentOverride
  const stepUpPayment =
    override != null
      ? override
      : levelPayment(balance, config.mortgage.stepUpAnnualRate, remaining) + insurance
  return {
    monthlyInterest: first.interest,
    monthlyPrincipal: first.principal,
    zeroInterestPayment: config.mortgage.termMonths > 0 ? config.mortgage.balance / config.mortgage.termMonths : config.mortgage.balance,
    payment,
    insurance,
    stepUpPayment,
    stepUpBalance: balance,
    stepUpMonth: stepMonth,
    stepUpIsOverride: override != null,
  }
}

export type PathSummary = {
  runsOutMonth: string | null
  liquidAtEnd: number
  points: MonthPoint[]
}

export type WorstStep = {
  month: string
  title: string
  text: string
}

export type WorstReport = {
  shockMonth: string
  drop: number
  unemploymentMonths: number
  freelance: number
  roomRent: number
  withRules: PathSummary
  unchanged: PathSummary
  sold: PathSummary | null
  decisionMonth: string
  roomMonth: string
  leanFrom: string | null
  steps: WorstStep[]
}

function summarise(points: MonthPoint[]): PathSummary {
  const last = points[points.length - 1]
  return {
    runsOutMonth: firstRunOut(points),
    liquidAtEnd: last ? last.liquid : 0,
    points,
  }
}

export function worstCase(config: Config): WorstReport {
  const length = projectionLength(config)
  const rulesSpec = worstSpec(config, true)
  const rawSpec = worstSpec(config, false)
  const rulesPoints = project(config, rulesSpec, length)
  const rawPoints = project(config, rawSpec, length)
  const shock = config.worstCase.shockMonth
  const roomMonth = addMonths(shock, config.triggers.roomFromUnemploymentMonth - 1)
  const decisionMonth = addMonths(shock, config.triggers.sellDecisionUnemploymentMonth - 1)
  const leanFrom = rulesPoints.find((point) => point.lean)?.date ?? null

  let sold: PathSummary | null = null
  if (config.sell.rentMonthly != null) {
    const soldSpec = worstSpec(config, true)
    soldSpec.sell = { month: decisionMonth, rentMonthly: config.sell.rentMonthly }
    sold = summarise(project(config, soldSpec, length))
  }

  const dropPct = Math.round(config.worstCase.marketDrop * 100)
  const steps: WorstStep[] = [
    {
      month: shock,
      title: 'Income stops',
      text: `Wolt salary and the DoorDash vest stop. Invested money drops ${dropPct}%. C-360 continues.`,
    },
    {
      month: shock,
      title: 'First response',
      text: `${config.triggers.lines[1] ?? 'Start freelance and add C-360 hours.'} Freelance in this path is €${Math.round(config.worstCase.freelanceMonthly).toLocaleString('en-IE')} a month.`,
    },
    {
      month: leanFrom ?? shock,
      title: 'Lean mode',
      text: leanFrom
        ? `${config.triggers.lines[0] ?? 'Cut to lean mode.'} It switches on ${monthLabel(leanFrom)}, at €${Math.round(config.expenses.leanMonthly).toLocaleString('en-IE')} including the mortgage.`
        : 'Runway stays above the line you set, so lean mode stays off.',
    },
    {
      month: roomMonth,
      title: 'Rent the room',
      text: `${config.triggers.lines[2] ?? 'Rent the second bedroom.'} The amount in the model is €${Math.round(config.room.rentMonthly).toLocaleString('en-IE')} a month.`,
    },
    {
      month: decisionMonth,
      title: 'Decide on the apartment',
      text: `${config.triggers.lines[3] ?? 'Decide whether to sell.'} The model does not sell on its own.`,
    },
  ]

  return {
    shockMonth: shock,
    drop: config.worstCase.marketDrop,
    unemploymentMonths: config.worstCase.unemploymentMonths,
    freelance: config.worstCase.freelanceMonthly,
    roomRent: config.room.rentMonthly,
    withRules: summarise(rulesPoints),
    unchanged: summarise(rawPoints),
    sold,
    decisionMonth,
    roomMonth,
    leanFrom,
    steps,
  }
}

export type MilestoneReport = {
  month: string
  liquid: number
  target: number
  stretch: number
  onTrack: boolean
  stretchOnTrack: boolean
  shortfall: number
  savingsMonthly: number
}

export function milestoneStatus(config: Config, points: MonthPoint[]): MilestoneReport {
  const month = monthOf(config.milestone.date)
  const point = pointOn(points, month)
  const liquid = point ? point.liquid : config.assets.liquid
  const shortfall = config.milestone.liquidTarget - liquid
  return {
    month,
    liquid,
    target: config.milestone.liquidTarget,
    stretch: config.milestone.stretchTarget,
    onTrack: liquid + 0.5 >= config.milestone.liquidTarget,
    stretchOnTrack: liquid + 0.5 >= config.milestone.stretchTarget,
    shortfall,
    savingsMonthly: config.expenses.actualCashSavedMonthly,
  }
}

export type IndependenceRow = {
  id: string
  name: string
  reached: string | null
  age: number | null
}

export type IndependenceReport = {
  target: number
  progress: number
  rows: IndependenceRow[]
}

export function independenceFor(config: Config, scenarios: { spec: ScenarioSpec; points: MonthPoint[] }[]): IndependenceReport {
  const target = independenceTarget(config.independence.annualSpend, config.independence.withdrawalRate)
  return {
    target,
    progress: target > 0 && Number.isFinite(target) ? config.assets.liquid / target : 0,
    rows: scenarios.map(({ spec, points }) => {
      const hit = points.find((point) => point.liquid + 0.5 >= target)
      if (!hit) return { id: spec.id, name: spec.name, reached: null, age: null }
      return {
        id: spec.id,
        name: spec.name,
        reached: hit.date,
        age: ageInMonth(hit.date, config.profile.birthday),
      }
    }),
  }
}

export type LeaveRule = {
  ok: boolean
  offerTooLow: boolean
  runwayTooShort: boolean
}

export function leaveRule(config: Config, offerNet: number, runway: number): LeaveRule {
  const offerTooLow = offerNet + 0.5 < config.triggers.minNetToLeave
  const runwayTooShort = !(runway > config.triggers.minRunwayToLeaveMonths)
  return { ok: !offerTooLow && !runwayTooShort, offerTooLow, runwayTooShort }
}

export type ModeledScenario = {
  spec: ScenarioSpec
  points: MonthPoint[]
}

export type Model = {
  months: number
  scenarios: ModeledScenario[]
  worst: WorstReport
  runways: RunwayReport
  gap: GapReport
  milestone: MilestoneReport
  independence: IndependenceReport
  mortgage: MortgagePreview
  plan: MonthPoint[]
}

export function model(config: Config): Model {
  const months = projectionLength(config)
  const scenarios = buildScenarios(config).map((spec) => ({
    spec,
    points: project(config, spec, months),
  }))
  const planSpec = blankSpec({
    id: 'plan',
    name: 'Plan',
    family: 'Base',
    mode: 'savings',
    savingsMonthly: config.expenses.actualCashSavedMonthly,
  })
  const plan = project(config, planSpec, months)
  const milestone = milestoneStatus(config, plan)
  const independence = independenceFor(config, scenarios)
  return {
    months,
    scenarios,
    worst: worstCase(config),
    runways: headlineRunways(config),
    gap: cashGap(config),
    milestone,
    independence,
    mortgage: mortgagePreview(config),
    plan,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeValue(base: unknown, patch: unknown): unknown {
  if (patch === undefined) return base
  if (typeof base === 'number') {
    const n = typeof patch === 'number' ? patch : typeof patch === 'string' && patch.trim() !== '' ? Number(patch) : NaN
    return Number.isFinite(n) ? n : base
  }
  if (typeof base === 'string') return typeof patch === 'string' ? patch : base
  if (typeof base === 'boolean') return typeof patch === 'boolean' ? patch : base
  if (base === null) {
    if (patch === null) return null
    if (typeof patch === 'number' && Number.isFinite(patch)) return patch
    return base
  }
  if (Array.isArray(base)) return Array.isArray(patch) ? patch : base
  if (isRecord(base) && isRecord(patch)) {
    const out: Record<string, unknown> = { ...base }
    for (const key of Object.keys(base)) {
      if (key in patch) out[key] = mergeValue(base[key], patch[key])
    }
    return out
  }
  return base
}

export function normalizeConfig(input: unknown): Config {
  const merged = mergeValue(defaultConfig(), input) as Config
  merged.checkIns = (Array.isArray(merged.checkIns) ? merged.checkIns : []).map((item) => {
    const row: Record<string, unknown> = isRecord(item) ? item : {}
    const month = typeof row.month === 'string' ? row.month.slice(0, 7) : ''
    const liquid = typeof row.liquid === 'number' && Number.isFinite(row.liquid) ? row.liquid : 0
    const note = typeof row.note === 'string' ? row.note : ''
    return { month, liquid, note }
  }).filter((item) => /^\d{4}-\d{2}$/.test(item.month))
  merged.expenses.abroadMonths = (Array.isArray(merged.expenses.abroadMonths) ? merged.expenses.abroadMonths : [])
    .map((month) => Number(month))
    .filter((month) => month >= 1 && month <= 12)
  merged.savingsRates = (Array.isArray(merged.savingsRates) ? merged.savingsRates : defaultConfig().savingsRates)
    .map((rate) => Number(rate))
    .filter((rate) => Number.isFinite(rate))
  merged.triggers.lines = (Array.isArray(merged.triggers.lines) ? merged.triggers.lines : []).map((line) =>
    typeof line === 'string' ? line : '',
  )
  merged.upside.offers = (Array.isArray(merged.upside.offers) ? merged.upside.offers : defaultConfig().upside.offers)
    .filter(isRecord)
    .map((offer) => ({
      id: typeof offer.id === 'string' ? offer.id : 'offer',
      label: typeof offer.label === 'string' ? offer.label : 'Offer',
      grossAnnual: typeof offer.grossAnnual === 'number' ? offer.grossAnnual : 0,
    }))
  if (merged.mortgage.insuranceMonthly < 0) merged.mortgage.insuranceMonthly = 0
  if (merged.mortgage.insuranceMonthly > merged.mortgage.paymentMonthly) {
    merged.mortgage.insuranceMonthly = merged.mortgage.paymentMonthly
  }
  return merged
}
