/**
 * **Fictional checkpoint-8 fixtures** — not Strategy Tester output, not profitable claims, not broker truth.
 * Used for unit tests and optional dashboard copy only.
 */

import { CHECKPOINT7_MOCK_STRATEGY_ID } from "./strategy-registry-fixtures";
import { evaluateBacktestApproval } from "./backtest-approval";
import { calculateBacktestSummary } from "./backtest-metrics";
import { createDefaultBacktestMetricThresholdsForTests } from "./backtest-settings";
import type { BacktestApprovalResult, BacktestRun, BacktestTrade } from "./backtest-types";

const ISO_BASE = "2025-01-01T12:00:00.000Z";

function synthTradesGood(n: number, runId: string, parameterSetId: string, symbol: string): BacktestTrade[] {
  const out: BacktestTrade[] = [];
  for (let i = 0; i < n; i++) {
    const win = i % 3 !== 0;
    const r = win ? 0.9 + (i % 5) * 0.02 : -1.0;
    out.push({
      tradeId: `${runId}_t_${i}`,
      runId,
      strategyId: CHECKPOINT7_MOCK_STRATEGY_ID,
      parameterSetId,
      canonicalSymbol: symbol,
      direction: i % 2 === 0 ? "BUY" : "SELL",
      entryTime: `2025-02-${String((i % 27) + 1).padStart(2, "0")}T10:00:00.000Z`,
      exitTime: `2025-02-${String((i % 27) + 1).padStart(2, "0")}T15:00:00.000Z`,
      entryPrice: 2000 + i,
      exitPrice: 2000 + i + r * 2,
      resultMoney: r * 100,
      resultR: r,
    });
  }
  return out;
}

function synthTradesBadPf(n: number, runId: string, parameterSetId: string, symbol: string): BacktestTrade[] {
  const out: BacktestTrade[] = [];
  for (let i = 0; i < n; i++) {
    const win = i % 4 === 0;
    const r = win ? 0.35 : -0.9;
    out.push({
      tradeId: `${runId}_t_${i}`,
      runId,
      strategyId: CHECKPOINT7_MOCK_STRATEGY_ID,
      parameterSetId,
      canonicalSymbol: symbol,
      direction: "SELL",
      entryTime: `2024-06-${String((i % 28) + 1).padStart(2, "0")}T08:00:00.000Z`,
      exitTime: `2024-06-${String((i % 28) + 1).padStart(2, "0")}T12:00:00.000Z`,
      entryPrice: 1.1,
      exitPrice: 1.1 + r * 0.01,
      resultMoney: r * 50,
      resultR: r,
    });
  }
  return out;
}

/** Forward-split fictional run: passes default demo + alerts + trade-review thresholds. */
export function createCheckpoint8MockXauForwardRun(): BacktestRun {
  const runId = "CP8_MOCK_RUN_XAU_FORWARD";
  const parameterSetId = "MZP_IFVG_XAUUSD_V1_SET_003";
  const trades = synthTradesGood(40, runId, parameterSetId, "XAUUSD");
  const summary = calculateBacktestSummary(trades);
  return {
    runId,
    strategyId: CHECKPOINT7_MOCK_STRATEGY_ID,
    parameterSetId,
    canonicalSymbol: "XAUUSD",
    sourceType: "manual_mock",
    datasetSplit: "forward",
    dateFrom: "2025-01-01T00:00:00.000Z",
    dateTo: "2025-04-01T00:00:00.000Z",
    importedAt: ISO_BASE,
    summary,
    trades,
    warnings: [],
    notes: "Synthetic trades for checkpoint 8 — not from MT5 Strategy Tester.",
  };
}

/** Validation split but too few trades → advisory `insufficient_data` under default thresholds. */
export function createCheckpoint8MockEurInsufficientRun(): BacktestRun {
  const runId = "CP8_MOCK_RUN_EUR_INSUFFICIENT";
  const parameterSetId = "MZP_IFVG_EURUSD_V1_SET_001";
  const trades = synthTradesGood(12, runId, parameterSetId, "EURUSD");
  const summary = calculateBacktestSummary(trades);
  return {
    runId,
    strategyId: CHECKPOINT7_MOCK_STRATEGY_ID,
    parameterSetId,
    canonicalSymbol: "EURUSD",
    sourceType: "manual_mock",
    datasetSplit: "validation",
    dateFrom: "2025-01-01T00:00:00.000Z",
    dateTo: "2025-02-01T00:00:00.000Z",
    importedAt: ISO_BASE,
    summary,
    trades,
    warnings: [],
    notes: "Small sample on purpose — illustrates insufficient_data, not performance.",
  };
}

/** Train split with enough trades but awful PF — rejected on numeric gates. */
export function createCheckpoint8MockNasRejectedRun(): BacktestRun {
  const runId = "CP8_MOCK_RUN_NAS_REJECTED";
  const parameterSetId = "MZP_IFVG_NAS100_LEGACY_REJECTED";
  const trades = synthTradesBadPf(45, runId, parameterSetId, "NAS100");
  const summary = calculateBacktestSummary(trades);
  return {
    runId,
    strategyId: CHECKPOINT7_MOCK_STRATEGY_ID,
    parameterSetId,
    canonicalSymbol: "NAS100",
    sourceType: "manual_mock",
    datasetSplit: "train",
    dateFrom: "2024-01-01T00:00:00.000Z",
    dateTo: "2024-12-01T00:00:00.000Z",
    importedAt: ISO_BASE,
    summary,
    trades,
    warnings: [],
    notes: "Synthetic losing bias — lab narrative only.",
  };
}

export interface Checkpoint8MockFixtureRow {
  parameterSetId: string;
  run: BacktestRun;
  approval: BacktestApprovalResult;
}

/** Pre-evaluated rows keyed for dashboard / tests (registry is not mutated). */
export function createCheckpoint8MockFixtureRows(): Checkpoint8MockFixtureRow[] {
  const thresholds = createDefaultBacktestMetricThresholdsForTests();
  const xau = createCheckpoint8MockXauForwardRun();
  const eur = createCheckpoint8MockEurInsufficientRun();
  const nas = createCheckpoint8MockNasRejectedRun();
  return [
    { parameterSetId: xau.parameterSetId, run: xau, approval: evaluateBacktestApproval({ run: xau, thresholds }) },
    { parameterSetId: eur.parameterSetId, run: eur, approval: evaluateBacktestApproval({ run: eur, thresholds }) },
    { parameterSetId: nas.parameterSetId, run: nas, approval: evaluateBacktestApproval({ run: nas, thresholds }) },
  ];
}

export function getCheckpoint8MockApprovalForParameterSet(parameterSetId: string): BacktestApprovalResult | null {
  const row = createCheckpoint8MockFixtureRows().find((r) => r.parameterSetId === parameterSetId);
  return row ? row.approval : null;
}

export function getCheckpoint8MockRunForParameterSet(parameterSetId: string): BacktestRun | null {
  const row = createCheckpoint8MockFixtureRows().find((r) => r.parameterSetId === parameterSetId);
  return row ? row.run : null;
}
