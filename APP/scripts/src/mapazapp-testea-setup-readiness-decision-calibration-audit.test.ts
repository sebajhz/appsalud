import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { runSetupReadinessDecisionCalibrationAuditCli } from "./mapazapp-testea-setup-readiness-decision-calibration-audit";

const SUMMARY = JSON.stringify({
  has_setup_readiness_checklist_v1_logic: true,
  setup_readiness_checklist_enabled: true,
});

const TRADES = [
  "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held,setup_readiness_checklist_enabled,checklist_bias_aligned,checklist_structure_ok,checklist_liquidity_event_ok,checklist_ifvg_quality_ok,checklist_ifvg_grade,checklist_mss_choch_ok,checklist_mss_choch_timing_ok,checklist_premium_discount_ok,checklist_pd_zone_valid,checklist_entry_feasible,checklist_entry_candidate_family,checklist_entry_fragility_warning,checklist_target_ok,checklist_target_grade,checklist_target_type,checklist_execution_environment_ok,checklist_execution_environment_grade,checklist_discipline_ok,checklist_discipline_grade,checklist_overtrading_warning,setup_readiness_score,setup_readiness_grade,setup_readiness_decision,setup_readiness_blocker_count,setup_readiness_warning_count,setup_readiness_primary_blocker,setup_readiness_reasons",
  "t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2100,2100,2,0,win,2,5,true,true,true,true,true,B,true,true,true,true,true,official_50_ce,false,true,B,swing,true,B,true,B,false,90,A,reject,1,2,pd_conflict,checklist_pd_conflict|checklist_reject",
].join("\n");

describe("mapazapp-testea-setup-readiness-decision-calibration-audit CLI (E5.18.2)", () => {
  it("returns JSON for bundle with setup readiness columns", () => {
    const dir = mkdtempSync(join(tmpdir(), "ready-dec-cal-audit-"));
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY);
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES);
    let out = "";
    const code = runSetupReadinessDecisionCalibrationAuditCli(["--bundle", dir, "--json"], {
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
      overall: { trade_count: number };
      score_decision_buckets: { high_score_reject_count: number };
    };
    assert.equal(parsed.ok, true);
    assert.equal(parsed.overall.trade_count, 1);
    assert.equal(parsed.score_decision_buckets.high_score_reject_count, 1);
  });

  it("writes csv-output when requested", () => {
    const dir = mkdtempSync(join(tmpdir(), "ready-dec-cal-csv-"));
    const csvPath = join(dir, "calibration.csv");
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY);
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES);
    const code = runSetupReadinessDecisionCalibrationAuditCli(
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
        writeFileUtf8: (p, d) => writeFileSync(p, d),
      },
    );
    assert.equal(code, 0);
    const text = readFileSync(csvPath, "utf8");
    assert.ok(text.includes("grade_by_decision"));
    assert.ok(text.includes("critical_blocker"));
  });
});
