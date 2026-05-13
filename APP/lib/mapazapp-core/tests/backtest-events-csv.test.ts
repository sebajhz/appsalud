import { describe, expect, it } from "vitest";
import { parseBacktestEventsCsv } from "../src/backtest-events-csv";

describe("backtest_events.csv parser (E3.6)", () => {
  const validHeader =
    "run_id,event_id,timestamp,symbol,event_type,bias_direction,setup_direction,decision,reason,details";

  it("A. valid rows parse ok with supported types", () => {
    const csv = [
      validHeader,
      "R1,EVT_1,2026-01-01T00:00:00Z,XAUUSD,lifecycle_init,unknown,none,ok,OnInit,x",
      "R1,EVT_2,2026-01-01T00:01:00Z,XAUUSD,setup_detected,bullish,long,detected,geom,fvg_low=1",
    ].join("\n");
    const r = parseBacktestEventsCsv(csv);
    expect(r.ok).toBe(true);
    expect(r.rowCount).toBe(2);
    expect(r.errors).toHaveLength(0);
  });

  it("B. unknown event_type fails", () => {
    const csv = [validHeader, "R1,EVT_1,2026-01-01T00:00:00Z,XAUUSD,not_a_real_event,bullish,none,ok,r,d"].join("\n");
    const r = parseBacktestEventsCsv(csv);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "EVENTS_ROW_EVENT_TYPE_UNKNOWN")).toBe(true);
  });

  it("C. unknown decision fails", () => {
    const csv = [validHeader, "R1,EVT_1,2026-01-01T00:00:00Z,XAUUSD,lifecycle_init,bullish,none,bogus_decision,r,d"].join("\n");
    const r = parseBacktestEventsCsv(csv);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "EVENTS_ROW_DECISION_UNKNOWN")).toBe(true);
  });

  it("D. missing required column in header fails", () => {
    const badHeader = validHeader.replace(",details", "");
    const csv = [badHeader, "R1,EVT_1,2026-01-01T00:00:00Z,XAUUSD,lifecycle_init,bullish,none,ok,r"].join("\n");
    const r = parseBacktestEventsCsv(csv);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "EVENTS_CSV_MISSING_COLUMN")).toBe(true);
  });

  it("E. unbalanced quote in data row fails", () => {
    const csv = [
      validHeader,
      'R1,EVT_1,2026-01-01T00:00:00Z,XAUUSD,lifecycle_init,bullish,none,ok,r,"unclosed',
    ].join("\n");
    const r = parseBacktestEventsCsv(csv);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "EVENTS_CSV_UNBALANCED_QUOTE")).toBe(true);
  });

  it("F. details with user path pattern warns", () => {
    const csv = [
      validHeader,
      'R1,EVT_1,2026-01-01T00:00:00Z,XAUUSD,lifecycle_init,bullish,none,ok,r,"c:\\users\\alice\\secret.txt"',
    ].join("\n");
    const r = parseBacktestEventsCsv(csv);
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.code === "EVENTS_DETAILS_POSSIBLE_PATH_LEAK")).toBe(true);
  });

  it("G. bundleContract requires lifecycle_deinit and event_id", () => {
    const csvMissingDeinit = [
      validHeader,
      "R1,EVT_1,2026-01-01T00:00:00Z,XAUUSD,lifecycle_init,unknown,none,ok,OnInit,x",
      "R1,EVT_2,2026-01-01T00:01:00Z,XAUUSD,skeleton_ready,unknown,none,noop,r,x",
      "R1,EVT_3,2026-01-01T00:02:00Z,XAUUSD,daily_bias_evaluated,bullish,none,bias_recorded,r,x",
    ].join("\n");
    const r = parseBacktestEventsCsv(csvMissingDeinit, { bundleContract: true });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "EVENTS_BUNDLE_MISSING_EVENT_TYPE")).toBe(true);

    const csvMissingEventId = [
      validHeader,
      "R1,,2026-01-01T00:00:00Z,XAUUSD,lifecycle_init,unknown,none,ok,OnInit,x",
    ].join("\n");
    const r2 = parseBacktestEventsCsv(csvMissingEventId, { bundleContract: true });
    expect(r2.ok).toBe(false);
    expect(r2.errors.some((e) => e.code === "EVENTS_ROW_EVENT_ID")).toBe(true);
  });

  it("H. virtual_trade_* event types parse under bundleContract", () => {
    const csv = [
      validHeader,
      "R1,EVT_1,2026-01-01T00:00:00Z,XAUUSD,lifecycle_init,unknown,none,ok,OnInit,x",
      "R1,EVT_2,2026-01-01T00:01:00Z,XAUUSD,skeleton_ready,unknown,none,noop,r,x",
      "R1,EVT_3,2026-01-01T00:02:00Z,XAUUSD,daily_bias_evaluated,bullish,none,bias_recorded,r,x",
      "R1,EVT_4,2026-01-01T00:03:00Z,XAUUSD,virtual_trade_closed,bullish,long,closed,tp_hit,\"trade_id=T1\"",
      "R1,EVT_5,2026-01-01T00:04:00Z,XAUUSD,lifecycle_deinit,bullish,none,ok,OnDeinit,x",
    ].join("\n");
    const r = parseBacktestEventsCsv(csv, { bundleContract: true });
    expect(r.ok).toBe(true);
    expect(r.eventTypeCounts?.virtual_trade_closed).toBe(1);
  });

  it("I. virtual_trade_unresolved + decision unresolved parses under bundleContract", () => {
    const csv = [
      validHeader,
      "R1,EVT_1,2026-01-01T00:00:00Z,XAUUSD,lifecycle_init,unknown,none,ok,OnInit,x",
      "R1,EVT_2,2026-01-01T00:01:00Z,XAUUSD,skeleton_ready,unknown,none,noop,r,x",
      "R1,EVT_3,2026-01-01T00:02:00Z,XAUUSD,daily_bias_evaluated,bullish,none,bias_recorded,r,x",
      "R1,EVT_4,2026-01-01T00:03:00Z,XAUUSD,virtual_trade_unresolved,bullish,long,unresolved,deinit_with_active_virtual_trade,\"trade_id=T1\"",
      "R1,EVT_5,2026-01-01T00:04:00Z,XAUUSD,lifecycle_deinit,bullish,none,ok,OnDeinit,x",
    ].join("\n");
    const r = parseBacktestEventsCsv(csv, { bundleContract: true });
    expect(r.ok).toBe(true);
    expect(r.eventTypeCounts?.virtual_trade_unresolved).toBe(1);
  });
});
