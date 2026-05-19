import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { runExecutionEnvironmentCalibrationAuditCli } from "./mapazapp-testea-execution-environment-calibration-audit";

const SUMMARY = JSON.stringify({
  has_session_spread_volatility_v1_logic: true,
  session_spread_volatility_enabled: true,
});

const TRADES = [
  "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held,session_spread_volatility_enabled,session_bucket,session_phase,session_hour,session_timezone_offset_hours,is_asian_session,is_london_session,is_new_york_session,is_london_new_york_overlap,is_off_session,spread_context_enabled,spread_points,spread_bucket,spread_is_warning,spread_is_high,spread_is_extreme,volatility_context_enabled,volatility_atr_points,volatility_bucket,volatility_is_low,volatility_is_high,volatility_is_extreme,volatility_range_points,volatility_range_to_atr_ratio,execution_environment_score,execution_environment_grade,execution_environment_reasons",
  "t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2100,2100,2,0,win,2,5,true,london,session_mid_window,12,0,false,true,false,false,false,true,7,normal,false,false,false,true,850,extreme,false,false,true,900,1.05,4,Weak,volatility_extreme|session_london",
].join("\n");

describe("mapazapp-testea-execution-environment-calibration-audit CLI (E5.16.2)", () => {
  it("returns JSON for bundle with SSV columns", () => {
    const dir = mkdtempSync(join(tmpdir(), "exec-env-cal-audit-"));
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY);
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES);
    let out = "";
    const code = runExecutionEnvironmentCalibrationAuditCli(["--bundle", dir, "--json"], {
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
    const dir = mkdtempSync(join(tmpdir(), "exec-env-cal-csv-"));
    const csvPath = join(dir, "calibration.csv");
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY);
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES);
    const code = runExecutionEnvironmentCalibrationAuditCli(["--bundle", dir, "--csv-output", csvPath], {
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
    assert.ok(text.includes("threshold_sensitivity"));
    assert.ok(text.includes("volatility_bucket"));
  });
});
