import { describe, expect, it } from "vitest";
import {
  buildDashboardReadonlyView,
  type DashboardReadonlyView,
  type DashboardTradeCardView,
} from "../src/dashboard-readonly-adapter";
import {
  ALERT_DELIVERY_STATUS,
  ALERT_REVIEW_SCHEMA_VERSION,
  alertRecordContainsForbiddenWording,
  alertsToJsonl,
  buildGovernanceFooter,
  classifyTradeCardAlertType,
  FORBIDDEN_ALERT_WORDING,
  generateAlertsFromDashboardView,
} from "../src/alert-only-review";
import { V2_12_TESTEA_E342_SUMMARY_JSON } from "../src/export-sample-validation-fixtures";
import { buildSetupReadinessSummaryPlaceholders } from "../src/setup-readiness-export-keys";
import {
  buildTestEaSetupReadinessReportFromTexts,
  setupReadinessReportToJson,
  type SetupReadinessReportTradeCard,
} from "../src/testea-setup-readiness-report";

function tradeCard(overrides: Partial<DashboardTradeCardView>): DashboardTradeCardView {
  return {
    trade_id: "VTR_TEST",
    setup_time: null,
    entry_time: "2025-01-02T12:00:00Z",
    direction: "BUY",
    outcome: "win",
    decision: "candidate",
    decision_label: "Candidato",
    score: 70,
    grade: "B",
    primary_blocker: "none",
    main_reason: "checklist_bias_ok",
    blocker_count: 0,
    warning_count: 0,
    top_reasons: ["checklist_bias_ok"],
    categories: [],
    component_grades: {
      ifvg: "B",
      target: "B",
      environment: "B",
      discipline: "B",
      entry_family: "official_50_ce",
    },
    display_badges: [],
    warnings: [],
    governance_notes: [],
    ...overrides,
  };
}

function buildViewWithTradeCards(cards: DashboardTradeCardView[]): DashboardReadonlyView {
  const e342 = JSON.parse(V2_12_TESTEA_E342_SUMMARY_JSON) as Record<string, unknown>;
  const summary = JSON.stringify({
    ...e342,
    ...buildSetupReadinessSummaryPlaceholders(),
    read_only: true,
    execution_enabled: false,
    trade_count: 1697,
    ea_build: "MZP_TestEA_E5_18",
    canonical_symbol: "XAUUSD",
    execution_timeframe: "M15",
    bundle: "SET001_FVG2_RR2_00_BIASBODY0_RALIGN1",
  });

  const hdr =
    "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held,setup_readiness_checklist_enabled,checklist_bias_aligned,checklist_structure_ok,checklist_liquidity_event_ok,checklist_ifvg_quality_ok,checklist_ifvg_grade,checklist_mss_choch_ok,checklist_mss_choch_timing_ok,checklist_premium_discount_ok,checklist_pd_zone_valid,checklist_entry_feasible,checklist_entry_candidate_family,checklist_entry_fragility_warning,checklist_target_ok,checklist_target_grade,checklist_target_type,checklist_execution_environment_ok,checklist_execution_environment_grade,checklist_discipline_ok,checklist_discipline_grade,checklist_overtrading_warning,setup_readiness_score,setup_readiness_grade,setup_readiness_decision,setup_readiness_blocker_count,setup_readiness_warning_count,setup_readiness_primary_blocker,setup_readiness_reasons";

  const rowFromCard = (c: SetupReadinessReportTradeCard) =>
    [
      c.trade_id,
      "BUY",
      c.entry_time,
      "2026-01-10T14:00:00Z",
      2000,
      1990,
      2100,
      2100,
      2,
      0,
      c.outcome ?? "win",
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
      c.setup_readiness_score,
      c.setup_readiness_grade,
      c.setup_readiness_decision,
      c.setup_readiness_blocker_count,
      c.setup_readiness_warning_count,
      c.setup_readiness_primary_blocker,
      (c.top_reasons ?? []).join("|"),
    ].join(",");

  const reportCards: SetupReadinessReportTradeCard[] = cards.map((c) => ({
    categories: [],
    category: c.decision,
    trade_id: c.trade_id,
    entry_time: c.entry_time ?? "2025-01-02T12:00:00Z",
    direction: c.direction,
    outcome: c.outcome,
    setup_readiness_score: c.score,
    setup_readiness_grade: c.grade,
    setup_readiness_decision: c.decision,
    setup_readiness_primary_blocker: c.primary_blocker,
    setup_readiness_blocker_count: c.blocker_count,
    setup_readiness_warning_count: c.warning_count,
    top_reasons: c.top_reasons,
    checklist_ifvg_grade: "B",
    checklist_target_grade: "B",
    checklist_execution_environment_grade: "B",
    checklist_discipline_grade: "B",
    checklist_entry_candidate_family: "official_50_ce",
    decision_display_label: c.decision_label,
    primary_context_kind: "primary_blocker",
    primary_context_label: "Bloqueador",
    primary_context_note: null,
  }));

  const csv = `${hdr}\n${reportCards.map(rowFromCard).join("\n")}\n`;
  const report = buildTestEaSetupReadinessReportFromTexts(
    { bundleName: "SET001_FVG2_RR2_00_BIASBODY0_RALIGN1", summaryJsonText: summary, tradesCsvText: csv },
    { language: "es", maxExamples: Math.max(cards.length, 5) },
  );
  const view = buildDashboardReadonlyView({ reportJsonText: setupReadinessReportToJson(report) });
  view.trade_cards = cards;
  view.casebook_alignment = {
    active_case_refs: ["HA-004", "HA-005"],
    missing_measurement_case_refs: ["HA-007", "HA-008"],
    policy_only_case_refs: ["HA-001", "HA-002", "HA-010"],
    notes: [],
  };
  return view;
}

describe("alert-only-review E5.21.1", () => {
  it("generates report_ready alert", () => {
    const view = buildViewWithTradeCards([]);
    const { alerts } = generateAlertsFromDashboardView(view);
    const reportReady = alerts.filter((a) => a.alert_type === "report_ready");
    expect(reportReady).toHaveLength(1);
    expect(reportReady[0]!.severity).toBe("info");
  });

  it("candidate with warnings creates candidate_with_warnings", () => {
    const card = tradeCard({
      trade_id: "VTR_C_WARN",
      decision: "candidate",
      warning_count: 2,
      top_reasons: ["a", "b"],
    });
    expect(classifyTradeCardAlertType(card)).toBe("candidate_with_warnings");
    const { alerts } = generateAlertsFromDashboardView(buildViewWithTradeCards([card]));
    const tradeAlerts = alerts.filter((a) => a.trade_id === "VTR_C_WARN");
    expect(tradeAlerts).toHaveLength(1);
    expect(tradeAlerts[0]!.alert_type).toBe("candidate_with_warnings");
    expect(tradeAlerts[0]!.title).toContain("advertencias");
  });

  it("candidate without warnings creates candidate_review", () => {
    const card = tradeCard({ trade_id: "VTR_C_OK", decision: "candidate", warning_count: 0 });
    const { alerts } = generateAlertsFromDashboardView(buildViewWithTradeCards([card]));
    const tradeAlerts = alerts.filter((a) => a.trade_id === "VTR_C_OK");
    expect(tradeAlerts).toHaveLength(1);
    expect(tradeAlerts[0]!.alert_type).toBe("candidate_review");
  });

  it("wait creates wait_context", () => {
    const card = tradeCard({ trade_id: "VTR_WAIT", decision: "wait", warning_count: 0 });
    const { alerts } = generateAlertsFromDashboardView(buildViewWithTradeCards([card]));
    expect(alerts.filter((a) => a.trade_id === "VTR_WAIT")[0]!.alert_type).toBe("wait_context");
  });

  it("reject below 70 creates reject_explanation", () => {
    const card = tradeCard({
      trade_id: "VTR_REJ_LOW",
      decision: "reject",
      score: 65,
      primary_blocker: "pd_conflict",
      main_reason: null,
      warning_count: 1,
    });
    const { alerts } = generateAlertsFromDashboardView(buildViewWithTradeCards([card]));
    expect(alerts.filter((a) => a.trade_id === "VTR_REJ_LOW")[0]!.alert_type).toBe("reject_explanation");
  });

  it("reject >= 70 creates high_score_reject_review", () => {
    const card = tradeCard({
      trade_id: "VTR_REJ_HI",
      decision: "reject",
      score: 80,
      primary_blocker: "pd_conflict",
      main_reason: null,
    });
    const { alerts } = generateAlertsFromDashboardView(buildViewWithTradeCards([card]));
    expect(alerts.filter((a) => a.trade_id === "VTR_REJ_HI")[0]!.alert_type).toBe("high_score_reject_review");
    expect(alerts.filter((a) => a.trade_id === "VTR_REJ_HI")[0]!.message).toContain("bloqueo crítico");
  });

  it("missing_measurement HA-007/HA-008 creates missing_measurement_notice", () => {
    const view = buildViewWithTradeCards([]);
    const { alerts } = generateAlertsFromDashboardView(view);
    expect(alerts.some((a) => a.alert_type === "missing_measurement_notice")).toBe(true);
    const notice = alerts.find((a) => a.alert_type === "missing_measurement_notice")!;
    expect(notice.casebook_refs).toEqual(expect.arrayContaining(["HA-007", "HA-008"]));
  });

  it("every alert includes governance_footer", () => {
    const cards = [
      tradeCard({ trade_id: "A", decision: "candidate", warning_count: 1 }),
      tradeCard({ trade_id: "B", decision: "wait" }),
      tradeCard({ trade_id: "C", decision: "reject", score: 90, primary_blocker: "x" }),
    ];
    const { alerts } = generateAlertsFromDashboardView(buildViewWithTradeCards(cards));
    const expected = buildGovernanceFooter("es");
    for (const a of alerts) {
      expect(a.governance_footer).toEqual(expected);
      expect(a.governance_footer.length).toBeGreaterThanOrEqual(8);
    }
  });

  it("forbidden wording is not present in generated alerts", () => {
    const cards = [
      tradeCard({ trade_id: "A", decision: "candidate", warning_count: 2 }),
      tradeCard({ trade_id: "B", decision: "reject", score: 72, primary_blocker: "ifvg_conflict" }),
    ];
    const { alerts } = generateAlertsFromDashboardView(buildViewWithTradeCards(cards));
    for (const a of alerts) {
      expect(alertRecordContainsForbiddenWording(a)).toBeNull();
    }
    for (const phrase of FORBIDDEN_ALERT_WORDING) {
      expect(alertsToJsonl(alerts).toLowerCase()).not.toContain(phrase.toLowerCase());
    }
  });

  it("delivery_status = queued_local_only", () => {
    const { alerts } = generateAlertsFromDashboardView(buildViewWithTradeCards([tradeCard({ trade_id: "X" })]));
    for (const a of alerts) {
      expect(a.delivery_status).toBe(ALERT_DELIVERY_STATUS);
      expect(a.schema_version).toBe(ALERT_REVIEW_SCHEMA_VERSION);
      expect(a.mode).toBe("read_only_review");
    }
  });

  it("does not generate more than one alert per trade card", () => {
    const cards = [
      tradeCard({ trade_id: "ONE", decision: "candidate", warning_count: 3 }),
      tradeCard({ trade_id: "TWO", decision: "wait" }),
      tradeCard({ trade_id: "THREE", decision: "reject", score: 60, primary_blocker: "liquidity_missing" }),
    ];
    const { alerts } = generateAlertsFromDashboardView(buildViewWithTradeCards(cards));
    for (const id of ["ONE", "TWO", "THREE"]) {
      expect(alerts.filter((a) => a.trade_id === id)).toHaveLength(1);
    }
  });
});
