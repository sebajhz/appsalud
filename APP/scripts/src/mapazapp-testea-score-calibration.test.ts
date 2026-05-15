/**
 * E5.9 — CLI tests for mapazapp:testea-score-calibration (no MT5).
 */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  analyzeTestEaBundleScoreCalibration,
  runMapazappTesteaScoreCalibrationCli,
  type ScoreCalibrationCliIo,
} from "./mapazapp-testea-score-calibration";

const SUMMARY_SCORE = `{
  "schema_version": "backtest_ea_v1",
  "run_id": "RUN_CLI_SC",
  "effective_run_id": "RUN_CLI_SC",
  "campaign_id": "C",
  "parameter_set_id": "P1",
  "strategy_id": "IFVG_X",
  "symbol": "XAUUSD",
  "has_entry_quality_score_logic": true,
  "score_observation_only": true,
  "score_gate_enabled": false,
  "score_a_count": 0,
  "score_b_count": 0,
  "score_c_count": 2,
  "score_rejected_count": 0,
  "optimization_parameters": { "virtual_min_trade_fvg_points": 10 },
  "tester_from": "2026-01-01T00:00:00Z",
  "tester_to": "2026-01-10T00:00:00Z"
}`;

const TRADES_SCORE = [
  "trade_id,direction,entry_time,exit_time,entry_price,exit_price,result_r,symbol,strategy_id,parameter_set_id,outcome,entry_quality_score,entry_quality_grade,htf_narrative_score,liquidity_event_score,displacement_fvg_quality_score,entry_confirmation_score,target_quality_score,session_news_spread_score,risk_overtrading_score,ambiguous_risk_score,missing_quality_components",
  "t1,BUY,2026-01-01T10:00:00Z,2026-01-01T11:00:00Z,1,1,2,XAUUSD,IFVG_X,P1,win,70,A,10,0,5,5,5,0,4,40,liquidity_event_not_implemented",
  "t2,BUY,2026-01-02T10:00:00Z,2026-01-02T11:00:00Z,1,1,0,XAUUSD,IFVG_X,P1,ambiguous,55,C,8,0,4,4,4,0,3,50,",
].join("\n");

function realIo(capture?: { out: string; err: string }): ScoreCalibrationCliIo {
  const cap = capture ?? { out: "", err: "" };
  return {
    stdoutWrite: (s) => {
      cap.out += s;
    },
    stderrWrite: (s) => {
      cap.err += s;
    },
    existsSync,
    readFileUtf8: (p) => readFileSync(p, "utf8"),
    readdirSync,
    writeFileUtf8: (p, d) => writeFileSync(p, d, "utf8"),
  };
}

test("CLI help exits 0", () => {
  const cap = { out: "", err: "" };
  const io: ScoreCalibrationCliIo = {
    stdoutWrite: (s) => {
      cap.out += s;
    },
    stderrWrite: (s) => {
      cap.err += s;
    },
    existsSync: () => false,
    readFileUtf8: () => "",
    readdirSync: () => [],
    writeFileUtf8: () => {},
  };
  const code = runMapazappTesteaScoreCalibrationCli(["--help"], io);
  assert.equal(code, 0);
  assert.match(cap.out, /score-calibration/);
});

test("CLI JSON analyzes a single bundle", () => {
  const dir = mkdtempSync(join(tmpdir(), "mzp-sc-"));
  const cap = { out: "", err: "" };
  try {
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY_SCORE, "utf8");
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES_SCORE, "utf8");
    const code = runMapazappTesteaScoreCalibrationCli(["--bundle", dir, "--json"], realIo(cap));
    assert.equal(code, 0);
    const j = JSON.parse(cap.out) as { bundles: unknown[]; bundlesAnalyzed: number };
    assert.equal(j.bundlesAnalyzed, 1);
    assert.equal(j.bundles.length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI recursive search finds nested bundle", () => {
  const root = mkdtempSync(join(tmpdir(), "mzp-sc-walk-"));
  const cap = { out: "", err: "" };
  try {
    const leaf = join(root, "Mapazapp", "TestEA", "E55", "SET01");
    mkdirSync(leaf, { recursive: true });
    writeFileSync(join(leaf, "backtest_summary.json"), SUMMARY_SCORE, "utf8");
    writeFileSync(join(leaf, "backtest_trades.csv"), TRADES_SCORE, "utf8");
    const code = runMapazappTesteaScoreCalibrationCli(["--search-root", root, "--campaign-folder", "E55", "--json"], realIo(cap));
    assert.equal(code, 0);
    const j = JSON.parse(cap.out) as { bundlesAnalyzed: number };
    assert.ok(j.bundlesAnalyzed >= 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("bundle without score columns is skipped without strict", () => {
  const dir = mkdtempSync(join(tmpdir(), "mzp-sc-old-"));
  const cap = { out: "", err: "" };
  try {
    writeFileSync(
      join(dir, "backtest_summary.json"),
      `{"schema_version":"backtest_ea_v1","run_id":"R","parameter_set_id":"P","strategy_id":"IFVG_X","symbol":"XAUUSD"}`,
      "utf8",
    );
    writeFileSync(
      join(dir, "backtest_trades.csv"),
      "trade_id,direction,entry_time,exit_time,entry_price,exit_price,result_r,symbol,strategy_id,parameter_set_id,outcome\nt1,BUY,2026-01-01T10:00:00Z,2026-01-01T11:00:00Z,1,1,1,XAUUSD,IFVG_X,P,win\n",
      "utf8",
    );
    const code = runMapazappTesteaScoreCalibrationCli(["--bundle", dir, "--json"], realIo(cap));
    assert.equal(code, 1);
    assert.match(cap.err + cap.out, /skip:|no bundle produced/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("strict fails when bundle skipped", () => {
  const dir = mkdtempSync(join(tmpdir(), "mzp-sc-st-"));
  const cap = { out: "", err: "" };
  try {
    writeFileSync(
      join(dir, "backtest_summary.json"),
      `{"schema_version":"backtest_ea_v1","run_id":"R","parameter_set_id":"P","strategy_id":"IFVG_X","symbol":"XAUUSD"}`,
      "utf8",
    );
    writeFileSync(
      join(dir, "backtest_trades.csv"),
      "trade_id,direction,entry_time,exit_time,entry_price,exit_price,result_r,symbol,strategy_id,parameter_set_id,outcome\nt1,BUY,2026-01-01T10:00:00Z,2026-01-01T11:00:00Z,1,1,1,XAUUSD,IFVG_X,P,win\n",
      "utf8",
    );
    const code = runMapazappTesteaScoreCalibrationCli(["--bundle", dir, "--strict", "--json"], realIo(cap));
    assert.equal(code, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("csv-output writes file", () => {
  const dir = mkdtempSync(join(tmpdir(), "mzp-sc-csv-"));
  const cap = { out: "", err: "" };
  try {
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY_SCORE, "utf8");
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES_SCORE, "utf8");
    const outPath = join(dir, "out.csv");
    const code = runMapazappTesteaScoreCalibrationCli(["--bundle", dir, "--csv-output", outPath], realIo(cap));
    assert.equal(code, 0);
    const txt = readFileSync(outPath, "utf8");
    assert.ok(txt.includes("bundleName"));
    assert.ok(txt.includes("10"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("analyzeTestEaBundleScoreCalibration does not mutate source files", () => {
  const dir = mkdtempSync(join(tmpdir(), "mzp-sc-mut-"));
  try {
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY_SCORE, "utf8");
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES_SCORE, "utf8");
    const beforeS = readFileSync(join(dir, "backtest_summary.json"), "utf8");
    const beforeT = readFileSync(join(dir, "backtest_trades.csv"), "utf8");
    const r = analyzeTestEaBundleScoreCalibration(dir);
    assert.equal(r.ok, true);
    assert.equal(readFileSync(join(dir, "backtest_summary.json"), "utf8"), beforeS);
    assert.equal(readFileSync(join(dir, "backtest_trades.csv"), "utf8"), beforeT);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
