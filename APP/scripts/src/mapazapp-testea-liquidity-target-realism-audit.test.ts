import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { runLiquidityTargetRealismAuditCli } from "./mapazapp-testea-liquidity-target-realism-audit";

const SUMMARY = JSON.stringify({
  has_liquidity_target_quality_v1_logic: true,
  liquidity_target_quality_enabled: true,
});

const TRADES = [
  "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held,liquidity_target_quality_enabled,liquidity_target_direction,liquidity_target_official_tp_price,liquidity_target_official_tp_distance_points,liquidity_target_nearest_price,liquidity_target_nearest_type,liquidity_target_nearest_distance_points,liquidity_target_reached_by_official_tp,liquidity_target_tp_before_nearest_liquidity,liquidity_target_tp_beyond_nearest_liquidity,liquidity_target_too_far_beyond_nearest_liquidity,liquidity_target_has_equal_level,liquidity_target_equal_level_price,liquidity_target_equal_level_distance_points,liquidity_target_has_swing_target,liquidity_target_swing_price,liquidity_target_swing_distance_points,liquidity_target_has_htf_external_target,liquidity_target_htf_external_price,liquidity_target_htf_external_distance_points,liquidity_target_supported,liquidity_target_conflict,liquidity_target_score,liquidity_target_grade,liquidity_target_reasons",
  "t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2280,2280,2,0,win,2,5,true,BUY,2280,280,2900,swing_high,900,false,true,false,false,true,2900,900,true,2900,900,true,2900,900,false,false,8,C,liquidity_target_ok",
].join("\n");

describe("mapazapp-testea-liquidity-target-realism-audit CLI (E5.15.2)", () => {
  it("returns JSON for bundle with liquidity target columns", () => {
    const dir = mkdtempSync(join(tmpdir(), "lq-realism-audit-"));
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY);
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES);
    let out = "";
    const code = runLiquidityTargetRealismAuditCli(["--bundle", dir, "--json"], {
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
    const parsed = JSON.parse(out) as { ok: boolean; overall: { trade_count: number } };
    assert.equal(parsed.ok, true);
    assert.equal(parsed.overall.trade_count, 1);
  });

  it("writes csv-output when requested", () => {
    const dir = mkdtempSync(join(tmpdir(), "lq-realism-csv-"));
    const csvPath = join(dir, "realism.csv");
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY);
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES);
    const code = runLiquidityTargetRealismAuditCli(["--bundle", dir, "--csv-output", csvPath], {
      stdoutWrite: () => {},
      stderrWrite: () => {},
      existsSync: (p) => p.endsWith(".json") || p.endsWith(".csv"),
      readFileUtf8: (p) => {
        if (p.endsWith("backtest_summary.json")) return SUMMARY;
        return TRADES;
      },
      readdirSync: () => [],
      writeFileUtf8: (p, d) => writeFileSync(p, d),
    });
    assert.equal(code, 0);
    const text = readFileSync(csvPath, "utf8");
    assert.ok(text.includes("overall"));
    assert.ok(text.includes("trade_count"));
  });
});
