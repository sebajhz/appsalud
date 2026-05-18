import { describe, expect, it } from "vitest";
import {
  analyzeTestEaScoreCalibrationFromTexts,
  analyzeTestEaScoreCampaignCalibrationFromTexts,
  parseTradeScoreAuxiliaryByTradeId,
  summarizeScoreCalibration,
  tokenizeMissingComponents,
} from "../src/testea-score-calibration";

const SUMMARY_BASE = {
  schema_version: "backtest_ea_v1",
  run_id: "RUN_SC",
  effective_run_id: "RUN_SC",
  campaign_id: "C_SC",
  parameter_set_id: "SET_SC",
  strategy_id: "IFVG_X",
  symbol: "XAUUSD",
  tester_from: "2026-01-01T00:00:00Z",
  tester_to: "2026-02-01T00:00:00Z",
  optimization_parameters: { virtual_min_trade_fvg_points: 2 },
  has_entry_quality_score_logic: true,
  score_observation_only: true,
  score_gate_enabled: false,
  score_a_count: 0,
  score_b_count: 0,
  score_c_count: 20,
  score_rejected_count: 0,
};

function buildTradesWithScores(n: number): string {
  const headers = [
    "trade_id",
    "direction",
    "entry_time",
    "exit_time",
    "entry_price",
    "exit_price",
    "result_r",
    "symbol",
    "strategy_id",
    "parameter_set_id",
    "outcome",
    "entry_quality_score",
    "entry_quality_grade",
    "htf_narrative_score",
    "liquidity_event_score",
    "displacement_fvg_quality_score",
    "entry_confirmation_score",
    "target_quality_score",
    "session_news_spread_score",
    "risk_overtrading_score",
    "ambiguous_risk_score",
    "missing_quality_components",
  ].join(",");
  const lines = [headers];
  for (let i = 0; i < n; i++) {
    const day = String(i + 1).padStart(2, "0");
    const score = 40 + i * 2;
    const amb = 30 + i;
    const outcome = i % 5 === 0 ? "ambiguous" : i % 3 === 0 ? "loss" : "win";
    const r = outcome === "ambiguous" ? 0 : outcome === "loss" ? -1 : 1.5;
    const miss =
      i % 2 === 0
        ? "liquidity_sweep_not_found,session_news_spread_not_implemented"
        : "missing_h4_h1_structure";
    lines.push(
      [
        `t${i}`,
        "BUY",
        `2026-01-${day}T10:00:00Z`,
        `2026-01-${day}T11:00:00Z`,
        "1",
        "1",
        String(r),
        "XAUUSD",
        "IFVG_X",
        "SET_SC",
        outcome,
        String(score),
        "C",
        "10",
        "0",
        "8",
        "5",
        "6",
        "0",
        "4",
        String(amb),
        miss,
      ].join(","),
    );
  }
  return lines.join("\n");
}

describe("testea-score-calibration", () => {
  it("reads score fields and computes min/max/avg/percentiles", () => {
    const csv = buildTradesWithScores(20);
    const r = analyzeTestEaScoreCalibrationFromTexts({
      bundleName: "b1",
      summaryJsonText: JSON.stringify(SUMMARY_BASE),
      tradesCsvText: csv,
    });
    expect(r.ok).toBe(true);
    expect(r.score_stats?.score_min).toBe(40);
    expect(r.score_stats?.score_max).toBe(78);
    expect(r.score_stats?.score_average).toBeGreaterThan(50);
    expect(r.score_stats?.score_p10).not.toBeNull();
    expect(r.score_stats?.score_p90).not.toBeNull();
  });

  it("computes relative bands top 10 / top 25 / bottom 25", () => {
    const csv = buildTradesWithScores(20);
    const r = analyzeTestEaScoreCalibrationFromTexts({
      bundleName: "b1",
      summaryJsonText: JSON.stringify(SUMMARY_BASE),
      tradesCsvText: csv,
    });
    expect(r.ok).toBe(true);
    expect(r.relative_bands?.top_10_percent?.counted_trades).toBeGreaterThan(0);
    expect(r.relative_bands?.top_25_percent?.counted_trades).toBeGreaterThan(0);
    expect(r.relative_bands?.bottom_25_percent?.counted_trades).toBeGreaterThan(0);
    expect(r.relative_bands?.middle_50_percent?.counted_trades).toBeGreaterThan(0);
  });

  it("computes outcome breakdown", () => {
    const csv = buildTradesWithScores(20);
    const r = analyzeTestEaScoreCalibrationFromTexts({
      bundleName: "b1",
      summaryJsonText: JSON.stringify(SUMMARY_BASE),
      tradesCsvText: csv,
    });
    expect(r.ok).toBe(true);
    expect(r.outcome_by_score?.all?.count).toBe(20);
    expect(r.outcome_by_score?.ambiguous?.count).toBeGreaterThan(0);
    expect(r.outcome_by_score?.wins?.count).toBeGreaterThan(0);
  });

  it("computes missing component frequency", () => {
    const csv = buildTradesWithScores(20);
    const r = analyzeTestEaScoreCalibrationFromTexts({
      bundleName: "b1",
      summaryJsonText: JSON.stringify(SUMMARY_BASE),
      tradesCsvText: csv,
    });
    expect(r.ok).toBe(true);
    expect(r.missing_component_frequency["liquidity_sweep_not_found"] ?? 0).toBeGreaterThan(0);
    expect(r.missing_component_frequency["missing_h4_h1_structure"] ?? 0).toBeGreaterThan(0);
  });

  it("handles no A/B grades without failing", () => {
    const csv = buildTradesWithScores(10);
    const r = analyzeTestEaScoreCalibrationFromTexts({
      bundleName: "b1",
      summaryJsonText: JSON.stringify({ ...SUMMARY_BASE, score_a_count: 0, score_b_count: 0 }),
      tradesCsvText: csv,
    });
    expect(r.ok).toBe(true);
    expect(r.diagnostic_flags).toContain("SCORE_NO_A_B_GRADES");
  });

  it("warns on older bundle without score fields (not ok)", () => {
    const trades = [
      "trade_id,direction,entry_time,exit_time,entry_price,exit_price,result_r,symbol,strategy_id,parameter_set_id,outcome",
      "t1,BUY,2026-01-01T10:00:00Z,2026-01-01T11:00:00Z,1,1,1,XAUUSD,IFVG_X,SET_SC,win",
    ].join("\n");
    const r = analyzeTestEaScoreCalibrationFromTexts({
      bundleName: "old",
      summaryJsonText: JSON.stringify({
        schema_version: "backtest_ea_v1",
        run_id: "R1",
        parameter_set_id: "SET_SC",
        strategy_id: "IFVG_X",
        symbol: "XAUUSD",
      }),
      tradesCsvText: trades,
    });
    expect(r.ok).toBe(false);
    expect(r.warnings.some((w) => w.includes("BUNDLE_SCORE_FIELDS_MISSING"))).toBe(true);
  });

  it("campaign analyzer accepts multiple bundles", () => {
    const csv = buildTradesWithScores(5);
    const camp = analyzeTestEaScoreCampaignCalibrationFromTexts([
      { bundleName: "a", summaryJsonText: JSON.stringify(SUMMARY_BASE), tradesCsvText: csv },
      { bundleName: "b", summaryJsonText: JSON.stringify(SUMMARY_BASE), tradesCsvText: csv },
    ]);
    expect(camp.bundles.length).toBe(2);
    expect(camp.bundles.every((x) => x.ok)).toBe(true);
    const rows = summarizeScoreCalibration(camp, { sortBy: "fvg" });
    expect(rows.length).toBe(2);
  });

  it("summaryRows ambiguous_rate matches all-cohort ambiguous share (not ambiguous-slice rate)", () => {
    const headers = [
      "trade_id",
      "direction",
      "entry_time",
      "exit_time",
      "entry_price",
      "exit_price",
      "result_r",
      "symbol",
      "strategy_id",
      "parameter_set_id",
      "outcome",
      "entry_quality_score",
      "entry_quality_grade",
      "htf_narrative_score",
      "liquidity_event_score",
      "displacement_fvg_quality_score",
      "entry_confirmation_score",
      "target_quality_score",
      "session_news_spread_score",
      "risk_overtrading_score",
      "ambiguous_risk_score",
      "missing_quality_components",
    ].join(",");
    const row = (id: string, day: string, outcome: string, r: string) =>
      [
        id,
        "BUY",
        `2026-01-${day}T10:00:00Z`,
        `2026-01-${day}T11:00:00Z`,
        "1",
        "1",
        r,
        "XAUUSD",
        "IFVG_X",
        "SET_SC",
        outcome,
        "50",
        "C",
        "10",
        "0",
        "8",
        "5",
        "6",
        "0",
        "4",
        "35",
        "",
      ].join(",");
    const csv = [headers, row("t0", "01", "win", "1"), row("t1", "02", "win", "1"), row("t2", "03", "win", "1"), row("t3", "04", "ambiguous", "0")].join("\n");
    const a = analyzeTestEaScoreCalibrationFromTexts({
      bundleName: "four",
      summaryJsonText: JSON.stringify({ ...SUMMARY_BASE, score_c_count: 4 }),
      tradesCsvText: csv,
    });
    expect(a.ok).toBe(true);
    expect(a.outcome_by_score?.all?.count).toBe(4);
    expect(a.outcome_by_score?.all?.ambiguous_rate).toBeCloseTo(0.25, 10);
    expect(a.outcome_by_score?.ambiguous?.ambiguous_rate).toBe(1);
    const camp = analyzeTestEaScoreCampaignCalibrationFromTexts([
      { bundleName: "four", summaryJsonText: JSON.stringify({ ...SUMMARY_BASE, score_c_count: 4 }), tradesCsvText: csv },
    ]);
    const rows = summarizeScoreCalibration(camp);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.ambiguous_rate).toBeCloseTo(0.25, 10);
  });

  it("tokenizeMissingComponents splits known tokens", () => {
    expect(tokenizeMissingComponents("a|b,c")).toEqual(["a", "b", "c"]);
  });

  it("parseTradeScoreAuxiliaryByTradeId maps entry_quality_score column", () => {
    const csv = buildTradesWithScores(2);
    const p = parseTradeScoreAuxiliaryByTradeId(csv);
    expect(p.hasEntryQualityScoreColumn).toBe(true);
    expect(p.hasLiquidityQualityColumns).toBe(false);
    expect(p.hasLiquidityChainColumns).toBe(false);
    expect(p.byTradeId.get("t0")?.score).toBe(40);
  });

  it("parseTradeScoreAuxiliaryByTradeId maps E5.10.2 liquidity quality columns when present", () => {
    const headers = [
      "trade_id",
      "direction",
      "entry_time",
      "exit_time",
      "entry_price",
      "exit_price",
      "result_r",
      "symbol",
      "strategy_id",
      "parameter_set_id",
      "outcome",
      "entry_quality_score",
      "entry_quality_grade",
      "htf_narrative_score",
      "liquidity_event_score",
      "displacement_fvg_quality_score",
      "entry_confirmation_score",
      "target_quality_score",
      "session_news_spread_score",
      "risk_overtrading_score",
      "ambiguous_risk_score",
      "missing_quality_components",
      "liquidity_sweep_quality_score",
      "liquidity_sweep_recency_score",
      "liquidity_sweep_reaction_score",
      "liquidity_sweep_displacement_score",
      "liquidity_sweep_directional_score",
      "liquidity_sweep_distance_score",
    ].join(",");
    const row = [
      "t0",
      "BUY",
      "2026-01-01T10:00:00Z",
      "2026-01-01T11:00:00Z",
      "1",
      "1",
      "1",
      "XAUUSD",
      "IFVG_X",
      "SET_SC",
      "win",
      "70",
      "A",
      "10",
      "14",
      "5",
      "8",
      "7",
      "0",
      "5",
      "25",
      "",
      "14",
      "4",
      "5",
      "2",
      "4",
      "2",
    ].join(",");
    const p = parseTradeScoreAuxiliaryByTradeId([headers, row].join("\n"));
    expect(p.hasLiquidityQualityColumns).toBe(true);
    expect(p.hasLiquidityChainColumns).toBe(false);
    expect(p.byTradeId.get("t0")?.liquidity_quality?.liquidity_sweep_quality_score).toBe(14);
    expect(p.byTradeId.get("t0")?.liquidity_quality?.liquidity_sweep_recency_score).toBe(4);
  });

  it("parseTradeScoreAuxiliaryByTradeId maps E5.10.4 liquidity chain numeric columns when present", () => {
    const headers = [
      "trade_id",
      "direction",
      "entry_time",
      "exit_time",
      "entry_price",
      "exit_price",
      "result_r",
      "symbol",
      "strategy_id",
      "parameter_set_id",
      "outcome",
      "entry_quality_score",
      "liquidity_chain_score",
      "liquidity_chain_sweep_to_setup_bars",
      "liquidity_chain_sweep_to_fvg_bars",
      "liquidity_chain_distance_to_fvg_points",
    ].join(",");
    const row = [
      "t0",
      "BUY",
      "2026-01-01T10:00:00Z",
      "2026-01-01T11:00:00Z",
      "1",
      "1",
      "1",
      "XAUUSD",
      "IFVG_X",
      "SET_SC",
      "win",
      "70",
      "12",
      "6",
      "6",
      "40",
    ].join(",");
    const p = parseTradeScoreAuxiliaryByTradeId([headers, row].join("\n"));
    expect(p.hasLiquidityChainColumns).toBe(true);
    expect(p.byTradeId.get("t0")?.liquidity_chain?.liquidity_chain_score).toBe(12);
    expect(p.byTradeId.get("t0")?.liquidity_chain?.liquidity_chain_sweep_to_setup_bars).toBe(6);
  });

  it("parseTradeScoreAuxiliaryByTradeId maps E5.11 htf_structure_score when present", () => {
    const headers = [
      "trade_id",
      "direction",
      "entry_time",
      "exit_time",
      "entry_price",
      "exit_price",
      "result_r",
      "symbol",
      "strategy_id",
      "parameter_set_id",
      "outcome",
      "entry_quality_score",
      "htf_structure_score",
    ].join(",");
    const row = ["t_htf", "BUY", "2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z", "1", "1", "1", "XAUUSD", "IFVG_X", "SET_SC", "win", "70", "14"].join(",");
    const p = parseTradeScoreAuxiliaryByTradeId([headers, row].join("\n"));
    expect(p.hasHtfStructureScoreColumn).toBe(true);
    expect(p.byTradeId.get("t_htf")?.htf_structure?.htf_structure_score).toBe(14);
  });

  it("parseTradeScoreAuxiliaryByTradeId maps E5.12 mss_choch_score when present", () => {
    const headers = [
      "trade_id",
      "direction",
      "entry_time",
      "exit_time",
      "entry_price",
      "exit_price",
      "result_r",
      "symbol",
      "strategy_id",
      "parameter_set_id",
      "outcome",
      "entry_quality_score",
      "mss_choch_score",
    ].join(",");
    const row = ["t_msc", "BUY", "2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z", "1", "1", "1", "XAUUSD", "IFVG_X", "SET_SC", "win", "70", "11"].join(",");
    const p = parseTradeScoreAuxiliaryByTradeId([headers, row].join("\n"));
    expect(p.hasMssChochScoreColumn).toBe(true);
    expect(p.hasMssTemporalRelevanceScoreColumn).toBe(false);
    expect(p.hasChochTemporalRelevanceScoreColumn).toBe(false);
    expect(p.byTradeId.get("t_msc")?.mss_choch?.mss_choch_score).toBe(11);
  });

  it("parseTradeScoreAuxiliaryByTradeId maps E5.12.2 temporal relevance scores when present", () => {
    const headers = [
      "trade_id",
      "direction",
      "entry_time",
      "exit_time",
      "entry_price",
      "exit_price",
      "result_r",
      "symbol",
      "strategy_id",
      "parameter_set_id",
      "outcome",
      "entry_quality_score",
      "mss_temporal_relevance_score",
      "choch_temporal_relevance_score",
    ].join(",");
    const row = ["t_tr", "BUY", "2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z", "1", "1", "1", "XAUUSD", "IFVG_X", "SET_SC", "win", "70", "8", "5"].join(
      ",",
    );
    const p = parseTradeScoreAuxiliaryByTradeId([headers, row].join("\n"));
    expect(p.hasMssTemporalRelevanceScoreColumn).toBe(true);
    expect(p.hasChochTemporalRelevanceScoreColumn).toBe(true);
    expect(p.byTradeId.get("t_tr")?.mss_temporal?.mss_temporal_relevance_score).toBe(8);
    expect(p.byTradeId.get("t_tr")?.choch_temporal?.choch_temporal_relevance_score).toBe(5);
  });

  it("parseTradeScoreAuxiliaryByTradeId maps E5.13 premium_discount_score when present", () => {
    const headers = [
      "trade_id",
      "direction",
      "entry_time",
      "exit_time",
      "entry_price",
      "exit_price",
      "result_r",
      "symbol",
      "strategy_id",
      "parameter_set_id",
      "outcome",
      "entry_quality_score",
      "premium_discount_score",
    ].join(",");
    const row = ["t_pd", "BUY", "2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z", "1", "1", "1", "XAUUSD", "IFVG_X", "SET_SC", "win", "70", "13"].join(",");
    const p = parseTradeScoreAuxiliaryByTradeId([headers, row].join("\n"));
    expect(p.hasPremiumDiscountScoreColumn).toBe(true);
    expect(p.byTradeId.get("t_pd")?.premium_discount?.premium_discount_score).toBe(13);
  });

  it("analyzeTestEaScoreCalibrationFromTexts fills liquidity_quality_component_stats when quality columns exist", () => {
    const headers = [
      "trade_id",
      "direction",
      "entry_time",
      "exit_time",
      "entry_price",
      "exit_price",
      "result_r",
      "symbol",
      "strategy_id",
      "parameter_set_id",
      "outcome",
      "entry_quality_score",
      "entry_quality_grade",
      "htf_narrative_score",
      "liquidity_event_score",
      "displacement_fvg_quality_score",
      "entry_confirmation_score",
      "target_quality_score",
      "session_news_spread_score",
      "risk_overtrading_score",
      "ambiguous_risk_score",
      "missing_quality_components",
      "htf_structure_score",
      "liquidity_sweep_quality_score",
      "liquidity_sweep_recency_score",
      "liquidity_sweep_reaction_score",
      "liquidity_sweep_displacement_score",
      "liquidity_sweep_directional_score",
      "liquidity_sweep_distance_score",
      "liquidity_chain_score",
      "liquidity_chain_sweep_to_setup_bars",
      "liquidity_chain_sweep_to_fvg_bars",
      "liquidity_chain_distance_to_fvg_points",
      "mss_choch_score",
      "mss_temporal_relevance_score",
      "choch_temporal_relevance_score",
      "premium_discount_score",
    ].join(",");
    const row = [
      "t0",
      "BUY",
      "2026-01-01T10:00:00Z",
      "2026-01-01T11:00:00Z",
      "1",
      "1",
      "1",
      "XAUUSD",
      "IFVG_X",
      "SET_SC",
      "win",
      "70",
      "A",
      "10",
      "14",
      "5",
      "8",
      "7",
      "0",
      "5",
      "25",
      "",
      "18",
      "14",
      "4",
      "5",
      "2",
      "4",
      "2",
      "19",
      "8",
      "8",
      "50",
      "12",
      "9",
      "4",
      "13",
    ].join(",");
    const csv = [headers, row].join("\n");
    const r = analyzeTestEaScoreCalibrationFromTexts({
      bundleName: "lq",
      summaryJsonText: JSON.stringify(SUMMARY_BASE),
      tradesCsvText: csv,
    });
    expect(r.ok).toBe(true);
    expect(r.liquidity_quality_component_stats?.liquidity_sweep_quality_score?.average).toBe(14);
    expect(r.liquidity_quality_component_stats?.liquidity_sweep_recency_score?.min).toBe(4);
    expect(r.liquidity_chain_component_stats?.liquidity_chain_score?.average).toBe(19);
    expect(r.liquidity_chain_component_stats?.liquidity_chain_sweep_to_setup_bars?.min).toBe(8);
    expect(r.htf_structure_component_stats?.htf_structure_score?.average).toBe(18);
    expect(r.mss_choch_component_stats?.mss_choch_score?.average).toBe(12);
    expect(r.mss_temporal_relevance_component_stats?.mss_temporal_relevance_score?.average).toBe(9);
    expect(r.choch_temporal_relevance_component_stats?.choch_temporal_relevance_score?.average).toBe(4);
    expect(r.premium_discount_component_stats?.premium_discount_score?.average).toBe(13);
  });

  it("parseTradeScoreAuxiliaryByTradeId maps E5.13.2 entry_fill_feasibility_score when present", () => {
    const headers = [
      "trade_id",
      "direction",
      "entry_time",
      "exit_time",
      "entry_price",
      "exit_price",
      "result_r",
      "symbol",
      "strategy_id",
      "parameter_set_id",
      "outcome",
      "entry_quality_score",
      "entry_fill_feasibility_score",
    ].join(",");
    const row = ["t_eff", "BUY", "2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z", "1", "1", "1", "XAUUSD", "IFVG_X", "SET_SC", "win", "70", "12"].join(",");
    const p = parseTradeScoreAuxiliaryByTradeId([headers, row].join("\n"));
    expect(p.hasEntryFillFeasibilityScoreColumn).toBe(true);
    expect(p.byTradeId.get("t_eff")?.entry_fill_feasibility?.entry_fill_feasibility_score).toBe(12);
  });

  it("analyzeTestEaScoreCalibrationFromTexts fills entry_fill_feasibility_component_stats when column exists", () => {
    const headers = [
      "trade_id",
      "direction",
      "entry_time",
      "exit_time",
      "entry_price",
      "exit_price",
      "result_r",
      "symbol",
      "strategy_id",
      "parameter_set_id",
      "outcome",
      "entry_quality_score",
      "entry_fill_feasibility_score",
    ].join(",");
    const row = ["t_eff2", "BUY", "2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z", "1", "1", "1", "XAUUSD", "IFVG_X", "SET_SC", "expired_unfilled", "55", "7"].join(",");
    const r = analyzeTestEaScoreCalibrationFromTexts({
      bundleName: "eff",
      summaryJsonText: JSON.stringify(SUMMARY_BASE),
      tradesCsvText: [headers, row].join("\n"),
    });
    expect(r.ok).toBe(true);
    expect(r.entry_fill_feasibility_component_stats?.entry_fill_feasibility_score?.average).toBe(7);
  });

  it("parseTradeScoreAuxiliaryByTradeId maps E5.13.4 entry_variant_feasibility_score when present", () => {
    const headers = [
      "trade_id",
      "direction",
      "entry_time",
      "exit_time",
      "entry_price",
      "exit_price",
      "result_r",
      "symbol",
      "strategy_id",
      "parameter_set_id",
      "outcome",
      "entry_quality_score",
      "entry_variant_feasibility_score",
    ].join(",");
    const row = ["t_ev", "BUY", "2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z", "1", "1", "1", "XAUUSD", "IFVG_X", "SET_SC", "win", "70", "11"].join(",");
    const p = parseTradeScoreAuxiliaryByTradeId([headers, row].join("\n"));
    expect(p.hasEntryVariantFeasibilityScoreColumn).toBe(true);
    expect(p.byTradeId.get("t_ev")?.entry_variant_feasibility?.entry_variant_feasibility_score).toBe(11);
  });

  it("analyzeTestEaScoreCalibrationFromTexts fills entry_variant_feasibility_component_stats when column exists", () => {
    const headers = [
      "trade_id",
      "direction",
      "entry_time",
      "exit_time",
      "entry_price",
      "exit_price",
      "result_r",
      "symbol",
      "strategy_id",
      "parameter_set_id",
      "outcome",
      "entry_quality_score",
      "entry_variant_feasibility_score",
    ].join(",");
    const row = ["t_ev2", "BUY", "2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z", "1", "1", "1", "XAUUSD", "IFVG_X", "SET_SC", "expired_unfilled", "55", "9"].join(",");
    const r = analyzeTestEaScoreCalibrationFromTexts({
      bundleName: "ev",
      summaryJsonText: JSON.stringify(SUMMARY_BASE),
      tradesCsvText: [headers, row].join("\n"),
    });
    expect(r.ok).toBe(true);
    expect(r.entry_variant_feasibility_component_stats?.entry_variant_feasibility_score?.average).toBe(9);
  });
});
