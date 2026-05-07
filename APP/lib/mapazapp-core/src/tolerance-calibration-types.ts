import type { SymbolMarketSpec } from "./symbol-profile";

/** Logical tolerance axes evaluated against dynamic ATR / spread / tick bands. */
export type ToleranceDimension =
  | "liquidity_sweep"
  | "near_sweep"
  | "over_sweep_break_risk"
  | "retest_depth"
  | "zone_padding"
  | "entry_chase"
  | "spread_cost"
  | "sl_buffer"
  | "confirmation_wick"
  | "target_distance";

/** Volatility bucket used to scale interpretation (not a separate ATR series in v1). */
export type ToleranceVolatilityRegime =
  | "low_volatility"
  | "normal_volatility"
  | "high_volatility"
  | "extreme_volatility";

/** Spread cost bucket vs ATR (human-like “expensive tape” notion). */
export type ToleranceSpreadRegime = "normal_spread" | "elevated_spread" | "expensive_spread";

/** Union for settings keys that gate both families (kept for extensibility). */
export type ToleranceRegime = ToleranceVolatilityRegime | ToleranceSpreadRegime;

export type ToleranceQualityClassification =
  | "ideal"
  | "acceptable"
  | "weak_but_usable"
  | "observe_only"
  | "invalid";

export type ToleranceReasonCode =
  | "OK"
  | "MEASUREMENT_OMITTED"
  | "WITHIN_DYNAMIC_BAND"
  | "NEAR_EDGE_OF_BAND"
  | "EXCEEDS_BAND_SOFT"
  | "EXCEEDS_BAND_HARD"
  | "BREAK_RISK_DEPTH"
  | "ENTRY_CHASE_TOO_LATE"
  | "SPREAD_EXPENSIVE_VS_ATR"
  | "ZONE_TOUCH_COMPENSATION"
  | "INSUFFICIENT_ATR"
  | "INSUFFICIENT_SYMBOL_SPEC";

/** Single measurement for a price-distance dimension (always ≥ 0 in price units). */
export interface TolerancePriceDistanceMeasurement {
  rawDistancePrice: number;
  /** When true, imperfect midpoint logic may still be acceptable (retest_depth). */
  zoneTouchOccurred?: boolean;
}

/** Entry chase toward TP expressed in risk-R toward TP (0 = none). */
export interface ToleranceEntryChaseMeasurement {
  chaseTowardTpR: number;
}

/** Spread / ATR cost ratio is supplied or derived from profile. */
export interface ToleranceSpreadCostMeasurement {
  /** If omitted, `spreadPrice / atr` from profile + input is used. */
  spreadToAtrRatio?: number;
}

/** SL buffer sufficiency: distance from structural stop to adverse reference. */
export interface ToleranceSlBufferMeasurement {
  /** Positive = buffer larger than dynamic minimum; negative = deficient. */
  bufferExcessPrice: number;
}

/** Wick shortfall vs body for confirmation-style geometry. */
export interface ToleranceConfirmationWickMeasurement {
  /** max(0, requiredWickPrice - actualWickPrice) */
  wickShortfallPrice: number;
}

/** Distance shortfall to minimum meaningful target distance (price). */
export interface ToleranceTargetDistanceMeasurement {
  shortfallPrice: number;
}

export type ToleranceDimensionMeasurement =
  | TolerancePriceDistanceMeasurement
  | ToleranceEntryChaseMeasurement
  | ToleranceSpreadCostMeasurement
  | ToleranceSlBufferMeasurement
  | ToleranceConfirmationWickMeasurement
  | ToleranceTargetDistanceMeasurement;

export interface ToleranceDimensionMeasurements {
  liquidity_sweep?: TolerancePriceDistanceMeasurement;
  near_sweep?: TolerancePriceDistanceMeasurement;
  over_sweep_break_risk?: TolerancePriceDistanceMeasurement;
  retest_depth?: TolerancePriceDistanceMeasurement;
  zone_padding?: TolerancePriceDistanceMeasurement;
  entry_chase?: ToleranceEntryChaseMeasurement;
  spread_cost?: ToleranceSpreadCostMeasurement;
  sl_buffer?: ToleranceSlBufferMeasurement;
  confirmation_wick?: ToleranceConfirmationWickMeasurement;
  target_distance?: ToleranceTargetDistanceMeasurement;
}

/** Normalized view of raw distance (or derived scalar) vs scale references. */
export interface ToleranceNormalizedValue {
  normalizedByAtr: number | null;
  normalizedBySpread: number | null;
  normalizedByTick: number | null;
}

/** Optional band metadata for UI / audit. */
export interface TolerancePriceBand {
  /** Dynamic tolerance radius in price for this dimension at evaluation time. */
  halfWidthPrice: number;
  /** max(ATR·k, spread·k, tick·n) decomposition */
  components: { atrPart: number; spreadPart: number; tickPart: number };
}

export interface ToleranceProfile {
  canonicalSymbol: string;
  tickSize: number;
  spreadPrice: number;
  atr: number;
  volatilityRegime: ToleranceVolatilityRegime;
  spreadRegime: ToleranceSpreadRegime;
  /** Optional reference ATR used only for volatility regime classification. */
  referenceAtr: number | null;
}

export interface ToleranceDimensionResult {
  dimension: ToleranceDimension;
  rawScalarDescription: string;
  rawDistancePrice: number | null;
  /** For entry_chase, normalized “distance” is expressed in R units alongside price band N/A. */
  rawChaseTowardTpR: number | null;
  normalized: ToleranceNormalizedValue;
  tolerancePrice: number;
  band: TolerancePriceBand;
  quality: ToleranceQualityClassification;
  /** 0–100 within-dimension quality (deterministic rounding). */
  score: number;
  reasonCodes: ToleranceReasonCode[];
  explanation: string;
}

export interface ToleranceCalibrationInput {
  settings: import("./tolerance-calibration-settings").ToleranceCalibrationSettings;
  symbolProfile: SymbolMarketSpec;
  /** Primary ATR in price units (e.g. confirmation / zone TF). */
  atr: number;
  /**
   * Optional reference ATR (e.g. longer-window) to classify volatility regime.
   * When omitted, `atr` is used as both effective and reference.
   */
  referenceAtr?: number | null;
  measurements: ToleranceDimensionMeasurements;
}

export interface ToleranceCalibrationResult {
  profile: ToleranceProfile;
  byDimension: Record<ToleranceDimension, ToleranceDimensionResult>;
  /** Mean of per-dimension scores where measurement was provided; omitted dims excluded. */
  measuredAggregateScore: number | null;
  summaryExplanation: string;
}
