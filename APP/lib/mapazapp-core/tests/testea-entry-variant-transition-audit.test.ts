import { describe, expect, it } from "vitest";
import {
  analyzeTestEaEntryVariantTransitionAuditFromTexts,
  flattenTransitionAuditCsvRows,
  normalizeVariantOutcome,
  transitionBucketId,
} from "../src/testea-entry-variant-transition-audit";

const SUMMARY_EVOS = JSON.stringify({
  has_entry_variant_outcome_sim_v1_logic: true,
  entry_variant_outcome_sim_enabled: true,
});

const BASE_HDR =
  "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held";

function slotCols(prefix: string): string {
  return `,entry_variant_${prefix}_sim_status,entry_variant_${prefix}_sim_result_r,entry_variant_${prefix}_sim_entry_price,entry_variant_${prefix}_sim_sl_price,entry_variant_${prefix}_sim_tp_price,entry_variant_${prefix}_sim_risk_points,entry_variant_${prefix}_sim_effective_rr,entry_variant_${prefix}_sim_bars_to_fill,entry_variant_${prefix}_sim_bars_to_close,entry_variant_${prefix}_sim_ambiguous,entry_variant_${prefix}_sim_invalid_risk`;
}

function tradesCsv(...rows: string[]): string {
  const hdr = `${BASE_HDR},entry_variant_outcome_sim_enabled${slotCols("edge")}${slotCols("25")}${slotCols("50")}`;
  return `${hdr}\n${rows.join("\n")}`;
}

function emptySlots(status: string, resultR: number, risk: number): string {
  const base = `${status},${resultR.toFixed(3)},2000,1990,2030,${risk},2,3,10,false,false`;
  return `${base},${base},${base}`;
}

describe("testea-entry-variant-transition-audit (E5.13.6.6)", () => {
  it("transitionBucketId formats official x variant", () => {
    expect(transitionBucketId("loss", "win")).toBe("official_loss_variant_win");
  });

  it("counts official loss -> edge win as improvement", () => {
    const csv = tradesCsv(
      `t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,1990,-1,0,loss,2,5,true,${emptySlots("win", 2, 280)}`,
    );
    const r = analyzeTestEaEntryVariantTransitionAuditFromTexts(
      {
        bundleName: "imp",
        summaryJsonText: SUMMARY_EVOS,
        tradesCsvText: csv,
      },
      { variants: ["edge"], maxExamples: 5 },
    );
    expect(r.ok).toBe(true);
    const edge = r.variants[0]!;
    expect(edge.improvement_summary.rescued_loss_to_win_count).toBe(1);
    expect(edge.improvement_summary.improved_count).toBe(1);
    expect(
      edge.transition_matrix.find((b) => b.bucket === "official_loss_variant_win")?.count,
    ).toBe(1);
  });

  it("counts official win -> edge loss as degradation", () => {
    const csv = tradesCsv(
      `t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,2030,2,0,win,3,10,true,${emptySlots("loss", -1, 280)}`,
    );
    const r = analyzeTestEaEntryVariantTransitionAuditFromTexts(
      {
        bundleName: "deg",
        summaryJsonText: SUMMARY_EVOS,
        tradesCsvText: csv,
      },
      { variants: ["edge"], maxExamples: 5 },
    );
    const edge = r.variants[0]!;
    expect(edge.improvement_summary.harmed_win_to_loss_count).toBe(1);
    expect(edge.improvement_summary.degraded_count).toBe(1);
  });

  it("counts expired_unfilled -> variant win as rescued_expired (fill-model-sensitive)", () => {
    const csv = tradesCsv(
      `t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,0,0,0,expired_unfilled,5,0,true,${emptySlots("win", 2, 280)}`,
    );
    const r = analyzeTestEaEntryVariantTransitionAuditFromTexts(
      {
        bundleName: "exp",
        summaryJsonText: SUMMARY_EVOS,
        tradesCsvText: csv,
      },
      { variants: ["edge"] },
    );
    const edge = r.variants[0]!;
    expect(edge.improvement_summary.rescued_expired_to_win_count).toBe(1);
    expect(edge.improvement_summary.improved_count).toBe(1);
  });

  it("computes risk ratio vs 50", () => {
    const p25 = "win,2.000,2000,1990,2030,200,2,3,10,false,false";
    const csv = tradesCsv(
      `t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,2030,2,0,win,3,10,true,win,2.000,2000,1990,2030,280,2,3,10,false,false,${p25},win,2.000,2000,1990,2030,131,2,3,10,false,false`,
    );
    const r = analyzeTestEaEntryVariantTransitionAuditFromTexts(
      {
        bundleName: "risk",
        summaryJsonText: SUMMARY_EVOS,
        tradesCsvText: csv,
      },
      { variants: ["edge"] },
    );
    const edge = r.variants[0]!;
    expect(edge.risk_sanity.average_risk_ratio_vs_50).toBeCloseTo(280 / 131, 2);
    expect(edge.risk_sanity.count_risk_ratio_gt_1_5).toBe(1);
  });

  it("variant not_filled uses 0 R for delta", () => {
    expect(normalizeVariantOutcome("not_filled")).toBe("not_filled");
    const csv = tradesCsv(
      `t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,2030,2,0,win,3,10,true,not_filled,0.000,2000,1990,2030,280,2,-1,0,false,false,win,2.000,2000,1990,2030,131,2,3,10,false,false`,
    );
    const r = analyzeTestEaEntryVariantTransitionAuditFromTexts(
      {
        bundleName: "nf",
        summaryJsonText: SUMMARY_EVOS,
        tradesCsvText: csv,
      },
      { variants: ["edge"] },
    );
    const edge = r.variants[0]!;
    expect(edge.delta_r_summary.total_delta_r_vs_official).toBe(-2);
    expect(edge.delta_r_summary.not_filled_variant_r_assumption).toBe("zero");
  });

  it("returns warning when EVOS columns missing (legacy bundle)", () => {
    const csv = `${BASE_HDR}\nt1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,2030,2,0,win,3,10`;
    const r = analyzeTestEaEntryVariantTransitionAuditFromTexts({
      bundleName: "legacy",
      summaryJsonText: JSON.stringify({ has_entry_variant_feasibility_v1_logic: true }),
      tradesCsvText: csv,
    });
    expect(r.ok).toBe(false);
    expect(r.warnings.some((w) => w.includes("BUNDLE_EVOS"))).toBe(true);
  });

  it("flattenTransitionAuditCsvRows is deterministic", () => {
    const csv = tradesCsv(
      `t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,1990,-1,0,loss,2,5,true,${emptySlots("win", 2, 280)}`,
    );
    const r = analyzeTestEaEntryVariantTransitionAuditFromTexts({
      bundleName: "csv",
      summaryJsonText: SUMMARY_EVOS,
      tradesCsvText: csv,
    });
    const a = flattenTransitionAuditCsvRows(r);
    const b = flattenTransitionAuditCsvRows(r);
    expect(a).toEqual(b);
    expect(a.some((row) => row.bucket === "official_loss_variant_win")).toBe(true);
  });
});
