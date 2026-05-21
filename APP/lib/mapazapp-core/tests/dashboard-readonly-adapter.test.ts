import { describe, expect, it } from "vitest";
import { V2_12_TESTEA_E342_SUMMARY_JSON } from "../src/export-sample-validation-fixtures";
import { buildSetupReadinessSummaryPlaceholders } from "../src/setup-readiness-export-keys";
import {
  alignHumanizedCasebook,
  buildDashboardReadonlyView,
  DASHBOARD_GOVERNANCE,
  parseSetupReadinessReportJson,
  validateTradeCardMinimumDisplay,
} from "../src/dashboard-readonly-adapter";
import {
  buildTestEaSetupReadinessReportFromTexts,
  setupReadinessReportToJson,
} from "../src/testea-setup-readiness-report";

function buildFixtureReportJson(): string {
  const e342 = JSON.parse(V2_12_TESTEA_E342_SUMMARY_JSON) as Record<string, unknown>;
  const summary = JSON.stringify({
    ...e342,
    ...buildSetupReadinessSummaryPlaceholders(),
    read_only: true,
    execution_enabled: false,
    has_real_trading_orders: false,
    trade_count: 4,
    ea_build: "MZP_TestEA_E5_18",
    canonical_symbol: "XAUUSD",
    execution_timeframe: "M15",
    campaign_id: "CAMP_ADAPT",
    parameter_set_id: "SET_ADAPT",
    bundle: "SET_ADAPT_BUNDLE",
  });

  const hdr =
    "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held,setup_readiness_checklist_enabled,checklist_bias_aligned,checklist_structure_ok,checklist_liquidity_event_ok,checklist_ifvg_quality_ok,checklist_ifvg_grade,checklist_mss_choch_ok,checklist_mss_choch_timing_ok,checklist_premium_discount_ok,checklist_pd_zone_valid,checklist_entry_feasible,checklist_entry_candidate_family,checklist_entry_fragility_warning,checklist_target_ok,checklist_target_grade,checklist_target_type,checklist_execution_environment_ok,checklist_execution_environment_grade,checklist_discipline_ok,checklist_discipline_grade,checklist_overtrading_warning,setup_readiness_score,setup_readiness_grade,setup_readiness_decision,setup_readiness_blocker_count,setup_readiness_warning_count,setup_readiness_primary_blocker,setup_readiness_reasons";

  const row = (
    id: string,
    decision: string,
    score: number,
    primary: string,
    warnings: number,
    reasons: string,
    blockerCount = 1,
  ) =>
    [
      id,
      "BUY",
      "2026-01-10T12:00:00Z",
      "2026-01-10T14:00:00Z",
      2000,
      1990,
      2100,
      2100,
      2,
      0,
      "win",
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
      "liquidity",
      true,
      "B",
      true,
      "B",
      false,
      score,
      "B",
      decision,
      blockerCount,
      warnings,
      primary,
      reasons,
    ].join(",");

  const trades = [
    row("t_reject_high", "reject", 85, "pd_conflict", 0, "checklist_pd_conflict|checklist_bias_ok"),
    row("t_candidate_warn", "candidate", 72, "entry_fragile", 2, "checklist_overtrading_warning|checklist_bias_ok"),
    row("t_ifvg", "reject", 60, "ifvg_conflict", 0, "checklist_ifvg_conflict|checklist_bias_ok"),
    row("t_target", "reject", 55, "target_missing", 0, "checklist_target_missing|checklist_bias_ok"),
  ].join("\n");

  const report = buildTestEaSetupReadinessReportFromTexts(
    {
      bundleName: "SET_ADAPT_BUNDLE",
      summaryJsonText: summary,
      tradesCsvText: `${hdr}\n${trades}\n`,
    },
    { language: "es", maxExamples: 10 },
  );
  return setupReadinessReportToJson(report);
}

describe("dashboard-readonly-adapter", () => {
  it("builds adapter view from fixture setup_readiness_report.json", () => {
    const view = buildDashboardReadonlyView({ reportJsonText: buildFixtureReportJson() });
    expect(view.schema_version).toBe("mapazapp_dashboard_readonly_view_v1");
    expect(view.ok).toBe(true);
    expect(view.mode).toBe("backtest_research");
    expect(view.read_only).toBe(true);
    expect(view.header.bundle).toBe("SET_ADAPT_BUNDLE");
    expect(view.trade_cards.length).toBeGreaterThan(0);
    expect(view.campaign_summary.minimum_display_unit_enforced).toBe(true);
    expect(view.decision_summary.some((d) => d.decision === "reject")).toBe(true);
  });

  it("enforces minimum display unit", () => {
    const report = parseSetupReadinessReportJson(buildFixtureReportJson())!;
    const bad = { ...report.example_cards[0]!, setup_readiness_score: null, top_reasons: [] };
    expect(validateTradeCardMinimumDisplay(bad)).toMatch(/missing score|missing reasons/);

    const view = buildDashboardReadonlyView({
      reportJsonText: JSON.stringify({
        ...report,
        example_cards: [bad],
      }),
    });
    expect(view.ok).toBe(false);
    expect(view.errors.some((e) => e.includes("minimum display"))).toBe(true);
  });

  it("high-score reject gets badge and tooltip", () => {
    const view = buildDashboardReadonlyView({ reportJsonText: buildFixtureReportJson() });
    const card = view.trade_cards.find((c) => c.decision === "reject" && c.score >= 70);
    expect(card).toBeDefined();
    const badge = card!.display_badges.find((b) => b.id === "high_score_reject");
    expect(badge?.label).toContain("Puntaje alto");
    expect(badge?.tooltip).toContain("no es permiso");
  });

  it("candidate with warnings gets badge and note", () => {
    const view = buildDashboardReadonlyView({ reportJsonText: buildFixtureReportJson() });
    const card = view.trade_cards.find((c) => c.decision === "candidate" && c.warning_count > 0);
    expect(card).toBeDefined();
    const badge = card!.display_badges.find((b) => b.id === "candidate_with_warnings");
    expect(badge?.label).toContain("Candidato");
    expect(badge?.note).toContain("discrecional");
  });

  it("pd_conflict maps to HA-004", () => {
    const alignment = alignHumanizedCasebook(["pd_conflict"], []);
    expect(alignment.active_case_refs).toContain("HA-004");
  });

  it("ifvg_conflict maps to HA-009", () => {
    const alignment = alignHumanizedCasebook(["ifvg_conflict"], []);
    expect(alignment.active_case_refs).toContain("HA-009");
  });

  it("target_missing maps to HA-006", () => {
    const alignment = alignHumanizedCasebook(["target_missing"], []);
    expect(alignment.active_case_refs).toContain("HA-006");
  });

  it("overtrading_warning maps to HA-005", () => {
    const alignment = alignHumanizedCasebook(["overtrading_warning"], []);
    expect(alignment.active_case_refs).toContain("HA-005");
  });

  it("HA-007 / HA-008 remain missing_measurement when fields absent", () => {
    const alignment = alignHumanizedCasebook(["checklist_bias_ok"], []);
    expect(alignment.missing_measurement_case_refs).toContain("HA-007");
    expect(alignment.missing_measurement_case_refs).toContain("HA-008");
    expect(alignment.active_case_refs).not.toContain("HA-007");
    expect(alignment.active_case_refs).not.toContain("HA-008");
  });

  it("governance object contains no gates / no live / entry 50% CE / TP RR2", () => {
    expect(DASHBOARD_GOVERNANCE.no_gates).toBe(true);
    expect(DASHBOARD_GOVERNANCE.no_live_trading).toBe(true);
    expect(DASHBOARD_GOVERNANCE.official_entry).toBe("50% / CE");
    expect(DASHBOARD_GOVERNANCE.official_tp).toBe("RR2");
    expect(DASHBOARD_GOVERNANCE.edge_status).toBe("research_only");
  });

  it("outcome is included only in backtest_research mode", () => {
    const view = buildDashboardReadonlyView({ reportJsonText: buildFixtureReportJson() });
    expect(view.mode).toBe("backtest_research");
    expect(view.trade_cards.every((c) => c.outcome != null)).toBe(true);
  });

  it("enriches header from latest_valid_report_result.json", () => {
    const latest = JSON.stringify({
      ok: true,
      selected_bundle_id: "E55/SET001",
      valid_status_before_report: "report_missing",
      timeframe: "M15",
    });
    const view = buildDashboardReadonlyView({
      reportJsonText: buildFixtureReportJson(),
      latestResultJsonText: latest,
    });
    expect(view.header.selected_bundle_id).toBe("E55/SET001");
    expect(view.header.valid_status_before_report).toBe("report_missing");
    expect(view.header.timeframe).toBe("M15");
  });

  it("uses Spanish decision labels in decision_summary", () => {
    const view = buildDashboardReadonlyView({ reportJsonText: buildFixtureReportJson(), language: "es" });
    const candidate = view.decision_summary.find((d) => d.decision === "candidate");
    expect(candidate?.label_es).toBe("Candidato — revisar advertencias");
    const wait = view.decision_summary.find((d) => d.decision === "wait");
    expect(wait?.label_es).toBe("Esperar — contexto incompleto o precaución");
    const reject = view.decision_summary.find((d) => d.decision === "reject");
    expect(reject?.label_es).toBe("Rechazado — bloqueo crítico");
    const unknown = view.decision_summary.find((d) => d.decision === "unknown");
    expect(unknown?.label_es).toBe("Desconocido — datos insuficientes");
  });
});
