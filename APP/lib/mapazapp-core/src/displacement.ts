import type { Candle } from "./candle";

export type DisplacementDirection = "BULLISH" | "BEARISH" | "NONE";

export type DisplacementQuality = "STRONG" | "MODERATE" | "WEAK";

export interface DisplacementSettings {
  displacementBodyFactor: number;
  closePositionMinBuy: number;
  closePositionMaxSell: number;
  /** Optional extra floor vs ATR (blueprint §9); if 0, only bodyFactor applies. */
  minDisplacementAtr: number;
}

export interface DisplacementResult {
  direction: DisplacementDirection;
  quality: DisplacementQuality;
  body: number;
  range: number;
  closePosition: number | null;
  atrThreshold: number;
}

/**
 * Bullish / bearish displacement per blueprint §9 + checkpoint rules.
 * `atr` must be in price units; if null, displacement cannot pass ATR-relative checks.
 */
export function detectDisplacement(
  candle: Candle,
  previous: Candle | undefined,
  atr: number | null,
  settings: DisplacementSettings,
): DisplacementResult {
  const body = Math.abs(candle.close - candle.open);
  const range = candle.high - candle.low;
  const closePosition = range > 0 ? (candle.close - candle.low) / range : null;

  if (atr == null || atr <= 0) {
    return {
      direction: "NONE",
      quality: "WEAK",
      body,
      range,
      closePosition,
      atrThreshold: 0,
    };
  }

  const minBody = Math.max(
    atr * settings.displacementBodyFactor,
    atr * settings.minDisplacementAtr,
  );

  const bullish =
    body >= minBody &&
    closePosition != null &&
    closePosition >= settings.closePositionMinBuy &&
    (previous == null || candle.close > previous.close);

  const bearish =
    body >= minBody &&
    closePosition != null &&
    closePosition <= settings.closePositionMaxSell &&
    (previous == null || candle.close < previous.close);

  if (bullish && !bearish) {
    return {
      direction: "BULLISH",
      quality: body >= minBody * 1.2 ? "STRONG" : "MODERATE",
      body,
      range,
      closePosition,
      atrThreshold: minBody,
    };
  }
  if (bearish && !bullish) {
    return {
      direction: "BEARISH",
      quality: body >= minBody * 1.2 ? "STRONG" : "MODERATE",
      body,
      range,
      closePosition,
      atrThreshold: minBody,
    };
  }
  return {
    direction: "NONE",
    quality: "WEAK",
    body,
    range,
    closePosition,
    atrThreshold: minBody,
  };
}
