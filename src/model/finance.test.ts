import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  addMonths,
  amortizeMonth,
  cashGap,
  defaultConfig,
  firstProjectedMonth,
  grossToNetMonthly,
  growthFactor,
  headlineRunways,
  independenceTarget,
  isVestMonth,
  levelPayment,
  model,
  monthlyRealRate,
  mortgagePreview,
  normalizeConfig,
  pointOn,
  project,
  runwayMonths,
  worstCase,
  type Config,
  type ScenarioSpec,
} from './finance'

function tweak(patch: unknown): Config {
  return normalizeConfig(patch)
}

function spec(partial: Partial<ScenarioSpec> & Pick<ScenarioSpec, 'id'>): ScenarioSpec {
  return {
    name: partial.id,
    family: 'Test',
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

describe('rates and runway', () => {
  it('compounds the monthly real rate back to the annual rate', () => {
    const monthly = monthlyRealRate(0.03)
    expect((1 + monthly) ** 12).toBeCloseTo(1.03, 10)
  })

  it('turns twelve idle months into the annual real return', () => {
    const config = tweak({
      returns: { realAnnual: 0.03 },
      assets: { liquid: 10000, cashNotInMarket: 0 },
      income: { woltNetMonthly: 0, sideNetMonthly: 0, equityVestAmount: 0 },
    })
    const points = project(config, spec({ id: 'idle', mode: 'savings', savingsMonthly: 0 }), 12)
    expect(points[11].liquid).toBeCloseTo(10000 * 1.03, 6)
  })

  it('lets new money earn a return only from the following month', () => {
    const config = tweak({
      returns: { realAnnual: 0.03 },
      assets: { liquid: 10000, cashNotInMarket: 0 },
      income: { equityVestAmount: 0 },
    })
    const points = project(config, spec({ id: 'save', mode: 'savings', savingsMonthly: 100 }), 1)
    const monthly = monthlyRealRate(0.03)
    expect(points[0].liquid).toBeCloseTo(10000 * (1 + monthly) + 100, 6)
  })

  it('measures runway and treats a covered month as unlimited', () => {
    expect(runwayMonths(17500, 1700)).toBeCloseTo(17500 / 1700, 8)
    expect(runwayMonths(100, 0)).toBe(Number.POSITIVE_INFINITY)
    expect(runwayMonths(100, -5)).toBe(Number.POSITIVE_INFINITY)
    expect(runwayMonths(0, 100)).toBe(0)
  })

  it('shows no cash gap at the confirmed October 2026 figures', () => {
    const gap = cashGap(defaultConfig())
    expect(gap.cashIncome).toBe(2500)
    expect(gap.gap).toBe(0)
    expect(gap.vestAverage).toBeCloseTo(800 / 3, 8)
    const runways = headlineRunways(defaultConfig())
    expect(runways.stopped).toBeCloseTo(17500 / 1700, 8)
    expect(runways.withSide).toBeCloseTo(17500 / 1450, 8)
    expect(runways.lean).toBeCloseTo(17500 / 950, 8)
    expect(runways.sold).toBeNull()
  })
})

describe('income shocks', () => {
  it('drops salary and the vest on a job loss and keeps C-360', () => {
    const config = tweak({ returns: { realAnnual: 0 } })
    const loss = spec({
      id: 'loss',
      jobLoss: {
        month: '2027-04',
        unemploymentMonths: 12,
        freelanceMonthly: 0,
        replacementMonthly: 0,
        lean: false,
      },
    })
    const points = project(config, loss, 12)
    expect(pointOn(points, '2027-01')?.income).toBe(2250 + 250 + 800)
    expect(pointOn(points, '2027-03')?.income).toBe(2250 + 250)
    expect(pointOn(points, '2027-04')?.income).toBe(250)
    expect(pointOn(points, '2027-04')?.equityIncome).toBe(0)
  })

  it('does not invent a replacement job when unemployment ends', () => {
    const config = tweak({
      returns: { realAnnual: 0 },
      income: { monthsUntilNextVest: 1 },
    })
    const points = project(
      config,
      spec({
        id: 'gap',
        jobLoss: {
          month: '2026-11',
          unemploymentMonths: 2,
          freelanceMonthly: 300,
          replacementMonthly: 0,
          lean: false,
        },
      }),
      4,
    )
    expect(pointOn(points, '2026-11')?.income).toBe(250 + 300)
    expect(pointOn(points, '2026-11')?.equityIncome).toBe(0)
    expect(pointOn(points, '2027-01')?.income).toBe(250)
  })

  it('scales the vest with the stock-price factor and leaves salary alone', () => {
    const config = tweak({
      returns: { realAnnual: 0 },
      income: { stockPriceFactor: 1.5 },
      assets: { liquid: 17500 },
    })
    const points = project(config, spec({ id: 'vest', mode: 'savings', savingsMonthly: 0 }), 3)
    expect(pointOn(points, '2026-11')?.liquid).toBe(17500)
    expect(pointOn(points, '2027-01')?.liquid).toBe(17500 + 1200)
    expect(pointOn(points, '2027-01')?.equityIncome).toBe(1200)
    const employed = project(config, spec({ id: 'pay' }), 1)
    expect(employed[0].income).toBe(2250 + 250)
  })

  it('compounds 2% income growth once a year from the start', () => {
    const config = tweak({
      returns: { realAnnual: 0 },
      income: { incomeGrowthAnnual: 0.02, equityVestAmount: 0 },
    })
    expect(growthFactor(0, 0.02)).toBe(1)
    expect(growthFactor(11, 0.02)).toBe(1)
    expect(growthFactor(12, 0.02)).toBeCloseTo(1.02, 10)
    const points = project(config, spec({ id: 'grow' }), 13)
    expect(pointOn(points, '2027-10')?.income).toBe(2250 + 250)
    expect(pointOn(points, '2027-11')?.income).toBeCloseTo(2250 * 1.02 + 250, 6)
  })

  it('pays the Insync trial for two months and then the higher rate, with no vest', () => {
    const config = tweak({ returns: { realAnnual: 0 } })
    const points = project(
      config,
      spec({
        id: 'insync',
        transition: {
          startMonth: '2027-07',
          trialMonths: 2,
          trialNet: 1500,
          afterNet: 2500,
          keepPartTimeWolt: false,
          partTimeWoltNet: 0,
          equityContinuesIfPartTime: false,
        },
      }),
      12,
    )
    expect(pointOn(points, '2027-07')?.income).toBe(1500 + 250)
    expect(pointOn(points, '2027-07')?.equityIncome).toBe(0)
    expect(pointOn(points, '2027-08')?.income).toBe(1500 + 250)
    expect(pointOn(points, '2027-09')?.income).toBe(2500 + 250)
  })

  it('keeps a part-time vest only when that switch is on', () => {
    const config = tweak({ returns: { realAnnual: 0 } })
    const points = project(
      config,
      spec({
        id: 'part',
        transition: {
          startMonth: '2027-07',
          trialMonths: 2,
          trialNet: 1500,
          afterNet: 2500,
          keepPartTimeWolt: true,
          partTimeWoltNet: 400,
          equityContinuesIfPartTime: true,
        },
      }),
      12,
    )
    expect(pointOn(points, '2027-07')?.income).toBe(1500 + 400 + 250 + 800)
  })
})

describe('market crash', () => {
  it('cuts invested money once and spares cash', () => {
    const config = tweak({
      returns: { realAnnual: 0 },
      assets: { liquid: 15000, cashNotInMarket: 5000 },
      income: { equityVestAmount: 0 },
    })
    const points = project(
      config,
      spec({
        id: 'crash',
        mode: 'savings',
        savingsMonthly: 0,
        crash: { month: '2026-11', drop: 0.3 },
      }),
      2,
    )
    expect(points[0].invested).toBeCloseTo(7000, 6)
    expect(points[0].cash).toBeCloseTo(5000, 6)
    expect(points[0].liquid).toBeCloseTo(12000, 6)
    expect(points[1].liquid).toBeCloseTo(12000, 6)
    expect(points[1].crashed).toBe(false)
    expect(points[0].crashed).toBe(true)
  })

  it('applies the drop before the contribution', () => {
    const config = tweak({
      returns: { realAnnual: 0 },
      assets: { liquid: 10000, cashNotInMarket: 0 },
      income: { equityVestAmount: 0 },
    })
    const points = project(
      config,
      spec({
        id: 'order',
        mode: 'savings',
        savingsMonthly: 1000,
        crash: { month: '2026-11', drop: 0.3 },
      }),
      1,
    )
    expect(points[0].liquid).toBeCloseTo(8000, 6)
  })

  it('spends the cash buffer before selling investments', () => {
    const config = tweak({
      returns: { realAnnual: 0 },
      assets: { liquid: 15000, cashNotInMarket: 5000 },
      income: { woltNetMonthly: 0, sideNetMonthly: 0, equityVestAmount: 0 },
      expenses: { maltaMonthly: 3000 },
    })
    const points = project(config, spec({ id: 'draw' }), 1)
    expect(points[0].cash).toBeCloseTo(2000, 6)
    expect(points[0].invested).toBeCloseTo(10000, 6)
  })
})

describe('mortgage, sale, and spending', () => {
  it('splits a payment into interest and principal', () => {
    const result = amortizeMonth(218000, 0.02, 600, 0, false)
    expect(result.interest).toBeCloseTo(218000 * 0.02 / 12, 8)
    expect(result.principal).toBeCloseTo(600 - result.interest, 8)
    expect(result.balance).toBeCloseTo(218000 - result.principal, 8)
  })

  it('keeps the balance flat when the payment does not cover interest', () => {
    const held = amortizeMonth(1000, 0.12, 5, 0, false)
    expect(held.interest).toBeCloseTo(10, 8)
    expect(held.principal).toBe(0)
    expect(held.balance).toBe(1000)
    const rising = amortizeMonth(1000, 0.12, 5, 0, true)
    expect(rising.balance).toBeCloseTo(1005, 8)
  })

  it('does not treat insurance as principal', () => {
    const result = amortizeMonth(10000, 0, 600, 50, false)
    expect(result.principal).toBe(550)
    expect(result.balance).toBe(9450)
  })

  it('uses the standard level payment', () => {
    expect(levelPayment(218000, 0, 396)).toBeCloseTo(218000 / 396, 6)
    expect(levelPayment(100000, 0.06, 360)).toBeCloseTo(599.55, 2)
  })

  it('switches payment on the step-up date', () => {
    const config = tweak({
      returns: { realAnnual: 0 },
      income: { equityVestAmount: 0 },
      mortgage: { stepUpDate: '2026-12-01', stepUpPaymentOverride: 900 },
    })
    const points = project(config, spec({ id: 'step' }), 2)
    expect(points[0].date).toBe('2026-11')
    expect(points[0].housingPayment).toBe(600)
    expect(points[0].expenses).toBe(1700)
    expect(points[0].mortgageBalance).toBeCloseTo(218000 - (600 - 218000 * 0.02 / 12), 4)
    expect(points[1].housingPayment).toBe(900)
    expect(points[1].expenses).toBe(2000)
  })

  it('keeps a chosen savings amount when the mortgage payment rises', () => {
    const config = tweak({
      returns: { realAnnual: 0 },
      income: { equityVestAmount: 0 },
      assets: { liquid: 17500 },
      mortgage: { stepUpDate: '2026-12-01', stepUpPaymentOverride: 900 },
    })
    const saved = project(config, spec({ id: 'save-step', mode: 'savings', savingsMonthly: 800 }), 2)
    expect(saved[0].contribution).toBe(800)
    expect(saved[1].contribution).toBe(800)
    const flow = project(config, spec({ id: 'flow-step' }), 2)
    expect(flow[1].expenses).toBe(2000)
    expect(flow[1].contribution).toBe(500)
  })

  it('freezes the mortgage once a month is no longer covered', () => {
    const config = tweak({
      returns: { realAnnual: 0 },
      assets: { liquid: 1000, cashNotInMarket: 0 },
      income: { woltNetMonthly: 0, sideNetMonthly: 0, equityVestAmount: 0 },
      expenses: { maltaMonthly: 1700 },
    })
    const points = project(config, spec({ id: 'broke' }), 2)
    expect(points[0].ranOut).toBe(true)
    expect(points[0].liquid).toBe(0)
    expect(points[0].mortgageBalance).toBe(218000)
    expect(points[1].mortgageBalance).toBe(218000)
    expect(points[1].ranOut).toBe(false)
  })

  it('adds sale proceeds once and drops the home from net worth', () => {
    const config = tweak({
      returns: { realAnnual: 0 },
      income: { equityVestAmount: 0 },
    })
    const points = project(
      config,
      spec({ id: 'sale', sell: { month: '2026-11', rentMonthly: 0 } }),
      2,
    )
    expect(points[0].liquid).toBe(17500 + 1400 + 60000)
    expect(points[0].netWorth).toBe(points[0].liquid)
    expect(points[0].mortgageBalance).toBe(0)
    expect(points[0].apartmentEquity).toBe(0)
    expect(points[1].liquid).toBe(points[0].liquid + 1400)
    const kept = project(config, spec({ id: 'keep' }), 1)
    expect(kept[0].netWorth).toBeGreaterThan(kept[0].liquid)
  })

  it('uses the abroad figure, and can add the mortgage on top', () => {
    const config = tweak({
      returns: { realAnnual: 0 },
      income: { equityVestAmount: 0 },
      expenses: { abroadPatternFrom: '2026-11', abroadMonths: [11], addMortgageOnTopWhenAbroad: false },
    })
    const abroad = project(config, spec({ id: 'away', abroadFrom: '2026-11' }), 1)
    expect(abroad[0].expenses).toBe(2000)
    expect(abroad[0].contribution).toBe(500)
    const withMortgage = project(
      tweak({
        returns: { realAnnual: 0 },
        income: { equityVestAmount: 0 },
        expenses: { abroadPatternFrom: '2026-11', abroadMonths: [11], addMortgageOnTopWhenAbroad: true },
      }),
      spec({ id: 'away-plus', abroadFrom: '2026-11' }),
      1,
    )
    expect(withMortgage[0].expenses).toBe(2600)
  })

  it('cuts to lean mode and pauses the return when runway is under 9 months', () => {
    const config = tweak({
      returns: { realAnnual: 0.03 },
      assets: { liquid: 4000, cashNotInMarket: 0 },
      triggers: { runwayMonths: 9, pauseInvesting: true },
      expenses: { leanMonthly: 1200 },
    })
    const points = project(
      config,
      spec({
        id: 'rules',
        applyRules: true,
        jobLoss: {
          month: '2026-11',
          unemploymentMonths: 12,
          freelanceMonthly: 0,
          replacementMonthly: 0,
          lean: false,
        },
      }),
      1,
    )
    expect(points[0].lean).toBe(true)
    expect(points[0].expenses).toBe(1200)
    expect(points[0].liquid).toBeCloseTo(4000 - 950, 6)
  })
})

describe('goals and tax', () => {
  it('prices independence at the 4% rule', () => {
    expect(independenceTarget(25000, 0.04)).toBe(625000)
  })

  it('checks the August 2027 cash milestone on the current savings path', () => {
    const config = tweak({
      returns: { realAnnual: 0 },
      income: { stockPriceFactor: 1 },
      expenses: { actualCashSavedMonthly: 800 },
    })
    const points = project(config, spec({ id: 'plan', mode: 'savings', savingsMonthly: 800 }), 10)
    const august = pointOn(points, '2027-08')
    expect(august?.liquid).toBe(27900)
    const report = model(config).milestone
    expect(report.liquid).toBe(27900)
    expect(report.onTrack).toBe(false)
    expect(report.stretchOnTrack).toBe(false)
    expect(report.shortfall).toBe(2100)
  })

  it('converts the optional gross salaries with the 2026 single brackets', () => {
    const config = defaultConfig()
    expect(grossToNetMonthly(48000, config, false)).toBeCloseTo(3040.97, 2)
    expect(grossToNetMonthly(55000, config, false)).toBeCloseTo(3478.47, 2)
  })

  it('flags the promo rate as a placeholder and a higher step-up payment', () => {
    const preview = mortgagePreview(defaultConfig())
    expect(preview.monthlyInterest).toBeCloseTo(218000 * 0.02 / 12, 6)
    expect(preview.zeroInterestPayment).toBeCloseTo(218000 / 396, 6)
    expect(preview.stepUpMonth).toBe('2029-10')
    expect(preview.stepUpIsOverride).toBe(false)
    expect(preview.stepUpPayment).toBeGreaterThan(600)
  })
})

describe('vest timing and config file', () => {
  it('pays the next vest three months after October 2026, then every quarter', () => {
    expect(firstProjectedMonth('2026-10-18')).toBe('2026-11')
    expect(isVestMonth(0, 3, 3)).toBe(false)
    expect(isVestMonth(2, 3, 3)).toBe(true)
    expect(addMonths('2026-11', 2)).toBe('2027-01')
    expect(isVestMonth(5, 3, 3)).toBe(true)
  })

  it('matches public/config.json to the confirmed defaults', () => {
    const file = JSON.parse(readFileSync(new URL('../../public/config.json', import.meta.url), 'utf8'))
    expect(normalizeConfig(file)).toEqual(defaultConfig())
    expect(keyPaths(file).sort()).toEqual(keyPaths(defaultConfig()).sort())
  })

  it('does not add the vest twice when savings already include it', () => {
    const config = tweak({
      returns: { realAnnual: 0 },
      savingsAlreadyIncludeEquity: true,
    })
    const points = project(config, spec({ id: 'included', mode: 'savings', savingsMonthly: 800 }), 3)
    expect(pointOn(points, '2027-01')?.liquid).toBe(17500 + 2400)
  })

  it('builds the paths the page pins by default', () => {
    const ids = model(defaultConfig()).scenarios.map((scenario) => scenario.spec.id)
    expect(ids).toEqual(expect.arrayContaining(['base-800', 'job-6', 'job-12', 'worst', 'transition', 'upside-48k', 'sell', 'abroad']))
  })

  it('keeps the rules path from running out sooner than doing nothing', () => {
    const report = worstCase(defaultConfig())
    expect(report.shockMonth).toBe('2027-04')
    expect(report.unchanged.runsOutMonth).not.toBeNull()
    expect(report.withRules.runsOutMonth).not.toBeNull()
    expect(report.withRules.runsOutMonth! >= report.unchanged.runsOutMonth!).toBe(true)
    expect(report.leanFrom).not.toBeNull()
    expect(report.sold).toBeNull()
  })
})

function keyPaths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return []
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof child === 'object' && child !== null && !Array.isArray(child)) {
      return [path, ...keyPaths(child, path)]
    }
    return [path]
  })
}
