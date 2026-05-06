import type { Candle } from "./candle";
import type { FairValueGap } from "./fvg-detector";
import { ifvgBreakBufferPrice } from "./normalize";

export type IfvgDirection = "BULLISH" | "BEARISH";

export type IfvgBreakMode = "close" | "wick";

export interface InversionFairValueGap {
  id: string;
  direction: IfvgDirection;
  ifvgLow: number;
  ifvgHigh: number;
  sourceFvgId: string;
  /** Bar where invalidation was detected. */
  invalidationIndex: number;
  /** Same bar as `invalidationIndex` when set — IFVG break / FVG invalidation confirmation. */
  ifvgBreakIndex?: number;
  /** FVG three-candle indices when propagated from `FairValueGap` / converter. */
  fvgStartIndex?: number;
  fvgMiddleIndex?: number;
  fvgEndIndex?: number;
  time: number;
}

export interface IfvgConverterSettings {
  ifvgBreakMode: IfvgBreakMode;
  ifvgBreakBufferAtr: number;
  ifvgBreakSpreadFactor: number;
  minIfvgBreakTicks: number;
  maxBarsFromFvgToIfvg: number;
}

function bufferPrice(
  atr: number,
  spreadPrice: number,
  tickSize: number,
  settings: IfvgConverterSettings,
): number {
  return ifvgBreakBufferPrice({
    atr,
    ifvgBreakBufferAtr: settings.ifvgBreakBufferAtr,
    spreadPrice,
    ifvgBreakSpreadFactor: settings.ifvgBreakSpreadFactor,
    tickSize,
    minIfvgBreakTicks: settings.minIfvgBreakTicks,
  });
}

/**
 * Scan forward from FVG center for first invalidation within `maxBarsFromFvgToIfvg`
 * (Numerical Spec §10 + blueprint §10.3).
 */
export function tryConvertFvgToIfvg(
  fvg: FairValueGap,
  candles: Candle[],
  atrByIndex: (number | null)[],
  spreadPrice: number,
  tickSize: number,
  settings: IfvgConverterSettings,
  ifvgId: string,
): InversionFairValueGap | null {
  const start = fvg.centerIndex + 2;
  const end = Math.min(candles.length - 1, fvg.centerIndex + settings.maxBarsFromFvgToIfvg);

  for (let j = start; j <= end; j++) {
    const c = candles[j];
    const atr = atrByIndex[j];
    if (atr == null) continue;
    const buf = bufferPrice(atr, spreadPrice, tickSize, settings);

    if (fvg.direction === "BULLISH") {
      const thr = fvg.fvgLow - buf;
      const broken =
        settings.ifvgBreakMode === "close" ? c.close < thr : c.low < thr;
      if (broken) {
        return {
          id: ifvgId,
          direction: "BEARISH",
          ifvgLow: fvg.fvgLow,
          ifvgHigh: fvg.fvgHigh,
          sourceFvgId: fvg.id,
          invalidationIndex: j,
          ifvgBreakIndex: j,
          fvgStartIndex: fvg.fvgStartIndex,
          fvgMiddleIndex: fvg.fvgMiddleIndex,
          fvgEndIndex: fvg.fvgEndIndex,
          time: c.time,
        };
      }
    } else {
      const thr = fvg.fvgHigh + buf;
      const broken =
        settings.ifvgBreakMode === "close" ? c.close > thr : c.high > thr;
      if (broken) {
        return {
          id: ifvgId,
          direction: "BULLISH",
          ifvgLow: fvg.fvgLow,
          ifvgHigh: fvg.fvgHigh,
          sourceFvgId: fvg.id,
          invalidationIndex: j,
          ifvgBreakIndex: j,
          fvgStartIndex: fvg.fvgStartIndex,
          fvgMiddleIndex: fvg.fvgMiddleIndex,
          fvgEndIndex: fvg.fvgEndIndex,
          time: c.time,
        };
      }
    }
  }
  return null;
}
