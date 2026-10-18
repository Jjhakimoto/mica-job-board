import { addDays } from './dates'
import { isHit } from './scoring'
import type { DailyLog, Habit } from './types'

export interface Streaks {
  current: number
  best: number
}

/** An unlogged today does not break a run. A logged miss does. */
export function streaks(habit: Habit, logs: DailyLog[], today: string): Streaks {
  const map = new Map(logs.map((l) => [l.date, l.values[habit.id]]))
  let cursor = today
  if (map.get(cursor) == null) cursor = addDays(cursor, -1)

  let current = 0
  let guard = 0
  while (guard < 5000) {
    const value = map.get(cursor)
    if (value == null || !isHit(habit, value)) break
    current += 1
    cursor = addDays(cursor, -1)
    guard += 1
  }

  let best = 0
  let run = 0
  const dates = logs.map((l) => l.date).sort()
  if (dates.length) {
    let d = dates[0]
    const end = today
    let steps = 0
    while (d <= end && steps < 5000) {
      const value = map.get(d)
      const openToday = d === today && value == null
      if (openToday) {
        // leave the run as it is
      } else if (value != null && isHit(habit, value)) {
        run += 1
        if (run > best) best = run
      } else {
        run = 0
      }
      d = addDays(d, 1)
      steps += 1
    }
  }
  if (current > best) best = current
  return { current, best }
}
