export type HabitKind = 'boolean' | 'count' | 'scale'
export type HitOp = 'gte' | 'lte' | 'eq'
export type Cadence = 'daily' | 'weekly'

export type AreaId =
  | 'health'
  | 'exercise'
  | 'nicotine'
  | 'diet'
  | 'reading'
  | 'music'
  | 'relationships'
  | 'balance'
  | 'finances'
  | 'career'

export interface Habit {
  id: string
  name: string
  kind: HabitKind
  cadence: Cadence
  min: number
  max: number
  step: number
  hitAt: number
  hitOp: HitOp
  /** Hits per week that count as 100% of the target. */
  targetPerWeek: number
  /** When true, each day can add one point to the weekly headline. */
  inWeekScore: boolean
  areaId: AreaId | null
  unit: string
  active: boolean
  sort: number
}

export interface DailyLog {
  date: string
  values: Record<string, number | null>
}

export interface WeeklyLog {
  weekStart: string
  reachedOut: boolean | null
  qualityTime: boolean | null
  energy: number | null
  workSustainable: boolean | null
  wentWell: string
  toChange: string
}

export interface MonthlyLog {
  month: string
  liquidBalance: number | null
  amountSaved: number | null
  ratings: Partial<Record<AreaId, number>>
}

export interface Book {
  id: string
  title: string
  author: string
  /** Null while the book is the one in progress. */
  finishedOn: string | null
}

export type CareerKind = 'application' | 'post' | 'conversation' | 'other'

export interface CareerEntry {
  id: string
  date: string
  kind: CareerKind
  text: string
}

export interface Person {
  id: string
  name: string
  lastContacted: string | null
  note: string
}

export interface FinanceConfig {
  /** Snapshot date for the opening numbers. */
  asOf: string
  woltNetMonthly: number
  doordashVestLow: number
  doordashVestHigh: number
  doordashEveryMonths: number
  /** Price move applied to DoorDash income. -0.5, 0, or 0.5. */
  doordashPriceShock: number
  c360Monthly: number
  liquid: number
  apartmentValue: number
  mortgageBalance: number
  /** Conservative cash if the apartment is sold. */
  saleNet: number
  expensesMalta: number
  /** null means not confirmed yet. */
  expensesIncludeMortgage: boolean | null
  mortgagePayment: number | null
  mortgageRateAnnual: number | null
  mortgageRemainingMonths: number | null
  mortgageStepUpDate: string | null
  mortgageStepUpPayment: number | null
  expensesAbroad: number
  actualSavingMonthly: number
  saveTargetMonthly: number
  liquidGoal: number
  liquidGoalIdeal: number
  goalDate: string
  birthDate: string
  independenceSpendYear: number
  withdrawalRate: number
  /** 0 or 0.02. Applied to earned-income scenarios, not the fixed savings grid. */
  incomeGrowth: number
  /** Annual real return. 0, 0.03, or 0.05. */
  realReturn: number
  /** 0 or -0.3, applied once at the start of long-range charts. */
  marketCrash: number
  leanExpenses: number
  roomRentMonthly: number | null
  rentAfterSaleMonthly: number | null
  freelanceMonthly: number
  c360ExtraMonthly: number | null
  partTimeWoltMonthly: number | null
  insyncFirstMonths: number
  insyncFirstNet: number
  insyncThenNet: number
  /** Net monthly pay. Blank until entered. Gross labels are not converted. */
  upside48kNetMonthly: number | null
  upside55kNetMonthly: number | null
}

export interface TriggerRules {
  leanRunwayMonths: number
  jobLossFreelanceMonth: number
  jobLossRoomMonth: number
  jobLossSaleDecisionMonth: number
  minOfferNetToLeaveWolt: number
  minRunwayMonthsToLeaveWolt: number
  sellEquityOnVest: boolean
}

export interface Targets {
  careerStepsPer30Days: number
}

export interface Settings {
  theme: 'light' | 'dark' | 'system'
  demoMode: boolean
  reminderHour: number
  reminderMinute: number
  notifications: boolean
}

export interface AppState {
  version: 1
  habits: Habit[]
  dailyLogs: DailyLog[]
  weeklyLogs: WeeklyLog[]
  monthlyLogs: MonthlyLog[]
  books: Book[]
  people: Person[]
  career: CareerEntry[]
  finance: FinanceConfig
  triggers: TriggerRules
  targets: Targets
  settings: Settings
}

export interface AreaDef {
  id: AreaId
  label: string
  hint: string
}
