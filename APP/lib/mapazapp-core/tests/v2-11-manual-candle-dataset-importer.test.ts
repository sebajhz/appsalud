import { describe, expect, it } from "vitest";
import {
  createBacktestCampaignDatasetFromManualImport,
  importManualCandleDataset,
} from "../src/manual-candle-dataset-importer";
import {
  V2_11_BAD_OHLC_ALL_FAIL_CSV,
  V2_11_BAD_ROWS_ALL_INVALID_CSV,
  V2_11_BAD_ROWS_CSV,
  V2_11_BRIDGE_CANDLES_XAUUSD_M15_CSV,
  V2_11_DUPLICATE_TIMESTAMPS_CSV,
  V2_11_GENERIC_OHLC_CSV,
  V2_11_MT5_SEMICOLON_CSV,
  V2_11_SYMBOL_MISMATCH_BRIDGE_CSV,
} from "../src/manual-candle-dataset-fixtures";
import { V1_TEST_SYMBOL_PROFILES } from "./test-symbol-profiles";

const baseInput = {
  canonicalSymbol: "XAUUSD",
  brokerSymbol: "XAUUSDm",
  timeframe: "M15",
  datasetSplit: "unknown" as const,
  sourceName: "v2-11-test",
};

describe("V2-11 manual candle dataset importer", () => {
  it("A. BridgeEA candles CSV — parses candles, metadata, sorted valid Candle[]", () => {
    const r = importManualCandleDataset({ ...baseInput, csvText: V2_11_BRIDGE_CANDLES_XAUUSD_M15_CSV });
    expect(r.ok).toBe(true);
    expect(r.dataset?.detectedFormat).toBe("mapazapp_bridge_candles_v1");
    expect(r.dataset?.canonicalSymbol).toBe("XAUUSD");
    expect(r.dataset?.timeframe).toBe("M15");
    expect(r.dataset?.validRowCount).toBe(3);
    const candles = r.dataset!.candles;
    expect(candles.length).toBe(3);
    for (let i = 1; i < candles.length; i++) {
      expect(candles[i]!.time).toBeGreaterThanOrEqual(candles[i - 1]!.time);
    }
    expect(candles[0]!.tickVolume).toBe(120);
    expect(candles[0]!.spreadPoints).toBe(25);
    expect(candles[0]!.isClosed).toBe(true);
  });

  it("B. Generic OHLC — time/open/high/low/close", () => {
    const r = importManualCandleDataset({
      ...baseInput,
      canonicalSymbol: "EURUSD",
      brokerSymbol: "EURUSD",
      csvText: V2_11_GENERIC_OHLC_CSV,
    });
    expect(r.ok).toBe(true);
    expect(r.dataset?.detectedFormat).toBe("generic_ohlc");
    expect(r.dataset?.candles.length).toBe(2);
    expect(r.dataset?.candles[0]!.open).toBeCloseTo(1.1, 4);
  });

  it("C. MT5-like — DATE/TIME + semicolon delimiter", () => {
    const r = importManualCandleDataset({ ...baseInput, csvText: V2_11_MT5_SEMICOLON_CSV });
    expect(r.ok).toBe(true);
    expect(r.validationSummary.delimiter).toBe(";");
    expect(r.dataset?.detectedFormat).toBe("mt5_rates_like");
    expect(r.dataset?.candles.length).toBe(2);
    expect(r.dataset?.candles[0]!.isClosed).toBe(true);
  });

  it("D. Bad rows — skips invalid rows with warnings; fails when none valid", () => {
    const r = importManualCandleDataset({ ...baseInput, csvText: V2_11_BAD_ROWS_CSV });
    expect(r.ok).toBe(true);
    expect(r.dataset?.validRowCount).toBe(2);
    expect(r.warnings.some((w) => w.code === "MANUAL_ROW_SKIPPED")).toBe(true);

    const r2 = importManualCandleDataset({ ...baseInput, csvText: V2_11_BAD_ROWS_ALL_INVALID_CSV });
    expect(r2.ok).toBe(false);
    expect(r2.errors.some((e) => e.code === "MANUAL_NO_VALID_ROWS")).toBe(true);

    const r3 = importManualCandleDataset({ ...baseInput, csvText: V2_11_BAD_OHLC_ALL_FAIL_CSV });
    expect(r3.ok).toBe(false);
    expect(r3.errors.some((e) => e.code === "MANUAL_NO_VALID_ROWS")).toBe(true);
  });

  it("E. Duplicate / unsorted — sorts ascending; duplicate timestamp warning", () => {
    const r = importManualCandleDataset({ ...baseInput, csvText: V2_11_DUPLICATE_TIMESTAMPS_CSV });
    expect(r.ok).toBe(true);
    expect(r.validationSummary.hadUnsortedInput).toBe(true);
    expect(r.warnings.some((w) => w.code === "MANUAL_ROWS_REORDERED")).toBe(true);
    expect(r.warnings.some((w) => w.code === "MANUAL_DUPLICATE_TIMESTAMPS")).toBe(true);
    expect(r.validationSummary.duplicateTimestampCount).toBeGreaterThan(0);
    const t = r.dataset!.candles.map((c) => c.time);
    expect(t[0]).toBeLessThan(t[1]!);
    expect(t[1]).toBe(t[2]);
  });

  it("F. Symbol / timeframe mismatch — warning, not crash", () => {
    const r = importManualCandleDataset({
      ...baseInput,
      csvText: V2_11_SYMBOL_MISMATCH_BRIDGE_CSV,
    });
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.code === "MANUAL_SYMBOL_MISMATCH")).toBe(true);
  });

  it("G. Campaign adapter — maps import result to BacktestCampaignDataset", () => {
    const imp = importManualCandleDataset({ ...baseInput, csvText: V2_11_BRIDGE_CANDLES_XAUUSD_M15_CSV });
    const profile = V1_TEST_SYMBOL_PROFILES.XAUUSD;
    const ds = createBacktestCampaignDatasetFromManualImport(imp, {
      symbolProfile: profile,
      datasetId: "ds_manual_1",
    });
    expect(ds).not.toBeNull();
    expect(ds!.symbol).toBe("XAUUSD");
    expect(ds!.brokerSymbol).toBe("XAUUSDm");
    expect(ds!.timeframe).toBe("M15");
    expect(ds!.candles.length).toBe(3);
    expect(ds!.symbolProfile).toBe(profile);
    expect(ds!.datasetSplit).toBe("unknown");
    expect(ds!.datasetId).toBe("ds_manual_1");
  });

  it("H. No filesystem — importer accepts in-memory CSV string only", () => {
    const r = importManualCandleDataset({
      ...baseInput,
      csvText: V2_11_GENERIC_OHLC_CSV,
    });
    expect(r.ok).toBe(true);
    expect(typeof V2_11_GENERIC_OHLC_CSV).toBe("string");
  });
});
