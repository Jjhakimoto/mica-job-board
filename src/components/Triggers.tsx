import { useApp } from '../app-state'
import { euro } from '../format'
import { NumberField, ToggleField } from './Fields'

export function Triggers() {
  const { config, update } = useApp()

  return (
    <section className="card" aria-labelledby="rules-title">
      <p className="kicker">If things go wrong</p>
      <h2 id="rules-title">Trigger rules</h2>
      <p className="quiet">
        The worst-case card dates these rules. Edit the words here. The numbers beside them are what the chart uses.
      </p>
      <div className="fields">
        <NumberField
          label="Lean mode when runway is under"
          value={config.triggers.runwayMonths}
          suffix="months"
          onChange={(runwayMonths) => update((c) => ({ ...c, triggers: { ...c.triggers, runwayMonths } }))}
        />
        <NumberField
          label="Rent the room from unemployment month"
          value={config.triggers.roomFromUnemploymentMonth}
          min={1}
          onChange={(roomFromUnemploymentMonth) =>
            update((c) => ({ ...c, triggers: { ...c.triggers, roomFromUnemploymentMonth } }))
          }
        />
        <NumberField
          label="Decide on selling in unemployment month"
          value={config.triggers.sellDecisionUnemploymentMonth}
          min={1}
          onChange={(sellDecisionUnemploymentMonth) =>
            update((c) => ({ ...c, triggers: { ...c.triggers, sellDecisionUnemploymentMonth } }))
          }
        />
        <NumberField
          label="Minimum net to leave Wolt"
          value={config.triggers.minNetToLeave}
          suffix="€"
          onChange={(minNetToLeave) => update((c) => ({ ...c, triggers: { ...c.triggers, minNetToLeave } }))}
        />
        <NumberField
          label="Minimum runway to leave"
          value={config.triggers.minRunwayToLeaveMonths}
          suffix="months"
          onChange={(minRunwayToLeaveMonths) =>
            update((c) => ({ ...c, triggers: { ...c.triggers, minRunwayToLeaveMonths } }))
          }
        />
        <ToggleField
          label="Pause investing when runway is short"
          checked={config.triggers.pauseInvesting}
          hint="New money stays in cash, and the market return is skipped, while runway is under the line."
          onChange={(pauseInvesting) => update((c) => ({ ...c, triggers: { ...c.triggers, pauseInvesting } }))}
        />
        <ToggleField
          label="Sell DoorDash equity on vest"
          checked={config.triggers.sellEquityOnVest}
          hint={
            config.triggers.sellEquityOnVest
              ? 'The chart adds each vest to the diversified pot.'
              : 'The chart still adds each vest to the diversified pot. A separate DoorDash holding is not modelled, because today’s liquid balance is not split out.'
          }
          onChange={(sellEquityOnVest) => update((c) => ({ ...c, triggers: { ...c.triggers, sellEquityOnVest } }))}
        />
      </div>
      <div className="rules">
        {config.triggers.lines.map((line, index) => (
          <label key={index} className="field">
            <span>Rule {index + 1}</span>
            <textarea
              rows={2}
              value={line}
              onChange={(event) =>
                update((c) => ({
                  ...c,
                  triggers: {
                    ...c.triggers,
                    lines: c.triggers.lines.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)),
                  },
                }))
              }
            />
          </label>
        ))}
      </div>
      <p className="quiet">Lean spending is {euro(config.expenses.leanMonthly)}, edited under Assumptions. It includes the mortgage.</p>
    </section>
  )
}
