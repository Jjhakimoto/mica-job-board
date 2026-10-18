type NumberProps = {
  label: string
  value: number
  onChange: (value: number) => void
  hint?: string
  step?: number
  min?: number
  max?: number
  suffix?: string
}

export function NumberField({ label, value, onChange, hint, step, min, max, suffix }: NumberProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <span className="input-row">
        <input
          type="number"
          inputMode="decimal"
          autoComplete="off"
          value={Number.isFinite(value) ? value : 0}
          step={step ?? 1}
          min={min}
          max={max}
          onChange={(event) => {
            const next = event.target.value === '' ? 0 : Number(event.target.value)
            if (Number.isFinite(next)) onChange(next)
          }}
        />
        {suffix ? <span className="suffix">{suffix}</span> : null}
      </span>
      {hint ? <small>{hint}</small> : null}
    </label>
  )
}

export function PercentField({
  label,
  value,
  onChange,
  hint,
  step = 0.1,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  hint?: string
  step?: number
}) {
  const shown = Math.round(value * 1000) / 10
  return (
    <NumberField
      label={label}
      value={shown}
      step={step}
      suffix="%"
      hint={hint}
      onChange={(next) => onChange(next / 100)}
    />
  )
}

export function MonthField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="month" value={value} onChange={(event) => onChange(event.target.value)} />
      {hint ? <small>{hint}</small> : null}
    </label>
  )
}

export function TextField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="text" value={value} autoComplete="off" onChange={(event) => onChange(event.target.value)} />
      {hint ? <small>{hint}</small> : null}
    </label>
  )
}

export function OptionalNumberField({
  label,
  value,
  onChange,
  hint,
  placeholder = 'Not set',
}: {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  hint?: string
  placeholder?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        value={value ?? ''}
        onChange={(event) => {
          if (event.target.value === '') onChange(null)
          else {
            const next = Number(event.target.value)
            if (Number.isFinite(next)) onChange(next)
          }
        }}
      />
      {hint ? <small>{hint}</small> : null}
    </label>
  )
}

export function ToggleField({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  hint?: string
}) {
  return (
    <label className="toggle-field">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>
        <strong>{label}</strong>
        {hint ? <small>{hint}</small> : null}
      </span>
    </label>
  )
}

export function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: number
  options: { value: number; label: string }[]
  onChange: (value: number) => void
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      <span>{label}</span>
      <div>
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={Math.abs(option.value - value) < 0.0001}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
