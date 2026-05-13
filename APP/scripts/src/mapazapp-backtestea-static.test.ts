/**
 * E3.5 — Static safety + IFVG Setup V1 markers for official `Mapazapp_TestEA.mq5` (no MetaEditor).
 * Historical name `mapazapp-backtestea-static.test.ts` kept for the scripts package test entry.
 */

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EA_PATH = join(__dirname, "../../artifacts/mt5/experts/Mapazapp_TestEA/Mapazapp_TestEA.mq5");
const README_PATH = join(__dirname, "../../artifacts/mt5/experts/Mapazapp_TestEA/README.md");
const EXPORT_CONTRACT_PATH = join(__dirname, "../../artifacts/mt5/experts/Mapazapp_TestEA/EXPORT_CONTRACT.md");
const LEGACY_BACKTEST_EA_DIR = join(__dirname, "../../artifacts/mt5/experts/Mapazapp_BacktestEA");

const FORBIDDEN_SUBSTRINGS = [
  "OrderSend",
  "CTrade",
  "PositionOpen",
  "WebRequest",
  "socket",
  "terminal64.exe",
] as const;

test("A — Mapazapp_TestEA.mq5 exists (official target)", () => {
  assert.ok(existsSync(EA_PATH), `missing EA at ${EA_PATH}`);
});

test("B — README declares official Strategy Tester EA", () => {
  assert.ok(existsSync(README_PATH));
  const readme = readFileSync(README_PATH, "utf8");
  const lower = readme.toLowerCase();
  assert.ok(lower.includes("mapazapp_testea") || lower.includes("mapazapp testea"));
  assert.ok(lower.includes("strategy tester"));
  assert.ok(lower.includes("official") || lower.includes("oficial"));
});

test("C — MQL_TESTER guard present", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /MQLInfoInteger\s*\(\s*MQL_TESTER\s*\)/);
});

test("D — INIT_FAILED outside tester", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /INIT_FAILED/);
});

test("E — forbidden live/network/trade API tokens absent in MQL5 source", () => {
  const src = readFileSync(EA_PATH, "utf8");
  for (const bad of FORBIDDEN_SUBSTRINGS) {
    assert.equal(
      src.includes(bad),
      false,
      `must not contain literal substring ${JSON.stringify(bad)}`,
    );
  }
  const lower = src.toLowerCase();
  assert.equal(lower.includes("command file ingest"), false);
  assert.equal(lower.includes("live trading copy"), false);
});

test("F — expected export filenames referenced", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /backtest_trades\.csv/);
  assert.match(src, /backtest_events\.csv/);
  assert.match(src, /backtest_summary\.json/);
});

test("G — summary flags: IFVG on; daily bias on; tester orders off", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /\\"has_real_ifvg_logic\\"\s*:\s*true/);
  assert.match(src, /\\"has_real_daily_bias_logic\\"\s*:\s*true/);
  assert.match(src, /\\"has_real_trading_orders\\"\s*:\s*false/);
});

test("H — Daily Bias V1 + gate markers", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /EvaluateDailyBiasV1/);
  assert.match(src, /daily_bias_evaluated/);
  assert.match(src, /ApplyDailyBiasGatePlaceholder/);
  assert.match(src, /ApplyDailyBiasGateToSetup/);
});

test("I — summary bias + setup counters present", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /total_bias_evaluated/);
  assert.match(src, /bullish_bias_count/);
  assert.match(src, /bearish_bias_count/);
  assert.match(src, /neutral_bias_count/);
  assert.match(src, /unknown_bias_count/);
  assert.match(src, /total_setup_candidates/);
  assert.match(src, /bullish_setup_candidates/);
  assert.match(src, /bearish_setup_candidates/);
  assert.match(src, /allowed_setups/);
  assert.match(src, /ignored_small_fvg/);
  assert.match(src, /last_setup_direction/);
  assert.match(src, /last_setup_decision/);
  assert.match(src, /last_fvg_points/);
  assert.match(src, /rejected_by_daily_bias/);
  assert.match(src, /skipped_neutral_bias/);
  assert.match(src, /missing_bias_context/);
});

test("J — wire bias + setup direction tokens present", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /"bullish"/);
  assert.match(src, /"bearish"/);
  assert.match(src, /"neutral"/);
  assert.match(src, /"unknown"/);
  assert.match(src, /"long"/);
  assert.match(src, /"short"/);
});

test("K — official EA markers in summary JSON builder", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /\\"official_ea\\"\s*:\s*\\"Mapazapp_TestEA\\"/);
  assert.match(src, /\\"backtest_role\\"\s*:\s*true/);
});

test("L — IFVG setup event types + core functions", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /setup_detected/);
  assert.match(src, /setup_allowed/);
  assert.match(src, /setup_rejected/);
  assert.match(src, /setup_skipped/);
  assert.match(src, /DetectIfvgSetupV1/);
  assert.match(src, /ExportSetupEvent/);
});

test("M — no forbidden TS/network patterns in EA source", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.equal(src.includes("router.post"), false);
  assert.equal(src.includes("fetch("), false);
});

test("N — temporary Mapazapp_BacktestEA artifact removed from active tree", () => {
  assert.equal(
    existsSync(join(LEGACY_BACKTEST_EA_DIR, "Mapazapp_BacktestEA.mq5")),
    false,
    "Mapazapp_BacktestEA.mq5 should not remain after E3.4.2 merge",
  );
});

test("O — README + EXPORT_CONTRACT declare IFVG candidate detection and no trades", () => {
  assert.ok(existsSync(EXPORT_CONTRACT_PATH));
  const readme = readFileSync(README_PATH, "utf8").toLowerCase();
  const ex = readFileSync(EXPORT_CONTRACT_PATH, "utf8").toLowerCase();
  assert.ok(readme.includes("ifvg") || readme.includes("fvg"));
  assert.ok(readme.includes("trade_count") || readme.includes("header-only") || readme.includes("header only"));
  assert.ok(ex.includes("has_real_ifvg_logic") || ex.includes("ifvg"));
  assert.ok(ex.includes("tester") || ex.includes("strategy"));
});
