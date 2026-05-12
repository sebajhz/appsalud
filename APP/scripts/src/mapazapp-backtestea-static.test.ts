/**
 * E3.3 / E3.4 — Static safety and Daily Bias V1 markers for Mapazapp_BacktestEA.mq5 (no MetaEditor).
 */

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EA_PATH = join(__dirname, "../../artifacts/mt5/experts/Mapazapp_BacktestEA/Mapazapp_BacktestEA.mq5");
const README_PATH = join(__dirname, "../../artifacts/mt5/experts/Mapazapp_BacktestEA/README.md");

const FORBIDDEN_SUBSTRINGS = [
  "OrderSend",
  "CTrade",
  "PositionOpen",
  "WebRequest",
  "socket",
  "terminal64.exe",
] as const;

test("A — Mapazapp_BacktestEA.mq5 exists", () => {
  assert.ok(existsSync(EA_PATH), `missing EA at ${EA_PATH}`);
});

test("B — MQL_TESTER guard present", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /MQLInfoInteger\s*\(\s*MQL_TESTER\s*\)/);
});

test("C — INIT_FAILED outside tester", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /INIT_FAILED/);
});

test("D — forbidden live/network/trade API tokens absent in MQL5 source", () => {
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

test("E — expected export filenames referenced", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /backtest_trades\.csv/);
  assert.match(src, /backtest_events\.csv/);
  assert.match(src, /backtest_summary\.json/);
});

test("F — summary flags: IFVG and tester orders off; daily bias on", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /"has_real_ifvg_logic"\s*:\s*false/);
  assert.match(src, /"has_real_daily_bias_logic"\s*:\s*true/);
  assert.match(src, /"has_real_trading_orders"\s*:\s*false/);
});

test("G — Daily Bias V1 implementation markers", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /EvaluateDailyBiasV1/);
  assert.match(src, /daily_bias_evaluated/);
  assert.match(src, /ApplyDailyBiasGatePlaceholder/);
});

test("H — summary bias counters present", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /total_bias_evaluated/);
  assert.match(src, /bullish_bias_count/);
  assert.match(src, /bearish_bias_count/);
  assert.match(src, /neutral_bias_count/);
  assert.match(src, /unknown_bias_count/);
  assert.match(src, /rejected_by_daily_bias/);
  assert.match(src, /skipped_neutral_bias/);
  assert.match(src, /missing_bias_context/);
});

test("I — wire bias direction tokens present", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /"bullish"/);
  assert.match(src, /"bearish"/);
  assert.match(src, /"neutral"/);
  assert.match(src, /"unknown"/);
});

test("J — README declares Daily Bias V1 and tester-only posture", () => {
  assert.ok(existsSync(README_PATH));
  const readme = readFileSync(README_PATH, "utf8");
  const lower = readme.toLowerCase();
  assert.ok(lower.includes("daily bias"));
  assert.ok(lower.includes("v1") || lower.includes("e3.4"));
  assert.ok(lower.includes("strategy tester") || lower.includes("solo strategy tester"));
  assert.ok(lower.includes("live") && (lower.includes("no ") || lower.includes("not ")));
});
