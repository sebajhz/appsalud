import { describe, expect, it } from "vitest";
import {
  buildDashboardReadonlyView,
  type SetupReadinessReportTradeCard,
} from "../src/dashboard-readonly-adapter";
import {
  parseDashboardReadonlyViewJson,
  renderDashboardReadonlyMockHtml,
} from "../src/dashboard-readonly-mock";
import { V2_12_TESTEA_E342_SUMMARY_JSON } from "../src/export-sample-validation-fixtures";
import { buildSetupReadinessSummaryPlaceholders } from "../src/setup-readiness-export-keys";
import {
  buildTestEaSetupReadinessReportFromTexts,
  setupReadinessReportToJson,
} from "../src/testea-setup-readiness-report";

function vtrLikeCard(tradeId: string, overrides: Partial<SetupReadinessReportTradeCard> = {}): SetupReadinessReportTradeCard {
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
    ...overrides,
  };
}

function buildFixtureViewJson(): string {
  const e342 = JSON.parse(V2_12_TESTEA_E342_SUMMARY_JSON) as Record<string, unknown>;
  const summary = JSON.stringify({
    ...e342,
    ...buildSetupReadinessSummaryPlaceholders(),
    read_only: true,
    execution_enabled: false,
    has_real_trading_orders: false,
    trade_count: 1697,
    ea_build: "MZP_TestEA_E5_18",
    canonical_symbol: "XAUUSD",
    execution_timeframe: "M15",
    bundle: "SET_MOCK_BUNDLE",
  });

  const hdr =
    "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held,setup_readiness_checklist_enabled,checklist_bias_aligned,checklist_structure_ok,checklist_liquidity_event_ok,checklist_ifvg_quality_ok,checklist_ifvg_grade,checklist_mss_choch_ok,checklist_mss_choch_timing_ok,checklist_premium_discount_ok,checklist_pd_zone_valid,checklist_entry_feasible,checklist_entry_candidate_family,checklist_entry_fragility_warning,checklist_target_ok,checklist_target_grade,checklist_target_type,checklist_execution_environment_ok,checklist_execution_environment_grade,checklist_discipline_ok,checklist_discipline_grade,checklist_overtrading_warning,setup_readiness_score,setup_readiness_grade,setup_readiness_decision,setup_readiness_blocker_count,setup_readiness_warning_count,setup_readiness_primary_blocker,setup_readiness_reasons";

  const row = (
    id: string,
    decision: string,
    score: number,
    primary: string,
    warnings: number,
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
      "checklist_bias_ok|checklist_overtrading_warning",
    ].join(",");

  const trades = [
    row("t_reject_high", "reject", 85, "pd_conflict", 0),
    row("t_candidate_warn", "candidate", 72, "entry_fragile", 2, 0),
    row("t_ifvg", "reject", 60, "ifvg_conflict", 0),
    row("t_target", "reject", 55, "target_missing", 0),
  ].join("\n");

  const report = buildTestEaSetupReadinessReportFromTexts(
    { bundleName: "SET_MOCK_BUNDLE", summaryJsonText: summary, tradesCsvText: `${hdr}\n${trades}\n` },
    { language: "es", maxExamples: 10 },
  );
  const patched = {
    ...report,
    header: { ...report.header, trade_count: 1697 },
    executive_summary: {
      ...report.executive_summary,
      decision_counts: { reject: 1300, candidate: 247, wait: 150 },
    },
    example_cards: [
      vtrLikeCard("VTR_000003"),
      vtrLikeCard("VTR_000009"),
      { ...vtrLikeCard("VTR_000001"), setup_readiness_decision: "reject", setup_readiness_score: 90, setup_readiness_grade: "A", setup_readiness_primary_blocker: "pd_conflict", setup_readiness_blocker_count: 1, setup_readiness_warning_count: 0 },
    ],
  };
  const view = buildDashboardReadonlyView({ reportJsonText: JSON.stringify(patched) });
  return JSON.stringify(view);
}

describe("dashboard-readonly-mock", () => {
  it("generates HTML with UTF-8 charset from fixture view", () => {
    const html = renderDashboardReadonlyMockHtml(
      parseDashboardReadonlyViewJson(buildFixtureViewJson())!,
      { language: "es" },
    );
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('<meta charset="utf-8"/>');
    expect(html).toContain("Soporte de decisión read-only");
    expect(html).toContain("El puntaje no es permiso para operar");
  });

  it("includes campaign decision counts from decision_summary", () => {
    const html = renderDashboardReadonlyMockHtml(
      parseDashboardReadonlyViewJson(buildFixtureViewJson())!,
      { language: "es" },
    );
    expect(html).toContain("Distribución de decisiones (campaña)");
    expect(html).toContain('<div class="stat-value">247</div>');
    expect(html).toContain('<div class="stat-value">150</div>');
    expect(html).toContain('<div class="stat-value">1300</div>');
    expect(html).toContain("Solo tarjetas ejemplo");
  });

  it("includes trade cards and main_reason when primary_blocker is none", () => {
    const html = renderDashboardReadonlyMockHtml(
      parseDashboardReadonlyViewJson(buildFixtureViewJson())!,
      { language: "es" },
    );
    expect(html).toContain("VTR_000003");
    expect(html).toContain("Motivo principal");
    expect(html).toContain("checklist_bias_ok");
  });

  it("includes high_score_reject and candidate_with_warnings badges when present", () => {
    const html = renderDashboardReadonlyMockHtml(
      parseDashboardReadonlyViewJson(buildFixtureViewJson())!,
      { language: "es" },
    );
    expect(html).toContain("Puntaje alto, pero rechazado por bloqueo crítico");
    expect(html).toContain("Candidato — revisar advertencias");
    expect(html).toContain("Confirmación discrecional requerida");
  });

  it("includes casebook section with policy disclaimer", () => {
    const html = renderDashboardReadonlyMockHtml(
      parseDashboardReadonlyViewJson(buildFixtureViewJson())!,
      { language: "es" },
    );
    expect(html).toContain("Alineación casebook humanizado");
    expect(html).toContain("Referencia de política / casebook, no señal de entrada");
  });

  it("renders Spanish decision labels with correct UTF-8 em dash", () => {
    const html = renderDashboardReadonlyMockHtml(
      parseDashboardReadonlyViewJson(buildFixtureViewJson())!,
      { language: "es" },
    );
    expect(html).toContain("Rechazado — bloqueo crítico");
    expect(html).toContain("Esperar — contexto incompleto o precaución");
  });

  it("does not include execution buttons or trading actions", () => {
    const html = renderDashboardReadonlyMockHtml(
      parseDashboardReadonlyViewJson(buildFixtureViewJson())!,
    );
    expect(html.toLowerCase()).not.toContain("type=\"submit\"");
    expect(html).not.toContain("OrderSend");
    expect(html).not.toContain("Ejecutar");
    expect(html).not.toContain("Execute trade");
  });

  it("fails parse on invalid view JSON", () => {
    expect(parseDashboardReadonlyViewJson("{")).toBeNull();
    expect(parseDashboardReadonlyViewJson('{"schema_version":"other"}')).toBeNull();
  });
});
