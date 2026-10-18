import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const tooltipStyle = {
  contentStyle: {
    background: 'var(--bg-raised)',
    border: '1px solid var(--line)',
    borderRadius: 10,
    fontSize: 12,
    color: 'var(--ink)',
  },
  labelStyle: { color: 'var(--muted)' },
}

export function Sparkline({ data }: { data: { x: string; y: number | null }[] }) {
  const points = data.filter((d) => d.y != null)
  if (points.length < 2) return <p className="quiet">No monthly balances yet.</p>
  return (
    <div className="spark">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="y" stroke="var(--accent)" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function LinePane({
  data,
  lines,
  height = 220,
}: {
  data: Record<string, string | number | null>[]
  lines: { key: string; name: string; color?: string; dashed?: boolean }[]
  height?: number
}) {
  if (!data.length) return <p className="quiet">Nothing to draw yet.</p>
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
          <Tooltip {...tooltipStyle} />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.color ?? 'var(--accent)'}
              strokeWidth={1.6}
              dot={false}
              connectNulls
              strokeDasharray={line.dashed ? '4 4' : undefined}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BarPane({
  data,
  dataKey = 'value',
  height = 180,
}: {
  data: { label: string; value: number }[]
  dataKey?: string
  height?: number
}) {
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
          <Tooltip {...tooltipStyle} />
          <Bar dataKey={dataKey} fill="var(--accent)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
