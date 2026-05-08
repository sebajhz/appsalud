/**
 * Synthetic candle CSV fixtures for V2-11 tests only — not real market data, do not commit real MT5 exports.
 */

export const V2_11_BRIDGE_CANDLES_XAUUSD_M15_CSV = [
  "schema_version,export_id,exported_at_utc,terminal_id,account_login,symbol,timeframe,candle_time_utc,open,high,low,close,tick_volume,spread_points,real_volume,is_closed,source",
  "MZP_BRIDGE_V1,fixture_exp,2024-01-01T09:00:00Z,TERM_SYN,0,XAUUSD,M15,2024-01-01T10:00:00Z,2000.0,2001.2,1999.4,2000.6,120,25,0,true,MAPZAPP_FIXTURE",
  "MZP_BRIDGE_V1,fixture_exp,2024-01-01T09:00:00Z,TERM_SYN,0,XAUUSD,M15,2024-01-01T10:15:00Z,2000.6,2002.0,2000.1,2001.5,118,25,0,true,MAPZAPP_FIXTURE",
  "MZP_BRIDGE_V1,fixture_exp,2024-01-01T09:00:00Z,TERM_SYN,0,XAUUSD,M15,2024-01-01T10:30:00Z,2001.5,2001.9,2000.8,2001.2,90,25,0,true,MAPZAPP_FIXTURE",
].join("\n");

export const V2_11_GENERIC_OHLC_CSV = [
  "timestamp,open,high,low,close",
  "2024-02-01T14:00:00Z,1.1000,1.1006,1.0997,1.1002",
  "2024-02-01T14:15:00Z,1.1002,1.1008,1.0999,1.1005",
].join("\n");

/** MT5-like history shape; semicolon delimiter, angle-bracket headers normalized by importer. */
export const V2_11_MT5_SEMICOLON_CSV = [
  "<DATE>;<TIME>;<OPEN>;<HIGH>;<LOW>;<CLOSE>;<TICKVOL>;<VOL>;<SPREAD>",
  "2024.03.01;08:00:00;2650.0;2651.0;2649.2;2650.4;80;0;18",
  "2024.03.01;08:15:00;2650.4;2651.5;2650.0;2651.1;77;0;18",
].join("\n");

export const V2_11_BAD_ROWS_CSV = [
  "timestamp,open,high,low,close",
  "2024-04-01T10:00:00Z,1.0,1.1,0.9,1.05",
  "2024-04-01T10:15:00Z,not_a_number,1.1,0.9,1.05",
  "2024-04-01T10:30:00Z,1.05,1.04,1.06,1.05",
  "2024-04-01T10:45:00Z,1.05,1.08,1.04,1.06",
].join("\n");

export const V2_11_BAD_ROWS_ALL_INVALID_CSV = [
  "timestamp,open,high,low,close",
  "2024-04-01T10:15:00Z,NaN,1.1,0.9,1.05",
  "2024-04-01T10:30:00Z,1.05,1.04,1.06,1.05",
].join("\n");

/** Second row has high < max(open,close) — should skip. */
export const V2_11_BAD_OHLC_ALL_FAIL_CSV = [
  "timestamp,open,high,low,close",
  "2024-04-01T11:00:00Z,1.0,0.5,0.9,1.02",
  "2024-04-01T11:15:00Z,1.02,1.0,1.03,1.01",
].join("\n");

export const V2_11_DUPLICATE_TIMESTAMPS_CSV = [
  "time,open,high,low,close",
  "2024-05-01T12:30:00Z,100,101,99.5,100.4",
  "2024-05-01T12:00:00Z,99,100,98.5,99.2",
  "2024-05-01T12:30:00Z,100.4,101.2,100.0,100.9",
].join("\n");

export const V2_11_SYMBOL_MISMATCH_BRIDGE_CSV = [
  "schema_version,export_id,exported_at_utc,terminal_id,account_login,symbol,timeframe,candle_time_utc,open,high,low,close,tick_volume,spread_points,real_volume,is_closed,source",
  "MZP_BRIDGE_V1,fixture_exp,2024-01-01T09:00:00Z,TERM_SYN,0,EURUSD,M15,2024-06-01T08:00:00Z,1.0850,1.0855,1.0848,1.0852,50,12,0,true,MAPZAPP_FIXTURE",
].join("\n");
