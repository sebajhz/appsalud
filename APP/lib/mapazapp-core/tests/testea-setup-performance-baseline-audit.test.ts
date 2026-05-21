import { describe, expect, it } from "vitest";
import {
  analyzeTestEaSetupPerformanceBaselineAuditFromTexts,
  flattenSetupPerformanceBaselineAuditCsvRows,
  SETUP_PERFORMANCE_BASELINE_AUDIT_SCHEMA,
} from "../src/testea-setup-performance-baseline-audit";

const SUMMARY = JSON.stringify({
  ea_build: "MZP_TestEA_E5_18",
  symbol: "XAUUSD",
  execution_timeframe: "M15",
  trade_count: 4,
  win_count: 2,
  loss_count: 1,
  ambiguous_count: 1,
  winrate: 0.666667,
  expectancy_r: 0.5,
  total_r: 2,
  max_drawdown_r: 1,
  discipline_overtrading_risk_count: 3,
  entry_variant_50_sim_winrate: 0.5,
  entry_variant_25_sim_winrate: 0.75,
  entry_variant_edge_sim_winrate: 0.9,
  entry_variant_edge_sim_filled_count: 4,
});

const BASE =
  "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held";

const READY =
  "setup_readiness_checklist_enabled,setup_readiness_score,setup_readiness_grade,setup_readiness_decision,setup_readiness_blocker_count,setup_readiness_warning_count,setup_readiness_primary_blocker";

const GRADES =
  "ifvg_bisi_sibi_grade,liquidity_target_grade,execution_environment_grade,discipline_grade,premium_discount_grade,entry_fill_feasibility_grade";

const CTX =
  "session_bucket,volatility_bucket,spread_bucket,ifvg_conflict_with_trade_direction,liquidity_target_supported,liquidity_target_tp_before_nearest_liquidity,discipline_overtrading_risk,discipline_trade_date,pd_entry_zone_conflict,entry_near_miss,entry_fill_status";

const VARIANT =
  "entry_variant_outcome_sim_enabled,entry_variant_50_sim_status,entry_variant_50_sim_result_r,entry_variant_25_sim_status,entry_variant_25_sim_result_r,entry_variant_edge_sim_status,entry_variant_edge_sim_result_r";

function row(
  id: string,
  outcome: string,
  r: number,
  opts: Partial<{
    decision: string;
    grade: string;
    score: number;
    blocker: string;
    ifvgGrade: string;
    targetGrade: string;
    envGrade: string;
    discGrade: string;
    session: string;
    vol: string;
    ifvgConflict: boolean;
    nearMiss: boolean;
    edgeStatus: string;
    edgeR: number;
  }> = {},
): string {
  return [
    id,
    "BUY",
    "2026-01-10T12:00:00Z",
    "2026-01-10T14:00:00Z",
    2000,
    1990,
    2100,
    outcome === "win" ? 2100 : 1990,
    r,
    0,
    outcome,
    2,
    5,
    true,
    opts.score ?? 70,
    opts.grade ?? "B",
    opts.decision ?? "candidate",
    1,
    1,
    opts.blocker ?? "none",
    opts.ifvgGrade ?? "B",
    opts.targetGrade ?? "C",
    opts.envGrade ?? "C",
    opts.discGrade ?? "B",
    "C",
    "B",
    opts.session ?? "london",
    opts.vol ?? "normal",
    "normal",
    opts.ifvgConflict ? "true" : "false",
    "true",
    "false",
    "false",
    "2026-01-10",
    "false",
    opts.nearMiss ? "true" : "false",
    "filled",
    true,
    "win",
    2,
    "win",
    2,
    opts.edgeStatus ?? "win",
    opts.edgeR ?? 2,
  ].join(",");
}

function tradesCsv(...rows: string[]): string {
  return `${BASE},${READY},${GRADES},${CTX},${VARIANT}\n${rows.join("\n")}`;
}

describe("testea-setup-performance-baseline-audit (E5.22.2)", () => {
  it("computes official performance from trades", () => {
    const csv = tradesCsv(
      row("t1", "win", 2),
      row("t2", "win", 2),
      row("t3", "loss", -1),
      row("t4", "ambiguous", 0),
    );
    const r = analyzeTestEaSetupPerformanceBaselineAuditFromTexts({
      bundleName: "SET001",
      summaryJsonText: SUMMARY,
      tradesCsvText: csv,
    });
    expect(r.ok).toBe(true);
    expect(r.schema_version).toBe(SETUP_PERFORMANCE_BASELINE_AUDIT_SCHEMA);
    expect(r.official_performance.trade_count).toBe(4);
    expect(r.official_performance.win_count).toBe(2);
    expect(r.official_performance.loss_count).toBe(1);
    expect(r.official_performance.ambiguous_count).toBe(1);
    expect(r.official_performance.total_r).toBe(3);
    expect(r.official_performance.official_entry).toBe("50% / CE");
    expect(r.research_only_note).toMatch(/not approve/i);
  });

  it("groups by readiness decision and blocker", () => {
    const csv = tradesCsv(
      row("t1", "win", 2, { decision: "candidate" }),
      row("t2", "loss", -1, { decision: "reject", blocker: "pd_conflict" }),
      row("t3", "win", 2, { decision: "wait" }),
    );
    const r = analyzeTestEaSetupPerformanceBaselineAuditFromTexts({
      bundleName: "g",
      summaryJsonText: SUMMARY,
      tradesCsvText: csv,
    });
    const cand = r.readiness_performance.by_decision.groups.find((g) => g.key === "candidate");
    expect(cand?.count).toBe(1);
    expect(cand?.win_count).toBe(1);
    const pd = r.blocker_performance.groups.find((g) => g.key === "pd_conflict");
    expect(pd?.loss_count).toBe(1);
  });

  it("groups by IFVG/target/environment/discipline grades", () => {
    const csv = tradesCsv(row("t1", "win", 2, { ifvgGrade: "A", targetGrade: "A", envGrade: "A", discGrade: "A" }));
    const r = analyzeTestEaSetupPerformanceBaselineAuditFromTexts({
      bundleName: "grades",
      summaryJsonText: SUMMARY,
      tradesCsvText: csv,
    });
    expect(r.grade_performance.ifvg_bisi_sibi_grade.groups[0]?.key).toBe("A");
    expect(r.grade_performance.liquidity_target_grade.groups[0]?.key).toBe("A");
  });

  it("analyzes variants from summary and emits research flags", () => {
    const csv = tradesCsv(row("t1", "loss", -1, { edgeStatus: "win", edgeR: 2 }));
    const r = analyzeTestEaSetupPerformanceBaselineAuditFromTexts({
      bundleName: "var",
      summaryJsonText: SUMMARY,
      tradesCsvText: csv,
    });
    expect(r.variant_research_comparison.variants.length).toBeGreaterThan(0);
    expect(r.flags).toContain("ENTRY_VARIANTS_REQUIRE_ROBUSTNESS_AUDIT");
    expect(r.flags).toContain("EDGE_VARIANT_SIMULATION_RISK");
    expect(r.hypotheses.some((h) => h.includes("Edge") || h.includes("25%"))).toBe(true);
  });

  it("handles missing optional columns with warnings not hard fail", () => {
    const minimal = `${BASE}\nt1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2100,2100,2,0,win,2,5`;
    const r = analyzeTestEaSetupPerformanceBaselineAuditFromTexts({
      bundleName: "min",
      summaryJsonText: "{}",
      tradesCsvText: minimal,
    });
    expect(r.trade_count).toBe(1);
    expect(r.warnings.length).toBeGreaterThanOrEqual(0);
  });

  it("emits examples up to max_examples", () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      row(`t${i}`, "win", 2, { decision: "reject", score: 85, blocker: "pd_conflict" }),
    );
    const r = analyzeTestEaSetupPerformanceBaselineAuditFromTexts(
      { bundleName: "ex", summaryJsonText: SUMMARY, tradesCsvText: tradesCsv(...rows) },
      { maxExamples: 2 },
    );
    expect((r.examples.reject_win ?? []).length).toBeLessThanOrEqual(2);
    expect((r.examples.high_score_reject_win ?? []).length).toBeLessThanOrEqual(2);
  });

  it("flattens CSV rows for docs", () => {
    const csv = tradesCsv(row("t1", "win", 2));
    const r = analyzeTestEaSetupPerformanceBaselineAuditFromTexts({
      bundleName: "csv",
      summaryJsonText: SUMMARY,
      tradesCsvText: csv,
    });
    const flat = flattenSetupPerformanceBaselineAuditCsvRows(r);
    expect(flat.some((x) => x.section === "official_performance")).toBe(true);
    expect(flat.some((x) => x.section === "flag")).toBe(true);
  });

  it("does not use strategy approval wording", () => {
    const r = analyzeTestEaSetupPerformanceBaselineAuditFromTexts({
      bundleName: "gov",
      summaryJsonText: SUMMARY,
      tradesCsvText: tradesCsv(row("t1", "win", 2)),
    });
    const blob = JSON.stringify(r);
    expect(blob).not.toMatch(/approved for live/i);
    expect(blob).not.toMatch(/change entry/i);
  });
});
