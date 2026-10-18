import type {
  AppState,
  AreaDef,
  AreaId,
  FinanceConfig,
  Habit,
  Settings,
  Targets,
  TriggerRules,
} from './types'

export const AREAS: AreaDef[] = [
  { id: 'health', label: 'Health', hint: 'Sleep over the last 30 days' },
  { id: 'exercise', label: 'Exercise', hint: 'Days you moved, against the weekly target' },
  { id: 'nicotine', label: 'Nicotine', hint: 'Nicotine-free days' },
  { id: 'diet', label: 'Diet', hint: 'Days at 2 or 3' },
  { id: 'reading', label: 'Reading', hint: 'Days you read' },
  { id: 'music', label: 'Music', hint: 'Days you made or played music' },
  { id: 'relationships', label: 'Relationships', hint: 'Friends, family, and time with your girlfriend' },
  { id: 'balance', label: 'Life balance', hint: 'Sustainable hours and energy' },
  { id: 'finances', label: 'Finances', hint: 'Runway and saving against the monthly target' },
  { id: 'career', label: 'Career', hint: 'Concrete steps in the last 30 days' },
]

export const AREA_SHORT: Record<AreaId, string> = {
  health: 'Health',
  exercise: 'Exercise',
  nicotine: 'Nicotine',
  diet: 'Diet',
  reading: 'Reading',
  music: 'Music',
  relationships: 'People',
  balance: 'Balance',
  finances: 'Money',
  career: 'Career',
}

export function defaultFinance(): FinanceConfig {
  return {
    asOf: '2026-10-18',
    woltNetMonthly: 2250,
    doordashVestLow: 700,
    doordashVestHigh: 900,
    doordashEveryMonths: 3,
    doordashPriceShock: 0,
    c360Monthly: 250,
    liquid: 17500,
    apartmentValue: 300000,
    mortgageBalance: 218000,
    saleNet: 60000,
    expensesMalta: 1500,
    expensesIncludeMortgage: null,
    mortgagePayment: null,
    mortgageRateAnnual: null,
    mortgageRemainingMonths: null,
    mortgageStepUpDate: null,
    mortgageStepUpPayment: null,
    expensesAbroad: 2000,
    actualSavingMonthly: 800,
    saveTargetMonthly: 1000,
    liquidGoal: 30000,
    liquidGoalIdeal: 40000,
    goalDate: '2027-08-18',
    birthDate: '1997-08-18',
    independenceSpendYear: 25000,
    withdrawalRate: 0.04,
    incomeGrowth: 0,
    realReturn: 0.03,
    marketCrash: 0,
    leanExpenses: 1200,
    roomRentMonthly: null,
    rentAfterSaleMonthly: null,
    freelanceMonthly: 0,
    c360ExtraMonthly: null,
    partTimeWoltMonthly: null,
    insyncFirstMonths: 2,
    insyncFirstNet: 1500,
    insyncThenNet: 2500,
    upside48kNetMonthly: null,
    upside55kNetMonthly: null,
  }
}

export function defaultTriggers(): TriggerRules {
  return {
    leanRunwayMonths: 9,
    jobLossFreelanceMonth: 1,
    jobLossRoomMonth: 3,
    jobLossSaleDecisionMonth: 9,
    minOfferNetToLeaveWolt: 2500,
    minRunwayMonthsToLeaveWolt: 12,
    sellEquityOnVest: true,
  }
}

export function defaultTargets(): Targets {
  return { careerStepsPer30Days: 4 }
}

export function defaultSettings(): Settings {
  return {
    theme: 'system',
    demoMode: false,
    reminderHour: 21,
    reminderMinute: 30,
    notifications: false,
  }
}

export function defaultHabits(): Habit[] {
  return [
    {
      id: 'exercise',
      name: 'Exercise',
      kind: 'boolean',
      cadence: 'daily',
      min: 0,
      max: 1,
      step: 1,
      hitAt: 1,
      hitOp: 'gte',
      targetPerWeek: 4,
      inWeekScore: true,
      areaId: 'exercise',
      unit: '',
      active: true,
      sort: 0,
    },
    {
      id: 'nicotine',
      name: 'Nicotine',
      kind: 'count',
      cadence: 'daily',
      min: 0,
      max: 40,
      step: 1,
      hitAt: 0,
      hitOp: 'lte',
      targetPerWeek: 7,
      inWeekScore: true,
      areaId: 'nicotine',
      unit: '',
      active: true,
      sort: 1,
    },
    {
      id: 'diet',
      name: 'Ate decently',
      kind: 'scale',
      cadence: 'daily',
      min: 1,
      max: 3,
      step: 1,
      hitAt: 2,
      hitOp: 'gte',
      targetPerWeek: 6,
      inWeekScore: true,
      areaId: 'diet',
      unit: '',
      active: true,
      sort: 2,
    },
    {
      id: 'reading',
      name: 'Read',
      kind: 'boolean',
      cadence: 'daily',
      min: 0,
      max: 1,
      step: 1,
      hitAt: 1,
      hitOp: 'gte',
      targetPerWeek: 5,
      inWeekScore: true,
      areaId: 'reading',
      unit: '',
      active: true,
      sort: 3,
    },
    {
      id: 'music',
      name: 'Music',
      kind: 'boolean',
      cadence: 'daily',
      min: 0,
      max: 1,
      step: 1,
      hitAt: 1,
      hitOp: 'gte',
      targetPerWeek: 3,
      inWeekScore: true,
      areaId: 'music',
      unit: '',
      active: true,
      sort: 4,
    },
    {
      id: 'sleep',
      name: 'Sleep',
      kind: 'count',
      cadence: 'daily',
      min: 0,
      max: 14,
      step: 0.5,
      hitAt: 7,
      hitOp: 'gte',
      targetPerWeek: 7,
      inWeekScore: false,
      areaId: 'health',
      unit: 'h',
      active: true,
      sort: 5,
    },
  ]
}

export function defaultState(): AppState {
  return {
    version: 1,
    habits: defaultHabits(),
    dailyLogs: [],
    weeklyLogs: [],
    monthlyLogs: [],
    books: [],
    people: [],
    career: [],
    finance: defaultFinance(),
    triggers: defaultTriggers(),
    targets: defaultTargets(),
    settings: defaultSettings(),
  }
}

export function normalize(raw: unknown): AppState | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<AppState>
  if (r.version !== 1) return null
  const base = defaultState()
  return {
    version: 1,
    habits: Array.isArray(r.habits) ? r.habits : base.habits,
    dailyLogs: Array.isArray(r.dailyLogs) ? r.dailyLogs : [],
    weeklyLogs: Array.isArray(r.weeklyLogs) ? r.weeklyLogs : [],
    monthlyLogs: Array.isArray(r.monthlyLogs) ? r.monthlyLogs : [],
    books: Array.isArray(r.books) ? r.books : [],
    people: Array.isArray(r.people) ? r.people : [],
    career: Array.isArray(r.career) ? r.career : [],
    finance: { ...base.finance, ...(r.finance ?? {}) },
    triggers: { ...base.triggers, ...(r.triggers ?? {}) },
    targets: { ...base.targets, ...(r.targets ?? {}) },
    settings: { ...base.settings, ...(r.settings ?? {}) },
  }
}
