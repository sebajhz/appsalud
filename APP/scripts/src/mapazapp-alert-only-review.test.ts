/**
 * E5.21.1 — CLI tests for mapazapp:alert-only-review
 */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  buildDashboardReadonlyView,
  FORBIDDEN_ALERT_WORDING,
  V2_12_TESTEA_E342_SUMMARY_JSON,
  buildSetupReadinessSummaryPlaceholders,
  buildTestEaSetupReadinessReportFromTexts,
  setupReadinessReportToJson,
} from "@workspace/mapazapp-core";
import { runAlertOnlyReviewCli, type AlertOnlyReviewCliIo } from "./mapazapp-alert-only-review";

function buildMinimalViewJson(): string {
  const e342 = JSON.parse(V2_12_TESTEA_E342_SUMMARY_JSON) as Record<string, unknown>;
  const summary = JSON.stringify({
    ...e342,
    ...buildSetupReadinessSummaryPlaceholders(),
    read_only: true,
    execution_enabled: false,
    trade_count: 1,
    ea_build: "MZP_TestEA_E5_18",
    bundle: "CLI_ALERT_BUNDLE",
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
    { bundleName: "CLI_ALERT_BUNDLE", summaryJsonText: summary, tradesCsvText: `${hdr}\n${row}\n` },
    { language: "es", maxExamples: 5 },
  );
  const view = buildDashboardReadonlyView({ reportJsonText: setupReadinessReportToJson(report) });
  view.casebook_alignment = {
    active_case_refs: ["HA-004"],
    missing_measurement_case_refs: ["HA-007", "HA-008"],
    policy_only_case_refs: ["HA-001"],
    notes: [],
  };
  return JSON.stringify(view);
}

function makeIo(root: string): { io: AlertOnlyReviewCliIo; stdout: string[]; stderr: string[] } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const io: AlertOnlyReviewCliIo = {
    stdoutWrite: (s) => stdout.push(s),
    stderrWrite: (s) => stderr.push(s),
    existsSync,
    readFileUtf8: (p) => readFileSync(p, "utf8"),
    writeFileUtf8: (p, d) => writeFileSync(p, d, "utf8"),
    mkdirSync: (p) => mkdirSync(p, { recursive: true }),
  };
  return { io, stdout, stderr };
}

test("alert-only-review CLI writes JSONL and summary", () => {
  const root = mkdtempSync(join(tmpdir(), "mapazapp-alert-cli-"));
  try {
    const viewPath = join(root, "dashboard_readonly_view.json");
    const jsonlPath = join(root, "alert_review_queue.jsonl");
    const summaryPath = join(root, "alert_review_summary.json");
    writeFileSync(viewPath, buildMinimalViewJson(), "utf8");

    const { io, stdout } = makeIo(root);
    const code = runAlertOnlyReviewCli(
      ["--view-json", viewPath, "--output", jsonlPath, "--summary-output", summaryPath, "--json"],
      io,
    );
    assert.equal(code, 0);
    assert.ok(existsSync(jsonlPath));
    assert.ok(existsSync(summaryPath));

    const lines = readFileSync(jsonlPath, "utf8").trim().split("\n");
    assert.ok(lines.length >= 2);
    const summary = JSON.parse(readFileSync(summaryPath, "utf8")) as {
      alerts_generated: number;
      read_only: boolean;
    };
    assert.equal(summary.read_only, true);
    assert.equal(summary.alerts_generated, lines.length);

    const compact = JSON.parse(stdout.join("")) as { ok: boolean; alerts_generated: number };
    assert.equal(compact.ok, true);
    assert.equal(compact.alerts_generated, lines.length);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("alert-only-review CLI invalid view JSON fails cleanly", () => {
  const root = mkdtempSync(join(tmpdir(), "mapazapp-alert-cli-bad-"));
  try {
    const viewPath = join(root, "bad.json");
    writeFileSync(viewPath, "{ not valid view", "utf8");
    const { io, stderr } = makeIo(root);
    const code = runAlertOnlyReviewCli(
      [
        "--view-json",
        viewPath,
        "--output",
        join(root, "q.jsonl"),
        "--summary-output",
        join(root, "s.json"),
        "--json",
      ],
      io,
    );
    assert.equal(code, 1);
    assert.ok(stderr.join("").includes("could not be parsed"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("alert-only-review output contains no forbidden wording", () => {
  const root = mkdtempSync(join(tmpdir(), "mapazapp-alert-cli-wording-"));
  try {
    const viewPath = join(root, "view.json");
    const jsonlPath = join(root, "q.jsonl");
    writeFileSync(viewPath, buildMinimalViewJson(), "utf8");
    const { io } = makeIo(root);
    const code = runAlertOnlyReviewCli(
      ["--view-json", viewPath, "--output", jsonlPath, "--summary-output", join(root, "s.json")],
      io,
    );
    assert.equal(code, 0);
    const text = readFileSync(jsonlPath, "utf8").toLowerCase();
    for (const phrase of FORBIDDEN_ALERT_WORDING) {
      assert.ok(!text.includes(phrase.toLowerCase()), `forbidden phrase: ${phrase}`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("alert-only-review CLI has no channel/network behavior", () => {
  const src = readFileSync(new URL("./mapazapp-alert-only-review.ts", import.meta.url), "utf8");
  assert.ok(!src.includes("fetch("));
  assert.ok(!src.includes("telegram"));
  assert.ok(!src.includes("nodemailer"));
  assert.ok(!src.includes("WebRequest"));
});
