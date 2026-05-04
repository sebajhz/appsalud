import type { Candle } from "./candle";

export type SwingType = "HIGH" | "LOW";

export interface SwingPoint {
  type: SwingType;
  /** Index of the pivot candle in the series. */
  index: number;
  price: number;
  time: number;
  /** Index of last bar required to confirm this swing (inclusive). */
  confirmedAtIndex: number;
  /** Same as candles[confirmedAtIndex].time when available. */
  confirmedAtTime: number;
}

export interface SwingDetectorSettings {
  swingLeftBars: number;
  swingRightBars: number;
}

function maxHigh(candles: Candle[], from: number, to: number): number {
  let m = -Infinity;
  for (let i = from; i <= to; i++) {
    m = Math.max(m, candles[i].high);
  }
  return m;
}

function minLow(candles: Candle[], from: number, to: number): number {
  let m = Infinity;
  for (let i = from; i <= to; i++) {
    m = Math.min(m, candles[i].low);
  }
  return m;
}

/**
 * Detect swing highs/lows per Mapazapp_IFVG_Numerical_Detection_MT5_Backtest_Spec_V1 §7.
 * Swings are only emitted when `confirmedAtIndex <= candles.length - 1` (enough right bars in historical mode).
 */
export function detectSwings(candles: Candle[], settings: SwingDetectorSettings): SwingPoint[] {
  const L = settings.swingLeftBars;
  const R = settings.swingRightBars;
  const out: SwingPoint[] = [];
  const n = candles.length;
  if (n < L + R + 1) return out;

  for (let i = L; i < n - R; i++) {
    const confirmedAt = i + R;
    if (confirmedAt >= n) continue;

    const leftHigh = maxHigh(candles, i - L, i - 1);
    const rightHigh = maxHigh(candles, i + 1, i + R);
    if (candles[i].high > leftHigh && candles[i].high > rightHigh) {
      out.push({
        type: "HIGH",
        index: i,
        price: candles[i].high,
        time: candles[i].time,
        confirmedAtIndex: confirmedAt,
        confirmedAtTime: candles[confirmedAt].time,
      });
    }

    const leftLow = minLow(candles, i - L, i - 1);
    const rightLow = minLow(candles, i + 1, i + R);
    if (candles[i].low < leftLow && candles[i].low < rightLow) {
      out.push({
        type: "LOW",
        index: i,
        price: candles[i].low,
        time: candles[i].time,
        confirmedAtIndex: confirmedAt,
        confirmedAtTime: candles[confirmedAt].time,
      });
    }
  }
  return out;
}
