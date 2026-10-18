import { describe, expect, it } from 'vitest'
import { defaultFinance, defaultTriggers } from '../defaults'
import { addMonthsISO } from '../dates'
import {
  amortizeOneMonth,
  birthdayMilestone,
  doordashPerMonth,
  jobLossPath,
  monthlyRate,
  monthlySpendAfterSale,
  offerClearsRule,
  paymentForGoal,
  planSeries,
  projectMonths,
  runwayMonths,
  savingsTable,
  theoreticalSurplus,
  toModel,
  worstRealistic,
} from './engine'

function model(patch: Partial<ReturnType<typeof defaultFinance>> = {}) {
  return toModel({ ...defaultFinance(), ...patch }, defaultTriggers())
}

describe('monthly compounding', () => {
  it('turns a 3% real year into twelve monthly steps that land on 3%', () => {
    const r = monthlyRate(0.03)
    expect((1 + r) ** 12).toBeCloseTo(1.03, 10)
    const points = projectMonths({
      startDate: '2026-10-18',
      months: 12,
      startLiquid: 10_000,
      annualRealReturn: 0.03,
      step: () => ({ contribution: 0 }),
    })
    expect(points[12].liquid).toBeCloseTo(10_300, 6)
  })

  it('adds a fixed contribution with no return', () => {
    const points = projectMonths({
      startDate: '2026-10-18',
      months: 12,
      startLiquid: 17_500,
      annualRealReturn: 0,
      step: () => ({ contribution: 800 }),
    })
    expect(points[12].liquid).toBeCloseTo(17_500 + 800 * 12, 6)
  })

  it('applies a crash once, at the start', () => {
    const points = projectMonths({
      startDate: '2026-10-18',
      months: 0,
      startLiquid: 10_000,
      annualRealReturn: 0.03,
      crash: -0.3,
      step: () => ({ contribution: 0 }),
    })
    expect(points[0].liquid).toBeCloseTo(7_000, 6)
  })

  it('finds the monthly saving that hits a goal', () => {
    const pmt = paymentForGoal(17_500, 30_000, 0, 10)
    expect(pmt).toBeCloseTo((30_000 - 17_500) / 10, 8)
    const withReturn = paymentForGoal(10_000, 20_000, 0.03, 24)
    const landed = projectMonths({
      startDate: '2026-10-18',
      months: 24,
      startLiquid: 10_000,
      annualRealReturn: 0.03,
      step: () => ({ contribution: withReturn }),
    })
    expect(landed[24].liquid).toBeCloseTo(20_000, 4)
  })
})

describe('opening numbers', () => {
  it('uses the midpoint of the DoorDash vest', () => {
    expect(doordashPerMonth(700, 900, 3, 0)).toBeCloseTo(800 / 3, 8)
    expect(doordashPerMonth(700, 900, 3, -0.5)).toBeCloseTo(400 / 3, 8)
  })

  it('shows the gap against a €1,500 spend when the mortgage is unconfirmed', () => {
    const s = theoreticalSurplus(model())
    expect(s.income).toBeCloseTo(2250 + 800 / 3 + 250, 6)
    expect(s.surplus).toBeCloseTo(s.income - 1500, 6)
    expect(s.gap).toBeCloseTo(s.surplus - 800, 6)
    expect(s.gap).toBeGreaterThan(400)
    expect(s.gap).toBeLessThan(550)
  })

  it('adds the mortgage only after you say it sits on top', () => {
    const s = theoreticalSurplus(model({ expensesIncludeMortgage: false, mortgagePayment: 700 }))
    expect(s.expenses).toBe(2200)
  })

  it('computes the four runways from liquid and spend', () => {
    const m = model()
    expect(runwayMonths(m.liquid, 1500, 0)).toBeCloseTo(17500 / 1500, 8)
    expect(runwayMonths(m.liquid, 1500, 250)).toBeCloseTo(17500 / 1250, 8)
    expect(runwayMonths(m.liquid, 200, 250)).toBeNull()
    expect(runwayMonths(0, 1500, 0)).toBe(0)
  })
})

describe('worst realistic case', () => {
  it('follows the written triggers and does not invent rent or freelance', () => {
    const result = worstRealistic(model(), '2026-10-18', 36)
    expect(result.runsOutMonth).toBe(17)
    expect(result.runsOutDate).toBe(addMonthsISO('2026-10-18', 17))
    expect(result.events.find((e) => e.id === 'lean')).toMatchObject({ applied: true, month: 7 })
    expect(result.events.find((e) => e.id === 'room')?.applied).toBe(false)
    expect(result.events.find((e) => e.id === 'sale')?.applied).toBe(false)
    expect(result.events.find((e) => e.id === 'c360')?.applied).toBe(false)
    expect(result.series[0].liquid).toBe(17500)
    expect(result.series[6].liquid).toBeCloseTo(10000, 6)
  })

  it('counts a sale only when rent and the mortgage are both set', () => {
    expect(monthlySpendAfterSale(model())).toBeNull()
    const ready = model({
      expensesIncludeMortgage: true,
      mortgagePayment: 700,
      rentAfterSaleMonthly: 900,
    })
    expect(monthlySpendAfterSale(ready)).toBe(1500 - 700 + 900)
    const result = worstRealistic(ready, '2026-10-18', 36)
    expect(result.events.find((e) => e.id === 'sale')?.applied).toBe(true)
    const sale = result.events.find((e) => e.id === 'sale')
    expect(sale).toBeTruthy()
    const atSale = result.series[sale!.month].liquid
    const before = result.series[sale!.month - 1].liquid
    expect(atSale).toBeGreaterThan(before + 50_000)
  })
})

describe('scenarios stay in today euros', () => {
  it('builds the savings grid at 0% and at 3%', () => {
    const flat = savingsTable({ ...model(), realReturn: 0, marketCrash: 0 }, '2026-10-18', [800], [5])
    expect(flat[0].byYear[5]).toBeCloseTo(17500 + 800 * 60, 4)
    const grown = savingsTable({ ...model(), realReturn: 0.03, marketCrash: 0 }, '2026-10-18', [0], [1])
    expect(grown[0].byYear[1]).toBeCloseTo(17500 * 1.03, 4)
  })

  it('drops liquid 30% when job loss is paired with a crash', () => {
    const plain = jobLossPath(model(), '2026-10-18', { gapMonths: 6, lean: false, crash: 0, horizon: 6 })
    const crashed = jobLossPath(model(), '2026-10-18', { gapMonths: 6, lean: false, crash: -0.3, horizon: 6 })
    expect(crashed[0].liquid).toBeCloseTo(plain[0].liquid * 0.7, 6)
  })

  it('checks the Wolt offer rule', () => {
    const m = model()
    expect(offerClearsRule(2500, false, 6, m)).toBe(true)
    expect(offerClearsRule(2499, false, 20, m)).toBe(false)
    expect(offerClearsRule(2499, true, 12, m)).toBe(false)
    expect(offerClearsRule(2499, true, 12.1, m)).toBe(true)
    expect(offerClearsRule(2000, true, null, m)).toBe(true)
  })
})

describe('milestones', () => {
  it('projects the 30th birthday from the saving rate on file', () => {
    const m = { ...model(), realReturn: 0, marketCrash: 0 }
    const mark = birthdayMilestone(m, '2026-10-18')
    expect(mark.days).toBe(304)
    expect(mark.months).toBe(10)
    expect(mark.projected).toBeCloseTo(17500 + 800 * 10, 4)
    expect(mark.onTrack).toBe(mark.projected >= 30_000)
  })

  it('lines actual balances up against a monthly plan, including a skipped month', () => {
    const rows = planSeries(
      [
        { month: '2026-10', liquid: 17500 },
        { month: '2026-12', liquid: 19000 },
      ],
      1000,
    )
    expect(rows.map((r) => r.month)).toEqual(['2026-10', '2026-11', '2026-12'])
    expect(rows[1].actual).toBeNull()
    expect(rows[2].plan).toBe(19500)
  })
})

describe('amortization', () => {
  it('reduces the balance by principal after interest', () => {
    const next = amortizeOneMonth(218_000, 0.03, 1000)
    const interest = 218_000 * 0.03 / 12
    expect(next).toBeCloseTo(218_000 - (1000 - interest), 6)
  })

  it('leaves the balance alone when the rate or payment is missing', () => {
    expect(amortizeOneMonth(218_000, null, 1000)).toBe(218_000)
  })
})
