import { describe, expect, it } from "vitest";
import {
  analyzeTestEaBundleAmbiguitySensitivityFromTexts,
  analyzeTestEaCampaignAmbiguitySensitivityFromTexts,
  summarizeAmbiguitySensitivity,
} from "../src/testea-ambiguity-sensitivity";

const SUMMARY_MIN = `{
  "schema_version": "backtest_ea_v1",
  "run_id": "RUN_AMBIG",
  "effective_run_id": "RUN_AMBIG",
  "campaign_id": "C1",
  "parameter_set_id": "SET1",
  "strategy_id": "IFVG_X",
  "symbol": "XAUUSD",
  "optimization_parameters": { "virtual_min_trade_fvg_points": 2 },
  "tester_from": "2026-01-01T00:00:00Z",
  "tester_to": "2026-01-10T00:00:00Z"
}`;

const TRADES_MIXED = [
  "trade_id,direction,entry_time,exit_time,entry_price,exit_price,result_r,symbol,strategy_id,parameter_set_id,outcome",
  "t1,BUY,2026-01-01T10:00:00Z,2026-01-01T11:00:00Z,1,1,2,XAUUSD,IFVG_X,SET1,win",
  "t2,BUY,2026-01-02T10:00:00Z,2026-01-02T11:00:00Z,1,1,0,XAUUSD,IFVG_X,SET1,ambiguous",
  "t3,BUY,2026-01-03T10:00:00Z,2026-01-03T11:00:00Z,1,1,-1,XAUUSD,IFVG_X,SET1,loss",
].join("\n");

describe("testea-ambiguity-sensitivity", () => {
  it("neutral_zero keeps ambiguous at 0R", () => {
    const r = analyzeTestEaBundleAmbiguitySensitivityFromTexts(
      { bundleName: "b1", summaryJsonText: SUMMARY_MIN, tradesCsvText: TRADES_MIXED },
      { modes: ["neutral_zero"] },
    );
    expect(r.ok).toBe(true);
    const row = r.rows[0]!;
    expect(row.mode).toBe("neutral_zero");
    expect(row.ambiguousCount).toBe(1);
    expect(row.totalR).toBeCloseTo(1, 5);
  });

  it("conservative_loss counts ambiguous as -1R", () => {
    const r = analyzeTestEaBundleAmbiguitySensitivityFromTexts(
      { bundleName: "b1", summaryJsonText: SUMMARY_MIN, tradesCsvText: TRADES_MIXED },
      { modes: ["conservative_loss"] },
    );
    expect(r.ok).toBe(true);
    const row = r.rows[0]!;
    expect(row.totalR).toBeCloseTo(0, 5);
    expect(row.expectancyR).toBeCloseTo(0, 5);
  });

  it("skip_ambiguous excludes ambiguous from counted expectancy denominator", () => {
    const r = analyzeTestEaBundleAmbiguitySensitivityFromTexts(
      { bundleName: "b1", summaryJsonText: SUMMARY_MIN, tradesCsvText: TRADES_MIXED },
      { modes: ["skip_ambiguous"] },
    );
    expect(r.ok).toBe(true);
    const row = r.rows[0]!;
    expect(row.countedTrades).toBe(2);
    expect(row.ambiguousCount).toBe(1);
    expect(row.totalR).toBeCloseTo(1, 5);
    expect(row.expectancyR).toBeCloseTo(0.5, 5);
  });

  it("max_drawdown_r differs by mode on same fixture", () => {
    const r = analyzeTestEaBundleAmbiguitySensitivityFromTexts(
      { bundleName: "b1", summaryJsonText: SUMMARY_MIN, tradesCsvText: TRADES_MIXED },
      {},
    );
    expect(r.ok).toBe(true);
    const by = Object.fromEntries(r.rows.map((x) => [x.mode, x.maxDrawdownR]));
    expect(by.conservative_loss).toBeGreaterThanOrEqual(by.neutral_zero);
    expect(by.skip_ambiguous).toBeLessThanOrEqual(by.conservative_loss);
  });

  it("campaign analyzer handles multiple bundle inputs", () => {
    const camp = analyzeTestEaCampaignAmbiguitySensitivityFromTexts(
      [
        { bundleName: "a", summaryJsonText: SUMMARY_MIN, tradesCsvText: TRADES_MIXED },
        { bundleName: "b", summaryJsonText: SUMMARY_MIN, tradesCsvText: TRADES_MIXED },
      ],
      { modes: ["neutral_zero"] },
    );
    expect(camp.bundles).toHaveLength(2);
    expect(camp.flatRows).toHaveLength(2);
  });

  it("summarizeAmbiguitySensitivity sorts by total_r descending", () => {
    const hiCsv = [
      "trade_id,direction,entry_time,exit_time,entry_price,exit_price,result_r,symbol,strategy_id,parameter_set_id,outcome",
      "t1,BUY,2026-01-01T10:00:00Z,2026-01-01T11:00:00Z,1,1,2,XAUUSD,IFVG_X,SET1,win",
    ].join("\n");
    const rLo = analyzeTestEaBundleAmbiguitySensitivityFromTexts(
      { bundleName: "lo", summaryJsonText: SUMMARY_MIN, tradesCsvText: TRADES_MIXED },
      { modes: ["neutral_zero"] },
    );
    const rHi = analyzeTestEaBundleAmbiguitySensitivityFromTexts(
      { bundleName: "hi", summaryJsonText: SUMMARY_MIN, tradesCsvText: hiCsv },
      { modes: ["neutral_zero"] },
    );
    const flat = [...rLo.rows, ...rHi.rows];
    const s = summarizeAmbiguitySensitivity(flat, { sortBy: "total_r" });
    expect(s[0]!.totalR).toBeGreaterThanOrEqual(s[1]!.totalR);
  });
});
