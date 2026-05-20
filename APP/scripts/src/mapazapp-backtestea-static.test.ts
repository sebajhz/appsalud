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

test("G — summary flags: IFVG on; daily bias on; tester orders off; pipeline not full; virtual logic flag present; liquidity sweep V1 + quality V1 flags present", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /\\"has_real_ifvg_logic\\"\s*:\s*true/);
  assert.match(src, /\\"has_full_ifvg_pipeline\\"\s*:\s*false/);
  assert.match(src, /\\"has_real_daily_bias_logic\\"\s*:\s*true/);
  assert.match(src, /\\"has_real_trading_orders\\"\s*:\s*false/);
  assert.match(src, /\\"has_real_virtual_trade_logic\\"/);
  assert.match(src, /\\"has_liquidity_sweep_v1_logic\\"\s*:\s*true/);
  assert.match(src, /\\"has_liquidity_sweep_quality_v1_logic\\"\s*:\s*true/);
  assert.match(src, /\\"has_liquidity_chain_v1_logic\\"\s*:\s*true/);
  assert.match(src, /\\"has_liquidity_chain_reaction_audit_v1_logic\\"\s*:\s*true/);
  assert.match(src, /\\"has_htf_structure_v1_logic\\"\s*:\s*true/);
  assert.match(src, /\\"has_mss_choch_v1_logic\\"\s*:\s*true/);
  assert.match(src, /\\"has_mss_choch_temporal_relevance_v1_logic\\"\s*:\s*true/);
  assert.match(src, /\\"has_premium_discount_v1_logic\\"\s*:\s*true/);
  assert.match(src, /\\"has_entry_fill_feasibility_v1_logic\\"\s*:\s*true/);
  assert.match(src, /\\"has_entry_variant_feasibility_v1_logic\\"\s*:\s*true/);
  assert.match(src, /\\"has_ifvg_bisi_sibi_v1_logic\\"\s*:\s*true/);
  assert.match(src, /\\"has_liquidity_target_quality_v1_logic\\"\s*:\s*true/);
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

test("Q — samples: summary has_full false; events include setup + virtual flow; trades include virtual rows + E5.8 score + E5.10 liquidity + E5.10.4 chain columns", () => {
  const summary = JSON.parse(readFileSync(SAMPLE_SUMMARY_PATH, "utf8")) as Record<string, unknown>;
  assert.equal(summary["has_full_ifvg_pipeline"], false);
  assert.equal(summary["has_real_ifvg_logic"], true);
  assert.equal(summary["has_real_virtual_trade_logic"], true);
  assert.equal(summary["has_entry_quality_score_logic"], true);
  assert.equal(summary["has_liquidity_sweep_v1_logic"], true);
  assert.equal(summary["has_liquidity_sweep_quality_v1_logic"], true);
  assert.equal(summary["has_liquidity_chain_v1_logic"], true);
  assert.equal(summary["has_liquidity_chain_reaction_audit_v1_logic"], true);
  assert.equal(summary["has_htf_structure_v1_logic"], true);
  assert.equal(summary["htf_structure_enabled"], true);
  assert.equal(summary["has_mss_choch_v1_logic"], true);
  assert.equal(summary["has_mss_choch_temporal_relevance_v1_logic"], true);
  assert.equal(summary["has_premium_discount_v1_logic"], true);
  assert.equal(summary["premium_discount_enabled"], true);
  assert.equal(summary["average_premium_discount_score"], 10.666667);
  assert.equal(summary["average_mss_temporal_relevance_score"], 5.0);
  assert.equal(summary["mss_choch_enabled"], true);
  assert.equal(summary["score_observation_only"], true);
  assert.equal(summary["score_gate_enabled"], false);
  assert.equal(summary["trade_count"], 3);
  assert.equal(summary["virtual_trade_count"], 3);
  const events = readFileSync(SAMPLE_EVENTS_PATH, "utf8");
  assert.match(events, /setup_detected/);
  assert.match(events, /setup_allowed|setup_rejected|setup_skipped/);
  assert.match(events, /virtual_trade_/);
  assert.match(events, /liq_q=/);
  assert.match(events, /htf_en=/);
  assert.match(events, /pd_en=/);
  const trades = readFileSync(SAMPLE_TRADES_PATH, "utf8").trimEnd().split(/\r?\n/);
  assert.ok(trades[0]!.includes("mss_temporal_relevance_score"));
  assert.ok(trades[0]!.includes("choch_temporal_relevance_score"));
  assert.ok(trades[0]!.includes("mss_after_sweep"));
  assert.ok(trades[0]!.includes("mss_before_entry"));
  assert.ok(trades[0]!.includes("mss_too_early"));
  assert.ok(trades[0]!.includes("mss_too_late"));
  assert.ok(trades[0]!.includes("choch_after_sweep"));
  assert.ok(trades[0]!.includes("choch_before_entry"));
  assert.ok(trades[0]!.includes("choch_too_early"));
  assert.ok(trades[0]!.includes("choch_too_late"));
  assert.ok(trades.length >= 2);
  assert.ok(trades[0]!.includes("trade_id") && trades[0]!.includes("exit_price"));
  assert.ok(trades[0]!.includes("entry_quality_score") && trades[0]!.includes("ambiguous_risk_score"));
  assert.ok(trades[0]!.includes("liquidity_event_detected") && trades[0]!.includes("liquidity_event_type"));
  assert.ok(trades[0]!.includes("liquidity_sweep_quality_score") && trades[0]!.includes("liquidity_sweep_recency_score"));
  assert.ok(trades[0]!.includes("liquidity_chain_detected") && trades[0]!.includes("liquidity_chain_score"));
  assert.ok(
    trades[0]!.includes("liquidity_chain_reaction_confirmed") &&
      trades[0]!.includes("liquidity_chain_displacement_confirmed") &&
      trades[0]!.includes("liquidity_chain_fvg_created_after_sweep"),
  );
  assert.ok(trades[0]!.includes("liquidity_chain_reaction_failure_reason"));
  assert.ok(trades[0]!.includes("htf_structure_score"));
  assert.ok(trades[0]!.includes("premium_discount_score"));
  assert.equal(summary["has_ifvg_bisi_sibi_v1_logic"], true);
  assert.equal(summary["ifvg_bisi_sibi_enabled"], true);
  assert.ok(trades[0]!.includes("ifvg_bisi_sibi_enabled"));
  assert.ok(trades[0]!.includes("fvg_class"));
  assert.ok(trades[0]!.includes("ifvg_bisi_sibi_score"));
  assert.ok(trades[0]!.includes("pd_range_high"));
  assert.ok(trades[0]!.includes("pd_midpoint_50"));
  assert.ok(trades[0]!.includes("pd_position_pct"));
  assert.ok(trades[0]!.includes("pd_entry_zone"));
  assert.ok(trades[0]!.includes("pd_entry_zone_valid_for_direction"));
  assert.ok(trades[0]!.includes("mss_detected"));
  assert.ok(trades[0]!.includes("choch_detected"));
  assert.ok(trades[0]!.includes("h4_structure_state"));
  assert.ok(trades[0]!.includes("h1_structure_state"));
  assert.ok(trades[0]!.includes("htf_structure_aligned"));
  assert.ok(trades[0]!.includes("h4_protected_high"));
  assert.ok(trades[0]!.includes("h4_protected_low"));
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

test("X — E5.12 + E5.11 + E5.10.6 + E5.5.0.5: build marker, MSS/CHoCH V1 + HTF structure V1 inputs, entry quality + liquidity sweep inputs, campaign defaults + short export folder + MT5 presets", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /#define\s+TESTEA_BUILD\s+"MZP_TestEA_E5_18"/);
  assert.match(src, /input bool\s+InpEnablePremiumDiscountV1\s*=\s*true/);
  assert.match(src, /input int\s+InpPremiumDiscountSwingLookbackBars\s*=\s*2/);
  assert.match(src, /input int\s+InpPremiumDiscountMaxBars\s*=\s*200/);
  assert.match(src, /input int\s+InpPremiumDiscountEquilibriumBandPct\s*=\s*10/);
  assert.match(src, /input bool\s+InpPremiumDiscountScoreEnabled\s*=\s*true/);
  assert.match(src, /input bool\s+InpEnableMssChochV1\s*=\s*true/);
  assert.match(src, /input int\s+InpMssChochSwingLookbackBars\s*=\s*2/);
  assert.match(src, /input int\s+InpMssChochMaxBars\s*=\s*200/);
  assert.match(src, /input bool\s+InpMssChochRequireCloseBreak\s*=\s*true/);
  assert.match(src, /input bool\s+InpMssChochScoreEnabled\s*=\s*true/);
  assert.match(src, /input bool\s+InpEnableHtfStructureV1\s*=\s*true/);
  assert.match(src, /input int\s+InpHtfStructureSwingLookbackBars\s*=\s*2/);
  assert.match(src, /input int\s+InpHtfStructureMaxBars\s*=\s*300/);
  assert.match(src, /input bool\s+InpHtfStructureScoreEnabled\s*=\s*true/);
  assert.match(src, /input bool\s+InpEntryQualityScoreEnabled\s*=\s*true/);
  assert.match(src, /input bool\s+InpEntryQualityScoreGateEnabled\s*=\s*false/);
  assert.match(src, /input bool\s+InpEnableLiquiditySweepDetection\s*=\s*true/);
  assert.match(src, /input int\s+InpLiquiditySweepLookbackBars\s*=\s*48/);
  assert.match(src, /input int\s+InpLocalSwingLookbackBars\s*=\s*20/);
  assert.match(src, /input int\s+InpLiquiditySweepBufferPoints\s*=\s*0/);
  assert.match(src, /input bool\s+InpLiquiditySweepScoreEnabled\s*=\s*true/);
  assert.match(src, /has_entry_quality_score_logic/);
  assert.match(src, /has_liquidity_sweep_v1_logic/);
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

test("Z — E5.8 + E5.10 + E5.10.2 + E5.10.4: score field tokens + liquidity chain export markers in EA (CSV header + components)", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /entry_quality_grade/);
  assert.match(src, /htf_narrative_score/);
  assert.match(src, /liquidity_event_score/);
  assert.match(src, /liquidity_event_detected/);
  assert.match(src, /liquidity_event_type/);
  assert.match(src, /liquidity_sweep_quality_score/);
  assert.match(src, /liquidity_sweep_recency_score/);
  assert.match(src, /liquidity_sweep_reaction_score/);
  assert.match(src, /liquidity_sweep_displacement_score/);
  assert.match(src, /liquidity_sweep_directional_score/);
  assert.match(src, /liquidity_sweep_distance_score/);
  assert.match(src, /displacement_fvg_quality_score/);
  assert.match(src, /entry_confirmation_score/);
  assert.match(src, /ambiguous_risk_score/);
  assert.match(src, /missing_quality_components/);
  assert.match(src, /ambiguous_risk_reasons/);
  assert.match(src, /has_liquidity_sweep_v1_logic/);
  assert.match(src, /has_liquidity_sweep_quality_v1_logic/);
  assert.match(src, /has_liquidity_chain_v1_logic/);
  assert.match(src, /liquidity_chain_detected/);
  assert.match(src, /liquidity_chain_score/);
  assert.match(src, /liquidity_chain_reaction_confirmed/);
  assert.match(src, /liquidity_chain_displacement_confirmed/);
  assert.match(src, /liquidity_chain_fvg_created_after_sweep/);
  assert.match(src, /MapzLiquidityClosedReactionWindowOk/);
  assert.match(src, /liquidity_chain_reaction_failure_reason/);
  assert.match(src, /liquidity_chain_reaction_checked_count/);
  assert.match(src, /has_mss_choch_v1_logic/);
  assert.match(src, /has_mss_choch_temporal_relevance_v1_logic/);
  assert.match(src, /mss_choch_score/);
  assert.match(src, /mss_temporal_relevance_score/);
  assert.match(src, /choch_temporal_relevance_score/);
  assert.match(src, /MapzPremiumDiscountBuildTradeSnap/);
  assert.match(src, /premium_discount_score/);
  assert.match(src, /pd_midpoint_50/);
  assert.match(src, /has_premium_discount_v1_logic/);
  assert.match(src, /InpEnableEntryFillFeasibilityV1/);
  assert.match(src, /has_entry_fill_feasibility_v1_logic/);
  assert.match(src, /entry_fill_feasibility_score/);
  assert.match(src, /entry_depth_in_fvg_pct/);
  assert.match(src, /max_retrace_into_fvg_pct/);
  assert.match(src, /missed_entry_by_points/);
  assert.match(src, /entry_missed_shallow_retrace/);
  assert.match(src, /entry_too_deep_for_retest/);
  assert.match(src, /entry_near_miss/);
  assert.match(src, /MapzEffInitGeometry/);
  assert.match(src, /MapzEffAppendReasonOnce/);
  assert.match(src, /MapzReasonBufHasToken/);
  assert.match(src, /InpEnableEntryVariantFeasibilityV1/);
  assert.match(src, /has_entry_variant_feasibility_v1_logic/);
  assert.match(src, /entry_variant_edge_price/);
  assert.match(src, /entry_variant_25_price/);
  assert.match(src, /entry_variant_50_price/);
  assert.match(src, /entry_variant_75_price/);
  assert.match(src, /entry_variant_edge_reached/);
  assert.match(src, /entry_variant_25_reached/);
  assert.match(src, /entry_variant_50_reached/);
  assert.match(src, /entry_variant_75_reached/);
  assert.match(src, /entry_variant_feasibility_score/);
  assert.match(src, /MapzEvInitGeometry/);
  assert.match(src, /MapzEvTrackBar/);
  assert.match(src, /MapzEvFinalize/);
  assert.match(src, /InpEnableEntryVariantOutcomeSimulationV1/);
  assert.match(src, /has_entry_variant_outcome_sim_v1_logic/);
  assert.match(src, /entry_variant_edge_sim_status/);
  assert.match(src, /entry_variant_25_sim_status/);
  assert.match(src, /entry_variant_50_sim_status/);
  assert.match(src, /entry_variant_75_sim_status/);
  assert.match(src, /entry_variant_adaptive_sim_status/);
  assert.match(src, /entry_variant_edge_sim_result_r/);
  assert.match(src, /entry_variant_25_sim_result_r/);
  assert.match(src, /entry_variant_50_sim_result_r/);
  assert.match(src, /entry_variant_75_sim_result_r/);
  assert.match(src, /entry_variant_adaptive_sim_result_r/);
  assert.match(src, /MapzEvosInitFromTrade/);
  assert.match(src, /MapzEvosFinalizeTrade/);
  assert.match(src, /MapzEvosPrepareSlotStrictOfficial/);
  assert.match(src, /MapzEvosSyncP50StrictOnOfficialFill/);
  assert.match(src, /MapzEvosSyncP50StrictOnOfficialClose/);
  assert.equal(
    /MapzVariantSimSlot\s*&\s*\w+\s*=\s*g_vt\.evos\.p50/.test(src),
    false,
    "MQL5 forbids local reference aliases to nested struct fields (g_vt.evos.p50)",
  );
  assert.match(src, /strict_official_parity/);
  assert.match(src, /entry_variant_sim_p50_official_control/);
  assert.match(src, /has_entry_variant_outcome_sim_v1_parity_control/);
  assert.match(src, /has_htf_structure_v1_logic/);
  assert.match(src, /htf_structure_score/);
  assert.match(src, /h4_structure_state/);
  assert.match(src, /h1_structure_state/);
  assert.match(src, /htf_structure_aligned/);
  assert.match(src, /MapzHtfBuildTradeSnap/);
});

test("AA — E5.13.6.11 Buffered EVOS diagnostics (summary-only; no orders)", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /InpEnableBufferedEvosV1/);
  assert.match(src, /InpBufferedEvosBufferA_Points/);
  assert.match(src, /InpBufferedEvosBufferF_Points/);
  assert.match(src, /InpBufferedEvosMinEffectiveRr/);
  assert.match(src, /\\"has_buffered_evos_v1_logic\\"\s*:\s*true/);
  assert.match(src, /const string keyBase = "buffered_evos_"/);
  assert.match(src, /MapzBufEvosAppendRollup/);
  assert.match(src, /_filled_count/);
  assert.match(src, /_fragile_count/);
  assert.match(src, /_expectancy_r/);
  assert.match(src, /buffered_evos_best_variant_by_expectancy_b30/);
  assert.match(src, /wins_failing_min_effective_rr_count/);
  assert.match(src, /MapzBufEvosTrackBar/);
  assert.equal(
    /MapzBufferedEvosRollup\s*&\s*\w+\s*=\s*g_buf_evos_rollups/.test(src),
    false,
    "MQL5 forbids local reference aliases to g_buf_evos_rollups[][] elements",
  );
  assert.match(src, /has_entry_variant_outcome_sim_v1_parity_control/);
  assert.match(src, /entry_variant_sim_p50_official_control/);
  for (const bad of FORBIDDEN_SUBSTRINGS) {
    assert.equal(src.includes(bad), false, `must not contain ${bad}`);
  }
});

test("AC — E5.15 Liquidity Target Quality V1 (export-only; no orders)", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /#define\s+TESTEA_BUILD\s+"MZP_TestEA_E5_18"/);
  assert.match(src, /input bool\s+InpEnableLiquidityTargetQualityV1\s*=\s*true/);
  assert.match(src, /input int\s+InpLiquidityTargetLookbackBars\s*=\s*200/);
  assert.match(src, /input int\s+InpLiquidityTargetSwingLookbackBars\s*=\s*2/);
  assert.match(src, /input int\s+InpLiquidityTargetEqualLevelTolerancePoints\s*=\s*50/);
  assert.match(src, /input int\s+InpLiquidityTargetMinDistancePoints\s*=\s*20/);
  assert.match(src, /input bool\s+InpLiquidityTargetScoreEnabled\s*=\s*true/);
  assert.match(src, /\\"has_liquidity_target_quality_v1_logic\\"\s*:\s*true/);
  assert.match(src, /liquidity_target_quality_v1_enabled/);
  assert.match(src, /liquidity_target_supported_count/);
  assert.match(src, /average_liquidity_target_score/);
  assert.match(src, /liquidity_target_grade_a_count/);
  assert.match(src, /MapzLqTgtBuildTradeSnap/);
  assert.match(src, /MapzLqTgtFinalize/);
  assert.match(src, /liquidity_target_score/);
  assert.match(src, /liquidity_target_reasons/);
  assert.match(src, /MapzLqTgtCompactSuffix/);
  assert.match(src, /has_entry_variant_outcome_sim_v1_parity_control/);
  assert.match(src, /entry_variant_sim_p50_official_control/);
  for (const bad of FORBIDDEN_SUBSTRINGS) {
    assert.equal(src.includes(bad), false, `must not contain ${bad}`);
  }
});

test("AD — E5.16 Session / Spread / Volatility Context V1 (export-only; no orders)", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /InpEnableSessionSpreadVolatilityV1/);
  assert.match(src, /input bool\s+InpEnableSessionSpreadVolatilityV1\s*=\s*true/);
  assert.match(src, /input int\s+InpSessionTimezoneOffsetHours\s*=\s*0/);
  assert.match(src, /input int\s+InpSpreadWarningPoints\s*=\s*30/);
  assert.match(src, /input int\s+InpVolatilityAtrPeriod\s*=\s*14/);
  assert.match(src, /\\"has_session_spread_volatility_v1_logic\\"\s*:\s*true/);
  assert.match(src, /session_spread_volatility_enabled/);
  assert.match(src, /session_asian_count/);
  assert.match(src, /spread_normal_count/);
  assert.match(src, /average_volatility_atr_points/);
  assert.match(src, /average_execution_environment_score/);
  assert.match(src, /execution_environment_grade_a_count/);
  assert.match(src, /MapzSsvBuildTradeSnap/);
  assert.match(src, /MapzSsvFinalize/);
  assert.match(src, /session_bucket/);
  assert.match(src, /spread_bucket/);
  assert.match(src, /volatility_bucket/);
  assert.match(src, /execution_environment_score/);
  assert.match(src, /execution_environment_reasons/);
  assert.match(src, /MapzSsvCompactSuffix/);
  assert.match(src, /has_entry_variant_outcome_sim_v1_parity_control/);
  assert.match(src, /entry_variant_sim_p50_official_control/);
  for (const bad of FORBIDDEN_SUBSTRINGS) {
    assert.equal(src.includes(bad), false, `must not contain ${bad}`);
  }
});

test("AE — E5.17 Frequency / Risk / Overtrading Discipline V1 (export-only; no orders)", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /#define\s+TESTEA_BUILD\s+"MZP_TestEA_E5_18"/);
  assert.match(src, /MapzDiscClampScore/);
  assert.match(src, /input bool\s+InpEnableFrequencyRiskDisciplineV1\s*=\s*true/);
  assert.match(src, /input int\s+InpDisciplineMaxTradesPerDay\s*=\s*3/);
  assert.match(src, /input double\s+InpDisciplineMaxDailyLossR\s*=\s*-2\.0/);
  assert.match(src, /\\"has_frequency_risk_discipline_v1_logic\\"\s*:\s*true/);
  assert.match(src, /frequency_risk_discipline_enabled/);
  assert.match(src, /discipline_overtrading_risk_count/);
  assert.match(src, /average_discipline_score/);
  assert.match(src, /discipline_grade_a_count/);
  assert.match(src, /MapzDiscBuildPreTradeSnap/);
  assert.match(src, /MapzDiscCompletePostTrade/);
  assert.match(src, /frequency_risk_discipline_enabled/);
  assert.match(src, /discipline_trades_so_far_today/);
  assert.match(src, /discipline_score/);
  assert.match(src, /discipline_reasons/);
  assert.match(src, /MapzDiscCompactSuffix/);
  assert.match(src, /has_entry_variant_outcome_sim_v1_parity_control/);
  assert.match(src, /entry_variant_sim_p50_official_control/);
  for (const bad of FORBIDDEN_SUBSTRINGS) {
    assert.equal(src.includes(bad), false, `must not contain ${bad}`);
  }
});

test("AE1 — E5.17.1.1 duplicate fvg_ce_price CSV header cleanup (export-only)", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /#define\s+TESTEA_BUILD\s+"MZP_TestEA_E5_18"/);
  const headerMatch = src.match(/string WriteTradesHeader\(void\)\s*\{[\s\S]*?return "([^"]+)"/);
  assert.ok(headerMatch, "WriteTradesHeader must exist");
  const headerCols = headerMatch![1]!.split(",");
  const fvgCeCount = headerCols.filter((c) => c === "fvg_ce_price").length;
  assert.equal(fvgCeCount, 1, "WriteTradesHeader must include exactly one fvg_ce_price column");
  assert.doesNotMatch(
    src,
    /fvg_near_edge_price,fvg_far_edge_price,fvg_ce_price,entry_depth_in_fvg_pct/,
    "entry fill feasibility block must not re-export fvg_ce_price (canonical IFVG column only)",
  );
  assert.doesNotMatch(
    src,
    /g_vt\.eff\.fvg_ce_price,\s*_Digits\)/,
    "VirtualAppendTradeCsvRow must not append duplicate eff.fvg_ce_price value column",
  );
  assert.match(src, /g_vt\.ifvg\.fvg_ce_price/);
  for (const bad of FORBIDDEN_SUBSTRINGS) {
    assert.equal(src.includes(bad), false, `must not contain ${bad}`);
  }
});

test("AE0.1 — E5.17.0.1 discipline score bounded 0–15 (export-only)", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /#define\s+TESTEA_BUILD\s+"MZP_TestEA_E5_18"/);
  assert.match(src, /int MapzDiscClampScore\(const int sc\)/);
  assert.match(src, /sc = MapzDiscClampScore\(sc\)/);
  assert.match(src, /g_disc_sum_score \+= \(double\)boundedScore/);
  assert.doesNotMatch(
    src,
    /VirtualAppendTradeCsvRow[\s\S]{0,800}g_disc_sum_score \+= \(double\)g_vt\.disc\.score/,
  );
  assert.match(src, /MapzDiscGradeFromScore\(boundedScore\)/);
  for (const bad of FORBIDDEN_SUBSTRINGS) {
    assert.equal(src.includes(bad), false, `must not contain ${bad}`);
  }
});

test("AB — E5.14 IFVG / BISI / SIBI classification V1 (export-only; no orders)", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /InpEnableIfvgBisiSibiV1/);
  assert.match(src, /input bool\s+InpEnableIfvgBisiSibiV1\s*=\s*true/);
  assert.match(src, /input int\s+InpIfvgBisiSibiMaxBars\s*=\s*200/);
  assert.match(src, /input bool\s+InpIfvgRequireCloseInversion\s*=\s*true/);
  assert.match(src, /input bool\s+InpIfvgTrackRetest\s*=\s*true/);
  assert.match(src, /input bool\s+InpIfvgScoreEnabled\s*=\s*true/);
  assert.match(src, /\\"has_ifvg_bisi_sibi_v1_logic\\"\s*:\s*true/);
  assert.match(src, /ifvg_bisi_sibi_v1_enabled/);
  assert.match(src, /ifvg_bisi_count/);
  assert.match(src, /average_ifvg_bisi_sibi_score/);
  assert.match(src, /ifvg_bisi_sibi_grade_a_count/);
  assert.match(src, /MapzIfvgInitFromSetup/);
  assert.match(src, /MapzIfvgTrackBar/);
  assert.match(src, /MapzIfvgFinalize/);
  assert.match(src, /fvg_class/);
  assert.match(src, /fvg_mitigation_state/);
  assert.match(src, /ifvg_inversion_confirmed_close/);
  assert.match(src, /ifvg_bisi_sibi_score/);
  assert.match(src, /ifvg_bisi_sibi_reasons/);
  assert.match(src, /MapzIfvgCompactSuffix/);
  assert.match(src, /has_entry_variant_outcome_sim_v1_parity_control/);
  assert.match(src, /entry_variant_sim_p50_official_control/);
  for (const bad of FORBIDDEN_SUBSTRINGS) {
    assert.equal(src.includes(bad), false, `must not contain ${bad}`);
  }
});

test("AF — E5.18 Setup Readiness Checklist V1 (export-only; no orders)", () => {
  const src = readFileSync(EA_PATH, "utf8");
  assert.match(src, /#define\s+TESTEA_BUILD\s+"MZP_TestEA_E5_18"/);
  assert.match(src, /input bool\s+InpEnableSetupReadinessChecklistV1\s*=\s*true/);
  assert.match(src, /input bool\s+InpSetupReadinessScoreEnabled\s*=\s*true/);
  assert.match(src, /input int\s+InpSetupReadinessMinCandidateScore\s*=\s*70/);
  assert.match(src, /input int\s+InpSetupReadinessMinWaitScore\s*=\s*45/);
  assert.match(src, /\\"has_setup_readiness_checklist_v1_logic\\"\s*:\s*true/);
  assert.match(src, /setup_readiness_checklist_enabled/);
  assert.match(src, /setup_readiness_candidate_count/);
  assert.match(src, /average_setup_readiness_score/);
  assert.match(src, /checklist_bias_block_count/);
  assert.match(src, /MapzReadyBuildAndScore/);
  assert.match(src, /MapzReadyFinalizeSummary/);
  assert.match(src, /setup_readiness_score/);
  assert.match(src, /setup_readiness_decision/);
  assert.match(src, /checklist_entry_candidate_family/);
  assert.match(src, /MapzReadyCompactSuffix/);
  assert.match(src, /ready_score=/);
  assert.match(src, /setup_readiness_checklist_v1_enabled/);
  const headerMatch = src.match(/string WriteTradesHeader\(void\)\s*\{[\s\S]*?return "([^"]+)"/);
  assert.ok(headerMatch, "WriteTradesHeader must exist");
  const headerCols = headerMatch![1]!.split(",");
  const readyScoreCount = headerCols.filter((c) => c === "setup_readiness_score").length;
  assert.equal(readyScoreCount, 1, "WriteTradesHeader must include exactly one setup_readiness_score column");
  for (const bad of FORBIDDEN_SUBSTRINGS) {
    assert.equal(src.includes(bad), false, `must not contain ${bad}`);
  }
});
