/**
 * Account / risk / prop-firm guard model — **eligibility for trade review only**, not execution or lot sizing.
 * All monetary fields are in **account currency** (caller-defined); core does not convert brokers.
 */

/** Operational labels aligned with dashboard mock `OperationalStatus` and future bridge/registry. */
export type AccountOperationalStatus = string;

/**
 * High-level guard outcome for an account at evaluation time.
 * Distinct from `AccountOperationalStatus` (input signal); this is the interpreted result.
 */
export type AccountGuardStatus =
  | "ACCOUNT_OK"
  | "WATCH_ONLY"
  | "BLOCKED_DAILY_DRAWDOWN"
  | "BLOCKED_MAX_DRAWDOWN"
  | "BLOCKED_MAX_TRADES"
  | "BLOCKED_NEWS"
  | "BLOCKED_PROP_FIRM"
  | "BLOCKED_PSYCHOLOGY"
  | "BLOCKED_BRIDGE"
  | "BLOCKED_NO_APPROVED_PARAMETER_SET"
  | "BLOCKED_ACCOUNT_STATUS"
  | "INSUFFICIENT_ACCOUNT_DATA";

export type AccountGuardReasonTier = "blocking" | "warning";

export type AccountGuardReasonCode =
  | "ACCOUNT_OK"
  | "ACCOUNT_WATCH_ONLY"
  | "DAILY_DRAWDOWN_BLOCKED"
  | "MAX_DRAWDOWN_BLOCKED"
  | "MAX_TRADES_REACHED"
  | "NEWS_BLACKOUT_ACTIVE"
  | "PROP_FIRM_RULE_BLOCKED"
  | "PSYCHOLOGICAL_LOCK_ACTIVE"
  | "BRIDGE_DISCONNECTED"
  /** Non-blocking heads-up when bridge is down but policy does not require connection for review. */
  | "BRIDGE_DISCONNECTED_WARNING"
  | "PARAMETER_SET_NOT_APPROVED_FOR_ACCOUNT"
  | "ACCOUNT_STATUS_BLOCKED"
  | "MISSING_ACCOUNT_ID"
  | "MISSING_RISK_SNAPSHOT"
  | "MISSING_PROP_RULE_SNAPSHOT"
  | "RISK_REMAINING_LOW_WARNING"
  | "DAILY_DRAWDOWN_NEAR_LIMIT_WARNING"
  | "MAX_DRAWDOWN_NEAR_LIMIT_WARNING"
  | "TRADES_REMAINING_LOW_WARNING";

export interface AccountGuardReason {
  code: AccountGuardReasonCode;
  tier: AccountGuardReasonTier;
  messageSimple: string;
  messageTechnical: string;
}

/** Snapshot of account risk usage — numbers supplied by bridge/backend/mock. */
export interface AccountRiskSnapshot {
  balance: number;
  equity: number;
  dailyStartBalance: number;
  dailyStartEquity: number;
  dailyLossLimitAmount: number;
  dailyLossUsedAmount: number;
  dailyLossRemainingAmount: number;
  maxLossLimitAmount: number;
  maxLossUsedAmount: number;
  maxLossRemainingAmount: number;
  riskPerTradePercent: number;
  tradesTakenToday: number;
  maxTradesPerDay: number;
  /** Optional open risk in account currency — used for low headroom warnings. */
  openRiskAmount?: number;
}

/** Minimal prop-firm rule outcome for guard (no full rule engine). */
export interface PropFirmRuleSnapshot {
  propFirmBlocked: boolean;
  /** Optional label for summaries / logs only. */
  firmProgramLabel?: string;
}

export type AccountMode = "demo" | "challenge" | "funded" | "personal" | "paper" | string;

/**
 * Unified input for account guard evaluation.
 * `operationalStatus` carries the primary mock/bridge enum; booleans allow explicit overrides.
 */
export interface AccountGuardInput {
  accountId: string;
  accountDisplayName?: string;
  accountMode?: AccountMode;
  operationalStatus: AccountOperationalStatus;
  /** When false, review is blocked regardless of other numeric health (mock `tradingAllowed`). */
  tradingAllowed?: boolean;
  risk: AccountRiskSnapshot;
  prop?: PropFirmRuleSnapshot;
  newsBlackout?: boolean;
  psychologicalLock?: boolean;
  /** When false, MT5/bridge considered disconnected for guard purposes. */
  bridgeConnected?: boolean;
  approvedParameterSetForAccount: boolean;
  /** When false, spread gate at trade-plan layer may still apply; here we only pass through to trade plan input. */
  spreadAllowed?: boolean;
}

/** Derived permission slice — review eligibility only. */
export interface AccountTradePermission {
  allowTradeReview: boolean;
}

/** Computed headroom metrics for UI / logs (account currency / percents / counts). */
export interface AccountGuardKeyMetrics {
  dailyLossUsedPercent: number;
  dailyLossRemainingAmount: number;
  maxLossUsedPercent: number;
  maxLossRemainingAmount: number;
  tradesRemainingToday: number;
  /** `equity * (riskPerTradePercent / 100)` when inputs finite; else null. */
  riskPerTradeAmount: number | null;
}

export interface AccountGuardResult extends AccountTradePermission {
  accountId: string;
  status: AccountGuardStatus;
  blockingReasons: AccountGuardReason[];
  warningReasons: AccountGuardReason[];
  simpleSummary: string;
  technicalSummary: string;
  metrics: AccountGuardKeyMetrics | null;
}

/** Policy knobs for `evaluateAccountGuard` — dev defaults, not broker truth. */
export interface AccountGuardSettings {
  /** Warn when `dailyLossUsedAmount / dailyLossLimitAmount` >= this percent (e.g. 80). */
  dailyDrawdownWarningPercent: number;
  /** Warn when `maxLossUsedAmount / maxLossLimitAmount` >= this percent. */
  maxDrawdownWarningPercent: number;
  /** When true, `bridgeConnected === false` blocks review. */
  requireBridgeForReview: boolean;
  /** When true, missing approved parameter set for symbol/account blocks review. */
  requireApprovedParameterSet: boolean;
  /** When true, `WATCH_ONLY` operational status does not block review by itself. */
  allowWatchOnlyReview: boolean;
  /** When true, news blackout / `BLOCKED_NEWS` does not block review. */
  allowNewsReview: boolean;
  /** When true, missing `prop` snapshot is treated as insufficient data / block. */
  requirePropFirmSnapshot: boolean;
}
