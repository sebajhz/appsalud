import { describe, expect, it } from "vitest";
import {
  assembleBacktestRunFromImportedTrades,
  calculateBacktestSummary,
  calculateExpectancyR,
  calculateMaxLosingStreak,
  calculateProfitFactor,
  calculateWinRate,
  createCheckpoint7MockParameterSetRegistry,
  createCheckpoint8MockEurInsufficientRun,
  createCheckpoint8MockNasRejectedRun,
  createCheckpoint8MockXauForwardRun,
  createDefaultBacktestMetricThresholdsForTests,
  createDefaultStrategyRegistryEvaluationSettings,
  deriveRecommendedParameterSetStatusFromBacktest,
  evaluateBacktestApproval,
  evaluateParameterSetCompatibility,
  importBacktestTradesFromCsv,
} from "../src/index";

describe("Checkpoint 8 — metrics", () => {
  it("win rate and profit factor on mixed trades", () => {
    const trades = [
      mk("1", 1),
      mk("2", -1),
      mk("3", 1.5),
      mk("4", -0.5),
    ];
    expect(calculateWinRate(trades)).toBe(0.5);
    const pf = calculateProfitFactor(trades);
    expect(pf).toBeGreaterThan(1);
    expect(calculateExpectancyR(trades)).toBe(0.25);
    expect(calculateMaxLosingStreak(trades)).toBe(1);
  });

  it("empty trades are safe", () => {
    const s = calculateBacktestSummary([]);
    expect(s.tradeCount).toBe(0);
    expect(s.winRate).toBe(0);
    expect(s.profitFactor).toBe(0);
    expect(s.expectancyR).toBe(0);
    expect(s.maxDrawdownR).toBe(0);
    expect(s.maxLosingStreak).toBe(0);
  });

  it("profit factor is Infinity when no losing trades but wins exist", () => {
    const trades = [mk("a", 1), mk("b", 0.5)];
    expect(calculateProfitFactor(trades)).toBe(Number.POSITIVE_INFINITY);
  });

  it("max losing streak counts consecutive losses", () => {
    const trades = [mk("1", 1), mk("2", -1), mk("3", -1), mk("4", -1), mk("5", 1), mk("6", -1)];
    expect(calculateMaxLosingStreak(trades)).toBe(3);
  });
});

describe("Checkpoint 8 — CSV importer", () => {
  const baseOpts = {
    strategyId: "MZP_IFVG_ZONE_REACTION_V1",
    parameterSetId: "MZP_IFVG_XAUUSD_V1_SET_003",
    canonicalSymbol: "XAUUSD",
    datasetSplit: "train" as const,
    sourceType: "mapazapp_testea_csv" as const,
    runId: "RUN_CSV_1",
  };

  it("valid CSV imports trades", () => {
    const csv = [
      "trade_id,direction,entry_time,exit_time,entry_price,exit_price,result_r,result_money",
      "t1,BUY,2025-01-01T10:00:00Z,2025-01-01T11:00:00Z,2000,2010,1.2,100",
      "t2,SELL,2025-01-02T10:00:00Z,2025-01-02T11:00:00Z,2010,2005,0.8,80",
    ].join("\n");
    const r = importBacktestTradesFromCsv(csv, baseOpts);
    expect(r.ok).toBe(true);
    expect(r.errors).toHaveLength(0);
    expect(r.trades).toHaveLength(2);
    expect(r.trades[0]!.tradeId).toBe("t1");
    expect(r.warnings.some((w) => w.code === "CSV_RESULT_MONEY_MISSING")).toBe(false);
  });

  it("header-only CSV (E3.4.2 TestEA trades header) imports zero trades with warning", () => {
    const csv = [
      "run_id,trade_id,timestamp,symbol,timeframe,direction,bias_direction,setup_direction,entry,sl,tp,result_r,exit_reason,setup_reason,bias_reason,rejection_reason",
    ].join("\n");
    const r = importBacktestTradesFromCsv(csv, baseOpts);
    expect(r.ok).toBe(true);
    expect(r.trades).toHaveLength(0);
    expect(r.warnings.some((w) => w.code === "CSV_HEADER_ONLY_NO_TRADE_ROWS")).toBe(true);
  });

  it("missing required column returns error", () => {
    const csv = ["trade_id,direction,entry_time,exit_time,entry_price,exit_price", "t1,BUY,a,b,1,2"].join("\n");
    const r = importBacktestTradesFromCsv(csv, baseOpts);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "CSV_MISSING_COLUMN")).toBe(true);
    expect(r.trades).toHaveLength(0);
  });

  it("optional result_money missing produces warnings", () => {
    const csv = [
      "trade_id,direction,entry_time,exit_time,entry_price,exit_price,result_r",
      "t1,BUY,2025-01-01T10:00:00Z,2025-01-01T11:00:00Z,2000,2010,1.2",
    ].join("\n");
    const r = importBacktestTradesFromCsv(csv, baseOpts);
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.code === "CSV_RESULT_MONEY_MISSING")).toBe(true);
  });

  it("invalid required numeric produces row error and ok false", () => {
    const csv = [
      "trade_id,direction,entry_time,exit_time,entry_price,exit_price,result_r",
      "t1,BUY,2025-01-01T10:00:00Z,2025-01-01T11:00:00Z,notnum,2010,1.2",
    ].join("\n");
    const r = importBacktestTradesFromCsv(csv, baseOpts);
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.trades).toHaveLength(0);
  });

  it("assembleBacktestRunFromImportedTrades builds summary", () => {
    const csv = [
      "trade_id,direction,entry_time,exit_time,entry_price,exit_price,result_r,result_money",
      "t1,BUY,2025-01-01T10:00:00Z,2025-01-01T11:00:00Z,2000,2010,1.2,0",
    ].join("\n");
    const imp = importBacktestTradesFromCsv(csv, baseOpts);
    const run = assembleBacktestRunFromImportedTrades(imp, baseOpts);
    expect(run).not.toBeNull();
    expect(run!.summary.tradeCount).toBe(1);
    expect(run!.trades).toHaveLength(1);
  });
});

describe("Checkpoint 14 — Mapazapp_TestEA CSV shape (CP8 importer)", () => {
  const testeaOpts = {
    strategyId: "MZP_IFVG_ZONE_REACTION_V1",
    parameterSetId: "MZP_IFVG_XAUUSD_V1_SET_003",
    canonicalSymbol: "XAUUSD",
    brokerSymbol: "XAUUSD_FICTIVE",
    accountId: "TESTER_ACCOUNT",
    datasetSplit: "validation" as const,
    sourceType: "mapazapp_testea_csv" as const,
    runId: "TESTEA_SAMPLE_RUN",
  };

  const MAPAZAPP_TESTEA_SAMPLE_CSV = [
    "run_id,trade_id,strategy_id,parameter_set_id,symbol,broker_symbol,account_id,direction,entry_time,exit_time,entry_price,exit_price,sl,tp,result_money,result_r,commission,swap,spread_at_entry,score_total,zone_id,exit_reason",
    "TESTEA_SAMPLE_RUN,t_sample_001,MZP_IFVG_ZONE_REACTION_V1,MZP_IFVG_XAUUSD_V1_SET_003,XAUUSD,XAUUSD_FICTIVE,TESTER_ACCOUNT,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000.00,2005.00,1995.00,2010.00,0.0,1.25,0.0,0.0,0.15,0.72,SAMPLE_ZONE,PLACEHOLDER_SAMPLE",
  ].join("\n");

  it("imports fictional TestEA-shaped row including optional numeric columns", () => {
    const r = importBacktestTradesFromCsv(MAPAZAPP_TESTEA_SAMPLE_CSV, testeaOpts);
    expect(r.ok).toBe(true);
    expect(r.trades).toHaveLength(1);
    const t = r.trades[0]!;
    expect(t.runId).toBe("TESTEA_SAMPLE_RUN");
    expect(t.commission).toBe(0);
    expect(t.swap).toBe(0);
    expect(t.spreadAtEntry).toBe(0.15);
    expect(t.scoreTotal).toBe(0.72);
    expect(t.zoneId).toBe("SAMPLE_ZONE");
  });

  it("warns when CSV run_id overrides options run_id", () => {
    const r = importBacktestTradesFromCsv(MAPAZAPP_TESTEA_SAMPLE_CSV, { ...testeaOpts, runId: "OTHER_RUN" });
    expect(r.ok).toBe(true);
    expect(r.trades[0]!.runId).toBe("TESTEA_SAMPLE_RUN");
    expect(r.warnings.some((w) => w.code === "CSV_RUN_ID_OVERRIDE")).toBe(true);
  });
});

describe("Checkpoint 8 — approval evaluator", () => {
  const th = createDefaultBacktestMetricThresholdsForTests();

  it("too few trades => insufficient_data", () => {
    const run = createCheckpoint8MockEurInsufficientRun();
    const a = evaluateBacktestApproval({ run, thresholds: th });
    expect(a.status).toBe("insufficient_data");
    expect(a.approvedFor).toBe("none");
    expect(a.blockingReasons).toContain("BACKTEST_TOO_FEW_TRADES");
  });

  it("profit factor below threshold => rejected", () => {
    const run = createCheckpoint8MockNasRejectedRun();
    const a = evaluateBacktestApproval({ run, thresholds: th });
    expect(a.status).toBe("rejected");
    expect(a.approvedFor).toBe("none");
    expect(a.blockingReasons).toContain("BACKTEST_PROFIT_FACTOR_LOW");
  });

  it("acceptable forward metrics => approved_for_trade_review", () => {
    const run = createCheckpoint8MockXauForwardRun();
    const a = evaluateBacktestApproval({ run, thresholds: th });
    expect(a.status).toBe("approved_for_trade_review");
    expect(a.approvedFor).toBe("trade_review");
  });

  it("validation required but split is train => demo only with blocking", () => {
    const run = {
      ...createCheckpoint8MockXauForwardRun(),
      datasetSplit: "train" as const,
    };
    const a = evaluateBacktestApproval({ run, thresholds: th });
    expect(a.status).toBe("approved_for_demo");
    expect(a.approvedFor).toBe("demo");
    expect(a.blockingReasons).toContain("BACKTEST_VALIDATION_REQUIRED");
  });

  it("drawdown too high blocks approval", () => {
    const base = createCheckpoint8MockXauForwardRun();
    const blown = base.trades.map((t, i) =>
      i === 0 ? { ...t, resultR: -50 } : t,
    );
    const run = { ...base, trades: blown, summary: calculateBacktestSummary(blown) };
    const a = evaluateBacktestApproval({ run, thresholds: th });
    expect(a.status).toBe("rejected");
    expect(a.blockingReasons).toContain("BACKTEST_DRAWDOWN_TOO_HIGH");
  });

  it("forward required but only validation => needs_review at alerts tier", () => {
    const run = {
      ...createCheckpoint8MockXauForwardRun(),
      datasetSplit: "validation" as const,
    };
    const a = evaluateBacktestApproval({ run, thresholds: th });
    expect(a.status).toBe("needs_review");
    expect(a.approvedFor).toBe("alerts");
    expect(a.blockingReasons).toContain("BACKTEST_FORWARD_REQUIRED");
  });
});

describe("Checkpoint 8 — registry relationship", () => {
  it("approval evaluation does not mutate registry object", () => {
    const reg = createCheckpoint7MockParameterSetRegistry();
    const snap = JSON.stringify(reg);
    const run = createCheckpoint8MockXauForwardRun();
    const compat = evaluateParameterSetCompatibility(
      {
        strategyRegistry: reg,
        strategyId: run.strategyId,
        parameterSetId: run.parameterSetId,
        canonicalSymbol: run.canonicalSymbol,
        accountId: "ACC_THE5ERS_100K_PHASE1_A",
        requestedUsage: "trade_review",
      },
      createDefaultStrategyRegistryEvaluationSettings(),
    );
    evaluateBacktestApproval({
      run,
      thresholds: createDefaultBacktestMetricThresholdsForTests(),
      registryCompatibility: compat,
    });
    expect(JSON.stringify(reg)).toBe(snap);
  });

  it("registry mismatch adds blocking reasons", () => {
    const reg = createCheckpoint7MockParameterSetRegistry();
    const compat = evaluateParameterSetCompatibility(
      {
        strategyRegistry: reg,
        strategyId: "MZP_IFVG_ZONE_REACTION_V1",
        parameterSetId: "MZP_IFVG_XAUUSD_V1_SET_003",
        canonicalSymbol: "XAUUSD",
        accountId: "ACC_THE5ERS_100K_PHASE1_A",
        requestedUsage: "trade_review",
      },
      createDefaultStrategyRegistryEvaluationSettings(),
    );
    const run = {
      ...createCheckpoint8MockXauForwardRun(),
      parameterSetId: "MZP_IFVG_EURUSD_V1_SET_001",
    };
    const a = evaluateBacktestApproval({
      run,
      thresholds: createDefaultBacktestMetricThresholdsForTests(),
      registryCompatibility: compat,
    });
    expect(a.blockingReasons).toContain("BACKTEST_PARAMETER_SET_MISMATCH");
    expect(a.status).toBe("rejected");
  });

  it("deriveRecommendedParameterSetStatusFromBacktest maps tiers", () => {
    const run = createCheckpoint8MockXauForwardRun();
    const a = evaluateBacktestApproval({ run, thresholds: createDefaultBacktestMetricThresholdsForTests() });
    expect(deriveRecommendedParameterSetStatusFromBacktest(a)).toBe("approved_for_trade_review");
    expect(deriveRecommendedParameterSetStatusFromBacktest({ ...a, approvedFor: "alerts", status: "approved_for_alerts" })).toBe(
      "approved_for_alerts",
    );
  });
});

function mk(id: string, r: number) {
  return {
    tradeId: id,
    runId: "r1",
    strategyId: "MZP_IFVG_ZONE_REACTION_V1",
    parameterSetId: "PS1",
    canonicalSymbol: "XAUUSD",
    direction: "BUY" as const,
    entryTime: "2025-01-01T00:00:00Z",
    exitTime: "2025-01-01T01:00:00Z",
    entryPrice: 1,
    exitPrice: 2,
    resultMoney: 0,
    resultR: r,
  };
}
