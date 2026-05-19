import { describe, expect, it } from "vitest";
import { buildLiquidityTargetQualitySummaryPlaceholders } from "../src/liquidity-target-quality-export-keys";
import { validateTestEaExportSample } from "../src/export-sample-validation";

describe("Liquidity Target Quality export validation E5.15", () => {
  it("bundle without has_liquidity_target_quality_v1_logic stays valid", () => {
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

  it("sample with full Liquidity Target placeholders validates", () => {
    const placeholders = buildLiquidityTargetQualitySummaryPlaceholders();
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
        liquidity_target_quality_v1_enabled: true,
        liquidity_target_lookback_bars: 200,
        liquidity_target_swing_lookback_bars: 2,
        liquidity_target_equal_level_tolerance_points: 50,
        liquidity_target_min_distance_points: 20,
        liquidity_target_score_enabled: true,
      },
      ...placeholders,
    };
    const r = validateTestEaExportSample({
      bundleKind: "testea_export_bundle",
      files: [{ fileName: "backtest_summary.json", text: JSON.stringify(summary) }],
      privacyMode: "relaxed",
    });
    const lqErrors = r.diagnostics.filter((d) => d.code.startsWith("TESTEA_SUMMARY_LQ_TGT"));
    expect(lqErrors).toEqual([]);
    expect(r.status).not.toBe("invalid");
  });

  it("missing required Liquidity Target summary key fails when flag is true", () => {
    const partial = buildLiquidityTargetQualitySummaryPlaceholders();
    delete partial["liquidity_target_supported_count"];
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
      optimization_parameters: { liquidity_target_quality_v1_enabled: true },
      ...partial,
    };
    const r = validateTestEaExportSample({
      bundleKind: "testea_export_bundle",
      files: [{ fileName: "backtest_summary.json", text: JSON.stringify(summary) }],
      privacyMode: "relaxed",
    });
    expect(r.status).toBe("invalid");
    expect(r.diagnostics.some((d) => d.message.includes("liquidity_target_supported_count"))).toBe(true);
  });
});
