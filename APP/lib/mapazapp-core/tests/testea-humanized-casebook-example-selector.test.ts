import { describe, expect, it } from "vitest";
import {
  analyzeTestEaHumanizedCasebookExamplesFromTexts,
  flattenHumanizedCasebookExampleCsvRows,
  HUMANIZED_CASEBOOK_EXAMPLE_SELECTOR_SCHEMA,
} from "../src/testea-humanized-casebook-example-selector";

const SUMMARY = JSON.stringify({
  ea_build: "MZP_TestEA_E5_18",
  symbol: "XAUUSD",
  execution_timeframe: "M15",
  trade_count: 12,
});

const BASE =
  "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held";

const READY =
  "setup_readiness_checklist_enabled,setup_readiness_score,setup_readiness_grade,setup_readiness_decision,setup_readiness_blocker_count,setup_readiness_warning_count,setup_readiness_primary_blocker,setup_readiness_reasons";

const GRADES =
  "ifvg_bisi_sibi_grade,liquidity_target_grade,execution_environment_grade,discipline_grade,premium_discount_grade,entry_fill_feasibility_grade";

const CTX =
  "session_bucket,volatility_bucket,spread_bucket,ifvg_conflict_with_trade_direction,pd_entry_zone_conflict,liquidity_target_reasons,liquidity_target_supported,discipline_overtrading_risk,discipline_revenge_trade_risk,discipline_trade_date,entry_near_miss,entry_missed_shallow_retrace,entry_fill_status,entry_filled_late,missed_entry_by_points";

const VARIANT =
  "entry_variant_outcome_sim_enabled,entry_variant_50_sim_status,entry_variant_50_sim_result_r,entry_variant_25_sim_status,entry_variant_25_sim_result_r,entry_variant_edge_sim_status,entry_variant_edge_sim_result_r";

function row(
  id: string,
  outcome: string,
  r: number,
  opts: Partial<{
    decision: string;
    score: number;
    blocker: string;
    ifvgConflict: boolean;
    ifvgGrade: string;
    targetGrade: string;
    envGrade: string;
    discGrade: string;
    nearMiss: boolean;
    shallow: boolean;
    fillStatus: string;
    filledLate: boolean;
    pdConflict: boolean;
    targetReasons: string;
    overtrading: boolean;
    edgeStatus: string;
    edgeR: number;
    v25Status: string;
    v25R: number;
    reasons: string;
    session: string;
    vol: string;
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
    "B",
    opts.decision ?? "candidate",
    1,
    1,
    opts.blocker ?? "none",
    opts.reasons ?? "checklist_bias_ok",
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
    opts.pdConflict ? "true" : "false",
    opts.targetReasons ?? "",
    "true",
    opts.overtrading ? "true" : "false",
    "false",
    "2026-01-10",
    opts.nearMiss ? "true" : "false",
    opts.shallow ? "true" : "false",
    opts.fillStatus ?? "filled",
    opts.filledLate ? "true" : "false",
    0,
    true,
    "win",
    2,
    opts.v25Status ?? "win",
    opts.v25R ?? 2,
    opts.edgeStatus ?? "win",
    opts.edgeR ?? 2,
  ].join(",");
}

function tradesCsv(...rows: string[]): string {
  return `${BASE},${READY},${GRADES},${CTX},${VARIANT}\n${rows.join("\n")}`;
}

describe("testea-humanized-casebook-example-selector (E5.22.4.1)", () => {
  it("selects HA examples when matching fields exist", () => {
    const csv = tradesCsv(
      row("t_nm", "expired_unfilled", 0, {
        nearMiss: true,
        decision: "wait",
        ifvgConflict: false,
        fillStatus: "near_miss",
        edgeStatus: "win",
        edgeR: 2,
      }),
      row("t_pd_win", "win", 2, { blocker: "pd_conflict", pdConflict: true, decision: "reject" }),
      row("t_ifvg_loss", "loss", -1, { ifvgConflict: true, decision: "reject" }),
      row("t_wait", "win", 2, { decision: "wait" }),
      row("t_var", "loss", -1, { edgeStatus: "win", edgeR: 2, v25Status: "win", v25R: 2 }),
    );
    const r = analyzeTestEaHumanizedCasebookExamplesFromTexts(
      { bundleName: "SET001_TEST", summaryJsonText: SUMMARY, tradesCsvText: csv },
      { maxExamplesPerCase: 3 },
    );
    expect(r.ok).toBe(true);
    expect(r.schema_version).toBe(HUMANIZED_CASEBOOK_EXAMPLE_SELECTOR_SCHEMA);
    expect(r.examples_by_case["HA-001"]!.length).toBeGreaterThan(0);
    expect(r.examples_by_case["HA-004"]!.length).toBeGreaterThan(0);
    expect(r.examples_by_case["HA-009"]!.length).toBeGreaterThan(0);
    expect(r.examples_by_case["HA-010"]!.length).toBeGreaterThan(0);
    expect(r.examples_by_case["HA-003"]!.length).toBeGreaterThan(0);
  });

  it("marks HA-008 missing when no news fields exist", () => {
    const csv = tradesCsv(row("t1", "win", 2));
    const r = analyzeTestEaHumanizedCasebookExamplesFromTexts({
      bundleName: "B",
      summaryJsonText: SUMMARY,
      tradesCsvText: csv,
    });
    expect(r.missing_cases).toContain("HA-008");
    expect(r.examples_by_case["HA-008"]).toEqual([]);
    expect(r.field_availability.news_event_fields).toBe(false);
    expect(r.warnings.some((w) => w.includes("HA-008"))).toBe(true);
  });

  it("selects PD conflict winner and loss", () => {
    const csv = tradesCsv(
      row("pd_w", "win", 2, { blocker: "pd_conflict", pdConflict: true, decision: "reject" }),
      row("pd_l", "loss", -1, { blocker: "pd_conflict", pdConflict: true, decision: "reject" }),
    );
    const r = analyzeTestEaHumanizedCasebookExamplesFromTexts({
      bundleName: "B",
      summaryJsonText: SUMMARY,
      tradesCsvText: csv,
    });
    const ha4 = r.examples_by_case["HA-004"]!;
    expect(ha4.some((e) => e.outcome === "win")).toBe(true);
    expect(ha4.some((e) => e.outcome === "loss")).toBe(true);
  });

  it("selects IFVG conflict loser and rare winner if present", () => {
    const csv = tradesCsv(
      row("ifvg_l", "loss", -1, { ifvgConflict: true, decision: "reject" }),
      row("ifvg_w", "win", 2, { ifvgConflict: true, decision: "reject" }),
    );
    const r = analyzeTestEaHumanizedCasebookExamplesFromTexts({
      bundleName: "B",
      summaryJsonText: SUMMARY,
      tradesCsvText: csv,
    });
    const ha9 = r.examples_by_case["HA-009"]!;
    expect(ha9.some((e) => e.outcome === "loss")).toBe(true);
    expect(ha9.some((e) => e.outcome === "win")).toBe(true);
  });

  it("respects max_examples_per_case", () => {
    const rows = Array.from({ length: 8 }, (_, i) =>
      row(`t${i}`, "win", 2, { decision: "wait" }),
    );
    const r = analyzeTestEaHumanizedCasebookExamplesFromTexts(
      { bundleName: "B", summaryJsonText: SUMMARY, tradesCsvText: tradesCsv(...rows) },
      { maxExamplesPerCase: 2 },
    );
    expect(r.examples_by_case["HA-010"]!.length).toBeLessThanOrEqual(4);
  });

  it("governance notes forbid gate/approval wording", () => {
    const csv = tradesCsv(row("t1", "win", 2));
    const r = analyzeTestEaHumanizedCasebookExamplesFromTexts({
      bundleName: "B",
      summaryJsonText: SUMMARY,
      tradesCsvText: csv,
    });
    const all = [
      ...Object.values(r.examples_by_case).flat(),
      ...Object.values(r.examples_by_calibration_category).flat(),
    ];
    for (const ex of all) {
      expect(ex.governance_note.toLowerCase()).toContain("must not change official");
      expect(ex.governance_note.toLowerCase()).not.toMatch(/\bapprove\b.*\bgate\b/);
    }
    expect(r.research_only_note.toLowerCase()).toContain("does not approve");
  });

  it("flattenHumanizedCasebookExampleCsvRows produces rows", () => {
    const csv = tradesCsv(row("t1", "win", 2, { decision: "wait" }));
    const r = analyzeTestEaHumanizedCasebookExamplesFromTexts({
      bundleName: "B",
      summaryJsonText: SUMMARY,
      tradesCsvText: csv,
    });
    const flat = flattenHumanizedCasebookExampleCsvRows(r);
    expect(flat.length).toBeGreaterThan(0);
    expect(flat[0]!.trade_id).toBeDefined();
  });
});
