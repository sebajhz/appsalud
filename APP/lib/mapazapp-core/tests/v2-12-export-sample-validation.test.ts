import { describe, expect, it } from "vitest";
import {
  inferExportSampleFileKind,
  scanExportSamplePrivacy,
  validateBridgeEaExportSample,
  validateExportSampleBundle,
  validateTestEaExportSample,
} from "../src/export-sample-validation";
import {
  v212BridgeBundleMissingCandles,
  v212E342TestEaBundleFiles,
  v212MixedBundleFiles,
  v212SanitizedBridgeBundleFiles,
  v212SanitizedTestEaBundleFiles,
  V2_12_BRIDGE_MARKET_SNAPSHOT_CSV,
  V2_12_PRIVACY_UNSAFE_STATUS_JSON,
  V2_12_TESTEA_BACKTEST_TRADES_CSV,
  V2_12_TESTEA_E342_EVENTS_CSV,
  V2_12_TESTEA_E342_SUMMARY_JSON,
  V2_12_TESTEA_E342_TRADES_HEADER_ONLY_CSV,
  V2_12_TESTEA_SUMMARY_UNSAFE_LIVE_JSON,
} from "../src/export-sample-validation-fixtures";
import { V1_TEST_SYMBOL_PROFILES } from "./test-symbol-profiles";

const testEaImportOpts = {
  importOptions: {
    strategyId: "MZP_IFVG_ZONE_REACTION_V1" as const,
    parameterSetId: "MZP_IFVG_XAUUSD_V1_SET_003" as const,
    canonicalSymbol: "XAUUSD",
    brokerSymbol: "XAUUSDm",
    datasetSplit: "validation" as const,
    sourceType: "mapazapp_testea_csv" as const,
    runId: "V212_TEST_RUN",
  },
};

describe("V2-12 export sample validation", () => {
  it("A. BridgeEA sanitized bundle — status, candles, campaign adapter", () => {
    const r = validateBridgeEaExportSample({
      bundleKind: "bridge_ea_export_bundle",
      files: v212SanitizedBridgeBundleFiles(),
      expectedCanonicalSymbol: "XAUUSD",
      expectedTimeframe: "M15",
      symbolProfile: V1_TEST_SYMBOL_PROFILES.XAUUSD,
      privacyMode: "relaxed",
    });
    expect(r.statusJsonOk).toBe(true);
    expect(r.statusSnapshot?.schemaVersion).toBe("MZP_BRIDGE_V1");
    expect(r.candlesManualImport?.ok).toBe(true);
    expect(r.candlesManualImport?.dataset?.validRowCount).toBe(2);
    expect(r.campaignDataset).not.toBeNull();
    expect(r.campaignDataset?.candles.length).toBe(2);
    expect(r.marketSnapshotOk).toBe(true);
    expect(r.accountSnapshotOk).toBe(true);
  });

  it("B. BridgeEA missing candles — valid_with_warnings; missing status — insufficient_files", () => {
    const noCandles = validateBridgeEaExportSample({
      bundleKind: "bridge_ea_export_bundle",
      files: v212BridgeBundleMissingCandles(),
      expectedCanonicalSymbol: "XAUUSD",
      expectedTimeframe: "M15",
      privacyMode: "relaxed",
    });
    expect(noCandles.status).toBe("valid_with_warnings");
    expect(noCandles.candlesManualImport).toBeNull();
    expect(noCandles.diagnostics.some((d) => d.code === "BRIDGE_CANDLES_MISSING")).toBe(true);

    const noStatus = validateBridgeEaExportSample({
      bundleKind: "bridge_ea_export_bundle",
      files: [{ fileName: "latest_market_snapshot.csv", text: V2_12_BRIDGE_MARKET_SNAPSHOT_CSV }],
      privacyMode: "relaxed",
    });
    expect(noStatus.status).toBe("insufficient_files");
    expect(noStatus.statusJsonOk).toBe(false);
  });

  it("C. Privacy strict — flags sensitive-looking login/server", () => {
    const privacy = scanExportSamplePrivacy(
      [{ fileName: "bridge_status.json", text: V2_12_PRIVACY_UNSAFE_STATUS_JSON }],
      "strict",
    );
    expect(privacy.passed).toBe(false);
    expect(privacy.findings.some((f) => f.code === "PRIVACY_ACCOUNT_LOGIN_LONG")).toBe(true);
    expect(privacy.findings.some((f) => f.code === "PRIVACY_ACCOUNT_SERVER_SENSITIVE")).toBe(true);

    const bundle = validateExportSampleBundle(
      {
        bundleKind: "bridge_ea_export_bundle",
        files: [{ fileName: "bridge_status.json", text: V2_12_PRIVACY_UNSAFE_STATUS_JSON }],
        privacyMode: "strict",
      },
      testEaImportOpts,
    );
    expect(bundle.status).toBe("invalid");
    expect(bundle.privacy.passed).toBe(false);
  });

  it("D. TestEA sanitized bundle — trades + summary contract", () => {
    const r = validateTestEaExportSample(
      {
        bundleKind: "testea_export_bundle",
        files: v212SanitizedTestEaBundleFiles(),
        privacyMode: "relaxed",
      },
      testEaImportOpts,
    );
    expect(r.tradesImport?.ok).toBe(true);
    expect(r.tradeCount).toBe(1);
    expect(r.summaryOk).toBe(true);
    expect(r.summaryJson?.["execution_mode"]).toBe("virtual_export_only");
    expect(r.summaryJson?.["live_trading_enabled"]).toBe(false);
  });

  it("D2. TestEA E3.6 — backtest_ea_v1 bundle (trades header + events + summary)", () => {
    const r = validateTestEaExportSample(
      {
        bundleKind: "testea_export_bundle",
        files: v212E342TestEaBundleFiles(),
        privacyMode: "relaxed",
      },
      testEaImportOpts,
    );
    expect(r.tradesImport?.ok).toBe(true);
    expect(r.tradeCount).toBe(0);
    expect(r.eventsCsvPresent).toBe(true);
    expect(r.eventsParseOk).toBe(true);
    expect(r.eventsDataRowCount).toBe(6);
    expect(r.summaryOk).toBe(true);
    expect(r.summaryJson?.["schema_version"]).toBe("backtest_ea_v1");
    expect(r.summaryJson?.["official_ea"]).toBe("Mapazapp_TestEA");
    expect(r.summaryJson?.["has_real_ifvg_logic"]).toBe(true);
    expect(r.summaryJson?.["has_full_ifvg_pipeline"]).toBe(false);
    expect(r.diagnostics.some((d) => d.code === "TESTEA_EVENTS_RECOMMENDED")).toBe(false);
  });

  it("D3. backtest_ea_v1 summary missing has_full_ifvg_pipeline fails validation", () => {
    const minimalSummary = {
      schema_version: "backtest_ea_v1",
      ea_build: "x",
      run_id: "R_BAD",
      strategy_id: "IFVG_XAUUSD_V1",
      parameter_set_id: "default",
      symbol: "XAUUSD",
      broker_symbol: "XAUUSD",
      execution_timeframe: "M15",
      daily_bias_timeframe: "D1",
      backtest_mode: "virtual",
      tester_only: true,
      official_ea: "Mapazapp_TestEA",
      backtest_role: true,
      has_real_daily_bias_logic: true,
      has_real_ifvg_logic: true,
      has_real_trading_orders: false,
      trade_count: 0,
    };
    const r = validateTestEaExportSample(
      {
        bundleKind: "testea_export_bundle",
        files: [
          { fileName: "backtest_trades.csv", text: V2_12_TESTEA_E342_TRADES_HEADER_ONLY_CSV },
          { fileName: "backtest_events.csv", text: V2_12_TESTEA_E342_EVENTS_CSV },
          { fileName: "backtest_summary.json", text: JSON.stringify(minimalSummary) },
        ],
        privacyMode: "relaxed",
      },
      testEaImportOpts,
    );
    expect(r.status).toBe("invalid");
    expect(r.summaryOk).toBe(false);
    expect(r.diagnostics.some((d) => d.code === "TESTEA_SUMMARY_PIPELINE_FALSE")).toBe(true);
  });

  it("D4. backtest_ea_v1 summary has_full_ifvg_pipeline true fails validation", () => {
    const bad = JSON.parse(V2_12_TESTEA_E342_SUMMARY_JSON) as Record<string, unknown>;
    bad.has_full_ifvg_pipeline = true;
    const r = validateTestEaExportSample(
      {
        bundleKind: "testea_export_bundle",
        files: [
          { fileName: "backtest_trades.csv", text: V2_12_TESTEA_E342_TRADES_HEADER_ONLY_CSV },
          { fileName: "backtest_events.csv", text: V2_12_TESTEA_E342_EVENTS_CSV },
          { fileName: "backtest_summary.json", text: JSON.stringify(bad) },
        ],
        privacyMode: "relaxed",
      },
      testEaImportOpts,
    );
    expect(r.status).toBe("invalid");
    expect(r.diagnostics.some((d) => d.code === "TESTEA_SUMMARY_PIPELINE_FALSE")).toBe(true);
  });

  it("E. TestEA unsafe summary — live_trading_enabled true fails", () => {
    const r = validateTestEaExportSample(
      {
        bundleKind: "testea_export_bundle",
        files: [
          { fileName: "backtest_trades.csv", text: V2_12_TESTEA_BACKTEST_TRADES_CSV },
          { fileName: "backtest_summary.json", text: V2_12_TESTEA_SUMMARY_UNSAFE_LIVE_JSON },
        ],
        privacyMode: "relaxed",
      },
      testEaImportOpts,
    );
    expect(r.status).toBe("invalid");
    expect(r.summaryOk).toBe(false);
    expect(r.diagnostics.some((d) => d.code === "TESTEA_SUMMARY_LIVE_FLAG")).toBe(true);
  });

  it("F. Mixed bundle — combined validator", () => {
    const r = validateExportSampleBundle(
      {
        bundleKind: "mixed_export_bundle",
        files: v212MixedBundleFiles(),
        expectedCanonicalSymbol: "XAUUSD",
        expectedTimeframe: "M15",
        symbolProfile: V1_TEST_SYMBOL_PROFILES.XAUUSD,
        privacyMode: "relaxed",
      },
      testEaImportOpts,
    );
    expect(r.bundleKind).toBe("mixed_export_bundle");
    expect(r.bridge).not.toBeNull();
    expect(r.testEa).not.toBeNull();
    expect(r.bridge?.candlesManualImport?.ok).toBe(true);
    expect(r.testEa?.summaryOk).toBe(true);
  });

  it("G. No auto-approval — safety flags only", () => {
    const r = validateExportSampleBundle(
      {
        bundleKind: "bridge_ea_export_bundle",
        files: v212SanitizedBridgeBundleFiles(),
        privacyMode: "relaxed",
      },
      testEaImportOpts,
    );
    expect(r.executionEnabled).toBe(false);
    expect(r.registryMutationAllowed).toBe(false);
    expect(r.reviewOnly).toBe(true);
    expect("approved" in r).toBe(false);
  });

  it("H. No filesystem — infer kind + validate from strings only", () => {
    expect(inferExportSampleFileKind("candles.csv")).toBe("candles_csv");
    expect(inferExportSampleFileKind("backtest_events.csv")).toBe("backtest_events_csv");
    const r = validateExportSampleBundle(
      {
        bundleKind: "unknown",
        files: v212SanitizedTestEaBundleFiles(),
        privacyMode: "relaxed",
      },
      testEaImportOpts,
    );
    expect(r.testEa?.tradesImport?.ok).toBe(true);
  });
});
