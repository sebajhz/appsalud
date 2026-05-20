import { describe, expect, it } from "vitest";
import {
  SETUP_READINESS_OPTIMIZATION_PARAMETER_KEYS,
  buildSetupReadinessSummaryPlaceholders,
} from "../src/setup-readiness-export-keys";
import { validateTestEaExportSample } from "../src/export-sample-validation";
import { importBacktestTradesFromCsv } from "../src/backtest-importer";

describe("Setup Readiness Checklist export validation E5.18", () => {
  it("bundle without has_setup_readiness_checklist_v1_logic stays valid", () => {
    const summary = {
      schema_version: "backtest_ea_v1",
      official_ea: "Mapazapp_TestEA",
      backtest_role: true,
      tester_only: true,
      has_real_ifvg_logic: true,
      has_full_ifvg_pipeline: false,
      has_real_daily_bias_logic: true,
      has_real_trading_orders: false,
      has_real_virtual_trade_logic: true,
      trade_count: 0,
      virtual_trade_count: 0,
    };
    const r = validateTestEaExportSample({
      bundleKind: "testea_export_bundle",
      files: [{ fileName: "backtest_summary.json", text: JSON.stringify(summary) }],
      privacyMode: "relaxed",
    });
    expect(r.status).not.toBe("invalid");
  });

  it("sample with full setup readiness placeholders validates", () => {
    const placeholders = buildSetupReadinessSummaryPlaceholders();
    const summary = {
      schema_version: "backtest_ea_v1",
      official_ea: "Mapazapp_TestEA",
      backtest_role: true,
      tester_only: true,
      has_real_ifvg_logic: true,
      has_full_ifvg_pipeline: false,
      has_real_daily_bias_logic: true,
      has_real_trading_orders: false,
      has_real_virtual_trade_logic: true,
      trade_count: 0,
      virtual_trade_count: 0,
      optimization_parameters: Object.fromEntries(
        SETUP_READINESS_OPTIMIZATION_PARAMETER_KEYS.map((k) => [
          k,
          k.includes("enabled") ? true : k.includes("score") ? 70 : 0,
        ]),
      ),
      ...placeholders,
    };
    const r = validateTestEaExportSample({
      bundleKind: "testea_export_bundle",
      files: [{ fileName: "backtest_summary.json", text: JSON.stringify(summary) }],
      privacyMode: "relaxed",
    });
    const readyErrors = r.diagnostics.filter((d) => d.code.startsWith("TESTEA_SUMMARY_READY"));
    expect(readyErrors).toEqual([]);
    expect(r.status).not.toBe("invalid");
  });

  it("rejects average_setup_readiness_score above 100 when E5.18 logic flag is true", () => {
    const placeholders = buildSetupReadinessSummaryPlaceholders();
    placeholders.average_setup_readiness_score = 101;
    const summary = {
      schema_version: "backtest_ea_v1",
      official_ea: "Mapazapp_TestEA",
      backtest_role: true,
      tester_only: true,
      has_real_ifvg_logic: true,
      has_full_ifvg_pipeline: false,
      has_real_daily_bias_logic: true,
      has_real_trading_orders: false,
      has_real_virtual_trade_logic: true,
      trade_count: 1,
      virtual_trade_count: 1,
      optimization_parameters: { setup_readiness_checklist_v1_enabled: true },
      ...placeholders,
    };
    const r = validateTestEaExportSample({
      bundleKind: "testea_export_bundle",
      files: [{ fileName: "backtest_summary.json", text: JSON.stringify(summary) }],
      privacyMode: "relaxed",
    });
    expect(r.status).toBe("invalid");
    expect(r.diagnostics.some((d) => d.code === "TESTEA_SUMMARY_READY_E5_18_AVG")).toBe(true);
  });

  it("importer parses optional setup readiness fields", () => {
    const hdr =
      "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held,setup_readiness_checklist_enabled,checklist_bias_aligned,setup_readiness_score,setup_readiness_decision,setup_readiness_reasons";
    const row =
      "t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2100,2100,2,0,win,2,5,true,true,82,candidate,checklist_candidate";
    const r = importBacktestTradesFromCsv(`${hdr}\n${row}`, {
      strategyId: "MZP_TESTEA",
      parameterSetId: "default",
      canonicalSymbol: "XAUUSD",
      brokerSymbol: "XAUUSD",
      accountId: "ready-import",
      sourceType: "mapazapp_testea_csv",
      datasetSplit: "train",
    });
    expect(r.ok).toBe(true);
    expect(r.trades[0]?.setupReadinessScore).toBe(82);
    expect(r.trades[0]?.setupReadinessDecision).toBe("candidate");
    expect(r.trades[0]?.checklistBiasAligned).toBe(true);
  });
});
