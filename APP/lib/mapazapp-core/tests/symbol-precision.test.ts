import { describe, expect, it } from "vitest";
import {
  buildZoneBounds,
  nearlyEqual,
  normalizeVolume,
  roundToTickSize,
  spreadPointsToPrice,
  sweepTolerancePrice,
} from "../src/index";
import { V1_TEST_SYMBOL_PROFILES } from "./test-symbol-profiles";

describe("roundToTickSize + profiles (V1 test assumptions)", () => {
  it("XAUUSD rounds to 0.01", () => {
    const p = V1_TEST_SYMBOL_PROFILES.XAUUSD;
    expect(roundToTickSize(2650.256, p.tickSize)).toBe(2650.26);
    expect(roundToTickSize(2650.251, p.tickSize, "down")).toBe(2650.25);
  });

  it("EURUSD rounds to 0.00001", () => {
    const p = V1_TEST_SYMBOL_PROFILES.EURUSD;
    expect(roundToTickSize(1.052284, p.tickSize)).toBe(1.05228);
  });

  it("USDJPY rounds to 0.001", () => {
    const p = V1_TEST_SYMBOL_PROFILES.USDJPY;
    expect(roundToTickSize(149.8764, p.tickSize)).toBe(149.876);
  });

  it("NAS100 rounds to 0.1", () => {
    const p = V1_TEST_SYMBOL_PROFILES.NAS100;
    expect(roundToTickSize(19555.37, p.tickSize)).toBe(19555.4);
  });

  it("BTCUSD rounds to 0.1", () => {
    const p = V1_TEST_SYMBOL_PROFILES.BTCUSD;
    expect(roundToTickSize(98123.44, p.tickSize)).toBe(98123.4);
  });
});

describe("spreadPointsToPrice", () => {
  it("matches stored spreadPrice for test profiles", () => {
    for (const key of Object.keys(V1_TEST_SYMBOL_PROFILES) as (keyof typeof V1_TEST_SYMBOL_PROFILES)[]) {
      const p = V1_TEST_SYMBOL_PROFILES[key];
      const computed = spreadPointsToPrice(p.spreadPoints, p.point);
      expect(nearlyEqual(computed, p.spreadPrice, 1e-8)).toBe(true);
    }
  });
});

describe("sweepTolerancePrice", () => {
  it("uses max(ATR·f, spread·f, tick·n) for XAUUSD", () => {
    const p = V1_TEST_SYMBOL_PROFILES.XAUUSD;
    const atr = 12.0;
    const tol = sweepTolerancePrice({
      atr,
      sweepToleranceAtr: 0.05,
      spreadPrice: p.spreadPrice,
      sweepSpreadFactor: 1.5,
      tickSize: p.tickSize,
      minSweepTicks: 3,
    });
    const expected = Math.max(0.6, 0.375, 0.03);
    expect(nearlyEqual(tol, expected)).toBe(true);
  });
});

describe("normalizeVolume", () => {
  it("snaps EURUSD lot to step", () => {
    const p = V1_TEST_SYMBOL_PROFILES.EURUSD;
    expect(normalizeVolume(0.055, p.volumeMin, p.volumeMax, p.volumeStep)).toBe(0.06);
    expect(normalizeVolume(0.001, p.volumeMin, p.volumeMax, p.volumeStep)).toBe(0.01);
  });
});

describe("buildZoneBounds", () => {
  it("pads IFVG range for BTCUSD", () => {
    const p = V1_TEST_SYMBOL_PROFILES.BTCUSD;
    const pad = 2.37;
    const b = buildZoneBounds(98000.0, 98004.0, pad, p.tickSize);
    expect(b.zoneLow).toBe(roundToTickSize(98000 - pad, p.tickSize, "down"));
    expect(b.zoneHigh).toBe(roundToTickSize(98004 + pad, p.tickSize, "up"));
  });
});
