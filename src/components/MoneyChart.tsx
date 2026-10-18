import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { euro } from '../format'
import { monthLabel } from '../model/finance'

export type ChartSeries = {
  key: string
  name: string
  color: string
  dots?: boolean
}

type Row = Record<string, string | number | null>

type TipPayload = {
  name?: string
  value?: number | string
  color?: string
}

function Tip({ active, payload, label }: { active?: boolean; payload?: TipPayload[]; label?: string }) {
  if (!active || !payload?.length || !label) return null
  return (
    <div className="tip">
      <strong>{monthLabel(String(label))}</strong>
      {payload.map((item) => (
        <div key={item.name}>
          <i style={{ background: item.color }} />
          <span>{item.name}</span>
          <b>{euro(Number(item.value))}</b>
        </div>
      ))}
    </div>
  )
}

function axisEuro(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1000) return `€${Math.round(value / 1000)}k`
  return `€${Math.round(value)}`
}

export function MoneyChart({ rows, series, label }: { rows: Row[]; series: ChartSeries[]; label: string }) {
  return (
    <div className="chart" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => monthLabel(String(value))}
            minTickGap={36}
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 'auto']}
            tickFormatter={axisEuro}
            width={56}
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<Tip />} />
          {series.map((item) => (
            <Line
              key={item.key}
              type="monotone"
              dataKey={item.key}
              name={item.name}
              stroke={item.color}
              strokeWidth={2.25}
              dot={item.dots ? { r: 3.5, strokeWidth: 0, fill: item.color } : false}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
