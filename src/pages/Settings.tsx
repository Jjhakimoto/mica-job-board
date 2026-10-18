import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Field, NumberInput } from '../components/Fields'
import { Shell } from '../components/Shell'
import { AREAS, normalize } from '../defaults'
import { todayISO } from '../dates'
import { useStore } from '../store'
import type { AreaId, Habit, HabitKind } from '../types'

function uid(): string {
  return crypto.randomUUID()
}

export function SettingsPage() {
  const { state, update, setDemoMode, resetDemo, replaceAll } = useStore()
  const [message, setMessage] = useState('')

  const exportFile = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `life-${todayISO()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Shell>
      <main className="page">
        <p>
          <Link to="/" className="text-link">
            Overview
          </Link>
        </p>
        <h1>Settings</h1>

        <section>
          <h2>Appearance</h2>
          <div className="chips">
            {(['system', 'light', 'dark'] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                aria-pressed={state.settings.theme === theme}
                onClick={() => update((s) => ({ ...s, settings: { ...s.settings, theme } }))}
              >
                {theme}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2>Demo</h2>
          <p className="quiet">Fills the screens with a made-up history so you can see the shape. Your real log stays put.</p>
          <div className="chips">
            <button type="button" aria-pressed={state.settings.demoMode} onClick={() => setDemoMode(!state.settings.demoMode)}>
              {state.settings.demoMode ? 'Demo on' : 'Demo off'}
            </button>
            {state.settings.demoMode && (
              <button type="button" onClick={resetDemo}>
                Reset demo
              </button>
            )}
          </div>
        </section>

        <section>
          <h2>Backup</h2>
          <p className="quiet">One JSON file. Nothing leaves this device unless you export it.</p>
          <div className="chips">
            <button type="button" onClick={exportFile}>
              Export
            </button>
            <label className="btn file-btn">
              Import
              <input
                type="file"
                accept="application/json"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  try {
                    const parsed = normalize(JSON.parse(await file.text()))
                    if (!parsed) {
                      setMessage('That file is not a Life backup.')
                      return
                    }
                    replaceAll(parsed)
                    setMessage('Imported. Demo is off.')
                  } catch {
                    setMessage('That file could not be read.')
                  }
                }}
              />
            </label>
          </div>
          {message && <p>{message}</p>}
        </section>

        <section>
          <h2>Reminder</h2>
          <p className="quiet">
            Shows in the app at this time, and as a notification if you allow it and the app is open. A closed phone is not pinged — there is no server.
          </p>
          <div className="form-grid">
            <Field label="Hour">
              <NumberInput
                value={state.settings.reminderHour}
                onChange={(n) => n != null && update((s) => ({ ...s, settings: { ...s.settings, reminderHour: Math.min(23, Math.max(0, n)) } }))}
              />
            </Field>
            <Field label="Minute">
              <NumberInput
                value={state.settings.reminderMinute}
                onChange={(n) => n != null && update((s) => ({ ...s, settings: { ...s.settings, reminderMinute: Math.min(59, Math.max(0, n)) } }))}
              />
            </Field>
          </div>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              if (!('Notification' in window)) {
                setMessage('This browser does not show notifications.')
                return
              }
              const permission = await Notification.requestPermission()
              update((s) => ({ ...s, settings: { ...s.settings, notifications: permission === 'granted' } }))
              setMessage(permission === 'granted' ? 'Notifications on while the app is open.' : 'Notifications stayed off.')
            }}
          >
            {state.settings.notifications ? 'Notifications on' : 'Allow notifications'}
          </button>
        </section>

        <section>
          <h2>Career target</h2>
          <Field label="Steps per 30 days for a full suggestion" hint="The wheel uses this. It does not nag.">
            <NumberInput
              value={state.targets.careerStepsPer30Days}
              onChange={(n) => n != null && update((s) => ({ ...s, targets: { careerStepsPer30Days: n } }))}
            />
          </Field>
        </section>

        <section>
          <h2>Habits</h2>
          {state.habits
            .filter((h) => h.active)
            .sort((a, b) => a.sort - b.sort)
            .map((habit) => (
              <HabitEditor key={habit.id} habit={habit} />
            ))}
          <AddHabit />
        </section>
        <p className="quiet">Finance numbers live on the finance page.</p>
        <Link to="/finances">Open finances</Link>
      </main>
    </Shell>
  )
}

function HabitEditor({ habit }: { habit: Habit }) {
  const { update } = useStore()
  const [armed, setArmed] = useState(false)
  const patch = (partial: Partial<Habit>) =>
    update((s) => ({ ...s, habits: s.habits.map((h) => (h.id === habit.id ? { ...h, ...partial } : h)) }))
  return (
    <div className="card pad habit-edit">
      <div className="form-grid">
        <Field label="Name">
          <input value={habit.name} onChange={(e) => patch({ name: e.target.value })} />
        </Field>
        <Field label="Kind">
          <select value={habit.kind} onChange={(e) => patch({ kind: e.target.value as HabitKind })}>
            <option value="boolean">Yes / no</option>
            <option value="count">Count</option>
            <option value="scale">Scale</option>
          </select>
        </Field>
        <Field label="Per week, for a full score">
          <NumberInput value={habit.targetPerWeek} onChange={(n) => n != null && patch({ targetPerWeek: n })} />
        </Field>
        <Field label="Area">
          <select value={habit.areaId ?? ''} onChange={(e) => patch({ areaId: (e.target.value || null) as AreaId | null })}>
            <option value="">None</option>
            {AREAS.map((area) => (
              <option key={area.id} value={area.id}>
                {area.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <label className="check">
        <input type="checkbox" checked={habit.inWeekScore} onChange={(e) => patch({ inWeekScore: e.target.checked })} />
        Counts toward the weekly total
      </label>
      {armed ? (
        <button
          type="button"
          className="text-btn"
          onClick={() => update((s) => ({ ...s, habits: s.habits.map((h) => (h.id === habit.id ? { ...h, active: false } : h)) }))}
        >
          Remove from the log
        </button>
      ) : (
        <button type="button" className="text-btn" onClick={() => setArmed(true)}>
          Remove
        </button>
      )}
    </div>
  )
}

function AddHabit() {
  const { update } = useStore()
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        const name = String(data.get('name') ?? '').trim()
        if (!name) return
        const kind = String(data.get('kind') ?? 'boolean') as HabitKind
        const habit: Habit = {
          id: uid(),
          name,
          kind,
          cadence: 'daily',
          min: kind === 'scale' ? 1 : 0,
          max: kind === 'scale' ? 3 : kind === 'count' ? 20 : 1,
          step: 1,
          hitAt: kind === 'count' ? 0 : kind === 'scale' ? 2 : 1,
          hitOp: kind === 'count' ? 'lte' : 'gte',
          targetPerWeek: 4,
          inWeekScore: true,
          areaId: null,
          unit: '',
          active: true,
          sort: 100,
        }
        update((s) => ({ ...s, habits: [...s.habits, habit] }))
        e.currentTarget.reset()
      }}
    >
      <Field label="New habit">
        <input name="name" placeholder="Name" />
      </Field>
      <Field label="Kind">
        <select name="kind" defaultValue="boolean">
          <option value="boolean">Yes / no</option>
          <option value="count">Count</option>
          <option value="scale">Scale</option>
        </select>
      </Field>
      <button type="submit" className="btn">
        Add
      </button>
    </form>
  )
}
