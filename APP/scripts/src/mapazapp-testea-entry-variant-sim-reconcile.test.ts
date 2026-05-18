import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { runEntryVariantSimReconcileCli } from "./mapazapp-testea-entry-variant-sim-reconcile";

const SUMMARY = JSON.stringify({
  has_entry_variant_outcome_sim_v1_logic: true,
  entry_variant_outcome_sim_enabled: true,
});

const TRADES = [
  "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held,entry_variant_outcome_sim_enabled,entry_variant_50_sim_status,entry_variant_50_sim_result_r,entry_variant_50_sim_entry_price,entry_variant_50_sim_sl_price,entry_variant_50_sim_tp_price,entry_variant_50_sim_risk_points,entry_variant_50_sim_effective_rr,entry_variant_50_sim_bars_to_fill,entry_variant_50_sim_bars_to_close,entry_variant_50_sim_ambiguous,entry_variant_50_sim_invalid_risk",
  "t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,2030,2,0,win,3,10,true,win,2,2000,1990,2030,10,2,3,10,false,false",
].join("\n");

describe("mapazapp-testea-entry-variant-sim-reconcile CLI (E5.13.6.1)", () => {
  it("returns JSON for bundle with EVOS trades", () => {
    const dir = mkdtempSync(join(tmpdir(), "reconcile-"));
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY);
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES);
    let out = "";
    const code = runEntryVariantSimReconcileCli(["--bundle", dir, "--json"], {
      stdoutWrite: (s) => {
        out += s;
      },
      stderrWrite: () => {},
      existsSync: (p) => p.endsWith(".json") || p.endsWith(".csv"),
      readFileUtf8: (p) => {
        if (p.endsWith("backtest_summary.json")) return SUMMARY;
        return TRADES;
      },
      readdirSync: () => [],
      writeFileUtf8: () => {},
    });
    assert.equal(code, 0);
    const parsed = JSON.parse(out) as { ok: boolean; summary: { trade_count: number } };
    assert.equal(parsed.ok, true);
    assert.equal(parsed.summary.trade_count, 1);
  });

  it("writes csv-output when requested", () => {
    const dir = mkdtempSync(join(tmpdir(), "reconcile-csv-"));
    const csvPath = join(dir, "buckets.csv");
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY);
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES);
    const written: string[] = [];
    const code = runEntryVariantSimReconcileCli(
      ["--bundle", dir, "--csv-output", csvPath],
      {
        stdoutWrite: () => {},
        stderrWrite: () => {},
        existsSync: (p) => p.endsWith(".json") || p.endsWith(".csv"),
        readFileUtf8: (p) => {
          if (p.endsWith("backtest_summary.json")) return SUMMARY;
          return TRADES;
        },
        readdirSync: () => [],
        writeFileUtf8: (p, d) => {
          written.push(p);
          writeFileSync(p, d, "utf8");
        },
      },
    );
    assert.equal(code, 0);
    assert.equal(written[0], csvPath);
  });
});
