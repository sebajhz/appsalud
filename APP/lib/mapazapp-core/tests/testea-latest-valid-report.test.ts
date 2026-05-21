import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  V2_12_TESTEA_E342_EVENTS_CSV,
  V2_12_TESTEA_E342_SUMMARY_JSON,
} from "../src/export-sample-validation-fixtures";
import {
  SETUP_READINESS_OPTIMIZATION_PARAMETER_KEYS,
  buildSetupReadinessSummaryPlaceholders,
} from "../src/setup-readiness-export-keys";
import {
  buildTestEaBundleIndex,
  computeLatestValidByKey,
  indexTestEaBundleLeaf,
  testEaBundleIndexToJson,
  type TestEaBundleIndexFsIo,
  type TestEaBundleIndexRecord,
  type TestEaBundleIndexV1,
} from "../src/testea-bundle-index";
import {
  REPORT_HTML_NAME,
  REPORT_JSON_NAME,
  REPORT_MD_NAME,
  RESULT_JSON_NAME,
  generateLatestValidReport,
  isLatestValidReportEligibleStatus,
  selectLatestValidBundleFromIndex,
  validateBundleBeforeLatestValidReport,
  type LatestValidReportFsIo,
} from "../src/testea-latest-valid-report";

function parseSummary(base: Record<string, unknown> = {}): string {
  const s = { ...JSON.parse(V2_12_TESTEA_E342_SUMMARY_JSON) as Record<string, unknown>, ...base };
  return JSON.stringify(s);
}

const TRADES_READY_HEADER =
  "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held,setup_readiness_checklist_enabled,checklist_bias_aligned,checklist_structure_ok,checklist_liquidity_event_ok,checklist_ifvg_quality_ok,checklist_ifvg_grade,checklist_mss_choch_ok,checklist_mss_choch_timing_ok,checklist_premium_discount_ok,checklist_pd_zone_valid,checklist_entry_feasible,checklist_entry_candidate_family,checklist_entry_fragility_warning,checklist_target_ok,checklist_target_grade,checklist_target_type,checklist_execution_environment_ok,checklist_execution_environment_grade,checklist_discipline_ok,checklist_discipline_grade,checklist_overtrading_warning,setup_readiness_score,setup_readiness_grade,setup_readiness_decision,setup_readiness_blocker_count,setup_readiness_warning_count,setup_readiness_primary_blocker,setup_readiness_reasons";

function readyTradeRow(id: string): string {
  return [
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
    1,
    "none",
    "",
  ].join(",");
}

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
    campaign_id: "CAMP_A",
    parameter_set_id: "SET_A",
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

function writeReadyBundleLeaf(
  dir: string,
  opts?: { summary?: string; bundleIdSuffix?: string },
): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "backtest_summary.json"), opts?.summary ?? readySummary());
  writeFileSync(join(dir, "backtest_events.csv"), V2_12_TESTEA_E342_EVENTS_CSV);
  writeFileSync(
    join(dir, "backtest_trades.csv"),
    `${TRADES_READY_HEADER}\n${readyTradeRow("t1")}\n`,
  );
}

function diskIo(): TestEaBundleIndexFsIo {
  return {
    pathExists: existsSync,
    isDirectory: (p) => statSync(p).isDirectory(),
    readFileUtf8: (p) => readFileSync(p, "utf8"),
    fileMtimeUtc: (p) => new Date(statSync(p).mtimeMs).toISOString(),
    listDirectory: (p) => readdirSync(p),
  };
}

function reportIo(root: string, outDir: string): LatestValidReportFsIo {
  const base = diskIo();
  const written: string[] = [];
  return {
    ...base,
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
    ensureDir: (d) => mkdirSync(d, { recursive: true }),
    writeFileUtf8: (p, d) => {
      written.push(p);
      writeFileSync(p, d, "utf8");
    },
    _written: written,
  } as LatestValidReportFsIo & { _written: string[] };
}

function buildIndexFromRoot(root: string): TestEaBundleIndexV1 {
  return buildTestEaBundleIndex({ root, nowUtc: "2026-05-20T12:00:00.000Z" }, diskIo());
}

describe("E5.20.2 testea-latest-valid-report", () => {
  it("accepts report_missing as eligible status", () => {
    expect(isLatestValidReportEligibleStatus("report_missing")).toBe(true);
    expect(isLatestValidReportEligibleStatus("valid")).toBe(true);
    expect(isLatestValidReportEligibleStatus("valid_warnings")).toBe(true);
    expect(isLatestValidReportEligibleStatus("invalid")).toBe(false);
    expect(isLatestValidReportEligibleStatus("stale")).toBe(false);
  });

  it("selects explicit bundle-id from index", () => {
    const record = indexTestEaBundleLeaf({
      bundlePath: "/tmp/explicit",
      root: "/tmp",
      summaryJson: readySummary(),
      eventsCsv: V2_12_TESTEA_E342_EVENTS_CSV,
      tradesCsv: `${TRADES_READY_HEADER}\n`,
    });
    record.bundle_id = "explicit/id";
    record.valid_status = "report_missing";
    const index: TestEaBundleIndexV1 = {
      schema_version: "mapazapp_bundle_index_v1",
      created_at_utc: "2026-05-20T00:00:00.000Z",
      root: "/tmp",
      total_bundles_scanned: 1,
      valid_count: 0,
      valid_warnings_count: 0,
      invalid_count: 0,
      stale_count: 0,
      report_missing_count: 1,
      bundles: [record],
      latest_valid_by_key: [],
    };
    const sel = selectLatestValidBundleFromIndex(index, { bundleId: "explicit/id" });
    expect(sel.ok).toBe(true);
    if (sel.ok) expect(sel.record.bundle_id).toBe("explicit/id");
  });

  it("selects latest_valid_by_key when one match exists", () => {
    const root = mkdtempSync(join(tmpdir(), "lv-report-one-"));
    const leaf = join(root, "XAUUSD_M15_Profile_V1", "CAMP_A", "run_a");
    writeReadyBundleLeaf(leaf);
    try {
      const index = buildIndexFromRoot(root);
      expect(index.latest_valid_by_key).toHaveLength(1);
      const sel = selectLatestValidBundleFromIndex(index, {
        symbol: "XAUUSD",
        timeframe: "M15",
      });
      expect(sel.ok).toBe(true);
      if (sel.ok) {
        expect(sel.record.valid_status).toBe("report_missing");
        expect(sel.selectedKey).toBe(index.latest_valid_by_key[0]?.key);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails on multiple latest keys without enough filters", () => {
    const mk = (sym: string, tf: string, id: string): TestEaBundleIndexRecord => ({
      bundle_id: id,
      bundle_name: id,
      bundle_path: `/b/${id}`,
      summary_path: "",
      trades_path: "",
      events_path: "",
      report_json_path: null,
      report_markdown_path: null,
      report_html_path: null,
      symbol: sym,
      timeframe: tf,
      profile_id: "P",
      campaign_id: "C1",
      parameter_set_id: "S1",
      strategy_id: null,
      run_id: id,
      effective_run_id: id,
      ea_build: "b",
      schema_version: "v1",
      trade_count: 1,
      created_at_utc: "2026-05-10T00:00:00Z",
      summary_mtime_utc: "2026-05-10T00:00:00Z",
      readOnly: true,
      executionEnabled: false,
      has_real_trading_orders: false,
      has_setup_readiness_checklist_v1_logic: true,
      valid_status: "report_missing",
      warnings: [],
      errors: [],
    });
    const a = mk("XAUUSD", "M15", "a");
    const b = mk("EURUSD", "H1", "b");
    const latest = computeLatestValidByKey([a, b]);
    expect(latest).toHaveLength(2);
    const index: TestEaBundleIndexV1 = {
      schema_version: "mapazapp_bundle_index_v1",
      created_at_utc: "2026-05-20T00:00:00.000Z",
      root: "/tmp",
      total_bundles_scanned: 2,
      valid_count: 0,
      valid_warnings_count: 0,
      invalid_count: 0,
      stale_count: 0,
      report_missing_count: 2,
      bundles: [a, b],
      latest_valid_by_key: latest,
    };
    const sel = selectLatestValidBundleFromIndex(index, {});
    expect(sel.ok).toBe(false);
    if (!sel.ok) {
      expect(sel.code).toBe("MULTIPLE_MATCHING_LATEST_KEYS");
      expect(sel.matching_keys?.length).toBe(2);
    }
  });

  it("fails on ambiguous_latest", () => {
    const index: TestEaBundleIndexV1 = {
      schema_version: "mapazapp_bundle_index_v1",
      created_at_utc: "2026-05-20T00:00:00.000Z",
      root: "/tmp",
      total_bundles_scanned: 0,
      valid_count: 0,
      valid_warnings_count: 0,
      invalid_count: 0,
      stale_count: 0,
      report_missing_count: 0,
      bundles: [],
      latest_valid_by_key: [
        {
          key: "|||XAUUSD|M15",
          profile_id: null,
          campaign_id: null,
          parameter_set_id: null,
          symbol: "XAUUSD",
          timeframe: "M15",
          bundle_id: null,
          ambiguous_latest: true,
          candidate_bundle_ids: ["a", "b"],
        },
      ],
    };
    const sel = selectLatestValidBundleFromIndex(index, { symbol: "XAUUSD", timeframe: "M15" });
    expect(sel.ok).toBe(false);
    if (!sel.ok) {
      expect(sel.code).toBe("AMBIGUOUS_LATEST");
      expect(sel.candidate_bundle_ids).toEqual(["a", "b"]);
    }
  });

  it("skips invalid and stale bundle-id selections", () => {
    const invalid = indexTestEaBundleLeaf({
      bundlePath: "/tmp/inv",
      root: "/tmp",
      summaryJson: "",
      eventsCsv: V2_12_TESTEA_E342_EVENTS_CSV,
      tradesCsv: `${TRADES_READY_HEADER}\n`,
    });
    invalid.bundle_id = "bad";
    invalid.valid_status = "invalid";
    const stale = { ...invalid, bundle_id: "old", valid_status: "stale" as const };
    const index: TestEaBundleIndexV1 = {
      schema_version: "mapazapp_bundle_index_v1",
      created_at_utc: "2026-05-20T00:00:00.000Z",
      root: "/tmp",
      total_bundles_scanned: 2,
      valid_count: 0,
      valid_warnings_count: 0,
      invalid_count: 1,
      stale_count: 1,
      report_missing_count: 0,
      bundles: [invalid, stale],
      latest_valid_by_key: [],
    };
    expect(selectLatestValidBundleFromIndex(index, { bundleId: "bad" }).ok).toBe(false);
    const staleSel = selectLatestValidBundleFromIndex(index, { bundleId: "old" });
    expect(staleSel.ok).toBe(false);
    if (!staleSel.ok) expect(staleSel.code).toBe("BUNDLE_ID_STALE");
  });

  it("re-validates selected bundle and rejects non-read-only", () => {
    const summary = readySummary({ read_only: false, execution_enabled: true });
    const pre = validateBundleBeforeLatestValidReport(
      indexTestEaBundleLeaf({
        bundlePath: "/tmp/x",
        root: "/tmp",
        summaryJson: summary,
        eventsCsv: V2_12_TESTEA_E342_EVENTS_CSV,
        tradesCsv: `${TRADES_READY_HEADER}\n${readyTradeRow("t1")}\n`,
      }),
      {
        summaryJson: summary,
        eventsCsv: V2_12_TESTEA_E342_EVENTS_CSV,
        tradesCsv: `${TRADES_READY_HEADER}\n${readyTradeRow("t1")}\n`,
      },
    );
    expect(pre.ok).toBe(false);
    expect(pre.errors.some((e) => e.code === "LATEST_VALID_REPORT_READ_ONLY_REQUIRED")).toBe(true);
    expect(pre.errors.some((e) => e.code === "LATEST_VALID_REPORT_EXECUTION_DISABLED_REQUIRED")).toBe(
      true,
    );
  });

  it("rejects has_real_trading_orders and missing setup readiness", () => {
    const summaryOrders = readySummary({ has_real_trading_orders: true });
    const preOrders = validateBundleBeforeLatestValidReport(
      indexTestEaBundleLeaf({
        bundlePath: "/tmp/o",
        root: "/tmp",
        summaryJson: summaryOrders,
        eventsCsv: V2_12_TESTEA_E342_EVENTS_CSV,
        tradesCsv: `${TRADES_READY_HEADER}\n${readyTradeRow("t1")}\n`,
      }),
      {
        summaryJson: summaryOrders,
        eventsCsv: V2_12_TESTEA_E342_EVENTS_CSV,
        tradesCsv: `${TRADES_READY_HEADER}\n${readyTradeRow("t1")}\n`,
      },
    );
    expect(preOrders.errors.some((e) => e.code === "LATEST_VALID_REPORT_NO_REAL_TRADING_ORDERS")).toBe(
      true,
    );

    const summaryNoReady = parseSummary({ has_setup_readiness_checklist_v1_logic: false });
    const preNo = validateBundleBeforeLatestValidReport(
      indexTestEaBundleLeaf({
        bundlePath: "/tmp/n",
        root: "/tmp",
        summaryJson: summaryNoReady,
        eventsCsv: V2_12_TESTEA_E342_EVENTS_CSV,
        tradesCsv: `${TRADES_READY_HEADER}\n${readyTradeRow("t1")}\n`,
      }),
      {
        summaryJson: summaryNoReady,
        eventsCsv: V2_12_TESTEA_E342_EVENTS_CSV,
        tradesCsv: `${TRADES_READY_HEADER}\n${readyTradeRow("t1")}\n`,
      },
    );
    expect(
      preNo.errors.some((e) => e.code === "LATEST_VALID_REPORT_SETUP_READINESS_REQUIRED"),
    ).toBe(true);
  });

  it("writes expected report result object and does not copy CSVs", () => {
    const root = mkdtempSync(join(tmpdir(), "lv-report-write-"));
    const outDir = join(root, "out");
    const leaf = join(root, "bundle");
    writeReadyBundleLeaf(leaf);
    try {
      const index = buildIndexFromRoot(leaf);
      const io = reportIo(leaf, outDir);
      const result = generateLatestValidReport(
        {
          index,
          outputDir: outDir,
          selection: { bundleId: index.bundles[0]!.bundle_id },
        },
        io,
      );
      expect(result.ok).toBe(true);
      expect(result.report_markdown_path).toContain(REPORT_MD_NAME);
      expect(result.report_json_path).toContain(REPORT_JSON_NAME);
      expect(result.report_html_path).toContain(REPORT_HTML_NAME);
      expect(existsSync(join(outDir, RESULT_JSON_NAME))).toBe(true);
      const resultJson = JSON.parse(readFileSync(join(outDir, RESULT_JSON_NAME), "utf8")) as {
        ok: boolean;
        decision_counts: Record<string, number>;
      };
      expect(resultJson.ok).toBe(true);
      expect(Object.keys(resultJson.decision_counts).length).toBeGreaterThan(0);

      const written = (io as LatestValidReportFsIo & { _written: string[] })._written;
      for (const p of written) {
        const content = readFileSync(p, "utf8");
        expect(content.includes("lifecycle_init")).toBe(false);
        expect(content.includes(TRADES_READY_HEADER)).toBe(false);
      }
      expect(readFileSync(join(leaf, "backtest_trades.csv"), "utf8")).toContain("trade_id");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not mutate index JSON by default (caller responsibility)", () => {
    const record = indexTestEaBundleLeaf({
      bundlePath: "/tmp/x",
      root: "/tmp",
      summaryJson: readySummary(),
      eventsCsv: V2_12_TESTEA_E342_EVENTS_CSV,
      tradesCsv: `${TRADES_READY_HEADER}\n`,
    });
    const index: TestEaBundleIndexV1 = {
      schema_version: "mapazapp_bundle_index_v1",
      created_at_utc: "2026-05-20T00:00:00.000Z",
      root: "/tmp",
      total_bundles_scanned: 1,
      valid_count: 0,
      valid_warnings_count: 0,
      invalid_count: 0,
      stale_count: 0,
      report_missing_count: 1,
      bundles: [record],
      latest_valid_by_key: computeLatestValidByKey([record]),
    };
    const before = testEaBundleIndexToJson(index);
    expect(before).toBe(testEaBundleIndexToJson(index));
    expect(record.report_json_path).toBeNull();
  });
});
