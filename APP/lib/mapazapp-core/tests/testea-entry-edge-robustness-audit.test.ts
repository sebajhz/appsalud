import { describe, expect, it } from "vitest";
import {
  analyzeTestEaEntryEdgeRobustnessAuditFromTexts,
  computeEffectiveRrProxy,
  computeTpDistancePoints,
  flattenRobustnessAuditCsvRows,
} from "../src/testea-entry-edge-robustness-audit";

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
  const hdr = `${BASE_HDR},entry_variant_outcome_sim_enabled${slotCols("edge")}${slotCols("25")}${slotCols("50")}${slotCols("adaptive")}`;
  return `${hdr}\n${rows.join("\n")}`;
}

function edgeSlots(
  status: string,
  resultR: number,
  risk: number,
  entry = 2000,
  sl = 1990,
  tp = 2030,
  fill = 3,
  close = 10,
): string {
  return `${status},${resultR.toFixed(3)},${entry},${sl},${tp},${risk},2,${fill},${close},false,false`;
}

describe("testea-entry-edge-robustness-audit (E5.13.6.8)", () => {
  it("computeEffectiveRrProxy applies buffer to risk and reward", () => {
    const p = computeEffectiveRrProxy(100, 250, 30, 1.5);
    expect(p.effective_risk_points).toBe(130);
    expect(p.effective_reward_points).toBe(220);
    expect(p.effective_rr).toBeCloseTo(220 / 130, 6);
    expect(p.effective_rr_pass).toBe(true);
    expect(p.fragile_by_buffer).toBe(false);
  });

  it("edge win failing effective RR is counted at buffer", () => {
    const risk = 20;
    const tpDist = 25;
    const proxy = computeEffectiveRrProxy(risk, tpDist, 30, 1.5);
    expect(proxy.fragile_by_buffer).toBe(true);

    const others = `${edgeSlots("win", 2, 131)},${edgeSlots("win", 2, 131)},${edgeSlots("win", 2, 131)}`;
    const csv = tradesCsv(
      `t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,2030,2,0,win,3,10,true,${edgeSlots("win", 2, risk, 2000, 1990, 2002.5)},${others}`,
    );
    const r = analyzeTestEaEntryEdgeRobustnessAuditFromTexts(
      { bundleName: "fragile", summaryJsonText: SUMMARY_EVOS, tradesCsvText: csv },
      { bufferPoints: [30], minEffectiveRr: 1.5 },
    );
    expect(r.ok).toBe(true);
    const buf = r.buffer_stress[0]!;
    expect(buf.edge_wins_failing_effective_rr_count).toBeGreaterThanOrEqual(1);
  });

  it("official_loss -> edge_win fragile bucket counted in transition_robustness", () => {
    const others = `${edgeSlots("win", 2, 131)},${edgeSlots("loss", -1, 131)},${edgeSlots("win", 2, 131)}`;
    const csv = tradesCsv(
      `t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,1990,-1,0,loss,2,5,true,${edgeSlots("win", 2, 20, 2000, 1990, 2002.5, 0, 0)},${others}`,
    );
    const r = analyzeTestEaEntryEdgeRobustnessAuditFromTexts(
      { bundleName: "loss-win", summaryJsonText: SUMMARY_EVOS, tradesCsvText: csv },
      { bufferPoints: [30] },
    );
    const bucket = r.transition_robustness.find(
      (b) => b.bucket === "official_loss_variant_win",
    );
    expect(bucket?.count).toBe(1);
    expect(bucket?.fail_effective_rr_count_by_buffer[30]).toBeGreaterThanOrEqual(1);
  });

  it("unresolved edge audit counted", () => {
    const others = `${edgeSlots("win", 2, 131)},${edgeSlots("win", 2, 131)},${edgeSlots("win", 2, 131)}`;
    const csv = tradesCsv(
      `t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,2030,2,0,win,3,10,true,${edgeSlots("unresolved", 0, 280)},${others}`,
    );
    const r = analyzeTestEaEntryEdgeRobustnessAuditFromTexts({
      bundleName: "unres",
      summaryJsonText: SUMMARY_EVOS,
      tradesCsvText: csv,
    });
    expect(r.unresolved_edge_audit.count).toBe(1);
    expect(r.edge_summary.edge_unresolved_count).toBe(1);
  });

  it("risk ratio bucket counts are deterministic", () => {
    const p25 = edgeSlots("win", 2, 200);
    const p50 = edgeSlots("win", 2, 131);
    const adaptive = edgeSlots("win", 2, 131);
    const csv = tradesCsv(
      `t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,2030,2,0,win,3,10,true,${edgeSlots("win", 2, 280)},${p25},${p50},${adaptive}`,
    );
    const r = analyzeTestEaEntryEdgeRobustnessAuditFromTexts({
      bundleName: "ratio",
      summaryJsonText: SUMMARY_EVOS,
      tradesCsvText: csv,
    });
    expect(r.risk_ratio_stress.average_risk_ratio_vs_50).toBeCloseTo(280 / 131, 2);
    const a = flattenRobustnessAuditCsvRows(r);
    const b = flattenRobustnessAuditCsvRows(r);
    expect(a).toEqual(b);
    expect(a.some((row) => row.section === "risk_bucket")).toBe(true);
  });

  it("computeTpDistancePoints scales by SL geometry", () => {
    const tpd = computeTpDistancePoints(2000, 1990, 2030, 100);
    expect(tpd).toBeCloseTo(300, 6);
  });

  it("legacy bundle without EVOS returns warning, not crash", () => {
    const csv = `${BASE_HDR}\nt1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,2030,2,0,win,3,10`;
    const r = analyzeTestEaEntryEdgeRobustnessAuditFromTexts({
      bundleName: "legacy",
      summaryJsonText: JSON.stringify({ has_entry_variant_feasibility_v1_logic: true }),
      tradesCsvText: csv,
    });
    expect(r.ok).toBe(false);
    expect(r.warnings.some((w) => w.includes("BUNDLE_EVOS"))).toBe(true);
  });
});
