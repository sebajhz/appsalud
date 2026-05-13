# Mapazapp_TestEA — static samples (fictional)

These files mirror the **E5.3** export shape from **`Mapazapp_TestEA.mq5`** (`schema_version: backtest_ea_v1`) — **fictional** bundle for CLI validation:

- **`backtest_trades.csv`** — header + **three** illustrative virtual rows (win / loss / expired_unfilled); `result_money` column is **0** (no MT5 money model).
- **`backtest_events.csv`** — lifecycle + bias + setup + **virtual_trade_*** sample rows.
- **`backtest_summary.json`** — includes **`has_real_virtual_trade_logic: true`**, **`trade_count: 3`**, and E5.3 counters/metrics.

They are **not** output from a real Strategy Tester run. **Do not** commit raw tester exports from live accounts.

**Related:** [`EXPORT_CONTRACT.md`](../EXPORT_CONTRACT.md), [`BACKTESTEA_EXPORT_SCHEMA_E3_6.md`](../../../mapazapp/docs/BACKTESTEA_EXPORT_SCHEMA_E3_6.md); `@workspace/mapazapp-core` `validateTestEaExportSample`, `parseBacktestEventsCsv`, `importBacktestTradesFromCsv` (header-only trades CSV → zero trades + `CSV_HEADER_ONLY_NO_TRADE_ROWS` warning).
