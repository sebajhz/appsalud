import { describe, expect, it } from "vitest";
import {
  SESSION_SPREAD_VOLATILITY_OPTIMIZATION_PARAMETER_KEYS,
  buildSessionSpreadVolatilitySummaryPlaceholders,
} from "../src/session-spread-volatility-export-keys";
import { validateTestEaExportSample } from "../src/export-sample-validation";

describe("Session / Spread / Volatility export validation E5.16", () => {
  it("bundle without has_session_spread_volatility_v1_logic stays valid", () => {
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

  it("sample with full Session/Spread/Volatility placeholders validates", () => {
    const placeholders = buildSessionSpreadVolatilitySummaryPlaceholders();
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
        SESSION_SPREAD_VOLATILITY_OPTIMIZATION_PARAMETER_KEYS.map((k) => [
          k,
          k.includes("enabled") ? true : k.includes("hour") || k.includes("points") || k.includes("period") ? 0 : 0,
        ]),
      ),
      ...placeholders,
    };
    const r = validateTestEaExportSample({
      bundleKind: "testea_export_bundle",
      files: [{ fileName: "backtest_summary.json", text: JSON.stringify(summary) }],
      privacyMode: "relaxed",
    });
    const ssvErrors = r.diagnostics.filter((d) => d.code.startsWith("TESTEA_SUMMARY_SSV"));
    expect(ssvErrors).toEqual([]);
    expect(r.status).not.toBe("invalid");
  });

  it("missing required Session/Spread/Volatility summary key fails when flag is true", () => {
    const partial = buildSessionSpreadVolatilitySummaryPlaceholders();
    delete partial["session_asian_count"];
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
      optimization_parameters: { session_spread_volatility_v1_enabled: true },
      ...partial,
    };
    const r = validateTestEaExportSample({
      bundleKind: "testea_export_bundle",
      files: [{ fileName: "backtest_summary.json", text: JSON.stringify(summary) }],
      privacyMode: "relaxed",
    });
    expect(r.status).toBe("invalid");
    expect(r.diagnostics.some((d) => d.message.includes("session_asian_count"))).toBe(true);
  });
});
