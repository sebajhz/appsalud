import { describe, expect, it } from "vitest";
import {
  buildTestEaSetupReadinessReportFromTexts,
  decisionDisplayLabel,
  renderSetupReadinessReportMarkdown,
  setupReadinessReportToJson,
  type SetupReadinessReport,
} from "../src/testea-setup-readiness-report";

const SUMMARY_READY = JSON.stringify({
  has_setup_readiness_checklist_v1_logic: true,
  setup_readiness_checklist_enabled: true,
  ea_build: "MZP_TestEA_E5_18",
  canonical_symbol: "XAUUSD",
  timeframe: "M15",
  campaign_id: "SET001",
  parameter_set_id: "FVG2_RR2_00",
  read_only: true,
  execution_enabled: false,
});

const SUMMARY_NO_READY = JSON.stringify({ trade_count: 1 });

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
    warnings?: number;
    primary?: string;
    reasons?: string;
  },
): string {
  const score = opts.score ?? 65;
  const grade = opts.grade ?? "B";
  const decision = opts.decision ?? "wait";
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
    "B",
    true,
    true,
    true,
    true,
    true,
    "official_50_ce",
    false,
    true,
    "B",
    "swing",
    true,
    "B",
    true,
    "B",
    false,
    score,
    grade,
    decision,
    1,
    warnings,
    primary,
    reasons,
  ].join(",");
}

describe("testea-setup-readiness-report (E5.19)", () => {
  it("builds report from small fixture with required sections", () => {
    const csv = tradesCsv(
      readyRow("t1", "win", { score: 90, grade: "A", decision: "reject", primary: "pd_conflict" }),
      readyRow("t2", "loss", { score: 72, grade: "B", decision: "candidate", warnings: 3 }),
    );
    const r = buildTestEaSetupReadinessReportFromTexts(
      { bundleName: "b", summaryJsonText: SUMMARY_READY, tradesCsvText: csv },
      { maxExamples: 2, language: "es" },
    );
    expect(r.ok).toBe(true);
    expect(r.minimum_display_unit_enforced).toBe(true);
    expect(r.header.trade_count).toBe(2);
    expect(r.executive_summary.decision_counts["reject"]).toBe(1);
    expect(r.score_grade_distribution.high_score_reject_count).toBe(1);
    expect(r.example_cards.length).toBeGreaterThan(0);
    const json = JSON.parse(setupReadinessReportToJson(r)) as SetupReadinessReport;
    expect(json.executive_summary).toBeDefined();
    expect(json.blocker_leaderboard).toBeDefined();
    expect(json.outcome_research.disclaimer_es).toContain("observacional");
  });

  it("returns ok=false when setup readiness logic flag missing", () => {
    const csv = tradesCsv(readyRow("t1", "win", {}));
    const r = buildTestEaSetupReadinessReportFromTexts({
      bundleName: "b",
      summaryJsonText: SUMMARY_NO_READY,
      tradesCsvText: csv,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("has_setup_readiness_checklist_v1_logic"))).toBe(true);
    expect(r.header.trade_count).toBe(0);
  });

  it("rejects duplicate CSV headers", () => {
    const dupHdr = `${BASE_HDR},setup_readiness_score,setup_readiness_score`;
    const r = buildTestEaSetupReadinessReportFromTexts({
      bundleName: "dup",
      summaryJsonText: SUMMARY_READY,
      tradesCsvText: dupHdr,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("duplicate CSV header"))).toBe(true);
  });

  it("represents high-score reject and candidate-with-warnings wording", () => {
    expect(
      decisionDisplayLabel("reject", 90, "pd_conflict", 2, "es"),
    ).toContain("Puntaje alto");
    expect(
      decisionDisplayLabel("candidate", 72, "none", 4, "es"),
    ).toContain("revisar advertencias");
    const md = renderSetupReadinessReportMarkdown(
      buildTestEaSetupReadinessReportFromTexts(
        {
          bundleName: "w",
          summaryJsonText: SUMMARY_READY,
          tradesCsvText: tradesCsv(
            readyRow("hr", "win", { score: 88, decision: "reject", primary: "ifvg_conflict" }),
            readyRow("c", "win", { score: 75, decision: "candidate", warnings: 5 }),
          ),
        },
        { language: "es" },
      ),
    );
    expect(md).toContain("Resumen ejecutivo");
    expect(md).toContain("Candidatos");
    expect(md).toContain("Rechazados");
    expect(md).toContain("Bloqueadores principales");
    expect(md).toContain("Gobernanza");
    expect(md).toContain("no es permiso");
    expect(md).not.toMatch(/^#\s*Score:\s*\d+\s*$/m);
  });

  it("JSON contains governance footer and minimum display unit", () => {
    const r = buildTestEaSetupReadinessReportFromTexts(
      {
        bundleName: "j",
        summaryJsonText: SUMMARY_READY,
        tradesCsvText: tradesCsv(readyRow("t1", "win", { decision: "candidate", warnings: 1 })),
      },
    );
    const raw = setupReadinessReportToJson(r);
    expect(raw).toContain("minimum_display_unit_enforced");
    expect(raw).toContain("governance_footer");
    expect(raw).toContain("executive_summary");
  });
});
