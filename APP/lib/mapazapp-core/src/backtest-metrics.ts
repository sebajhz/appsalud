import type { BacktestSummary, BacktestTrade } from "./backtest-types";

function isWin(tr: BacktestTrade): boolean {
  return tr.resultR > 0;
}

function isLoss(tr: BacktestTrade): boolean {
  return tr.resultR < 0;
}

export function calculateTradeCount(trades: BacktestTrade[]): number {
  return trades.length;
}

export function calculateWinRate(trades: BacktestTrade[]): number {
  if (trades.length === 0) return 0;
  const wins = trades.filter(isWin).length;
  return wins / trades.length;
}

/**
 * Profit factor from R-multiples: gross winning R / gross losing R (absolute).
 * When there are no losing trades but gross wins > 0, returns `Number.POSITIVE_INFINITY` (documented sentinel).
 * When no wins and no losses (or all zero), returns 0.
 */
export function calculateProfitFactor(trades: BacktestTrade[]): number {
  let grossWinR = 0;
  let grossLossR = 0;
  for (const t of trades) {
    if (t.resultR > 0) grossWinR += t.resultR;
    else if (t.resultR < 0) grossLossR += -t.resultR;
  }
  if (grossLossR === 0) {
    if (grossWinR > 0) return Number.POSITIVE_INFINITY;
    return 0;
  }
  return grossWinR / grossLossR;
}

export function calculateExpectancyR(trades: BacktestTrade[]): number {
  if (trades.length === 0) return 0;
  let sum = 0;
  for (const t of trades) sum += t.resultR;
  return sum / trades.length;
}

export function calculateTotalR(trades: BacktestTrade[]): number {
  let sum = 0;
  for (const t of trades) sum += t.resultR;
  return sum;
}

/** Peak-to-trough drop in cumulative R (non-negative). */
export function calculateMaxDrawdownR(trades: BacktestTrade[]): number {
  let peak = 0;
  let equity = 0;
  let maxDd = 0;
  for (const t of trades) {
    equity += t.resultR;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}

export function calculateMaxLosingStreak(trades: BacktestTrade[]): number {
  let cur = 0;
  let best = 0;
  for (const t of trades) {
    if (t.resultR < 0) {
      cur += 1;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  return best;
}

export function calculateAverageWinR(trades: BacktestTrade[]): number {
  const wins = trades.filter(isWin);
  if (wins.length === 0) return 0;
  let s = 0;
  for (const t of wins) s += t.resultR;
  return s / wins.length;
}

export function calculateAverageLossR(trades: BacktestTrade[]): number {
  const losses = trades.filter(isLoss);
  if (losses.length === 0) return 0;
  let s = 0;
  for (const t of losses) s += t.resultR;
  return s / losses.length;
}

export function calculateGrossWinR(trades: BacktestTrade[]): number {
  let s = 0;
  for (const t of trades) if (t.resultR > 0) s += t.resultR;
  return s;
}

export function calculateGrossLossR(trades: BacktestTrade[]): number {
  let s = 0;
  for (const t of trades) if (t.resultR < 0) s += -t.resultR;
  return s;
}

export function calculateBacktestSummary(trades: BacktestTrade[]): BacktestSummary {
  return {
    tradeCount: calculateTradeCount(trades),
    winRate: calculateWinRate(trades),
    profitFactor: calculateProfitFactor(trades),
    expectancyR: calculateExpectancyR(trades),
    totalR: calculateTotalR(trades),
    maxDrawdownR: calculateMaxDrawdownR(trades),
    maxLosingStreak: calculateMaxLosingStreak(trades),
    averageWinR: calculateAverageWinR(trades),
    averageLossR: calculateAverageLossR(trades),
    grossWinR: calculateGrossWinR(trades),
    grossLossR: calculateGrossLossR(trades),
  };
}
