/**
 * E5.20.3 — CLI tests for mapazapp:dashboard-readonly-adapter
 */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  V2_12_TESTEA_E342_SUMMARY_JSON,
  buildSetupReadinessSummaryPlaceholders,
  buildTestEaSetupReadinessReportFromTexts,
  setupReadinessReportToJson,
} from "@workspace/mapazapp-core";
import {
  runDashboardReadonlyAdapterCli,
  type DashboardReadonlyAdapterCliIo,
} from "./mapazapp-dashboard-readonly-adapter";

function buildCampaignCountReportJson(): string {
  const base = JSON.parse(buildMinimalReportJson()) as {
    header: { trade_count: number };
    executive_summary: { decision_counts: Record<string, number> };
    example_cards: unknown[];
  };
  base.header.trade_count = 1697;
  base.executive_summary.decision_counts = { reject: 1300, candidate: 247, wait: 150 };
  return JSON.stringify(base);
}

function buildMinimalReportJson(): string {
  const e342 = JSON.parse(V2_12_TESTEA_E342_SUMMARY_JSON) as Record<string, unknown>;
  const summary = JSON.stringify({
    ...e342,
    ...buildSetupReadinessSummaryPlaceholders(),
    read_only: true,
    execution_enabled: false,
    has_real_trading_orders: false,
    trade_count: 1,
    ea_build: "MZP_TestEA_E5_18",
    bundle: "CLI_BUNDLE",
  });
  const hdr =
    "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held,setup_readiness_checklist_enabled,checklist_bias_aligned,checklist_structure_ok,checklist_liquidity_event_ok,checklist_ifvg_quality_ok,checklist_ifvg_grade,checklist_mss_choch_ok,checklist_mss_choch_timing_ok,checklist_premium_discount_ok,checklist_pd_zone_valid,checklist_entry_feasible,checklist_entry_candidate_family,checklist_entry_fragility_warning,checklist_target_ok,checklist_target_grade,checklist_target_type,checklist_execution_environment_ok,checklist_execution_environment_grade,checklist_discipline_ok,checklist_discipline_grade,checklist_overtrading_warning,setup_readiness_score,setup_readiness_grade,setup_readiness_decision,setup_readiness_blocker_count,setup_readiness_warning_count,setup_readiness_primary_blocker,setup_readiness_reasons";
  const row = [
    "t1",
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
    72,
    "B",
    "candidate",
    0,
    1,
    "entry_fragile",
    "checklist_bias_ok|checklist_overtrading_warning",
  ].join(",");
  const report = buildTestEaSetupReadinessReportFromTexts(
    { bundleName: "CLI_BUNDLE", summaryJsonText: summary, tradesCsvText: `${hdr}\n${row}\n` },
    { language: "es", maxExamples: 5 },
  );
  return setupReadinessReportToJson(report);
}

function makeIo(
  root: string,
  files: Record<string, string>,
): { io: DashboardReadonlyAdapterCliIo; stdout: string[]; stderr: string[] } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  for (const [rel, content] of Object.entries(files)) {
    const p = join(root, rel);
    mkdirSync(join(p, ".."), { recursive: true });
    writeFileSync(p, content, "utf8");
  }
  const io: DashboardReadonlyAdapterCliIo = {
    stdoutWrite: (s) => stdout.push(s),
    stderrWrite: (s) => stderr.push(s),
    existsSync,
    readFileUtf8: (p) => readFileSync(p, "utf8"),
    writeFileUtf8: (p, d) => writeFileSync(p, d, "utf8"),
    mkdirSync: (p) => mkdirSync(p, { recursive: true }),
  };
  return { io, stdout, stderr };
}

test("CLI --output persists decision_summary campaign counts (not example cards)", () => {
  const root = mkdtempSync(join(tmpdir(), "mapazapp-dash-cli-campaign-"));
  try {
    const reportPath = join(root, "setup_readiness_report.json");
    const outPath = join(root, "dashboard_readonly_view.json");
    writeFileSync(reportPath, buildCampaignCountReportJson(), "utf8");
    const { io } = makeIo(root, {});
    const code = runDashboardReadonlyAdapterCli(
      ["--report-json", reportPath, "--output", outPath, "--json"],
      io,
    );
    assert.equal(code, 0);
    const view = JSON.parse(readFileSync(outPath, "utf8")) as {
      decision_summary: { decision: string; count: number }[];
      trade_card_decision_summary: { decision: string; count: number }[];
      trade_cards: unknown[];
    };
    const find = (rows: { decision: string; count: number }[], d: string) =>
      rows.find((r) => r.decision === d)?.count;
    assert.equal(find(view.decision_summary, "candidate"), 247);
    assert.equal(find(view.decision_summary, "wait"), 150);
    assert.equal(find(view.decision_summary, "reject"), 1300);
    assert.equal(find(view.decision_summary, "unknown"), 0);
    const exampleTotal = view.trade_card_decision_summary.reduce((n, r) => n + r.count, 0);
    assert.equal(exampleTotal, view.trade_cards.length);
    assert.ok(exampleTotal < 1697);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI --json compact counts match persisted decision_summary", () => {
  const root = mkdtempSync(join(tmpdir(), "mapazapp-dash-cli-compact-"));
  try {
    const reportPath = join(root, "setup_readiness_report.json");
    const outPath = join(root, "dashboard_readonly_view.json");
    writeFileSync(reportPath, buildCampaignCountReportJson(), "utf8");
    const { io, stdout } = makeIo(root, {});
    const code = runDashboardReadonlyAdapterCli(
      ["--report-json", reportPath, "--output", outPath, "--json"],
      io,
    );
    assert.equal(code, 0);
    const compact = JSON.parse(stdout.join("").trim()) as {
      candidate_count: number;
      wait_count: number;
      reject_count: number;
    };
    const view = JSON.parse(readFileSync(outPath, "utf8")) as {
      decision_summary: { decision: string; count: number }[];
    };
    const find = (d: string) => view.decision_summary.find((r) => r.decision === d)?.count;
    assert.equal(compact.candidate_count, find("candidate"));
    assert.equal(compact.wait_count, find("wait"));
    assert.equal(compact.reject_count, find("reject"));
    assert.equal(compact.candidate_count, 247);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI --report-json + --output writes dashboard_readonly_view.json", () => {
  const root = mkdtempSync(join(tmpdir(), "mapazapp-dash-cli-"));
  try {
    const reportPath = join(root, "setup_readiness_report.json");
    const outPath = join(root, "dashboard_readonly_view.json");
    writeFileSync(reportPath, buildMinimalReportJson(), "utf8");
    const { io } = makeIo(root, {});
    const code = runDashboardReadonlyAdapterCli(
      ["--report-json", reportPath, "--output", outPath],
      io,
    );
    assert.equal(code, 0);
    assert.ok(existsSync(outPath));
    const written = JSON.parse(readFileSync(outPath, "utf8")) as { schema_version: string; ok: boolean };
    assert.equal(written.schema_version, "mapazapp_dashboard_readonly_view_v1");
    assert.equal(written.ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI --json prints compact result", () => {
  const root = mkdtempSync(join(tmpdir(), "mapazapp-dash-cli-json-"));
  try {
    const reportPath = join(root, "setup_readiness_report.json");
    writeFileSync(reportPath, buildMinimalReportJson(), "utf8");
    const { io, stdout } = makeIo(root, {});
    const code = runDashboardReadonlyAdapterCli(["--report-json", reportPath, "--json"], io);
    assert.equal(code, 0);
    const line = stdout.join("").trim();
    const parsed = JSON.parse(line) as { schema_version: string; trade_cards_count: number };
    assert.equal(parsed.schema_version, "mapazapp_dashboard_readonly_view_v1");
    assert.ok(parsed.trade_cards_count >= 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI invalid report-json fails cleanly", () => {
  const root = mkdtempSync(join(tmpdir(), "mapazapp-dash-cli-bad-"));
  try {
    const reportPath = join(root, "bad.json");
    writeFileSync(reportPath, "{not valid report", "utf8");
    const { io, stdout } = makeIo(root, {});
    const code = runDashboardReadonlyAdapterCli(["--report-json", reportPath, "--json"], io);
    assert.equal(code, 1);
    const summary = JSON.parse(stdout.join("").trim()) as { ok: boolean; errors: string[] };
    assert.equal(summary.ok, false);
    assert.ok(summary.errors.some((e) => e.includes("could not be parsed")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI missing minimum display fields fail validation", () => {
  const root = mkdtempSync(join(tmpdir(), "mapazapp-dash-cli-min-"));
  try {
    const reportPath = join(root, "thin.json");
    const thin = {
      ok: true,
      errors: [],
      warnings: [],
      language: "es",
      header: {
        bundle: "B",
        bundle_name: "B",
        ea_build: "MZP_TestEA_E5_18",
        symbol: "XAUUSD",
        timeframe: "M15",
        campaign_id: "C",
        parameter_set_id: "P",
        trade_count: 1,
        read_only: true,
        execution_enabled: false,
      },
      minimum_display_unit_enforced: true,
      executive_summary: {
        average_setup_readiness_score: 50,
        decision_counts: { candidate: 1 },
        decision_pct: { candidate: 100 },
        grade_counts: { B: 1 },
        average_blocker_count: 0,
        average_warning_count: 0,
        top_blockers: [],
        top_warnings: [],
      },
      decision_distribution: { interpretation_es: [], interpretation_en: [] },
      score_grade_distribution: {
        min_score: 50,
        max_score: 50,
        average_score: 50,
        grade_counts: { B: 1 },
        high_score_reject_count: 0,
        candidate_with_warnings_count: 0,
        score_band_by_decision: { rows: [], columns: [], counts: {} },
      },
      blocker_leaderboard: {
        primary_blocker_counts: [],
        high_score_reject_by_primary: [],
        primary_blocker_by_decision: { rows: [], columns: [], counts: {} },
        critical_blocker_stats: [],
      },
      warning_leaderboard: [],
      component_summary: [],
      example_cards: [
        {
          categories: ["candidate"],
          category: "candidate",
          trade_id: "bad",
          entry_time: null,
          direction: "BUY",
          outcome: "win",
          setup_readiness_score: 80,
          setup_readiness_grade: "A",
          setup_readiness_decision: "candidate",
          setup_readiness_primary_blocker: "none",
          setup_readiness_blocker_count: 0,
          setup_readiness_warning_count: 0,
          top_reasons: [],
          checklist_ifvg_grade: "A",
          checklist_target_grade: "A",
          checklist_execution_environment_grade: "A",
          checklist_discipline_grade: "A",
          checklist_entry_candidate_family: "official_50_ce",
          decision_display_label: "Candidato",
          primary_context_kind: "primary_blocker",
          primary_context_label: "Bloqueador principal",
          primary_context_note: null,
        },
      ],
      outcome_research: {
        disclaimer_es: "",
        disclaimer_en: "",
        outcome_by_decision: { rows: [], columns: [], counts: {} },
        outcome_by_grade: { rows: [], columns: [], counts: {} },
        score_band_by_outcome: { rows: [], columns: [], counts: {} },
      },
      governance_footer: [],
      interpretation_flags: [],
      research_only_note: "",
    };
    writeFileSync(reportPath, JSON.stringify(thin), "utf8");
    const { io, stdout } = makeIo(root, {});
    const code = runDashboardReadonlyAdapterCli(["--report-json", reportPath, "--json", "--strict"], io);
    assert.equal(code, 1);
    const summary = JSON.parse(stdout.join("").trim()) as { ok: boolean };
    assert.equal(summary.ok, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI --latest-result enriches selected bundle metadata if available", () => {
  const root = mkdtempSync(join(tmpdir(), "mapazapp-dash-cli-latest-"));
  try {
    const reportPath = join(root, "setup_readiness_report.json");
    const latestPath = join(root, "latest_valid_report_result.json");
    writeFileSync(reportPath, buildMinimalReportJson(), "utf8");
    writeFileSync(
      latestPath,
      JSON.stringify({
        ok: true,
        selected_bundle_id: "E55/SET_CLI",
        valid_status_before_report: "valid_warnings",
        timeframe: "M15",
      }),
      "utf8",
    );
    const { io } = makeIo(root, {});
    const outPath = join(root, "out.json");
    const code = runDashboardReadonlyAdapterCli(
      ["--report-json", reportPath, "--latest-result", latestPath, "--output", outPath],
      io,
    );
    assert.equal(code, 0);
    const view = JSON.parse(readFileSync(outPath, "utf8")) as {
      header: { selected_bundle_id: string | null; valid_status_before_report: string | null };
    };
    assert.equal(view.header.selected_bundle_id, "E55/SET_CLI");
    assert.equal(view.header.valid_status_before_report, "valid_warnings");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI --index optional does not fail when absent", () => {
  const root = mkdtempSync(join(tmpdir(), "mapazapp-dash-cli-noindex-"));
  try {
    const reportPath = join(root, "setup_readiness_report.json");
    writeFileSync(reportPath, buildMinimalReportJson(), "utf8");
    const { io } = makeIo(root, {});
    const code = runDashboardReadonlyAdapterCli(["--report-json", reportPath, "--json"], io);
    assert.equal(code, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
