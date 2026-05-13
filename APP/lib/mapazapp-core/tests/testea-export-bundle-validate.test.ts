import { describe, expect, it } from "vitest";
import { validateTestEaExportBundleTexts } from "../src/testea-export-bundle-validate";
import {
  V2_12_TESTEA_E342_EVENTS_CSV,
  V2_12_TESTEA_E342_SUMMARY_JSON,
  V2_12_TESTEA_E342_TRADES_HEADER_ONLY_CSV,
} from "../src/export-sample-validation-fixtures";

function baseInput() {
  return {
    summaryJson: V2_12_TESTEA_E342_SUMMARY_JSON,
    eventsCsv: V2_12_TESTEA_E342_EVENTS_CSV,
    tradesCsv: V2_12_TESTEA_E342_TRADES_HEADER_ONLY_CSV,
    eventsCsvByteLength: Buffer.byteLength(V2_12_TESTEA_E342_EVENTS_CSV, "utf8"),
    bundleLabel: "TEST_BUNDLE",
  };
}

describe("E4.1 validateTestEaExportBundleTexts", () => {
  it("A. fixture bundle passes (E4 strict trade_count=0)", () => {
    const r = validateTestEaExportBundleTexts(baseInput(), { requireTradeCountZero: true });
    expect(r.ok).toBe(true);
    expect(r.status).toBe("ok");
    expect(r.errors).toHaveLength(0);
    expect(r.files.trades).toBe("header_only");
    expect(r.eventCounts?.lifecycle_deinit).toBe(1);
  });

  it("B. missing summary fails", () => {
    const r = validateTestEaExportBundleTexts({ ...baseInput(), summaryJson: "" });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "BUNDLE_MISSING_SUMMARY")).toBe(true);
  });

  it("C. missing events fails", () => {
    const r = validateTestEaExportBundleTexts({ ...baseInput(), eventsCsv: "" });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "BUNDLE_MISSING_EVENTS")).toBe(true);
  });

  it("D. missing trades fails", () => {
    const r = validateTestEaExportBundleTexts({ ...baseInput(), tradesCsv: "" });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "BUNDLE_MISSING_TRADES")).toBe(true);
  });

  it("E. invalid summary schema fails", () => {
    const bad = JSON.parse(V2_12_TESTEA_E342_SUMMARY_JSON) as Record<string, unknown>;
    bad.schema_version = "not_a_schema";
    const r = validateTestEaExportBundleTexts({ ...baseInput(), summaryJson: JSON.stringify(bad) });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "TESTEA_SUMMARY_SCHEMA")).toBe(true);
  });

  it("F. has_full_ifvg_pipeline true fails", () => {
    const bad = JSON.parse(V2_12_TESTEA_E342_SUMMARY_JSON) as Record<string, unknown>;
    bad.has_full_ifvg_pipeline = true;
    const r = validateTestEaExportBundleTexts({ ...baseInput(), summaryJson: JSON.stringify(bad) });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "TESTEA_SUMMARY_PIPELINE_FALSE")).toBe(true);
  });

  it("G. has_real_trading_orders true fails", () => {
    const bad = JSON.parse(V2_12_TESTEA_E342_SUMMARY_JSON) as Record<string, unknown>;
    bad.has_real_trading_orders = true;
    const r = validateTestEaExportBundleTexts({ ...baseInput(), summaryJson: JSON.stringify(bad) });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "TESTEA_SUMMARY_ORDERS_FLAG")).toBe(true);
  });

  it("H. invalid events CSV fails", () => {
    const badEvents = [
      "run_id,event_id,timestamp,symbol,event_type,bias_direction,setup_direction,decision,reason,details",
      "R1,EVT_1,2026-01-01T00:00:00Z,XAUUSD,not_real_event,bullish,none,ok,r,d",
    ].join("\n");
    const r = validateTestEaExportBundleTexts({ ...baseInput(), eventsCsv: badEvents });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "EVENTS_ROW_EVENT_TYPE_UNKNOWN")).toBe(true);
  });

  it("I. header-only trades passes", () => {
    const r = validateTestEaExportBundleTexts(baseInput(), { requireTradeCountZero: true });
    expect(r.files.trades).toBe("header_only");
    expect(r.testEa.tradeCount).toBe(0);
  });

  it("J. large events file produces warning", () => {
    const r = validateTestEaExportBundleTexts(
      { ...baseInput(), eventsCsvByteLength: 2_000_000 },
      { eventsLargeWarningBytes: 1_500_000 },
    );
    expect(r.warnings.some((w) => w.code === "BUNDLE_EVENTS_LARGE")).toBe(true);
    expect(r.status).toBe("warning");
  });

  it("K. lowercase testea path segment warns", () => {
    const r = validateTestEaExportBundleTexts({
      ...baseInput(),
      bundleLabel: "C:\\Temp\\Mapazapp\\testea\\RUN_A",
    });
    expect(r.warnings.some((w) => w.code === "BUNDLE_EXPORTROOT_LOWERCASE_TESTEA")).toBe(true);
  });

  it("L. E5.3 virtual trades sample bundle passes (default allow trade_count)", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = join(fileURLToPath(new URL(".", import.meta.url)), "../../../artifacts/mt5/experts/Mapazapp_TestEA/samples");
    const r = validateTestEaExportBundleTexts({
      summaryJson: readFileSync(join(dir, "backtest_summary.json"), "utf8"),
      eventsCsv: readFileSync(join(dir, "backtest_events.csv"), "utf8"),
      tradesCsv: readFileSync(join(dir, "backtest_trades.csv"), "utf8"),
      eventsCsvByteLength: 8000,
      bundleLabel: "samples",
    });
    expect(r.ok).toBe(true);
    expect(r.errors).toHaveLength(0);
    expect(r.testEa.tradeCount).toBe(3);
  });

  it("M. trade_count > 0 without has_real_virtual_trade_logic fails", () => {
    const summary = JSON.parse(V2_12_TESTEA_E342_SUMMARY_JSON) as Record<string, unknown>;
    summary.trade_count = 2;
    summary.has_real_virtual_trade_logic = false;
    const trades = [
      "run_id,trade_id,setup_event_id,timestamp,entry_time,exit_time,symbol,timeframe,direction,bias_direction,setup_direction,entry,sl,tp,exit_price,result_r,outcome,exit_reason,setup_reason,bias_reason,rejection_reason,bars_to_fill,bars_held,fvg_low,fvg_high,fvg_points,parameter_set_id,entry_mode,stop_mode,ambiguity_mode",
      "R1,T1,E1,2026-01-01T12:00:00Z,2026-01-01T11:00:00Z,2026-01-01T12:00:00Z,XAUUSD,M15,long,bullish,long,1,0.9,1.2,1.2,2,win,tp_hit,x,y,,0,0,0.9,1.1,20,d,fvg_midpoint,fvg_boundary_with_buffer,ambiguous",
    ].join("\n");
    const r = validateTestEaExportBundleTexts({
      ...baseInput(),
      summaryJson: JSON.stringify(summary),
      tradesCsv: trades,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "TESTEA_SUMMARY_VIRTUAL_TRADE_LOGIC")).toBe(true);
  });

  it("N. requireTradeCountZero rejects summary with trades", () => {
    const summary = JSON.parse(V2_12_TESTEA_E342_SUMMARY_JSON) as Record<string, unknown>;
    summary.trade_count = 1;
    summary.has_real_virtual_trade_logic = true;
    const trades = [
      "run_id,trade_id,setup_event_id,timestamp,entry_time,exit_time,symbol,timeframe,direction,bias_direction,setup_direction,entry,sl,tp,exit_price,result_r,outcome,exit_reason,setup_reason,bias_reason,rejection_reason,bars_to_fill,bars_held,fvg_low,fvg_high,fvg_points,parameter_set_id,entry_mode,stop_mode,ambiguity_mode",
      "R1,T1,E1,2026-01-01T12:00:00Z,2026-01-01T11:00:00Z,2026-01-01T12:00:00Z,XAUUSD,M15,long,bullish,long,1,0.9,1.2,1.2,2,win,tp_hit,x,y,,0,0,0.9,1.1,20,d,fvg_midpoint,fvg_boundary_with_buffer,ambiguous",
    ].join("\n");
    const r = validateTestEaExportBundleTexts(
      { ...baseInput(), summaryJson: JSON.stringify(summary), tradesCsv: trades },
      { requireTradeCountZero: true },
    );
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "BUNDLE_TRADE_COUNT_NONZERO")).toBe(true);
  });
});
