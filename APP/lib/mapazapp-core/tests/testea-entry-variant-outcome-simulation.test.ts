import { describe, expect, it } from "vitest";
import {
  analyzeTestEaEntryVariantOutcomeSimFromTexts,
  readVariantRollupFromSummary,
  summaryKeyForVariantRollup,
} from "../src/testea-entry-variant-outcome-simulation";

function minimalEvosSummary(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const base: Record<string, unknown> = {
    has_entry_variant_outcome_sim_v1_logic: true,
    entry_variant_outcome_sim_enabled: true,
    entry_variant_outcome_sim_best_variant_by_expectancy: "edge",
    entry_variant_outcome_sim_best_variant_by_total_r: "edge",
    entry_variant_outcome_sim_lowest_ambiguous_variant: "edge",
    entry_variant_outcome_sim_highest_fill_variant: "edge",
  };
  for (const v of ["edge", "25", "50", "75", "adaptive"] as const) {
    for (const sfx of [
      "sim_filled_count",
      "sim_win_count",
      "sim_loss_count",
      "sim_ambiguous_count",
      "sim_not_filled_count",
      "sim_invalid_risk_count",
      "sim_total_r",
      "sim_expectancy_r",
      "sim_winrate",
      "sim_average_risk_points",
    ] as const) {
      base[`entry_variant_${v}_${sfx}`] = v === "edge" && sfx === "sim_filled_count" ? 1 : 0;
    }
  }
  return { ...base, ...overrides };
}

describe("testea-entry-variant-outcome-simulation (E5.13.6)", () => {
  it("summaryKeyForVariantRollup builds expected keys", () => {
    expect(summaryKeyForVariantRollup("edge", "sim_filled_count")).toBe("entry_variant_edge_sim_filled_count");
    expect(summaryKeyForVariantRollup("25", "sim_expectancy_r")).toBe("entry_variant_25_sim_expectancy_r");
  });

  it("skips gracefully when has_entry_variant_outcome_sim_v1_logic is absent", () => {
    const r = analyzeTestEaEntryVariantOutcomeSimFromTexts({
      bundleName: "legacy",
      summaryJsonText: JSON.stringify({ has_entry_variant_feasibility_v1_logic: true }),
    });
    expect(r.ok).toBe(true);
    expect(r.has_logic).toBe(false);
    expect(r.variants).toHaveLength(0);
  });

  it("reads variant rollups from summary JSON", () => {
    const summary = minimalEvosSummary({
      entry_variant_edge_sim_filled_count: 10,
      entry_variant_edge_sim_expectancy_r: 0.35,
    });
    const edge = readVariantRollupFromSummary(summary, "edge");
    expect(edge.filled_count).toBe(10);
    expect(edge.expectancy_r).toBe(0.35);
    const r = analyzeTestEaEntryVariantOutcomeSimFromTexts({
      bundleName: "sim",
      summaryJsonText: JSON.stringify(summary),
    });
    expect(r.ok).toBe(true);
    expect(r.has_logic).toBe(true);
    expect(r.enabled).toBe(true);
    expect(r.variants).toHaveLength(5);
    expect(r.best_variant_by_expectancy).toBe("edge");
  });
});
