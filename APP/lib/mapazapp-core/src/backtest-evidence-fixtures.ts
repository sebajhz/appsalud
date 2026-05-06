/**
 * **Checkpoint 15 fictional evidence bundles** — not Strategy Tester exports, not profitability claims.
 */

import { calculateBacktestSummary } from "./backtest-metrics";
import { CHECKPOINT7_MOCK_STRATEGY_ID } from "./strategy-registry-fixtures";
import type { BacktestRun, BacktestTrade } from "./backtest-types";
import { createDefaultBacktestEvidenceThresholdsForTests } from "./backtest-evidence-settings";
import type { BacktestEvidenceBundle } from "./backtest-evidence-types";
import { evaluateBacktestEvidenceWithProposal } from "./backtest-evidence-evaluator";

const ISO_BASE = "2026-03-01T12:00:00.000Z";

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
      entryTime: `2026-02-${String((i % 27) + 1).padStart(2, "0")}T10:00:00.000Z`,
      exitTime: `2026-02-${String((i % 27) + 1).padStart(2, "0")}T15:00:00.000Z`,
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
    const win = i % 5 === 0;
    const r = win ? 0.2 : -0.95;
    out.push({
      tradeId: `${runId}_t_${i}`,
      runId,
      strategyId: CHECKPOINT7_MOCK_STRATEGY_ID,
      parameterSetId,
      canonicalSymbol: symbol,
      direction: "SELL",
      entryTime: `2026-01-${String((i % 28) + 1).padStart(2, "0")}T08:00:00.000Z`,
      exitTime: `2026-01-${String((i % 28) + 1).padStart(2, "0")}T12:00:00.000Z`,
      entryPrice: 1.1,
      exitPrice: 1.1 + r * 0.01,
      resultMoney: r * 50,
      resultR: r,
    });
  }
  return out;
}

function mkRun(params: {
  runId: string;
  parameterSetId: string;
  symbol: string;
  split: BacktestRun["datasetSplit"];
  trades: BacktestTrade[];
}): BacktestRun {
  const { runId, parameterSetId, symbol, split, trades } = params;
  return {
    runId,
    strategyId: CHECKPOINT7_MOCK_STRATEGY_ID,
    parameterSetId,
    canonicalSymbol: symbol,
    sourceType: "manual_mock",
    datasetSplit: split,
    dateFrom: "2026-01-01T00:00:00.000Z",
    dateTo: "2026-04-01T00:00:00.000Z",
    importedAt: ISO_BASE,
    summary: calculateBacktestSummary(trades),
    trades,
    warnings: [],
    notes: "Synthetic checkpoint-15 bundle — fictional metrics.",
  };
}

/** Train + validation pass; no forward → advisory alerts candidate (default thresholds). */
export function createCheckpoint15MockRunsAlertsOnlyPath(): BacktestRun[] {
  const ps = "MZP_IFVG_EURUSD_V1_SET_001";
  const sym = "EURUSD";
  const train = mkRun({
    runId: "CP15_RUN_EUR_TRAIN",
    parameterSetId: ps,
    symbol: sym,
    split: "train",
    trades: synthTradesGood(35, "CP15_RUN_EUR_TRAIN", ps, sym),
  });
  const val = mkRun({
    runId: "CP15_RUN_EUR_VAL",
    parameterSetId: ps,
    symbol: sym,
    split: "validation",
    trades: synthTradesGood(36, "CP15_RUN_EUR_VAL", ps, sym),
  });
  return [train, val];
}

/** Validation-era metrics fail numeric gates. */
export function createCheckpoint15MockRunsValidationFailure(): BacktestRun[] {
  const ps = "MZP_IFVG_NAS100_LEGACY_REJECTED";
  const sym = "NAS100";
  return [
    mkRun({
      runId: "CP15_RUN_NAS_VAL_BAD",
      parameterSetId: ps,
      symbol: sym,
      split: "validation",
      trades: synthTradesBadPf(45, "CP15_RUN_NAS_VAL_BAD", ps, sym),
    }),
  ];
}

/** Mixed canonical symbols for one cohort → inconsistent_evidence. */
export function createCheckpoint15MockRunsInconsistentSymbol(): BacktestRun[] {
  const ps = "MZP_CP15_FICTIVE_SYMBOL_MIX";
  const t1 = synthTradesGood(32, "CP15_MIX_A", ps, "GBPUSD");
  const t2 = synthTradesGood(32, "CP15_MIX_B", ps, "EURUSD");
  return [
    mkRun({ runId: "CP15_MIX_A", parameterSetId: ps, symbol: "GBPUSD", split: "validation", trades: t1 }),
    mkRun({ runId: "CP15_MIX_B", parameterSetId: ps, symbol: "EURUSD", split: "validation", trades: t2 }),
  ];
}

/** Validation + forward pass → trade-review candidate (recommendation only). */
export function createCheckpoint15MockRunsTradeReviewPath(): BacktestRun[] {
  const ps = "MZP_IFVG_XAUUSD_V1_SET_003";
  const sym = "XAUUSD";
  return [
    mkRun({
      runId: "CP15_RUN_XAU_VAL",
      parameterSetId: ps,
      symbol: sym,
      split: "validation",
      trades: synthTradesGood(38, "CP15_RUN_XAU_VAL", ps, sym),
    }),
    mkRun({
      runId: "CP15_RUN_XAU_FWD",
      parameterSetId: ps,
      symbol: sym,
      split: "forward",
      trades: synthTradesGood(40, "CP15_RUN_XAU_FWD", ps, sym),
    }),
  ];
}

export function buildCheckpoint15MockEvidenceBundle(runs: BacktestRun[]): BacktestEvidenceBundle {
  const thresholds = createDefaultBacktestEvidenceThresholdsForTests();
  const { evaluation, proposal } = evaluateBacktestEvidenceWithProposal({
    runs,
    thresholds,
    evidenceSource: "fixture",
  });
  return {
    runs,
    importErrors: [],
    importWarnings: [],
    evaluation,
    proposal,
  };
}

const CP15_MOCK_BUNDLE_BY_PARAMETER_SET_ID: Record<string, () => BacktestRun[]> = {
  MZP_IFVG_EURUSD_V1_SET_001: createCheckpoint15MockRunsAlertsOnlyPath,
  MZP_IFVG_NAS100_LEGACY_REJECTED: createCheckpoint15MockRunsValidationFailure,
  MZP_IFVG_XAUUSD_V1_SET_003: createCheckpoint15MockRunsTradeReviewPath,
};

/** Optional narrative fixture not present in checkpoint-7 registry (tests only). */
export function createCheckpoint15MockRunsSymbolMixFixture(): BacktestRun[] {
  return createCheckpoint15MockRunsInconsistentSymbol();
}

export function getCheckpoint15MockEvidenceBundleByParameterSetId(parameterSetId: string): BacktestEvidenceBundle | null {
  const fn = CP15_MOCK_BUNDLE_BY_PARAMETER_SET_ID[parameterSetId];
  if (!fn) return null;
  return buildCheckpoint15MockEvidenceBundle(fn());
}

export function listCheckpoint15MockEvidenceSummaries(): Array<{
  parameterSetId: string;
  status: BacktestEvidenceBundle["evaluation"]["status"];
  manualReviewRequired: true;
  registryMutationAllowed: false;
}> {
  return Object.keys(CP15_MOCK_BUNDLE_BY_PARAMETER_SET_ID).map((parameterSetId) => {
    const bundle = getCheckpoint15MockEvidenceBundleByParameterSetId(parameterSetId)!;
    return {
      parameterSetId,
      status: bundle.evaluation.status,
      manualReviewRequired: true,
      registryMutationAllowed: false,
    };
  });
}
