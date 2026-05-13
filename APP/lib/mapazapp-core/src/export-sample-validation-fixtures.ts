/**
 * Sanitized fictional export bundles for V2-12 validation tests only.
 * Do not substitute for real MT5 exports; never commit raw terminal output.
 */

import type { ExportSampleFileText } from "./export-sample-validation-types";

export const V2_12_BRIDGE_STATUS_JSON = `{
  "schema_version": "MZP_BRIDGE_V1",
  "exported_at_utc": "2026-05-07T10:00:00Z",
  "terminal_id": "TERM_SYN_V212",
  "account_login": 123456,
  "account_server": "MockBroker-Demo",
  "account_currency": "USD",
  "bridge_version": "MZP_BridgeEA_fixture_v1",
  "ea_status": "RUNNING",
  "auto_trading_enabled": false,
  "connected": true,
  "last_tick_time_utc": "2026-05-07T09:59:00Z",
  "symbols_enabled": ["XAUUSD", "EURUSD"],
  "diagnostics_count": 1,
  "warnings_count": 0,
  "errors_count": 0,
  "last_error": ""
}`;

export const V2_12_BRIDGE_MARKET_SNAPSHOT_CSV = `schema_version,exported_at_utc,terminal_id,account_login,symbol,bid,ask,last,spread_points,spread_price,point,digits,tick_size,tick_value,contract_size,volume_min,volume_max,volume_step,trade_mode,session_status,last_tick_time_utc
MZP_BRIDGE_V1,2026-05-07T10:00:00Z,TERM_SYN_V212,123456,XAUUSD,2000.00,2000.10,2000.05,10,0.10,0.01,2,0.01,1.0,100,0.01,50.0,0.01,4,OPEN,2026-05-07T09:59:00Z
MZP_BRIDGE_V1,2026-05-07T10:00:00Z,TERM_SYN_V212,123456,EURUSD,1.1000,1.1001,1.10005,10,0.00010,0.00001,5,0.00001,1.0,100000,0.01,100.0,0.01,4,OPEN,2026-05-07T09:59:00Z
`;

export const V2_12_BRIDGE_ACCOUNT_SNAPSHOT_CSV = `schema_version,exported_at_utc,terminal_id,account_login,account_server,currency,balance,equity,margin,free_margin,margin_level,profit_open,leverage,trade_allowed,trade_expert,company
MZP_BRIDGE_V1,2026-05-07T10:00:00Z,TERM_SYN_V212,123456,MockBroker-Demo,USD,10000.00,10000.00,0.00,10000.00,0.00,0.00,100,true,false,Mock Broker Synthetic
`;

export const V2_12_BRIDGE_CANDLES_CSV = `schema_version,export_id,exported_at_utc,terminal_id,account_login,symbol,timeframe,candle_time_utc,open,high,low,close,tick_volume,spread_points,real_volume,is_closed,source
MZP_BRIDGE_V1,V212_EXP,2026-05-07T10:00:00Z,TERM_SYN_V212,123456,XAUUSD,M15,2026-05-07T09:00:00Z,1998.0,2000.5,1997.2,1999.8,500,10,0,true,FIXTURE
MZP_BRIDGE_V1,V212_EXP,2026-05-07T10:00:00Z,TERM_SYN_V212,123456,XAUUSD,M15,2026-05-07T09:15:00Z,1999.8,2001.2,1999.0,2000.4,480,10,0,true,FIXTURE
`;

export const V2_12_BRIDGE_POSITIONS_HEADER_CSV = `schema_version,exported_at_utc,terminal_id,account_login,position_ticket,symbol,type,volume,price_open,sl,tp,price_current,profit,swap,commission,magic,comment,time_open_utc,strategy_id,source_tag
`;

export const V2_12_BRIDGE_ORDERS_HEADER_CSV = `schema_version,exported_at_utc,terminal_id,account_login,order_ticket,symbol,type,volume_initial,volume_current,price_open,sl,tp,price_current,magic,comment,time_setup_utc,expiration_utc,strategy_id,source_tag
`;

export const V2_12_BRIDGE_DEALS_HEADER_CSV = `schema_version,exported_at_utc,terminal_id,account_login,deal_ticket,order_ticket,position_id,symbol,deal_type,entry_type,volume,price,profit,commission,swap,fee,time_utc,magic,comment,reason,strategy_id,source_tag
`;

export const V2_12_BRIDGE_ERRORS_INFO_CSV = `schema_version,exported_at_utc,terminal_id,account_login,error_code,error_message,module,severity,context
MZP_BRIDGE_V1,2026-05-07T10:00:00Z,TERM_SYN_V212,123456,I_V212,fixture info row,BridgeEA,INFO,fixture_only
`;

export function v212SanitizedBridgeBundleFiles(): ExportSampleFileText[] {
  return [
    { fileName: "bridge_status.json", text: V2_12_BRIDGE_STATUS_JSON },
    { fileName: "latest_market_snapshot.csv", text: V2_12_BRIDGE_MARKET_SNAPSHOT_CSV },
    { fileName: "account_snapshot.csv", text: V2_12_BRIDGE_ACCOUNT_SNAPSHOT_CSV },
    { fileName: "candles.csv", text: V2_12_BRIDGE_CANDLES_CSV },
    { fileName: "positions_open.csv", text: V2_12_BRIDGE_POSITIONS_HEADER_CSV },
    { fileName: "orders_pending.csv", text: V2_12_BRIDGE_ORDERS_HEADER_CSV },
    { fileName: "deals_history.csv", text: V2_12_BRIDGE_DEALS_HEADER_CSV },
    { fileName: "bridge_errors.csv", text: V2_12_BRIDGE_ERRORS_INFO_CSV },
  ];
}

/** Bridge subset without candles (status + market only). */
export function v212BridgeBundleMissingCandles(): ExportSampleFileText[] {
  return [
    { fileName: "bridge_status.json", text: V2_12_BRIDGE_STATUS_JSON },
    { fileName: "latest_market_snapshot.csv", text: V2_12_BRIDGE_MARKET_SNAPSHOT_CSV },
  ];
}

/** Deliberately sensitive-looking placeholders for strict privacy tests. */
export const V2_12_PRIVACY_UNSAFE_STATUS_JSON = `{
  "schema_version": "MZP_BRIDGE_V1",
  "exported_at_utc": "2026-05-07T10:00:00Z",
  "terminal_id": "TERM_X",
  "account_login": 1234567890123,
  "account_server": "ICMarkets-Live02",
  "account_currency": "USD",
  "bridge_version": "v1",
  "ea_status": "RUNNING",
  "auto_trading_enabled": false,
  "connected": true,
  "last_tick_time_utc": "2026-05-07T09:59:00Z",
  "symbols_enabled": ["XAUUSD"],
  "diagnostics_count": 0,
  "warnings_count": 0,
  "errors_count": 0,
  "last_error": ""
}`;

export const V2_12_TESTEA_BACKTEST_TRADES_CSV = [
  "trade_id,direction,entry_time,exit_time,entry_price,exit_price,result_r,symbol,strategy_id,parameter_set_id",
  "T_FIX_001,BUY,2026-05-01T10:00:00Z,2026-05-01T11:00:00Z,2000.0,2001.0,0.5,XAUUSD,MZP_IFVG_ZONE_REACTION_V1,MZP_IFVG_XAUUSD_V1_SET_003",
].join("\n");

export const V2_12_TESTEA_BACKTEST_SUMMARY_JSON = `{
  "schema_version": "MZP_TESTEA_V1",
  "ea_build": "fixture",
  "run_id": "TESTEA_FIX_V212",
  "strategy_id": "MZP_IFVG_ZONE_REACTION_V1",
  "parameter_set_id": "MZP_IFVG_XAUUSD_V1_SET_003",
  "canonical_symbol": "XAUUSD",
  "broker_symbol": "XAUUSD",
  "account_id": "TESTER_ACCOUNT",
  "dataset_split": "validation",
  "tester_symbol": "XAUUSD",
  "tester_period": "M15",
  "tester_from": null,
  "tester_to": null,
  "exported_at_utc": "2026-05-07T10:00:00Z",
  "trade_count": 1,
  "notes": "synthetic fixture",
  "execution_mode": "virtual_export_only",
  "live_trading_enabled": false,
  "magic_reserved": 0,
  "fixed_risk_r_meta": 1,
  "rr_target_meta": 2
}`;

export const V2_12_TESTEA_SUMMARY_UNSAFE_LIVE_JSON = V2_12_TESTEA_BACKTEST_SUMMARY_JSON.replace(
  '"live_trading_enabled": false',
  '"live_trading_enabled": true',
);

/** E3.6 — official TestEA: `backtest_ea_v1` summary + header-only trades + events CSV. */
export const V2_12_TESTEA_E342_EVENTS_CSV = [
  "run_id,event_id,timestamp,symbol,event_type,bias_direction,setup_direction,decision,reason,details",
  "V212_E342_RUN,EVT_000001,2026-05-07T12:00:00Z,XAUUSD,lifecycle_init,bullish,none,ok,OnInit,paths_ready",
  "V212_E342_RUN,EVT_000002,2026-05-07T12:00:01Z,XAUUSD,skeleton_ready,bullish,none,noop,E3.6,skeleton",
  "V212_E342_RUN,EVT_000003,2026-05-07T12:00:02Z,XAUUSD,daily_bias_evaluated,bullish,none,bias_recorded,previous_daily_close_above_open,bias_tf=D1",
  "V212_E342_RUN,EVT_000004,2026-05-07T12:00:03Z,XAUUSD,setup_detected,bullish,long,detected,bullish_fvg_C_low_above_A_high,fvg_low=2000 fvg_high=2005",
  "V212_E342_RUN,EVT_000005,2026-05-07T12:00:04Z,XAUUSD,setup_allowed,bullish,long,setup_candidate_allowed,daily_bias_aligned,gate_result=setup_candidate_allowed",
  "V212_E342_RUN,EVT_000099,2026-05-07T12:10:00Z,XAUUSD,lifecycle_deinit,bullish,none,ok,OnDeinit,reason_code=0",
].join("\n");

export const V2_12_TESTEA_E342_TRADES_HEADER_ONLY_CSV = [
  "run_id,trade_id,timestamp,symbol,timeframe,direction,bias_direction,setup_direction,entry,sl,tp,result_r,exit_reason,setup_reason,bias_reason,rejection_reason",
].join("\n");

export const V2_12_TESTEA_E342_SUMMARY_JSON = `{
  "schema_version": "backtest_ea_v1",
  "ea_build": "MZP_TestEA_E3_6_fixture",
  "run_id": "V212_E342_RUN",
  "strategy_id": "IFVG_XAUUSD_V1",
  "parameter_set_id": "default",
  "symbol": "XAUUSD",
  "broker_symbol": "XAUUSD",
  "execution_timeframe": "M15",
  "daily_bias_timeframe": "D1",
  "backtest_mode": "virtual",
  "tester_only": true,
  "official_ea": "Mapazapp_TestEA",
  "backtest_role": true,
  "use_h4_context": true,
  "use_h1_context": true,
  "has_real_ifvg_logic": true,
  "has_full_ifvg_pipeline": false,
  "has_real_daily_bias_logic": true,
  "has_real_trading_orders": false,
  "trade_count": 0,
  "total_bias_evaluated": 0,
  "bullish_bias_count": 0,
  "bearish_bias_count": 0,
  "neutral_bias_count": 0,
  "unknown_bias_count": 0,
  "total_setup_candidates": 0,
  "bullish_setup_candidates": 0,
  "bearish_setup_candidates": 0,
  "allowed_setups": 0,
  "rejected_by_daily_bias": 0,
  "skipped_neutral_bias": 0,
  "missing_bias_context": 0,
  "ignored_small_fvg": 0,
  "last_setup_direction": "none",
  "last_setup_decision": "none",
  "last_setup_reason": "",
  "last_fvg_points": 0,
  "exported_at_utc": "2026-05-07T12:00:00Z",
  "notes": "synthetic fixture E3.6 export schema"
}`;

export function v212E342TestEaBundleFiles(): ExportSampleFileText[] {
  return [
    { fileName: "backtest_trades.csv", text: V2_12_TESTEA_E342_TRADES_HEADER_ONLY_CSV },
    { fileName: "backtest_events.csv", text: V2_12_TESTEA_E342_EVENTS_CSV },
    { fileName: "backtest_summary.json", text: V2_12_TESTEA_E342_SUMMARY_JSON },
  ];
}

export function v212SanitizedTestEaBundleFiles(): ExportSampleFileText[] {
  return [
    { fileName: "backtest_trades.csv", text: V2_12_TESTEA_BACKTEST_TRADES_CSV },
    { fileName: "backtest_summary.json", text: V2_12_TESTEA_BACKTEST_SUMMARY_JSON },
  ];
}

export function v212MixedBundleFiles(): ExportSampleFileText[] {
  return [...v212SanitizedBridgeBundleFiles(), ...v212SanitizedTestEaBundleFiles()];
}
