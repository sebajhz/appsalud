import type { Candle } from "./candle";
import type { SymbolMarketSpec } from "./symbol-profile";
import type { TradeReviewPlan } from "./trade-plan-types";
import type { ZoneCandidate } from "./zone-candidate";
import type { ReplayTradeInput } from "./replay-trade-types";

export type EntrySlTpStatus = "ready" | "observe_only" | "blocked" | "invalid" | "insufficient_data";

export type EntryModelMode =
  | "zone_edge"
  | "zone_midpoint"
  | "full_zone_touch"
  | "confirmation_close"
  | "manual_reference";

export type StopLossModelMode =
  | "beyond_zone"
  | "beyond_sweep"
  | "beyond_structure"
  | "atr_buffered"
  | "explicit";

export type TakeProfitModelMode =
  | "fixed_r"
  | "previous_high_low"
  | "opposing_liquidity"
  | "hybrid_fixed_r_or_liquidity"
  | "explicit";

export type EntrySlTpTargetQuality = "strong" | "acceptable" | "marginal" | "invalid";

export type ZoneEdgePreference = "low" | "high";

export interface EntrySlTpReason {
  code: EntrySlTpReasonCode;
  message: string;
}

export type EntrySlTpReasonCode =
  | "OK"
  | "MISSING_SYMBOL_PROFILE"
  | "MISSING_ZONE_OR_PLAN"
  | "MISSING_DIRECTION"
  | "MISSING_ATR_CONTEXT"
  | "MISSING_CONFIRMATION_CLOSE"
  | "MISSING_EXPLICIT_ENTRY"
  | "MISSING_EXPLICIT_SL"
  | "MISSING_EXPLICIT_TP"
  | "MISSING_SWEEP_BOUNDS"
  | "MISSING_STRUCTURE_BOUNDS"
  | "MISSING_OPPOSING_LIQUIDITY"
  | "INVALID_PRICE_GEOMETRY"
  | "RISK_DISTANCE_NON_POSITIVE"
  | "REWARD_DISTANCE_NON_POSITIVE"
  | "RR_BELOW_MINIMUM"
  | "REWARD_SHORTER_THAN_RISK"
  | "TARGET_TOO_CLOSE_TO_PRICE"
  | "TRADE_ALREADY_PAST_TARGET"
  | "ENTRY_CHASE_EXCEEDED"
  | "HYBRID_NO_VALID_TARGET"
  | "ENTRY_VARIANT_REPLAY_MODEL_MISMATCH"
  | "ENTRY_VARIANT_LATE_TIMING_NOTE"
  | "TARGET_OBJECTIVE_WEAK_QUALITY"
  | "TARGET_OBJECTIVE_TOO_CLOSE_NOTE"
  | "TARGET_OBJECTIVE_ALREADY_REACHED_NOTE"
  | "TARGET_OBJECTIVE_TOO_FAR_NOTE";

export interface EntrySlTpSettings {
  minRr: number;
  /** Minimum reward/risk for target to be considered meaningful (v1). */
  minMeaningfulRewardR: number;
  /** R multiples: block/observe if price moved beyond entry toward TP before fill (v1). */
  maxEntryChaseR: number;
  /** Multipliers for `slBufferPrice`: ATR, spread, min ticks. */
  atrBufferMultiplier: number;
  spreadMultiplier: number;
  minTicks: number;
  atrPeriod: number;
  /** When ATR cannot be derived, use this price distance as ATR substitute (tests only). */
  fallbackAtrPrice: number;
  entryMode: EntryModelMode;
  slMode: StopLossModelMode;
  tpMode: TakeProfitModelMode;
  /** For `zone_edge`: which bound anchors the planned entry. */
  zoneEdgePreference: ZoneEdgePreference;
  /** R multiple for `fixed_r` / hybrid primary leg. */
  fixedRTarget: number;
  /** If true, soft failures downgrade to `observe_only` instead of `blocked`. */
  preferObserveOverBlock: boolean;
  /** How v1 "too late / chase" timing rules affect status. */
  lateTradePolicy: "blocked" | "observe_only";
}

export interface EntrySlTpPricePlan {
  entry: number;
  stopLoss: number;
  takeProfit: number;
  entryAreaLow: number;
  entryAreaHigh: number;
  bufferPrice: number;
}

export interface EntrySlTpRiskReward {
  riskDistance: number;
  rewardDistance: number;
  rr: number;
}

export interface EntrySlTpModelInput {
  zoneCandidate?: ZoneCandidate | null;
  tradeReviewPlan?: TradeReviewPlan | null;
  direction?: "BUY" | "SELL";
  symbolProfile: SymbolMarketSpec | null;
  /** Last ATR in price units; if omitted, derived from `recentCandles` or `fallbackAtrPrice` in settings. */
  atr?: number | null;
  currentPrice?: number;
  recentCandles?: Candle[];
  sweepLow?: number;
  sweepHigh?: number;
  structureHigh?: number;
  structureLow?: number;
  opposingLiquidityPrice?: number;
  confirmationClose?: number;
  explicitEntry?: number;
  explicitSl?: number;
  explicitTp?: number;
  settings: EntrySlTpSettings;
  /**
   * V2-08 — when present, `buildEntrySlTpPlan` may append warnings if replay/timing
   * hints disagree with configured `entryMode` (does not change geometry).
   */
  entryVariantResult?: import("./entry-variant-types").EntryVariantResult | null;
  /**
   * V2-09 — optional `evaluateTargetObjective` output; influences hybrid / opposing TP selection and warnings.
   */
  targetObjectiveResult?: import("./target-objective-types").TargetObjectiveResult | null;
}

export interface EntrySlTpModelResult {
  status: EntrySlTpStatus;
  pricePlan: EntrySlTpPricePlan | null;
  rr: EntrySlTpRiskReward | null;
  targetQuality: EntrySlTpTargetQuality;
  replayInputPreview: ReplayTradeInput | null;
  blockingReasons: EntrySlTpReason[];
  warningReasons: EntrySlTpReason[];
  canReplay: boolean;
  /** Always true for review-only pipeline (V2-03). */
  reviewOnly: true;
}
