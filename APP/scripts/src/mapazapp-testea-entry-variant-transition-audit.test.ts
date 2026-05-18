import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { runEntryVariantTransitionAuditCli } from "./mapazapp-testea-entry-variant-transition-audit";

const SUMMARY = JSON.stringify({
  has_entry_variant_outcome_sim_v1_logic: true,
  entry_variant_outcome_sim_enabled: true,
});

const TRADES = [
  "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held,entry_variant_outcome_sim_enabled,entry_variant_edge_sim_status,entry_variant_edge_sim_result_r,entry_variant_edge_sim_entry_price,entry_variant_edge_sim_sl_price,entry_variant_edge_sim_tp_price,entry_variant_edge_sim_risk_points,entry_variant_edge_sim_effective_rr,entry_variant_edge_sim_bars_to_fill,entry_variant_edge_sim_bars_to_close,entry_variant_edge_sim_ambiguous,entry_variant_edge_sim_invalid_risk,entry_variant_50_sim_status,entry_variant_50_sim_result_r,entry_variant_50_sim_entry_price,entry_variant_50_sim_sl_price,entry_variant_50_sim_tp_price,entry_variant_50_sim_risk_points,entry_variant_50_sim_effective_rr,entry_variant_50_sim_bars_to_fill,entry_variant_50_sim_bars_to_close,entry_variant_50_sim_ambiguous,entry_variant_50_sim_invalid_risk",
  "t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2030,1990,-1,0,loss,2,5,true,win,2,2000,1990,2030,280,2,3,10,false,false,loss,-1,2000,1990,2030,131,2,3,10,false,false",
].join("\n");

describe("mapazapp-testea-entry-variant-transition-audit CLI (E5.13.6.6)", () => {
  it("returns JSON for bundle with EVOS trades", () => {
    const dir = mkdtempSync(join(tmpdir(), "transition-audit-"));
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY);
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES);
    let out = "";
    const code = runEntryVariantTransitionAuditCli(
      ["--bundle", dir, "--json", "--variants", "edge,50"],
      {
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
      },
    );
    assert.equal(code, 0);
    const parsed = JSON.parse(out) as {
      ok: boolean;
      variants: { variant: string }[];
    };
    assert.equal(parsed.ok, true);
    assert.equal(parsed.variants.length, 2);
  });

  it("writes csv-output when requested", () => {
    const dir = mkdtempSync(join(tmpdir(), "transition-csv-"));
    const csvPath = join(dir, "transitions.csv");
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY);
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES);
    const code = runEntryVariantTransitionAuditCli(
      ["--bundle", dir, "--csv-output", csvPath, "--variants", "edge"],
      {
        stdoutWrite: () => {},
        stderrWrite: () => {},
        existsSync: (p) => p.endsWith(".json") || p.endsWith(".csv"),
        readFileUtf8: (p) => {
          if (p.endsWith("backtest_summary.json")) return SUMMARY;
          return TRADES;
        },
        readdirSync: () => [],
        writeFileUtf8: (p, d) => writeFileSync(p, d, "utf8"),
      },
    );
    assert.equal(code, 0);
    const text = readFileSync(csvPath, "utf8");
    assert.match(text, /official_loss_variant_win/);
  });

  it("--variants filters to requested variants only", () => {
    const dir = mkdtempSync(join(tmpdir(), "transition-var-"));
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY);
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES);
    let out = "";
    runEntryVariantTransitionAuditCli(["--bundle", dir, "--json", "--variants", "edge"], {
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
    const parsed = JSON.parse(out) as { variants: { variant: string }[] };
    assert.equal(parsed.variants.length, 1);
    assert.equal(parsed.variants[0]!.variant, "edge");
  });

  it("--max-examples limits examples per bucket", () => {
    const dir = mkdtempSync(join(tmpdir(), "transition-maxex-"));
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY);
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES);
    let out = "";
    runEntryVariantTransitionAuditCli(
      ["--bundle", dir, "--json", "--variants", "edge", "--max-examples", "0"],
      {
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
      },
    );
    const parsed = JSON.parse(out) as { variants: { examples: unknown[] }[] };
    assert.equal(parsed.variants[0]!.examples.length, 0);
  });
});
