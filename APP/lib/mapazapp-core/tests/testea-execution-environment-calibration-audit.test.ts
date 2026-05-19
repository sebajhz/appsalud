import { describe, expect, it } from "vitest";
import {
  analyzeTestEaExecutionEnvironmentCalibrationAuditFromTexts,
  classifyVolatilityFromAtr,
  flattenExecutionEnvironmentCalibrationAuditCsvRows,
} from "../src/testea-execution-environment-calibration-audit";

const SUMMARY_SSV = JSON.stringify({
  has_session_spread_volatility_v1_logic: true,
  session_spread_volatility_enabled: true,
});

const BASE_HDR =
  "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held";

const SSV_COLS =
  "session_spread_volatility_enabled,session_bucket,session_phase,session_hour,session_timezone_offset_hours,is_asian_session,is_london_session,is_new_york_session,is_london_new_york_overlap,is_off_session,spread_context_enabled,spread_points,spread_bucket,spread_is_warning,spread_is_high,spread_is_extreme,volatility_context_enabled,volatility_atr_points,volatility_bucket,volatility_is_low,volatility_is_high,volatility_is_extreme,volatility_range_points,volatility_range_to_atr_ratio,execution_environment_score,execution_environment_grade,execution_environment_reasons";

function tradesCsv(...rows: string[]): string {
  return `${BASE_HDR},${SSV_COLS}\n${rows.join("\n")}`;
}

function ssvRow(
  id: string,
  outcome: string,
  opts: {
    session?: string;
    spread?: string;
    spreadPts?: number;
    vol?: string;
    atr?: number;
    range?: number;
    ratio?: number;
    score?: number;
    grade?: string;
    reasons?: string;
  },
): string {
  const session = opts.session ?? "london";
  const spread = opts.spread ?? "normal";
  const vol = opts.vol ?? "extreme";
  const atr = opts.atr ?? 850;
  const range = opts.range ?? 900;
  const ratio = opts.ratio ?? 1.05;
  const score = opts.score ?? 4;
  const grade = opts.grade ?? "Weak";
  const reasons = opts.reasons ?? "volatility_extreme|session_london";
  const spreadPts = opts.spreadPts ?? 7;
  return [
    id,
    "BUY",
    "2026-01-10T12:00:00Z",
    "2026-01-10T14:00:00Z",
    2000,
    1990,
    2100,
    2100,
    outcome === "win" ? 2 : -1,
    0,
    outcome,
    2,
    5,
    true,
    session,
    "session_mid_window",
    12,
    0,
    session === "asian" ? "true" : "false",
    session === "london" ? "true" : "false",
    "false",
    "false",
    session === "off_session" ? "true" : "false",
    true,
    spreadPts,
    spread,
    spread === "warning" ? "true" : "false",
    spread === "high" ? "true" : "false",
    "false",
    true,
    atr,
    vol,
    vol === "low" ? "true" : "false",
    vol === "high" ? "true" : "false",
    vol === "extreme" ? "true" : "false",
    range,
    ratio,
    score,
    grade,
    reasons,
  ].join(",");
}

describe("testea-execution-environment-calibration-audit (E5.16.2)", () => {
  it("classifies ATR with MQL5 V1 thresholds", () => {
    expect(classifyVolatilityFromAtr(50, { lowBelow: 80, highAt: 250, extremeAt: 400 })).toBe("low");
    expect(classifyVolatilityFromAtr(150, { lowBelow: 80, highAt: 250, extremeAt: 400 })).toBe("normal");
    expect(classifyVolatilityFromAtr(300, { lowBelow: 80, highAt: 250, extremeAt: 400 })).toBe("high");
    expect(classifyVolatilityFromAtr(850, { lowBelow: 80, highAt: 250, extremeAt: 400 })).toBe("extreme");
  });

  it("aggregates session/spread/vol buckets and cross-tabs", () => {
    const csv = tradesCsv(
      ssvRow("t1", "win", { session: "london", spread: "normal", vol: "extreme", atr: 850 }),
      ssvRow("t2", "loss", { session: "off_session", spread: "normal", vol: "normal", atr: 120, grade: "B", score: 10 }),
    );
    const r = analyzeTestEaExecutionEnvironmentCalibrationAuditFromTexts(
      { bundleName: "ssv", summaryJsonText: SUMMARY_SSV, tradesCsvText: csv },
      { maxExamples: 5 },
    );
    expect(r.ok).toBe(true);
    expect(r.overall.trade_count).toBe(2);
    expect(r.overall.volatility_buckets["extreme"]).toBe(1);
    expect(r.overall.volatility_buckets["normal"]).toBe(1);
    expect(r.outcome_by_session_bucket.counts["win"]?.["london"]).toBe(1);
    expect(r.atr_points_stats.median).not.toBeNull();
  });

  it("simulates threshold sensitivity profiles", () => {
    const csv = tradesCsv(
      ssvRow("t1", "win", { vol: "extreme", atr: 850 }),
      ssvRow("t2", "win", { vol: "extreme", atr: 600 }),
      ssvRow("t3", "win", { vol: "normal", atr: 120 }),
    );
    const r = analyzeTestEaExecutionEnvironmentCalibrationAuditFromTexts(
      { bundleName: "sens", summaryJsonText: SUMMARY_SSV, tradesCsvText: csv },
    );
    const mql5 = r.threshold_sensitivity.find((p) => p.profile === "mql5_v1_simulated");
    const candA = r.threshold_sensitivity.find((p) => p.profile === "profile_xauusd_m15_candidate_a");
    expect(mql5?.counts.extreme_count).toBeGreaterThanOrEqual(2);
    expect(candA?.counts.extreme_count).toBeLessThanOrEqual(mql5?.counts.extreme_count ?? 99);
    expect(r.threshold_sensitivity.find((p) => p.profile === "profile_xauusd_m15_candidate_c")).toBeDefined();
  });

  it("flags volatility thresholds and spread not primary for extreme-heavy bundle", () => {
    const rows: string[] = [];
    for (let i = 0; i < 20; i++) {
      rows.push(
        ssvRow(`t${i}`, i % 3 === 0 ? "win" : "loss", {
          vol: "extreme",
          atr: 800 + i,
          spread: "normal",
          grade: "Weak",
          score: 3,
        }),
      );
    }
    const r = analyzeTestEaExecutionEnvironmentCalibrationAuditFromTexts(
      { bundleName: "heavy", summaryJsonText: SUMMARY_SSV, tradesCsvText: tradesCsv(...rows) },
    );
    expect(r.interpretation_flags).toContain("VOLATILITY_THRESHOLDS_TOO_LOW_FOR_XAUUSD_M15");
    expect(r.interpretation_flags).toContain("SPREAD_NOT_PRIMARY_ISSUE");
    expect(r.interpretation_flags).toContain("PROFILE_SPECIFIC_THRESHOLDS_RECOMMENDED");
  });

  it("collects examples by category", () => {
    const csv = tradesCsv(
      ssvRow("t1", "win", { vol: "extreme", grade: "Weak" }),
      ssvRow("t2", "win", { vol: "normal", grade: "B", score: 11 }),
    );
    const r = analyzeTestEaExecutionEnvironmentCalibrationAuditFromTexts(
      { bundleName: "ex", summaryJsonText: SUMMARY_SSV, tradesCsvText: csv },
      { maxExamples: 3 },
    );
    expect(r.examples.some((e) => e.category === "current_extreme_volatility")).toBe(true);
    expect(r.examples.some((e) => e.category === "normal_volatility")).toBe(true);
    expect(r.examples.some((e) => e.category === "ab_environment_grade")).toBe(true);
  });

  it("flattens CSV rows for CLI export", () => {
    const csv = tradesCsv(ssvRow("t1", "win", {}));
    const r = analyzeTestEaExecutionEnvironmentCalibrationAuditFromTexts(
      { bundleName: "flat", summaryJsonText: SUMMARY_SSV, tradesCsvText: csv },
    );
    const flat = flattenExecutionEnvironmentCalibrationAuditCsvRows(r);
    expect(flat.some((row) => row.section === "overall" && row.bucket === "trade_count")).toBe(true);
    expect(flat.some((row) => row.section === "threshold_sensitivity")).toBe(true);
  });

  it("errors when E5.16 columns missing", () => {
    const csv = `${BASE_HDR}\nt1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2100,2100,2,0,win,2,5`;
    const r = analyzeTestEaExecutionEnvironmentCalibrationAuditFromTexts({
      bundleName: "bad",
      summaryJsonText: SUMMARY_SSV,
      tradesCsvText: csv,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("session_spread_volatility_enabled"))).toBe(true);
  });
});
