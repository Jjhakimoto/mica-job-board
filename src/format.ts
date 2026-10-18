const whole = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

export function euro(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return whole.format(value)
}

export function monthsLabel(value: number): string {
  if (!Number.isFinite(value)) return 'Covered'
  const rounded = Math.round(value * 10) / 10
  const text = rounded.toLocaleString('en-IE', { maximumFractionDigits: 1 })
  return `${text} ${rounded === 1 ? 'month' : 'months'}`
}

export function longDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  if (!year || !month || !day) return iso
  return `${day} ${names[month - 1]} ${year}`
}

export function percent(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '—'
  return `${(value * 100).toLocaleString('en-IE', { maximumFractionDigits: digits })}%`
}
