import type { SwingDetectorSettings } from "./swing-detector";

export interface ContextBiasSettings {
  /** When true, engine recommendations may justify hard gates in decision model (off by default). */
  contextCanHardBlock: boolean;
  /** Points subtracted from buy/sell scores when range is middle. */
  middleRangePenalty: number;
  /** Points subtracted when evaluated setup opposes HTF bias. */
  oppositeTrendPenalty: number;
  /** Additional penalty when market reads choppy. */
  choppyMarketPenalty: number;
  /** Below this context score, trade-review confidence should be capped (soft policy). */
  minContextScoreForTradeReview: number;
  /** When true, extreme chop elevates no-trade posture. */
  noTradeIfExtremeChop: boolean;
  /** Body/(high-low) threshold; below = choppy proxy. */
  choppyBodyRangeRatioMax: number;
  /** Bars for chop average. */
  choppyLookbackBars: number;
  /** Bars for HTF range (high/low). */
  rangeLookbackBars: number;
  /** ATR period for volatility proxy. */
  atrPeriod: number;
  /** Expansion if recent ATR / older ATR >= this. */
  expansionAtrRatio: number;
  /** Contraction if ratio <= this. */
  contractionAtrRatio: number;
  /** When true, confidence band stays medium/low unless H4 and H1 agree. */
  requireHtfAlignmentForHighConfidence: boolean;
  swing: SwingDetectorSettings;
  /** Minimum bars on anchor TF before evaluation (excluding swing confirmation). */
  minBarsAnchorTimeframe: number;
}

export function createDefaultContextBiasSettingsForTests(): ContextBiasSettings {
  return {
    contextCanHardBlock: false,
    middleRangePenalty: 14,
    oppositeTrendPenalty: 22,
    choppyMarketPenalty: 18,
    minContextScoreForTradeReview: 38,
    noTradeIfExtremeChop: true,
    choppyBodyRangeRatioMax: 0.28,
    choppyLookbackBars: 24,
    rangeLookbackBars: 48,
    atrPeriod: 14,
    expansionAtrRatio: 1.12,
    contractionAtrRatio: 0.88,
    requireHtfAlignmentForHighConfidence: true,
    swing: { swingLeftBars: 2, swingRightBars: 2 },
    minBarsAnchorTimeframe: 20,
  };
}
