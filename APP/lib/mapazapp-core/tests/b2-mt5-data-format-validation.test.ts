import { describe, expect, it } from "vitest";
import { importManualCandleDataset } from "../src/manual-candle-dataset-importer";

/** B2 — MT5 / manual CSV shape exercises via `importManualCandleDataset` only (no production edits). */

const base = {
  canonicalSymbol: "XAUUSD",
  brokerSymbol: "XAUUSD.m",
  timeframe: "M15",
  datasetSplit: "unknown" as const,
  sourceName: "b2-mt5-format",
};

/** Minimal BridgeEA-shaped header + one valid row (synthetic). */
function bridgeRow(isClosed: boolean, csvSym = "XAUUSD", csvTf = "M15"): string {
  const hdr =
    "schema_version,export_id,exported_at_utc,terminal_id,account_login,symbol,timeframe,candle_time_utc,open,high,low,close,tick_volume,spread_points,real_volume,is_closed,source";
  const closed = isClosed ? "true" : "false";
  const row = `MZP_BRIDGE_V1,b2_exp,2024-01-01T09:00:00Z,TERM_B2,0,${csvSym},${csvTf},2024-01-01T10:00:00Z,2000.0,2001.0,1999.0,2000.5,100,20,0,${closed},MAPZAPP_B2_FIXTURE`;
  return [hdr, row].join("\n");
}

describe("B2 MT5 / manual CSV data format validation", () => {
  it("A1. Generic OHLC — timestamp + OHLC parses", () => {
    const csv = ["timestamp,open,high,low,close", "2024-06-10T12:00:00Z,1.0,1.02,0.99,1.01"].join("\n");
    const r = importManualCandleDataset({ ...base, csvText: csv });
    expect(r.ok).toBe(true);
    expect(r.dataset?.detectedFormat).toBe("generic_ohlc");
    expect(r.dataset?.candles).toHaveLength(1);
    expect(r.dataset?.candles[0]!.time).toBe(Date.UTC(2024, 5, 10, 12, 0, 0));
  });

  it("A2. Missing required OHLC column — unrecognized format (controlled failure)", () => {
    const csv = ["timestamp,open,high,low", "2024-06-10T12:00:00Z,1.0,1.02,0.99"].join("\n");
    const r = importManualCandleDataset({ ...base, csvText: csv });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "MANUAL_FORMAT_UNRECOGNIZED")).toBe(true);
  });

  it("A3. Incompatible headers — schema error (unrecognized)", () => {
    const csv = ["foo,bar,baz", "1,2,3"].join("\n");
    const r = importManualCandleDataset({ ...base, csvText: csv });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "MANUAL_FORMAT_UNRECOGNIZED")).toBe(true);
  });

  it("A4. formatHint mismatch — MANUAL_FORMAT_HINT_MISMATCH", () => {
    const csv = ["timestamp,open,high,low,close", "2024-06-10T12:00:00Z,1.0,1.02,0.99,1.01"].join("\n");
    const r = importManualCandleDataset({
      ...base,
      csvText: csv,
      formatHint: "mt5_rates_like",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "MANUAL_FORMAT_HINT_MISMATCH")).toBe(true);
  });

  it("A5. Bridge missing close column — hint bridge fails with MANUAL_FORMAT_HINT_MISMATCH (detector never yields partial bridge)", () => {
    const hdr =
      "schema_version,export_id,exported_at_utc,terminal_id,account_login,symbol,timeframe,candle_time_utc,open,high,low,tick_volume,spread_points,real_volume,is_closed,source";
    const row =
      "MZP_BRIDGE_V1,b2_exp,2024-01-01T09:00:00Z,TERM_B2,0,XAUUSD,M15,2024-01-01T10:00:00Z,2000.0,2001.0,1999.0,100,20,0,true,MAPZAPP_B2_FIXTURE";
    const r = importManualCandleDataset({
      ...base,
      csvText: [hdr, row].join("\n"),
      formatHint: "mapazapp_bridge_candles_v1",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "MANUAL_FORMAT_HINT_MISMATCH")).toBe(true);
  });

  it("B1. Invalid timestamp — row skipped; fails if no valid rows", () => {
    const csv = ["timestamp,open,high,low,close", "not-a-date,1.0,1.1,0.9,1.02"].join("\n");
    const r = importManualCandleDataset({ ...base, csvText: csv });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "MANUAL_NO_VALID_ROWS")).toBe(true);
    expect(r.warnings.some((w) => w.code === "MANUAL_ROW_SKIPPED")).toBe(true);
  });

  it("B2. Unsorted rows — reordered ascending with MANUAL_ROWS_REORDERED", () => {
    const csv = [
      "timestamp,open,high,low,close",
      "2024-06-10T14:00:00Z,1.02,1.03,1.01,1.025",
      "2024-06-10T12:00:00Z,1.0,1.01,0.99,1.005",
    ].join("\n");
    const r = importManualCandleDataset({ ...base, csvText: csv });
    expect(r.ok).toBe(true);
    expect(r.validationSummary.hadUnsortedInput).toBe(true);
    expect(r.warnings.some((w) => w.code === "MANUAL_ROWS_REORDERED")).toBe(true);
    expect(r.dataset!.candles[0]!.time).toBeLessThan(r.dataset!.candles[1]!.time);
  });

  it("B3. Duplicate timestamps — warning + duplicateTimestampCount", () => {
    const csv = [
      "timestamp,open,high,low,close",
      "2024-06-10T12:00:00Z,1.0,1.02,0.99,1.01",
      "2024-06-10T12:00:00Z,1.01,1.03,1.0,1.02",
    ].join("\n");
    const r = importManualCandleDataset({ ...base, csvText: csv });
    expect(r.ok).toBe(true);
    expect(r.validationSummary.duplicateTimestampCount).toBe(1);
    expect(r.warnings.some((w) => w.code === "MANUAL_DUPLICATE_TIMESTAMPS")).toBe(true);
  });

  it("B4. Gap: future timestamps are not rejected — importer still succeeds", () => {
    const csv = ["timestamp,open,high,low,close", "2099-12-31T23:00:00Z,1.0,1.01,0.99,1.005"].join("\n");
    const r = importManualCandleDataset({ ...base, csvText: csv });
    expect(r.ok).toBe(true);
    expect(r.dataset?.candles).toHaveLength(1);
  });

  it("C1. high below low — OHLC inconsistency, row skipped", () => {
    const csv = [
      "timestamp,open,high,low,close",
      "2024-06-10T12:00:00Z,1.0,0.5,1.2,1.02",
      "2024-06-10T13:00:00Z,1.02,1.05,1.01,1.04",
    ].join("\n");
    const r = importManualCandleDataset({ ...base, csvText: csv });
    expect(r.ok).toBe(true);
    expect(r.dataset?.validRowCount).toBe(1);
    expect(r.warnings.some((w) => w.message.includes("OHLC inconsistency"))).toBe(true);
  });

  it("C2. Non-numeric OHLC — skipped", () => {
    const csv = ["timestamp,open,high,low,close", "2024-06-10T12:00:00Z,x,1.1,0.9,1.02"].join("\n");
    const r = importManualCandleDataset({ ...base, csvText: csv });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "MANUAL_NO_VALID_ROWS")).toBe(true);
  });

  it("C3. Empty OHLC cell — skipped", () => {
    const csv = ["timestamp,open,high,low,close", "2024-06-10T12:00:00Z,,1.1,0.9,1.02"].join("\n");
    const r = importManualCandleDataset({ ...base, csvText: csv });
    expect(r.ok).toBe(false);
    expect(r.warnings.some((w) => w.code === "MANUAL_ROW_SKIPPED")).toBe(true);
  });

  it("D1. Broker suffix — passthrough via brokerSymbol input (no automatic GOLD/XAUUSD mapping)", () => {
    const csv = ["timestamp,open,high,low,close", "2024-06-10T12:00:00Z,1.0,1.02,0.99,1.01"].join("\n");
    const r = importManualCandleDataset({
      ...base,
      canonicalSymbol: "XAUUSD",
      brokerSymbol: "XAUUSD.raw",
      csvText: csv,
    });
    expect(r.ok).toBe(true);
    expect(r.dataset?.canonicalSymbol).toBe("XAUUSD");
    expect(r.dataset?.brokerSymbol).toBe("XAUUSD.raw");
  });

  it("E1. Gap: timeframe input is opaque string — H1/H4/D1 accepted without validation helper", () => {
    const csv = ["timestamp,open,high,low,close", "2024-06-10T12:00:00Z,1.0,1.02,0.99,1.01"].join("\n");
    for (const tf of ["H1", "H4", "D1", "not_a_tf"]) {
      const r = importManualCandleDataset({ ...base, timeframe: tf, csvText: csv });
      expect(r.ok).toBe(true);
      expect(r.dataset?.timeframe).toBe(tf);
    }
  });

  it("F1. Bridge is_closed false preserved on candle", () => {
    const r = importManualCandleDataset({
      ...base,
      csvText: bridgeRow(false),
      formatHint: "mapazapp_bridge_candles_v1",
    });
    expect(r.ok).toBe(true);
    expect(r.dataset?.candles[0]!.isClosed).toBe(false);
  });

  it("F2. MT5-like rows always set isClosed true (forming-candle metadata gap for mt5_rates_like)", () => {
    const csv = [
      "<DATE>;<TIME>;<OPEN>;<HIGH>;<LOW>;<CLOSE>",
      "2024.06.10;12:00:00;1.0;1.02;0.99;1.01",
    ].join("\n");
    const r = importManualCandleDataset({ ...base, csvText: csv });
    expect(r.ok).toBe(true);
    expect(r.dataset?.detectedFormat).toBe("mt5_rates_like");
    expect(r.dataset?.candles[0]!.isClosed).toBe(true);
  });

  it("G1. Empty CSV — MANUAL_CSV_EMPTY", () => {
    const r = importManualCandleDataset({ ...base, csvText: "" });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "MANUAL_CSV_EMPTY")).toBe(true);
    expect(r.dataset).toBeNull();
  });

  it("H1. Determinism — identical CSV yields identical candles", () => {
    const csv = [
      "timestamp,open,high,low,close",
      "2024-06-10T12:00:00Z,1.0,1.02,0.99,1.01",
      "2024-06-10T13:00:00Z,1.01,1.03,1.0,1.02",
    ].join("\n");
    const a = importManualCandleDataset({ ...base, csvText: csv });
    const b = importManualCandleDataset({ ...base, csvText: csv });
    expect(a.ok && b.ok).toBe(true);
    expect(JSON.stringify(a.dataset!.candles)).toBe(JSON.stringify(b.dataset!.candles));
  });

  it("Bridge timeframe mismatch vs input — MANUAL_TIMEFRAME_MISMATCH warning", () => {
    const r = importManualCandleDataset({
      ...base,
      timeframe: "M15",
      csvText: bridgeRow(true, "XAUUSD", "H1"),
      formatHint: "mapazapp_bridge_candles_v1",
    });
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.code === "MANUAL_TIMEFRAME_MISMATCH")).toBe(true);
  });

  it("MT5-like non-numeric date parts — parse fails, row skipped", () => {
    const csv = [
      "<DATE>;<TIME>;<OPEN>;<HIGH>;<LOW>;<CLOSE>",
      "not.a.date;12:00:00;1.0;1.02;0.99;1.01",
    ].join("\n");
    const r = importManualCandleDataset({ ...base, csvText: csv });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "MANUAL_NO_VALID_ROWS")).toBe(true);
    expect(r.warnings.some((w) => w.message.includes("invalid MT5 OHLC or date/time"))).toBe(true);
  });
});
