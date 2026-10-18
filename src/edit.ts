import type { AppState, Book, CareerEntry, DailyLog, MonthlyLog, Person, WeeklyLog } from './types'

export function emptyWeek(weekStart: string): WeeklyLog {
  return {
    weekStart,
    reachedOut: null,
    qualityTime: null,
    energy: null,
    workSustainable: null,
    wentWell: '',
    toChange: '',
  }
}

export function emptyMonth(month: string): MonthlyLog {
  return { month, liquidBalance: null, amountSaved: null, ratings: {} }
}

export function withDaily(state: AppState, date: string, habitId: string, value: number | null): AppState {
  const logs = state.dailyLogs.slice()
  const i = logs.findIndex((l) => l.date === date)
  if (i === -1) {
    const created: DailyLog = { date, values: { [habitId]: value } }
    logs.push(created)
  } else {
    logs[i] = { ...logs[i], values: { ...logs[i].values, [habitId]: value } }
  }
  return { ...state, dailyLogs: logs }
}

export function withWeekly(state: AppState, weekStart: string, patch: Partial<WeeklyLog>): AppState {
  const logs = state.weeklyLogs.slice()
  const i = logs.findIndex((l) => l.weekStart === weekStart)
  const prev = i === -1 ? emptyWeek(weekStart) : logs[i]
  const next = { ...prev, ...patch, weekStart }
  if (i === -1) logs.push(next)
  else logs[i] = next
  return { ...state, weeklyLogs: logs }
}

export function withMonthly(state: AppState, month: string, patch: Partial<MonthlyLog>): AppState {
  const logs = state.monthlyLogs.slice()
  const i = logs.findIndex((l) => l.month === month)
  const prev = i === -1 ? emptyMonth(month) : logs[i]
  const ratings = patch.ratings ? { ...prev.ratings } : prev.ratings
  if (patch.ratings) {
    for (const [key, value] of Object.entries(patch.ratings)) {
      if (value == null) delete ratings[key as keyof typeof ratings]
      else ratings[key as keyof typeof ratings] = value
    }
  }
  const next: MonthlyLog = {
    ...prev,
    ...patch,
    month,
    ratings,
  }
  if (i === -1) logs.push(next)
  else logs[i] = next
  return { ...state, monthlyLogs: logs }
}

export function clearRating(state: AppState, month: string, areaId: keyof MonthlyLog['ratings']): AppState {
  const logs = state.monthlyLogs.slice()
  const i = logs.findIndex((l) => l.month === month)
  if (i === -1) return state
  const ratings = { ...logs[i].ratings }
  delete ratings[areaId]
  logs[i] = { ...logs[i], ratings }
  return { ...state, monthlyLogs: logs }
}

export function withBook(state: AppState, book: Book): AppState {
  const books = state.books.slice()
  const i = books.findIndex((b) => b.id === book.id)
  if (i === -1) books.push(book)
  else books[i] = book
  return { ...state, books }
}

export function withoutBook(state: AppState, id: string): AppState {
  return { ...state, books: state.books.filter((b) => b.id !== id) }
}

export function withPerson(state: AppState, person: Person): AppState {
  const people = state.people.slice()
  const i = people.findIndex((p) => p.id === person.id)
  if (i === -1) people.push(person)
  else people[i] = person
  return { ...state, people }
}

export function withoutPerson(state: AppState, id: string): AppState {
  return { ...state, people: state.people.filter((p) => p.id !== id) }
}

export function withCareer(state: AppState, entry: CareerEntry): AppState {
  const career = state.career.slice()
  const i = career.findIndex((c) => c.id === entry.id)
  if (i === -1) career.unshift(entry)
  else career[i] = entry
  return { ...state, career }
}

export function withoutCareer(state: AppState, id: string): AppState {
  return { ...state, career: state.career.filter((c) => c.id !== id) }
}
