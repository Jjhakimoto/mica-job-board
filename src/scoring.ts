import { addDays, eachDate, mondayOf, monthKey, previousMonthKey, lastDayOfMonth } from './dates'
import { AREA_SHORT, AREAS } from './defaults'
import { baseMonthlySpend, runwayMonths, toModel } from './finance/engine'
import type { AppState, AreaId, DailyLog, Habit, WeeklyLog } from './types'

export function isHit(habit: Habit, value: number | null | undefined): boolean {
  if (value == null || Number.isNaN(value)) return false
  if (habit.kind === 'boolean') return value >= 1
  if (habit.hitOp === 'lte') return value <= habit.hitAt
  if (habit.hitOp === 'eq') return value === habit.hitAt
  return value >= habit.hitAt
}

/** 0% of target → 1, 100% → 10. Above target stays at 10. */
export function suggestScore(ratio: number): number {
  const clamped = Math.max(0, Math.min(1, ratio))
  return Math.round((1 + 9 * clamped) * 10) / 10
}

export function hitRatio(habit: Habit, logs: DailyLog[], start: string, end: string): number {
  const map = new Map(logs.map((l) => [l.date, l]))
  const days = eachDate(start, end)
  let hits = 0
  for (const d of days) {
    if (isHit(habit, map.get(d)?.values[habit.id])) hits += 1
  }
  const expected = (days.length / 7) * habit.targetPerWeek
  if (expected <= 0) return 0
  return hits / expected
}

export function loggedCount(habit: Habit, logs: DailyLog[], start: string, end: string): number {
  const map = new Map(logs.map((l) => [l.date, l]))
  let n = 0
  for (const d of eachDate(start, end)) {
    if (map.get(d)?.values[habit.id] != null) n += 1
  }
  return n
}

export function weekScore(habits: Habit[], logs: DailyLog[], today: string): { hit: number; possible: number } {
  const scoring = habits.filter((h) => h.active && h.cadence === 'daily' && h.inWeekScore)
  const start = mondayOf(today)
  const days = eachDate(start, addDays(start, 6)).filter((d) => d <= today)
  const map = new Map(logs.map((l) => [l.date, l]))
  let hit = 0
  for (const d of days) {
    const log = map.get(d)
    for (const h of scoring) {
      if (log && isHit(h, log.values[h.id])) hit += 1
    }
  }
  return { hit, possible: scoring.length * 7 }
}

export interface Suggestion {
  score: number | null
  detail: string
}

function windowStart(today: string): string {
  return addDays(today, -29)
}

function habitSuggestion(habit: Habit, logs: DailyLog[], today: string): Suggestion {
  const start = windowStart(today)
  const logged = loggedCount(habit, logs, start, today)
  if (logged < 4) return { score: null, detail: 'Fewer than 4 logged days' }
  const ratio = hitRatio(habit, logs, start, today)
  return {
    score: suggestScore(ratio),
    detail: `${Math.round(ratio * 100)}% of ${habit.targetPerWeek}/week`,
  }
}

function average(nums: number[]): number {
  return nums.reduce((s, n) => s + n, 0) / nums.length
}

export function suggestAreas(state: AppState, today: string): Record<AreaId, Suggestion> {
  const start = windowStart(today)
  const out = {} as Record<AreaId, Suggestion>

  for (const area of AREAS) {
    if (area.id === 'relationships' || area.id === 'balance' || area.id === 'finances' || area.id === 'career') {
      continue
    }
    const linked = state.habits.filter((h) => h.active && h.areaId === area.id)
    if (!linked.length) {
      out[area.id] = { score: null, detail: 'Nothing linked yet' }
      continue
    }
    const parts = linked.map((h) => habitSuggestion(h, state.dailyLogs, today))
    const known = parts.filter((p) => p.score != null)
    if (!known.length) {
      out[area.id] = { score: null, detail: parts[0]?.detail ?? 'Not enough days yet' }
      continue
    }
    out[area.id] = {
      score: Math.round(average(known.map((p) => p.score as number)) * 10) / 10,
      detail: known.map((p) => p.detail).join(' · '),
    }
  }

  const weeks = state.weeklyLogs.filter((w) => w.weekStart >= addDays(start, -6) && w.weekStart <= today)
  out.relationships = relationshipSuggestion(weeks)
  out.balance = balanceSuggestion(weeks)
  out.career = careerSuggestion(state, start, today)
  out.finances = financeSuggestionFor(state, today)
  return out
}

function relationshipSuggestion(weeks: WeeklyLog[]): Suggestion {
  const usable = weeks.filter((w) => w.reachedOut != null || w.qualityTime != null)
  if (usable.length < 2) return { score: null, detail: 'A couple of Sundays will sketch this' }
  const rates: number[] = []
  const reach = usable.filter((w) => w.reachedOut != null)
  const time = usable.filter((w) => w.qualityTime != null)
  if (reach.length) rates.push(reach.filter((w) => w.reachedOut).length / reach.length)
  if (time.length) rates.push(time.filter((w) => w.qualityTime).length / time.length)
  const ratio = average(rates)
  return { score: suggestScore(ratio), detail: `${Math.round(ratio * 100)}% of recent weeks` }
}

function balanceSuggestion(weeks: WeeklyLog[]): Suggestion {
  const usable = weeks.filter((w) => w.workSustainable != null || w.energy != null)
  if (usable.length < 2) return { score: null, detail: 'A couple of Sundays will sketch this' }
  const rates: number[] = []
  const work = usable.filter((w) => w.workSustainable != null)
  const energy = usable.filter((w) => w.energy != null)
  if (work.length) rates.push(work.filter((w) => w.workSustainable).length / work.length)
  if (energy.length) rates.push(energy.filter((w) => (w.energy ?? 0) >= 3).length / energy.length)
  const ratio = average(rates)
  return { score: suggestScore(ratio), detail: `${Math.round(ratio * 100)}% of recent weeks` }
}

function careerSuggestion(state: AppState, start: string, today: string): Suggestion {
  const steps = state.career.filter((c) => c.date >= start && c.date <= today).length
  const anyLog = state.dailyLogs.some((d) => d.date >= start && d.date <= today) || state.career.length > 0
  if (!anyLog) return { score: null, detail: 'Steps will show up here' }
  const target = state.targets.careerStepsPer30Days
  const ratio = target <= 0 ? 0 : steps / target
  return { score: suggestScore(ratio), detail: `${steps} steps · target ${target} / 30 days` }
}

export function financeSuggestionFor(state: AppState, today: string): Suggestion {
  const model = toModel(state.finance, state.triggers, currentLiquid(state))
  const spend = baseMonthlySpend(model)
  const runway = runwayMonths(model.liquid, spend, 0)
  const saved = state.monthlyLogs.find((m) => m.month === monthKey(today))?.amountSaved
  const saving = saved ?? state.finance.actualSavingMonthly
  const target = state.finance.saveTargetMonthly
  const runwayRatio = runway == null ? 1 : Math.max(0, Math.min(1, runway / 12))
  const saveRatio = target <= 0 ? 0 : Math.max(0, Math.min(1, saving / target))
  const score = suggestScore((runwayRatio + saveRatio) / 2)
  const runwayText = runway == null ? 'spending covered' : `${runway.toFixed(1)} months of runway`
  return { score, detail: `${runwayText} · €${Math.round(saving)} saved vs €${Math.round(target)}` }
}

export interface AreaScore {
  id: AreaId
  label: string
  short: string
  hint: string
  suggested: number | null
  manual: number | null
  /** Manual wins when it is set. Null means there isn't a score yet. */
  score: number | null
  detail: string
}

export function currentLiquid(state: AppState): number {
  const logs = state.monthlyLogs
    .filter((m) => m.liquidBalance != null)
    .sort((a, b) => a.month.localeCompare(b.month))
  if (!logs.length) return state.finance.liquid
  return logs[logs.length - 1].liquidBalance as number
}

export function currentScores(state: AppState, today: string): AreaScore[] {
  const suggestions = suggestAreas(state, today)
  const manual = state.monthlyLogs.find((m) => m.month === monthKey(today))?.ratings ?? {}
  return AREAS.map((area) => {
    const suggested = suggestions[area.id].score
    const own = manual[area.id]
    const manualScore = own == null ? null : own
    return {
      id: area.id,
      label: area.label,
      short: AREA_SHORT[area.id],
      hint: area.hint,
      suggested,
      manual: manualScore,
      score: manualScore ?? suggested,
      detail: suggestions[area.id].detail,
    }
  })
}

export function lastMonthOverlay(state: AppState, today: string): Partial<Record<AreaId, number>> | null {
  const prev = previousMonthKey(today)
  const manual = state.monthlyLogs.find((m) => m.month === prev)?.ratings ?? {}
  const suggestions = suggestAreas(state, lastDayOfMonth(prev))
  const out: Partial<Record<AreaId, number>> = {}
  let n = 0
  for (const area of AREAS) {
    const own = manual[area.id]
    if (own != null) {
      out[area.id] = own
      n += 1
      continue
    }
    const suggested = suggestions[area.id].score
    if (suggested != null) {
      out[area.id] = suggested
      n += 1
    }
  }
  return n >= 4 ? out : null
}

export function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length
  if (n < 3 || ys.length !== n) return null
  let sx = 0
  let sy = 0
  let sxx = 0
  let syy = 0
  let sxy = 0
  for (let i = 0; i < n; i += 1) {
    sx += xs[i]
    sy += ys[i]
    sxx += xs[i] * xs[i]
    syy += ys[i] * ys[i]
    sxy += xs[i] * ys[i]
  }
  const cov = n * sxy - sx * sy
  const dx = n * sxx - sx * sx
  const dy = n * syy - sy * sy
  if (dx <= 1e-9 || dy <= 1e-9) return null
  return cov / Math.sqrt(dx * dy)
}

export function correlationPhrase(r: number | null, n: number): string {
  if (r == null || n < 8) return 'Not enough overlapping days yet.'
  if (Math.abs(r) < 0.2) return 'No clear pattern over these days.'
  if (r > 0) return 'These tend to move together.'
  return 'When one is higher, the other tends to be lower.'
}

export function correlateDaily(a: Habit, b: Habit, logs: DailyLog[], today: string, window = 90): { r: number | null; n: number } {
  const start = addDays(today, -(window - 1))
  const map = new Map(logs.map((l) => [l.date, l]))
  const xs: number[] = []
  const ys: number[] = []
  for (const d of eachDate(start, today)) {
    const log = map.get(d)
    const x = log?.values[a.id]
    const y = log?.values[b.id]
    if (x == null || y == null) continue
    xs.push(x)
    ys.push(y)
  }
  return { r: pearson(xs, ys), n: xs.length }
}

export function correlateWithEnergy(habit: Habit, daily: DailyLog[], weekly: WeeklyLog[]): { r: number | null; n: number } {
  const map = new Map(daily.map((l) => [l.date, l]))
  const xs: number[] = []
  const ys: number[] = []
  for (const w of weekly) {
    if (w.energy == null) continue
    const vals: number[] = []
    for (const d of eachDate(w.weekStart, addDays(w.weekStart, 6))) {
      const v = map.get(d)?.values[habit.id]
      if (v != null) vals.push(v)
    }
    if (!vals.length) continue
    xs.push(vals.reduce((s, v) => s + v, 0) / vals.length)
    ys.push(w.energy)
  }
  return { r: pearson(xs, ys), n: xs.length }
}

export interface WeekRate {
  week: string
  rate: number | null
  hits: number
}

export function weeklyHitRates(habit: Habit, logs: DailyLog[], today: string, weeks = 26): WeekRate[] {
  const startMonday = mondayOf(today)
  const map = new Map(logs.map((l) => [l.date, l]))
  const out: WeekRate[] = []
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const week = addDays(startMonday, -7 * i)
    const days = eachDate(week, addDays(week, 6)).filter((d) => d <= today)
    let logged = 0
    let hits = 0
    for (const d of days) {
      const v = map.get(d)?.values[habit.id]
      if (v == null) continue
      logged += 1
      if (isHit(habit, v)) hits += 1
    }
    out.push({ week, hits, rate: logged === 0 ? null : hits / logged })
  }
  return out
}

export function cellLevel(habit: Habit, value: number | null | undefined): 0 | 1 | 2 | 3 {
  if (value == null || Number.isNaN(value)) return 0
  if (habit.kind === 'scale') {
    const span = habit.max - habit.min || 1
    const t = (value - habit.min) / span
    if (t < 0.34) return 1
    if (t < 0.67) return 2
    return 3
  }
  return isHit(habit, value) ? 3 : 1
}
