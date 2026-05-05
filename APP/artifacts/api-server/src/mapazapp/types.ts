/**
 * Backend-only copies of dashboard mock shapes (mirrors `APP/artifacts/mapazapp/src/mock/types.ts`).
 * Keep aligned when mock fixtures change — see IMPLEMENTATION_ASSUMPTIONS (checkpoint 11).
 */

export type ZoneState =
  | "CREATED"
  | "WATCHING"
  | "RETESTING"
  | "CONFIRMED"
  | "TRADE_READY"
  | "INVALIDATED"
  | "EXPIRED"
  | "USED";

export type ZoneDirection = "BUY" | "SELL";

export type IFVGType = "BULLISH_IFVG" | "BEARISH_IFVG" | "BULLISH_IFVG_MITIGATED" | "BEARISH_IFVG_MITIGATED";

export interface Zone {
  id: string;
  strategy_id: string;
  parameter_set_id: string;
  symbol: string;
  direction: ZoneDirection;
  state: ZoneState;
  score: number;
  ifvgType: IFVGType;
  entryPrice: number;
  invalidationPrice: number;
  takeProfitPrice: number;
  riskRewardRatio: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  simpleDescription: string;
  notes?: string;
}

export type OperationalStatus =
  | "TRADING_ALLOWED"
  | "WATCH_ONLY"
  | "BLOCKED_DAILY_DRAWDOWN"
  | "BLOCKED_MAX_DRAWDOWN"
  | "BLOCKED_NEWS"
  | "BLOCKED_MAX_TRADES"
  | "BLOCKED_CONSISTENCY"
  | "BLOCKED_PSYCHOLOGY"
  | "BRIDGE_DISCONNECTED"
  | "NO_APPROVED_PARAMETER_SET";

export interface AccountRiskGuardState {
  accountId: string;
  operationalStatus: OperationalStatus;
  tradingAllowed: boolean;
  balance: number;
  equity: number;
  dailyStartBalance: number;
  dailyStartEquity: number;
  dailyLossLimitAmount: number;
  dailyLossLimitPercent: number;
  dailyLossUsedAmount: number;
  dailyLossUsedPercent: number;
  dailyLossRemainingAmount: number;
  dailyLossRemainingPercent: number;
  maxLossLimitAmount: number;
  maxLossLimitPercent: number;
  maxLossUsedAmount: number;
  maxLossRemainingAmount: number;
  riskPerTradePercent: number;
  tradesTakenToday: number;
  maxTradesPerDay: number;
  violations: string[];
  reason?: string;
}

export interface AccountPropFirmState {
  accountId: string;
  firmName: string;
  programName: string;
  challengePhase: string;
  accountSize: number;
  profitTargetAmount: number;
  profitTargetPercent: number;
  profitAchievedAmount: number;
  profitAchievedPercent: number;
  dailyDrawdownRule: number;
  maxDrawdownRule: number;
  consistencyEnabled: boolean;
  bestDayProfit: number;
  totalProfitForPhase: number;
  consistencyStatus: string;
  minimumTradingDaysRequired: number;
  currentTradingDays: number;
  profitableDaysRequired: number;
  currentProfitableDays: number;
  newsTradingAllowed: boolean;
  blackoutBeforeMinutes: number;
  blackoutAfterMinutes: number;
  status: string;
  warnings: string[];
}

export interface AccountSnapshot {
  accountId: string;
  displayName: string;
  broker: string;
  balance: number;
  equity: number;
  dailyPnL: number;
  dailyDrawdownPct: number;
  maxDrawdownPct: number;
  openTrades: number;
  currency: string;
  challenge: string;
}

export interface AppAccountConfig {
  accountId: string;
  displayName: string;
  firmName: string;
  brokerName: string;
  accountLogin: string;
  accountServer: string;
  accountSize: number;
  currency: string;
  challengePhase: string;
  status: "active" | "watch_only" | "archived";
  mode: "challenge" | "funded" | "demo" | "personal";
  riskProfileId: string;
  rulesProfileId: string;
}

export interface SymbolMapping {
  canonicalSymbol: string;
  brokerSymbol: string;
  accountId: string;
  brokerId: string;
  digits: number;
  point: number;
  tickSize: number;
  tickValue: number;
  lotStep: number;
}

export type BacktestStatus = "APPROVED" | "REJECTED" | "PENDING";

export interface BacktestTradeRow {
  id: string;
  entryTime: string;
  exitTime: string;
  direction: "BUY" | "SELL";
  entryPrice: number;
  exitPrice: number;
  pnlPct: number;
  outcome: string;
}

export interface BacktestParameterSetRow {
  id: string;
  name: string;
  strategy_id: string;
  status: BacktestStatus;
  winRate: number;
  profitFactor: number;
  maxDrawdownPct: number;
  totalTrades: number;
  netProfitPct: number;
  dateRangeFrom: string;
  dateRangeTo: string;
  symbol: string;
  timeframe: string;
  allowedAccountIds: string[];
  approvedAt?: string;
  rejectedReason?: string;
  trades?: BacktestTradeRow[];
}
