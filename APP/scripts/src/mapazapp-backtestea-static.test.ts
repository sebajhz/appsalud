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
const SAMPLE_SUMMARY_PATH = join(__dirname, "../../artifacts/mt5/experts/Mapazapp_TestEA/samples/backtest_summary.json");
const SAMPLE_EVENTS_PATH = join(__dirname, "../../artifacts/mt5/experts/Mapazapp_TestEA/samples/backtest_events.csv");
const SAMPLE_TRADES_PATH = join(__dirname, "../../artifacts/mt5/experts/Mapazapp_TestEA/samples/backtest_trades.csv");
const LEGACY_BACKTEST_EA_DIR = join(__dirname, "../../artifacts/mt5/experts/Mapazapp_BacktestEA");
const PRESETS_DIR = join(__dirname, "../../artifacts/mt5/experts/Mapazapp_TestEA/presets");
const PRESET_SINGLE_SAFE = join(PRESETS_DIR, "Mapazapp_TestEA_E5_5_single_safe_export.set");
const PRESET_OPT_SWEEP = join(PRESETS_DIR, "Mapazapp_TestEA_E5_5_optimization_fvg_sweep.set");

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

test("G — summary flags: IFVG on; daily bias on; tester orders off; pipeline not full; virtual logic flag present", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /\\"has_real_ifvg_logic\\"\s*:\s*true/);
  assert.match(src, /\\"has_full_ifvg_pipeline\\"\s*:\s*false/);
  assert.match(src, /\\"has_real_daily_bias_logic\\"\s*:\s*true/);
  assert.match(src, /\\"has_real_trading_orders\\"\s*:\s*false/);
  assert.match(src, /\\"has_real_virtual_trade_logic\\"/);
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

test("O — README + EXPORT_CONTRACT declare IFVG candidate detection and tester-only exports", () => {
  assert.ok(existsSync(EXPORT_CONTRACT_PATH));
  const readme = readFileSync(README_PATH, "utf8").toLowerCase();
  const ex = readFileSync(EXPORT_CONTRACT_PATH, "utf8").toLowerCase();
  assert.ok(readme.includes("ifvg") || readme.includes("fvg"));
  assert.ok(readme.includes("trade_count") || readme.includes("header-only") || readme.includes("header only"));
  assert.ok(ex.includes("has_real_ifvg_logic") || ex.includes("ifvg"));
  assert.ok(ex.includes("tester") || ex.includes("strategy"));
});

test("P — EXPORT_CONTRACT documents E3.6 / schema freeze", () => {
  const ex = readFileSync(EXPORT_CONTRACT_PATH, "utf8");
  assert.ok(ex.includes("E3.6"));
  assert.ok(ex.toLowerCase().includes("has_full_ifvg_pipeline"));
  assert.ok(ex.includes("backtest_events.csv"));
});

test("Q — samples: summary has_full false; events include setup + virtual flow; trades include virtual rows + E5.8 score columns", () => {
  const summary = JSON.parse(readFileSync(SAMPLE_SUMMARY_PATH, "utf8")) as Record<string, unknown>;
  assert.equal(summary["has_full_ifvg_pipeline"], false);
  assert.equal(summary["has_real_ifvg_logic"], true);
  assert.equal(summary["has_real_virtual_trade_logic"], true);
  assert.equal(summary["has_entry_quality_score_logic"], true);
  assert.equal(summary["score_observation_only"], true);
  assert.equal(summary["score_gate_enabled"], false);
  assert.equal(summary["trade_count"], 3);
  assert.equal(summary["virtual_trade_count"], 3);
  const events = readFileSync(SAMPLE_EVENTS_PATH, "utf8");
  assert.match(events, /setup_detected/);
  assert.match(events, /setup_allowed|setup_rejected|setup_skipped/);
  assert.match(events, /virtual_trade_/);
  const trades = readFileSync(SAMPLE_TRADES_PATH, "utf8").trimEnd().split(/\r?\n/);
  assert.ok(trades.length >= 2);
  assert.ok(trades[0]!.includes("trade_id") && trades[0]!.includes("exit_price"));
  assert.ok(trades[0]!.includes("entry_quality_score") && trades[0]!.includes("ambiguous_risk_score"));
});

test("S — virtual trade event markers present", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /virtual_trade_candidate_created/);
  assert.match(src, /virtual_trade_closed/);
  assert.match(src, /virtual_trade_unresolved/);
});

test("R — README/contract document has_full_ifvg_pipeline false (no full-pipeline claim)", () => {
  const readme = readFileSync(README_PATH, "utf8").toLowerCase();
  const ex = readFileSync(EXPORT_CONTRACT_PATH, "utf8").toLowerCase();
  assert.ok(readme.includes("has_full_ifvg_pipeline"));
  assert.ok(readme.includes("false"));
  assert.ok(ex.includes("has_full_ifvg_pipeline"));
});

test("T — E5.5.0 optimization-safe export inputs + summary keys", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /InpCampaignId/);
  assert.match(src, /InpAutoBuildRunIdFromParams/);
  assert.match(src, /InpOptimizationSafeExports/);
  assert.match(src, /TesterResolveExportIdentity/);
  assert.match(src, /effective_run_id/);
  assert.match(src, /effective_export_folder_label/);
  assert.match(src, /optimization_parameters/);
});

test("U — E5.5.0.1: no bare StringHash(); local MapazappStableStringHash for param fingerprint", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.equal(
    /\bStringHash\s*\(/.test(src),
    false,
    "bare StringHash() is not reliably available in MQL5; use MapazappStableStringHash",
  );
  assert.match(src, /MapazappStableStringHash/);
  assert.match(src, /TesterParamFingerprintU32/);
});

test("V — E5.5.0.2: safe-export folder chain + FileOpen diagnostics + g_baseRelPath writes", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /EnsureRelativeFolderExists/);
  assert.match(src, /Mapazapp_TestEA export error: FileOpen failed for/);
  assert.match(src, /GetLastError\(\)/);
  assert.match(src, /Mapazapp_TestEA export layout: summary path:/);
  assert.match(src, /g_baseRelPath \+ "\\\\backtest_summary\.json"/);
  assert.match(src, /g_baseRelPath \+ "\\\\backtest_events\.csv"/);
  assert.match(src, /g_baseRelPath \+ "\\\\backtest_trades\.csv"/);
  assert.match(src, /FileMove\(tmp, 0, relativePath, FILE_REWRITE\)/);
});

test("W — E5.5.0.3: FileOpen must not use FILE_REWRITE; direct-write fallback after atomic path fails", () => {
  const src = readFileSync(EA_PATH, "utf8");
  const fileOpenCalls = src.match(/FileOpen\s*\([\s\S]*?\)/g) ?? [];
  assert.ok(fileOpenCalls.length > 0, "expected at least one FileOpen call");
  for (const call of fileOpenCalls) {
    assert.equal(
      call.includes("FILE_REWRITE"),
      false,
      `FILE_REWRITE is not a valid FileOpen flag in MQL5; offending call: ${call.slice(0, 120)}`,
    );
  }
  assert.match(src, /WriteTextDirect/);
  assert.match(
    src,
    /Mapazapp_TestEA export warning: atomic write failed, attempting direct write for/,
  );
  assert.match(
    src,
    /Mapazapp_TestEA export warning: direct write succeeded after atomic fallback for/,
  );
  assert.match(src, /Mapazapp_TestEA export error: direct FileOpen failed for/);
  assert.match(src, /Mapazapp_TestEA export error: FileMove failed for/);
});

test("X — E5.8 + E5.5.0.5: build marker, entry quality inputs, campaign defaults + short export folder + MT5 presets", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /#define\s+TESTEA_BUILD\s+"MZP_TestEA_E5_8_0"/);
  assert.match(src, /input bool\s+InpEntryQualityScoreEnabled\s*=\s*true/);
  assert.match(src, /input bool\s+InpEntryQualityScoreGateEnabled\s*=\s*false/);
  assert.match(src, /has_entry_quality_score_logic/);
  assert.match(src, /score_observation_only/);
  assert.match(src, /score_gate_enabled/);
  assert.match(src, /input bool\s+InpOptimizationSafeExports\s*=\s*true/);
  assert.match(src, /input bool\s+InpAutoBuildRunIdFromParams\s*=\s*true/);
  assert.match(
    src,
    /input string\s+InpCampaignId\s*=\s*"MZP_E5_5_XAUUSD_M15_D1_OUTCOME_V1"/,
  );
  assert.match(src, /input string\s+InpStrategyId\s*=\s*"MZP_IFVG_ZONE_REACTION_V1"/);
  assert.match(
    src,
    /input string\s+InpParameterSetId\s*=\s*"MZP_IFVG_XAUUSD_V1_OUTCOME_OPT_FVG_SWEEP_001"/,
  );
  assert.match(src, /input string\s+InpExportCampaignFolder\s*=\s*"E55"/);
  assert.match(src, /input string\s+InpExportParameterFolder\s*=\s*"SET001"/);
  assert.ok(existsSync(PRESETS_DIR), `expected presets dir at ${PRESETS_DIR}`);
  assert.ok(existsSync(PRESET_SINGLE_SAFE));
  assert.ok(existsSync(PRESET_OPT_SWEEP));
  const single = readFileSync(PRESET_SINGLE_SAFE, "utf8");
  const sweep = readFileSync(PRESET_OPT_SWEEP, "utf8");
  assert.match(single, /InpOptimizationSafeExports=true/);
  assert.match(sweep, /InpOptimizationSafeExports=true/);
  assert.match(single, /InpExportCampaignFolder=E55/);
  assert.match(single, /InpExportParameterFolder=SET001/);
  assert.match(sweep, /InpExportCampaignFolder=E55/);
  assert.match(sweep, /InpExportParameterFolder=SET001/);
  for (const bad of FORBIDDEN_SUBSTRINGS) {
    assert.equal(single.includes(bad), false);
    assert.equal(sweep.includes(bad), false);
  }
});

test("Y — E5.5.0.5: summary export_* keys + physical safe path ties to InpExportCampaignFolder (not full campaign_id segment)", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /\\"export_campaign_folder\\"/);
  assert.match(src, /\\"export_parameter_folder\\"/);
  assert.match(src, /g_campaignIdEffective = phyCamp/);
  assert.match(src, /string\s+phyCamp\s*=\s*SanitizeToken\s*\(\s*Trim\s*\(\s*InpExportCampaignFolder\s*\)\s*\)/);
  assert.equal(
    /tail\[0\]\s*=\s*g_campaignIdForSummary/.test(src),
    false,
    "optimization-safe physical folder must not use g_campaignIdForSummary (full campaign metadata) as path segment",
  );
  for (const bad of FORBIDDEN_SUBSTRINGS) {
    assert.equal(src.includes(bad), false);
  }
});

test("Z — E5.8: score field tokens present in EA (CSV header + components)", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /entry_quality_grade/);
  assert.match(src, /htf_narrative_score/);
  assert.match(src, /liquidity_event_score/);
  assert.match(src, /displacement_fvg_quality_score/);
  assert.match(src, /entry_confirmation_score/);
  assert.match(src, /ambiguous_risk_score/);
  assert.match(src, /missing_quality_components/);
  assert.match(src, /ambiguous_risk_reasons/);
});
