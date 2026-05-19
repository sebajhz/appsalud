import { describe, expect, it } from "vitest";
import { buildIfvgBisiSibiSummaryPlaceholders } from "../src/ifvg-bisi-sibi-export-keys";
import { validateTestEaExportSample } from "../src/export-sample-validation";

describe("IFVG BISI SIBI export validation E5.14", () => {
  it("bundle without has_ifvg_bisi_sibi_v1_logic stays valid", () => {
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

  it("sample with full IFVG placeholders validates", () => {
    const placeholders = buildIfvgBisiSibiSummaryPlaceholders();
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
      optimization_parameters: {
        ifvg_bisi_sibi_v1_enabled: true,
        ifvg_bisi_sibi_max_bars: 200,
        ifvg_require_close_inversion: true,
        ifvg_track_retest: true,
        ifvg_score_enabled: true,
      },
      ...placeholders,
    };
    const r = validateTestEaExportSample({
      bundleKind: "testea_export_bundle",
      files: [{ fileName: "backtest_summary.json", text: JSON.stringify(summary) }],
      privacyMode: "relaxed",
    });
    const ifvgErrors = r.diagnostics.filter((d) => d.code.startsWith("TESTEA_SUMMARY_IFVG"));
    expect(ifvgErrors).toEqual([]);
    expect(r.status).not.toBe("invalid");
  });

  it("missing required IFVG summary key fails when has_ifvg_bisi_sibi_v1_logic is true", () => {
    const partial = buildIfvgBisiSibiSummaryPlaceholders();
    delete partial["ifvg_bisi_count"];
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
      optimization_parameters: { ifvg_bisi_sibi_v1_enabled: true },
      ...partial,
    };
    const r = validateTestEaExportSample({
      bundleKind: "testea_export_bundle",
      files: [{ fileName: "backtest_summary.json", text: JSON.stringify(summary) }],
      privacyMode: "relaxed",
    });
    expect(r.status).toBe("invalid");
    expect(r.diagnostics.some((d) => d.message.includes("ifvg_bisi_count"))).toBe(true);
  });
});
