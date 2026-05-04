import type { Candle } from "./candle";

/**
 * True range for bar `current`; if `previous` is absent, uses high−low only (first bar convention).
 */
export function calculateTrueRange(current: Candle, previous: Candle | undefined): number {
  const hl = current.high - current.low;
  if (!previous) return hl;
  const pc = previous.close;
  return Math.max(hl, Math.abs(current.high - pc), Math.abs(current.low - pc));
}

/**
 * Wilder-smoothed ATR series (common MT5 `iATR` family). See IMPLEMENTATION_ASSUMPTIONS for V1 note.
 * Index `i` is null until `i >= period` (0-based), then ATR is defined.
 */
export function calculateAtrSeries(candles: Candle[], period: number): (number | null)[] {
  if (period < 1 || candles.length === 0) {
    return candles.map(() => null);
  }
  const n = candles.length;
  const tr: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    tr[i] = calculateTrueRange(candles[i], i > 0 ? candles[i - 1] : undefined);
  }
  const out: (number | null)[] = new Array(n).fill(null);
  if (n < period + 1) return out;

  let sum = 0;
  for (let i = 1; i <= period; i++) {
    sum += tr[i];
  }
  let atr = sum / period;
  out[period] = atr;
  for (let i = period + 1; i < n; i++) {
    atr = (atr * (period - 1) + tr[i]) / period;
    out[i] = atr;
  }
  return out;
}

/** Last defined ATR at end of series, or null if insufficient history. */
export function calculateATR(candles: Candle[], period: number): number | null {
  const s = calculateAtrSeries(candles, period);
  for (let i = s.length - 1; i >= 0; i--) {
    if (s[i] != null) return s[i]!;
  }
  return null;
}

/** ATR value at bar index `i`, or null. */
export function atrAtIndex(series: (number | null)[], i: number): number | null {
  if (i < 0 || i >= series.length) return null;
  return series[i];
}
