/** Local calendar dates as YYYY-MM-DD. No UTC shift. */

export function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(now = new Date()): string {
  return isoDate(now)
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

export function addMonthsISO(iso: string, months: number): string {
  const src = parseISODate(iso.length === 7 ? `${iso}-01` : iso)
  const day = src.getDate()
  const d = new Date(src.getFullYear(), src.getMonth(), 1)
  d.setMonth(d.getMonth() + months)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last))
  return isoDate(d)
}

export function diffDays(from: string, to: string): number {
  const a = parseISODate(from).getTime()
  const b = parseISODate(to).getTime()
  return Math.round((b - a) / 86_400_000)
}

/** Whole months until `to`, rounding up to the month that lands on or after it. */
export function monthsUntil(from: string, to: string): number {
  if (to <= from) return 0
  let m = 0
  while (addMonthsISO(from, m) < to && m < 1200) m += 1
  return m
}

export function mondayOf(iso: string): string {
  const d = parseISODate(iso)
  const day = d.getDay()
  const delta = day === 0 ? -6 : 1 - day
  return addDays(iso, delta)
}

export function eachDate(start: string, end: string): string[] {
  if (end < start) return []
  const out: string[] = []
  let d = start
  while (d <= end && out.length < 5000) {
    out.push(d)
    d = addDays(d, 1)
  }
  return out
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function previousMonthKey(iso: string): string {
  return monthKey(addMonthsISO(iso.length === 7 ? `${iso}-01` : iso, -1))
}

export function lastDayOfMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return isoDate(new Date(y, m, 0))
}

export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parseISODate(iso))
}

export function formatMonth(iso: string): string {
  const day = iso.length === 7 ? `${iso}-01` : iso
  return new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(parseISODate(day))
}

export function formatShort(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(parseISODate(iso))
}

export function ageOn(birth: string, on: string): number {
  let age = Number(on.slice(0, 4)) - Number(birth.slice(0, 4))
  if (on.slice(5) < birth.slice(5)) age -= 1
  return age
}

export function quarterIndex(iso: string): number {
  const month = Number(iso.slice(5, 7))
  return Math.floor((month - 1) / 3) + 1
}
