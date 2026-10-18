export function eur(n: number, digits = 0): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n)
}

export function formatRunway(months: number | null): string {
  if (months == null) return 'Covered'
  if (!Number.isFinite(months)) return 'Covered'
  if (months >= 120) return '120+'
  return months.toFixed(1)
}
