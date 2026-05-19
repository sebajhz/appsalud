import { describe, expect, it } from "vitest";
import {
  buildBufferedEvosSummaryRollupPlaceholders,
  listBufferedEvosSummaryRollupKeys,
} from "../src/buffered-evos-export-keys";
import { validateTestEaExportSample } from "../src/export-sample-validation";

describe("buffered EVOS export validation E5.13.6.11", () => {
  it("bundle without has_buffered_evos_v1_logic stays valid", () => {
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

  it("sample with full buffered rollup placeholders validates", () => {
    const placeholders = buildBufferedEvosSummaryRollupPlaceholders();
    expect(listBufferedEvosSummaryRollupKeys().length).toBeGreaterThan(0);
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
        buffered_evos_v1_enabled: true,
        buffered_evos_buffer_a_points: 0,
        buffered_evos_buffer_b_points: 5,
        buffered_evos_buffer_c_points: 10,
        buffered_evos_buffer_d_points: 20,
        buffered_evos_buffer_e_points: 30,
        buffered_evos_buffer_f_points: 50,
        buffered_evos_min_effective_rr: 1.5,
        buffered_evos_score_enabled: true,
      },
      ...placeholders,
    };
    const r = validateTestEaExportSample({
      bundleKind: "testea_export_bundle",
      files: [{ fileName: "backtest_summary.json", text: JSON.stringify(summary) }],
      privacyMode: "relaxed",
    });
    const bufferedErrors = r.diagnostics.filter((d) =>
      d.code.startsWith("TESTEA_SUMMARY_BUFFERED_EVOS"),
    );
    expect(bufferedErrors).toEqual([]);
    expect(r.status).not.toBe("invalid");
  });

  it("missing required buffered key fails when has_buffered_evos_v1_logic is true", () => {
    const partial = buildBufferedEvosSummaryRollupPlaceholders();
    delete partial["buffered_evos_edge_b0_filled_count"];
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
      optimization_parameters: { buffered_evos_v1_enabled: true },
      ...partial,
    };
    const r = validateTestEaExportSample({
      bundleKind: "testea_export_bundle",
      files: [{ fileName: "backtest_summary.json", text: JSON.stringify(summary) }],
      privacyMode: "relaxed",
    });
    expect(r.status).toBe("invalid");
    expect(
      r.diagnostics.some((d) => d.message.includes("buffered_evos_edge_b0_filled_count")),
    ).toBe(true);
  });
});
