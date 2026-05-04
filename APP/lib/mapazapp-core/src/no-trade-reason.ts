/**
 * Human-readable pipeline reasons (complement `NoTradeReasonCode` in risk-primitives for hard gates).
 */

export type StrategyPipelineWarning =
  | "INSUFFICIENT_CANDLES_FOR_ATR"
  | "NO_FVG_DETECTED"
  | "NO_IFVG_CONVERSION"
  | "SWEEP_NOT_CONFIRMED"
  | "CONTEXT_NEUTRAL_IN_PIPELINE_V1";
