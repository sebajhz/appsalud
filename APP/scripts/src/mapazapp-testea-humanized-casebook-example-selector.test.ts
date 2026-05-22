import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { runHumanizedCasebookExampleSelectorCli } from "./mapazapp-testea-humanized-casebook-example-selector";

const SUMMARY = JSON.stringify({
  ea_build: "MZP_TestEA_E5_18",
  symbol: "XAUUSD",
  execution_timeframe: "M15",
  trade_count: 2,
});

const TRADES = [
  "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held,setup_readiness_checklist_enabled,setup_readiness_score,setup_readiness_grade,setup_readiness_decision,setup_readiness_blocker_count,setup_readiness_warning_count,setup_readiness_primary_blocker,setup_readiness_reasons,ifvg_bisi_sibi_grade,liquidity_target_grade,execution_environment_grade,discipline_grade,session_bucket,volatility_bucket,ifvg_conflict_with_trade_direction,pd_entry_zone_conflict,entry_near_miss,entry_fill_status,entry_variant_outcome_sim_enabled,entry_variant_edge_sim_status,entry_variant_edge_sim_result_r",
  "t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2100,2100,2,0,win,2,5,true,80,B,wait,0,0,none,checklist_bias_ok,B,C,B,london,normal,false,false,false,filled,true,win,2",
  "t2,BUY,2026-01-10T13:00:00Z,2026-01-10T15:00:00Z,2000,1990,2100,1990,-1,0,loss,2,5,true,60,C,reject,1,0,ifvg_conflict,checklist_ifvg_conflict,Weak,C,B,asian,normal,true,false,false,filled,true,loss,-1",
].join("\n");

describe("mapazapp-testea-humanized-casebook-example-selector CLI (E5.22.4.1)", () => {
  it("--bundle reads bundle and --json prints result", () => {
    const dir = mkdtempSync(join(tmpdir(), "ha-examples-"));
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY);
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES);
    let out = "";
    const code = runHumanizedCasebookExampleSelectorCli(["--bundle", dir, "--json"], {
      stdoutWrite: (s) => {
        out += s;
      },
      stderrWrite: () => {},
      existsSync: (p) => p.endsWith(".json") || p.endsWith(".csv"),
      readFileUtf8: (p) => {
        if (p.endsWith("backtest_summary.json")) return SUMMARY;
        return TRADES;
      },
      writeFileUtf8: () => {},
    });
    assert.equal(code, 0);
    const parsed = JSON.parse(out) as { ok: boolean; schema_version: string; missing_cases: string[] };
    assert.equal(parsed.ok, true);
    assert.equal(parsed.schema_version, "mapazapp_humanized_casebook_example_selector_v1");
    assert.ok(parsed.missing_cases.includes("HA-008"));
  });

  it("--csv-output writes CSV", () => {
    const dir = mkdtempSync(join(tmpdir(), "ha-examples-csv-"));
    const csvPath = join(dir, "examples_DO_NOT_COMMIT.csv");
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY);
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES);
    const code = runHumanizedCasebookExampleSelectorCli(
      ["--bundle", dir, "--csv-output", csvPath, "--max-examples-per-case", "2"],
      {
        stdoutWrite: () => {},
        stderrWrite: () => {},
        existsSync: (p) => p.endsWith(".json") || p.endsWith(".csv"),
        readFileUtf8: (p) => {
          if (p.endsWith("backtest_summary.json")) return SUMMARY;
          return TRADES;
        },
        writeFileUtf8: (p, d) => writeFileSync(p, d, "utf8"),
      },
    );
    assert.equal(code, 0);
    const text = readFileSync(csvPath, "utf8");
    assert.match(text, /case_id,category,trade_id/);
    assert.match(text, /HA-010|HA-009/);
  });

  it("invalid bundle fails cleanly", () => {
    const code = runHumanizedCasebookExampleSelectorCli(["--bundle", "/nonexistent/bundle", "--strict"], {
      stdoutWrite: () => {},
      stderrWrite: () => {},
      existsSync: () => false,
      readFileUtf8: () => "",
      writeFileUtf8: () => {},
    });
    assert.equal(code, 1);
  });

  it("--max-examples-per-case respected", () => {
    const dir = mkdtempSync(join(tmpdir(), "ha-examples-max-"));
    const many = [
      "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held,setup_readiness_checklist_enabled,setup_readiness_score,setup_readiness_grade,setup_readiness_decision,setup_readiness_blocker_count,setup_readiness_warning_count,setup_readiness_primary_blocker",
      ...Array.from({ length: 6 }, (_, i) =>
        [
          `t${i}`,
          "BUY",
          "2026-01-10T12:00:00Z",
          "2026-01-10T14:00:00Z",
          2000,
          1990,
          2100,
          2100,
          2,
          0,
          "win",
          2,
          5,
          true,
          80,
          "B",
          "wait",
          0,
          0,
          "none",
        ].join(","),
      ),
    ].join("\n");
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY);
    writeFileSync(join(dir, "backtest_trades.csv"), many);
    let out = "";
    runHumanizedCasebookExampleSelectorCli(
      ["--bundle", dir, "--json", "--max-examples-per-case", "1"],
      {
        stdoutWrite: (s) => {
          out += s;
        },
        stderrWrite: () => {},
        existsSync: (p) => p.endsWith(".json") || p.endsWith(".csv"),
        readFileUtf8: (p) => {
          if (p.endsWith("backtest_summary.json")) return SUMMARY;
          return many;
        },
        writeFileUtf8: () => {},
      },
    );
    const parsed = JSON.parse(out) as {
      examples_by_case: Record<string, unknown[]>;
    };
    const waitExamples = parsed.examples_by_case["HA-010"] ?? [];
    assert.ok(waitExamples.length <= 2);
  });
});
