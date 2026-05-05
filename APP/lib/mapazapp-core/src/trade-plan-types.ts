import type { ConfirmationResult } from "./confirmation-detector";
import type { IfvgZoneLifecycleState } from "./ifvg-state-machine";
import type { RetestResult } from "./retest-detector";
import type { StrategyScoreResult } from "./strategy-score";
import type { SweepStatus } from "./liquidity-sweep";
import type { SymbolMarketSpec } from "./symbol-profile";
import type { TradePlanEvaluationSettings, TradePlanTargetModel } from "./trade-plan-settings";
import type { ZoneCandidate } from "./zone-candidate";
import type { ParameterSetCompatibilityResult } from "./strategy-registry-types";

/**
 * Lifecycle / UI status for trade review (blueprint §6). Review-only — not execution.
 * Mirrors `IfvgZoneLifecycleState` for alignment with IFVG state machine docs.
 */
export type TradePlanStatus = IfvgZoneLifecycleState;

/** V1: same value set as status; reserved for future UI action subset. */
export type TradePlanAction = TradePlanStatus;

export type TradePlanDirection = "BUY" | "SELL";

export type TradePlanHardGate =
  | "SYMBOL_PROFILE_MISSING"
  | "ZONE_CANDIDATE_MISSING"
  | "ZONE_INVALIDATED"
  | "ZONE_EXPIRED"
  | "ZONE_USED"
  | "INVALIDATION_PRICE_INVALID"
  | "APPROVED_PARAMETER_SET_REQUIRED"
  | "ACCOUNT_ID_REQUIRED"
  | "TRADE_REVIEW_NOT_ALLOWED"
  | "OPERATIONAL_STATUS_BLOCKS"
  | "DAILY_DRAWDOWN_BLOCKED"
  | "MAX_DRAWDOWN_BLOCKED"
  | "MAX_TRADES_REACHED"
  | "PROP_FIRM_BLOCKED"
  | "NEWS_BLACKOUT"
  | "PSYCHOLOGICAL_LOCK"
  | "SPREAD_NOT_ALLOWED"
  | "SPREAD_ABOVE_MAX"
  | "CONFIRMATION_ATR_MISSING"
  | "RR_BELOW_MINIMUM"
  | "SL_DISTANCE_ABOVE_MAX_ATR";

export interface TradePlanReason {
  code: string;
  messageSimple: string;
}

export interface TradePlanAccountGuardInput {
  accountId?: string;
  operationalStatus?: string;
  dailyDrawdownBlocked?: boolean;
  maxDrawdownBlocked?: boolean;
  maxTradesReached?: boolean;
  newsBlackout?: boolean;
  propFirmBlocked?: boolean;
  psychologicalLock?: boolean;
  /** When false, no approved parameter set is linked for this symbol/account. */
  approvedParameterSetForAccount?: boolean;
  /** When false, spread filter blocks review. */
  spreadAllowed?: boolean;
  accountMode?: "challenge" | "funded" | "demo" | "personal" | string;
  /** Master switch: false → NO_TRADE for review pipeline. */
  allowTradeReview?: boolean;
}

/** Optional risk snapshot extension point (future backend). */
export interface TradePlanRiskInput {
  maxSpreadPriceCeiling?: number;
}

export interface TradePlanSweepInput {
  sweepLow?: number;
  sweepHigh?: number;
  sweepStatus?: SweepStatus;
}

export interface TradePlanScoreInput {
  /** Prefer `scoreResult.total` when both set. */
  totalScore?: number;
  scoreResult?: StrategyScoreResult;
}

export interface TradePlanInput {
  zoneCandidate: ZoneCandidate | null;
  symbolProfile: SymbolMarketSpec | null;
  tradePlanSettings: TradePlanEvaluationSettings;
  accountGuard?: TradePlanAccountGuardInput;
  riskInput?: TradePlanRiskInput;
  retestResult: RetestResult;
  confirmationResult: ConfirmationResult;
  score?: TradePlanScoreInput;
  /** Last closed price (e.g. confirmation close) for invalidation checks. */
  currentPrice?: number;
  /** Close of the confirmation candle when using `CONFIRMATION_CLOSE` reference entry. */
  confirmationClose?: number | null;
  confirmationAtr: number | null;
  /** When omitted, uses `symbolProfile.spreadPrice` when profile present. */
  spreadPrice?: number;
  sweep?: TradePlanSweepInput;
  evaluationTimeIso?: string;
  accountId?: string;
  strategyId?: string;
  parameterSetId?: string;
  /** Explicit lifecycle overrides (tests / caller). */
  zoneMarkedUsed?: boolean;
  zoneMarkedExpired?: boolean;
  zoneMarkedInvalidated?: boolean;
  /** Checkpoint 7 — optional registry evaluation snapshot for richer gate reasons. */
  registryCompatibility?: ParameterSetCompatibilityResult;
}

export interface TradePlanRiskMetrics {
  riskPrice: number;
  rewardPrice: number;
  rr: number;
  slDistancePrice: number;
  slDistancePoints: number;
  slDistanceTicks: number;
}

export interface TradeReviewPlan {
  status: TradePlanStatus;
  action: TradePlanAction;
  direction: TradePlanDirection;
  canonicalSymbol: string;
  zoneId: string;
  strategyId?: string;
  parameterSetId?: string;
  accountId?: string;
  targetModel: TradePlanTargetModel;
  entryAreaLow: number;
  entryAreaHigh: number;
  referenceEntryPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  metrics: TradePlanRiskMetrics | null;
  reasons: TradePlanReason[];
  noTradeReasons: TradePlanReason[];
  failedHardGates: TradePlanHardGate[];
  simpleSummary: string;
  /** True when status is TRADE_READY — still review-only, not an order. */
  reviewReady: boolean;
}

export interface TradePlanEvaluationResult {
  plan: TradeReviewPlan;
  passedHardGatesForTradeReady: boolean;
  failedHardGates: TradePlanHardGate[];
}
