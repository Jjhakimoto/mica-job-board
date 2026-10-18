import { useEffect, useState, type ReactNode } from 'react'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
}

export function NumberInput({
  value,
  onChange,
  allowEmpty = false,
  step = 1,
}: {
  value: number | null
  onChange: (value: number | null) => void
  allowEmpty?: boolean
  step?: number
}) {
  const [text, setText] = useState(value == null ? '' : String(value))
  useEffect(() => {
    setText(value == null ? '' : String(value))
  }, [value])
  return (
    <input
      inputMode="decimal"
      step={step}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (text.trim() === '') {
          if (allowEmpty) onChange(null)
          else setText(value == null ? '' : String(value))
          return
        }
        const n = Number(text)
        if (Number.isFinite(n)) onChange(n)
        else setText(value == null ? '' : String(value))
      }}
    />
  )
}
