# Mapazapp_TestEA — static samples (fictional)

These files mirror the **E3.6** export shape from **`Mapazapp_TestEA.mq5`** (`schema_version: backtest_ea_v1`):

- **`backtest_trades.csv`** — **header only** (no data rows; no synthetic trades).
- **`backtest_events.csv`** — illustrative rows (`lifecycle_init`, `skeleton_ready`, `daily_bias_evaluated`, `setup_detected`, `setup_allowed`, `lifecycle_deinit`).
- **`backtest_summary.json`** — summary flags: **`has_real_ifvg_logic: true`** (FVG / Setup V1 **candidate** detection), **`has_full_ifvg_pipeline: false`**, **`has_real_trading_orders: false`**; bias + setup counters; **`trade_count: 0`**.

They are **not** output from a real Strategy Tester run. **Do not** commit raw tester exports from live accounts.

**Related:** [`EXPORT_CONTRACT.md`](../EXPORT_CONTRACT.md), [`BACKTESTEA_EXPORT_SCHEMA_E3_6.md`](../../../mapazapp/docs/BACKTESTEA_EXPORT_SCHEMA_E3_6.md); `@workspace/mapazapp-core` `validateTestEaExportSample`, `parseBacktestEventsCsv`, `importBacktestTradesFromCsv` (header-only trades CSV → zero trades + `CSV_HEADER_ONLY_NO_TRADE_ROWS` warning).
