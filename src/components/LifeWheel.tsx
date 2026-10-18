import type { AreaScore } from '../scoring'

interface Spoke {
  id: string
  label: string
  score: number | null
  last: number | null
}

export function LifeWheel({ spokes }: { spokes: Spoke[] }) {
  const size = 280
  const cx = size / 2
  const cy = size / 2
  const radius = 78
  const levels = [2, 4, 6, 8, 10]
  const angle = (index: number) => -Math.PI / 2 + (index * 2 * Math.PI) / spokes.length
  const at = (index: number, value: number, extra = 0) => {
    const a = angle(index)
    const r = (value / 10) * radius + extra
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const
  }
  const ring = (key: 'score' | 'last') => {
    if (spokes.some((s) => s[key] == null)) return null
    return spokes.map((s, i) => at(i, s[key] as number).join(',')).join(' ')
  }
  const current = ring('score')
  const previous = ring('last')
  const known = spokes.filter((s) => s.score != null).length

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="wheel-svg" role="img" aria-label="Life wheel">
      {levels.map((level) => (
        <circle key={level} cx={cx} cy={cy} r={(radius * level) / 10} className="wheel-ring" />
      ))}
      {spokes.map((spoke, i) => {
        const [x, y] = at(i, 10)
        return <line key={spoke.id} x1={cx} y1={cy} x2={x} y2={y} className="wheel-spoke" />
      })}
      {previous && <polygon points={previous} className="wheel-last" />}
      {current && <polygon points={current} className="wheel-now" />}
      {spokes.map((spoke, i) => {
        if (spoke.score == null || current) return null
        const [x, y] = at(i, spoke.score)
        return <circle key={spoke.id} cx={x} cy={y} r={3.5} className="wheel-dot" />
      })}
      {spokes.map((spoke, i) => {
        const [x, y] = at(i, 10, 18)
        return (
          <text key={spoke.id} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="wheel-label">
            {spoke.label}
          </text>
        )
      })}
      {known === 0 && (
        <text x={cx} y={cy} textAnchor="middle" className="wheel-empty">
          A few weeks will draw this
        </text>
      )}
    </svg>
  )
}

export function spokesFrom(scores: AreaScore[], overlay: Partial<Record<string, number>> | null): Spoke[] {
  return scores.map((s) => ({
    id: s.id,
    label: s.short,
    score: s.score,
    last: overlay?.[s.id] ?? null,
  }))
}
