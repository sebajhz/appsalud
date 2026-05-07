import type { ToleranceDimension } from "./tolerance-calibration-types";

/** Per-dimension multipliers for max(ATR·k, spread·k, tick·n) in price units. */
export interface ToleranceDimensionFactors {
  atrMultiplier: number;
  spreadMultiplier: number;
  minTicks: number;
}

export interface ToleranceSpreadRegimeThresholds {
  /** ratio = spreadPrice / atr */
  normalMaxRatio: number;
  elevatedMaxRatio: number;
}

export interface ToleranceVolatilityRegimeThresholds {
  /** high when atr >= referenceAtr * highFactor */
  highFactor: number;
  extremeFactor: number;
  lowFactor: number;
}

export interface ToleranceQualityRatioThresholds {
  /** raw / tolerancePrice above this begins weak_but_usable / observe_only (dimension-tuned externally via score curve). */
  idealMax: number;
  acceptableMax: number;
  weakMax: number;
  observeMax: number;
}

export interface ToleranceEntryChaseSettings {
  /** chaseTowardTpR above this → observe_only */
  observeOnlyMinR: number;
  /** chaseTowardTpR above this → invalid */
  invalidMinR: number;
}

export interface ToleranceCalibrationSettings {
  dimensionFactors: Record<ToleranceDimension, ToleranceDimensionFactors>;
  spreadRegime: ToleranceSpreadRegimeThresholds;
  volatilityRegime: ToleranceVolatilityRegimeThresholds;
  qualityRatios: ToleranceQualityRatioThresholds;
  entryChase: ToleranceEntryChaseSettings;
  /** For retest_depth: extra multiplier applied to tolerance when zoneTouchOccurred. */
  retestZoneTouchAtrBonus: number;
}

export function createDefaultToleranceCalibrationSettings(): ToleranceCalibrationSettings {
  return {
    dimensionFactors: {
      // tighter structural sweep
      liquidity_sweep: { atrMultiplier: 0.12, spreadMultiplier: 1.1, minTicks: 4 },
      // slightly wider than confirmed sweep miss
      near_sweep: { atrMultiplier: 0.22, spreadMultiplier: 1.6, minTicks: 6 },
      // wide guard for “too deep” interpretation
      over_sweep_break_risk: { atrMultiplier: 0.45, spreadMultiplier: 2.4, minTicks: 10 },
      // allow human-like retest imperfection
      retest_depth: { atrMultiplier: 0.3, spreadMultiplier: 2.0, minTicks: 8 },
      // padding can breathe more than sweep
      zone_padding: { atrMultiplier: 0.35, spreadMultiplier: 2.2, minTicks: 8 },
      // strict: multipliers still define a tiny price floor; chase uses R thresholds
      entry_chase: { atrMultiplier: 0.05, spreadMultiplier: 0.35, minTicks: 2 },
      // not used for band — kept for schema completeness
      spread_cost: { atrMultiplier: 0.01, spreadMultiplier: 0.05, minTicks: 1 },
      // protective but bounded
      sl_buffer: { atrMultiplier: 0.28, spreadMultiplier: 1.8, minTicks: 6 },
      confirmation_wick: { atrMultiplier: 0.15, spreadMultiplier: 1.2, minTicks: 5 },
      target_distance: { atrMultiplier: 0.18, spreadMultiplier: 1.4, minTicks: 6 },
    },
    spreadRegime: {
      normalMaxRatio: 0.12,
      elevatedMaxRatio: 0.22,
    },
    volatilityRegime: {
      lowFactor: 0.55,
      highFactor: 1.45,
      extremeFactor: 2.2,
    },
    qualityRatios: {
      idealMax: 0.35,
      acceptableMax: 0.72,
      weakMax: 1.0,
      observeMax: 1.35,
    },
    entryChase: {
      observeOnlyMinR: 0.55,
      invalidMinR: 0.82,
    },
    retestZoneTouchAtrBonus: 0.12,
  };
}
