import type { Candle } from "./candle";

export type FvgDirection = "BULLISH" | "BEARISH";

export interface FairValueGap {
  id: string;
  direction: FvgDirection;
  /** Lower bound of gap in price units. */
  fvgLow: number;
  /** Upper bound of gap in price units. */
  fvgHigh: number;
  /** Index of middle candle (B) in A=i-1, B=i, C=i+1. */
  centerIndex: number;
  /** Index of candle A (left neighbour of center). */
  fvgStartIndex: number;
  /** Same as `centerIndex` — middle candle B. */
  fvgMiddleIndex: number;
  /** Index of candle C (right neighbour of center). */
  fvgEndIndex: number;
  time: number;
  size: number;
}

export interface FvgDetectorSettings {
  fvgMinSizeAtr: number;
  fvgMaxSizeAtr: number;
}

/**
 * Three-candle FVG at center index `i` (requires neighbors). Blueprint §10.1 + Numerical Spec §9.
 */
export function detectFvgAtIndex(
  candles: Candle[],
  i: number,
  atr: number | null,
  settings: FvgDetectorSettings,
  id: string,
): FairValueGap | null {
  if (i < 1 || i >= candles.length - 1 || atr == null || atr <= 0) return null;
  const A = candles[i - 1];
  const B = candles[i];
  const C = candles[i + 1];

  let direction: FvgDirection | null = null;
  let fvgLow = 0;
  let fvgHigh = 0;

  if (C.low > A.high) {
    direction = "BULLISH";
    fvgLow = A.high;
    fvgHigh = C.low;
  } else if (C.high < A.low) {
    direction = "BEARISH";
    fvgLow = C.high;
    fvgHigh = A.low;
  } else {
    return null;
  }

  const size = Math.abs(fvgHigh - fvgLow);
  const minS = atr * settings.fvgMinSizeAtr;
  const maxS = atr * settings.fvgMaxSizeAtr;
  if (size < minS || size > maxS) return null;

  return {
    id,
    direction,
    fvgLow,
    fvgHigh,
    centerIndex: i,
    fvgStartIndex: i - 1,
    fvgMiddleIndex: i,
    fvgEndIndex: i + 1,
    time: B.time,
    size,
  };
}
