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
        ? "liquidity_event_not_implemented,session_news_spread_not_implemented"
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
    expect(r.missing_component_frequency["liquidity_event_not_implemented"] ?? 0).toBeGreaterThan(0);
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

  it("tokenizeMissingComponents splits known tokens", () => {
    expect(tokenizeMissingComponents("a|b,c")).toEqual(["a", "b", "c"]);
  });

  it("parseTradeScoreAuxiliaryByTradeId maps entry_quality_score column", () => {
    const csv = buildTradesWithScores(2);
    const p = parseTradeScoreAuxiliaryByTradeId(csv);
    expect(p.hasEntryQualityScoreColumn).toBe(true);
    expect(p.byTradeId.get("t0")?.score).toBe(40);
  });
});
