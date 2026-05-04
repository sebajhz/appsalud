// ─── Primitive enums ────────────────────────────────────────────────────────

export type ZoneState = 'CREATED' | 'WATCHING' | 'RETESTING' | 'CONFIRMED' | 'TRADE_READY' | 'INVALIDATED' | 'EXPIRED' | 'USED';
export type ZoneDirection = 'BUY' | 'SELL';
export type RiskState = 'OK' | 'WARNING' | 'BLOCKED';
export type BridgeState = 'BRIDGE_OK' | 'BRIDGE_STALE' | 'BRIDGE_DOWN' | 'MT5_DISCONNECTED';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type BacktestStatus = 'APPROVED' | 'REJECTED' | 'PENDING';
export type IFVGType = 'BULLISH_IFVG' | 'BEARISH_IFVG' | 'BULLISH_IFVG_MITIGATED' | 'BEARISH_IFVG_MITIGATED';

export type OperationalStatus =
  | 'TRADING_ALLOWED'
  | 'WATCH_ONLY'
  | 'BLOCKED_DAILY_DRAWDOWN'
  | 'BLOCKED_MAX_DRAWDOWN'
  | 'BLOCKED_NEWS'
  | 'BLOCKED_MAX_TRADES'
  | 'BLOCKED_CONSISTENCY'
  | 'BLOCKED_PSYCHOLOGY'
  | 'BRIDGE_DISCONNECTED'
  | 'NO_APPROVED_PARAMETER_SET';

// ─── Multi-account configuration ────────────────────────────────────────────

export interface AccountConfig {
  accountId: string;
  displayName: string;
  firmName: string;
  brokerName: string;
  accountLogin: string;
  accountServer: string;
  accountSize: number;
  currency: string;
  challengePhase: string;
  status: 'active' | 'watch_only' | 'archived';
  mode: 'challenge' | 'funded' | 'demo' | 'personal';
  riskProfileId: string;
  rulesProfileId: string;
}

export interface RiskProfile {
  id: string;
  name: string;
  maxDailyDrawdownPct: number;
  maxTotalDrawdownPct: number;
  maxOpenRiskPct: number;
  maxTradesPerDay: number;
  riskPerTradePct: number;
}

export interface RulesProfile {
  id: string;
  name: string;
  firmName: string;
  programName: string;
  profitTargetPct: number;
  maxDailyLossPct: number;
  maxTotalLossPct: number;
  consistencyEnabled: boolean;
  minimumTradingDaysRequired: number;
  profitableDaysRequired: number;
  newsTradingAllowed: boolean;
  blackoutBeforeMinutes: number;
  blackoutAfterMinutes: number;
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

// ─── App Config ──────────────────────────────────────────────────────────────

export interface AppConfig {
  accounts: AccountConfig[];
  activeAccountId: string;
  riskProfiles: RiskProfile[];
  rulesProfiles: RulesProfile[];
  symbolMappings: SymbolMapping[];
  notifications: {
    bridgeDown: boolean;
    zoneReady: boolean;
    riskWarning: boolean;
    propFirmAlert: boolean;
  };
  zoneScoring: {
    minScoreForWatching: number;
    minScoreForConfirmed: number;
    minScoreForTradeReady: number;
  };
}

// ─── Bridge (multi-terminal) ─────────────────────────────────────────────────

export interface BridgeTerminal {
  terminalId: string;
  accountId: string;
  accountLogin: string;
  accountServer: string;
  brokerName: string;
  state: BridgeState;
  lastUpdate: string;
  staleSince?: string;
  symbolsEnabled: string[];
  symbolTicks: { symbol: string; lastTick: string; freshness: 'FRESH' | 'STALE' | 'MISSING' }[];
  connectionLog: { timestamp: string; message: string; level: 'INFO' | 'WARN' | 'ERROR' }[];
}

// Keep legacy alias for bridge used in old code
export type BridgeStatus = BridgeTerminal;

// ─── Account Snapshot (per account) ─────────────────────────────────────────

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
  challenge: string; // derived label, e.g. "Phase 1 - The5ers 100k"
}

// ─── Risk Guard (account-scoped) ─────────────────────────────────────────────

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
  violations: { rule: string; description: string; triggeredAt: string }[];
  reason?: string;
}

// Legacy alias
export type RiskGuardState = AccountRiskGuardState;

// ─── Prop Firm Guard (account-scoped) ────────────────────────────────────────

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
  consistencyStatus: 'COMPLIANT' | 'AT_RISK' | 'VIOLATED';
  minimumTradingDaysRequired: number;
  currentTradingDays: number;
  profitableDaysRequired: number;
  currentProfitableDays: number;
  newsTradingAllowed: boolean;
  blackoutBeforeMinutes: number;
  blackoutAfterMinutes: number;
  status: 'ON_TRACK' | 'AT_RISK' | 'BREACHED';
  warnings: string[];
}

// Legacy alias
export type PropFirmGuardState = AccountPropFirmState;

// ─── Zone ────────────────────────────────────────────────────────────────────

export interface Zone {
  id: string;
  strategy_id: string;
  parameter_set_id: string;
  symbol: string;
  direction: ZoneDirection;
  state: ZoneState;
  score: number; // MOCK VALUE — not calculated
  ifvgType: IFVGType;
  entryPrice: number;
  invalidationPrice: number;
  takeProfitPrice: number;
  riskRewardRatio: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  simpleDescription: string; // UI-ONLY — not stored in DB
  notes?: string;
}

// ─── Backtest ────────────────────────────────────────────────────────────────

export interface BacktestParameterSet {
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
  allowedAccountIds: string[]; // which accounts are permitted to use this parameter set
  approvedAt?: string;
  rejectedReason?: string;
  trades?: BacktestTrade[];
}

export interface BacktestTrade {
  id: string;
  entryTime: string;
  exitTime: string;
  direction: ZoneDirection;
  entryPrice: number;
  exitPrice: number;
  pnlPct: number;
  outcome: 'WIN' | 'LOSS' | 'BREAKEVEN';
}

// ─── Journal ─────────────────────────────────────────────────────────────────

export interface JournalTrade {
  id: string;
  accountId: string;
  accountDisplayName: string;
  date: string;
  symbol: string;
  direction: ZoneDirection;
  entryPrice: number;
  exitPrice: number;
  riskRewardRatio: number;
  resultR: number; // actual R multiple achieved (e.g. 1.8, -1.0)
  pnlPct: number;
  pnlUsd: number;
  outcome: 'WIN' | 'LOSS' | 'BREAKEVEN';
  zone_id?: string;
  strategy_id?: string;
  parameterSetId?: string;
  notes: string;
  emotionalState: 'CALM' | 'RUSHED' | 'FEARFUL' | 'CONFIDENT' | 'IMPULSIVE';
  ruleCompliance: 'COMPLIANT' | 'MINOR_DEVIATION' | 'MAJOR_DEVIATION';
  isImpulseTrade: boolean;
}

// ─── Alert ───────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  accountId: string | null; // null = global alert not tied to a specific account
  accountDisplayName: string | null;
  severity: AlertSeverity;
  source: string; // 'BRIDGE' | 'RISK_GUARD' | 'ZONE_SCANNER' | 'PROP_FIRM_GUARD' | 'SYSTEM'
  message: string;
  simpleMessage: string; // UI-ONLY plain language
  timestamp: string;
  acknowledged: boolean;
}

// ─── Psychology ──────────────────────────────────────────────────────────────

export interface PsychologyEntry {
  id: string;
  date: string;
  moodBefore: number; // 1–10
  moodAfter?: number;
  impulseTradesCount: number;
  preFlightChecklist: { item: string; checked: boolean }[];
  reflection?: string;
}
