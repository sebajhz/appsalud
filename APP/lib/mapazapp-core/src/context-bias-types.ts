import type { Candle } from "./candle";
import type { SymbolMarketSpec } from "./symbol-profile";

export type ContextBiasDirection =
  | "buy_only"
  | "sell_only"
  | "both_allowed"
  | "no_trade"
  | "unclear";

export type ContextBiasMarketRegime =
  | "trending_up"
  | "trending_down"
  | "ranging"
  | "choppy"
  | "expansion"
  | "contraction"
  | "unclear";

export type ContextBiasRangePosition =
  | "discount"
  | "premium"
  | "middle"
  | "extreme_low"
  | "extreme_high"
  | "unknown";

export type ContextBiasStructureState =
  | "higher_highs_higher_lows"
  | "lower_highs_lower_lows"
  | "mixed"
  | "broken_structure_up"
  | "broken_structure_down"
  | "unknown";

export type ContextBiasConfidenceBand = "low" | "medium" | "high";

export type ContextBiasReasonCode =
  | "OK"
  | "INSUFFICIENT_HTF_DATA"
  | "HTF_SWING_STRUCTURE_BULLISH"
  | "HTF_SWING_STRUCTURE_BEARISH"
  | "HTF_SWING_STRUCTURE_MIXED"
  | "HTF_RANGE_DISCOUNT"
  | "HTF_RANGE_PREMIUM"
  | "HTF_RANGE_MIDDLE"
  | "HTF_MTF_ALIGNED"
  | "HTF_MTF_CONFLICT"
  | "HTF_CHOPPY_PROXY"
  | "HTF_EXPANSION"
  | "HTF_CONTRACTION"
  | "SETUP_DIRECTION_ALIGNED"
  | "SETUP_DIRECTION_OPPOSED"
  | "CONTEXT_NO_TRADE_BIAS"
  | "HIGH_CONFIDENCE_REQUIRES_MTF";

export type ContextBiasTimeframeKey = "M15" | "H1" | "H4" | "D1";

export interface ContextBiasTimeframeInput {
  M15?: Candle[];
  H1?: Candle[];
  H4?: Candle[];
  D1?: Candle[];
}

export interface ContextBiasScoreComponent {
  id: "trendStructure" | "rangePosition" | "mtfAlignment" | "volatilityChop" | "setupAlignment";
  score: number;
  weight: number;
  reasonCodes: ContextBiasReasonCode[];
  explanationSimple: string;
}

export interface ContextBiasExplainabilityItem {
  componentId: ContextBiasScoreComponent["id"];
  label: string;
  score: number;
  weight: number;
  contribution: number;
  reasonCodes: ContextBiasReasonCode[];
  explanationSimple: string;
}

export interface ContextBiasPerTimeframeSnapshot {
  timeframe: ContextBiasTimeframeKey;
  barCount: number;
  structure: ContextBiasStructureState;
  regime: ContextBiasMarketRegime;
  rangeHigh: number | null;
  rangeLow: number | null;
  rangeMid: number | null;
  rangePosition: ContextBiasRangePosition;
  /** -1 bearish, 0 neutral, +1 bullish */
  directionalSign: -1 | 0 | 1;
}

export interface ContextBiasResult {
  canonicalSymbol: string;
  brokerSymbol?: string;
  lowerTimeframe?: string;
  preferredDirection: ContextBiasDirection;
  /** Directions not vetoed by no_trade (subset semantics for UI). */
  allowedDirections: Array<"BUY" | "SELL">;
  contextScore: number;
  buyScore: number;
  sellScore: number;
  noTradeScore: number;
  marketRegime: ContextBiasMarketRegime;
  rangePosition: ContextBiasRangePosition;
  structureState: ContextBiasStructureState;
  confidenceBand: ContextBiasConfidenceBand;
  reasonCodes: ContextBiasReasonCode[];
  explainability: ContextBiasExplainabilityItem[];
  components: ContextBiasScoreComponent[];
  perTimeframe: ContextBiasPerTimeframeSnapshot[];
  summaryExplanation: string;
}

export interface ContextBiasInput {
  canonicalSymbol: string;
  brokerSymbol?: string;
  lowerTimeframe?: string;
  htfCandlesByTimeframe: ContextBiasTimeframeInput;
  currentPrice?: number | null;
  /** When set, `contextScore` incorporates setup alignment vs HTF. */
  directionToEvaluate?: "BUY" | "SELL" | null;
  symbolProfile: SymbolMarketSpec;
  settings: import("./context-bias-settings").ContextBiasSettings;
}
