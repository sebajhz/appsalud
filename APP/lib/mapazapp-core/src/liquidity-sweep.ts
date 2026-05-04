import type { Candle } from "./candle";
import { nearSweepTolerancePrice, sweepTolerancePrice } from "./normalize";

export type SweepStatus = "CONFIRMED_SWEEP" | "NEAR_SWEEP" | "NO_SWEEP" | "POSSIBLE_BREAK_RISK";

/** Buy-setup sweep of lower pool vs sell-setup sweep of upper pool (Numerical Spec §8.1–8.2). */
export type LiquiditySweepPool = "BUY_SETUP_LOWER_SWING" | "SELL_SETUP_UPPER_SWING";

export interface LiquiditySweepToleranceContext {
  atr: number;
  spreadPrice: number;
  tickSize: number;
  sweepToleranceAtr: number;
  sweepSpreadFactor: number;
  minSweepTicks: number;
  nearSweepToleranceAtr: number;
  nearSweepSpreadFactor: number;
  minNearSweepTicks: number;
}

export interface LiquiditySweepSettings {
  reclaimBars: number;
}

export interface LiquiditySweepResult {
  status: SweepStatus;
  pool: LiquiditySweepPool;
  /** Bar where sweep geometry was first detected (penetration or near band). */
  sweepEventIndex: number | null;
  /** Bar where reclaim satisfied, if applicable. */
  reclaimIndex: number | null;
  /** Swing level price (low for buy-setup lower, high for sell-setup upper). */
  swingLevel: number;
}

function sweepTol(ctx: LiquiditySweepToleranceContext): number {
  return sweepTolerancePrice({
    atr: ctx.atr,
    sweepToleranceAtr: ctx.sweepToleranceAtr,
    spreadPrice: ctx.spreadPrice,
    sweepSpreadFactor: ctx.sweepSpreadFactor,
    tickSize: ctx.tickSize,
    minSweepTicks: ctx.minSweepTicks,
  });
}

function nearTol(ctx: LiquiditySweepToleranceContext): number {
  return nearSweepTolerancePrice({
    atr: ctx.atr,
    nearSweepToleranceAtr: ctx.nearSweepToleranceAtr,
    spreadPrice: ctx.spreadPrice,
    nearSweepSpreadFactor: ctx.nearSweepSpreadFactor,
    tickSize: ctx.tickSize,
    minNearSweepTicks: ctx.minNearSweepTicks,
  });
}

/**
 * Buy-setup: sweep under `swingLow` then reclaim above `swingLow` within `reclaimBars`
 * (Numerical Spec §8.1). Uses dynamic tolerances from blueprint §8.2.
 */
export function detectLowerPoolSweepForBuy(
  candles: Candle[],
  swingLow: number,
  searchFromIndex: number,
  searchToIndex: number,
  ctx: LiquiditySweepToleranceContext,
  settings: LiquiditySweepSettings,
): LiquiditySweepResult {
  const st = sweepTol(ctx);
  const nt = nearTol(ctx);
  const line = swingLow - st;

  let firstConfirmedIdx: number | null = null;
  let firstNearIdx: number | null = null;

  const from = Math.max(0, searchFromIndex);
  const to = Math.min(candles.length - 1, searchToIndex);

  for (let i = from; i <= to; i++) {
    const low = candles[i].low;
    if (low < line) {
      firstConfirmedIdx = i;
      break;
    }
    /** Near: no confirmed break, but low sits within `nearTol` above the penetration line (blueprint §8.3). */
    if (low >= line && low - line <= nt && firstNearIdx === null) {
      firstNearIdx = i;
    }
  }

  if (firstConfirmedIdx !== null) {
    const maxJ = Math.min(candles.length - 1, firstConfirmedIdx + settings.reclaimBars);
    for (let j = firstConfirmedIdx + 1; j <= maxJ; j++) {
      if (candles[j].close > swingLow) {
        return {
          status: "CONFIRMED_SWEEP",
          pool: "BUY_SETUP_LOWER_SWING",
          sweepEventIndex: firstConfirmedIdx,
          reclaimIndex: j,
          swingLevel: swingLow,
        };
      }
    }
    return {
      status: "POSSIBLE_BREAK_RISK",
      pool: "BUY_SETUP_LOWER_SWING",
      sweepEventIndex: firstConfirmedIdx,
      reclaimIndex: null,
      swingLevel: swingLow,
    };
  }

  if (firstNearIdx !== null) {
    return {
      status: "NEAR_SWEEP",
      pool: "BUY_SETUP_LOWER_SWING",
      sweepEventIndex: firstNearIdx,
      reclaimIndex: null,
      swingLevel: swingLow,
    };
  }

  return {
    status: "NO_SWEEP",
    pool: "BUY_SETUP_LOWER_SWING",
    sweepEventIndex: null,
    reclaimIndex: null,
    swingLevel: swingLow,
  };
}

/**
 * Sell-setup: sweep above `swingHigh` then reclaim below `swingHigh` (Numerical Spec §8.2).
 */
export function detectUpperPoolSweepForSell(
  candles: Candle[],
  swingHigh: number,
  searchFromIndex: number,
  searchToIndex: number,
  ctx: LiquiditySweepToleranceContext,
  settings: LiquiditySweepSettings,
): LiquiditySweepResult {
  const st = sweepTol(ctx);
  const nt = nearTol(ctx);
  const line = swingHigh + st;

  let firstConfirmedIdx: number | null = null;
  let firstNearIdx: number | null = null;

  const from = Math.max(0, searchFromIndex);
  const to = Math.min(candles.length - 1, searchToIndex);

  for (let i = from; i <= to; i++) {
    const high = candles[i].high;
    if (high > line) {
      firstConfirmedIdx = i;
      break;
    }
    if (high <= line && line - high <= nt && line - high > 0 && firstNearIdx === null) {
      firstNearIdx = i;
    }
  }

  if (firstConfirmedIdx !== null) {
    const maxJ = Math.min(candles.length - 1, firstConfirmedIdx + settings.reclaimBars);
    for (let j = firstConfirmedIdx + 1; j <= maxJ; j++) {
      if (candles[j].close < swingHigh) {
        return {
          status: "CONFIRMED_SWEEP",
          pool: "SELL_SETUP_UPPER_SWING",
          sweepEventIndex: firstConfirmedIdx,
          reclaimIndex: j,
          swingLevel: swingHigh,
        };
      }
    }
    return {
      status: "POSSIBLE_BREAK_RISK",
      pool: "SELL_SETUP_UPPER_SWING",
      sweepEventIndex: firstConfirmedIdx,
      reclaimIndex: null,
      swingLevel: swingHigh,
    };
  }

  if (firstNearIdx !== null) {
    return {
      status: "NEAR_SWEEP",
      pool: "SELL_SETUP_UPPER_SWING",
      sweepEventIndex: firstNearIdx,
      reclaimIndex: null,
      swingLevel: swingHigh,
    };
  }

  return {
    status: "NO_SWEEP",
    pool: "SELL_SETUP_UPPER_SWING",
    sweepEventIndex: null,
    reclaimIndex: null,
    swingLevel: swingHigh,
  };
}
