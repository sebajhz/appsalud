import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { runEntryVariantSimSummaryCli } from "./mapazapp-testea-entry-variant-sim-summary";

function minimalSummary(): Record<string, unknown> {
  const base: Record<string, unknown> = {
    has_entry_variant_outcome_sim_v1_logic: true,
    entry_variant_outcome_sim_enabled: true,
    entry_variant_outcome_sim_best_variant_by_expectancy: "edge",
    entry_variant_outcome_sim_best_variant_by_total_r: "edge",
    entry_variant_outcome_sim_lowest_ambiguous_variant: "edge",
    entry_variant_outcome_sim_highest_fill_variant: "edge",
  };
  for (const v of ["edge", "25", "50", "75", "adaptive"]) {
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
    ]) {
      base[`entry_variant_${v}_${sfx}`] = v === "edge" ? 1 : 0;
    }
  }
  return base;
}

describe("mapazapp-testea-entry-variant-sim-summary CLI (E5.13.6)", () => {
  it("prints JSON for bundle with evos summary", () => {
    const dir = mkdtempSync(join(tmpdir(), "evos-"));
    writeFileSync(join(dir, "backtest_summary.json"), JSON.stringify(minimalSummary()));
    let out = "";
    const code = runEntryVariantSimSummaryCli(["--bundle", dir, "--json"], {
      stdoutWrite: (s) => {
        out += s;
      },
      stderrWrite: () => {},
      existsSync,
      readFileUtf8: (p) => readFileSync(p, "utf8"),
      readdirSync,
      writeFileUtf8: (p, d) => writeFileSync(p, d, "utf8"),
    });
    assert.equal(code, 0);
    const parsed = JSON.parse(out) as { bundles: { has_logic: boolean }[] };
    assert.equal(parsed.bundles[0]?.has_logic, true);
  });
});
