import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { runSetupPerformanceBaselineAuditCli } from "./mapazapp-testea-setup-performance-baseline-audit";

const SUMMARY = JSON.stringify({
  ea_build: "MZP_TestEA_E5_18",
  symbol: "XAUUSD",
  execution_timeframe: "M15",
  trade_count: 1,
  win_count: 1,
  loss_count: 0,
  winrate: 1,
  total_r: 2,
});

const TRADES = [
  "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held,setup_readiness_checklist_enabled,setup_readiness_score,setup_readiness_grade,setup_readiness_decision,setup_readiness_blocker_count,setup_readiness_warning_count,setup_readiness_primary_blocker,ifvg_bisi_sibi_grade,liquidity_target_grade,execution_environment_grade,discipline_grade",
  "t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2100,2100,2,0,win,2,5,true,80,B,candidate,0,0,none,B,C,B,B",
].join("\n");

describe("mapazapp-testea-setup-performance-baseline-audit CLI (E5.22.2)", () => {
  it("--bundle reads bundle and --json prints result", () => {
    const dir = mkdtempSync(join(tmpdir(), "perf-audit-"));
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY);
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES);
    let out = "";
    const code = runSetupPerformanceBaselineAuditCli(["--bundle", dir, "--json"], {
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
    const parsed = JSON.parse(out) as { ok: boolean; schema_version: string };
    assert.equal(parsed.ok, true);
    assert.equal(parsed.schema_version, "mapazapp_setup_performance_baseline_audit_v1");
  });

  it("--csv-output writes flattened CSV", () => {
    const dir = mkdtempSync(join(tmpdir(), "perf-audit-csv-"));
    const csvPath = join(dir, "baseline_DO_NOT_COMMIT.csv");
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY);
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES);
    const code = runSetupPerformanceBaselineAuditCli(["--bundle", dir, "--csv-output", csvPath], {
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
    assert.match(text, /official_performance/);
  });

  it("invalid bundle fails cleanly", () => {
    const code = runSetupPerformanceBaselineAuditCli(["--bundle", "/nonexistent/bundle", "--strict"], {
      stdoutWrite: () => {},
      stderrWrite: () => {},
      existsSync: () => false,
      readFileUtf8: () => "",
      readdirSync: () => [],
      writeFileUtf8: () => {},
    });
    assert.equal(code, 1);
  });

  it("--max-examples respected", () => {
    const dir = mkdtempSync(join(tmpdir(), "perf-audit-max-"));
    const rows = [
      "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held,setup_readiness_checklist_enabled,setup_readiness_score,setup_readiness_grade,setup_readiness_decision,setup_readiness_blocker_count,setup_readiness_warning_count,setup_readiness_primary_blocker",
      ...Array.from({ length: 5 }, (_, i) =>
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
          90,
          "A",
          "reject",
          1,
          0,
          "pd_conflict",
        ].join(","),
      ),
    ].join("\n");
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY);
    writeFileSync(join(dir, "backtest_trades.csv"), rows);
    let out = "";
    const code = runSetupPerformanceBaselineAuditCli(
      ["--bundle", dir, "--json", "--max-examples", "2"],
      {
        stdoutWrite: (s) => {
          out += s;
        },
        stderrWrite: () => {},
        existsSync: (p) => p.endsWith(".json") || p.endsWith(".csv"),
        readFileUtf8: (p) => {
          if (p.endsWith("backtest_summary.json")) return SUMMARY;
          return rows;
        },
        readdirSync: () => [],
        writeFileUtf8: () => {},
      },
    );
    assert.equal(code, 0);
    const parsed = JSON.parse(out) as { examples: Record<string, unknown[]> };
    const high = parsed.examples.high_score_reject_win ?? [];
    assert.ok(high.length <= 2);
  });
});
