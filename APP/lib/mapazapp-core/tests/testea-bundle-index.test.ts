import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  V2_12_TESTEA_E342_EVENTS_CSV,
  V2_12_TESTEA_E342_SUMMARY_JSON,
  V2_12_TESTEA_E342_TRADES_HEADER_ONLY_CSV,
} from "../src/export-sample-validation-fixtures";
import {
  SETUP_READINESS_OPTIMIZATION_PARAMETER_KEYS,
  buildSetupReadinessSummaryPlaceholders,
} from "../src/setup-readiness-export-keys";
import { deriveTestEaBundleSafetyPosture } from "../src/testea-export-bundle-validate";
import {
  buildTestEaBundleIndex,
  computeLatestValidByKey,
  indexTestEaBundleLeaf,
  markSupersededBundlesStale,
  parseSetupReadinessReportHeaderSlice,
  reportCoherenceStaleReasons,
  testEaBundleIndexToJson,
  type TestEaBundleIndexFsIo,
  type TestEaBundleIndexRecord,
} from "../src/testea-bundle-index";

function parseSummary(base: Record<string, unknown> = {}): string {
  const s = { ...JSON.parse(V2_12_TESTEA_E342_SUMMARY_JSON) as Record<string, unknown>, ...base };
  return JSON.stringify(s);
}

function writeBundleLeaf(
  dir: string,
  opts?: {
    summary?: string;
    trades?: string;
    events?: string;
    reportJson?: string;
  },
): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "backtest_summary.json"), opts?.summary ?? V2_12_TESTEA_E342_SUMMARY_JSON);
  writeFileSync(join(dir, "backtest_events.csv"), opts?.events ?? V2_12_TESTEA_E342_EVENTS_CSV);
  writeFileSync(join(dir, "backtest_trades.csv"), opts?.trades ?? V2_12_TESTEA_E342_TRADES_HEADER_ONLY_CSV);
  if (opts?.reportJson) {
    writeFileSync(join(dir, "setup_readiness_report.json"), opts.reportJson);
  }
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

describe("E5.20.1 testea-bundle-index", () => {
  it("finds a valid bundle leaf with canonical files", () => {
    const root = mkdtempSync(join(tmpdir(), "bundle-index-valid-"));
    const leaf = join(root, "XAUUSD_M15_Profile_V1", "CAMP", "run_a");
    writeBundleLeaf(leaf, {
      summary: parseSummary({
        tester_only: true,
        backtest_role: true,
        live_trading_enabled: false,
        has_real_trading_orders: false,
        campaign_id: "CAMP",
        exported_at_utc: "2026-05-08T10:00:00Z",
      }),
    });
    try {
      const index = buildTestEaBundleIndex({ root, nowUtc: "2026-05-20T00:00:00.000Z" }, diskIo());
      expect(index.total_bundles_scanned).toBe(1);
      expect(index.bundles[0]?.valid_status).toBe("valid");
      expect(index.bundles[0]?.readOnly).toBe(true);
      expect(index.bundles[0]?.executionEnabled).toBe(false);
      expect(index.bundles[0]?.profile_id).toBe("XAUUSD_M15_Profile_V1");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("invalid when canonical files are missing", () => {
    const record = indexTestEaBundleLeaf({
      bundlePath: "/tmp/missing",
      root: "/tmp",
      summaryJson: "",
      eventsCsv: V2_12_TESTEA_E342_EVENTS_CSV,
      tradesCsv: V2_12_TESTEA_E342_TRADES_HEADER_ONLY_CSV,
    });
    expect(record.valid_status).toBe("invalid");
    expect(record.errors.some((e) => e.code === "BUNDLE_MISSING_SUMMARY")).toBe(true);
  });

  it("report_missing when bundle valid but no report JSON", () => {
    const e342 = JSON.parse(V2_12_TESTEA_E342_SUMMARY_JSON) as Record<string, unknown>;
    const summaryReady = {
      ...e342,
      ...buildSetupReadinessSummaryPlaceholders(),
      read_only: true,
      execution_enabled: false,
      has_real_virtual_trade_logic: true,
      trade_count: 0,
      virtual_trade_count: 0,
      ea_build: "MZP_TestEA_E5_18",
      campaign_id: "SET001",
      parameter_set_id: "FVG2_RR2_00",
      optimization_parameters: Object.fromEntries(
        SETUP_READINESS_OPTIMIZATION_PARAMETER_KEYS.map((k) => [
          k,
          k.includes("enabled") ? true : k.includes("score") ? 70 : 0,
        ]),
      ),
    };
    const tradesReady = [
      "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held,setup_readiness_checklist_enabled,checklist_bias_aligned,checklist_structure_ok,checklist_liquidity_event_ok,checklist_ifvg_quality_ok,checklist_ifvg_grade,checklist_mss_choch_ok,checklist_mss_choch_timing_ok,checklist_premium_discount_ok,checklist_pd_zone_valid,checklist_entry_feasible,checklist_entry_candidate_family,checklist_entry_fragility_warning,checklist_target_ok,checklist_target_grade,checklist_target_type,checklist_execution_environment_ok,checklist_execution_environment_grade,checklist_discipline_ok,checklist_discipline_grade,checklist_overtrading_warning,setup_readiness_score,setup_readiness_grade,setup_readiness_decision,setup_readiness_blocker_count,setup_readiness_warning_count,setup_readiness_primary_blocker,setup_readiness_reasons",
    ].join("\n");
    const record = indexTestEaBundleLeaf({
      bundlePath: "/tmp/ready",
      root: "/tmp",
      summaryJson: JSON.stringify(summaryReady),
      eventsCsv: V2_12_TESTEA_E342_EVENTS_CSV,
      tradesCsv: tradesReady,
    });
    expect(record.valid_status).toBe("report_missing");
    expect(record.has_setup_readiness_checklist_v1_logic).toBe(true);
    expect(record.report_json_path).toBeNull();
  });

  it("stale when report JSON build/trade_count/bundle mismatches summary", () => {
    const root = mkdtempSync(join(tmpdir(), "bundle-index-stale-"));
    const leaf = join(root, "run_stale");
    const reportJson = JSON.stringify({
      ok: true,
      header: {
        bundle: "OTHER_BUNDLE",
        bundle_name: "OTHER_BUNDLE",
        ea_build: "WRONG_BUILD",
        trade_count: 999,
      },
    });
    writeBundleLeaf(leaf, {
      summary: parseSummary({
        ea_build: "MZP_TestEA_E5_18",
        trade_count: 0,
        effective_export_folder_label: "FOLDER_A",
        tester_only: true,
        backtest_role: true,
        live_trading_enabled: false,
      }),
      reportJson,
    });
    try {
      const index = buildTestEaBundleIndex({ root }, diskIo());
      expect(index.bundles[0]?.valid_status).toBe("stale");
      expect(index.bundles[0]?.errors.some((e) => e.code === "INDEX_REPORT_BUNDLE_MISMATCH")).toBe(true);
      const header = parseSetupReadinessReportHeaderSlice(reportJson)!;
      const reasons = reportCoherenceStaleReasons(
        {
          bundle_name: "FOLDER_A",
          ea_build: "MZP_TestEA_E5_18",
          trade_count: 0,
          report_json_path: join(leaf, "setup_readiness_report.json"),
        },
        header,
      );
      expect(reasons.length).toBeGreaterThan(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("latest_valid_by_key chooses newest by created_at or mtime", () => {
    const mk = (id: string, at: string, path: string): TestEaBundleIndexRecord => ({
      bundle_id: id,
      bundle_name: id,
      bundle_path: path,
      summary_path: "",
      trades_path: "",
      events_path: "",
      report_json_path: null,
      report_markdown_path: null,
      report_html_path: null,
      symbol: "XAUUSD",
      timeframe: "M15",
      profile_id: "XAUUSD_M15_Profile_V1",
      campaign_id: "C1",
      parameter_set_id: "SET_A",
      strategy_id: "S",
      run_id: id,
      effective_run_id: id,
      ea_build: "b",
      schema_version: "v1",
      trade_count: 0,
      created_at_utc: at,
      summary_mtime_utc: at,
      readOnly: true,
      executionEnabled: false,
      has_real_trading_orders: false,
      has_setup_readiness_checklist_v1_logic: false,
      valid_status: "valid",
      warnings: [],
      errors: [],
    });
    const older = mk("old", "2026-05-01T00:00:00Z", "/z/old");
    const newer = mk("new", "2026-05-10T00:00:00Z", "/a/new");
    const latest = computeLatestValidByKey([older, newer]);
    expect(latest).toHaveLength(1);
    expect(latest[0]?.bundle_id).toBe("new");
    expect(latest[0]?.ambiguous_latest).toBeUndefined();
    markSupersededBundlesStale([older, newer], latest);
    expect(older.valid_status).toBe("stale");
    expect(newer.valid_status).toBe("valid");
  });

  it("ambiguous latest is flagged when timestamps tie", () => {
    const mk = (id: string, path: string): TestEaBundleIndexRecord => ({
      bundle_id: id,
      bundle_name: id,
      bundle_path: path,
      summary_path: "",
      trades_path: "",
      events_path: "",
      report_json_path: null,
      report_markdown_path: null,
      report_html_path: null,
      symbol: "XAUUSD",
      timeframe: "M15",
      profile_id: null,
      campaign_id: "C",
      parameter_set_id: "P",
      strategy_id: null,
      run_id: id,
      effective_run_id: id,
      ea_build: null,
      schema_version: null,
      trade_count: null,
      created_at_utc: "2026-05-07T12:00:00Z",
      summary_mtime_utc: "2026-05-07T12:00:00Z",
      readOnly: true,
      executionEnabled: false,
      has_real_trading_orders: false,
      has_setup_readiness_checklist_v1_logic: false,
      valid_status: "valid",
      warnings: [],
      errors: [],
    });
    const a = mk("a", "/b/a");
    const b = mk("b", "/b/b");
    const latest = computeLatestValidByKey([a, b]);
    expect(latest[0]?.ambiguous_latest).toBe(true);
    expect(latest[0]?.candidate_bundle_ids?.sort()).toEqual(["a", "b"]);
    expect(latest[0]?.bundle_id).toBeNull();
  });

  it("does not duplicate/copy CSV content in index JSON", () => {
    const record = indexTestEaBundleLeaf({
      bundlePath: "/tmp/x",
      root: "/tmp",
      summaryJson: V2_12_TESTEA_E342_SUMMARY_JSON,
      eventsCsv: V2_12_TESTEA_E342_EVENTS_CSV,
      tradesCsv: V2_12_TESTEA_E342_TRADES_HEADER_ONLY_CSV,
    });
    const json = testEaBundleIndexToJson({
      schema_version: "mapazapp_bundle_index_v1",
      created_at_utc: "2026-05-20T00:00:00.000Z",
      root: "/tmp",
      total_bundles_scanned: 1,
      valid_count: 1,
      valid_warnings_count: 0,
      invalid_count: 0,
      stale_count: 0,
      report_missing_count: 0,
      bundles: [record],
      latest_valid_by_key: [],
    });
    expect(json.includes("lifecycle_init")).toBe(false);
    expect(json.includes("run_id,event_id")).toBe(false);
  });

  it("duplicate CSV headers surface through validation errors", () => {
    const dupTrades = [
      "trade_id,trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held",
      "t1,t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,1,1,1,1,0,0,win,0,0",
    ].join("\n");
    const record = indexTestEaBundleLeaf({
      bundlePath: "/tmp/dup",
      root: "/tmp",
      summaryJson: parseSummary({
        trade_count: 1,
        tester_only: true,
        backtest_role: true,
        live_trading_enabled: false,
      }),
      eventsCsv: V2_12_TESTEA_E342_EVENTS_CSV,
      tradesCsv: dupTrades,
    });
    expect(record.valid_status).toBe("invalid");
    expect(record.errors.some((e) => e.code === "DUPLICATE_CSV_HEADER")).toBe(true);
  });

  it("readiness-capable flag is detected", () => {
    const record = indexTestEaBundleLeaf({
      bundlePath: "/tmp/r",
      root: "/tmp",
      summaryJson: parseSummary({
        has_setup_readiness_checklist_v1_logic: true,
        setup_readiness_checklist_enabled: true,
        tester_only: true,
        backtest_role: true,
        live_trading_enabled: false,
      }),
      eventsCsv: V2_12_TESTEA_E342_EVENTS_CSV,
      tradesCsv: V2_12_TESTEA_E342_TRADES_HEADER_ONLY_CSV,
    });
    expect(record.has_setup_readiness_checklist_v1_logic).toBe(true);
  });
});

describe("E5.20.1.1 bundle index read-only derivation", () => {
  it("derives readOnly/executionEnabled from backtest_ea_v1 flags when raw fields are absent", () => {
    const summary = JSON.parse(
      parseSummary({
        tester_only: true,
        backtest_role: true,
        backtest_mode: "virtual",
        official_ea: "Mapazapp_TestEA",
        has_real_trading_orders: false,
      }),
    ) as Record<string, unknown>;
    delete summary.readOnly;
    delete summary.read_only;
    delete summary.executionEnabled;
    delete summary.execution_enabled;
    delete summary.live_trading_enabled;

    const posture = deriveTestEaBundleSafetyPosture(summary);
    expect(posture.readOnly).toBe(true);
    expect(posture.executionEnabled).toBe(false);

    const record = indexTestEaBundleLeaf({
      bundlePath: "/tmp/set001-like",
      root: "/tmp",
      summaryJson: JSON.stringify(summary),
      eventsCsv: V2_12_TESTEA_E342_EVENTS_CSV,
      tradesCsv: V2_12_TESTEA_E342_TRADES_HEADER_ONLY_CSV,
    });
    expect(record.readOnly).toBe(true);
    expect(record.executionEnabled).toBe(false);
    expect(record.errors.some((e) => e.code === "INDEX_READ_ONLY_REQUIRED")).toBe(false);
    expect(record.valid_status).not.toBe("invalid");
  });

  it("readiness-capable bundle without report JSON is report_missing (no INDEX_READ_ONLY_REQUIRED)", () => {
    const e342 = JSON.parse(V2_12_TESTEA_E342_SUMMARY_JSON) as Record<string, unknown>;
    const summaryReady = {
      ...e342,
      ...buildSetupReadinessSummaryPlaceholders(),
      has_real_virtual_trade_logic: true,
      trade_count: 0,
      virtual_trade_count: 0,
      ea_build: "MZP_TestEA_E5_18",
      campaign_id: "SET001",
      parameter_set_id: "FVG2_RR2_00",
      optimization_parameters: Object.fromEntries(
        SETUP_READINESS_OPTIMIZATION_PARAMETER_KEYS.map((k) => [
          k,
          k.includes("enabled") ? true : k.includes("score") ? 70 : 0,
        ]),
      ),
    };
    delete summaryReady.read_only;
    delete summaryReady.execution_enabled;
    delete summaryReady.readOnly;
    delete summaryReady.executionEnabled;

    const tradesReady = [
      "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held,setup_readiness_checklist_enabled,checklist_bias_aligned,checklist_structure_ok,checklist_liquidity_event_ok,checklist_ifvg_quality_ok,checklist_ifvg_grade,checklist_mss_choch_ok,checklist_mss_choch_timing_ok,checklist_premium_discount_ok,checklist_pd_zone_valid,checklist_entry_feasible,checklist_entry_candidate_family,checklist_entry_fragility_warning,checklist_target_ok,checklist_target_grade,checklist_target_type,checklist_execution_environment_ok,checklist_execution_environment_grade,checklist_discipline_ok,checklist_discipline_grade,checklist_overtrading_warning,setup_readiness_score,setup_readiness_grade,setup_readiness_decision,setup_readiness_blocker_count,setup_readiness_warning_count,setup_readiness_primary_blocker,setup_readiness_reasons",
    ].join("\n");

    const record = indexTestEaBundleLeaf({
      bundlePath: "/tmp/set001-like",
      root: "/tmp",
      summaryJson: JSON.stringify(summaryReady),
      eventsCsv: V2_12_TESTEA_E342_EVENTS_CSV,
      tradesCsv: tradesReady,
    });
    expect(record.valid_status).toBe("report_missing");
    expect(record.readOnly).toBe(true);
    expect(record.executionEnabled).toBe(false);
    expect(record.errors).toHaveLength(0);

    const latest = computeLatestValidByKey([record]);
    expect(latest).toHaveLength(1);
    expect(latest[0]?.bundle_id).toBe(record.bundle_id);
  });

  it("BUNDLE_EVENTS_LARGE warning yields valid_warnings, not invalid", () => {
    const record = indexTestEaBundleLeaf({
      bundlePath: "/tmp/large-events",
      root: "/tmp",
      summaryJson: parseSummary({
        tester_only: true,
        backtest_role: true,
        has_real_trading_orders: false,
      }),
      eventsCsv: V2_12_TESTEA_E342_EVENTS_CSV,
      tradesCsv: V2_12_TESTEA_E342_TRADES_HEADER_ONLY_CSV,
      eventsCsvByteLength: 2_000_000,
    });
    expect(record.valid_status).toBe("valid_warnings");
    expect(record.warnings.some((w) => w.code === "BUNDLE_EVENTS_LARGE")).toBe(true);
    expect(record.errors.some((e) => e.code === "INDEX_READ_ONLY_REQUIRED")).toBe(false);
  });

  it("unsafe live-trading posture stays invalid", () => {
    const record = indexTestEaBundleLeaf({
      bundlePath: "/tmp/unsafe",
      root: "/tmp",
      summaryJson: parseSummary({
        tester_only: false,
        backtest_role: false,
        live_trading_enabled: true,
        has_real_trading_orders: true,
      }),
      eventsCsv: V2_12_TESTEA_E342_EVENTS_CSV,
      tradesCsv: V2_12_TESTEA_E342_TRADES_HEADER_ONLY_CSV,
    });
    expect(record.valid_status).toBe("invalid");
    expect(record.readOnly).toBe(false);
    expect(
      record.errors.some(
        (e) =>
          e.code === "INDEX_READ_ONLY_REQUIRED" ||
          e.code === "INDEX_NO_REAL_TRADING_ORDERS" ||
          e.code.startsWith("TESTEA_"),
      ),
    ).toBe(true);
  });
});
