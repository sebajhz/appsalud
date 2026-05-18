import { describe, expect, it } from "vitest";
import {
  analyzeTestEaEntryVariantReconcileFromTexts,
  resolveCrossBucketId,
} from "../src/testea-entry-variant-outcome-reconciliation";

const SUMMARY_EVOS = JSON.stringify({
  has_entry_variant_outcome_sim_v1_logic: true,
  entry_variant_outcome_sim_enabled: true,
});

const BASE_HDR =
  "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held";

const EVOS_50_HDR =
  ",entry_variant_outcome_sim_enabled,entry_variant_50_sim_status,entry_variant_50_sim_result_r,entry_variant_50_sim_entry_price,entry_variant_50_sim_sl_price,entry_variant_50_sim_tp_price,entry_variant_50_sim_risk_points,entry_variant_50_sim_effective_rr,entry_variant_50_sim_bars_to_fill,entry_variant_50_sim_bars_to_close,entry_variant_50_sim_ambiguous,entry_variant_50_sim_invalid_risk";

function tradesCsv(...rows: string[]): string {
  return `${BASE_HDR}${EVOS_50_HDR}\n${rows.join("\n")}`;
}

describe("testea-entry-variant-outcome-reconciliation (E5.13.6.1)", () => {
  it("resolveCrossBucketId maps win×ambiguous", () => {
    expect(resolveCrossBucketId("win", "ambiguous")).toBe("official_win_variant50_ambiguous");
  });

  it("matches when official win and variant50 win align", () => {
    const csv = tradesCsv(
      "t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,2030,2,0,win,3,10,true,win,2.000,2000,1990,2030,10,2,3,10,false,false",
    );
    const r = analyzeTestEaEntryVariantReconcileFromTexts({
      bundleName: "match",
      summaryJsonText: SUMMARY_EVOS,
      tradesCsvText: csv,
    });
    expect(r.ok).toBe(true);
    expect(r.summary?.outcome_match_count).toBe(1);
    expect(r.summary?.mismatch_count).toBe(0);
    expect(r.buckets.find((b) => b.id === "official_win_variant50_win")?.count).toBe(1);
  });

  it("counts official win vs variant50 ambiguous", () => {
    const csv = tradesCsv(
      "t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,2000,0,0,win,3,10,true,ambiguous,0.000,2000,1990,2030,10,2,3,10,true,false",
    );
    const r = analyzeTestEaEntryVariantReconcileFromTexts({
      bundleName: "win_ambig",
      summaryJsonText: SUMMARY_EVOS,
      tradesCsvText: csv,
    });
    expect(r.ok).toBe(true);
    expect(r.summary?.mismatch_count).toBe(1);
    expect(r.buckets.find((b) => b.id === "official_win_variant50_ambiguous")?.count).toBe(1);
    expect(r.examples.length).toBeGreaterThan(0);
  });

  it("counts official loss vs variant50 ambiguous", () => {
    const csv = tradesCsv(
      "t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,1990,-1,0,loss,2,8,true,ambiguous,0.000,2000,1990,2030,10,2,2,8,true,false",
    );
    const r = analyzeTestEaEntryVariantReconcileFromTexts({
      bundleName: "loss_ambig",
      summaryJsonText: SUMMARY_EVOS,
      tradesCsvText: csv,
    });
    expect(r.buckets.find((b) => b.id === "official_loss_variant50_ambiguous")?.count).toBe(1);
  });

  it("detects entry/sl/tp price mismatches when filled", () => {
    const csv = tradesCsv(
      "t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,2030,2,0,win,3,10,true,win,2.000,2005,1985,2035,10,2,3,10,false,false",
    );
    const r = analyzeTestEaEntryVariantReconcileFromTexts({
      bundleName: "px",
      summaryJsonText: SUMMARY_EVOS,
      tradesCsvText: csv,
    });
    expect(r.summary?.entry_price_mismatch_count).toBe(1);
    expect(r.summary?.sl_price_mismatch_count).toBe(1);
    expect(r.summary?.tp_price_mismatch_count).toBe(1);
  });

  it("detects fill alignment: official filled vs variant not_filled", () => {
    const csv = tradesCsv(
      "t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,2030,2,0,win,3,10,true,not_filled,0.000,2000,1990,2030,10,2,-1,0,false,false",
    );
    const r = analyzeTestEaEntryVariantReconcileFromTexts({
      bundleName: "nf",
      summaryJsonText: SUMMARY_EVOS,
      tradesCsvText: csv,
    });
    expect(r.buckets.find((b) => b.id === "official_win_variant50_not_filled")?.count).toBe(1);
    expect(r.buckets.find((b) => b.id === "official_filled_variant50_not_filled")?.count).toBe(1);
  });

  it("parity fixture: aligned official and variant50 produce zero mismatches", () => {
    const csv = tradesCsv(
      "t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,2030,2,0,win,3,0,true,win,2.000,2000,1990,2030,10,2,3,0,false,false",
      "t2,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,2000,0,0,ambiguous,2,0,true,ambiguous,0.000,2000,1990,2030,10,2,2,0,true,false",
      "t3,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,2030,2,0,expired_unfilled,5,0,true,not_filled,0.000,2000,1990,2030,10,2,-1,0,false,false",
    );
    const r = analyzeTestEaEntryVariantReconcileFromTexts({
      bundleName: "parity",
      summaryJsonText: SUMMARY_EVOS,
      tradesCsvText: csv,
    });
    expect(r.ok).toBe(true);
    expect(r.summary?.mismatch_count).toBe(0);
    expect(r.summary?.tp_price_mismatch_count).toBe(0);
    expect(r.summary?.fill_bar_mismatch_count).toBe(0);
    expect(r.summary?.close_bar_mismatch_count).toBe(0);
    expect(r.summary?.fill_bar_delta_histogram["0"]).toBe(2);
    expect(r.summary?.close_bar_delta_histogram["0"]).toBe(2);
  });

  it("returns warning when EVOS flag missing (legacy bundle)", () => {
    const csv = tradesCsv(
      "t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,2030,2,0,win,3,10,true,win,2,2000,1990,2030,10,2,3,10,false,false",
    );
    const r = analyzeTestEaEntryVariantReconcileFromTexts({
      bundleName: "legacy",
      summaryJsonText: JSON.stringify({ has_entry_variant_feasibility_v1_logic: true }),
      tradesCsvText: csv,
    });
    expect(r.ok).toBe(false);
    expect(r.warnings.some((w) => w.includes("BUNDLE_EVOS_COLUMNS_MISSING"))).toBe(true);
  });
});
