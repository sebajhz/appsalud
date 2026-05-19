import { describe, expect, it } from "vitest";
import {
  analyzeTestEaLiquidityTargetRealismAuditFromTexts,
  flattenTargetRealismAuditCsvRows,
} from "../src/testea-liquidity-target-realism-audit";

const SUMMARY_LQ = JSON.stringify({
  has_liquidity_target_quality_v1_logic: true,
  liquidity_target_quality_enabled: true,
});

const BASE_HDR =
  "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held";

const LQ_COLS =
  "liquidity_target_quality_enabled,liquidity_target_direction,liquidity_target_official_tp_price,liquidity_target_official_tp_distance_points,liquidity_target_nearest_price,liquidity_target_nearest_type,liquidity_target_nearest_distance_points,liquidity_target_reached_by_official_tp,liquidity_target_tp_before_nearest_liquidity,liquidity_target_tp_beyond_nearest_liquidity,liquidity_target_too_far_beyond_nearest_liquidity,liquidity_target_has_equal_level,liquidity_target_equal_level_price,liquidity_target_equal_level_distance_points,liquidity_target_has_swing_target,liquidity_target_swing_price,liquidity_target_swing_distance_points,liquidity_target_has_htf_external_target,liquidity_target_htf_external_price,liquidity_target_htf_external_distance_points,liquidity_target_supported,liquidity_target_conflict,liquidity_target_score,liquidity_target_grade,liquidity_target_reasons";

function tradesCsv(...rows: string[]): string {
  return `${BASE_HDR},${LQ_COLS}\n${rows.join("\n")}`;
}

function lqRow(
  id: string,
  outcome: string,
  opts: {
    tpDist: number;
    nearDist: number;
    before?: boolean;
    beyond?: boolean;
    reached?: boolean;
    supported?: boolean;
    grade?: string;
    score?: number;
    reasons?: string;
    nearType?: string;
    missing?: boolean;
  },
): string {
  const tp = 2000 + opts.tpDist;
  const near = 2000 + opts.nearDist;
  const before = opts.before ?? opts.nearDist > opts.tpDist;
  const beyond = opts.beyond ?? opts.tpDist > opts.nearDist;
  const reached = opts.reached ?? false;
  const supported = opts.supported ?? reached;
  const grade = opts.grade ?? "C";
  const score = opts.score ?? 8;
  const reasons = opts.reasons ?? (opts.missing ? "liquidity_target_missing" : "liquidity_target_ok");
  const nearType = opts.nearType ?? (opts.missing ? "unknown" : "swing_high");
  const nearDist = opts.missing ? -1 : opts.nearDist;
  return [
    id,
    "BUY",
    "2026-01-10T12:00:00Z",
    "2026-01-10T14:00:00Z",
    2000,
    1990,
    tp,
    tp,
    outcome === "win" ? 2 : -1,
    0,
    outcome,
    2,
    5,
    true,
    "BUY",
    tp,
    opts.tpDist,
    near,
    nearType,
    nearDist,
    reached ? "true" : "false",
    before ? "true" : "false",
    beyond ? "true" : "false",
    "false",
    "true",
    near,
    opts.nearDist,
    "true",
    near,
    opts.nearDist,
    "true",
    near,
    opts.nearDist,
    supported ? "true" : "false",
    "false",
    score,
    grade,
    reasons,
  ].join(",");
}

describe("testea-liquidity-target-realism-audit (E5.15.2)", () => {
  it("counts conservative before-nearest trades", () => {
    const csv = tradesCsv(
      lqRow("t1", "win", { tpDist: 280, nearDist: 900, before: true, grade: "C" }),
      lqRow("t2", "loss", { tpDist: 300, nearDist: 500, before: false, beyond: true, grade: "B" }),
    );
    const r = analyzeTestEaLiquidityTargetRealismAuditFromTexts(
      { bundleName: "cons", summaryJsonText: SUMMARY_LQ, tradesCsvText: csv },
      { maxExamples: 5 },
    );
    expect(r.ok).toBe(true);
    expect(r.overall.trade_count).toBe(2);
    expect(r.overall.before_nearest_count).toBe(1);
    expect(r.overall.beyond_nearest_count).toBe(1);
    const conservative = r.buckets.find((b) => b.bucket === "conservative_tp_before_liquidity");
    expect(conservative?.count).toBe(1);
  });

  it("computes distance stats and shortfall when before nearest", () => {
    const csv = tradesCsv(lqRow("t1", "win", { tpDist: 280, nearDist: 900, before: true }));
    const r = analyzeTestEaLiquidityTargetRealismAuditFromTexts(
      { bundleName: "dist", summaryJsonText: SUMMARY_LQ, tradesCsvText: csv },
    );
    expect(r.distance_stats.official_tp_distance_points.average).toBeCloseTo(280, 1);
    expect(r.distance_stats.nearest_liquidity_distance_points.average).toBeCloseTo(900, 1);
    expect(r.distance_stats.tp_shortfall_to_nearest_when_before.average).toBeCloseTo(620, 1);
  });

  it("flags OFFICIAL_TP_OFTEN_CONSERVATIVE when majority before nearest", () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      lqRow(`t${i}`, "win", { tpDist: 200, nearDist: 800, before: true }),
    );
    const csv = tradesCsv(...rows);
    const r = analyzeTestEaLiquidityTargetRealismAuditFromTexts(
      { bundleName: "flags", summaryJsonText: SUMMARY_LQ, tradesCsvText: csv },
    );
    expect(r.interpretation_flags).toContain("OFFICIAL_TP_OFTEN_CONSERVATIVE");
  });

  it("classifies missing liquidity target", () => {
    const csv = tradesCsv(lqRow("m1", "loss", { tpDist: 280, nearDist: 0, missing: true }));
    const r = analyzeTestEaLiquidityTargetRealismAuditFromTexts(
      { bundleName: "miss", summaryJsonText: SUMMARY_LQ, tradesCsvText: csv },
    );
    expect(r.overall.missing_count).toBe(1);
    expect(r.buckets.find((b) => b.bucket === "missing_liquidity_target")?.count).toBe(1);
  });

  it("builds outcome cross-tab by grade", () => {
    const csv = tradesCsv(
      lqRow("t1", "win", { tpDist: 280, nearDist: 900, grade: "A" }),
      lqRow("t2", "loss", { tpDist: 280, nearDist: 900, grade: "C" }),
    );
    const r = analyzeTestEaLiquidityTargetRealismAuditFromTexts(
      { bundleName: "xtab", summaryJsonText: SUMMARY_LQ, tradesCsvText: csv },
    );
    expect(r.outcome_by_grade.counts["win"]?.["A"]).toBe(1);
    expect(r.outcome_by_grade.counts["loss"]?.["C"]).toBe(1);
  });

  it("flattenTargetRealismAuditCsvRows includes overall and bucket rows", () => {
    const csv = tradesCsv(lqRow("t1", "win", { tpDist: 280, nearDist: 900 }));
    const r = analyzeTestEaLiquidityTargetRealismAuditFromTexts(
      { bundleName: "csv", summaryJsonText: SUMMARY_LQ, tradesCsvText: csv },
    );
    const rows = flattenTargetRealismAuditCsvRows(r);
    expect(rows.some((x) => x.section === "overall" && x.bucket === "trade_count")).toBe(true);
    expect(rows.some((x) => x.section === "bucket")).toBe(true);
  });

  it("fails when E5.15 columns missing", () => {
    const csv = `${BASE_HDR}\nt1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,2030,2,0,win,2,5`;
    const r = analyzeTestEaLiquidityTargetRealismAuditFromTexts({
      bundleName: "bad",
      summaryJsonText: SUMMARY_LQ,
      tradesCsvText: csv,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("liquidity_target_quality_enabled"))).toBe(true);
  });
});
