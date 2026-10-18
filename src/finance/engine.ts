import { addMonthsISO, ageOn, diffDays, monthsUntil } from '../dates'
import type { FinanceConfig, TriggerRules } from '../types'

/** Everything the maths needs, already resolved to plain numbers. */
export interface FinanceModel {
  liquid: number
  woltNetMonthly: number
  doordashMonthly: number
  c360Monthly: number
  expensesMalta: number
  expensesAbroad: number
  leanExpenses: number
  actualSavingMonthly: number
  saveTargetMonthly: number
  apartmentValue: number
  mortgageBalance: number
  saleNet: number
  mortgagePayment: number | null
  mortgageRateAnnual: number | null
  mortgageRemainingMonths: number | null
  mortgageStepUpDate: string | null
  mortgageStepUpPayment: number | null
  expensesIncludeMortgage: boolean | null
  realReturn: number
  incomeGrowth: number
  marketCrash: number
  roomRentMonthly: number | null
  rentAfterSaleMonthly: number | null
  freelanceMonthly: number
  c360ExtraMonthly: number | null
  partTimeWoltMonthly: number | null
  insyncFirstMonths: number
  insyncFirstNet: number
  insyncThenNet: number
  upside48kNetMonthly: number | null
  upside55kNetMonthly: number | null
  goalDate: string
  birthDate: string
  liquidGoal: number
  liquidGoalIdeal: number
  independenceSpendYear: number
  withdrawalRate: number
  leanRunwayMonths: number
  jobLossFreelanceMonth: number
  jobLossRoomMonth: number
  jobLossSaleDecisionMonth: number
  minOfferNetToLeaveWolt: number
  minRunwayMonthsToLeaveWolt: number
}

export interface PathPoint {
  month: number
  date: string
  liquid: number
  equity: number
  netWorth: number
}

export interface WorstEvent {
  month: number
  id: 'lean' | 'freelance' | 'c360' | 'room' | 'sale'
  applied: boolean
  detail: string
}

export interface WorstCase {
  runsOutMonth: number | null
  runsOutDate: string | null
  series: PathPoint[]
  events: WorstEvent[]
}

export function monthlyRate(annual: number): number {
  if (annual === 0) return 0
  return (1 + annual) ** (1 / 12) - 1
}

export function doordashPerMonth(low: number, high: number, everyMonths: number, shock: number): number {
  if (everyMonths <= 0) return 0
  return ((low + high) / 2) * (1 + shock) / everyMonths
}

export function toModel(finance: FinanceConfig, triggers: TriggerRules, liquid = finance.liquid): FinanceModel {
  return {
    liquid,
    woltNetMonthly: finance.woltNetMonthly,
    doordashMonthly: doordashPerMonth(
      finance.doordashVestLow,
      finance.doordashVestHigh,
      finance.doordashEveryMonths,
      finance.doordashPriceShock,
    ),
    c360Monthly: finance.c360Monthly,
    expensesMalta: finance.expensesMalta,
    expensesAbroad: finance.expensesAbroad,
    leanExpenses: finance.leanExpenses,
    actualSavingMonthly: finance.actualSavingMonthly,
    saveTargetMonthly: finance.saveTargetMonthly,
    apartmentValue: finance.apartmentValue,
    mortgageBalance: finance.mortgageBalance,
    saleNet: finance.saleNet,
    mortgagePayment: finance.mortgagePayment,
    mortgageRateAnnual: finance.mortgageRateAnnual,
    mortgageRemainingMonths: finance.mortgageRemainingMonths,
    mortgageStepUpDate: finance.mortgageStepUpDate,
    mortgageStepUpPayment: finance.mortgageStepUpPayment,
    expensesIncludeMortgage: finance.expensesIncludeMortgage,
    realReturn: finance.realReturn,
    incomeGrowth: finance.incomeGrowth,
    marketCrash: finance.marketCrash,
    roomRentMonthly: finance.roomRentMonthly,
    rentAfterSaleMonthly: finance.rentAfterSaleMonthly,
    freelanceMonthly: finance.freelanceMonthly,
    c360ExtraMonthly: finance.c360ExtraMonthly,
    partTimeWoltMonthly: finance.partTimeWoltMonthly,
    insyncFirstMonths: finance.insyncFirstMonths,
    insyncFirstNet: finance.insyncFirstNet,
    insyncThenNet: finance.insyncThenNet,
    upside48kNetMonthly: finance.upside48kNetMonthly,
    upside55kNetMonthly: finance.upside55kNetMonthly,
    goalDate: finance.goalDate,
    birthDate: finance.birthDate,
    liquidGoal: finance.liquidGoal,
    liquidGoalIdeal: finance.liquidGoalIdeal,
    independenceSpendYear: finance.independenceSpendYear,
    withdrawalRate: finance.withdrawalRate,
    leanRunwayMonths: triggers.leanRunwayMonths,
    jobLossFreelanceMonth: triggers.jobLossFreelanceMonth,
    jobLossRoomMonth: triggers.jobLossRoomMonth,
    jobLossSaleDecisionMonth: triggers.jobLossSaleDecisionMonth,
    minOfferNetToLeaveWolt: triggers.minOfferNetToLeaveWolt,
    minRunwayMonthsToLeaveWolt: triggers.minRunwayMonthsToLeaveWolt,
  }
}

/** Cash leaving the account each month. Mortgage is added only when you have said it sits on top of the Malta figure. */
export function baseMonthlySpend(m: FinanceModel): number {
  if (m.expensesIncludeMortgage === false && m.mortgagePayment != null) {
    return m.expensesMalta + m.mortgagePayment
  }
  return m.expensesMalta
}

export function canModelSale(m: FinanceModel): boolean {
  return m.rentAfterSaleMonthly != null && m.mortgagePayment != null && m.expensesIncludeMortgage != null
}

export function monthlySpendAfterSale(m: FinanceModel): number | null {
  if (!canModelSale(m) || m.rentAfterSaleMonthly == null || m.mortgagePayment == null) return null
  if (m.expensesIncludeMortgage) return m.expensesMalta - m.mortgagePayment + m.rentAfterSaleMonthly
  return m.expensesMalta + m.rentAfterSaleMonthly
}

/** Null means spending is covered, so the balance does not run out. */
export function runwayMonths(liquid: number, spend: number, income: number): number | null {
  if (!Number.isFinite(liquid) || liquid <= 0) return 0
  const burn = spend - income
  if (burn <= 0) return null
  return liquid / burn
}

export interface RunwaySet {
  allStop: number | null
  withC360: number | null
  lean: number | null
  withSale: number | null
}

export function runwaySet(m: FinanceModel): RunwaySet {
  const spend = baseMonthlySpend(m)
  return {
    allStop: runwayMonths(m.liquid, spend, 0),
    withC360: runwayMonths(m.liquid, spend, m.c360Monthly),
    lean: runwayMonths(m.liquid, m.leanExpenses, 0),
    withSale: runwayMonths(m.liquid + m.saleNet, spend, 0),
  }
}

export interface Surplus {
  income: number
  doordash: number
  expenses: number
  surplus: number
  actual: number
  gap: number
}

export function theoreticalSurplus(m: FinanceModel): Surplus {
  const income = m.woltNetMonthly + m.doordashMonthly + m.c360Monthly
  const expenses = baseMonthlySpend(m)
  const surplus = income - expenses
  return {
    income,
    doordash: m.doordashMonthly,
    expenses,
    surplus,
    actual: m.actualSavingMonthly,
    gap: surplus - m.actualSavingMonthly,
  }
}

export function paymentForGoal(present: number, future: number, annualReal: number, months: number): number {
  if (months <= 0) return future - present
  const r = monthlyRate(annualReal)
  if (Math.abs(r) < 1e-12) return (future - present) / months
  const growth = (1 + r) ** months
  return ((future - present * growth) * r) / (growth - 1)
}

export function growthFactor(annual: number, month: number): number {
  const year = Math.floor((Math.max(month, 1) - 1) / 12)
  return (1 + annual) ** year
}

export function amortizeOneMonth(balance: number, annualRate: number | null, payment: number | null): number {
  if (balance <= 0) return 0
  if (annualRate == null || payment == null || payment <= 0) return balance
  const interest = balance * (annualRate / 12)
  const principal = Math.min(balance, Math.max(0, payment - interest))
  return Math.max(0, balance - principal)
}

export function projectMonths(opts: {
  startDate: string
  months: number
  startLiquid: number
  annualRealReturn: number
  crash?: number
  startEquity?: number
  step: (info: { month: number; date: string; liquidAtStart: number }) => { contribution: number; equity?: number }
}): PathPoint[] {
  const crash = opts.crash ?? 0
  let liquid = opts.startLiquid * (1 + crash)
  let equity = opts.startEquity ?? 0
  const points: PathPoint[] = [
    { month: 0, date: opts.startDate, liquid, equity, netWorth: liquid + equity },
  ]
  const r = monthlyRate(opts.annualRealReturn)
  for (let month = 1; month <= opts.months; month += 1) {
    const grown = liquid * (1 + r)
    const date = addMonthsISO(opts.startDate, month)
    const res = opts.step({ month, date, liquidAtStart: grown })
    liquid = grown + res.contribution
    if (res.equity != null) equity = res.equity
    points.push({ month, date, liquid, equity, netWorth: liquid + equity })
  }
  return points
}

export function yearlyPoints(points: PathPoint[]): PathPoint[] {
  return points.filter((p) => p.month % 12 === 0)
}

function point(month: number, date: string, liquid: number, equity: number): PathPoint {
  return { month, date, liquid, equity, netWorth: liquid + equity }
}

/**
 * Job loss with the written fallbacks.
 * Return is 0% on purpose: this card is the cautious reading, in today's euros, with no help from markets.
 */
export function worstRealistic(m: FinanceModel, startDate: string, horizon = 36): WorstCase {
  let liquid = m.liquid
  let baseSpend = baseMonthlySpend(m)
  let leanOn = false
  let saleDecided = false
  const equityStart = m.saleNet
  let equity = equityStart
  const events: WorstEvent[] = []
  const seen = new Set<string>()
  const note = (month: number, id: WorstEvent['id'], applied: boolean, detail: string) => {
    if (seen.has(id)) return
    seen.add(id)
    events.push({ month, id, applied, detail })
  }
  const series: PathPoint[] = [point(0, startDate, liquid, equity)]

  for (let month = 1; month <= horizon; month += 1) {
    const date = addMonthsISO(startDate, month)
    let income = m.c360Monthly
    if (month >= m.jobLossFreelanceMonth) {
      income += m.freelanceMonthly
      if (m.freelanceMonthly > 0) {
        note(month, 'freelance', true, `Freelance adds €${Math.round(m.freelanceMonthly)} a month from month ${m.jobLossFreelanceMonth}.`)
      } else {
        note(month, 'freelance', false, `Month ${m.jobLossFreelanceMonth}: freelance is in the rules, and the slider is at €0, so nothing is added.`)
      }
      if (m.c360ExtraMonthly != null && m.c360ExtraMonthly > 0) {
        income += m.c360ExtraMonthly
        note(month, 'c360', true, `Extra C-360 adds €${Math.round(m.c360ExtraMonthly)} a month.`)
      } else {
        note(month, 'c360', false, `Month ${m.jobLossFreelanceMonth}: more C-360 hours are in the rules, but no amount is set, so it isn't counted.`)
      }
    }
    if (month >= m.jobLossRoomMonth) {
      if (m.roomRentMonthly != null) {
        income += m.roomRentMonthly
        note(month, 'room', true, `The second bedroom adds €${Math.round(m.roomRentMonthly)} a month from month ${m.jobLossRoomMonth}.`)
      } else {
        note(month, 'room', false, `Month ${m.jobLossRoomMonth}: renting the room is in the rules. Set a rent to count it.`)
      }
    }

    let spend = baseSpend
    if (leanOn) spend = Math.min(spend, m.leanExpenses)
    const burnOf = (sp: number) => sp - income
    const runwayOf = (sp: number) => {
      const burn = burnOf(sp)
      if (burn <= 0) return Number.POSITIVE_INFINITY
      return liquid / burn
    }

    if (!leanOn && runwayOf(spend) < m.leanRunwayMonths && spend > m.leanExpenses) {
      spend = m.leanExpenses
      leanOn = true
      note(month, 'lean', true, `Lean mode from month ${month}: spending €${Math.round(m.leanExpenses)}. Investing is paused in this picture.`)
    }

    if (!saleDecided && month >= m.jobLossSaleDecisionMonth && runwayOf(spend) < m.leanRunwayMonths) {
      saleDecided = true
      const after = monthlySpendAfterSale(m)
      if (after != null) {
        liquid += m.saleNet
        equity = 0
        baseSpend = after
        spend = after
        if (runwayOf(spend) < m.leanRunwayMonths && spend > m.leanExpenses) {
          spend = m.leanExpenses
          leanOn = true
          note(month, 'lean', true, `Lean mode from month ${month}: spending €${Math.round(m.leanExpenses)}. Investing is paused in this picture.`)
        }
        note(month, 'sale', true, `Month ${month}: apartment sold. €${Math.round(m.saleNet)} added, and spending follows the rent you set.`)
      } else {
        note(month, 'sale', false, `Month ${month}: this is the point to decide on selling. Confirm the mortgage and set a rent to count a sale.`)
      }
    }

    liquid += income - spend
    series.push(point(month, date, liquid, equity))
    if (liquid <= 0) {
      return { runsOutMonth: month, runsOutDate: date, series, events }
    }
  }
  return { runsOutMonth: null, runsOutDate: null, series, events }
}

export function steadyPath(m: FinanceModel, startDate: string, monthly: number, horizon: number, crash = m.marketCrash): PathPoint[] {
  return projectMonths({
    startDate,
    months: horizon,
    startLiquid: m.liquid,
    annualRealReturn: m.realReturn,
    crash,
    startEquity: m.saleNet,
    step: () => ({ contribution: monthly }),
  })
}

export function savingsTable(m: FinanceModel, startDate: string, rates: number[], years: number[]): { rate: number; byYear: Record<number, number> }[] {
  const horizon = Math.max(...years) * 12
  return rates.map((rate) => {
    const points = steadyPath(m, startDate, rate, horizon)
    const byYear: Record<number, number> = {}
    for (const y of years) byYear[y] = points[y * 12]?.liquid ?? 0
    return { rate, byYear }
  })
}

export function jobLossPath(
  m: FinanceModel,
  startDate: string,
  opts: { gapMonths: number; lean: boolean; crash: number; horizon: number },
): PathPoint[] {
  const spend = opts.lean ? m.leanExpenses : baseMonthlySpend(m)
  return projectMonths({
    startDate,
    months: opts.horizon,
    startLiquid: m.liquid,
    annualRealReturn: m.realReturn,
    crash: opts.crash,
    startEquity: m.saleNet,
    step: ({ month }) => {
      if (month <= opts.gapMonths) {
        return { contribution: m.c360Monthly + m.freelanceMonthly - spend }
      }
      return { contribution: m.actualSavingMonthly }
    },
  })
}

export function insyncPath(
  m: FinanceModel,
  startDate: string,
  opts: { partTime: boolean; horizon: number },
): PathPoint[] | null {
  if (opts.partTime && m.partTimeWoltMonthly == null) return null
  const spend = baseMonthlySpend(m)
  return projectMonths({
    startDate,
    months: opts.horizon,
    startLiquid: m.liquid,
    annualRealReturn: m.realReturn,
    crash: m.marketCrash,
    startEquity: m.saleNet,
    step: ({ month }) => {
      const g = growthFactor(m.incomeGrowth, month)
      const pay = (month <= m.insyncFirstMonths ? m.insyncFirstNet : m.insyncThenNet) * g
      const side = m.c360Monthly * g
      const extra = opts.partTime && m.partTimeWoltMonthly != null ? m.partTimeWoltMonthly * g : 0
      return { contribution: pay + side + extra - spend }
    },
  })
}

export function abroadPath(m: FinanceModel, startDate: string, horizon: number): PathPoint[] {
  const spend = (m.expensesMalta + m.expensesAbroad) / 2
  return projectMonths({
    startDate,
    months: horizon,
    startLiquid: m.liquid,
    annualRealReturn: m.realReturn,
    crash: m.marketCrash,
    startEquity: m.saleNet,
    step: ({ month }) => {
      const g = growthFactor(m.incomeGrowth, month)
      const income = (m.woltNetMonthly + m.doordashMonthly + m.c360Monthly) * g
      return { contribution: income - spend }
    },
  })
}

export function stepUpDelta(m: FinanceModel): number | null {
  if (m.mortgagePayment == null || m.mortgageStepUpPayment == null || !m.mortgageStepUpDate) return null
  return m.mortgageStepUpPayment - m.mortgagePayment
}

export function stepUpPath(m: FinanceModel, startDate: string, horizon: number): PathPoint[] | null {
  const delta = stepUpDelta(m)
  if (delta == null || !m.mortgageStepUpDate) return null
  const when = m.mortgageStepUpDate
  return projectMonths({
    startDate,
    months: horizon,
    startLiquid: m.liquid,
    annualRealReturn: m.realReturn,
    crash: m.marketCrash,
    startEquity: m.saleNet,
    step: ({ date }) => ({ contribution: m.actualSavingMonthly - (date >= when ? delta : 0) }),
  })
}

export function roomPath(m: FinanceModel, startDate: string, horizon: number): PathPoint[] | null {
  if (m.roomRentMonthly == null) return null
  const rent = m.roomRentMonthly
  return projectMonths({
    startDate,
    months: horizon,
    startLiquid: m.liquid,
    annualRealReturn: m.realReturn,
    crash: m.marketCrash,
    startEquity: m.saleNet,
    step: () => ({ contribution: m.actualSavingMonthly + rent }),
  })
}

export function salePath(m: FinanceModel, startDate: string, horizon: number): PathPoint[] | null {
  const after = monthlySpendAfterSale(m)
  if (after == null) return null
  const before = baseMonthlySpend(m)
  const delta = after - before
  return projectMonths({
    startDate,
    months: horizon,
    startLiquid: m.liquid,
    annualRealReturn: m.realReturn,
    crash: m.marketCrash,
    startEquity: m.saleNet,
    step: ({ month }) => ({
      contribution: m.actualSavingMonthly - delta + (month === 1 ? m.saleNet : 0),
      equity: 0,
    }),
  })
}

export function upsidePath(m: FinanceModel, startDate: string, netMonthly: number, horizon: number): PathPoint[] {
  const spend = baseMonthlySpend(m)
  return projectMonths({
    startDate,
    months: horizon,
    startLiquid: m.liquid,
    annualRealReturn: m.realReturn,
    crash: m.marketCrash,
    startEquity: m.saleNet,
    step: ({ month }) => {
      const g = growthFactor(m.incomeGrowth, month)
      return { contribution: (netMonthly + m.c360Monthly) * g - spend }
    },
  })
}

export interface BirthdayMilestone {
  days: number
  months: number
  projected: number
  onTrack: boolean
  idealOnTrack: boolean
  neededMonthly: number
}

export function birthdayMilestone(m: FinanceModel, today: string): BirthdayMilestone {
  const days = diffDays(today, m.goalDate)
  const months = monthsUntil(today, m.goalDate)
  const startLiquid = m.liquid * (1 + m.marketCrash)
  if (months === 0) {
    return {
      days,
      months,
      projected: startLiquid,
      onTrack: startLiquid >= m.liquidGoal,
      idealOnTrack: startLiquid >= m.liquidGoalIdeal,
      neededMonthly: 0,
    }
  }
  const points = projectMonths({
    startDate: today,
    months,
    startLiquid: m.liquid,
    annualRealReturn: m.realReturn,
    crash: m.marketCrash,
    startEquity: 0,
    step: () => ({ contribution: m.actualSavingMonthly }),
  })
  const projected = points[months]?.liquid ?? startLiquid
  return {
    days,
    months,
    projected,
    onTrack: projected >= m.liquidGoal,
    idealOnTrack: projected >= m.liquidGoalIdeal,
    neededMonthly: paymentForGoal(startLiquid, m.liquidGoal, m.realReturn, months),
  }
}

export interface Independence {
  target: number
  progress: number
  hit: PathPoint | null
  age: number | null
  points: PathPoint[]
}

export function independenceOutlook(m: FinanceModel, today: string, horizonYears = 40): Independence {
  const target = m.withdrawalRate > 0 ? m.independenceSpendYear / m.withdrawalRate : Number.POSITIVE_INFINITY
  const points = steadyPath(m, today, m.actualSavingMonthly, horizonYears * 12)
  const hit = points.find((p) => p.liquid >= target) ?? null
  return {
    target,
    progress: Number.isFinite(target) && target > 0 ? m.liquid / target : 0,
    hit,
    age: hit ? ageOn(m.birthDate, hit.date) : null,
    points,
  }
}

export function offerClearsRule(offerNet: number, inWriting: boolean, runway: number | null, m: FinanceModel): boolean {
  if (offerNet >= m.minOfferNetToLeaveWolt) return true
  const runwayOk = runway == null || runway > m.minRunwayMonthsToLeaveWolt
  return inWriting && runwayOk
}

export interface PlanRow {
  month: string
  actual: number | null
  plan: number
}

export function planSeries(entries: { month: string; liquid: number }[], monthlyPlan: number): PlanRow[] {
  if (!entries.length) return []
  const sorted = [...entries].sort((a, b) => a.month.localeCompare(b.month))
  const map = new Map(sorted.map((e) => [e.month, e.liquid]))
  const start = sorted[0].month
  const end = sorted[sorted.length - 1].month
  const startLiquid = sorted[0].liquid
  const out: PlanRow[] = []
  let month = start
  let i = 0
  while (month <= end && i < 600) {
    out.push({ month, actual: map.get(month) ?? null, plan: startLiquid + i * monthlyPlan })
    month = addMonthsISO(`${month}-01`, 1).slice(0, 7)
    i += 1
  }
  return out
}
