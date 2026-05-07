import type { ContextBiasReasonCode } from "./context-bias-types";

const MESSAGES: Record<ContextBiasReasonCode, string> = {
  OK: "Context evaluation completed.",
  INSUFFICIENT_HTF_DATA: "Not enough higher-timeframe candles for swing/ATR context.",
  HTF_SWING_STRUCTURE_BULLISH: "Swing structure suggests higher highs and higher lows.",
  HTF_SWING_STRUCTURE_BEARISH: "Swing structure suggests lower highs and lower lows.",
  HTF_SWING_STRUCTURE_MIXED: "Swing structure is mixed or inconclusive.",
  HTF_RANGE_DISCOUNT: "Price sits in discount vs recent HTF range.",
  HTF_RANGE_PREMIUM: "Price sits in premium vs recent HTF range.",
  HTF_RANGE_MIDDLE: "Price sits mid-range — weaker directional conviction.",
  HTF_MTF_ALIGNED: "Higher timeframes agree on bias direction.",
  HTF_MTF_CONFLICT: "Higher timeframes disagree — confidence reduced.",
  HTF_CHOPPY_PROXY: "Low body-to-range ratio suggests choppy conditions.",
  HTF_EXPANSION: "ATR expanded vs prior window (volatility expansion proxy).",
  HTF_CONTRACTION: "ATR contracted vs prior window (compression proxy).",
  SETUP_DIRECTION_ALIGNED: "Evaluated setup direction aligns with HTF bias.",
  SETUP_DIRECTION_OPPOSED: "Evaluated setup direction opposes HTF bias.",
  CONTEXT_NO_TRADE_BIAS: "Context argues for standing aside.",
  HIGH_CONFIDENCE_REQUIRES_MTF: "High confidence requires multi-timeframe alignment (policy).",
};

export function contextBiasReason(code: ContextBiasReasonCode): { code: ContextBiasReasonCode; message: string } {
  return { code, message: MESSAGES[code] ?? code };
}
