/**
 * OHLC candle model — prices in quote currency (not pips).
 * Aligns with Mapazapp_IFVG_Numerical_Detection_MT5_Backtest_Spec_V1 §4 (time, OHLC, tick_volume, spread).
 */

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  tickVolume?: number;
  /** Spread in points when known; callers map to spreadPrice via point. */
  spreadPoints?: number;
  /** When false/undefined, bar may still be forming (live semantics). */
  isClosed?: boolean;
}
