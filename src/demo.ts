import { addDays, addMonthsISO, eachDate, mondayOf, monthKey } from './dates'
import { defaultState } from './defaults'
import type { AppState, CareerEntry, DailyLog, Habit, WeeklyLog } from './types'

function mulberry32(seed: number) {
  let s = seed
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function demoValue(habit: Habit, rand: () => number): number | null {
  if (rand() < 0.12) return null
  if (habit.id === 'exercise') return rand() < 4 / 7 ? 1 : 0
  if (habit.id === 'nicotine') return rand() < 0.82 ? 0 : 1 + Math.floor(rand() * 3)
  if (habit.id === 'diet') {
    const r = rand()
    if (r < 0.15) return 1
    if (r < 0.7) return 2
    return 3
  }
  if (habit.id === 'reading') return rand() < 5 / 7 ? 1 : 0
  if (habit.id === 'music') return rand() < 3 / 7 ? 1 : 0
  if (habit.id === 'sleep') return Math.round((6.2 + rand() * 2.2) * 2) / 2
  if (habit.kind === 'boolean') return rand() < 0.6 ? 1 : 0
  if (habit.kind === 'scale') return habit.min + Math.floor(rand() * (habit.max - habit.min + 1))
  return habit.hitOp === 'lte' ? (rand() < 0.7 ? habit.hitAt : habit.hitAt + 1) : habit.hitAt
}

/** A stable, obviously fictional history so the screens can be looked at before any real days exist. */
export function buildDemo(base: AppState = defaultState(), today = '2026-10-18'): AppState {
  const rand = mulberry32(20261018)
  const habits = base.habits.filter((h) => h.active)
  const start = addDays(today, -119)
  const dailyLogs: DailyLog[] = eachDate(start, today).map((date) => {
    const values: Record<string, number | null> = {}
    for (const habit of habits) values[habit.id] = demoValue(habit, rand)
    return { date, values }
  })

  const weeklyLogs: WeeklyLog[] = []
  let week = mondayOf(start)
  const thisWeek = mondayOf(today)
  const notes = [
    ['Got outside most mornings', 'Evenings ran long'],
    ['Called home', 'Music sat untouched'],
    ['A quiet week, in a good way', 'Work crept into Saturday'],
    ['Finished a chapter', 'Skipped the walk twice'],
    ['Saw a friend', 'Sleep drifted late'],
  ]
  let i = 0
  while (week <= thisWeek) {
    const note = notes[i % notes.length]
    weeklyLogs.push({
      weekStart: week,
      reachedOut: rand() < 0.7,
      qualityTime: rand() < 0.75,
      energy: 2 + Math.floor(rand() * 3),
      workSustainable: rand() < 0.65,
      wentWell: note[0],
      toChange: note[1],
    })
    week = addDays(week, 7)
    i += 1
  }

  const monthlyLogs = []
  for (let m = 7; m >= 1; m -= 1) {
    const month = monthKey(addMonthsISO(today, -m))
    const liquid = Math.round(base.finance.liquid - m * 650 + rand() * 200)
    monthlyLogs.push({
      month,
      liquidBalance: liquid,
      amountSaved: 600 + Math.round(rand() * 350),
      ratings: m === 1 ? { health: 6, exercise: 7, reading: 6, finances: 6, relationships: 7 } : {},
    })
  }

  const career: CareerEntry[] = [
    { id: 'demo-c1', date: addDays(today, -4), kind: 'conversation', text: 'Coffee with a former teammate' },
    { id: 'demo-c2', date: addDays(today, -18), kind: 'post', text: 'Published a short note' },
    { id: 'demo-c3', date: addDays(today, -40), kind: 'application', text: 'Sent one application' },
    { id: 'demo-c4', date: addDays(today, -70), kind: 'other', text: 'Updated the portfolio page' },
  ]

  return {
    ...base,
    dailyLogs,
    weeklyLogs,
    monthlyLogs,
    books: [
      { id: 'demo-b1', title: 'The Summer Book', author: 'Tove Jansson', finishedOn: '2026-03-12' },
      { id: 'demo-b2', title: 'Drive Your Plow Over the Bones of the Dead', author: 'Olga Tokarczuk', finishedOn: '2026-07-02' },
      { id: 'demo-b3', title: 'The Living Mountain', author: 'Nan Shepherd', finishedOn: null },
    ],
    people: [
      { id: 'demo-p1', name: 'Mum', lastContacted: addDays(today, -12), note: '' },
      { id: 'demo-p2', name: 'Alex', lastContacted: addDays(today, -28), note: '' },
      { id: 'demo-p3', name: 'Nora', lastContacted: addDays(today, -51), note: 'Lives abroad' },
    ],
    career,
    settings: { ...base.settings, demoMode: true },
  }
}
