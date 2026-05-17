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

  it("maps TestEA E5.8 header alias entry_quality_score to scoreTotal", () => {
    const csv = MAPAZAPP_TESTEA_SAMPLE_CSV.replace("score_total", "entry_quality_score");
    const r = importBacktestTradesFromCsv(csv, testeaOpts);
    expect(r.ok).toBe(true);
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0]!.scoreTotal).toBe(0.72);
  });

  it("parses optional E5.10 liquidity sweep columns when present", () => {
    const csv = [
      "trade_id,direction,entry_time,exit_time,entry,exit_price,result_r,result_money,liquidity_event_score,liquidity_event_detected,liquidity_event_type,liquidity_event_direction,liquidity_event_age_bars,liquidity_event_level,liquidity_event_sweep_price,liquidity_event_distance_points,liquidity_event_reasons",
      "t_liq,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,2005,1,0,16,true,LOCAL_SWING_LOW_SWEEP,bullish_context,4,2650.25,2650.18,7,local_swing_low_sweep_favorable",
    ].join("\n");
    const r = importBacktestTradesFromCsv(csv, testeaOpts);
    expect(r.ok).toBe(true);
    const t = r.trades[0]!;
    expect(t.liquidityEventScore).toBe(16);
    expect(t.liquidityEventDetected).toBe(true);
    expect(t.liquidityEventType).toBe("LOCAL_SWING_LOW_SWEEP");
    expect(t.liquidityEventDirection).toBe("bullish_context");
    expect(t.liquidityEventAgeBars).toBe(4);
    expect(t.liquidityEventLevel).toBeCloseTo(2650.25, 5);
    expect(t.liquidityEventSweepPrice).toBeCloseTo(2650.18, 5);
    expect(t.liquidityEventDistancePoints).toBe(7);
    expect(t.liquidityEventReasons).toBe("local_swing_low_sweep_favorable");
  });

  it("parses optional E5.10.2 liquidity sweep quality columns when present", () => {
    const csv = [
      "trade_id,direction,entry_time,exit_time,entry,exit_price,result_r,result_money,liquidity_event_score,liquidity_event_detected,liquidity_event_type,liquidity_event_direction,liquidity_event_age_bars,liquidity_event_level,liquidity_event_sweep_price,liquidity_event_distance_points,liquidity_event_reasons,liquidity_sweep_quality_score,liquidity_sweep_quality_grade,liquidity_sweep_recency_score,liquidity_sweep_directional_score,liquidity_sweep_reaction_score,liquidity_sweep_displacement_score,liquidity_sweep_distance_score,liquidity_sweep_quality_reasons",
      "t_liq2,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,2005,1,0,14,true,PDL_SWEEP,bullish_context,2,2640,2639.9,5,pdl_sweep_favorable,14,C,3,3,3,3,2,liquidity_sweep_quality_ok",
    ].join("\n");
    const r = importBacktestTradesFromCsv(csv, testeaOpts);
    expect(r.ok).toBe(true);
    const t = r.trades[0]!;
    expect(t.liquiditySweepQualityScore).toBe(14);
    expect(t.liquiditySweepQualityGrade).toBe("C");
    expect(t.liquiditySweepRecencyScore).toBe(3);
    expect(t.liquiditySweepDirectionalScore).toBe(3);
    expect(t.liquiditySweepReactionScore).toBe(3);
    expect(t.liquiditySweepDisplacementScore).toBe(3);
    expect(t.liquiditySweepDistanceScore).toBe(2);
    expect(t.liquiditySweepQualityReasons).toBe("liquidity_sweep_quality_ok");
  });

  it("parses optional E5.10.4 liquidity chain columns when present", () => {
    const header =
      "trade_id,direction,entry_time,exit_time,entry,exit_price,result_r,result_money,liquidity_event_score,liquidity_sweep_quality_reasons,liquidity_chain_detected,liquidity_chain_grade,liquidity_chain_score,liquidity_chain_sweep_to_setup_bars,liquidity_chain_sweep_to_fvg_bars,liquidity_chain_reaction_confirmed,liquidity_chain_displacement_confirmed,liquidity_chain_fvg_created_after_sweep,liquidity_chain_distance_to_fvg_points,liquidity_chain_reasons";
    const row =
      "t_chain,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,2005,1,0,14,ok,true,C,15,5,5,true,true,true,40,liquidity_chain_ok";
    const r = importBacktestTradesFromCsv(`${header}\n${row}`, testeaOpts);
    expect(r.ok).toBe(true);
    const t = r.trades[0]!;
    expect(t.liquidityChainDetected).toBe(true);
    expect(t.liquidityChainGrade).toBe("C");
    expect(t.liquidityChainScore).toBe(15);
    expect(t.liquidityChainSweepToSetupBars).toBe(5);
    expect(t.liquidityChainReactionConfirmed).toBe(true);
    expect(t.liquidityChainDisplacementConfirmed).toBe(true);
    expect(t.liquidityChainFvgCreatedAfterSweep).toBe(true);
    expect(t.liquidityChainReasons).toBe("liquidity_chain_ok");
  });

  it("parses optional E5.10.6 liquidity chain reaction audit columns when present", () => {
    const header =
      "trade_id,direction,entry_time,exit_time,entry,exit_price,result_r,result_money,liquidity_event_score,liquidity_chain_reasons,liquidity_chain_reaction_failure_reason,liquidity_chain_reaction_close_price,liquidity_chain_reaction_level,liquidity_chain_reaction_bars_checked";
    const row =
      "t_rx,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,2005,1,0,14,liquidity_chain_ok,liquidity_chain_reaction_ok,2000.5,1999.0,2";
    const r = importBacktestTradesFromCsv(`${header}\n${row}`, testeaOpts);
    expect(r.ok).toBe(true);
    const t = r.trades[0]!;
    expect(t.liquidityChainReactionFailureReason).toBe("liquidity_chain_reaction_ok");
    expect(t.liquidityChainReactionClosePrice).toBe(2000.5);
    expect(t.liquidityChainReactionLevel).toBe(1999.0);
    expect(t.liquidityChainReactionBarsChecked).toBe(2);
  });

  it("parses optional E5.11 HTF structure observation columns when present", () => {
    const header =
      "trade_id,direction,entry_time,exit_time,entry,exit_price,result_r,result_money,htf_structure_enabled,h4_structure_state,h1_structure_state,h4_structure_direction,h1_structure_direction,htf_structure_aligned,htf_structure_conflict,htf_structure_score,h4_protected_high,h4_protected_low,h1_protected_high,h1_protected_low,h4_external_liquidity_high,h4_external_liquidity_low,h1_external_liquidity_high,h1_external_liquidity_low,htf_structure_reasons";
    const row =
      "t_htf,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,2005,1,0,true,bullish_structure,bullish_structure,bullish,bullish,true,false,17,2010,1990,2008,1995,2020,1985,2015,1992,htf_structure_aligned";
    const r = importBacktestTradesFromCsv(`${header}\n${row}`, testeaOpts);
    expect(r.ok).toBe(true);
    const t = r.trades[0]!;
    expect(t.htfStructureEnabled).toBe(true);
    expect(t.h4StructureState).toBe("bullish_structure");
    expect(t.h1StructureState).toBe("bullish_structure");
    expect(t.htfStructureAligned).toBe(true);
    expect(t.htfStructureConflict).toBe(false);
    expect(t.htfStructureScore).toBe(17);
    expect(t.h4ProtectedHigh).toBeCloseTo(2010, 5);
    expect(t.h4ExternalLiquidityLow).toBeCloseTo(1985, 5);
    expect(t.htfStructureReasons).toBe("htf_structure_aligned");
  });

  it("parses optional E5.13 Premium/Discount observation columns when present", () => {
    const header =
      "trade_id,direction,entry_time,exit_time,entry,exit_price,result_r,result_money,premium_discount_enabled,pd_range_source,pd_range_high,pd_range_low,pd_midpoint_50,pd_position_pct,pd_entry_zone,pd_entry_in_premium,pd_entry_in_discount,pd_entry_in_equilibrium,pd_entry_outside_range,pd_entry_zone_valid_for_direction,pd_entry_zone_conflict,pd_entry_too_deep,pd_entry_too_shallow,pd_range_size_points,pd_entry_distance_to_midpoint_points,premium_discount_score,premium_discount_grade,premium_discount_reasons";
    const row =
      "t_pd,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,2005,1,0,true,exec_tf_latest_swings,2010,1990,2000,35.00,discount,false,true,false,false,true,false,false,false,200.00,50.00,14,A,pd_valid_range";
    const r = importBacktestTradesFromCsv(`${header}\n${row}`, testeaOpts);
    expect(r.ok).toBe(true);
    const t = r.trades[0]!;
    expect(t.premiumDiscountEnabled).toBe(true);
    expect(t.pdRangeSource).toBe("exec_tf_latest_swings");
    expect(t.pdPositionPct).toBeCloseTo(35, 2);
    expect(t.pdEntryZone).toBe("discount");
    expect(t.premiumDiscountScore).toBe(14);
    expect(t.premiumDiscountGrade).toBe("A");
  });

  it("parses optional E5.13.2 Entry Fill Feasibility diagnostic columns when present", () => {
    const header =
      "trade_id,direction,entry_time,exit_time,entry,exit_price,result_r,result_money,entry_fill_feasibility_enabled,entry_fill_status,entry_fill_feasibility_score,entry_fill_feasibility_grade,entry_fill_feasibility_reasons,entry_price_for_fill_audit,fvg_near_edge_price,fvg_far_edge_price,fvg_ce_price,entry_depth_in_fvg_pct,entry_distance_from_near_edge_points,entry_distance_from_far_edge_points,entry_distance_from_ce_points,fvg_touch_reached,fvg_ce_touch_reached,entry_price_reached,max_retrace_into_fvg_pct,max_retrace_price,max_retrace_to_entry_distance_points,missed_entry_by_points,bars_to_fvg_touch,bars_to_ce_touch,bars_to_entry_fill,bars_to_max_retrace,bars_until_expiration_or_resolution,entry_expired_unfilled,entry_missed_shallow_retrace,entry_too_deep_for_retest,entry_near_miss,entry_filled_fast,entry_filled_late,entry_invalidated_before_fill,entry_outside_fvg,entry_geometry_unknown";
    const row =
      "t_eff,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,0,0,0,true,expired_unfilled,7,C,entry_fill_expired_unfilled|fvg_touch_reached,2000,2010,1990,2000,50.00,10.00,10.00,0.00,true,true,false,45.00,1995.00,5.00,5.00,2,3,-1,2,20,true,false,false,false,false,false,false,false,false";
    const r = importBacktestTradesFromCsv(`${header}\n${row}`, testeaOpts);
    expect(r.ok).toBe(true);
    const t = r.trades[0]!;
    expect(t.entryFillFeasibilityEnabled).toBe(true);
    expect(t.entryFillStatus).toBe("expired_unfilled");
    expect(t.entryFillFeasibilityScore).toBe(7);
    expect(t.entryDepthInFvgPct).toBeCloseTo(50, 2);
    expect(t.maxRetraceIntoFvgPct).toBeCloseTo(45, 2);
    expect(t.missedEntryByPoints).toBeCloseTo(5, 2);
    expect(t.fvgTouchReached).toBe(true);
    expect(t.entryExpiredUnfilled).toBe(true);
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
