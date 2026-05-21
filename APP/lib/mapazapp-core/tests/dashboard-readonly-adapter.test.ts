import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = fileURLToPath(new URL("../../../..", import.meta.url));
import { describe, expect, it } from "vitest";
import { V2_12_TESTEA_E342_SUMMARY_JSON } from "../src/export-sample-validation-fixtures";
import { buildSetupReadinessSummaryPlaceholders } from "../src/setup-readiness-export-keys";
import {
  alignHumanizedCasebook,
  buildDashboardReadonlyView,
  DASHBOARD_GOVERNANCE,
  parseSetupReadinessReportJson,
  resolveTradeCardReasonContext,
  validateTradeCardViewMinimumDisplay,
} from "../src/dashboard-readonly-adapter";
import {
  buildTestEaSetupReadinessReportFromTexts,
  setupReadinessReportToJson,
  type SetupReadinessReport,
  type SetupReadinessReportTradeCard,
} from "../src/testea-setup-readiness-report";

const REAL_REPORT_PATH = join(
  APP_ROOT,
  "artifacts/mapazapp/docs/_local_E5_20_2_1_latest_valid_report_DO_NOT_COMMIT/setup_readiness_report.json",
);
const REAL_LATEST_PATH = join(
  APP_ROOT,
  "artifacts/mapazapp/docs/_local_E5_20_2_1_latest_valid_report_DO_NOT_COMMIT/latest_valid_report_result.json",
);

function vtrLikeCard(tradeId: string): SetupReadinessReportTradeCard {
  return {
    categories: ["candidate", "candidate_with_warnings"],
    category: "candidate",
    trade_id: tradeId,
    entry_time: "2025-01-02T12:00:00Z",
    direction: "BUY",
    outcome: "win",
    setup_readiness_score: 70,
    setup_readiness_grade: "B",
    setup_readiness_decision: "candidate",
    setup_readiness_primary_blocker: "none",
    setup_readiness_blocker_count: 0,
    setup_readiness_warning_count: 3,
    top_reasons: ["checklist_bias_ok", "checklist_liquidity_ok", "checklist_ifvg_ok"],
    checklist_ifvg_grade: "B",
    checklist_target_grade: "C",
    checklist_execution_environment_grade: "B",
    checklist_discipline_grade: "A",
    checklist_entry_candidate_family: "official_50_ce",
    decision_display_label: "Candidato — revisar advertencias",
    primary_context_kind: "primary_blocker",
    primary_context_label: "Bloqueador principal",
    primary_context_note: null,
  };
}

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

  it("trade card with blocker_count=0 and no primary_blocker gets main_reason fallback", () => {
    const resolved = resolveTradeCardReasonContext(vtrLikeCard("VTR_000003"));
    expect(resolved.primary_blocker).toBe("none");
    expect(resolved.reason_is_hard_blocker).toBe(false);
    expect(resolved.main_reason).toBe("checklist_bias_ok");
  });

  it("VTR-like card with no blocker but top_reasons yields ok=true", () => {
    const report = parseSetupReadinessReportJson(buildFixtureReportJson())!;
    const patched: SetupReadinessReport = {
      ...report,
      example_cards: [vtrLikeCard("VTR_000003"), vtrLikeCard("VTR_000009")],
    };
    const view = buildDashboardReadonlyView({ reportJsonText: JSON.stringify(patched) });
    expect(view.ok).toBe(true);
    expect(view.errors).toEqual([]);
    expect(view.trade_cards).toHaveLength(2);
    expect(view.trade_cards[0]!.main_reason).toBe("checklist_bias_ok");
  });

  it("candidate with warnings gets candidate_with_warnings main_reason when no top_reason", () => {
    const card = vtrLikeCard("c1");
    card.top_reasons = [];
    const resolved = resolveTradeCardReasonContext(card);
    expect(resolved.main_reason).toBe("candidate_with_warnings");
  });

  it("wait with no hard blocker gets wait_context_incomplete fallback", () => {
    const card = vtrLikeCard("w1");
    card.setup_readiness_decision = "wait";
    card.setup_readiness_warning_count = 0;
    card.top_reasons = [];
    const resolved = resolveTradeCardReasonContext(card);
    expect(resolved.main_reason).toBe("wait_context_incomplete");
  });

  it("minimum display unit passes with main_reason fallback", () => {
    const view = buildDashboardReadonlyView({
      reportJsonText: JSON.stringify({
        ...parseSetupReadinessReportJson(buildFixtureReportJson())!,
        example_cards: [vtrLikeCard("VTR_000003")],
      }),
    });
    expect(view.campaign_summary.minimum_display_unit_enforced).toBe(true);
    expect(validateTradeCardViewMinimumDisplay(view.trade_cards[0]!)).toBeNull();
  });

  it("decision_summary uses campaign counts, not example cards", () => {
    const base = parseSetupReadinessReportJson(buildFixtureReportJson())!;
    const patched: SetupReadinessReport = {
      ...base,
      header: { ...base.header, trade_count: 1697 },
      executive_summary: {
        ...base.executive_summary,
        decision_counts: { reject: 1300, candidate: 247, wait: 150 },
      },
      example_cards: [
        vtrLikeCard("VTR_000003"),
        vtrLikeCard("VTR_000009"),
        { ...vtrLikeCard("w1"), setup_readiness_decision: "wait" },
        { ...vtrLikeCard("r1"), setup_readiness_decision: "reject", setup_readiness_primary_blocker: "pd_conflict", setup_readiness_blocker_count: 1 },
      ],
    };
    const view = buildDashboardReadonlyView({ reportJsonText: JSON.stringify(patched) });
    const campaign = view.decision_summary.find((d) => d.decision === "candidate");
    expect(campaign?.count).toBe(247);
    expect(view.trade_card_decision_summary.find((d) => d.decision === "candidate")?.count).toBe(2);
    expect(view.trade_card_decision_summary.find((d) => d.decision === "reject")?.count).toBe(1);
  });

  it("enforces minimum display unit on unrecoverable cards", () => {
    const report = parseSetupReadinessReportJson(buildFixtureReportJson())!;
    const bad = { ...report.example_cards[0]!, setup_readiness_score: null, top_reasons: [] };

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

  it("real-like SET001 report fixture produces ok=true when present locally", () => {
    if (!existsSync(REAL_REPORT_PATH)) return;
    const reportText = readFileSync(REAL_REPORT_PATH, "utf8");
    const latestText = existsSync(REAL_LATEST_PATH) ? readFileSync(REAL_LATEST_PATH, "utf8") : undefined;
    const view = buildDashboardReadonlyView({
      reportJsonText: reportText,
      latestResultJsonText: latestText,
    });
    expect(view.ok).toBe(true);
    expect(view.errors).toEqual([]);
    expect(view.campaign_summary.minimum_display_unit_enforced).toBe(true);
    expect(view.decision_summary.find((d) => d.decision === "reject")?.count).toBe(1300);
    expect(view.decision_summary.find((d) => d.decision === "candidate")?.count).toBe(247);
    expect(view.decision_summary.find((d) => d.decision === "wait")?.count).toBe(150);
    expect(view.trade_cards.length).toBeGreaterThan(0);
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
