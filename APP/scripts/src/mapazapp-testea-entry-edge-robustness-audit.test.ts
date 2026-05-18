import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  parseBufferPoints,
  runEntryEdgeRobustnessAuditCli,
} from "./mapazapp-testea-entry-edge-robustness-audit";

const SUMMARY = JSON.stringify({
  has_entry_variant_outcome_sim_v1_logic: true,
  entry_variant_outcome_sim_enabled: true,
});

const TRADES = [
  "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held,entry_variant_outcome_sim_enabled,entry_variant_edge_sim_status,entry_variant_edge_sim_result_r,entry_variant_edge_sim_entry_price,entry_variant_edge_sim_sl_price,entry_variant_edge_sim_tp_price,entry_variant_edge_sim_risk_points,entry_variant_edge_sim_effective_rr,entry_variant_edge_sim_bars_to_fill,entry_variant_edge_sim_bars_to_close,entry_variant_edge_sim_ambiguous,entry_variant_edge_sim_invalid_risk,entry_variant_50_sim_status,entry_variant_50_sim_result_r,entry_variant_50_sim_entry_price,entry_variant_50_sim_sl_price,entry_variant_50_sim_tp_price,entry_variant_50_sim_risk_points,entry_variant_50_sim_effective_rr,entry_variant_50_sim_bars_to_fill,entry_variant_50_sim_bars_to_close,entry_variant_50_sim_ambiguous,entry_variant_50_sim_invalid_risk,entry_variant_25_sim_status,entry_variant_25_sim_result_r,entry_variant_25_sim_entry_price,entry_variant_25_sim_sl_price,entry_variant_25_sim_tp_price,entry_variant_25_sim_risk_points,entry_variant_25_sim_effective_rr,entry_variant_25_sim_bars_to_fill,entry_variant_25_sim_bars_to_close,entry_variant_25_sim_ambiguous,entry_variant_25_sim_invalid_risk,entry_variant_adaptive_sim_status,entry_variant_adaptive_sim_result_r,entry_variant_adaptive_sim_entry_price,entry_variant_adaptive_sim_sl_price,entry_variant_adaptive_sim_tp_price,entry_variant_adaptive_sim_risk_points,entry_variant_adaptive_sim_effective_rr,entry_variant_adaptive_sim_bars_to_fill,entry_variant_adaptive_sim_bars_to_close,entry_variant_adaptive_sim_ambiguous,entry_variant_adaptive_sim_invalid_risk",
  "t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,1990,-1,0,loss,2,5,true,win,2,2000,1990,2030,280,2,3,10,false,false,loss,-1,2000,1990,2030,131,2,3,10,false,false,win,2,2000,1990,2030,200,2,3,10,false,false,win,2,2000,1990,2030,200,2,3,10,false,false",
].join("\n");

describe("mapazapp-testea-entry-edge-robustness-audit CLI (E5.13.6.8)", () => {
  it("returns JSON with expected sections", () => {
    const dir = mkdtempSync(join(tmpdir(), "edge-robust-"));
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY);
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES);
    let out = "";
    const code = runEntryEdgeRobustnessAuditCli(["--bundle", dir, "--json"], {
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
    const parsed = JSON.parse(out) as {
      ok: boolean;
      buffer_stress: unknown[];
      transition_robustness: unknown[];
      variant_comparison: unknown;
    };
    assert.equal(parsed.ok, true);
    assert.ok(Array.isArray(parsed.buffer_stress));
    assert.ok(Array.isArray(parsed.transition_robustness));
    assert.ok(parsed.variant_comparison);
  });

  it("writes csv-output when requested", () => {
    const dir = mkdtempSync(join(tmpdir(), "edge-robust-csv-"));
    const csvPath = join(dir, "robustness.csv");
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY);
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES);
    const code = runEntryEdgeRobustnessAuditCli(["--bundle", dir, "--csv-output", csvPath], {
      stdoutWrite: () => {},
      stderrWrite: () => {},
      existsSync: (p) => p.endsWith(".json") || p.endsWith(".csv"),
      readFileUtf8: (p) => {
        if (p.endsWith("backtest_summary.json")) return SUMMARY;
        return TRADES;
      },
      readdirSync: () => [],
      writeFileUtf8: (p, d) => writeFileSync(p, d, "utf8"),
    });
    assert.equal(code, 0);
    const text = readFileSync(csvPath, "utf8");
    assert.match(text, /buffer_stress/);
  });

  it("--buffer-points parses comma-separated values", () => {
    assert.deepEqual(parseBufferPoints("5,10,20"), [5, 10, 20]);
    assert.equal(parseBufferPoints("bad"), null);
  });

  it("--max-examples limits examples", () => {
    const dir = mkdtempSync(join(tmpdir(), "edge-robust-maxex-"));
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY);
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES);
    let out = "";
    runEntryEdgeRobustnessAuditCli(["--bundle", dir, "--json", "--max-examples", "1"], {
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
    const parsed = JSON.parse(out) as { examples: unknown[] };
    assert.ok(parsed.examples.length <= 6);
  });
});
