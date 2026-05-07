import type { Candle } from "./candle";
import type { ContextBiasResult } from "./context-bias-types";
import type { SymbolMarketSpec } from "./symbol-profile";
import type { ToleranceCalibrationResult } from "./tolerance-calibration-types";
import type { ZoneTradeDirection } from "./zone-candidate";
/** How the evaluator chooses among generated candidates (v1). */
export type TargetObjectiveMode =
  | "fixed_r"
  | "previous_high_low"
  | "opposing_liquidity"
  | "range_extreme"
  | "structure_level"
  | "hybrid_best_available"
  | "explicit";

/** Review bucket for the selected target (v1). */
export type TargetObjectiveClassification =
  | "ideal_target"
  | "acceptable_target"
  | "weak_target"
  | "too_close"
  | "too_far"
  | "already_reached"
  | "invalid_target"
  | "insufficient_data";

/** Where the numeric target level came from (v1). */
export type TargetObjectiveSource =
  | "fixed_r"
  | "swing_high"
  | "swing_low"
  | "range_high"
  | "range_low"
  | "opposing_liquidity"
  | "explicit_price"
  | "hybrid_selection"
  /** Same side as previous high/low when `structureHigh` / `structureLow` supplied (v1). */
  | "structure_level";

/** Subjective quality label from score + classification (v1). */
export type TargetObjectiveQuality = "ideal" | "acceptable" | "weak" | "poor" | "invalid";

export interface TargetObjectiveSettings {
  /** Primary selection strategy (v1). */
  mode: TargetObjectiveMode;
  /** Hard minimum R:R for a candidate to be selectable (default 1). */
  minRr: number;
  /** Soft threshold for ideal_target labeling (e.g. 1.5–2). */
  recommendedMinRr: number;
  fixedRTarget: number;
  /** Remaining reward below this × risk → too_close vs current (when current set). */
  tooCloseToTargetR: number;
  bufferTicksForAlreadyReached: number;
  /** Reward distance above this × ATR → too_far / unrealistic (v1). */
  targetTooFarAtrMultiple: number;
  minMeaningfulRewardR: number;
  /** When false (default), reward < risk marks candidate invalid / blocked. */
  allowRewardShorterThanRisk: boolean;
  swingLeftBars: number;
  swingRightBars: number;
  /** In hybrid mode, prefer liquidity/structure candidate over fixed R when both valid and liquidity RR ≥ fixed RR. */
  preferLiquidityWhenBeatsFixedR: boolean;
}

export interface TargetObjectiveReason {
  code: TargetObjectiveReasonCode;
  message: string;
}

export type TargetObjectiveReasonCode =
  | "OK"
  | "MISSING_DIRECTION"
  | "MISSING_ENTRY_PRICE"
  | "MISSING_STOP_LOSS"
  | "MISSING_SYMBOL_PROFILE"
  | "RISK_DISTANCE_NON_POSITIVE"
  | "INVALID_PRICE_GEOMETRY"
  | "TARGET_WRONG_SIDE_OF_ENTRY"
  | "REWARD_SHORTER_THAN_RISK"
  | "RR_BELOW_MINIMUM"
  | "NO_VALID_CANDIDATE"
  | "INSUFFICIENT_SWING_DATA"
  | "EXPLICIT_TARGET_MISSING"
  | "CONTEXT_MISALIGNED_SOFT";

/** Hint for replay / review UI (no execution). */
export interface TargetObjectiveReplayHint {
  /** Suggested emphasis when building replay (review-only). */
  focus: "fixed_r_objective" | "liquidity_objective" | "structure_objective" | "explicit_objective";
  notes: string;
}

export interface TargetObjectiveCandidate {
  price: number;
  mode: TargetObjectiveMode;
  source: TargetObjectiveSource;
  rewardDistance: number;
  riskDistance: number;
  rr: number;
  /** Internal 0–100 score before selection (deterministic). */
  score: number;
  classification: TargetObjectiveClassification;
  reasonCodes: TargetObjectiveReasonCode[];
}

export interface TargetObjectiveInput {
  direction: ZoneTradeDirection;
  entryPrice: number;
  stopLossPrice: number;
  symbolProfile: SymbolMarketSpec | null;
  currentPrice?: number;
  recentCandles?: Candle[];
  structureHigh?: number;
  structureLow?: number;
  rangeHigh?: number;
  rangeLow?: number;
  opposingLiquidityPrice?: number;
  explicitTargetPrice?: number;
  atrPrice?: number;
  spreadPrice?: number;
  contextBiasResult?: ContextBiasResult | null;
  toleranceCalibrationResult?: ToleranceCalibrationResult | null;
  settings: TargetObjectiveSettings;
}

export interface TargetObjectiveResult {
  selectedTargetPrice: number | null;
  selectedMode: TargetObjectiveMode;
  selectedSource: TargetObjectiveSource;
  rr: number | null;
  classification: TargetObjectiveClassification;
  qualityScore: number;
  quality: TargetObjectiveQuality;
  candidates: TargetObjectiveCandidate[];
  blockingReasons: TargetObjectiveReason[];
  warningReasons: TargetObjectiveReason[];
  replayHint: TargetObjectiveReplayHint | null;
  reviewOnly: true;
}
