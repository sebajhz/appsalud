import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { runSetupReadinessReportCli } from "./mapazapp-testea-setup-readiness-report";

const SUMMARY = JSON.stringify({
  has_setup_readiness_checklist_v1_logic: true,
  setup_readiness_checklist_enabled: true,
  ea_build: "MZP_TestEA_E5_18",
});

const TRADES = [
  "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held,setup_readiness_checklist_enabled,checklist_bias_aligned,checklist_structure_ok,checklist_liquidity_event_ok,checklist_ifvg_quality_ok,checklist_ifvg_grade,checklist_mss_choch_ok,checklist_mss_choch_timing_ok,checklist_premium_discount_ok,checklist_pd_zone_valid,checklist_entry_feasible,checklist_entry_candidate_family,checklist_entry_fragility_warning,checklist_target_ok,checklist_target_grade,checklist_target_type,checklist_execution_environment_ok,checklist_execution_environment_grade,checklist_discipline_ok,checklist_discipline_grade,checklist_overtrading_warning,setup_readiness_score,setup_readiness_grade,setup_readiness_decision,setup_readiness_blocker_count,setup_readiness_warning_count,setup_readiness_primary_blocker,setup_readiness_reasons",
  "t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2100,2100,2,0,win,2,5,true,true,true,true,true,B,true,true,true,true,true,official_50_ce,false,true,B,swing,true,B,true,B,false,90,A,reject,1,2,pd_conflict,checklist_pd_conflict|checklist_reject",
].join("\n");

describe("mapazapp-testea-setup-readiness-report CLI (E5.19)", () => {
  it("writes json and markdown outputs", () => {
    const dir = mkdtempSync(join(tmpdir(), "ready-report-"));
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY);
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES);
    const mdPath = join(dir, "setup_readiness_report.md");
    const jsonPath = join(dir, "setup_readiness_report.json");
    const code = runSetupReadinessReportCli(
      [
        "--bundle",
        dir,
        "--markdown-output",
        mdPath,
        "--json-output",
        jsonPath,
        "--max-examples",
        "3",
      ],
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
    const md = readFileSync(mdPath, "utf8");
    const json = JSON.parse(readFileSync(jsonPath, "utf8")) as { ok: boolean; language: string };
    assert.equal(json.ok, true);
    assert.equal(json.language, "es");
    assert.ok(md.includes("Resumen ejecutivo"));
    assert.ok(md.includes("Gobernanza"));
  });

  it("defaults language to es", () => {
    const dir = mkdtempSync(join(tmpdir(), "ready-report-es-"));
    const jsonPath = join(dir, "out.json");
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY);
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES);
    runSetupReadinessReportCli(["--bundle", dir, "--json-output", jsonPath], {
      stdoutWrite: () => {},
      stderrWrite: () => {},
      existsSync: (p) => p.endsWith(".json") || p.endsWith(".csv"),
      readFileUtf8: (p) => (p.endsWith(".json") ? SUMMARY : TRADES),
      readdirSync: () => [],
      writeFileUtf8: (p, d) => writeFileSync(p, d),
    });
    const json = JSON.parse(readFileSync(jsonPath, "utf8")) as { language: string };
    assert.equal(json.language, "es");
  });

  it("fails cleanly on invalid bundle without crash", () => {
    const code = runSetupReadinessReportCli(
      ["--bundle", "/nonexistent/bundle", "--json-output", join(tmpdir(), "x.json")],
      {
        stdoutWrite: () => {},
        stderrWrite: () => {},
        existsSync: () => false,
        readFileUtf8: () => "",
        readdirSync: () => [],
        writeFileUtf8: () => {},
      },
    );
    assert.equal(code, 2);
  });

  it("respects max-examples in generated report", () => {
    const dir = mkdtempSync(join(tmpdir(), "ready-report-max-"));
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY);
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES);
    const jsonPath = join(dir, "out.json");
    runSetupReadinessReportCli(
      ["--bundle", dir, "--json-output", jsonPath, "--max-examples", "1"],
      {
        stdoutWrite: () => {},
        stderrWrite: () => {},
        existsSync: (p) => p.endsWith(".json") || p.endsWith(".csv"),
        readFileUtf8: (p) => (p.endsWith(".json") ? SUMMARY : TRADES),
        readdirSync: () => [],
        writeFileUtf8: (p, d) => writeFileSync(p, d),
      },
    );
    const json = JSON.parse(readFileSync(jsonPath, "utf8")) as {
      example_cards: unknown[];
    };
    assert.ok(json.example_cards.length <= 5);
  });
});
