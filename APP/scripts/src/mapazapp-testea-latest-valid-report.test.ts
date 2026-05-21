/**
 * E5.20.2 — CLI tests for mapazapp:testea-latest-valid-report
 */

import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  V2_12_TESTEA_E342_EVENTS_CSV,
  V2_12_TESTEA_E342_SUMMARY_JSON,
  buildSetupReadinessSummaryPlaceholders,
  SETUP_READINESS_OPTIMIZATION_PARAMETER_KEYS,
  testEaBundleIndexToJson,
  buildTestEaBundleIndex,
  REPORT_JSON_NAME,
  REPORT_MD_NAME,
  REPORT_HTML_NAME,
  RESULT_JSON_NAME,
} from "@workspace/mapazapp-core";
import {
  compactLatestValidReportSummary,
  runTestEaLatestValidReportCli,
  type TestEaLatestValidReportCliIo,
} from "./mapazapp-testea-latest-valid-report";

const TRADES_HDR =
  "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held,setup_readiness_checklist_enabled,checklist_bias_aligned,checklist_structure_ok,checklist_liquidity_event_ok,checklist_ifvg_quality_ok,checklist_ifvg_grade,checklist_mss_choch_ok,checklist_mss_choch_timing_ok,checklist_premium_discount_ok,checklist_pd_zone_valid,checklist_entry_feasible,checklist_entry_candidate_family,checklist_entry_fragility_warning,checklist_target_ok,checklist_target_grade,checklist_target_type,checklist_execution_environment_ok,checklist_execution_environment_grade,checklist_discipline_ok,checklist_discipline_grade,checklist_overtrading_warning,setup_readiness_score,setup_readiness_grade,setup_readiness_decision,setup_readiness_blocker_count,setup_readiness_warning_count,setup_readiness_primary_blocker,setup_readiness_reasons";

function readySummary(overrides: Record<string, unknown> = {}): string {
  const e342 = JSON.parse(V2_12_TESTEA_E342_SUMMARY_JSON) as Record<string, unknown>;
  return JSON.stringify({
    ...e342,
    ...buildSetupReadinessSummaryPlaceholders(),
    read_only: true,
    execution_enabled: false,
    has_real_trading_orders: false,
    has_real_virtual_trade_logic: true,
    trade_count: 1,
    virtual_trade_count: 1,
    ea_build: "MZP_TestEA_E5_18",
    symbol: "XAUUSD",
    execution_timeframe: "M15",
    campaign_id: "CAMP_CLI",
    parameter_set_id: "SET_CLI",
    tester_only: true,
    backtest_role: true,
    live_trading_enabled: false,
    optimization_parameters: Object.fromEntries(
      SETUP_READINESS_OPTIMIZATION_PARAMETER_KEYS.map((k) => [
        k,
        k.includes("enabled") ? true : k.includes("score") ? 70 : 0,
      ]),
    ),
    ...overrides,
  });
}

function readyTradeRow(): string {
  return [
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
    "fvg",
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
    0,
    "none",
    "",
  ].join(",");
}

function writeReadyBundle(dir: string): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "backtest_summary.json"), readySummary());
  writeFileSync(join(dir, "backtest_events.csv"), V2_12_TESTEA_E342_EVENTS_CSV);
  writeFileSync(join(dir, "backtest_trades.csv"), `${TRADES_HDR}\n${readyTradeRow()}\n`);
}

function diskCliIo(
  hooks?: Partial<Pick<TestEaLatestValidReportCliIo, "stdoutWrite" | "stderrWrite">>,
): TestEaLatestValidReportCliIo {
  return {
    pathExists: existsSync,
    isDirectory: (p) => statSync(p).isDirectory(),
    readFileUtf8: (p) => readFileSync(p, "utf8"),
    fileMtimeUtc: (p) => new Date(statSync(p).mtimeMs).toISOString(),
    listDirectory: (p) => readdirSync(p),
    readBundleTexts: (bundlePath) => {
      const summaryPath = join(bundlePath, "backtest_summary.json");
      const eventsPath = join(bundlePath, "backtest_events.csv");
      const tradesPath = join(bundlePath, "backtest_trades.csv");
      if (!existsSync(summaryPath) || !existsSync(eventsPath) || !existsSync(tradesPath)) {
        return null;
      }
      return {
        summaryJson: readFileSync(summaryPath, "utf8"),
        eventsCsv: readFileSync(eventsPath, "utf8"),
        tradesCsv: readFileSync(tradesPath, "utf8"),
      };
    },
    ensureDir: (d) => {
      if (!existsSync(d)) mkdirSync(d, { recursive: true });
    },
    writeFileUtf8: (p, d) => writeFileSync(p, d, "utf8"),
    stdoutWrite: hooks?.stdoutWrite ?? (() => {}),
    stderrWrite: hooks?.stderrWrite ?? (() => {}),
  };
}

test("CLI help exits 0", () => {
  let out = "";
  const code = runTestEaLatestValidReportCli(["--help"], {
    ...diskCliIo(),
    stdoutWrite: (s) => {
      out += s;
    },
  });
  assert.equal(code, 0);
  assert.match(out, /mapazapp-testea-latest-valid-report/);
});

test("CLI missing --output-dir exits 2", () => {
  let err = "";
  const code = runTestEaLatestValidReportCli(["--root", "/tmp"], {
    ...diskCliIo(),
    stderrWrite: (s) => {
      err += s;
    },
  });
  assert.equal(code, 2);
  assert.match(err, /output-dir/);
});

test("invalid root fails cleanly", () => {
  const code = runTestEaLatestValidReportCli(
    ["--root", "/nonexistent-latest-valid-root-xyz", "--output-dir", "/tmp/out"],
    diskCliIo(),
  );
  assert.equal(code, 1);
});

test("--root + --output-dir generates report files from fixture", () => {
  const root = mkdtempSync(join(tmpdir(), "lv-cli-root-"));
  const outDir = join(root, "report-out");
  const leaf = join(root, "XAUUSD_M15_Profile_V1", "CAMP", "run_cli");
  writeReadyBundle(leaf);
  try {
    const code = runTestEaLatestValidReportCli(
      ["--root", root, "--output-dir", outDir, "--symbol", "XAUUSD", "--timeframe", "M15"],
      diskCliIo(),
    );
    assert.equal(code, 0);
    assert.ok(existsSync(join(outDir, REPORT_MD_NAME)));
    assert.ok(existsSync(join(outDir, REPORT_JSON_NAME)));
    assert.ok(existsSync(join(outDir, REPORT_HTML_NAME)));
    assert.ok(existsSync(join(outDir, RESULT_JSON_NAME)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--index + --output-dir works", () => {
  const root = mkdtempSync(join(tmpdir(), "lv-cli-index-"));
  const outDir = join(root, "out");
  const leaf = join(root, "run_idx");
  writeReadyBundle(leaf);
  const indexPath = join(root, "bundles.index.json");
  const index = buildTestEaBundleIndex({ root: leaf }, diskCliIo());
  writeFileSync(indexPath, testEaBundleIndexToJson(index));
  try {
    const code = runTestEaLatestValidReportCli(
      ["--index", indexPath, "--no-refresh-index", "--output-dir", outDir],
      diskCliIo(),
    );
    assert.equal(code, 0);
    assert.ok(existsSync(join(outDir, REPORT_JSON_NAME)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--bundle-id works", () => {
  const root = mkdtempSync(join(tmpdir(), "lv-cli-bid-"));
  const outDir = join(root, "out");
  const leaf = join(root, "run_bid");
  writeReadyBundle(leaf);
  const index = buildTestEaBundleIndex({ root: leaf }, diskCliIo());
  const bundleId = index.bundles[0]!.bundle_id;
  try {
    const code = runTestEaLatestValidReportCli(
      ["--root", leaf, "--output-dir", outDir, "--bundle-id", bundleId],
      diskCliIo(),
    );
    assert.equal(code, 0);
    const result = JSON.parse(readFileSync(join(outDir, RESULT_JSON_NAME), "utf8")) as {
      selected_bundle_id: string;
    };
    assert.equal(result.selected_bundle_id, bundleId);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("multiple matches fail clearly", () => {
  const root = mkdtempSync(join(tmpdir(), "lv-cli-multi-"));
  const outDir = join(root, "out");
  const leaf1 = join(root, "p1", "c1", "run1");
  const leaf2 = join(root, "p2", "c2", "run2");
  mkdirSync(leaf1, { recursive: true });
  mkdirSync(leaf2, { recursive: true });
  writeFileSync(join(leaf1, "backtest_summary.json"), readySummary({ campaign_id: "C1" }));
  writeFileSync(join(leaf1, "backtest_events.csv"), V2_12_TESTEA_E342_EVENTS_CSV);
  writeFileSync(join(leaf1, "backtest_trades.csv"), `${TRADES_HDR}\n${readyTradeRow()}\n`);
  writeFileSync(join(leaf2, "backtest_summary.json"), readySummary({ campaign_id: "C2", symbol: "EURUSD", execution_timeframe: "H1" }));
  writeFileSync(join(leaf2, "backtest_events.csv"), V2_12_TESTEA_E342_EVENTS_CSV);
  writeFileSync(join(leaf2, "backtest_trades.csv"), `${TRADES_HDR}\n${readyTradeRow()}\n`);
  let err = "";
  try {
    const code = runTestEaLatestValidReportCli(
      ["--root", root, "--output-dir", outDir],
      {
        ...diskCliIo(),
        stderrWrite: (s) => {
          err += s;
        },
      },
    );
    assert.equal(code, 1);
    assert.match(err, /multiple latest_valid_by_key/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--json prints compact result", () => {
  const root = mkdtempSync(join(tmpdir(), "lv-cli-json-"));
  const outDir = join(root, "out");
  const leaf = join(root, "run_json");
  writeReadyBundle(leaf);
  let out = "";
  try {
    const code = runTestEaLatestValidReportCli(
      [
        "--root",
        leaf,
        "--output-dir",
        outDir,
        "--json",
        "--symbol",
        "XAUUSD",
        "--timeframe",
        "M15",
      ],
      {
        ...diskCliIo(),
        stdoutWrite: (s) => {
          out += s;
        },
      },
    );
    assert.equal(code, 0);
    const parsed = JSON.parse(out.trim()) as ReturnType<typeof compactLatestValidReportSummary>;
    assert.equal(parsed.ok, true);
    assert.ok(parsed.report_json_path);
    assert.ok(parsed.report_markdown_path);
    assert.ok(parsed.report_html_path);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
