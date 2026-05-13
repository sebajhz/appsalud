import { describe, expect, it } from "vitest";
import { importBacktestTradesFromCsv } from "../src/backtest-importer";
import type { ImportBacktestCsvOptions } from "../src/backtest-types";

const baseOpts: ImportBacktestCsvOptions = {
  strategyId: "IFVG_XAUUSD_V1",
  parameterSetId: "default",
  canonicalSymbol: "XAUUSD",
  datasetSplit: "validation",
  sourceType: "mapazapp_testea_csv",
  runId: "GEOM_TEST",
};

function compactTradesHeader(): string {
  return [
    "run_id",
    "trade_id",
    "setup_event_id",
    "timestamp",
    "entry_time",
    "exit_time",
    "symbol",
    "timeframe",
    "direction",
    "bias_direction",
    "setup_direction",
    "entry",
    "sl",
    "tp",
    "exit_price",
    "result_r",
    "result_money",
    "outcome",
    "exit_reason",
    "setup_reason",
    "bias_reason",
    "rejection_reason",
    "bars_to_fill",
    "bars_held",
    "fvg_low",
    "fvg_high",
    "fvg_points",
    "parameter_set_id",
    "entry_mode",
    "stop_mode",
    "ambiguity_mode",
  ].join(",");
}

describe("E5.4.1 backtest_trades.csv geometry (importer warnings)", () => {
  it("A. valid long geometry passes without geometry warnings", () => {
    const csv = [
      compactTradesHeader(),
      "GEOM_TEST,VTR_1,E1,2026-01-01T12:00:00Z,2026-01-01T11:00:00Z,2026-01-01T12:00:00Z,XAUUSD,M15,long,bullish,long,2650.65,2650.10,2651.85,2651.85,2,0,win,tp_hit,x,y,,0,0,2650.10,2651.20,110,default,fvg_midpoint,fvg_boundary_with_buffer,ambiguous",
    ].join("\n");
    const r = importBacktestTradesFromCsv(csv, baseOpts);
    expect(r.ok).toBe(true);
    expect(r.warnings.filter((w) => w.code.startsWith("CSV_GEOMETRY"))).toHaveLength(0);
  });

  it("B. long entry <= sl warns (CSV_GEOMETRY_LONG_SL)", () => {
    const csv = [
      compactTradesHeader(),
      "GEOM_TEST,VTR_1,E1,2026-01-01T12:00:00Z,2026-01-01T11:00:00Z,2026-01-01T12:00:00Z,XAUUSD,M15,long,bullish,long,2650.10,2650.10,2651.00,2651.00,0,0,ambiguous,x,y,,0,0,2650.10,2651.00,90,default,fvg_midpoint,fvg_boundary_with_buffer,ambiguous",
    ].join("\n");
    const r = importBacktestTradesFromCsv(csv, baseOpts);
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.code === "CSV_GEOMETRY_LONG_SL")).toBe(true);
  });

  it("C. short entry >= sl warns (CSV_GEOMETRY_SHORT_SL)", () => {
    const csv = [
      compactTradesHeader(),
      "GEOM_TEST,VTR_1,E1,2026-01-01T12:00:00Z,2026-01-01T11:00:00Z,2026-01-01T12:00:00Z,XAUUSD,M15,short,bearish,short,2648.20,2648.20,2647.00,2647.00,0,0,ambiguous,x,y,,0,0,2647.50,2648.90,140,default,fvg_midpoint,fvg_boundary_with_buffer,ambiguous",
    ].join("\n");
    const r = importBacktestTradesFromCsv(csv, baseOpts);
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.code === "CSV_GEOMETRY_SHORT_SL")).toBe(true);
  });

  it("D. non-positive risk warns (CSV_GEOMETRY_RISK_NONPOSITIVE)", () => {
    const csv = [
      compactTradesHeader(),
      "GEOM_TEST,VTR_1,E1,2026-01-01T12:00:00Z,2026-01-01T11:00:00Z,2026-01-01T12:00:00Z,XAUUSD,M15,long,bullish,long,2650.50,2650.60,2651.00,2651.00,0,0,ambiguous,x,y,,0,0,2650.10,2651.00,90,default,fvg_midpoint,fvg_boundary_with_buffer,ambiguous",
    ].join("\n");
    const r = importBacktestTradesFromCsv(csv, baseOpts);
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.code === "CSV_GEOMETRY_RISK_NONPOSITIVE")).toBe(true);
  });

  it("E. unresolved outcome imports cleanly", () => {
    const csv = [
      compactTradesHeader(),
      "GEOM_TEST,VTR_1,E1,2026-01-01T12:00:00Z,2026-01-01T11:00:00Z,2026-01-01T12:00:00Z,XAUUSD,M15,long,bullish,long,2650.65,2650.10,2651.85,2650.70,0,0,unresolved,deinit_with_active_virtual_trade,x,y,,0,0,2650.10,2651.20,110,default,fvg_midpoint,fvg_boundary_with_buffer,ambiguous",
    ].join("\n");
    const r = importBacktestTradesFromCsv(csv, baseOpts);
    expect(r.ok).toBe(true);
    expect(r.trades[0]?.outcome).toBe("unresolved");
  });

  it("F. long TP <= entry warns (CSV_GEOMETRY_LONG_TP)", () => {
    const csv = [
      compactTradesHeader(),
      "GEOM_TEST,VTR_1,E1,2026-01-01T12:00:00Z,2026-01-01T11:00:00Z,2026-01-01T12:00:00Z,XAUUSD,M15,long,bullish,long,2650.65,2650.10,2650.50,2650.50,0,0,loss,sl_hit,x,y,,0,0,2650.10,2651.20,110,default,fvg_midpoint,fvg_boundary_with_buffer,ambiguous",
    ].join("\n");
    const r = importBacktestTradesFromCsv(csv, baseOpts);
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.code === "CSV_GEOMETRY_LONG_TP")).toBe(true);
  });
});
