import { describe, expect, it } from 'vitest'
import { defaultState, normalize } from './defaults'
import { eachDate } from './dates'
import { correlateDaily, correlationPhrase, hitRatio, isHit, pearson, suggestAreas, suggestScore, weekScore } from './scoring'
import { streaks } from './streaks'
import type { DailyLog } from './types'

function fill(habitId: string, start: string, end: string, value: number | null, every = 1): DailyLog[] {
  return eachDate(start, end).filter((_, i) => i % every === 0).map((date) => ({
    date,
    values: { [habitId]: value },
  }))
}

describe('scores', () => {
  it('maps a ratio onto 1–10 without going past either end', () => {
    expect(suggestScore(0)).toBe(1)
    expect(suggestScore(0.5)).toBe(5.5)
    expect(suggestScore(1)).toBe(10)
    expect(suggestScore(1.4)).toBe(10)
  })

  it('treats nicotine-free as a hit and a cigarette as not', () => {
    const habit = defaultState().habits.find((h) => h.id === 'nicotine')!
    expect(isHit(habit, 0)).toBe(true)
    expect(isHit(habit, 2)).toBe(false)
    expect(isHit(habit, null)).toBe(false)
  })

  it('compares hits with the weekly target over 30 days', () => {
    const habit = defaultState().habits.find((h) => h.id === 'exercise')!
    const logs = fill('exercise', '2026-09-19', '2026-10-18', 1)
    expect(eachDate('2026-09-19', '2026-10-18')).toHaveLength(30)
    expect(hitRatio(habit, logs, '2026-09-19', '2026-10-18')).toBeCloseTo(30 / ((30 / 7) * 4), 6)
    const half = fill('exercise', '2026-09-21', '2026-10-18', 1, 2)
    const ratio = hitRatio(habit, half, '2026-09-21', '2026-10-18')
    expect(suggestScore(Math.min(1, ratio))).toBeGreaterThan(1)
  })

  it('scores a full default week out of 35 and leaves sleep out of that total', () => {
    const state = defaultState()
    const logs: DailyLog[] = eachDate('2026-10-12', '2026-10-18').map((date) => ({
      date,
      values: { exercise: 1, nicotine: 0, diet: 3, reading: 1, music: 1, sleep: 8 },
    }))
    expect(weekScore(state.habits, logs, '2026-10-18')).toEqual({ hit: 35, possible: 35 })
    const one = weekScore(state.habits, [{ date: '2026-10-18', values: { exercise: 1 } }], '2026-10-18')
    expect(one).toEqual({ hit: 1, possible: 35 })
  })

  it('keeps a manual rating separate from the suggestion', () => {
    const state = defaultState()
    state.monthlyLogs.push({
      month: '2026-10',
      liquidBalance: 17500,
      amountSaved: 800,
      ratings: { exercise: 4 },
    })
    const scores = suggestAreas(state, '2026-10-18')
    expect(scores.finances.score).not.toBeNull()
    expect(scores.exercise.score).toBeNull()
  })

  it('starts with an empty history', () => {
    const state = defaultState()
    expect(state.dailyLogs).toEqual([])
    expect(state.weeklyLogs).toEqual([])
    expect(normalize({ version: 2 })).toBeNull()
    const restored = normalize({ version: 1, finance: { liquid: 100 } })
    expect(restored?.finance.liquid).toBe(100)
    expect(restored?.finance.woltNetMonthly).toBe(2250)
    expect(restored?.dailyLogs).toEqual([])
  })
})

describe('streaks and correlation', () => {
  it('does not break a run just because today is still open', () => {
    const habit = defaultState().habits.find((h) => h.id === 'exercise')!
    const logs: DailyLog[] = [
      { date: '2026-10-15', values: { exercise: 1 } },
      { date: '2026-10-16', values: { exercise: 1 } },
      { date: '2026-10-17', values: { exercise: 1 } },
    ]
    expect(streaks(habit, logs, '2026-10-18')).toEqual({ current: 3, best: 3 })
    logs.push({ date: '2026-10-18', values: { exercise: 0 } })
    expect(streaks(habit, logs, '2026-10-18').current).toBe(0)
    expect(streaks(habit, logs, '2026-10-18').best).toBe(3)
  })

  it('describes a correlation without turning it into a verdict', () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8]
    expect(pearson(xs, xs)).toBeCloseTo(1, 8)
    expect(pearson(xs, xs.map((n) => -n))).toBeCloseTo(-1, 8)
    expect(correlationPhrase(0.8, 10)).toMatch(/together/)
    expect(correlationPhrase(-0.8, 10)).toMatch(/lower/)
    expect(correlationPhrase(0.05, 10)).toMatch(/No clear pattern/)
    expect(correlationPhrase(1, 3)).toMatch(/Not enough/)

    const exercise = defaultState().habits.find((h) => h.id === 'exercise')!
    const sleep = defaultState().habits.find((h) => h.id === 'sleep')!
    const logs: DailyLog[] = xs.map((n, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      values: { exercise: n, sleep: n + 6 },
    }))
    const found = correlateDaily(exercise, sleep, logs, '2026-10-08', 30)
    expect(found.n).toBe(8)
    expect(found.r).toBeCloseTo(1, 6)
  })
})
