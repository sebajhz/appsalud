/**
 * E5.20.4 — CLI tests for mapazapp:dashboard-readonly-mock
 */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  buildDashboardReadonlyView,
  V2_12_TESTEA_E342_SUMMARY_JSON,
  buildSetupReadinessSummaryPlaceholders,
  buildTestEaSetupReadinessReportFromTexts,
  setupReadinessReportToJson,
} from "@workspace/mapazapp-core";
import {
  runDashboardReadonlyMockCli,
  type DashboardReadonlyMockCliIo,
} from "./mapazapp-dashboard-readonly-mock";

function buildMinimalViewJson(): string {
  const e342 = JSON.parse(V2_12_TESTEA_E342_SUMMARY_JSON) as Record<string, unknown>;
  const summary = JSON.stringify({
    ...e342,
    ...buildSetupReadinessSummaryPlaceholders(),
    read_only: true,
    execution_enabled: false,
    has_real_trading_orders: false,
    trade_count: 1,
    ea_build: "MZP_TestEA_E5_18",
    bundle: "CLI_MOCK_BUNDLE",
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
    "none",
    "checklist_bias_ok|checklist_overtrading_warning",
  ].join(",");
  const report = buildTestEaSetupReadinessReportFromTexts(
    { bundleName: "CLI_MOCK_BUNDLE", summaryJsonText: summary, tradesCsvText: `${hdr}\n${row}\n` },
    { language: "es", maxExamples: 5 },
  );
  const view = buildDashboardReadonlyView({ reportJsonText: setupReadinessReportToJson(report) });
  return JSON.stringify(view);
}

function makeIo(root: string): { io: DashboardReadonlyMockCliIo; stdout: string[]; stderr: string[] } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const io: DashboardReadonlyMockCliIo = {
    stdoutWrite: (s) => stdout.push(s),
    stderrWrite: (s) => stderr.push(s),
    existsSync,
    readFileUtf8: (p) => readFileSync(p, "utf8"),
    writeFileUtf8: (p, d) => writeFileSync(p, d, "utf8"),
    mkdirSync: (p) => mkdirSync(p, { recursive: true }),
  };
  return { io, stdout, stderr };
}

test("CLI generates HTML with governance banner and UTF-8", () => {
  const root = mkdtempSync(join(tmpdir(), "mapazapp-mock-cli-"));
  try {
    const viewPath = join(root, "dashboard_readonly_view.json");
    const outPath = join(root, "dashboard_readonly_mock.html");
    writeFileSync(viewPath, buildMinimalViewJson(), "utf8");
    const { io } = makeIo(root);
    const code = runDashboardReadonlyMockCli(
      ["--view-json", viewPath, "--output", outPath, "--json"],
      io,
    );
    assert.equal(code, 0);
    assert.ok(existsSync(outPath));
    const html = readFileSync(outPath, "utf8");
    assert.ok(html.includes('<meta charset="utf-8"/>'));
    assert.ok(html.includes("Soporte de decisión read-only"));
    assert.ok(html.includes("El puntaje no es permiso para operar"));
    assert.ok(!html.toLowerCase().includes('type="submit"'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI --metadata writes companion JSON", () => {
  const root = mkdtempSync(join(tmpdir(), "mapazapp-mock-meta-"));
  try {
    const viewPath = join(root, "view.json");
    const outPath = join(root, "mock.html");
    const metaPath = join(root, "mock.meta.json");
    writeFileSync(viewPath, buildMinimalViewJson(), "utf8");
    const { io } = makeIo(root);
    const code = runDashboardReadonlyMockCli(
      ["--view-json", viewPath, "--output", outPath, "--metadata", metaPath],
      io,
    );
    assert.equal(code, 0);
    const meta = JSON.parse(readFileSync(metaPath, "utf8")) as { output_html: string; has_governance_banner: boolean };
    assert.equal(meta.output_html, outPath);
    assert.equal(meta.has_governance_banner, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI invalid view-json fails cleanly", () => {
  const root = mkdtempSync(join(tmpdir(), "mapazapp-mock-bad-"));
  try {
    const viewPath = join(root, "bad.json");
    const outPath = join(root, "out.html");
    writeFileSync(viewPath, "{not-valid", "utf8");
    const { io, stdout } = makeIo(root);
    const code = runDashboardReadonlyMockCli(
      ["--view-json", viewPath, "--output", outPath, "--json"],
      io,
    );
    assert.equal(code, 1);
    const summary = JSON.parse(stdout.join("").trim()) as { ok: boolean };
    assert.equal(summary.ok, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI missing --view-json exits 2", () => {
  const { io } = makeIo(tmpdir());
  const code = runDashboardReadonlyMockCli(["--output", join(tmpdir(), "x.html")], io);
  assert.equal(code, 2);
});
