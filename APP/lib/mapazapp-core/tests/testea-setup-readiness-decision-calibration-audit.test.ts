import { describe, expect, it } from "vitest";
import {
  analyzeTestEaSetupReadinessDecisionCalibrationAuditFromTexts,
  expectedSetupReadinessDecisionFromScore,
  flattenSetupReadinessDecisionCalibrationAuditCsvRows,
  isSetupReadinessDecisionOverride,
  setupReadinessScoreBand,
} from "../src/testea-setup-readiness-decision-calibration-audit";

const SUMMARY_READY = JSON.stringify({
  has_setup_readiness_checklist_v1_logic: true,
  setup_readiness_checklist_enabled: true,
});

const BASE_HDR =
  "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held";

const READY_COLS =
  "setup_readiness_checklist_enabled,checklist_bias_aligned,checklist_structure_ok,checklist_liquidity_event_ok,checklist_ifvg_quality_ok,checklist_ifvg_grade,checklist_mss_choch_ok,checklist_mss_choch_timing_ok,checklist_premium_discount_ok,checklist_pd_zone_valid,checklist_entry_feasible,checklist_entry_candidate_family,checklist_entry_fragility_warning,checklist_target_ok,checklist_target_grade,checklist_target_type,checklist_execution_environment_ok,checklist_execution_environment_grade,checklist_discipline_ok,checklist_discipline_grade,checklist_overtrading_warning,setup_readiness_score,setup_readiness_grade,setup_readiness_decision,setup_readiness_blocker_count,setup_readiness_warning_count,setup_readiness_primary_blocker,setup_readiness_reasons";

function tradesCsv(...rows: string[]): string {
  return `${BASE_HDR},${READY_COLS}\n${rows.join("\n")}`;
}

function readyRow(
  id: string,
  outcome: string,
  opts: {
    score?: number;
    grade?: string;
    decision?: string;
    blockers?: number;
    warnings?: number;
    primary?: string;
    reasons?: string;
    targetGrade?: string;
    envGrade?: string;
    disciplineGrade?: string;
    ifvgGrade?: string;
    entryFamily?: string;
  },
): string {
  const score = opts.score ?? 65;
  const grade = opts.grade ?? "B";
  const decision = opts.decision ?? "wait";
  const blockers = opts.blockers ?? 1;
  const warnings = opts.warnings ?? 2;
  const primary = opts.primary ?? "pd_conflict";
  const reasons = opts.reasons ?? "checklist_pd_conflict|checklist_wait";
  return [
    id,
    "BUY",
    "2026-01-10T12:00:00Z",
    "2026-01-10T14:00:00Z",
    2000,
    1990,
    2100,
    2100,
    outcome === "win" ? 2 : -1,
    0,
    outcome,
    2,
    5,
    true,
    true,
    true,
    true,
    true,
    opts.ifvgGrade ?? "B",
    true,
    true,
    true,
    true,
    true,
    opts.entryFamily ?? "official_50_ce",
    false,
    true,
    opts.targetGrade ?? "B",
    "swing",
    true,
    opts.envGrade ?? "B",
    true,
    opts.disciplineGrade ?? "B",
    false,
    score,
    grade,
    decision,
    blockers,
    warnings,
    primary,
    reasons,
  ].join(",");
}

describe("testea-setup-readiness-decision-calibration-audit (E5.18.2)", () => {
  it("maps score bands and expected decisions from thresholds", () => {
    expect(setupReadinessScoreBand(34)).toBe("0-44");
    expect(setupReadinessScoreBand(55)).toBe("45-69");
    expect(setupReadinessScoreBand(75)).toBe("70-84");
    expect(setupReadinessScoreBand(90)).toBe("85-100");
    expect(expectedSetupReadinessDecisionFromScore(90)).toBe("candidate");
    expect(expectedSetupReadinessDecisionFromScore(55)).toBe("wait");
    expect(expectedSetupReadinessDecisionFromScore(30)).toBe("reject");
  });

  it("aggregates overall counts and score-decision buckets", () => {
    const csv = tradesCsv(
      readyRow("t1", "win", { score: 90, grade: "A", decision: "reject", primary: "pd_conflict" }),
      readyRow("t2", "loss", { score: 40, grade: "Weak", decision: "candidate", primary: "none", blockers: 0 }),
      readyRow("t3", "win", { score: 75, grade: "B", decision: "wait", primary: "entry_fragile" }),
    );
    const r = analyzeTestEaSetupReadinessDecisionCalibrationAuditFromTexts(
      { bundleName: "ready", summaryJsonText: SUMMARY_READY, tradesCsvText: csv },
      { maxExamples: 5 },
    );
    expect(r.ok).toBe(true);
    expect(r.overall.trade_count).toBe(3);
    expect(r.score_decision_buckets.high_score_reject_count).toBe(1);
    expect(r.score_decision_buckets.low_score_candidate_count).toBe(1);
    expect(r.score_decision_buckets.grade_a_reject_count).toBe(1);
    expect(r.grade_by_decision.counts["A"]?.["reject"]).toBe(1);
    expect(r.score_band_by_decision.counts["85-100"]?.["reject"]).toBe(1);
  });

  it("flags interpretation for high-score rejects and pd_conflict override", () => {
    const rows: string[] = [];
    for (let i = 0; i < 10; i++) {
      rows.push(
        readyRow(`hr${i}`, "win", {
          score: 88,
          grade: "A",
          decision: "reject",
          primary: "pd_conflict",
          blockers: 2,
        }),
      );
    }
    rows.push(readyRow("cand", "loss", { score: 72, grade: "B", decision: "candidate", warnings: 4, primary: "none", blockers: 0 }));
    const r = analyzeTestEaSetupReadinessDecisionCalibrationAuditFromTexts(
      { bundleName: "flags", summaryJsonText: SUMMARY_READY, tradesCsvText: tradesCsv(...rows) },
    );
    expect(r.interpretation_flags).toContain("HIGH_SCORE_REJECTS_PRESENT");
    expect(r.interpretation_flags).toContain("CRITICAL_BLOCKERS_OVERRIDE_SCORE");
    expect(r.interpretation_flags).toContain("PD_CONFLICT_HARD_OVERRIDE_SUSPECTED");
    expect(r.interpretation_flags).toContain("CANDIDATES_WITH_WARNINGS_PRESENT");
    expect(r.critical_blocker_stats.find((c) => c.blocker === "pd_conflict")?.high_score_reject_as_primary_count).toBe(10);
  });

  it("detects decision override when blockers change expected decision", () => {
    const csv = tradesCsv(
      readyRow("ov", "win", { score: 90, grade: "A", decision: "reject", primary: "pd_conflict", blockers: 1 }),
    );
    const imported = analyzeTestEaSetupReadinessDecisionCalibrationAuditFromTexts(
      { bundleName: "ov", summaryJsonText: SUMMARY_READY, tradesCsvText: csv },
    );
    expect(imported.score_decision_buckets.decision_override_count).toBe(1);
    expect(
      isSetupReadinessDecisionOverride({
        tradeId: "x",
        setupReadinessScore: 90,
        setupReadinessDecision: "reject",
        setupReadinessPrimaryBlocker: "pd_conflict",
        setupReadinessBlockerCount: 1,
      } as never),
    ).toBe(true);
  });

  it("flattens CSV rows for CLI output", () => {
    const csv = tradesCsv(readyRow("t1", "win", { score: 90, grade: "A", decision: "reject" }));
    const r = analyzeTestEaSetupReadinessDecisionCalibrationAuditFromTexts(
      { bundleName: "flat", summaryJsonText: SUMMARY_READY, tradesCsvText: csv },
    );
    const flat = flattenSetupReadinessDecisionCalibrationAuditCsvRows(r);
    expect(flat.some((row) => row.section === "grade_by_decision")).toBe(true);
    expect(flat.some((row) => row.section === "interpretation_flag")).toBe(true);
  });

  it("collects examples per category", () => {
    const csv = tradesCsv(
      readyRow("ex1", "win", { score: 92, grade: "A", decision: "reject", primary: "pd_conflict" }),
      readyRow("ex2", "loss", { score: 38, grade: "Weak", decision: "candidate", primary: "none", blockers: 0 }),
      readyRow("ex3", "win", { score: 72, grade: "B", decision: "candidate", warnings: 5, primary: "none", blockers: 0 }),
      readyRow("ex4", "loss", { score: 55, grade: "C", decision: "wait", primary: "entry_fragile", blockers: 2 }),
    );
    const r = analyzeTestEaSetupReadinessDecisionCalibrationAuditFromTexts(
      { bundleName: "ex", summaryJsonText: SUMMARY_READY, tradesCsvText: csv },
      { maxExamples: 3 },
    );
    const cats = new Set(r.examples.map((e) => e.category));
    expect(cats.has("high_score_reject")).toBe(true);
    expect(cats.has("low_score_candidate")).toBe(true);
    expect(cats.has("candidate_many_warnings")).toBe(true);
    expect(cats.has("wait_strong_blocker")).toBe(true);
  });
});
