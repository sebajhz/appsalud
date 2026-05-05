/**
 * **Fictional** BridgeEA export samples for unit tests and mock UI only.
 * Not broker truth; not read from disk; not produced by a real EA.
 */

/** Minimal valid `bridge_status.json` (MZP_BRIDGE_V1). */
export const MOCK_BRIDGE_STATUS_JSON = `{
  "schema_version": "MZP_BRIDGE_V1",
  "exported_at_utc": "2026-05-04T12:00:00Z",
  "terminal_id": "MT5_TERMINAL_CP10",
  "account_login": 100200300,
  "account_server": "MockBroker-Demo",
  "account_currency": "USD",
  "bridge_version": "MZP_BridgeEA_v1",
  "ea_status": "RUNNING",
  "auto_trading_enabled": false,
  "connected": true,
  "last_tick_time_utc": "2026-05-04T11:59:58Z",
  "symbols_enabled": ["XAUUSD", "EURUSD"],
  "diagnostics_count": 1,
  "warnings_count": 0,
  "errors_count": 0,
  "last_error": ""
}`;

/** Same logical payload using legacy schema alias (compatibility only). */
export const MOCK_BRIDGE_STATUS_JSON_QTG_ALIAS = MOCK_BRIDGE_STATUS_JSON.replace(
  "MZP_BRIDGE_V1",
  "QTG_BRIDGE_V1",
);

/**
 * `latest_market_snapshot.csv` — two fictional rows.
 * Includes `last` and `session_status` per Mapazapp_MT5_Bridge_Connectivity_Contract_V1 §9.3.
 */
export const MOCK_BRIDGE_MARKET_SNAPSHOT_CSV = `schema_version,exported_at_utc,terminal_id,account_login,symbol,bid,ask,last,spread_points,spread_price,point,digits,tick_size,tick_value,contract_size,volume_min,volume_max,volume_step,trade_mode,session_status,last_tick_time_utc
MZP_BRIDGE_V1,2026-05-04T12:00:00Z,MT5_TERMINAL_CP10,100200300,XAUUSD,2320.12,2320.22,2320.18,10,0.10,0.01,2,0.01,1.0,100,0.01,50.0,0.01,4,OPEN,2026-05-04T11:59:58Z
MZP_BRIDGE_V1,2026-05-04T12:00:00Z,MT5_TERMINAL_CP10,100200300,EURUSD,1.05210,1.05220,1.05215,10,0.00010,0.00001,5,0.00001,1.0,100000,0.01,100.0,0.01,4,OPEN,2026-05-04T11:59:57Z
`;

export const MOCK_BRIDGE_ACCOUNT_SNAPSHOT_CSV = `schema_version,exported_at_utc,terminal_id,account_login,account_server,currency,balance,equity,margin,free_margin,margin_level,profit_open,leverage,trade_allowed,trade_expert,company
MZP_BRIDGE_V1,2026-05-04T12:00:00Z,MT5_TERMINAL_CP10,100200300,MockBroker-Demo,USD,100000.00,100050.25,1200.50,98800.00,8333.33,50.25,100,true,false,Mock Broker Ltd
`;

export const MOCK_BRIDGE_CANDLES_CSV = `schema_version,export_id,exported_at_utc,terminal_id,account_login,symbol,timeframe,candle_time_utc,open,high,low,close,tick_volume,spread_points,real_volume,is_closed,source
MZP_BRIDGE_V1,EXP_CP10_1,2026-05-04T12:00:00Z,MT5_TERMINAL_CP10,100200300,XAUUSD,M15,2026-05-04T11:45:00Z,2318.0,2321.5,2317.2,2320.4,1200,12,0,true,MT5_BRIDGE
`;

/** Header only — valid “no open positions” export. */
export const MOCK_BRIDGE_POSITIONS_EMPTY_CSV = `schema_version,exported_at_utc,terminal_id,account_login,position_ticket,symbol,type,volume,price_open,sl,tp,price_current,profit,swap,commission,magic,comment,time_open_utc,strategy_id,source_tag
`;

export const MOCK_BRIDGE_POSITIONS_ONE_CSV = `schema_version,exported_at_utc,terminal_id,account_login,position_ticket,symbol,type,volume,price_open,sl,tp,price_current,profit,swap,commission,magic,comment,time_open_utc,strategy_id,source_tag
MZP_BRIDGE_V1,2026-05-04T12:00:00Z,MT5_TERMINAL_CP10,100200300,900001,XAUUSD,BUY,0.10,2319.50,2300.00,2340.00,2320.10,12.50,-0.10,-0.50,260502,MZP|IFVG|XAUUSD,2026-05-04T10:00:00Z,MZP_IFVG_ZONE_REACTION_V1,MAPZAPP_MOCK
`;

/** Header only — valid empty pending orders file. */
export const MOCK_BRIDGE_ORDERS_PENDING_CSV = `schema_version,exported_at_utc,terminal_id,account_login,order_ticket,symbol,type,volume_initial,volume_current,price_open,sl,tp,price_current,magic,comment,time_setup_utc,expiration_utc,strategy_id,source_tag
`;

export const MOCK_BRIDGE_DEALS_HISTORY_CSV = `schema_version,exported_at_utc,terminal_id,account_login,deal_ticket,order_ticket,position_id,symbol,deal_type,entry_type,volume,price,profit,commission,swap,fee,time_utc,magic,comment,reason,strategy_id,source_tag
MZP_BRIDGE_V1,2026-05-04T12:00:00Z,MT5_TERMINAL_CP10,100200300,D9001,O8001,P7001,XAUUSD,BUY,IN,0.10,2319.50,0.00,-0.50,0.00,0.00,2026-05-04T09:00:00Z,260502,MZP|ENTRY,,MZP_IFVG_ZONE_REACTION_V1,MAPZAPP_MOCK
`;

export const MOCK_BRIDGE_ERRORS_CSV = `schema_version,exported_at_utc,terminal_id,account_login,error_code,error_message,module,severity,context
MZP_BRIDGE_V1,2026-05-04T12:00:00Z,MT5_TERMINAL_CP10,100200300,E_CP10_001,SymbolInfoDouble failed on spread,BridgeEA,WARNING,symbol=XAUUSD
`;

export const MOCK_BRIDGE_INVALID_JSON = `{ not json`;

/** Market CSV missing required column `last` (contract §9.3) — parsers must reject header. */
export const MOCK_BRIDGE_MARKET_SNAPSHOT_CSV_BAD_HEADER = `schema_version,exported_at_utc,terminal_id,account_login,symbol,bid,ask,spread_points
MZP_BRIDGE_V1,2026-05-04T12:00:00Z,T,1,X,1,1,1
`;
